/**
 * Enhanced Schema Types for Loopable Objects and Parent-Child Relationships
 *
 * This schema supports:
 * - One-to-many relationships (e.g., 1 Catalog → many Catalog Products)
 * - Nested hierarchies (Catalog → Catalog Products → Price List Items)
 * - Dynamic ID resolution during deployment
 * - Configurable schema builder
 */

// Field types supported in the schema
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'currency'
  | 'picklist'
  | 'reference'      // Reference to another object
  | 'lookup'         // Lookup to parent object (auto-resolved)
  | 'salesforce_id'; // External Salesforce ID lookup

// Field definition with enhanced metadata
export interface SchemaField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
  defaultValue?: string | number | boolean;

  // For picklist fields
  picklistValues?: string[];

  // For reference/lookup fields
  referenceTo?: string;        // Object ID this field references
  referenceField?: string;     // Field in referenced object to match (e.g., 'Code', 'Name')
  referenceDisplayField?: string; // Field to display in dropdowns

  // For auto-generated fields
  autoGenerate?: boolean;      // Auto-generate value (e.g., codes)
  autoGeneratePattern?: string; // Pattern for auto-generation (e.g., 'CAT-{sequence}')

  // Salesforce mapping
  salesforceField: string;     // Salesforce API field name

  // Additional properties from ColumnDefinition
  isKey?: boolean;              // Unique constraint field
  ignoreFromPayload?: boolean;  // Exclude from API payload (e.g., URL params)
  sameAs?: string;              // Mirror value from another field
  hideInEntryForm?: boolean;    // Hide from data entry UI
  multiSelect?: boolean;        // Allow multi-select (for lookup fields)
  externalSobject?: string;     // External SF object for lookup
}

// Relationship types between objects
export type RelationshipType =
  | 'one-to-one'
  | 'one-to-many'    // Parent has many children
  | 'many-to-many'   // Junction object
  | 'self-reference'; // Hierarchical (e.g., Category → Parent Category)

// Defines a relationship between two objects
export interface ObjectRelationship {
  id: string;
  name: string;
  type: RelationshipType;

  parentObject: string;        // Parent object ID
  childObject: string;         // Child object ID

  parentField: string;         // Field in parent used for linking (usually the identifier)
  childField: string;          // Field in child that stores the parent reference

  // For one-to-many, defines the child template
  childTemplate?: {
    inheritFields?: string[];   // Fields to inherit from parent
    defaultValues?: Record<string, unknown>;
  };

  // Cascade rules
  cascadeDelete?: boolean;     // Delete children when parent is deleted
  required?: boolean;          // Children are required for parent
  minChildren?: number;
  maxChildren?: number;
}

// Object definition in the schema
export interface SchemaObject {
  id: string;
  name: string;
  pluralName: string;
  description?: string;

  // Salesforce mapping
  salesforceObject: string;    // Salesforce API object name

  // Fields
  fields: SchemaField[];

  // Identifier field(s) - used for lookups and ID mapping
  identifierField: string;     // Primary identifier (e.g., 'Code', 'Name')
  displayField?: string;       // Field to show in UI (defaults to identifierField)

  // Deployment order
  deploymentOrder: number;

  // Object capabilities
  isLoopable?: boolean;        // Can be created in bulk/loops
  supportsHierarchy?: boolean; // Supports self-referential hierarchy

  // Parent relationships (objects this depends on)
  dependsOn?: string[];

  // UI grouping category
  category?: string;
}

// Loop definition for bulk creation
export interface LoopDefinition {
  id: string;
  name: string;
  description?: string;

  // The parent object for the loop
  parentObject: string;

  // Children to create for each parent
  children: LoopChild[];
}

export interface LoopChild {
  objectId: string;

  // How to link to parent
  parentLinkField: string;     // Field in child that links to parent

  // Template for each child
  template: {
    // Fields to copy from parent
    inheritFromParent?: {
      sourceField: string;     // Field in parent
      targetField: string;     // Field in child
    }[];

    // Static values for all children
    defaultValues?: Record<string, unknown>;

    // Nested children (for multi-level loops)
    nestedChildren?: LoopChild[];
  };

  // Cardinality
  minCount?: number;
  maxCount?: number;
}

// Complete schema configuration
export interface SchemaConfig {
  id: string;
  name: string;
  version: string;
  description?: string;

  objects: SchemaObject[];
  relationships: ObjectRelationship[];
  loops: LoopDefinition[];

  // Deployment settings
  deploymentSettings: {
    batchSize: number;
    retryOnFailure: boolean;
    stopOnError: boolean;
  };

  created_at: string;
  updated_at: string;
}

// Entry data structure that supports hierarchical data
export interface HierarchicalEntry {
  _id: string;
  _objectId: string;           // Which schema object this belongs to
  _parentId?: string;          // Parent entry ID (for nested entries)
  _childEntries?: Record<string, HierarchicalEntry[]>; // Child entries by object ID

  // Actual field data
  data: Record<string, unknown>;

  // Deployment state
  _salesforceId?: string;      // After deployment, stores the SF ID
  _deploymentStatus?: 'pending' | 'deployed' | 'failed';
  _deploymentError?: string;
}

// State for hierarchical data management
export interface HierarchicalDataState {
  entries: Record<string, HierarchicalEntry[]>;  // Entries by object ID
  expandedEntries: Set<string>;                   // Which entries are expanded in UI
  selectedEntry?: string;                         // Currently selected entry ID
}

/**
 * Helper function to create a field definition
 */
export function createField(
  name: string,
  label: string,
  type: FieldType,
  salesforceField: string,
  options: Partial<SchemaField> = {}
): SchemaField {
  return {
    name,
    label,
    type,
    salesforceField,
    required: false,
    ...options,
  };
}

/**
 * Helper function to create a reference field
 */
export function createReferenceField(
  name: string,
  label: string,
  salesforceField: string,
  referenceTo: string,
  referenceField: string,
  options: Partial<SchemaField> = {}
): SchemaField {
  return {
    name,
    label,
    type: 'reference',
    salesforceField,
    required: false,
    referenceTo,
    referenceField,
    referenceDisplayField: referenceField,
    ...options,
  };
}

/**
 * Helper function to create a lookup field (auto-resolved parent link)
 */
export function createLookupField(
  name: string,
  label: string,
  salesforceField: string,
  referenceTo: string,
  options: Partial<SchemaField> = {}
): SchemaField {
  return {
    name,
    label,
    type: 'lookup',
    salesforceField,
    required: true,
    referenceTo,
    ...options,
  };
}
