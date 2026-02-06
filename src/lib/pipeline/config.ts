/**
 * Pipeline Configuration
 *
 * This module defines the configurable deployment pipeline for Salesforce Revenue Cloud objects.
 * The pipeline handles object hierarchies, execution order, and ID dependencies.
 *
 * Based on Salesforce Revenue Cloud API endpoints:
 * - /services/data/v60.0/sobjects/AttributePicklist/
 * - /services/data/v60.0/sobjects/AttributePicklistValue/
 * - /services/data/v60.0/sobjects/AttributeDefinition/
 * - /services/data/v60.0/sobjects/ProductClassification/
 * - /services/data/v60.0/sobjects/ProductClassificationAttr/
 * - /services/data/v60.0/sobjects/ProductCategory/
 * - /services/data/v60.0/sobjects/ProductCatalog/
 * - /services/data/v60.0/sobjects/Product2/
 * - /services/data/v60.0/sobjects/ProductCategoryProduct/
 * - /services/data/v60.0/sobjects/Pricebook2/
 * - /services/data/v60.0/sobjects/PricebookEntry/
 * - /services/data/v60.0/sobjects/ProductSellingModel/
 * - /services/data/v60.0/sobjects/ProductSellingModelOption/
 */

import type { PipelineStep, PipelineConfig } from '@/types';

/**
 * Default Pipeline Configuration for Salesforce Revenue Cloud
 *
 * Objects are deployed in dependency order:
 * 1. Attribute Picklists (no dependencies)
 * 2. Attribute Picklist Values (depends on Picklists)
 * 3. Attribute Definitions (depends on Picklists)
 * 4. Product Classifications (no dependencies)
 * 5. Product Classification Attributes (depends on Classifications and Attribute Definitions)
 * 6. Product Catalogs (no dependencies)
 * 7. Product Categories (depends on Catalogs, self-referential for hierarchy)
 * 8. Products (standalone)
 * 9. Product Category Products (depends on Categories and Products)
 * 10. Product Classification Links (links classifications to products)
 * 11. Price Books (no dependencies)
 * 12. Price Book Entries (depends on Price Books and Products)
 * 13. Product Selling Models (no dependencies)
 * 14. Product Selling Model Options (depends on Selling Models and Products)
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  id: 'salesforce-revenue-cloud-pipeline',
  name: 'Salesforce Revenue Cloud Pipeline',
  description: 'Deployment pipeline for Salesforce Revenue Cloud configuration',
  version: '2.0.0',
  steps: [
    // ============================================
    // ATTRIBUTE MANAGEMENT
    // ============================================
    {
      id: 'picklists',
      name: 'Attribute Picklists',
      apiName: 'AttributePicklist',
      endpoint: '/services/data/v60.0/sobjects/AttributePicklist/',
      method: 'POST',
      worksheetName: 'AttributePicklists',
      order: 1,
      dependsOn: [],
      columns: [
        { name: 'Name', type: 'string', required: true, sfField: 'Name' },
        { name: 'Code', type: 'string', required: true, sfField: 'Code' },
        { name: 'Status', type: 'picklist', required: true, sfField: 'Status', defaultValue: 'Active', picklistValues: ['Active', 'Inactive'] },
        { name: 'DataType', type: 'picklist', required: true, sfField: 'DataType', defaultValue: 'Text', picklistValues: ['Text', 'Number', 'Date', 'Boolean'] },
        { name: 'Description', type: 'string', required: false, sfField: 'Description' },
      ],
      parentIdMappings: [],
    },
    {
      id: 'picklist_values',
      name: 'Attribute Picklist Values',
      apiName: 'AttributePicklistValue',
      endpoint: '/services/data/v60.0/sobjects/AttributePicklistValue/',
      method: 'POST',
      worksheetName: 'AttributePicklistValues',
      order: 2,
      dependsOn: ['picklists'],
      columns: [
        { name: 'PicklistId', type: 'reference', required: true, sfField: 'PicklistId', referenceTo: 'picklists', referenceDisplayField: 'Name' },
        { name: 'Name', type: 'string', required: true, sfField: 'Name' },
        { name: 'Code', type: 'string', required: true, sfField: 'Code' },
        { name: 'Status', type: 'picklist', required: true, sfField: 'Status', defaultValue: 'Active', picklistValues: ['Active', 'Inactive'] },
        { name: 'DisplayValue', type: 'string', required: true, sfField: 'DisplayValue' },
        { name: 'Value', type: 'string', required: true, sfField: 'Value' },
        { name: 'Sequence', type: 'number', required: false, sfField: 'Sequence', defaultValue: 1 },
        { name: 'IsDefault', type: 'boolean', required: false, sfField: 'IsDefault', defaultValue: false },
      ],
      parentIdMappings: [
        {
          field: 'PicklistId',
          parentStep: 'picklists',
          parentField: 'Name',
          parentIdField: 'id',
        },
      ],
    },
    {
      id: 'attributes',
      name: 'Attribute Definitions',
      apiName: 'AttributeDefinition',
      endpoint: '/services/data/v60.0/sobjects/AttributeDefinition/',
      method: 'POST',
      worksheetName: 'AttributeDefinitions',
      order: 3,
      dependsOn: ['picklists'],
      columns: [
        { name: 'Name', type: 'string', required: true, sfField: 'Name' },
        { name: 'Label', type: 'string', required: true, sfField: 'Label' },
        { name: 'DataType', type: 'picklist', required: true, sfField: 'DataType', picklistValues: ['Text', 'Number', 'Currency', 'Date', 'Checkbox', 'Picklist', 'Percent'] },
        { name: 'PicklistId', type: 'reference', required: false, sfField: 'PicklistId', referenceTo: 'picklists', referenceDisplayField: 'Name' },
        { name: 'IsActive', type: 'boolean', required: true, sfField: 'IsActive', defaultValue: true },
        { name: 'Description', type: 'string', required: false, sfField: 'Description' },
      ],
      parentIdMappings: [
        {
          field: 'PicklistId',
          parentStep: 'picklists',
          parentField: 'Name',
          parentIdField: 'id',
        },
      ],
    },

    // ============================================
    // PRODUCT CLASSIFICATION
    // ============================================
    {
      id: 'classifications',
      name: 'Product Classifications',
      apiName: 'ProductClassification',
      endpoint: '/services/data/v60.0/sobjects/ProductClassification/',
      method: 'POST',
      worksheetName: 'ProductClassifications',
      order: 4,
      dependsOn: [],
      columns: [
        { name: 'Name', type: 'string', required: true, sfField: 'Name' },
        { name: 'Code', type: 'string', required: true, sfField: 'Code' },
        { name: 'Status', type: 'picklist', required: true, sfField: 'Status', defaultValue: 'Active', picklistValues: ['Active', 'Inactive'] },
        { name: 'Description', type: 'string', required: false, sfField: 'Description' },
      ],
      parentIdMappings: [],
    },
    {
      id: 'classification_attributes',
      name: 'Classification Attributes',
      apiName: 'ProductClassificationAttr',
      endpoint: '/services/data/v60.0/sobjects/ProductClassificationAttr/',
      method: 'POST',
      worksheetName: 'ClassificationAttributes',
      order: 5,
      dependsOn: ['classifications', 'attributes'],
      columns: [
        { name: 'ProductClassificationId', type: 'reference', required: true, sfField: 'ProductClassificationId', referenceTo: 'classifications', referenceDisplayField: 'Name' },
        { name: 'AttributeDefinitionId', type: 'reference', required: true, sfField: 'AttributeDefinitionId', referenceTo: 'attributes', referenceDisplayField: 'Name' },
        { name: 'Name', type: 'string', required: true, sfField: 'Name' },
        { name: 'Status', type: 'picklist', required: true, sfField: 'Status', defaultValue: 'Active', picklistValues: ['Active', 'Inactive'] },
        { name: 'Sequence', type: 'number', required: false, sfField: 'Sequence' },
        { name: 'IsRequired', type: 'boolean', required: false, sfField: 'IsRequired', defaultValue: false },
      ],
      parentIdMappings: [
        {
          field: 'ProductClassificationId',
          parentStep: 'classifications',
          parentField: 'Name',
          parentIdField: 'id',
        },
        {
          field: 'AttributeDefinitionId',
          parentStep: 'attributes',
          parentField: 'Name',
          parentIdField: 'id',
        },
      ],
    },

    // ============================================
    // PRODUCT CATALOG
    // ============================================
    {
      id: 'catalogs',
      name: 'Product Catalogs',
      apiName: 'ProductCatalog',
      endpoint: '/services/data/v60.0/sobjects/ProductCatalog/',
      method: 'POST',
      worksheetName: 'ProductCatalogs',
      order: 6,
      dependsOn: [],
      columns: [
        { name: 'Name', type: 'string', required: true, sfField: 'Name' },
        { name: 'CatalogCode', type: 'string', required: false, sfField: 'CatalogCode' },
        { name: 'IsActive', type: 'boolean', required: true, sfField: 'IsActive', defaultValue: true },
        { name: 'Description', type: 'string', required: false, sfField: 'Description' },
      ],
      parentIdMappings: [],
    },
    {
      id: 'categories',
      name: 'Product Categories',
      apiName: 'ProductCategory',
      endpoint: '/services/data/v60.0/sobjects/ProductCategory/',
      method: 'POST',
      worksheetName: 'ProductCategories',
      order: 7,
      dependsOn: ['catalogs'],
      columns: [
        { name: 'CatalogId', type: 'reference', required: true, sfField: 'CatalogId', referenceTo: 'catalogs', referenceDisplayField: 'Name' },
        { name: 'Name', type: 'string', required: true, sfField: 'Name' },
        { name: 'CategoryCode', type: 'string', required: true, sfField: 'CategoryCode' },
        { name: 'ParentCategoryId', type: 'reference', required: false, sfField: 'ParentCategoryId', referenceTo: 'categories', referenceDisplayField: 'Name' },
        { name: 'IsActive', type: 'boolean', required: true, sfField: 'IsActive', defaultValue: true },
        { name: 'Description', type: 'string', required: false, sfField: 'Description' },
        { name: 'SortOrder', type: 'number', required: false, sfField: 'SortOrder' },
      ],
      parentIdMappings: [
        {
          field: 'CatalogId',
          parentStep: 'catalogs',
          parentField: 'Name',
          parentIdField: 'id',
        },
        {
          field: 'ParentCategoryId',
          parentStep: 'categories',
          parentField: 'Name',
          parentIdField: 'id',
        },
      ],
    },

    // ============================================
    // PRODUCTS
    // ============================================
    {
      id: 'products',
      name: 'Products',
      apiName: 'Product2',
      endpoint: '/services/data/v60.0/sobjects/Product2/',
      method: 'POST',
      worksheetName: 'Products',
      order: 8,
      dependsOn: [],
      columns: [
        { name: 'Name', type: 'string', required: true, sfField: 'Name' },
        { name: 'ProductCode', type: 'string', required: true, sfField: 'ProductCode' },
        { name: 'StockKeepingUnit', type: 'string', required: false, sfField: 'StockKeepingUnit' },
        { name: 'Description', type: 'string', required: false, sfField: 'Description' },
        { name: 'Family', type: 'string', required: false, sfField: 'Family' },
        { name: 'IsActive', type: 'boolean', required: true, sfField: 'IsActive', defaultValue: true },
        { name: 'ProductClass', type: 'picklist', required: false, sfField: 'ProductClass', picklistValues: ['Simple', 'VariationParent', 'Variation', 'Bundle', 'Set'] },
        { name: 'QuantityUnitOfMeasure', type: 'string', required: false, sfField: 'QuantityUnitOfMeasure' },
      ],
      parentIdMappings: [],
    },
    {
      id: 'category_products',
      name: 'Category Products',
      apiName: 'ProductCategoryProduct',
      endpoint: '/services/data/v60.0/sobjects/ProductCategoryProduct/',
      method: 'POST',
      worksheetName: 'CategoryProducts',
      order: 9,
      dependsOn: ['categories', 'products'],
      columns: [
        { name: 'ProductCategoryId', type: 'reference', required: true, sfField: 'ProductCategoryId', referenceTo: 'categories', referenceDisplayField: 'Name' },
        { name: 'ProductId', type: 'reference', required: true, sfField: 'ProductId', referenceTo: 'products', referenceDisplayField: 'Name' },
        { name: 'IsPrimaryCategory', type: 'boolean', required: false, sfField: 'IsPrimaryCategory', defaultValue: false },
      ],
      parentIdMappings: [
        {
          field: 'ProductCategoryId',
          parentStep: 'categories',
          parentField: 'Name',
          parentIdField: 'id',
        },
        {
          field: 'ProductId',
          parentStep: 'products',
          parentField: 'Name',
          parentIdField: 'id',
        },
      ],
    },

    // ============================================
    // PRODUCT CLASSIFICATION LINKS
    // ============================================
    {
      id: 'product_classifications',
      name: 'Product Classification Links',
      apiName: 'Product2',
      endpoint: '/services/data/v60.0/sobjects/Product2/',
      method: 'PATCH',
      worksheetName: 'ProductClassificationLinks',
      order: 10,
      dependsOn: ['products', 'classifications'],
      columns: [
        { name: 'ProductId', type: 'reference', required: true, sfField: 'Id', referenceTo: 'products', referenceDisplayField: 'Name' },
        { name: 'ProductClassificationId', type: 'reference', required: true, sfField: 'BasedOnId', referenceTo: 'classifications', referenceDisplayField: 'Name' },
        { name: 'ConfigureDuringSale', type: 'picklist', required: false, sfField: 'ConfigureDuringSale', defaultValue: 'Allowed', picklistValues: ['Allowed', 'Not Allowed', 'Required'] },
      ],
      parentIdMappings: [
        {
          field: 'ProductId',
          parentStep: 'products',
          parentField: 'Name',
          parentIdField: 'id',
        },
        {
          field: 'ProductClassificationId',
          parentStep: 'classifications',
          parentField: 'Name',
          parentIdField: 'id',
        },
      ],
    },

    // ============================================
    // PRICING
    // ============================================
    {
      id: 'pricebooks',
      name: 'Price Books',
      apiName: 'Pricebook2',
      endpoint: '/services/data/v60.0/sobjects/Pricebook2/',
      method: 'POST',
      worksheetName: 'PriceBooks',
      order: 11,
      dependsOn: [],
      columns: [
        { name: 'Name', type: 'string', required: true, sfField: 'Name' },
        { name: 'Description', type: 'string', required: false, sfField: 'Description' },
        { name: 'IsActive', type: 'boolean', required: true, sfField: 'IsActive', defaultValue: true },
      ],
      parentIdMappings: [],
    },
    {
      id: 'pricebook_entries',
      name: 'Price Book Entries',
      apiName: 'PricebookEntry',
      endpoint: '/services/data/v60.0/sobjects/PricebookEntry/',
      method: 'POST',
      worksheetName: 'PriceBookEntries',
      order: 12,
      dependsOn: ['pricebooks', 'products'],
      columns: [
        { name: 'Pricebook2Id', type: 'reference', required: true, sfField: 'Pricebook2Id', referenceTo: 'pricebooks', referenceDisplayField: 'Name' },
        { name: 'Product2Id', type: 'reference', required: true, sfField: 'Product2Id', referenceTo: 'products', referenceDisplayField: 'Name' },
        { name: 'UnitPrice', type: 'currency', required: true, sfField: 'UnitPrice' },
        { name: 'IsActive', type: 'boolean', required: true, sfField: 'IsActive', defaultValue: true },
        { name: 'UseStandardPrice', type: 'boolean', required: false, sfField: 'UseStandardPrice', defaultValue: false },
      ],
      parentIdMappings: [
        {
          field: 'Pricebook2Id',
          parentStep: 'pricebooks',
          parentField: 'Name',
          parentIdField: 'id',
        },
        {
          field: 'Product2Id',
          parentStep: 'products',
          parentField: 'Name',
          parentIdField: 'id',
        },
      ],
    },

    // ============================================
    // SELLING MODELS
    // ============================================
    {
      id: 'selling_models',
      name: 'Product Selling Models',
      apiName: 'ProductSellingModel',
      endpoint: '/services/data/v60.0/sobjects/ProductSellingModel/',
      method: 'POST',
      worksheetName: 'ProductSellingModels',
      order: 13,
      dependsOn: [],
      columns: [
        { name: 'Name', type: 'string', required: true, sfField: 'Name' },
        { name: 'SellingModelType', type: 'picklist', required: true, sfField: 'SellingModelType', picklistValues: ['OneTime', 'TermDefined', 'Evergreen'] },
        { name: 'PricingTermUnit', type: 'picklist', required: false, sfField: 'PricingTermUnit', picklistValues: ['Monthly', 'Yearly', 'Daily', 'Weekly'] },
        { name: 'PricingTerm', type: 'number', required: false, sfField: 'PricingTerm' },
        { name: 'Status', type: 'picklist', required: true, sfField: 'Status', defaultValue: 'Active', picklistValues: ['Active', 'Inactive'] },
        { name: 'Description', type: 'string', required: false, sfField: 'Description' },
      ],
      parentIdMappings: [],
    },
    {
      id: 'selling_model_options',
      name: 'Selling Model Options',
      apiName: 'ProductSellingModelOption',
      endpoint: '/services/data/v60.0/sobjects/ProductSellingModelOption/',
      method: 'POST',
      worksheetName: 'SellingModelOptions',
      order: 14,
      dependsOn: ['selling_models', 'products'],
      columns: [
        { name: 'ProductSellingModelId', type: 'reference', required: true, sfField: 'ProductSellingModelId', referenceTo: 'selling_models', referenceDisplayField: 'Name' },
        { name: 'Product2Id', type: 'reference', required: true, sfField: 'Product2Id', referenceTo: 'products', referenceDisplayField: 'Name' },
        { name: 'IsDefault', type: 'boolean', required: false, sfField: 'IsDefault', defaultValue: false },
      ],
      parentIdMappings: [
        {
          field: 'ProductSellingModelId',
          parentStep: 'selling_models',
          parentField: 'Name',
          parentIdField: 'id',
        },
        {
          field: 'Product2Id',
          parentStep: 'products',
          parentField: 'Name',
          parentIdField: 'id',
        },
      ],
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Existing ID References Configuration
 * These are Salesforce IDs that exist in the org and can be referenced during deployment
 */
export interface ExistingIdReference {
  id: string;
  name: string;
  objectType: string;
  salesforceId: string;
  description?: string;
}

export interface ExistingIdsConfig {
  catalogs: ExistingIdReference[];
  pricebooks: ExistingIdReference[];
  sellingModels: ExistingIdReference[];
  classifications: ExistingIdReference[];
}

/**
 * Validate pipeline configuration
 * Ensures all dependencies are valid and no circular references exist
 */
export function validatePipelineConfig(config: PipelineConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const stepIds = new Set(config.steps.map((s) => s.id));

  for (const step of config.steps) {
    // Check dependencies exist
    for (const depId of step.dependsOn) {
      if (!stepIds.has(depId)) {
        errors.push(`Step "${step.name}" depends on non-existent step "${depId}"`);
      }
    }

    // Check parent mappings reference valid steps
    for (const mapping of step.parentIdMappings) {
      if (!stepIds.has(mapping.parentStep)) {
        errors.push(
          `Step "${step.name}" has parent mapping to non-existent step "${mapping.parentStep}"`
        );
      }
    }
  }

  // Check for circular dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(stepId: string): boolean {
    if (recursionStack.has(stepId)) return true;
    if (visited.has(stepId)) return false;

    visited.add(stepId);
    recursionStack.add(stepId);

    const step = config.steps.find((s) => s.id === stepId);
    if (step) {
      for (const depId of step.dependsOn) {
        if (hasCycle(depId)) return true;
      }
    }

    recursionStack.delete(stepId);
    return false;
  }

  for (const step of config.steps) {
    visited.clear();
    recursionStack.clear();
    if (hasCycle(step.id)) {
      errors.push(`Circular dependency detected involving step "${step.name}"`);
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get execution order for pipeline steps (topological sort)
 */
export function getExecutionOrder(config: PipelineConfig): PipelineStep[] {
  const stepMap = new Map(config.steps.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const result: PipelineStep[] = [];

  function visit(stepId: string) {
    if (visited.has(stepId)) return;
    visited.add(stepId);

    const step = stepMap.get(stepId);
    if (!step) return;

    // Visit dependencies first
    for (const depId of step.dependsOn) {
      visit(depId);
    }

    result.push(step);
  }

  // Visit all steps
  for (const step of config.steps) {
    visit(step.id);
  }

  return result;
}

/**
 * Get steps grouped by category for UI display
 */
export function getStepsByCategory(config: PipelineConfig): Record<string, PipelineStep[]> {
  // Known step IDs for predefined categories
  const knownStepIds = new Set([
    'picklists', 'picklist_values', 'attributes',
    'classifications', 'classification_attributes',
    'catalogs', 'categories', 'category_products',
    'products', 'product_classifications',
    'pricebooks', 'pricebook_entries',
    'selling_models', 'selling_model_options',
  ]);

  const categories: Record<string, PipelineStep[]> = {
    'Attribute Management': config.steps.filter(s =>
      ['picklists', 'picklist_values', 'attributes'].includes(s.id)
    ),
    'Product Classification': config.steps.filter(s =>
      ['classifications', 'classification_attributes'].includes(s.id)
    ),
    'Product Catalog': config.steps.filter(s =>
      ['catalogs', 'categories', 'category_products'].includes(s.id)
    ),
    'Products': config.steps.filter(s =>
      ['products', 'product_classifications'].includes(s.id)
    ),
    'Pricing': config.steps.filter(s =>
      ['pricebooks', 'pricebook_entries'].includes(s.id)
    ),
    'Selling Models': config.steps.filter(s =>
      ['selling_models', 'selling_model_options'].includes(s.id)
    ),
  };

  // Add any custom steps that don't fit in predefined categories
  const customSteps = config.steps.filter(s => !knownStepIds.has(s.id));
  if (customSteps.length > 0) {
    categories['Custom Objects'] = customSteps;
  }

  // Filter out empty categories
  return Object.fromEntries(
    Object.entries(categories).filter(([, steps]) => steps.length > 0)
  );
}

/**
 * Get step by ID
 */
export function getStepById(config: PipelineConfig, stepId: string): PipelineStep | undefined {
  return config.steps.find(s => s.id === stepId);
}

/**
 * Get all steps that depend on a given step
 */
export function getDependentSteps(config: PipelineConfig, stepId: string): PipelineStep[] {
  return config.steps.filter(s => s.dependsOn.includes(stepId));
}

/**
 * Field mapping configurations for each step
 * Maps input field names to Salesforce API field names
 */
export function getFieldMapping(stepId: string): Record<string, string> {
  const step = DEFAULT_PIPELINE_CONFIG.steps.find(s => s.id === stepId);
  if (!step) return {};

  const mapping: Record<string, string> = {};
  for (const col of step.columns) {
    if (col.sfField) {
      mapping[col.name] = col.sfField;
    }
  }
  return mapping;
}
