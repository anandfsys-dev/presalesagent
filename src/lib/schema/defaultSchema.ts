/**
 * Default Schema Configuration for Salesforce Revenue Cloud
 *
 * This defines all objects, their fields, relationships, and loops
 */

import type {
  SchemaConfig,
  SchemaObject,
  ObjectRelationship,
  LoopDefinition,
} from './types';
import { createField, createReferenceField, createLookupField } from './types';

// ============================================
// SCHEMA OBJECTS
// ============================================

const picklistsObject: SchemaObject = {
  id: 'picklists',
  name: 'Picklist',
  pluralName: 'Picklists',
  description: 'Custom picklist definitions for Revenue Cloud',
  salesforceObject: 'REVVY__MnPicklist__c',
  identifierField: 'Picklist_Name',
  displayField: 'Picklist_Name',
  deploymentOrder: 1,
  isLoopable: true,
  fields: [
    createField('Picklist_Name', 'Picklist Name', 'string', 'Name', { required: true }),
    createField('Picklist_API_Name', 'API Name', 'string', 'REVVY__API_Name__c', { required: true }),
    createField('Active', 'Active', 'boolean', 'REVVY__Active__c', { required: true, defaultValue: true }),
  ],
};

const picklistValuesObject: SchemaObject = {
  id: 'picklist_values',
  name: 'Picklist Value',
  pluralName: 'Picklist Values',
  description: 'Values for custom picklists',
  salesforceObject: 'REVVY__MnPicklistValue__c',
  identifierField: 'Value_API_Name',
  displayField: 'Value_Label',
  deploymentOrder: 2,
  isLoopable: true,
  dependsOn: ['picklists'],
  fields: [
    createLookupField('Picklist_Name', 'Picklist', 'REVVY__Picklist__c', 'picklists'),
    createField('Value_Label', 'Value Label', 'string', 'Name', { required: true }),
    createField('Value_API_Name', 'API Name', 'string', 'REVVY__API_Name__c', { required: true }),
    createField('Display_Order', 'Display Order', 'number', 'REVVY__Display_Order__c'),
    createField('Active', 'Active', 'boolean', 'REVVY__Active__c', { required: true, defaultValue: true }),
    createField('Is_Default', 'Is Default', 'boolean', 'REVVY__Is_Default__c', { defaultValue: false }),
  ],
};

const categoriesObject: SchemaObject = {
  id: 'categories',
  name: 'Category',
  pluralName: 'Categories',
  description: 'Product categories with hierarchical support',
  salesforceObject: 'REVVY__MnCategory__c',
  identifierField: 'Category_Code',
  displayField: 'Category_Name',
  deploymentOrder: 3,
  isLoopable: true,
  supportsHierarchy: true,
  fields: [
    createField('Category_Name', 'Category Name', 'string', 'Name', { required: true }),
    createField('Category_Code', 'Category Code', 'string', 'REVVY__Category_Code__c', {
      required: true,
      autoGenerate: true,
      autoGeneratePattern: 'CAT-{sequence}',
    }),
    createReferenceField('Parent_Category_Code', 'Parent Category', 'REVVY__Parent_Category__c', 'categories', 'Category_Code'),
    createField('Sequence', 'Sequence', 'number', 'REVVY__Sequence__c'),
    createField('Active', 'Active', 'boolean', 'REVVY__Active__c', { required: true, defaultValue: true }),
    createField('Description', 'Description', 'string', 'REVVY__Description__c'),
  ],
};

const attributesObject: SchemaObject = {
  id: 'attributes',
  name: 'Attribute',
  pluralName: 'Attributes',
  description: 'Product attributes for configuration',
  salesforceObject: 'REVVY__MnAttribute__c',
  identifierField: 'Attribute_API_Name',
  displayField: 'Attribute_Name',
  deploymentOrder: 4,
  isLoopable: true,
  dependsOn: ['picklists'],
  fields: [
    createField('Attribute_Name', 'Attribute Name', 'string', 'Name', { required: true }),
    createField('Attribute_API_Name', 'API Name', 'string', 'REVVY__API_Name__c', { required: true }),
    createField('Data_Type', 'Data Type', 'picklist', 'REVVY__Data_Type__c', {
      required: true,
      picklistValues: ['Text', 'Number', 'Currency', 'Date', 'Checkbox', 'Picklist'],
    }),
    createField('Display_Type', 'Display Type', 'picklist', 'REVVY__Display_Type__c', {
      picklistValues: ['Text Box', 'Text Area', 'Dropdown', 'Radio', 'Checkbox', 'Date Picker'],
    }),
    createReferenceField('Picklist_Name', 'Picklist', 'REVVY__Picklist__c', 'picklists', 'Picklist_Name'),
    createField('Sequence', 'Sequence', 'number', 'REVVY__Sequence__c'),
    createField('Required', 'Required', 'boolean', 'REVVY__Required__c', { defaultValue: false }),
    createField('Default_Value', 'Default Value', 'string', 'REVVY__Default_Value__c'),
    createField('Help_Text', 'Help Text', 'string', 'REVVY__Help_Text__c'),
    createField('Min_Value', 'Min Value', 'number', 'REVVY__Min_Value__c'),
    createField('Max_Value', 'Max Value', 'number', 'REVVY__Max_Value__c'),
    createField('Max_Length', 'Max Length', 'number', 'REVVY__Max_Length__c'),
  ],
};

const productsObject: SchemaObject = {
  id: 'products',
  name: 'Product',
  pluralName: 'Products',
  description: 'Products and services',
  salesforceObject: 'Product2',
  identifierField: 'Product_Code',
  displayField: 'Product_Name',
  deploymentOrder: 5,
  isLoopable: true,
  supportsHierarchy: true,
  dependsOn: ['categories'],
  fields: [
    createField('Product_Code', 'Product Code', 'string', 'ProductCode', {
      required: true,
      autoGenerate: true,
      autoGeneratePattern: 'PRD-{sequence}',
    }),
    createField('Product_Name', 'Product Name', 'string', 'Name', { required: true }),
    createField('Product_Type', 'Product Type', 'picklist', 'REVVY__Product_Type__c', {
      required: true,
      picklistValues: ['Product', 'Service', 'Bundle', 'Option'],
    }),
    createField('Description', 'Description', 'string', 'Description'),
    createField('Product_Family', 'Product Family', 'string', 'Family'),
    createField('Active', 'Active', 'boolean', 'IsActive', { required: true, defaultValue: true }),
    createField('Pricing_Method', 'Pricing Method', 'picklist', 'REVVY__Pricing_Method__c', {
      picklistValues: ['List', 'Cost Plus', 'Volume', 'Tiered'],
    }),
    createField('Revenue_Recognition_Rule', 'Revenue Recognition Rule', 'string', 'REVVY__Revenue_Recognition_Rule__c'),
    createField('Tax_Treatment', 'Tax Treatment', 'picklist', 'REVVY__Tax_Treatment__c', {
      picklistValues: ['Taxable', 'Non-Taxable', 'Tax Exempt'],
    }),
    createReferenceField('Parent_Product_Code', 'Parent Product', 'REVVY__Parent_Product__c', 'products', 'Product_Code'),
    createReferenceField('Category_Code', 'Category', 'REVVY__Category__c', 'categories', 'Category_Code'),
  ],
};

const productRelationshipsObject: SchemaObject = {
  id: 'product_relationships',
  name: 'Product Relationship',
  pluralName: 'Product Relationships',
  description: 'Relationships between products (bundles, options)',
  salesforceObject: 'REVVY__MnProductRelationship__c',
  identifierField: '_id',
  deploymentOrder: 6,
  isLoopable: true,
  dependsOn: ['products'],
  fields: [
    createLookupField('Parent_Product_Code', 'Parent Product', 'REVVY__Parent_Product__c', 'products'),
    createLookupField('Child_Product_Code', 'Child Product', 'REVVY__Child_Product__c', 'products'),
    createField('Relationship_Type', 'Relationship Type', 'picklist', 'REVVY__Relationship_Type__c', {
      required: true,
      picklistValues: ['Bundle', 'Option', 'Accessory', 'Upgrade', 'Cross-Sell'],
    }),
    createField('Required', 'Required', 'boolean', 'REVVY__Required__c', { defaultValue: false }),
    createField('Min_Quantity', 'Min Quantity', 'number', 'REVVY__Min_Quantity__c', { defaultValue: 0 }),
    createField('Max_Quantity', 'Max Quantity', 'number', 'REVVY__Max_Quantity__c'),
    createField('Default_Quantity', 'Default Quantity', 'number', 'REVVY__Default_Quantity__c', { defaultValue: 1 }),
  ],
};

const catalogsObject: SchemaObject = {
  id: 'catalogs',
  name: 'Catalog',
  pluralName: 'Catalogs',
  description: 'Product catalogs',
  salesforceObject: 'REVVY__MnCatalog__c',
  identifierField: 'Catalog_Code',
  displayField: 'Catalog_Name',
  deploymentOrder: 7,
  isLoopable: true,
  fields: [
    createField('Catalog_Name', 'Catalog Name', 'string', 'Name', { required: true }),
    createField('Catalog_Code', 'Catalog Code', 'string', 'REVVY__Catalog_Code__c', {
      required: true,
      autoGenerate: true,
      autoGeneratePattern: 'CTG-{sequence}',
    }),
    createField('Active', 'Active', 'boolean', 'REVVY__Active__c', { required: true, defaultValue: true }),
    createField('Start_Date', 'Start Date', 'date', 'REVVY__Start_Date__c'),
    createField('End_Date', 'End Date', 'date', 'REVVY__End_Date__c'),
    createField('Description', 'Description', 'string', 'REVVY__Description__c'),
  ],
};

const catalogProductsObject: SchemaObject = {
  id: 'catalog_products',
  name: 'Catalog Product',
  pluralName: 'Catalog Products',
  description: 'Products assigned to catalogs',
  salesforceObject: 'REVVY__MnCatalogProduct__c',
  identifierField: '_id',
  deploymentOrder: 8,
  isLoopable: true,
  dependsOn: ['catalogs', 'products'],
  fields: [
    createLookupField('Catalog_Code', 'Catalog', 'REVVY__Catalog__c', 'catalogs'),
    createLookupField('Product_Code', 'Product', 'REVVY__Product__c', 'products'),
    createField('Sequence', 'Sequence', 'number', 'REVVY__Sequence__c'),
  ],
};

const pricebooksObject: SchemaObject = {
  id: 'pricebooks',
  name: 'Price Book',
  pluralName: 'Price Books',
  description: 'Price books for products',
  salesforceObject: 'Pricebook2',
  identifierField: 'PriceBook_Code',
  displayField: 'PriceBook_Name',
  deploymentOrder: 9,
  isLoopable: true,
  fields: [
    createField('PriceBook_Name', 'Price Book Name', 'string', 'Name', { required: true }),
    createField('PriceBook_Code', 'Price Book Code', 'string', 'REVVY__PriceBook_Code__c', {
      required: true,
      autoGenerate: true,
      autoGeneratePattern: 'PB-{sequence}',
    }),
    createField('Currency', 'Currency', 'picklist', 'CurrencyIsoCode', {
      required: true,
      picklistValues: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
      defaultValue: 'USD',
    }),
    createField('Active', 'Active', 'boolean', 'IsActive', { required: true, defaultValue: true }),
    createField('Description', 'Description', 'string', 'Description'),
  ],
};

const priceListItemsObject: SchemaObject = {
  id: 'price_list_items',
  name: 'Price List Item',
  pluralName: 'Price List Items',
  description: 'Prices for products in price books',
  salesforceObject: 'PricebookEntry',
  identifierField: '_id',
  deploymentOrder: 10,
  isLoopable: true,
  dependsOn: ['pricebooks', 'products'],
  fields: [
    createLookupField('PriceBook_Code', 'Price Book', 'Pricebook2Id', 'pricebooks'),
    createLookupField('Product_Code', 'Product', 'Product2Id', 'products'),
    createField('List_Price', 'List Price', 'currency', 'UnitPrice', { required: true }),
    createField('Effective_Date', 'Effective Date', 'date', 'REVVY__Effective_Date__c'),
    createField('Expiration_Date', 'Expiration Date', 'date', 'REVVY__Expiration_Date__c'),
    createField('Discount_Schedule', 'Discount Schedule', 'string', 'REVVY__Discount_Schedule__c'),
  ],
};

const sellingModelsObject: SchemaObject = {
  id: 'selling_models',
  name: 'Selling Model',
  pluralName: 'Selling Models',
  description: 'Selling models for products',
  salesforceObject: 'REVVY__MnSellingModel__c',
  identifierField: 'Selling_Model_Code',
  displayField: 'Selling_Model_Name',
  deploymentOrder: 11,
  isLoopable: true,
  dependsOn: ['products'],
  fields: [
    createField('Selling_Model_Name', 'Selling Model Name', 'string', 'Name', { required: true }),
    createField('Selling_Model_Code', 'Selling Model Code', 'string', 'REVVY__Selling_Model_Code__c', {
      required: true,
      autoGenerate: true,
      autoGeneratePattern: 'SM-{sequence}',
    }),
    createField('Selling_Term_Type', 'Selling Term Type', 'picklist', 'REVVY__Selling_Term_Type__c', {
      required: true,
      picklistValues: ['One-Time', 'Subscription', 'Usage-Based', 'Evergreen'],
    }),
    createField('Billing_Frequency', 'Billing Frequency', 'picklist', 'REVVY__Billing_Frequency__c', {
      picklistValues: ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'One-Time'],
    }),
    createField('Revenue_Recognition_Method', 'Revenue Recognition Method', 'string', 'REVVY__Revenue_Recognition_Method__c'),
    createLookupField('Product_Code', 'Product', 'REVVY__Product__c', 'products'),
  ],
};

const attributeMappingsObject: SchemaObject = {
  id: 'attribute_mappings',
  name: 'Attribute Mapping',
  pluralName: 'Attribute Mappings',
  description: 'Map attributes to products',
  salesforceObject: 'REVVY__MnProductAttribute__c',
  identifierField: '_id',
  deploymentOrder: 12,
  isLoopable: true,
  dependsOn: ['products', 'attributes'],
  fields: [
    createLookupField('Product_Code', 'Product', 'REVVY__Product__c', 'products'),
    createLookupField('Attribute_API_Name', 'Attribute', 'REVVY__Attribute__c', 'attributes'),
    createField('Required', 'Required', 'boolean', 'REVVY__Required__c', { defaultValue: false }),
    createField('Display_Order', 'Display Order', 'number', 'REVVY__Display_Order__c'),
    createField('Default_Value', 'Default Value', 'string', 'REVVY__Default_Value__c'),
  ],
};

// ============================================
// RELATIONSHIPS
// ============================================

const relationships: ObjectRelationship[] = [
  // Picklist → Picklist Values
  {
    id: 'picklist_to_values',
    name: 'Picklist Values',
    type: 'one-to-many',
    parentObject: 'picklists',
    childObject: 'picklist_values',
    parentField: 'Picklist_Name',
    childField: 'Picklist_Name',
    cascadeDelete: true,
    minChildren: 1,
  },

  // Category → Subcategories (self-reference)
  {
    id: 'category_hierarchy',
    name: 'Subcategories',
    type: 'self-reference',
    parentObject: 'categories',
    childObject: 'categories',
    parentField: 'Category_Code',
    childField: 'Parent_Category_Code',
  },

  // Category → Products
  {
    id: 'category_to_products',
    name: 'Category Products',
    type: 'one-to-many',
    parentObject: 'categories',
    childObject: 'products',
    parentField: 'Category_Code',
    childField: 'Category_Code',
  },

  // Product → Child Products (bundles)
  {
    id: 'product_hierarchy',
    name: 'Child Products',
    type: 'self-reference',
    parentObject: 'products',
    childObject: 'products',
    parentField: 'Product_Code',
    childField: 'Parent_Product_Code',
  },

  // Product → Product Relationships
  {
    id: 'product_to_relationships',
    name: 'Product Relationships',
    type: 'one-to-many',
    parentObject: 'products',
    childObject: 'product_relationships',
    parentField: 'Product_Code',
    childField: 'Parent_Product_Code',
  },

  // Catalog → Catalog Products
  {
    id: 'catalog_to_products',
    name: 'Catalog Products',
    type: 'one-to-many',
    parentObject: 'catalogs',
    childObject: 'catalog_products',
    parentField: 'Catalog_Code',
    childField: 'Catalog_Code',
    cascadeDelete: true,
  },

  // Price Book → Price List Items
  {
    id: 'pricebook_to_items',
    name: 'Price List Items',
    type: 'one-to-many',
    parentObject: 'pricebooks',
    childObject: 'price_list_items',
    parentField: 'PriceBook_Code',
    childField: 'PriceBook_Code',
    cascadeDelete: true,
    minChildren: 1,
  },

  // Product → Selling Models
  {
    id: 'product_to_selling_models',
    name: 'Selling Models',
    type: 'one-to-many',
    parentObject: 'products',
    childObject: 'selling_models',
    parentField: 'Product_Code',
    childField: 'Product_Code',
  },

  // Product → Attribute Mappings
  {
    id: 'product_to_attributes',
    name: 'Product Attributes',
    type: 'one-to-many',
    parentObject: 'products',
    childObject: 'attribute_mappings',
    parentField: 'Product_Code',
    childField: 'Product_Code',
  },

  // Attribute → Attribute Mappings
  {
    id: 'attribute_to_mappings',
    name: 'Attribute Usage',
    type: 'one-to-many',
    parentObject: 'attributes',
    childObject: 'attribute_mappings',
    parentField: 'Attribute_API_Name',
    childField: 'Attribute_API_Name',
  },
];

// ============================================
// LOOP DEFINITIONS
// ============================================

const loops: LoopDefinition[] = [
  // Catalog with Products loop
  {
    id: 'catalog_with_products',
    name: 'Catalog with Products',
    description: 'Create a catalog and assign multiple products to it',
    parentObject: 'catalogs',
    children: [
      {
        objectId: 'catalog_products',
        parentLinkField: 'Catalog_Code',
        template: {
          inheritFromParent: [
            { sourceField: 'Catalog_Code', targetField: 'Catalog_Code' },
          ],
        },
        minCount: 1,
      },
    ],
  },

  // Price Book with Prices loop
  {
    id: 'pricebook_with_prices',
    name: 'Price Book with Prices',
    description: 'Create a price book and set prices for multiple products',
    parentObject: 'pricebooks',
    children: [
      {
        objectId: 'price_list_items',
        parentLinkField: 'PriceBook_Code',
        template: {
          inheritFromParent: [
            { sourceField: 'PriceBook_Code', targetField: 'PriceBook_Code' },
            { sourceField: 'Currency', targetField: 'Currency' },
          ],
        },
        minCount: 1,
      },
    ],
  },

  // Picklist with Values loop
  {
    id: 'picklist_with_values',
    name: 'Picklist with Values',
    description: 'Create a picklist and add multiple values',
    parentObject: 'picklists',
    children: [
      {
        objectId: 'picklist_values',
        parentLinkField: 'Picklist_Name',
        template: {
          inheritFromParent: [
            { sourceField: 'Picklist_Name', targetField: 'Picklist_Name' },
          ],
          defaultValues: {
            Active: true,
            Is_Default: false,
          },
        },
        minCount: 1,
      },
    ],
  },

  // Product with Attributes loop
  {
    id: 'product_with_attributes',
    name: 'Product with Attributes',
    description: 'Create a product and map attributes to it',
    parentObject: 'products',
    children: [
      {
        objectId: 'attribute_mappings',
        parentLinkField: 'Product_Code',
        template: {
          inheritFromParent: [
            { sourceField: 'Product_Code', targetField: 'Product_Code' },
          ],
        },
      },
    ],
  },

  // Bundle Product loop (Product with related products)
  {
    id: 'bundle_product',
    name: 'Bundle with Components',
    description: 'Create a bundle product with component relationships',
    parentObject: 'products',
    children: [
      {
        objectId: 'product_relationships',
        parentLinkField: 'Parent_Product_Code',
        template: {
          inheritFromParent: [
            { sourceField: 'Product_Code', targetField: 'Parent_Product_Code' },
          ],
          defaultValues: {
            Relationship_Type: 'Bundle',
            Required: true,
            Default_Quantity: 1,
          },
        },
      },
    ],
  },
];

// ============================================
// DEFAULT SCHEMA CONFIG
// ============================================

export const DEFAULT_SCHEMA_CONFIG: SchemaConfig = {
  id: 'default-rca-schema',
  name: 'Salesforce Revenue Cloud Schema',
  version: '2.0.0',
  description: 'Enhanced schema with loopable objects and parent-child relationships',

  objects: [
    picklistsObject,
    picklistValuesObject,
    categoriesObject,
    attributesObject,
    productsObject,
    productRelationshipsObject,
    catalogsObject,
    catalogProductsObject,
    pricebooksObject,
    priceListItemsObject,
    sellingModelsObject,
    attributeMappingsObject,
  ],

  relationships,
  loops,

  deploymentSettings: {
    batchSize: 200,
    retryOnFailure: true,
    stopOnError: false,
  },

  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getObjectById(schema: SchemaConfig, objectId: string): SchemaObject | undefined {
  return schema.objects.find(o => o.id === objectId);
}

export function getObjectRelationships(schema: SchemaConfig, objectId: string): ObjectRelationship[] {
  return schema.relationships.filter(
    r => r.parentObject === objectId || r.childObject === objectId
  );
}

export function getChildRelationships(schema: SchemaConfig, objectId: string): ObjectRelationship[] {
  return schema.relationships.filter(r => r.parentObject === objectId);
}

export function getParentRelationships(schema: SchemaConfig, objectId: string): ObjectRelationship[] {
  return schema.relationships.filter(r => r.childObject === objectId);
}

export function getLoopsForObject(schema: SchemaConfig, objectId: string): LoopDefinition[] {
  return schema.loops.filter(l => l.parentObject === objectId);
}

export function getDeploymentOrder(schema: SchemaConfig): SchemaObject[] {
  return [...schema.objects].sort((a, b) => a.deploymentOrder - b.deploymentOrder);
}
