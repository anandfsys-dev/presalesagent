/**
 * Salesforce Revenue Cloud Schema Configuration
 * Based on actual Product Catalog Management and Pricing ERD diagrams
 *
 * This schema covers:
 * - Product Catalog Management objects
 * - Pricing objects
 * - Attribute management
 * - Product relationships and components
 */

import type {
  SchemaConfig,
  SchemaObject,
  ObjectRelationship,
  LoopDefinition,
} from './types';
import { createField, createReferenceField, createLookupField } from './types';

// ============================================
// ATTRIBUTE MANAGEMENT OBJECTS
// ============================================

const attributePicklistObject: SchemaObject = {
  id: 'attribute_picklist',
  name: 'Attribute Picklist',
  pluralName: 'Attribute Picklists',
  description: 'Picklist definitions for product attributes',
  salesforceObject: 'AttributePicklist',
  identifierField: 'Name',
  displayField: 'Name',
  deploymentOrder: 1,
  isLoopable: true,
  fields: [
    createField('Name', 'Picklist Name', 'string', 'Name', { required: true }),
    createField('DeveloperName', 'API Name', 'string', 'DeveloperName', { required: true }),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { required: true, defaultValue: true }),
    createField('Description', 'Description', 'string', 'Description'),
  ],
};

const attributePicklistValueObject: SchemaObject = {
  id: 'attribute_picklist_value',
  name: 'Attribute Picklist Value',
  pluralName: 'Attribute Picklist Values',
  description: 'Values for attribute picklists',
  salesforceObject: 'AttributePicklistValue',
  identifierField: 'Value',
  displayField: 'Label',
  deploymentOrder: 2,
  isLoopable: true,
  dependsOn: ['attribute_picklist'],
  fields: [
    createLookupField('AttributePicklistId', 'Attribute Picklist', 'AttributePicklistId', 'attribute_picklist'),
    createField('Label', 'Label', 'string', 'Label', { required: true }),
    createField('Value', 'Value', 'string', 'Value', { required: true }),
    createField('Sequence', 'Sequence', 'number', 'Sequence'),
    createField('IsDefault', 'Is Default', 'boolean', 'IsDefault', { defaultValue: false }),
  ],
};

const attributeDefinitionObject: SchemaObject = {
  id: 'attribute_definition',
  name: 'Attribute Definition',
  pluralName: 'Attribute Definitions',
  description: 'Product attribute definitions',
  salesforceObject: 'ProductAttribute',
  identifierField: 'DeveloperName',
  displayField: 'Name',
  deploymentOrder: 3,
  isLoopable: true,
  dependsOn: ['attribute_picklist'],
  fields: [
    createField('Name', 'Attribute Name', 'string', 'Name', { required: true }),
    createField('DeveloperName', 'API Name', 'string', 'DeveloperName', { required: true }),
    createField('DataType', 'Data Type', 'picklist', 'DataType', {
      required: true,
      picklistValues: ['Text', 'Number', 'Currency', 'Date', 'Checkbox', 'Picklist', 'Percent'],
    }),
    createReferenceField('AttributePicklistId', 'Attribute Picklist', 'AttributePicklistId', 'attribute_picklist', 'Name'),
    createField('IsRequired', 'Required', 'boolean', 'IsRequired', { defaultValue: false }),
    createField('DefaultValue', 'Default Value', 'string', 'DefaultValue'),
    createField('Description', 'Description', 'string', 'Description'),
    createField('MinValue', 'Min Value', 'number', 'MinValue'),
    createField('MaxValue', 'Max Value', 'number', 'MaxValue'),
    createField('MaxLength', 'Max Length', 'number', 'MaxLength'),
    createField('Precision', 'Precision', 'number', 'Precision'),
    createField('Scale', 'Scale', 'number', 'Scale'),
  ],
};

const attributeCategoryObject: SchemaObject = {
  id: 'attribute_category',
  name: 'Attribute Category',
  pluralName: 'Attribute Categories',
  description: 'Categories for grouping attributes',
  salesforceObject: 'AttributeCategory',
  identifierField: 'DeveloperName',
  displayField: 'Name',
  deploymentOrder: 4,
  isLoopable: true,
  fields: [
    createField('Name', 'Category Name', 'string', 'Name', { required: true }),
    createField('DeveloperName', 'API Name', 'string', 'DeveloperName', { required: true }),
    createField('Description', 'Description', 'string', 'Description'),
    createField('Sequence', 'Sequence', 'number', 'Sequence'),
  ],
};

const attributeCategoryAttributeObject: SchemaObject = {
  id: 'attribute_category_attribute',
  name: 'Attribute Category Attribute',
  pluralName: 'Attribute Category Attributes',
  description: 'Links attributes to categories',
  salesforceObject: 'AttributeCategoryAttribute',
  identifierField: '_id',
  deploymentOrder: 5,
  isLoopable: true,
  dependsOn: ['attribute_category', 'attribute_definition'],
  fields: [
    createLookupField('AttributeCategoryId', 'Attribute Category', 'AttributeCategoryId', 'attribute_category'),
    createLookupField('ProductAttributeId', 'Attribute Definition', 'ProductAttributeId', 'attribute_definition'),
    createField('Sequence', 'Sequence', 'number', 'Sequence'),
  ],
};

// ============================================
// PRODUCT CATALOG OBJECTS
// ============================================

const productCatalogObject: SchemaObject = {
  id: 'product_catalog',
  name: 'Product Catalog',
  pluralName: 'Product Catalogs',
  description: 'Product catalogs for organizing categories',
  salesforceObject: 'ProductCatalog',
  identifierField: 'DeveloperName',
  displayField: 'Name',
  deploymentOrder: 6,
  isLoopable: true,
  fields: [
    createField('Name', 'Catalog Name', 'string', 'Name', { required: true }),
    createField('DeveloperName', 'API Name', 'string', 'DeveloperName', { required: true }),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { required: true, defaultValue: true }),
    createField('Description', 'Description', 'string', 'Description'),
  ],
};

const productCategoryObject: SchemaObject = {
  id: 'product_category',
  name: 'Product Category',
  pluralName: 'Product Categories',
  description: 'Product categories with hierarchical support',
  salesforceObject: 'ProductCategory',
  identifierField: 'DeveloperName',
  displayField: 'Name',
  deploymentOrder: 7,
  isLoopable: true,
  supportsHierarchy: true,
  dependsOn: ['product_catalog'],
  fields: [
    createField('Name', 'Category Name', 'string', 'Name', { required: true }),
    createField('DeveloperName', 'API Name', 'string', 'DeveloperName', { required: true }),
    createLookupField('CatalogId', 'Product Catalog', 'CatalogId', 'product_catalog'),
    createReferenceField('ParentCategoryId', 'Parent Category', 'ParentCategoryId', 'product_category', 'DeveloperName'),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { required: true, defaultValue: true }),
    createField('Description', 'Description', 'string', 'Description'),
    createField('SortOrder', 'Sort Order', 'number', 'SortOrder'),
    createField('IsNavigational', 'Is Navigational', 'boolean', 'IsNavigational', { defaultValue: true }),
  ],
};

// ============================================
// PRODUCT OBJECTS
// ============================================

const productObject: SchemaObject = {
  id: 'product',
  name: 'Product',
  pluralName: 'Products',
  description: 'Products and services (Product2)',
  salesforceObject: 'Product2',
  identifierField: 'ProductCode',
  displayField: 'Name',
  deploymentOrder: 8,
  isLoopable: true,
  fields: [
    createField('Name', 'Product Name', 'string', 'Name', { required: true }),
    createField('ProductCode', 'Product Code', 'string', 'ProductCode', { required: true }),
    createField('Description', 'Description', 'string', 'Description'),
    createField('Family', 'Product Family', 'string', 'Family'),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { required: true, defaultValue: true }),
    createField('QuantityUnitOfMeasure', 'Unit of Measure', 'string', 'QuantityUnitOfMeasure'),
    createField('StockKeepingUnit', 'SKU', 'string', 'StockKeepingUnit'),
    createField('Type', 'Product Type', 'picklist', 'Type', {
      picklistValues: ['Base', 'Bundle', 'Set', 'Component'],
    }),
  ],
};

const productCategoryProductObject: SchemaObject = {
  id: 'product_category_product',
  name: 'Product Category Product',
  pluralName: 'Product Category Products',
  description: 'Links products to categories',
  salesforceObject: 'ProductCategoryProduct',
  identifierField: '_id',
  deploymentOrder: 9,
  isLoopable: true,
  dependsOn: ['product_category', 'product'],
  fields: [
    createLookupField('ProductCategoryId', 'Product Category', 'ProductCategoryId', 'product_category'),
    createLookupField('ProductId', 'Product', 'ProductId', 'product'),
    createField('IsPrimaryCategory', 'Is Primary Category', 'boolean', 'IsPrimaryCategory', { defaultValue: false }),
  ],
};

const productAttributeDefinitionObject: SchemaObject = {
  id: 'product_attribute_definition',
  name: 'Product Attribute Definition',
  pluralName: 'Product Attribute Definitions',
  description: 'Maps attributes to products',
  salesforceObject: 'ProductAttributeSetItem',
  identifierField: '_id',
  deploymentOrder: 10,
  isLoopable: true,
  dependsOn: ['product', 'attribute_definition'],
  fields: [
    createLookupField('ProductId', 'Product', 'ProductId', 'product'),
    createLookupField('ProductAttributeId', 'Attribute Definition', 'ProductAttributeId', 'attribute_definition'),
    createField('IsRequired', 'Required', 'boolean', 'IsRequired', { defaultValue: false }),
    createField('Sequence', 'Sequence', 'number', 'Sequence'),
    createField('DefaultValue', 'Default Value', 'string', 'DefaultValue'),
  ],
};

// ============================================
// PRODUCT CLASSIFICATION OBJECTS
// ============================================

const productClassificationObject: SchemaObject = {
  id: 'product_classification',
  name: 'Product Classification',
  pluralName: 'Product Classifications',
  description: 'Product classification definitions',
  salesforceObject: 'ProductClassification',
  identifierField: 'DeveloperName',
  displayField: 'Name',
  deploymentOrder: 11,
  isLoopable: true,
  fields: [
    createField('Name', 'Classification Name', 'string', 'Name', { required: true }),
    createField('DeveloperName', 'API Name', 'string', 'DeveloperName', { required: true }),
    createField('Description', 'Description', 'string', 'Description'),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { defaultValue: true }),
  ],
};

const productClassificationAttributeObject: SchemaObject = {
  id: 'product_classification_attribute',
  name: 'Product Classification Attribute',
  pluralName: 'Product Classification Attributes',
  description: 'Links attributes to classifications',
  salesforceObject: 'ProductClassificationAttr',
  identifierField: '_id',
  deploymentOrder: 12,
  isLoopable: true,
  dependsOn: ['product_classification', 'attribute_definition'],
  fields: [
    createLookupField('ProductClassificationId', 'Product Classification', 'ProductClassificationId', 'product_classification'),
    createLookupField('ProductAttributeId', 'Attribute Definition', 'ProductAttributeId', 'attribute_definition'),
    createField('IsRequired', 'Required', 'boolean', 'IsRequired', { defaultValue: false }),
    createField('Sequence', 'Sequence', 'number', 'Sequence'),
  ],
};

// ============================================
// PRODUCT RELATIONSHIP OBJECTS
// ============================================

const productRelationshipTypeObject: SchemaObject = {
  id: 'product_relationship_type',
  name: 'Product Relationship Type',
  pluralName: 'Product Relationship Types',
  description: 'Types of product relationships',
  salesforceObject: 'ProductRelationshipType',
  identifierField: 'DeveloperName',
  displayField: 'Name',
  deploymentOrder: 13,
  isLoopable: true,
  fields: [
    createField('Name', 'Relationship Type Name', 'string', 'Name', { required: true }),
    createField('DeveloperName', 'API Name', 'string', 'DeveloperName', { required: true }),
    createField('Description', 'Description', 'string', 'Description'),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { defaultValue: true }),
  ],
};

const productRelatedComponentObject: SchemaObject = {
  id: 'product_related_component',
  name: 'Product Related Component',
  pluralName: 'Product Related Components',
  description: 'Product bundles and component relationships',
  salesforceObject: 'ProductRelatedComponent',
  identifierField: '_id',
  deploymentOrder: 14,
  isLoopable: true,
  dependsOn: ['product', 'product_relationship_type'],
  fields: [
    createLookupField('ParentProductId', 'Parent Product', 'ParentProductId', 'product'),
    createLookupField('ChildProductId', 'Child Product', 'ChildProductId', 'product'),
    createLookupField('ProductRelationshipTypeId', 'Relationship Type', 'ProductRelationshipTypeId', 'product_relationship_type'),
    createField('IsRequired', 'Required', 'boolean', 'IsRequired', { defaultValue: false }),
    createField('Quantity', 'Default Quantity', 'number', 'Quantity', { defaultValue: 1 }),
    createField('MinQuantity', 'Min Quantity', 'number', 'MinQuantity'),
    createField('MaxQuantity', 'Max Quantity', 'number', 'MaxQuantity'),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { defaultValue: true }),
  ],
};

// ============================================
// PRODUCT COMPONENT GROUP OBJECTS
// ============================================

const productComponentGroupObject: SchemaObject = {
  id: 'product_component_group',
  name: 'Product Component Group',
  pluralName: 'Product Component Groups',
  description: 'Groups of product components',
  salesforceObject: 'ProductComponentGroup',
  identifierField: 'DeveloperName',
  displayField: 'Name',
  deploymentOrder: 15,
  isLoopable: true,
  dependsOn: ['product'],
  fields: [
    createField('Name', 'Group Name', 'string', 'Name', { required: true }),
    createField('DeveloperName', 'API Name', 'string', 'DeveloperName', { required: true }),
    createLookupField('ProductId', 'Product', 'ProductId', 'product'),
    createField('Description', 'Description', 'string', 'Description'),
    createField('MinQuantity', 'Min Quantity', 'number', 'MinQuantity'),
    createField('MaxQuantity', 'Max Quantity', 'number', 'MaxQuantity'),
    createField('Sequence', 'Sequence', 'number', 'Sequence'),
  ],
};

// ============================================
// PRODUCT SELLING MODEL OBJECTS
// ============================================

const productSellingModelObject: SchemaObject = {
  id: 'product_selling_model',
  name: 'Product Selling Model',
  pluralName: 'Product Selling Models',
  description: 'Selling models for products',
  salesforceObject: 'ProductSellingModel',
  identifierField: 'DeveloperName',
  displayField: 'Name',
  deploymentOrder: 16,
  isLoopable: true,
  fields: [
    createField('Name', 'Selling Model Name', 'string', 'Name', { required: true }),
    createField('DeveloperName', 'API Name', 'string', 'DeveloperName', { required: true }),
    createField('SellingModelType', 'Selling Model Type', 'picklist', 'SellingModelType', {
      required: true,
      picklistValues: ['TermDefined', 'Evergreen', 'OneTime'],
    }),
    createField('PricingTermUnit', 'Pricing Term Unit', 'picklist', 'PricingTermUnit', {
      picklistValues: ['Monthly', 'Yearly', 'Daily', 'Weekly'],
    }),
    createField('PricingTerm', 'Pricing Term', 'number', 'PricingTerm'),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { defaultValue: true }),
    createField('Description', 'Description', 'string', 'Description'),
  ],
};

const productSellingModelOptionObject: SchemaObject = {
  id: 'product_selling_model_option',
  name: 'Product Selling Model Option',
  pluralName: 'Product Selling Model Options',
  description: 'Links selling models to products',
  salesforceObject: 'ProductSellingModelOption',
  identifierField: '_id',
  deploymentOrder: 17,
  isLoopable: true,
  dependsOn: ['product', 'product_selling_model'],
  fields: [
    createLookupField('ProductId', 'Product', 'ProductId', 'product'),
    createLookupField('ProductSellingModelId', 'Product Selling Model', 'ProductSellingModelId', 'product_selling_model'),
    createField('IsDefault', 'Is Default', 'boolean', 'IsDefault', { defaultValue: false }),
  ],
};

// ============================================
// PRORATION POLICY
// ============================================

const prorationPolicyObject: SchemaObject = {
  id: 'proration_policy',
  name: 'Proration Policy',
  pluralName: 'Proration Policies',
  description: 'Proration policies for billing',
  salesforceObject: 'ProrationPolicy',
  identifierField: 'DeveloperName',
  displayField: 'Name',
  deploymentOrder: 18,
  isLoopable: true,
  fields: [
    createField('Name', 'Policy Name', 'string', 'Name', { required: true }),
    createField('DeveloperName', 'API Name', 'string', 'DeveloperName', { required: true }),
    createField('ProrationType', 'Proration Type', 'picklist', 'ProrationType', {
      required: true,
      picklistValues: ['FullMonth', 'Daily', 'None'],
    }),
    createField('Description', 'Description', 'string', 'Description'),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { defaultValue: true }),
  ],
};

// ============================================
// PRICING OBJECTS
// ============================================

const pricebookObject: SchemaObject = {
  id: 'pricebook',
  name: 'Price Book',
  pluralName: 'Price Books',
  description: 'Price books for products (Pricebook2)',
  salesforceObject: 'Pricebook2',
  identifierField: 'Name',
  displayField: 'Name',
  deploymentOrder: 19,
  isLoopable: true,
  fields: [
    createField('Name', 'Price Book Name', 'string', 'Name', { required: true }),
    createField('Description', 'Description', 'string', 'Description'),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { required: true, defaultValue: true }),
    createField('IsStandard', 'Is Standard', 'boolean', 'IsStandard', { defaultValue: false }),
  ],
};

const pricebookEntryObject: SchemaObject = {
  id: 'pricebook_entry',
  name: 'Price Book Entry',
  pluralName: 'Price Book Entries',
  description: 'Product prices in price books',
  salesforceObject: 'PricebookEntry',
  identifierField: '_id',
  deploymentOrder: 20,
  isLoopable: true,
  dependsOn: ['pricebook', 'product'],
  fields: [
    createLookupField('Pricebook2Id', 'Price Book', 'Pricebook2Id', 'pricebook'),
    createLookupField('Product2Id', 'Product', 'Product2Id', 'product'),
    createField('UnitPrice', 'List Price', 'currency', 'UnitPrice', { required: true }),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { required: true, defaultValue: true }),
    createField('UseStandardPrice', 'Use Standard Price', 'boolean', 'UseStandardPrice', { defaultValue: false }),
  ],
};

// ============================================
// PRICE ADJUSTMENT OBJECTS
// ============================================

const priceAdjustmentScheduleObject: SchemaObject = {
  id: 'price_adjustment_schedule',
  name: 'Price Adjustment Schedule',
  pluralName: 'Price Adjustment Schedules',
  description: 'Discount/adjustment schedules',
  salesforceObject: 'PriceAdjustmentSchedule',
  identifierField: 'DeveloperName',
  displayField: 'Name',
  deploymentOrder: 21,
  isLoopable: true,
  fields: [
    createField('Name', 'Schedule Name', 'string', 'Name', { required: true }),
    createField('DeveloperName', 'API Name', 'string', 'DeveloperName', { required: true }),
    createField('AdjustmentType', 'Adjustment Type', 'picklist', 'AdjustmentType', {
      required: true,
      picklistValues: ['Discount', 'Surcharge'],
    }),
    createField('AdjustmentMethod', 'Adjustment Method', 'picklist', 'AdjustmentMethod', {
      required: true,
      picklistValues: ['Percentage', 'Amount'],
    }),
    createField('Description', 'Description', 'string', 'Description'),
    createField('IsActive', 'Active', 'boolean', 'IsActive', { defaultValue: true }),
  ],
};

const priceAdjustmentTierObject: SchemaObject = {
  id: 'price_adjustment_tier',
  name: 'Price Adjustment Tier',
  pluralName: 'Price Adjustment Tiers',
  description: 'Tiers for price adjustment schedules',
  salesforceObject: 'PriceAdjustmentTier',
  identifierField: '_id',
  deploymentOrder: 22,
  isLoopable: true,
  dependsOn: ['price_adjustment_schedule'],
  fields: [
    createLookupField('PriceAdjustmentScheduleId', 'Price Adjustment Schedule', 'PriceAdjustmentScheduleId', 'price_adjustment_schedule'),
    createField('TierType', 'Tier Type', 'picklist', 'TierType', {
      required: true,
      picklistValues: ['Range', 'Slab'],
    }),
    createField('LowerBound', 'Lower Bound', 'number', 'LowerBound', { required: true }),
    createField('UpperBound', 'Upper Bound', 'number', 'UpperBound'),
    createField('AdjustmentValue', 'Adjustment Value', 'number', 'AdjustmentValue', { required: true }),
    createField('Sequence', 'Sequence', 'number', 'Sequence'),
  ],
};

// ============================================
// RELATIONSHIPS
// ============================================

const relationships: ObjectRelationship[] = [
  // Attribute Picklist → Values
  {
    id: 'attr_picklist_to_values',
    name: 'Picklist Values',
    type: 'one-to-many',
    parentObject: 'attribute_picklist',
    childObject: 'attribute_picklist_value',
    parentField: 'Name',
    childField: 'AttributePicklistId',
    cascadeDelete: true,
    minChildren: 1,
  },

  // Attribute Category → Attribute Category Attributes
  {
    id: 'attr_category_to_attrs',
    name: 'Category Attributes',
    type: 'one-to-many',
    parentObject: 'attribute_category',
    childObject: 'attribute_category_attribute',
    parentField: 'DeveloperName',
    childField: 'AttributeCategoryId',
  },

  // Product Catalog → Product Categories
  {
    id: 'catalog_to_categories',
    name: 'Categories',
    type: 'one-to-many',
    parentObject: 'product_catalog',
    childObject: 'product_category',
    parentField: 'DeveloperName',
    childField: 'CatalogId',
    cascadeDelete: true,
  },

  // Product Category → Subcategories (self-reference)
  {
    id: 'category_hierarchy',
    name: 'Subcategories',
    type: 'self-reference',
    parentObject: 'product_category',
    childObject: 'product_category',
    parentField: 'DeveloperName',
    childField: 'ParentCategoryId',
  },

  // Product Category → Product Category Products
  {
    id: 'category_to_products',
    name: 'Category Products',
    type: 'one-to-many',
    parentObject: 'product_category',
    childObject: 'product_category_product',
    parentField: 'DeveloperName',
    childField: 'ProductCategoryId',
  },

  // Product → Product Category Products
  {
    id: 'product_to_categories',
    name: 'Product Categories',
    type: 'one-to-many',
    parentObject: 'product',
    childObject: 'product_category_product',
    parentField: 'ProductCode',
    childField: 'ProductId',
  },

  // Product → Product Attribute Definitions
  {
    id: 'product_to_attributes',
    name: 'Product Attributes',
    type: 'one-to-many',
    parentObject: 'product',
    childObject: 'product_attribute_definition',
    parentField: 'ProductCode',
    childField: 'ProductId',
  },

  // Product Classification → Attributes
  {
    id: 'classification_to_attrs',
    name: 'Classification Attributes',
    type: 'one-to-many',
    parentObject: 'product_classification',
    childObject: 'product_classification_attribute',
    parentField: 'DeveloperName',
    childField: 'ProductClassificationId',
  },

  // Product → Related Components (Parent)
  {
    id: 'product_to_components',
    name: 'Bundle Components',
    type: 'one-to-many',
    parentObject: 'product',
    childObject: 'product_related_component',
    parentField: 'ProductCode',
    childField: 'ParentProductId',
  },

  // Product → Component Groups
  {
    id: 'product_to_groups',
    name: 'Component Groups',
    type: 'one-to-many',
    parentObject: 'product',
    childObject: 'product_component_group',
    parentField: 'ProductCode',
    childField: 'ProductId',
  },

  // Product Selling Model → Options
  {
    id: 'selling_model_to_options',
    name: 'Selling Model Options',
    type: 'one-to-many',
    parentObject: 'product_selling_model',
    childObject: 'product_selling_model_option',
    parentField: 'DeveloperName',
    childField: 'ProductSellingModelId',
  },

  // Product → Selling Model Options
  {
    id: 'product_to_selling_models',
    name: 'Product Selling Models',
    type: 'one-to-many',
    parentObject: 'product',
    childObject: 'product_selling_model_option',
    parentField: 'ProductCode',
    childField: 'ProductId',
  },

  // Price Book → Entries
  {
    id: 'pricebook_to_entries',
    name: 'Price Book Entries',
    type: 'one-to-many',
    parentObject: 'pricebook',
    childObject: 'pricebook_entry',
    parentField: 'Name',
    childField: 'Pricebook2Id',
    cascadeDelete: true,
    minChildren: 1,
  },

  // Product → Price Book Entries
  {
    id: 'product_to_prices',
    name: 'Product Prices',
    type: 'one-to-many',
    parentObject: 'product',
    childObject: 'pricebook_entry',
    parentField: 'ProductCode',
    childField: 'Product2Id',
  },

  // Price Adjustment Schedule → Tiers
  {
    id: 'schedule_to_tiers',
    name: 'Adjustment Tiers',
    type: 'one-to-many',
    parentObject: 'price_adjustment_schedule',
    childObject: 'price_adjustment_tier',
    parentField: 'DeveloperName',
    childField: 'PriceAdjustmentScheduleId',
    cascadeDelete: true,
    minChildren: 1,
  },
];

// ============================================
// LOOP DEFINITIONS
// ============================================

const loops: LoopDefinition[] = [
  // Attribute Picklist with Values
  {
    id: 'picklist_with_values',
    name: 'Attribute Picklist with Values',
    description: 'Create an attribute picklist and add values',
    parentObject: 'attribute_picklist',
    children: [
      {
        objectId: 'attribute_picklist_value',
        parentLinkField: 'AttributePicklistId',
        template: {
          inheritFromParent: [
            { sourceField: 'Name', targetField: 'AttributePicklistId' },
          ],
        },
        minCount: 1,
      },
    ],
  },

  // Product Catalog with Categories
  {
    id: 'catalog_with_categories',
    name: 'Product Catalog with Categories',
    description: 'Create a catalog and add categories',
    parentObject: 'product_catalog',
    children: [
      {
        objectId: 'product_category',
        parentLinkField: 'CatalogId',
        template: {
          inheritFromParent: [
            { sourceField: 'DeveloperName', targetField: 'CatalogId' },
          ],
          defaultValues: {
            IsActive: true,
            IsNavigational: true,
          },
        },
      },
    ],
  },

  // Product Category with Products
  {
    id: 'category_with_products',
    name: 'Product Category with Products',
    description: 'Assign products to a category',
    parentObject: 'product_category',
    children: [
      {
        objectId: 'product_category_product',
        parentLinkField: 'ProductCategoryId',
        template: {
          inheritFromParent: [
            { sourceField: 'DeveloperName', targetField: 'ProductCategoryId' },
          ],
        },
      },
    ],
  },

  // Product with Attributes
  {
    id: 'product_with_attributes',
    name: 'Product with Attributes',
    description: 'Define attributes for a product',
    parentObject: 'product',
    children: [
      {
        objectId: 'product_attribute_definition',
        parentLinkField: 'ProductId',
        template: {
          inheritFromParent: [
            { sourceField: 'ProductCode', targetField: 'ProductId' },
          ],
        },
      },
    ],
  },

  // Product Bundle with Components
  {
    id: 'bundle_with_components',
    name: 'Product Bundle with Components',
    description: 'Create a bundle with component products',
    parentObject: 'product',
    children: [
      {
        objectId: 'product_related_component',
        parentLinkField: 'ParentProductId',
        template: {
          inheritFromParent: [
            { sourceField: 'ProductCode', targetField: 'ParentProductId' },
          ],
          defaultValues: {
            Quantity: 1,
            IsActive: true,
          },
        },
      },
    ],
  },

  // Product with Selling Models
  {
    id: 'product_with_selling_models',
    name: 'Product with Selling Models',
    description: 'Assign selling models to a product',
    parentObject: 'product',
    children: [
      {
        objectId: 'product_selling_model_option',
        parentLinkField: 'ProductId',
        template: {
          inheritFromParent: [
            { sourceField: 'ProductCode', targetField: 'ProductId' },
          ],
        },
      },
    ],
  },

  // Price Book with Entries
  {
    id: 'pricebook_with_entries',
    name: 'Price Book with Entries',
    description: 'Create a price book and add product prices',
    parentObject: 'pricebook',
    children: [
      {
        objectId: 'pricebook_entry',
        parentLinkField: 'Pricebook2Id',
        template: {
          inheritFromParent: [
            { sourceField: 'Name', targetField: 'Pricebook2Id' },
          ],
          defaultValues: {
            IsActive: true,
          },
        },
        minCount: 1,
      },
    ],
  },

  // Price Adjustment Schedule with Tiers
  {
    id: 'schedule_with_tiers',
    name: 'Price Adjustment Schedule with Tiers',
    description: 'Create a discount schedule with tier levels',
    parentObject: 'price_adjustment_schedule',
    children: [
      {
        objectId: 'price_adjustment_tier',
        parentLinkField: 'PriceAdjustmentScheduleId',
        template: {
          inheritFromParent: [
            { sourceField: 'DeveloperName', targetField: 'PriceAdjustmentScheduleId' },
          ],
        },
        minCount: 1,
      },
    ],
  },

  // Attribute Category with Attributes
  {
    id: 'attr_category_with_attrs',
    name: 'Attribute Category with Attributes',
    description: 'Create an attribute category and assign attributes',
    parentObject: 'attribute_category',
    children: [
      {
        objectId: 'attribute_category_attribute',
        parentLinkField: 'AttributeCategoryId',
        template: {
          inheritFromParent: [
            { sourceField: 'DeveloperName', targetField: 'AttributeCategoryId' },
          ],
        },
      },
    ],
  },
];

// ============================================
// DEFAULT SCHEMA CONFIG
// ============================================

export const DEFAULT_SCHEMA_CONFIG: SchemaConfig = {
  id: 'salesforce-revenue-cloud-schema',
  name: 'Salesforce Revenue Cloud Schema',
  version: '2.0.0',
  description: 'Complete schema for Salesforce Revenue Cloud Product Catalog and Pricing',

  objects: [
    // Attribute Management
    attributePicklistObject,
    attributePicklistValueObject,
    attributeDefinitionObject,
    attributeCategoryObject,
    attributeCategoryAttributeObject,

    // Product Catalog
    productCatalogObject,
    productCategoryObject,

    // Products
    productObject,
    productCategoryProductObject,
    productAttributeDefinitionObject,

    // Product Classification
    productClassificationObject,
    productClassificationAttributeObject,

    // Product Relationships
    productRelationshipTypeObject,
    productRelatedComponentObject,
    productComponentGroupObject,

    // Selling Models
    productSellingModelObject,
    productSellingModelOptionObject,
    prorationPolicyObject,

    // Pricing
    pricebookObject,
    pricebookEntryObject,
    priceAdjustmentScheduleObject,
    priceAdjustmentTierObject,
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

// Group objects by category for UI display
export function getObjectsByCategory(schema: SchemaConfig): Record<string, SchemaObject[]> {
  return {
    'Attribute Management': schema.objects.filter(o =>
      ['attribute_picklist', 'attribute_picklist_value', 'attribute_definition', 'attribute_category', 'attribute_category_attribute'].includes(o.id)
    ),
    'Product Catalog': schema.objects.filter(o =>
      ['product_catalog', 'product_category'].includes(o.id)
    ),
    'Products': schema.objects.filter(o =>
      ['product', 'product_category_product', 'product_attribute_definition'].includes(o.id)
    ),
    'Product Classification': schema.objects.filter(o =>
      ['product_classification', 'product_classification_attribute'].includes(o.id)
    ),
    'Product Relationships': schema.objects.filter(o =>
      ['product_relationship_type', 'product_related_component', 'product_component_group'].includes(o.id)
    ),
    'Selling Models': schema.objects.filter(o =>
      ['product_selling_model', 'product_selling_model_option', 'proration_policy'].includes(o.id)
    ),
    'Pricing': schema.objects.filter(o =>
      ['pricebook', 'pricebook_entry', 'price_adjustment_schedule', 'price_adjustment_tier'].includes(o.id)
    ),
  };
}
