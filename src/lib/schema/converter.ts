/**
 * Converter: PipelineConfig → SchemaConfig
 *
 * Converts a pipeline configuration (used by the pipeline editor)
 * into a schema configuration (used by defaultSchema.ts).
 */

import type { PipelineConfig, PipelineStep, ColumnDefinition, ParentIdMapping } from '@/types';
import type {
  SchemaConfig,
  SchemaObject,
  SchemaField,
  FieldType,
  ObjectRelationship,
  LoopDefinition,
  LoopChild,
} from './types';

/**
 * Convert a camelCase or PascalCase field name into a human-readable label.
 * e.g. "ProductCode" → "Product Code", "isActive" → "Is Active"
 */
function nameToLabel(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Convert a ColumnDefinition type to a SchemaField FieldType.
 */
function mapFieldType(colType: ColumnDefinition['type']): FieldType {
  return colType as FieldType;
}

/**
 * Convert a single ColumnDefinition to a SchemaField.
 */
function columnToSchemaField(col: ColumnDefinition): SchemaField {
  const field: SchemaField = {
    name: col.name,
    label: nameToLabel(col.name),
    type: mapFieldType(col.type),
    required: col.required,
    salesforceField: col.sfField || col.name,
  };

  if (col.description !== undefined) field.description = col.description;
  if (col.defaultValue !== undefined) field.defaultValue = col.defaultValue;
  if (col.picklistValues !== undefined) field.picklistValues = col.picklistValues;
  if (col.referenceTo !== undefined) field.referenceTo = col.referenceTo;
  if (col.referenceDisplayField !== undefined) field.referenceDisplayField = col.referenceDisplayField;
  if (col.autogenerate !== undefined) field.autoGenerate = col.autogenerate;

  // Pass through additional properties
  if (col.isKey !== undefined) field.isKey = col.isKey;
  if (col.ignoreFromPayload !== undefined) field.ignoreFromPayload = col.ignoreFromPayload;
  if (col.sameAs !== undefined) field.sameAs = col.sameAs;
  if (col.hideInEntryForm !== undefined) field.hideInEntryForm = col.hideInEntryForm;
  if (col.multiSelect !== undefined) field.multiSelect = col.multiSelect;
  if (col.externalSobject !== undefined) field.externalSobject = col.externalSobject;

  return field;
}

/**
 * Guess the identifier field for a step.
 */
function guessIdentifierField(step: PipelineStep): string {
  if (step.identifierField) return step.identifierField;

  // Look for a column marked as isKey
  const keyCol = step.columns.find((c) => c.isKey);
  if (keyCol) return keyCol.name;

  // Look for common identifier field names
  const identifierNames = ['Name', 'Code', 'DeveloperName', 'ProductCode'];
  for (const name of identifierNames) {
    if (step.columns.some((c) => c.name === name)) return name;
  }

  // Fallback to first column
  return step.columns.length > 0 ? step.columns[0].name : 'Name';
}

/**
 * Convert a PipelineStep to a SchemaObject.
 */
function stepToSchemaObject(step: PipelineStep): SchemaObject {
  const obj: SchemaObject = {
    id: step.id,
    name: step.name,
    pluralName: step.pluralName || step.name + 's',
    salesforceObject: step.apiName,
    fields: step.columns.map(columnToSchemaField),
    identifierField: guessIdentifierField(step),
    displayField: step.displayField || guessIdentifierField(step),
    deploymentOrder: step.order,
    isLoopable: step.isLoopable !== undefined ? step.isLoopable : true,
    dependsOn: step.dependsOn.length > 0 ? step.dependsOn : undefined,
  };

  if (step.supportsHierarchy !== undefined) {
    obj.supportsHierarchy = step.supportsHierarchy;
  }

  if (step.category) {
    obj.category = step.category;
  }

  return obj;
}

/**
 * Derive ObjectRelationship[] from parentIdMappings across all steps.
 */
function deriveRelationships(steps: PipelineStep[]): ObjectRelationship[] {
  const relationships: ObjectRelationship[] = [];
  const seenIds = new Set<string>();

  for (const step of steps) {
    for (const mapping of step.parentIdMappings) {
      const isSelfReference = mapping.parentStep === step.id;
      const relType = isSelfReference ? 'self-reference' : 'one-to-many';
      const relId = `${mapping.parentStep}_to_${step.id}_via_${mapping.field}`;

      if (seenIds.has(relId)) continue;
      seenIds.add(relId);

      const parentStep = steps.find((s) => s.id === mapping.parentStep);
      const parentName = parentStep ? parentStep.name : mapping.parentStep;

      relationships.push({
        id: relId,
        name: `${parentName} → ${step.name}`,
        type: relType,
        parentObject: mapping.parentStep,
        childObject: step.id,
        parentField: mapping.parentField,
        childField: mapping.field,
      });
    }
  }

  return relationships;
}

/**
 * Derive LoopDefinition[] from parent-child relationships.
 * A loop is generated when a child has a required lookup (parentIdMapping) to a parent.
 */
function deriveLoops(steps: PipelineStep[], relationships: ObjectRelationship[]): LoopDefinition[] {
  const loops: LoopDefinition[] = [];
  const parentChildMap = new Map<string, { childId: string; childField: string; parentField: string }[]>();

  for (const rel of relationships) {
    if (rel.type === 'self-reference') continue;

    if (!parentChildMap.has(rel.parentObject)) {
      parentChildMap.set(rel.parentObject, []);
    }
    parentChildMap.get(rel.parentObject)!.push({
      childId: rel.childObject,
      childField: rel.childField,
      parentField: rel.parentField,
    });
  }

  for (const [parentId, children] of parentChildMap) {
    const parentStep = steps.find((s) => s.id === parentId);
    if (!parentStep) continue;

    const loopChildren: LoopChild[] = children.map((child) => ({
      objectId: child.childId,
      parentLinkField: child.childField,
      template: {
        inheritFromParent: [
          {
            sourceField: child.parentField,
            targetField: child.childField,
          },
        ],
      },
    }));

    if (loopChildren.length > 0) {
      loops.push({
        id: `${parentId}_loop`,
        name: `${parentStep.name} with children`,
        description: `Create ${parentStep.name} and related child records`,
        parentObject: parentId,
        children: loopChildren,
      });
    }
  }

  return loops;
}

/**
 * Convert a PipelineConfig into a SchemaConfig.
 */
export function pipelineConfigToSchemaConfig(config: PipelineConfig): SchemaConfig {
  const objects = config.steps.map(stepToSchemaObject);
  const relationships = deriveRelationships(config.steps);
  const loops = deriveLoops(config.steps, relationships);

  const now = new Date().toISOString();

  return {
    id: config.id,
    name: config.name,
    version: config.version,
    description: config.description,
    objects,
    relationships,
    loops,
    deploymentSettings: {
      batchSize: 200,
      retryOnFailure: true,
      stopOnError: false,
    },
    created_at: config.created_at || now,
    updated_at: now,
  };
}
