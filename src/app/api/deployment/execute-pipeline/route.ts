import { createClient } from '@/lib/supabase/server';
import { SalesforceClient, decryptToken } from '@/lib/salesforce/client';
import { NextResponse } from 'next/server';
import type { DeploymentPayload } from '@/contexts/ConfigDataContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DeploymentRequest {
  connectionId: string;
  payload: DeploymentPayload;
  mode: 'full' | 'incremental' | 'validation_only';
}

// ID mappings for reference resolution
type IdMappings = Record<string, Record<string, string>>;

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type, data }) + '\n'));
      };

      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          send('error', { message: 'Unauthorized' });
          controller.close();
          return;
        }

        const body: DeploymentRequest = await request.json();
        const { connectionId, payload, mode } = body;

        // Fetch connection
        const { data: connection, error: connError } = await supabase
          .from('connections')
          .select('*')
          .eq('id', connectionId)
          .eq('user_id', user.id)
          .single();

        if (connError || !connection) {
          send('error', { message: 'Connection not found' });
          controller.close();
          return;
        }

        send('log', { level: 'info', message: 'Initializing deployment...' });

        // Create deployment record
        const { data: deployment, error: deployError } = await supabase
          .from('deployments')
          .insert({
            user_id: user.id,
            connection_id: connectionId,
            template_file_name: 'Data Entry',
            status: 'in_progress',
            mode,
            started_at: new Date().toISOString(),
            summary: {},
          })
          .select()
          .single();

        if (deployError || !deployment) {
          send('error', { message: 'Failed to create deployment record' });
          controller.close();
          return;
        }

        send('log', { level: 'info', message: `Deployment ID: ${deployment.id}` });

        // Validation-only mode
        if (mode === 'validation_only') {
          send('log', { level: 'info', message: 'Running validation only (no changes will be made)' });

          // Simulate validation for each step
          for (let i = 0; i < payload.steps.length; i++) {
            const step = payload.steps[i];
            send('progress', {
              currentStep: step.stepName,
              currentStepIndex: i,
              totalSteps: payload.steps.length,
              processedRecords: step.entries.length,
              totalRecords: step.entries.length,
              successCount: step.entries.length,
              failureCount: 0,
              skippedCount: 0,
            });
            send('log', { level: 'info', message: `Validated ${step.entries.length} ${step.apiName} records` });
          }

          await supabase
            .from('deployments')
            .update({
              status: 'validation_only',
              completed_at: new Date().toISOString(),
              summary: {
                total_objects: payload.metadata.totalEntries,
                success_count: payload.metadata.totalEntries,
                failure_count: 0,
                skipped_count: 0,
                api_calls_consumed: 0,
                duration_seconds: 1,
              },
            })
            .eq('id', deployment.id);

          send('complete', {
            success: true,
            totalObjects: payload.metadata.totalEntries,
            successCount: payload.metadata.totalEntries,
            failureCount: 0,
            skippedCount: 0,
          });

          controller.close();
          return;
        }

        // Initialize Salesforce client
        const accessToken = decryptToken(connection.access_token_encrypted);
        const sfClient = new SalesforceClient(accessToken, connection.instance_url);

        // Test connection first
        const isConnected = await sfClient.testConnection();
        if (!isConnected) {
          send('error', { message: 'Failed to connect to Salesforce. Please refresh your connection.' });

          await supabase
            .from('deployments')
            .update({ status: 'failed', error_summary: 'Connection failed' })
            .eq('id', deployment.id);

          controller.close();
          return;
        }

        send('log', { level: 'info', message: 'Connected to Salesforce successfully' });

        // Execute deployment
        const startTime = Date.now();
        const result = {
          success: true,
          totalObjects: 0,
          successCount: 0,
          failureCount: 0,
          skippedCount: 0,
          errors: [] as Array<{ step: string; record: string; error: string }>,
        };

        // ID mappings for resolving references between steps
        const idMappings: IdMappings = {};

        // Process each step in order
        for (let stepIndex = 0; stepIndex < payload.steps.length; stepIndex++) {
          const step = payload.steps[stepIndex];

          send('log', {
            level: 'info',
            message: `Processing step ${stepIndex + 1}/${payload.steps.length}: ${step.stepName} (${step.entries.length} records)`
          });

          // Initialize ID mapping for this step
          idMappings[step.stepId] = {};

          result.totalObjects += step.entries.length;

          // Process entries for this step
          for (let entryIndex = 0; entryIndex < step.entries.length; entryIndex++) {
            const entry = step.entries[entryIndex];
            const recordName = (entry.Name as string) || (entry.Code as string) || `Record ${entryIndex + 1}`;

            try {
              // Resolve reference fields (internal _id references to Salesforce IDs)
              const resolvedEntry = resolveReferences(entry, idMappings);

              // Make API call to create the record
              const sfResponse = await sfClient.createRecord(step.apiName, resolvedEntry);

              if (sfResponse.success && sfResponse.id) {
                result.successCount++;

                // Store the ID mapping using internal _id if present
                const internalId = entry._internalId as string;
                if (internalId) {
                  idMappings[step.stepId][internalId] = sfResponse.id;
                }
                // Also store by Name/Code for backward compatibility
                if (entry.Name) {
                  idMappings[step.stepId][entry.Name as string] = sfResponse.id;
                }
                if (entry.Code) {
                  idMappings[step.stepId][entry.Code as string] = sfResponse.id;
                }

                // Send record created event
                send('record_created', {
                  stepId: step.stepId,
                  stepName: step.stepName,
                  objectType: step.apiName,
                  name: recordName,
                  salesforceId: sfResponse.id,
                  timestamp: new Date().toISOString(),
                });

                // Store in deployment details
                await supabase
                  .from('deployment_details')
                  .insert({
                    deployment_id: deployment.id,
                    step_id: step.stepId,
                    step_order: stepIndex + 1,
                    object_type: step.apiName,
                    object_name: recordName,
                    object_identifier: recordName,
                    salesforce_id: sfResponse.id,
                    status: 'success',
                    error_message: null,
                  });

              } else {
                result.failureCount++;
                const errorMessage = sfResponse.errors?.join(', ') || 'Unknown error';
                result.errors.push({
                  step: step.stepName,
                  record: recordName,
                  error: errorMessage,
                });

                send('log', {
                  level: 'error',
                  message: `Failed to create ${step.apiName} "${recordName}": ${errorMessage}`
                });

                await supabase
                  .from('deployment_details')
                  .insert({
                    deployment_id: deployment.id,
                    step_id: step.stepId,
                    step_order: stepIndex + 1,
                    object_type: step.apiName,
                    object_name: recordName,
                    object_identifier: recordName,
                    salesforce_id: null,
                    status: 'failed',
                    error_message: errorMessage,
                  });
              }
            } catch (err) {
              result.failureCount++;
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              result.errors.push({
                step: step.stepName,
                record: recordName,
                error: errorMessage,
              });

              send('log', {
                level: 'error',
                message: `Exception creating ${step.apiName} "${recordName}": ${errorMessage}`
              });
            }

            // Update progress
            send('progress', {
              currentStep: step.stepName,
              currentStepIndex: stepIndex,
              totalSteps: payload.steps.length,
              processedRecords: entryIndex + 1,
              totalRecords: step.entries.length,
              successCount: result.successCount,
              failureCount: result.failureCount,
              skippedCount: result.skippedCount,
            });
          }

          send('log', {
            level: 'info',
            message: `Completed ${step.stepName}: ${Object.keys(idMappings[step.stepId]).length} records created`
          });
        }

        // Execute post-deployment operations
        const postOps = payload.postDeploymentOperations || [];
        if (postOps.length > 0) {
          send('log', { level: 'info', message: `Starting ${postOps.length} post-deployment operations...` });

          for (let opIndex = 0; opIndex < postOps.length; opIndex++) {
            const op = postOps[opIndex];

            send('progress', {
              phase: 'post_deployment',
              currentOperation: op.name,
              currentOperationIndex: opIndex,
              totalOperations: postOps.length,
              operationType: op.type,
            });

            if (op.type === 'wait') {
              send('log', { level: 'info', message: `Waiting ${op.waitTimeSeconds} seconds...` });
              await new Promise(resolve => setTimeout(resolve, (op.waitTimeSeconds || 5) * 1000));
              send('log', { level: 'info', message: `Wait completed` });

            } else if (op.type === 'GET' && op.endpoint) {
              send('log', { level: 'info', message: `Executing GET ${op.endpoint}` });
              try {
                const getResponse = await sfClient.get(op.endpoint);
                send('log', { level: 'info', message: `GET ${op.endpoint} completed successfully` });
                send('post_deployment_result', {
                  operationId: op.id,
                  operationName: op.name,
                  type: 'GET',
                  endpoint: op.endpoint,
                  success: true,
                  response: getResponse,
                });
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                send('log', { level: 'error', message: `GET ${op.endpoint} failed: ${errorMsg}` });
                send('post_deployment_result', {
                  operationId: op.id,
                  operationName: op.name,
                  type: 'GET',
                  endpoint: op.endpoint,
                  success: false,
                  error: errorMsg,
                });
              }

            } else if (op.type === 'POST' && op.endpoint) {
              send('log', { level: 'info', message: `Executing POST ${op.endpoint}` });
              try {
                const postResponse = await sfClient.post(op.endpoint, op.payload || {});
                send('log', { level: 'info', message: `POST ${op.endpoint} completed successfully` });
                send('post_deployment_result', {
                  operationId: op.id,
                  operationName: op.name,
                  type: 'POST',
                  endpoint: op.endpoint,
                  success: true,
                  response: postResponse,
                });
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                send('log', { level: 'error', message: `POST ${op.endpoint} failed: ${errorMsg}` });
                send('post_deployment_result', {
                  operationId: op.id,
                  operationName: op.name,
                  type: 'POST',
                  endpoint: op.endpoint,
                  success: false,
                  error: errorMsg,
                });
              }
            }
          }

          send('log', { level: 'info', message: `All post-deployment operations completed` });
        }

        const durationSeconds = Math.round((Date.now() - startTime) / 1000);
        result.success = result.failureCount === 0;

        // Update deployment record
        await supabase
          .from('deployments')
          .update({
            status: result.success ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
            summary: {
              total_objects: result.totalObjects,
              success_count: result.successCount,
              failure_count: result.failureCount,
              skipped_count: result.skippedCount,
              api_calls_consumed: result.successCount + result.failureCount,
              duration_seconds: durationSeconds,
            },
            error_summary: result.errors.length > 0
              ? `${result.errors.length} errors occurred`
              : null,
          })
          .eq('id', deployment.id);

        // Store ID mappings for future reference
        for (const [stepId, mappings] of Object.entries(idMappings)) {
          for (const [lookupValue, salesforceId] of Object.entries(mappings)) {
            await supabase
              .from('deployment_id_mappings')
              .insert({
                deployment_id: deployment.id,
                step_id: stepId,
                lookup_field: 'code',
                lookup_value: lookupValue,
                salesforce_id: salesforceId,
              });
          }
        }

        send('log', {
          level: result.success ? 'info' : 'warning',
          message: `Deployment completed in ${durationSeconds} seconds`,
        });

        send('complete', {
          success: result.success,
          totalObjects: result.totalObjects,
          successCount: result.successCount,
          failureCount: result.failureCount,
          skippedCount: result.skippedCount,
        });

      } catch (error) {
        console.error('Deployment error:', error);
        send('error', {
          message: error instanceof Error ? error.message : 'Deployment failed',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Resolve internal reference IDs to Salesforce IDs
 */
function resolveReferences(
  entry: Record<string, unknown>,
  idMappings: IdMappings
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(entry)) {
    // Skip internal fields
    if (key.startsWith('_')) continue;

    if (typeof value === 'string' && value.startsWith('entry_')) {
      // This is an internal reference ID - try to resolve it
      let salesforceId: string | undefined;

      // Search through all step mappings
      for (const stepMappings of Object.values(idMappings)) {
        if (stepMappings[value]) {
          salesforceId = stepMappings[value];
          break;
        }
      }

      if (salesforceId) {
        resolved[key] = salesforceId;
      } else {
        // Keep the original value if we can't resolve
        resolved[key] = value;
      }
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}
