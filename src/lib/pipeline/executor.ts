/**
 * Pipeline Executor
 *
 * Executes the deployment pipeline, handling:
 * - Step ordering based on dependencies
 * - ID resolution for parent references
 * - Batch processing for API efficiency
 * - Error handling and rollback
 */

import type {
  PipelineConfig,
  PipelineStep,
  WorksheetData,
  IdMappingStore,
  DeploymentDetail,
  DeploymentLog,
} from '@/types';
import { SalesforceClient } from '@/lib/salesforce/client';
import { getExecutionOrder, getFieldMapping } from './config';

export interface ExecutionContext {
  deploymentId: string;
  connectionId: string;
  sfClient: SalesforceClient;
  worksheets: Map<string, WorksheetData>;
  idMappings: IdMappingStore;
  batchSize: number;
  onProgress: (progress: ExecutionProgress) => void;
  onLog: (log: Omit<DeploymentLog, 'id' | 'deployment_id'>) => void;
  onDetailUpdate: (detail: Omit<DeploymentDetail, 'id'>) => void;
}

export interface ExecutionProgress {
  currentStep: string;
  currentStepIndex: number;
  totalSteps: number;
  processedRecords: number;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
}

export interface ExecutionResult {
  success: boolean;
  totalObjects: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errors: Array<{ step: string; record: string; error: string }>;
  createdIds: IdMappingStore;
}

/**
 * Execute the deployment pipeline
 */
export async function executePipeline(
  config: PipelineConfig,
  context: ExecutionContext
): Promise<ExecutionResult> {
  const result: ExecutionResult = {
    success: true,
    totalObjects: 0,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    errors: [],
    createdIds: {},
  };

  // Get steps in execution order
  const orderedSteps = getExecutionOrder(config.steps);

  context.onLog({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Starting deployment with ${orderedSteps.length} steps`,
    metadata: { steps: orderedSteps.map((s) => s.name) },
  });

  for (let i = 0; i < orderedSteps.length; i++) {
    const step = orderedSteps[i];

    // Find matching worksheet data
    const worksheetData = findWorksheetForStep(step, context.worksheets);

    if (!worksheetData || worksheetData.data.length === 0) {
      context.onLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Skipping step "${step.name}" - no data found`,
        metadata: { stepId: step.id },
      });
      continue;
    }

    context.onLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Processing step "${step.name}" with ${worksheetData.data.length} records`,
      metadata: { stepId: step.id, recordCount: worksheetData.data.length },
    });

    result.totalObjects += worksheetData.data.length;

    // Execute step
    const stepResult = await executeStep(step, worksheetData, context, i, orderedSteps.length);

    // Merge results
    result.successCount += stepResult.successCount;
    result.failureCount += stepResult.failureCount;
    result.skippedCount += stepResult.skippedCount;
    result.errors.push(...stepResult.errors);

    // Store ID mappings for this step
    result.createdIds[step.id] = stepResult.idMappings;
    context.idMappings[step.id] = stepResult.idMappings;

    // Check if we should stop on error
    if (stepResult.failureCount > 0) {
      context.onLog({
        timestamp: new Date().toISOString(),
        level: 'warning',
        message: `Step "${step.name}" completed with ${stepResult.failureCount} errors`,
        metadata: { stepId: step.id, errors: stepResult.errors },
      });
    }
  }

  result.success = result.failureCount === 0;

  context.onLog({
    timestamp: new Date().toISOString(),
    level: result.success ? 'info' : 'warning',
    message: `Deployment completed: ${result.successCount} success, ${result.failureCount} failures, ${result.skippedCount} skipped`,
    metadata: { result },
  });

  return result;
}

/**
 * Execute a single step
 */
async function executeStep(
  step: PipelineStep,
  worksheetData: WorksheetData,
  context: ExecutionContext,
  stepIndex: number,
  totalSteps: number
): Promise<{
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errors: Array<{ step: string; record: string; error: string }>;
  idMappings: Record<string, string>;
}> {
  const result = {
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    errors: [] as Array<{ step: string; record: string; error: string }>,
    idMappings: {} as Record<string, string>,
  };

  const fieldMapping = getFieldMapping(step.id);
  const records = worksheetData.data;

  // Process in batches
  for (let i = 0; i < records.length; i += context.batchSize) {
    const batch = records.slice(i, i + context.batchSize);

    // Transform records for Salesforce
    const transformedBatch = batch.map((record, batchIndex) => {
      const sfRecord = transformRecord(record, fieldMapping, step, context.idMappings);
      return {
        original: record,
        transformed: sfRecord,
        index: i + batchIndex,
      };
    });

    // Filter out records with missing required parent IDs
    const validRecords = transformedBatch.filter((r) => {
      if (!r.transformed) {
        result.skippedCount++;
        return false;
      }
      return true;
    });

    if (validRecords.length === 0) continue;

    // Create records using composite API
    try {
      const compositeRequests = validRecords.map((r, idx) => ({
        method: 'POST',
        url: `/services/data/v59.0/sobjects/${step.apiName}`,
        referenceId: `ref_${idx}`,
        body: r.transformed!,
      }));

      const response = await context.sfClient.composite(compositeRequests);

      // Process responses
      for (let j = 0; j < response.compositeResponse.length; j++) {
        const res = response.compositeResponse[j];
        const originalRecord = validRecords[j].original;
        const lookupValue = getLookupValue(originalRecord, step);

        if (res.httpStatusCode >= 200 && res.httpStatusCode < 300) {
          result.successCount++;
          const body = res.body as { id: string };
          if (body.id && lookupValue) {
            result.idMappings[lookupValue] = body.id;
          }

          context.onDetailUpdate({
            deployment_id: context.deploymentId,
            step_id: step.id,
            step_order: step.order,
            object_type: step.objectType,
            object_name: String(lookupValue || `Record ${validRecords[j].index + 1}`),
            object_identifier: String(lookupValue || ''),
            salesforce_id: body.id,
            status: 'success',
            error_message: null,
            created_at: new Date().toISOString(),
          });
        } else {
          result.failureCount++;
          const errorBody = res.body as { message?: string; errorCode?: string } | Array<{ message: string }>;
          const errorMessage = Array.isArray(errorBody)
            ? errorBody[0]?.message
            : errorBody.message || 'Unknown error';

          result.errors.push({
            step: step.name,
            record: String(lookupValue || `Row ${validRecords[j].index + 1}`),
            error: errorMessage,
          });

          context.onDetailUpdate({
            deployment_id: context.deploymentId,
            step_id: step.id,
            step_order: step.order,
            object_type: step.objectType,
            object_name: String(lookupValue || `Record ${validRecords[j].index + 1}`),
            object_identifier: String(lookupValue || ''),
            salesforce_id: null,
            status: 'failed',
            error_message: errorMessage,
            created_at: new Date().toISOString(),
          });
        }

        // Update progress
        context.onProgress({
          currentStep: step.name,
          currentStepIndex: stepIndex,
          totalSteps,
          processedRecords: i + j + 1,
          totalRecords: records.length,
          successCount: result.successCount,
          failureCount: result.failureCount,
          skippedCount: result.skippedCount,
        });
      }
    } catch (error) {
      // Batch failed entirely
      context.onLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Batch failed for step "${step.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { stepId: step.id, batchStart: i, batchSize: batch.length },
      });

      result.failureCount += validRecords.length;
      for (const record of validRecords) {
        const lookupValue = getLookupValue(record.original, step);
        result.errors.push({
          step: step.name,
          record: String(lookupValue || `Row ${record.index + 1}`),
          error: error instanceof Error ? error.message : 'Batch processing failed',
        });
      }
    }
  }

  return result;
}

/**
 * Transform Excel record to Salesforce record format
 */
function transformRecord(
  record: Record<string, unknown>,
  fieldMapping: Record<string, string>,
  step: PipelineStep,
  idMappings: IdMappingStore
): Record<string, unknown> | null {
  const sfRecord: Record<string, unknown> = {};

  // Map basic fields
  for (const [excelField, sfField] of Object.entries(fieldMapping)) {
    if (record[excelField] !== undefined && record[excelField] !== null && record[excelField] !== '') {
      let value = record[excelField];

      // Handle boolean conversion
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1') {
          value = true;
        } else if (lowerValue === 'false' || lowerValue === 'no' || lowerValue === '0') {
          value = false;
        }
      }

      sfRecord[sfField] = value;
    }
  }

  // Resolve parent ID mappings
  for (const mapping of step.parentIdMappings) {
    const lookupValue = record[mapping.sourceField];

    if (lookupValue && lookupValue !== '') {
      const sourceIdMappings = idMappings[mapping.sourceStep];

      if (sourceIdMappings) {
        const parentId = sourceIdMappings[String(lookupValue)];

        if (parentId) {
          sfRecord[mapping.targetField] = parentId;
        } else {
          // Parent not found - this might be okay for self-referential hierarchies
          // where the parent hasn't been created yet
          if (mapping.sourceStep !== step.id) {
            // Required parent from different step not found - skip record
            return null;
          }
        }
      } else if (mapping.sourceStep !== step.id) {
        // Source step has no mappings and it's not self-reference
        return null;
      }
    }
  }

  return sfRecord;
}

/**
 * Get the lookup value for a record (used for ID mapping)
 */
function getLookupValue(record: Record<string, unknown>, step: PipelineStep): string | undefined {
  // Try common identifier fields
  const identifierFields = [
    'Product_Code',
    'Picklist_Name',
    'Category_Code',
    'Catalog_Code',
    'PriceBook_Code',
    'Attribute_API_Name',
    'Selling_Model_Code',
    'Value_API_Name',
  ];

  for (const field of identifierFields) {
    if (record[field]) {
      return String(record[field]);
    }
  }

  return undefined;
}

/**
 * Find worksheet data that matches a step
 */
function findWorksheetForStep(
  step: PipelineStep,
  worksheets: Map<string, WorksheetData>
): WorksheetData | undefined {
  // Try exact match first
  if (worksheets.has(step.name)) {
    return worksheets.get(step.name);
  }

  // Try normalized matching
  const normalizedStepName = step.name.toLowerCase().replace(/[_\s-]/g, '');

  for (const [name, data] of worksheets) {
    const normalizedName = name.toLowerCase().replace(/[_\s-]/g, '');
    if (normalizedName === normalizedStepName || normalizedName === step.objectType.toLowerCase()) {
      return data;
    }
  }

  // Try partial matching
  for (const [name, data] of worksheets) {
    const normalizedName = name.toLowerCase();
    if (normalizedName.includes(step.objectType.toLowerCase())) {
      return data;
    }
  }

  return undefined;
}
