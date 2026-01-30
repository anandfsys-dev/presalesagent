/**
 * Pipeline Configuration
 *
 * This module defines the configurable deployment pipeline for Salesforce RCA objects.
 * The pipeline handles object hierarchies, execution order, and ID dependencies.
 */

import type { PipelineStep, PipelineConfig, ParentIdMapping } from '@/types';

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
      apiName: 'REVVY__MnPicklist__c', // Placeholder - adjust to actual RCA object
      objectType: 'Picklist',
      description: 'Create picklist definitions',
      order: 1,
      dependsOn: [],
      idField: 'Id',
      parentIdMappings: [],
      enabled: true,
    },
    {
      id: 'picklist_values',
      name: 'Picklist Values',
      apiName: 'REVVY__MnPicklistValue__c',
      objectType: 'PicklistValue',
      description: 'Create picklist values',
      order: 2,
      dependsOn: ['picklists'],
      idField: 'Id',
      parentIdMappings: [
        {
          sourceStep: 'picklists',
          sourceField: 'Picklist_Name',
          targetField: 'REVVY__Picklist__c',
          lookupField: 'Picklist_Name',
        },
      ],
      enabled: true,
    },
    {
      id: 'categories',
      name: 'Categories',
      apiName: 'REVVY__MnCategory__c',
      objectType: 'Category',
      description: 'Create category hierarchy',
      order: 3,
      dependsOn: [],
      idField: 'Id',
      parentIdMappings: [
        {
          sourceStep: 'categories', // Self-reference for hierarchy
          sourceField: 'Parent_Category_Code',
          targetField: 'REVVY__ParentCategory__c',
          lookupField: 'Category_Code',
        },
      ],
      enabled: true,
    },
    {
      id: 'attributes',
      name: 'Attributes',
      apiName: 'REVVY__MnAttribute__c',
      objectType: 'Attribute',
      description: 'Create product attributes',
      order: 4,
      dependsOn: ['picklists'],
      idField: 'Id',
      parentIdMappings: [
        {
          sourceStep: 'picklists',
          sourceField: 'Picklist_Name',
          targetField: 'REVVY__Picklist__c',
          lookupField: 'Picklist_Name',
        },
      ],
      enabled: true,
    },
    {
      id: 'products',
      name: 'Products',
      apiName: 'Product2',
      objectType: 'Product',
      description: 'Create products (standalone, bundles, configurable)',
      order: 5,
      dependsOn: [],
      idField: 'Id',
      parentIdMappings: [
        {
          sourceStep: 'products', // Self-reference for bundles
          sourceField: 'Parent_Product_Code',
          targetField: 'REVVY__ParentProduct__c',
          lookupField: 'Product_Code',
        },
      ],
      enabled: true,
    },
    {
      id: 'product_relationships',
      name: 'Product Relationships',
      apiName: 'REVVY__MnProductRelationship__c',
      objectType: 'ProductRelationship',
      description: 'Create product relationships (bundles, cross-sell, up-sell)',
      order: 6,
      dependsOn: ['products'],
      idField: 'Id',
      parentIdMappings: [
        {
          sourceStep: 'products',
          sourceField: 'Parent_Product_Code',
          targetField: 'REVVY__ParentProduct__c',
          lookupField: 'Product_Code',
        },
        {
          sourceStep: 'products',
          sourceField: 'Child_Product_Code',
          targetField: 'REVVY__ChildProduct__c',
          lookupField: 'Product_Code',
        },
      ],
      enabled: true,
    },
    {
      id: 'catalogs',
      name: 'Catalogs',
      apiName: 'REVVY__MnCatalog__c',
      objectType: 'Catalog',
      description: 'Create product catalogs',
      order: 7,
      dependsOn: [],
      idField: 'Id',
      parentIdMappings: [],
      enabled: true,
    },
    {
      id: 'catalog_products',
      name: 'Catalog Products',
      apiName: 'REVVY__MnCatalogNode__c',
      objectType: 'CatalogProduct',
      description: 'Associate products with catalogs',
      order: 8,
      dependsOn: ['catalogs', 'products'],
      idField: 'Id',
      parentIdMappings: [
        {
          sourceStep: 'catalogs',
          sourceField: 'Catalog_Code',
          targetField: 'REVVY__Catalog__c',
          lookupField: 'Catalog_Code',
        },
        {
          sourceStep: 'products',
          sourceField: 'Product_Code',
          targetField: 'REVVY__Product__c',
          lookupField: 'Product_Code',
        },
      ],
      enabled: true,
    },
    {
      id: 'pricebooks',
      name: 'Price Books',
      apiName: 'Pricebook2',
      objectType: 'PriceBook',
      description: 'Create price books',
      order: 9,
      dependsOn: [],
      idField: 'Id',
      parentIdMappings: [],
      enabled: true,
    },
    {
      id: 'price_list_items',
      name: 'Price List Items',
      apiName: 'PricebookEntry',
      objectType: 'PriceListItem',
      description: 'Create price list entries',
      order: 10,
      dependsOn: ['pricebooks', 'products'],
      idField: 'Id',
      parentIdMappings: [
        {
          sourceStep: 'pricebooks',
          sourceField: 'PriceBook_Code',
          targetField: 'Pricebook2Id',
          lookupField: 'PriceBook_Code',
        },
        {
          sourceStep: 'products',
          sourceField: 'Product_Code',
          targetField: 'Product2Id',
          lookupField: 'Product_Code',
        },
      ],
      enabled: true,
    },
    {
      id: 'selling_models',
      name: 'Selling Models',
      apiName: 'REVVY__MnSellingModel__c',
      objectType: 'SellingModel',
      description: 'Create selling models for products',
      order: 11,
      dependsOn: ['products'],
      idField: 'Id',
      parentIdMappings: [
        {
          sourceStep: 'products',
          sourceField: 'Product_Code',
          targetField: 'REVVY__Product__c',
          lookupField: 'Product_Code',
        },
      ],
      enabled: true,
    },
    {
      id: 'attribute_mappings',
      name: 'Attribute Mappings',
      apiName: 'REVVY__MnProductAttribute__c',
      objectType: 'AttributeMapping',
      description: 'Map attributes to products',
      order: 12,
      dependsOn: ['products', 'attributes'],
      idField: 'Id',
      parentIdMappings: [
        {
          sourceStep: 'products',
          sourceField: 'Product_Code',
          targetField: 'REVVY__Product__c',
          lookupField: 'Product_Code',
        },
        {
          sourceStep: 'attributes',
          sourceField: 'Attribute_API_Name',
          targetField: 'REVVY__Attribute__c',
          lookupField: 'Attribute_API_Name',
        },
      ],
      enabled: true,
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Get steps in execution order (topological sort based on dependencies)
 */
export function getExecutionOrder(steps: PipelineStep[]): PipelineStep[] {
  const enabledSteps = steps.filter((s) => s.enabled);
  const sorted: PipelineStep[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (step: PipelineStep) => {
    if (visited.has(step.id)) return;
    if (visiting.has(step.id)) {
      throw new Error(`Circular dependency detected: ${step.id}`);
    }

    visiting.add(step.id);

    // Visit dependencies first
    for (const depId of step.dependsOn) {
      const depStep = enabledSteps.find((s) => s.id === depId);
      if (depStep) {
        visit(depStep);
      }
    }

    visiting.delete(step.id);
    visited.add(step.id);
    sorted.push(step);
  };

  // Sort by order first, then apply topological sort
  const byOrder = [...enabledSteps].sort((a, b) => a.order - b.order);
  for (const step of byOrder) {
    visit(step);
  }

  return sorted;
}

/**
 * Validate pipeline configuration
 */
export function validatePipelineConfig(config: PipelineConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for duplicate step IDs
  const stepIds = new Set<string>();
  for (const step of config.steps) {
    if (stepIds.has(step.id)) {
      errors.push(`Duplicate step ID: ${step.id}`);
    }
    stepIds.add(step.id);
  }

  // Check for invalid dependencies
  for (const step of config.steps) {
    for (const depId of step.dependsOn) {
      if (!stepIds.has(depId)) {
        errors.push(`Step "${step.id}" depends on non-existent step: ${depId}`);
      }
    }
  }

  // Check for circular dependencies
  try {
    getExecutionOrder(config.steps);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message);
    }
  }

  // Validate parent ID mappings
  for (const step of config.steps) {
    for (const mapping of step.parentIdMappings) {
      if (mapping.sourceStep !== step.id && !stepIds.has(mapping.sourceStep)) {
        errors.push(
          `Step "${step.id}" has mapping to non-existent step: ${mapping.sourceStep}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Map worksheet name to step ID
 */
export function getStepForWorksheet(worksheetName: string, config: PipelineConfig): PipelineStep | undefined {
  const normalizedName = worksheetName.toLowerCase().replace(/[_\s-]/g, '');

  return config.steps.find((step) => {
    const stepName = step.name.toLowerCase().replace(/[_\s-]/g, '');
    const stepObjectType = step.objectType.toLowerCase().replace(/[_\s-]/g, '');
    return normalizedName === stepName || normalizedName === stepObjectType;
  });
}

/**
 * Get field mappings from Excel columns to Salesforce fields
 */
export function getFieldMapping(stepId: string): Record<string, string> {
  // This should be configurable - for now return basic mappings
  const mappings: Record<string, Record<string, string>> = {
    products: {
      Product_Code: 'ProductCode',
      Product_Name: 'Name',
      Description: 'Description',
      Product_Family: 'Family',
      Active: 'IsActive',
    },
    attributes: {
      Attribute_Name: 'Name',
      Attribute_API_Name: 'REVVY__AttributeAPIName__c',
      Data_Type: 'REVVY__DataType__c',
      Display_Type: 'REVVY__DisplayType__c',
      Sequence: 'REVVY__Sequence__c',
      Required: 'REVVY__Required__c',
      Default_Value: 'REVVY__DefaultValue__c',
      Help_Text: 'REVVY__HelpText__c',
    },
    picklists: {
      Picklist_Name: 'Name',
      Picklist_API_Name: 'REVVY__PicklistAPIName__c',
      Active: 'REVVY__Active__c',
    },
    picklist_values: {
      Value_Label: 'Name',
      Value_API_Name: 'REVVY__ValueAPIName__c',
      Display_Order: 'REVVY__DisplayOrder__c',
      Active: 'REVVY__Active__c',
      Is_Default: 'REVVY__IsDefault__c',
    },
    categories: {
      Category_Name: 'Name',
      Category_Code: 'REVVY__CategoryCode__c',
      Sequence: 'REVVY__Sequence__c',
      Active: 'REVVY__Active__c',
      Description: 'REVVY__Description__c',
    },
    catalogs: {
      Catalog_Name: 'Name',
      Catalog_Code: 'REVVY__CatalogCode__c',
      Active: 'REVVY__Active__c',
      Start_Date: 'REVVY__StartDate__c',
      End_Date: 'REVVY__EndDate__c',
      Description: 'REVVY__Description__c',
    },
    pricebooks: {
      PriceBook_Name: 'Name',
      PriceBook_Code: 'REVVY__PriceBookCode__c',
      Description: 'Description',
      Active: 'IsActive',
    },
    price_list_items: {
      List_Price: 'UnitPrice',
      Active: 'IsActive',
    },
    selling_models: {
      Selling_Model_Name: 'Name',
      Selling_Model_Code: 'REVVY__SellingModelCode__c',
      Selling_Term_Type: 'REVVY__SellingTermType__c',
      Billing_Frequency: 'REVVY__BillingFrequency__c',
      Revenue_Recognition_Method: 'REVVY__RevenueRecognitionMethod__c',
    },
    product_relationships: {
      Relationship_Type: 'REVVY__RelationshipType__c',
      Required: 'REVVY__Required__c',
      Min_Quantity: 'REVVY__MinQuantity__c',
      Max_Quantity: 'REVVY__MaxQuantity__c',
      Default_Quantity: 'REVVY__DefaultQuantity__c',
    },
    attribute_mappings: {
      Required: 'REVVY__Required__c',
      Display_Order: 'REVVY__DisplayOrder__c',
      Default_Value: 'REVVY__DefaultValue__c',
    },
  };

  return mappings[stepId] || {};
}
