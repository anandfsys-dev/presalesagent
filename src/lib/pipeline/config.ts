/**
 * Pipeline Configuration
 *
 * This module defines the configurable deployment pipeline for Salesforce RCA objects.
 * The pipeline handles object hierarchies, execution order, and ID dependencies.
 */

import type { PipelineStep, PipelineConfig } from '@/types';

/**
 * Default Pipeline Configuration for Salesforce Revenue Cloud Advanced
 *
 * Objects are deployed in dependency order:
 * 1. Picklists (no dependencies)
 * 2. Picklist Values (depends on Picklists)
 * 3. Categories (self-referential for hierarchy)
 * 4. Attributes (depends on Picklists)
 * 5. Products (standalone first)
 * 6. Product Relationships (depends on Products)
 * 7. Catalogs (no dependencies)
 * 8. Catalog Products (depends on Catalogs and Products)
 * 9. Price Books (no dependencies)
 * 10. Price List Items (depends on Price Books and Products)
 * 11. Selling Models (depends on Products)
 * 12. Attribute Mappings (depends on Products and Attributes)
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  id: 'default-rca-pipeline',
  name: 'Default RCA Pipeline',
  description: 'Standard deployment pipeline for Salesforce Revenue Cloud Advanced',
  version: '1.0.0',
  steps: [
    {
      id: 'picklists',
      name: 'Picklists',
      apiName: 'REVVY__MnPicklist__c',
      worksheetName: 'Picklists',
      order: 1,
      dependsOn: [],
      columns: [
        { name: 'Picklist_Name', type: 'string', required: true },
        { name: 'Picklist_API_Name', type: 'string', required: true },
        { name: 'Active', type: 'boolean', required: true },
      ],
      parentIdMappings: [],
    },
    {
      id: 'picklist_values',
      name: 'Picklist Values',
      apiName: 'REVVY__MnPicklistValue__c',
      worksheetName: 'Picklist_Values',
      order: 2,
      dependsOn: ['picklists'],
      columns: [
        { name: 'Picklist_Name', type: 'reference', required: true, referenceTo: 'picklists' },
        { name: 'Value_Label', type: 'string', required: true },
        { name: 'Value_API_Name', type: 'string', required: true },
        { name: 'Display_Order', type: 'number', required: false },
        { name: 'Active', type: 'boolean', required: true },
        { name: 'Is_Default', type: 'boolean', required: false },
      ],
      parentIdMappings: [
        {
          field: 'Picklist_Name',
          parentStep: 'picklists',
          parentField: 'Picklist_Name',
        },
      ],
    },
    {
      id: 'categories',
      name: 'Categories',
      apiName: 'REVVY__MnCategory__c',
      worksheetName: 'Categories',
      order: 3,
      dependsOn: [],
      columns: [
        { name: 'Category_Name', type: 'string', required: true },
        { name: 'Category_Code', type: 'string', required: true },
        { name: 'Parent_Category_Code', type: 'reference', required: false, referenceTo: 'categories' },
        { name: 'Sequence', type: 'number', required: false },
        { name: 'Active', type: 'boolean', required: true },
        { name: 'Description', type: 'string', required: false },
      ],
      parentIdMappings: [
        {
          field: 'Parent_Category_Code',
          parentStep: 'categories',
          parentField: 'Category_Code',
        },
      ],
    },
    {
      id: 'attributes',
      name: 'Attributes',
      apiName: 'REVVY__MnAttribute__c',
      worksheetName: 'Attributes',
      order: 4,
      dependsOn: ['picklists'],
      columns: [
        { name: 'Attribute_Name', type: 'string', required: true },
        { name: 'Attribute_API_Name', type: 'string', required: true },
        { name: 'Data_Type', type: 'string', required: true },
        { name: 'Display_Type', type: 'string', required: false },
        { name: 'Picklist_Name', type: 'reference', required: false, referenceTo: 'picklists' },
        { name: 'Sequence', type: 'number', required: false },
        { name: 'Required', type: 'boolean', required: false },
        { name: 'Default_Value', type: 'string', required: false },
        { name: 'Help_Text', type: 'string', required: false },
        { name: 'Min_Value', type: 'number', required: false },
        { name: 'Max_Value', type: 'number', required: false },
        { name: 'Max_Length', type: 'number', required: false },
      ],
      parentIdMappings: [
        {
          field: 'Picklist_Name',
          parentStep: 'picklists',
          parentField: 'Picklist_Name',
        },
      ],
    },
    {
      id: 'products',
      name: 'Products',
      apiName: 'Product2',
      worksheetName: 'Products',
      order: 5,
      dependsOn: ['categories'],
      columns: [
        { name: 'Product_Code', type: 'string', required: true },
        { name: 'Product_Name', type: 'string', required: true },
        { name: 'Product_Type', type: 'string', required: true },
        { name: 'Description', type: 'string', required: false },
        { name: 'Product_Family', type: 'string', required: false },
        { name: 'Active', type: 'boolean', required: true },
        { name: 'Pricing_Method', type: 'string', required: false },
        { name: 'Revenue_Recognition_Rule', type: 'string', required: false },
        { name: 'Tax_Treatment', type: 'string', required: false },
        { name: 'Parent_Product_Code', type: 'reference', required: false, referenceTo: 'products' },
        { name: 'Category_Code', type: 'reference', required: false, referenceTo: 'categories' },
      ],
      parentIdMappings: [
        {
          field: 'Parent_Product_Code',
          parentStep: 'products',
          parentField: 'Product_Code',
        },
        {
          field: 'Category_Code',
          parentStep: 'categories',
          parentField: 'Category_Code',
        },
      ],
    },
    {
      id: 'product_relationships',
      name: 'Product Relationships',
      apiName: 'REVVY__MnProductRelationship__c',
      worksheetName: 'ProductRelationships',
      order: 6,
      dependsOn: ['products'],
      columns: [
        { name: 'Parent_Product_Code', type: 'reference', required: true, referenceTo: 'products' },
        { name: 'Child_Product_Code', type: 'reference', required: true, referenceTo: 'products' },
        { name: 'Relationship_Type', type: 'string', required: true },
        { name: 'Required', type: 'boolean', required: false },
        { name: 'Min_Quantity', type: 'number', required: false },
        { name: 'Max_Quantity', type: 'number', required: false },
        { name: 'Default_Quantity', type: 'number', required: false },
      ],
      parentIdMappings: [
        {
          field: 'Parent_Product_Code',
          parentStep: 'products',
          parentField: 'Product_Code',
        },
        {
          field: 'Child_Product_Code',
          parentStep: 'products',
          parentField: 'Product_Code',
        },
      ],
    },
    {
      id: 'catalogs',
      name: 'Catalogs',
      apiName: 'REVVY__MnCatalog__c',
      worksheetName: 'Catalogs',
      order: 7,
      dependsOn: [],
      columns: [
        { name: 'Catalog_Name', type: 'string', required: true },
        { name: 'Catalog_Code', type: 'string', required: true },
        { name: 'Active', type: 'boolean', required: true },
        { name: 'Start_Date', type: 'date', required: false },
        { name: 'End_Date', type: 'date', required: false },
        { name: 'Description', type: 'string', required: false },
      ],
      parentIdMappings: [],
    },
    {
      id: 'catalog_products',
      name: 'Catalog Products',
      apiName: 'REVVY__MnCatalogProduct__c',
      worksheetName: 'Catalog_Products',
      order: 8,
      dependsOn: ['catalogs', 'products'],
      columns: [
        { name: 'Catalog_Code', type: 'reference', required: true, referenceTo: 'catalogs' },
        { name: 'Product_Code', type: 'reference', required: true, referenceTo: 'products' },
        { name: 'Sequence', type: 'number', required: false },
      ],
      parentIdMappings: [
        {
          field: 'Catalog_Code',
          parentStep: 'catalogs',
          parentField: 'Catalog_Code',
        },
        {
          field: 'Product_Code',
          parentStep: 'products',
          parentField: 'Product_Code',
        },
      ],
    },
    {
      id: 'pricebooks',
      name: 'Price Books',
      apiName: 'Pricebook2',
      worksheetName: 'PriceBooks',
      order: 9,
      dependsOn: [],
      columns: [
        { name: 'PriceBook_Name', type: 'string', required: true },
        { name: 'PriceBook_Code', type: 'string', required: true },
        { name: 'Currency', type: 'string', required: true },
        { name: 'Active', type: 'boolean', required: true },
        { name: 'Description', type: 'string', required: false },
      ],
      parentIdMappings: [],
    },
    {
      id: 'price_list_items',
      name: 'Price List Items',
      apiName: 'PricebookEntry',
      worksheetName: 'PriceListItems',
      order: 10,
      dependsOn: ['pricebooks', 'products'],
      columns: [
        { name: 'PriceBook_Code', type: 'reference', required: true, referenceTo: 'pricebooks' },
        { name: 'Product_Code', type: 'reference', required: true, referenceTo: 'products' },
        { name: 'List_Price', type: 'currency', required: true },
        { name: 'Effective_Date', type: 'date', required: false },
        { name: 'Expiration_Date', type: 'date', required: false },
        { name: 'Discount_Schedule', type: 'string', required: false },
      ],
      parentIdMappings: [
        {
          field: 'PriceBook_Code',
          parentStep: 'pricebooks',
          parentField: 'PriceBook_Code',
        },
        {
          field: 'Product_Code',
          parentStep: 'products',
          parentField: 'Product_Code',
        },
      ],
    },
    {
      id: 'selling_models',
      name: 'Selling Models',
      apiName: 'REVVY__MnSellingModel__c',
      worksheetName: 'SellingModels',
      order: 11,
      dependsOn: ['products'],
      columns: [
        { name: 'Selling_Model_Name', type: 'string', required: true },
        { name: 'Selling_Model_Code', type: 'string', required: true },
        { name: 'Selling_Term_Type', type: 'string', required: true },
        { name: 'Billing_Frequency', type: 'string', required: false },
        { name: 'Revenue_Recognition_Method', type: 'string', required: false },
        { name: 'Product_Code', type: 'reference', required: true, referenceTo: 'products' },
      ],
      parentIdMappings: [
        {
          field: 'Product_Code',
          parentStep: 'products',
          parentField: 'Product_Code',
        },
      ],
    },
    {
      id: 'attribute_mappings',
      name: 'Attribute Mappings',
      apiName: 'REVVY__MnProductAttribute__c',
      worksheetName: 'AttributeMappings',
      order: 12,
      dependsOn: ['products', 'attributes'],
      columns: [
        { name: 'Product_Code', type: 'reference', required: true, referenceTo: 'products' },
        { name: 'Attribute_API_Name', type: 'reference', required: true, referenceTo: 'attributes' },
        { name: 'Required', type: 'boolean', required: false },
        { name: 'Display_Order', type: 'number', required: false },
        { name: 'Default_Value', type: 'string', required: false },
      ],
      parentIdMappings: [
        {
          field: 'Product_Code',
          parentStep: 'products',
          parentField: 'Product_Code',
        },
        {
          field: 'Attribute_API_Name',
          parentStep: 'attributes',
          parentField: 'Attribute_API_Name',
        },
      ],
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

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
 * Field mapping configurations for each step
 * Maps Excel column names to Salesforce API field names
 */
const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  picklists: {
    Picklist_Name: 'Name',
    Picklist_API_Name: 'REVVY__API_Name__c',
    Active: 'REVVY__Active__c',
  },
  picklist_values: {
    Picklist_Name: 'REVVY__Picklist__c',
    Value_Label: 'Name',
    Value_API_Name: 'REVVY__API_Name__c',
    Display_Order: 'REVVY__Display_Order__c',
    Active: 'REVVY__Active__c',
    Is_Default: 'REVVY__Is_Default__c',
  },
  categories: {
    Category_Name: 'Name',
    Category_Code: 'REVVY__Category_Code__c',
    Parent_Category_Code: 'REVVY__Parent_Category__c',
    Sequence: 'REVVY__Sequence__c',
    Active: 'REVVY__Active__c',
    Description: 'REVVY__Description__c',
  },
  attributes: {
    Attribute_Name: 'Name',
    Attribute_API_Name: 'REVVY__API_Name__c',
    Data_Type: 'REVVY__Data_Type__c',
    Display_Type: 'REVVY__Display_Type__c',
    Picklist_Name: 'REVVY__Picklist__c',
    Sequence: 'REVVY__Sequence__c',
    Required: 'REVVY__Required__c',
    Default_Value: 'REVVY__Default_Value__c',
    Help_Text: 'REVVY__Help_Text__c',
    Min_Value: 'REVVY__Min_Value__c',
    Max_Value: 'REVVY__Max_Value__c',
    Max_Length: 'REVVY__Max_Length__c',
  },
  products: {
    Product_Code: 'ProductCode',
    Product_Name: 'Name',
    Product_Type: 'REVVY__Product_Type__c',
    Description: 'Description',
    Product_Family: 'Family',
    Active: 'IsActive',
    Pricing_Method: 'REVVY__Pricing_Method__c',
    Revenue_Recognition_Rule: 'REVVY__Revenue_Recognition_Rule__c',
    Tax_Treatment: 'REVVY__Tax_Treatment__c',
    Parent_Product_Code: 'REVVY__Parent_Product__c',
    Category_Code: 'REVVY__Category__c',
  },
  product_relationships: {
    Parent_Product_Code: 'REVVY__Parent_Product__c',
    Child_Product_Code: 'REVVY__Child_Product__c',
    Relationship_Type: 'REVVY__Relationship_Type__c',
    Required: 'REVVY__Required__c',
    Min_Quantity: 'REVVY__Min_Quantity__c',
    Max_Quantity: 'REVVY__Max_Quantity__c',
    Default_Quantity: 'REVVY__Default_Quantity__c',
  },
  catalogs: {
    Catalog_Name: 'Name',
    Catalog_Code: 'REVVY__Catalog_Code__c',
    Active: 'REVVY__Active__c',
    Start_Date: 'REVVY__Start_Date__c',
    End_Date: 'REVVY__End_Date__c',
    Description: 'REVVY__Description__c',
  },
  catalog_products: {
    Catalog_Code: 'REVVY__Catalog__c',
    Product_Code: 'REVVY__Product__c',
    Sequence: 'REVVY__Sequence__c',
  },
  pricebooks: {
    PriceBook_Name: 'Name',
    PriceBook_Code: 'REVVY__PriceBook_Code__c',
    Currency: 'CurrencyIsoCode',
    Active: 'IsActive',
    Description: 'Description',
  },
  price_list_items: {
    PriceBook_Code: 'Pricebook2Id',
    Product_Code: 'Product2Id',
    List_Price: 'UnitPrice',
    Effective_Date: 'REVVY__Effective_Date__c',
    Expiration_Date: 'REVVY__Expiration_Date__c',
    Discount_Schedule: 'REVVY__Discount_Schedule__c',
  },
  selling_models: {
    Selling_Model_Name: 'Name',
    Selling_Model_Code: 'REVVY__Selling_Model_Code__c',
    Selling_Term_Type: 'REVVY__Selling_Term_Type__c',
    Billing_Frequency: 'REVVY__Billing_Frequency__c',
    Revenue_Recognition_Method: 'REVVY__Revenue_Recognition_Method__c',
    Product_Code: 'REVVY__Product__c',
  },
  attribute_mappings: {
    Product_Code: 'REVVY__Product__c',
    Attribute_API_Name: 'REVVY__Attribute__c',
    Required: 'REVVY__Required__c',
    Display_Order: 'REVVY__Display_Order__c',
    Default_Value: 'REVVY__Default_Value__c',
  },
};

/**
 * Get field mapping for a pipeline step
 */
export function getFieldMapping(stepId: string): Record<string, string> {
  return FIELD_MAPPINGS[stepId] || {};
}
