/**
 * Seed Data for Industrial Manufacturing Products Catalog
 *
 * This file contains sample data for:
 * - Simple products (fasteners, raw materials)
 * - Configurable products with attributes (motors, pumps, conveyors)
 * - Product bundles (assembly kits)
 * - Selling models (one-time, monthly term, yearly term)
 *
 * Note: Selling Model IDs are placeholders - replace with actual Salesforce IDs after deployment
 */

import type { HierarchicalEntry } from './types';

// ============================================
// SELLING MODEL ID PLACEHOLDERS
// These should be replaced with actual Salesforce IDs
// ============================================
export const SELLING_MODEL_PLACEHOLDERS = {
  ONE_TIME: '{{SELLING_MODEL_ID_ONE_TIME}}',
  MONTHLY_TERM: '{{SELLING_MODEL_ID_MONTHLY}}',
  YEARLY_TERM: '{{SELLING_MODEL_ID_YEARLY}}',
};

// ============================================
// ATTRIBUTE PICKLISTS
// ============================================
export const attributePicklists: HierarchicalEntry[] = [
  {
    _id: 'picklist_voltage',
    _objectId: 'attribute_picklist',
    data: {
      Name: 'Voltage Options',
      DeveloperName: 'Voltage_Options',
      IsActive: true,
      Description: 'Available voltage configurations for electrical equipment',
    },
    _childEntries: {
      attribute_picklist_value: [
        {
          _id: 'val_110v',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_voltage',
          data: { Label: '110V AC', Value: '110V', Sequence: 1, IsDefault: true },
        },
        {
          _id: 'val_220v',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_voltage',
          data: { Label: '220V AC', Value: '220V', Sequence: 2, IsDefault: false },
        },
        {
          _id: 'val_380v',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_voltage',
          data: { Label: '380V AC (3-Phase)', Value: '380V', Sequence: 3, IsDefault: false },
        },
        {
          _id: 'val_480v',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_voltage',
          data: { Label: '480V AC (3-Phase)', Value: '480V', Sequence: 4, IsDefault: false },
        },
      ],
    },
  },
  {
    _id: 'picklist_power_rating',
    _objectId: 'attribute_picklist',
    data: {
      Name: 'Power Rating',
      DeveloperName: 'Power_Rating',
      IsActive: true,
      Description: 'Motor and equipment power ratings',
    },
    _childEntries: {
      attribute_picklist_value: [
        {
          _id: 'val_0_5hp',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_power_rating',
          data: { Label: '0.5 HP', Value: '0.5HP', Sequence: 1, IsDefault: false },
        },
        {
          _id: 'val_1hp',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_power_rating',
          data: { Label: '1 HP', Value: '1HP', Sequence: 2, IsDefault: true },
        },
        {
          _id: 'val_2hp',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_power_rating',
          data: { Label: '2 HP', Value: '2HP', Sequence: 3, IsDefault: false },
        },
        {
          _id: 'val_5hp',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_power_rating',
          data: { Label: '5 HP', Value: '5HP', Sequence: 4, IsDefault: false },
        },
        {
          _id: 'val_10hp',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_power_rating',
          data: { Label: '10 HP', Value: '10HP', Sequence: 5, IsDefault: false },
        },
        {
          _id: 'val_25hp',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_power_rating',
          data: { Label: '25 HP', Value: '25HP', Sequence: 6, IsDefault: false },
        },
      ],
    },
  },
  {
    _id: 'picklist_material',
    _objectId: 'attribute_picklist',
    data: {
      Name: 'Material Grade',
      DeveloperName: 'Material_Grade',
      IsActive: true,
      Description: 'Material grades for industrial components',
    },
    _childEntries: {
      attribute_picklist_value: [
        {
          _id: 'val_ss304',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_material',
          data: { Label: 'Stainless Steel 304', Value: 'SS304', Sequence: 1, IsDefault: false },
        },
        {
          _id: 'val_ss316',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_material',
          data: { Label: 'Stainless Steel 316', Value: 'SS316', Sequence: 2, IsDefault: false },
        },
        {
          _id: 'val_carbon',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_material',
          data: { Label: 'Carbon Steel', Value: 'CARBON', Sequence: 3, IsDefault: true },
        },
        {
          _id: 'val_galvanized',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_material',
          data: { Label: 'Galvanized Steel', Value: 'GALV', Sequence: 4, IsDefault: false },
        },
        {
          _id: 'val_brass',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_material',
          data: { Label: 'Brass', Value: 'BRASS', Sequence: 5, IsDefault: false },
        },
        {
          _id: 'val_cast_iron',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_material',
          data: { Label: 'Cast Iron', Value: 'CAST_IRON', Sequence: 6, IsDefault: false },
        },
      ],
    },
  },
  {
    _id: 'picklist_size',
    _objectId: 'attribute_picklist',
    data: {
      Name: 'Size Options',
      DeveloperName: 'Size_Options',
      IsActive: true,
      Description: 'Standard industrial sizes',
    },
    _childEntries: {
      attribute_picklist_value: [
        {
          _id: 'val_m6',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_size',
          data: { Label: 'M6 (6mm)', Value: 'M6', Sequence: 1, IsDefault: false },
        },
        {
          _id: 'val_m8',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_size',
          data: { Label: 'M8 (8mm)', Value: 'M8', Sequence: 2, IsDefault: true },
        },
        {
          _id: 'val_m10',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_size',
          data: { Label: 'M10 (10mm)', Value: 'M10', Sequence: 3, IsDefault: false },
        },
        {
          _id: 'val_m12',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_size',
          data: { Label: 'M12 (12mm)', Value: 'M12', Sequence: 4, IsDefault: false },
        },
        {
          _id: 'val_m16',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_size',
          data: { Label: 'M16 (16mm)', Value: 'M16', Sequence: 5, IsDefault: false },
        },
      ],
    },
  },
  {
    _id: 'picklist_flow_rate',
    _objectId: 'attribute_picklist',
    data: {
      Name: 'Flow Rate',
      DeveloperName: 'Flow_Rate',
      IsActive: true,
      Description: 'Pump flow rate options',
    },
    _childEntries: {
      attribute_picklist_value: [
        {
          _id: 'val_10gpm',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_flow_rate',
          data: { Label: '10 GPM', Value: '10GPM', Sequence: 1, IsDefault: false },
        },
        {
          _id: 'val_25gpm',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_flow_rate',
          data: { Label: '25 GPM', Value: '25GPM', Sequence: 2, IsDefault: true },
        },
        {
          _id: 'val_50gpm',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_flow_rate',
          data: { Label: '50 GPM', Value: '50GPM', Sequence: 3, IsDefault: false },
        },
        {
          _id: 'val_100gpm',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_flow_rate',
          data: { Label: '100 GPM', Value: '100GPM', Sequence: 4, IsDefault: false },
        },
      ],
    },
  },
  {
    _id: 'picklist_conveyor_width',
    _objectId: 'attribute_picklist',
    data: {
      Name: 'Conveyor Width',
      DeveloperName: 'Conveyor_Width',
      IsActive: true,
      Description: 'Standard conveyor belt widths',
    },
    _childEntries: {
      attribute_picklist_value: [
        {
          _id: 'val_12in',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_conveyor_width',
          data: { Label: '12 inches', Value: '12IN', Sequence: 1, IsDefault: false },
        },
        {
          _id: 'val_18in',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_conveyor_width',
          data: { Label: '18 inches', Value: '18IN', Sequence: 2, IsDefault: true },
        },
        {
          _id: 'val_24in',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_conveyor_width',
          data: { Label: '24 inches', Value: '24IN', Sequence: 3, IsDefault: false },
        },
        {
          _id: 'val_36in',
          _objectId: 'attribute_picklist_value',
          _parentId: 'picklist_conveyor_width',
          data: { Label: '36 inches', Value: '36IN', Sequence: 4, IsDefault: false },
        },
      ],
    },
  },
];

// ============================================
// ATTRIBUTE DEFINITIONS
// ============================================
export const attributeDefinitions: HierarchicalEntry[] = [
  {
    _id: 'attr_voltage',
    _objectId: 'attribute_definition',
    data: {
      Name: 'Voltage',
      DeveloperName: 'Voltage',
      DataType: 'Picklist',
      AttributePicklistId: 'picklist_voltage', // Reference to picklist
      IsRequired: true,
      Description: 'Operating voltage for electrical equipment',
    },
  },
  {
    _id: 'attr_power_rating',
    _objectId: 'attribute_definition',
    data: {
      Name: 'Power Rating',
      DeveloperName: 'Power_Rating',
      DataType: 'Picklist',
      AttributePicklistId: 'picklist_power_rating',
      IsRequired: true,
      Description: 'Motor power rating in horsepower',
    },
  },
  {
    _id: 'attr_material',
    _objectId: 'attribute_definition',
    data: {
      Name: 'Material Grade',
      DeveloperName: 'Material_Grade',
      DataType: 'Picklist',
      AttributePicklistId: 'picklist_material',
      IsRequired: false,
      Description: 'Material grade for industrial components',
    },
  },
  {
    _id: 'attr_size',
    _objectId: 'attribute_definition',
    data: {
      Name: 'Size',
      DeveloperName: 'Size',
      DataType: 'Picklist',
      AttributePicklistId: 'picklist_size',
      IsRequired: false,
      Description: 'Component size',
    },
  },
  {
    _id: 'attr_flow_rate',
    _objectId: 'attribute_definition',
    data: {
      Name: 'Flow Rate',
      DeveloperName: 'Flow_Rate',
      DataType: 'Picklist',
      AttributePicklistId: 'picklist_flow_rate',
      IsRequired: true,
      Description: 'Pump flow rate capacity',
    },
  },
  {
    _id: 'attr_conveyor_width',
    _objectId: 'attribute_definition',
    data: {
      Name: 'Belt Width',
      DeveloperName: 'Belt_Width',
      DataType: 'Picklist',
      AttributePicklistId: 'picklist_conveyor_width',
      IsRequired: true,
      Description: 'Conveyor belt width',
    },
  },
  {
    _id: 'attr_length',
    _objectId: 'attribute_definition',
    data: {
      Name: 'Length',
      DeveloperName: 'Length',
      DataType: 'Number',
      IsRequired: false,
      Description: 'Component length in mm',
      MinValue: 1,
      MaxValue: 10000,
    },
  },
  {
    _id: 'attr_weight',
    _objectId: 'attribute_definition',
    data: {
      Name: 'Weight',
      DeveloperName: 'Weight',
      DataType: 'Number',
      IsRequired: false,
      Description: 'Component weight in kg',
      MinValue: 0,
      MaxValue: 50000,
    },
  },
];

// ============================================
// PRODUCT CLASSIFICATIONS
// ============================================
export const productClassifications: HierarchicalEntry[] = [
  {
    _id: 'class_simple',
    _objectId: 'product_classification',
    data: {
      Name: 'Simple Product',
      DeveloperName: 'Simple_Product',
      Description: 'Standard products without configurable attributes',
      IsActive: true,
    },
  },
  {
    _id: 'class_configurable',
    _objectId: 'product_classification',
    data: {
      Name: 'Configurable Product',
      DeveloperName: 'Configurable_Product',
      Description: 'Products with selectable attributes and options',
      IsActive: true,
    },
    _childEntries: {
      product_classification_attribute: [
        {
          _id: 'class_config_attr_voltage',
          _objectId: 'product_classification_attribute',
          _parentId: 'class_configurable',
          data: {
            ProductClassificationId: 'class_configurable',
            ProductAttributeId: 'attr_voltage',
            IsRequired: true,
            Sequence: 1,
          },
        },
        {
          _id: 'class_config_attr_power',
          _objectId: 'product_classification_attribute',
          _parentId: 'class_configurable',
          data: {
            ProductClassificationId: 'class_configurable',
            ProductAttributeId: 'attr_power_rating',
            IsRequired: true,
            Sequence: 2,
          },
        },
        {
          _id: 'class_config_attr_material',
          _objectId: 'product_classification_attribute',
          _parentId: 'class_configurable',
          data: {
            ProductClassificationId: 'class_configurable',
            ProductAttributeId: 'attr_material',
            IsRequired: false,
            Sequence: 3,
          },
        },
      ],
    },
  },
  {
    _id: 'class_bundle',
    _objectId: 'product_classification',
    data: {
      Name: 'Product Bundle',
      DeveloperName: 'Product_Bundle',
      Description: 'Bundled products containing multiple components',
      IsActive: true,
    },
  },
];

// ============================================
// PRODUCT CATALOG & CATEGORIES
// ============================================
export const productCatalog: HierarchicalEntry = {
  _id: 'catalog_industrial',
  _objectId: 'product_catalog',
  data: {
    Name: 'Industrial Manufacturing Catalog',
    DeveloperName: 'Industrial_Manufacturing',
    IsActive: true,
    Description: 'Comprehensive catalog for industrial manufacturing products and equipment',
  },
  _childEntries: {
    product_category: [
      // Top-level categories
      {
        _id: 'cat_hardware',
        _objectId: 'product_category',
        _parentId: 'catalog_industrial',
        data: {
          Name: 'Hardware & Fasteners',
          DeveloperName: 'Hardware_Fasteners',
          CatalogId: 'catalog_industrial',
          IsActive: true,
          Description: 'Industrial fasteners, bolts, nuts, and hardware components',
          SortOrder: 1,
          IsNavigational: true,
        },
      },
      {
        _id: 'cat_motors',
        _objectId: 'product_category',
        _parentId: 'catalog_industrial',
        data: {
          Name: 'Motors & Drives',
          DeveloperName: 'Motors_Drives',
          CatalogId: 'catalog_industrial',
          IsActive: true,
          Description: 'Electric motors, drives, and motor accessories',
          SortOrder: 2,
          IsNavigational: true,
        },
      },
      {
        _id: 'cat_pumps',
        _objectId: 'product_category',
        _parentId: 'catalog_industrial',
        data: {
          Name: 'Pumps & Fluid Handling',
          DeveloperName: 'Pumps_Fluid_Handling',
          CatalogId: 'catalog_industrial',
          IsActive: true,
          Description: 'Industrial pumps and fluid handling equipment',
          SortOrder: 3,
          IsNavigational: true,
        },
      },
      {
        _id: 'cat_conveyors',
        _objectId: 'product_category',
        _parentId: 'catalog_industrial',
        data: {
          Name: 'Conveyor Systems',
          DeveloperName: 'Conveyor_Systems',
          CatalogId: 'catalog_industrial',
          IsActive: true,
          Description: 'Material handling and conveyor equipment',
          SortOrder: 4,
          IsNavigational: true,
        },
      },
      {
        _id: 'cat_assemblies',
        _objectId: 'product_category',
        _parentId: 'catalog_industrial',
        data: {
          Name: 'Assembly Kits',
          DeveloperName: 'Assembly_Kits',
          CatalogId: 'catalog_industrial',
          IsActive: true,
          Description: 'Pre-configured assembly kits and bundles',
          SortOrder: 5,
          IsNavigational: true,
        },
      },
      {
        _id: 'cat_raw_materials',
        _objectId: 'product_category',
        _parentId: 'catalog_industrial',
        data: {
          Name: 'Raw Materials',
          DeveloperName: 'Raw_Materials',
          CatalogId: 'catalog_industrial',
          IsActive: true,
          Description: 'Steel, aluminum, and other raw materials',
          SortOrder: 6,
          IsNavigational: true,
        },
      },
    ],
  },
};

// ============================================
// SELLING MODELS
// ============================================
export const sellingModels: HierarchicalEntry[] = [
  {
    _id: 'sm_one_time',
    _objectId: 'product_selling_model',
    data: {
      Name: 'One-Time Purchase',
      DeveloperName: 'One_Time_Purchase',
      SellingModelType: 'OneTime',
      IsActive: true,
      Description: 'Standard one-time purchase model',
    },
  },
  {
    _id: 'sm_monthly',
    _objectId: 'product_selling_model',
    data: {
      Name: 'Monthly Subscription',
      DeveloperName: 'Monthly_Subscription',
      SellingModelType: 'TermDefined',
      PricingTermUnit: 'Monthly',
      PricingTerm: 1,
      IsActive: true,
      Description: 'Monthly term-based subscription',
    },
  },
  {
    _id: 'sm_yearly',
    _objectId: 'product_selling_model',
    data: {
      Name: 'Annual Subscription',
      DeveloperName: 'Annual_Subscription',
      SellingModelType: 'TermDefined',
      PricingTermUnit: 'Yearly',
      PricingTerm: 1,
      IsActive: true,
      Description: 'Annual term-based subscription',
    },
  },
];

// ============================================
// PRODUCTS - SIMPLE
// ============================================
export const simpleProducts: HierarchicalEntry[] = [
  // Hex Bolts
  {
    _id: 'prod_hex_bolt_m8',
    _objectId: 'product',
    data: {
      Name: 'Hex Head Bolt M8x30',
      ProductCode: 'HW-BOLT-M8-30',
      Description: 'Grade 8.8 hex head bolt, M8 x 30mm, zinc plated',
      Family: 'Fasteners',
      IsActive: true,
      QuantityUnitOfMeasure: 'Each',
      StockKeepingUnit: 'SKU-HW-001',
      Type: 'Base',
    },
    _childEntries: {
      product_selling_model_option: [
        {
          _id: 'psmo_hex_bolt_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_hex_bolt_m8',
          data: {
            ProductId: 'prod_hex_bolt_m8',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
      ],
    },
  },
  // Hex Nuts
  {
    _id: 'prod_hex_nut_m8',
    _objectId: 'product',
    data: {
      Name: 'Hex Nut M8',
      ProductCode: 'HW-NUT-M8',
      Description: 'Grade 8 hex nut, M8, zinc plated',
      Family: 'Fasteners',
      IsActive: true,
      QuantityUnitOfMeasure: 'Each',
      StockKeepingUnit: 'SKU-HW-002',
      Type: 'Base',
    },
    _childEntries: {
      product_selling_model_option: [
        {
          _id: 'psmo_hex_nut_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_hex_nut_m8',
          data: {
            ProductId: 'prod_hex_nut_m8',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
      ],
    },
  },
  // Flat Washers
  {
    _id: 'prod_washer_m8',
    _objectId: 'product',
    data: {
      Name: 'Flat Washer M8',
      ProductCode: 'HW-WASH-M8',
      Description: 'Flat washer, M8, zinc plated, USS standard',
      Family: 'Fasteners',
      IsActive: true,
      QuantityUnitOfMeasure: 'Each',
      StockKeepingUnit: 'SKU-HW-003',
      Type: 'Base',
    },
    _childEntries: {
      product_selling_model_option: [
        {
          _id: 'psmo_washer_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_washer_m8',
          data: {
            ProductId: 'prod_washer_m8',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
      ],
    },
  },
  // Lock Washers
  {
    _id: 'prod_lock_washer_m8',
    _objectId: 'product',
    data: {
      Name: 'Lock Washer M8',
      ProductCode: 'HW-LOCK-M8',
      Description: 'Split lock washer, M8, zinc plated',
      Family: 'Fasteners',
      IsActive: true,
      QuantityUnitOfMeasure: 'Each',
      StockKeepingUnit: 'SKU-HW-004',
      Type: 'Base',
    },
    _childEntries: {
      product_selling_model_option: [
        {
          _id: 'psmo_lock_washer_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_lock_washer_m8',
          data: {
            ProductId: 'prod_lock_washer_m8',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
      ],
    },
  },
  // Steel Plate
  {
    _id: 'prod_steel_plate',
    _objectId: 'product',
    data: {
      Name: 'Steel Plate A36 - 1/4" x 4\' x 8\'',
      ProductCode: 'RAW-STL-A36-025',
      Description: 'Hot rolled steel plate, A36 grade, 1/4" thick, 4ft x 8ft sheet',
      Family: 'Raw Materials',
      IsActive: true,
      QuantityUnitOfMeasure: 'Each',
      StockKeepingUnit: 'SKU-RAW-001',
      Type: 'Base',
    },
    _childEntries: {
      product_selling_model_option: [
        {
          _id: 'psmo_steel_plate_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_steel_plate',
          data: {
            ProductId: 'prod_steel_plate',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
      ],
    },
  },
  // Aluminum Bar
  {
    _id: 'prod_aluminum_bar',
    _objectId: 'product',
    data: {
      Name: 'Aluminum Bar 6061-T6 - 1" x 2" x 12\'',
      ProductCode: 'RAW-ALU-6061-1X2',
      Description: 'Aluminum flat bar, 6061-T6 alloy, 1" x 2" x 12ft length',
      Family: 'Raw Materials',
      IsActive: true,
      QuantityUnitOfMeasure: 'Each',
      StockKeepingUnit: 'SKU-RAW-002',
      Type: 'Base',
    },
    _childEntries: {
      product_selling_model_option: [
        {
          _id: 'psmo_aluminum_bar_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_aluminum_bar',
          data: {
            ProductId: 'prod_aluminum_bar',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
      ],
    },
  },
];

// ============================================
// PRODUCTS - CONFIGURABLE
// ============================================
export const configurableProducts: HierarchicalEntry[] = [
  // Electric Motor - Configurable
  {
    _id: 'prod_electric_motor',
    _objectId: 'product',
    data: {
      Name: 'Industrial Electric Motor',
      ProductCode: 'MOT-IND-CONFIG',
      Description: 'Heavy-duty industrial electric motor with configurable voltage, power rating, and mounting options',
      Family: 'Motors',
      IsActive: true,
      QuantityUnitOfMeasure: 'Each',
      StockKeepingUnit: 'SKU-MOT-001',
      Type: 'Base',
    },
    _childEntries: {
      product_attribute_definition: [
        {
          _id: 'pad_motor_voltage',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_electric_motor',
          data: {
            ProductId: 'prod_electric_motor',
            ProductAttributeId: 'attr_voltage',
            IsRequired: true,
            Sequence: 1,
          },
        },
        {
          _id: 'pad_motor_power',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_electric_motor',
          data: {
            ProductId: 'prod_electric_motor',
            ProductAttributeId: 'attr_power_rating',
            IsRequired: true,
            Sequence: 2,
          },
        },
        {
          _id: 'pad_motor_material',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_electric_motor',
          data: {
            ProductId: 'prod_electric_motor',
            ProductAttributeId: 'attr_material',
            IsRequired: false,
            Sequence: 3,
            DefaultValue: 'CAST_IRON',
          },
        },
      ],
      product_selling_model_option: [
        {
          _id: 'psmo_motor_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_electric_motor',
          data: {
            ProductId: 'prod_electric_motor',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
        {
          _id: 'psmo_motor_monthly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_electric_motor',
          data: {
            ProductId: 'prod_electric_motor',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.MONTHLY_TERM,
            IsDefault: false,
          },
        },
        {
          _id: 'psmo_motor_yearly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_electric_motor',
          data: {
            ProductId: 'prod_electric_motor',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.YEARLY_TERM,
            IsDefault: false,
          },
        },
      ],
    },
  },
  // Hydraulic Pump - Configurable
  {
    _id: 'prod_hydraulic_pump',
    _objectId: 'product',
    data: {
      Name: 'Hydraulic Gear Pump',
      ProductCode: 'PMP-HYD-CONFIG',
      Description: 'Industrial hydraulic gear pump with configurable flow rate, material, and power options',
      Family: 'Pumps',
      IsActive: true,
      QuantityUnitOfMeasure: 'Each',
      StockKeepingUnit: 'SKU-PMP-001',
      Type: 'Base',
    },
    _childEntries: {
      product_attribute_definition: [
        {
          _id: 'pad_pump_flow',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_hydraulic_pump',
          data: {
            ProductId: 'prod_hydraulic_pump',
            ProductAttributeId: 'attr_flow_rate',
            IsRequired: true,
            Sequence: 1,
          },
        },
        {
          _id: 'pad_pump_voltage',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_hydraulic_pump',
          data: {
            ProductId: 'prod_hydraulic_pump',
            ProductAttributeId: 'attr_voltage',
            IsRequired: true,
            Sequence: 2,
          },
        },
        {
          _id: 'pad_pump_power',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_hydraulic_pump',
          data: {
            ProductId: 'prod_hydraulic_pump',
            ProductAttributeId: 'attr_power_rating',
            IsRequired: true,
            Sequence: 3,
          },
        },
        {
          _id: 'pad_pump_material',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_hydraulic_pump',
          data: {
            ProductId: 'prod_hydraulic_pump',
            ProductAttributeId: 'attr_material',
            IsRequired: true,
            Sequence: 4,
            DefaultValue: 'CAST_IRON',
          },
        },
      ],
      product_selling_model_option: [
        {
          _id: 'psmo_pump_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_hydraulic_pump',
          data: {
            ProductId: 'prod_hydraulic_pump',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
        {
          _id: 'psmo_pump_monthly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_hydraulic_pump',
          data: {
            ProductId: 'prod_hydraulic_pump',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.MONTHLY_TERM,
            IsDefault: false,
          },
        },
        {
          _id: 'psmo_pump_yearly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_hydraulic_pump',
          data: {
            ProductId: 'prod_hydraulic_pump',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.YEARLY_TERM,
            IsDefault: false,
          },
        },
      ],
    },
  },
  // Conveyor Belt System - Configurable
  {
    _id: 'prod_conveyor_belt',
    _objectId: 'product',
    data: {
      Name: 'Belt Conveyor System',
      ProductCode: 'CNV-BELT-CONFIG',
      Description: 'Modular belt conveyor system with configurable width, length, and motor options',
      Family: 'Conveyors',
      IsActive: true,
      QuantityUnitOfMeasure: 'Each',
      StockKeepingUnit: 'SKU-CNV-001',
      Type: 'Base',
    },
    _childEntries: {
      product_attribute_definition: [
        {
          _id: 'pad_conv_width',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_conveyor_belt',
          data: {
            ProductId: 'prod_conveyor_belt',
            ProductAttributeId: 'attr_conveyor_width',
            IsRequired: true,
            Sequence: 1,
          },
        },
        {
          _id: 'pad_conv_length',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_conveyor_belt',
          data: {
            ProductId: 'prod_conveyor_belt',
            ProductAttributeId: 'attr_length',
            IsRequired: true,
            Sequence: 2,
            DefaultValue: '3000',
          },
        },
        {
          _id: 'pad_conv_voltage',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_conveyor_belt',
          data: {
            ProductId: 'prod_conveyor_belt',
            ProductAttributeId: 'attr_voltage',
            IsRequired: true,
            Sequence: 3,
          },
        },
        {
          _id: 'pad_conv_power',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_conveyor_belt',
          data: {
            ProductId: 'prod_conveyor_belt',
            ProductAttributeId: 'attr_power_rating',
            IsRequired: true,
            Sequence: 4,
          },
        },
      ],
      product_selling_model_option: [
        {
          _id: 'psmo_conveyor_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_conveyor_belt',
          data: {
            ProductId: 'prod_conveyor_belt',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
        {
          _id: 'psmo_conveyor_monthly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_conveyor_belt',
          data: {
            ProductId: 'prod_conveyor_belt',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.MONTHLY_TERM,
            IsDefault: false,
          },
        },
        {
          _id: 'psmo_conveyor_yearly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_conveyor_belt',
          data: {
            ProductId: 'prod_conveyor_belt',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.YEARLY_TERM,
            IsDefault: false,
          },
        },
      ],
    },
  },
  // Centrifugal Pump - Configurable
  {
    _id: 'prod_centrifugal_pump',
    _objectId: 'product',
    data: {
      Name: 'Centrifugal Process Pump',
      ProductCode: 'PMP-CENT-CONFIG',
      Description: 'High-efficiency centrifugal pump for process applications',
      Family: 'Pumps',
      IsActive: true,
      QuantityUnitOfMeasure: 'Each',
      StockKeepingUnit: 'SKU-PMP-002',
      Type: 'Base',
    },
    _childEntries: {
      product_attribute_definition: [
        {
          _id: 'pad_cent_flow',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_centrifugal_pump',
          data: {
            ProductId: 'prod_centrifugal_pump',
            ProductAttributeId: 'attr_flow_rate',
            IsRequired: true,
            Sequence: 1,
          },
        },
        {
          _id: 'pad_cent_voltage',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_centrifugal_pump',
          data: {
            ProductId: 'prod_centrifugal_pump',
            ProductAttributeId: 'attr_voltage',
            IsRequired: true,
            Sequence: 2,
          },
        },
        {
          _id: 'pad_cent_material',
          _objectId: 'product_attribute_definition',
          _parentId: 'prod_centrifugal_pump',
          data: {
            ProductId: 'prod_centrifugal_pump',
            ProductAttributeId: 'attr_material',
            IsRequired: true,
            Sequence: 3,
            DefaultValue: 'SS316',
          },
        },
      ],
      product_selling_model_option: [
        {
          _id: 'psmo_cent_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_centrifugal_pump',
          data: {
            ProductId: 'prod_centrifugal_pump',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
        {
          _id: 'psmo_cent_monthly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_centrifugal_pump',
          data: {
            ProductId: 'prod_centrifugal_pump',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.MONTHLY_TERM,
            IsDefault: false,
          },
        },
        {
          _id: 'psmo_cent_yearly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_centrifugal_pump',
          data: {
            ProductId: 'prod_centrifugal_pump',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.YEARLY_TERM,
            IsDefault: false,
          },
        },
      ],
    },
  },
];

// ============================================
// PRODUCTS - BUNDLES
// ============================================
export const bundleProducts: HierarchicalEntry[] = [
  // Fastener Kit Bundle
  {
    _id: 'prod_fastener_kit',
    _objectId: 'product',
    data: {
      Name: 'M8 Fastener Hardware Kit',
      ProductCode: 'KIT-FAST-M8',
      Description: 'Complete M8 fastener kit including bolts, nuts, flat washers, and lock washers (25 sets)',
      Family: 'Kits',
      IsActive: true,
      QuantityUnitOfMeasure: 'Kit',
      StockKeepingUnit: 'SKU-KIT-001',
      Type: 'Bundle',
    },
    _childEntries: {
      product_related_component: [
        {
          _id: 'prc_fastkit_bolt',
          _objectId: 'product_related_component',
          _parentId: 'prod_fastener_kit',
          data: {
            ParentProductId: 'prod_fastener_kit',
            ChildProductId: 'prod_hex_bolt_m8',
            IsRequired: true,
            Quantity: 25,
            MinQuantity: 25,
            MaxQuantity: 25,
            IsActive: true,
          },
        },
        {
          _id: 'prc_fastkit_nut',
          _objectId: 'product_related_component',
          _parentId: 'prod_fastener_kit',
          data: {
            ParentProductId: 'prod_fastener_kit',
            ChildProductId: 'prod_hex_nut_m8',
            IsRequired: true,
            Quantity: 25,
            MinQuantity: 25,
            MaxQuantity: 25,
            IsActive: true,
          },
        },
        {
          _id: 'prc_fastkit_washer',
          _objectId: 'product_related_component',
          _parentId: 'prod_fastener_kit',
          data: {
            ParentProductId: 'prod_fastener_kit',
            ChildProductId: 'prod_washer_m8',
            IsRequired: true,
            Quantity: 50,
            MinQuantity: 50,
            MaxQuantity: 50,
            IsActive: true,
          },
        },
        {
          _id: 'prc_fastkit_lock',
          _objectId: 'product_related_component',
          _parentId: 'prod_fastener_kit',
          data: {
            ParentProductId: 'prod_fastener_kit',
            ChildProductId: 'prod_lock_washer_m8',
            IsRequired: true,
            Quantity: 25,
            MinQuantity: 25,
            MaxQuantity: 25,
            IsActive: true,
          },
        },
      ],
      product_selling_model_option: [
        {
          _id: 'psmo_fastkit_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_fastener_kit',
          data: {
            ProductId: 'prod_fastener_kit',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
      ],
    },
  },
  // Motor Assembly Kit Bundle
  {
    _id: 'prod_motor_kit',
    _objectId: 'product',
    data: {
      Name: 'Motor Assembly Kit',
      ProductCode: 'KIT-MOT-ASM',
      Description: 'Complete motor assembly kit with electric motor, mounting hardware, and control panel',
      Family: 'Kits',
      IsActive: true,
      QuantityUnitOfMeasure: 'Kit',
      StockKeepingUnit: 'SKU-KIT-002',
      Type: 'Bundle',
    },
    _childEntries: {
      product_related_component: [
        {
          _id: 'prc_motkit_motor',
          _objectId: 'product_related_component',
          _parentId: 'prod_motor_kit',
          data: {
            ParentProductId: 'prod_motor_kit',
            ChildProductId: 'prod_electric_motor',
            IsRequired: true,
            Quantity: 1,
            MinQuantity: 1,
            MaxQuantity: 1,
            IsActive: true,
          },
        },
        {
          _id: 'prc_motkit_fasteners',
          _objectId: 'product_related_component',
          _parentId: 'prod_motor_kit',
          data: {
            ParentProductId: 'prod_motor_kit',
            ChildProductId: 'prod_fastener_kit',
            IsRequired: true,
            Quantity: 2,
            MinQuantity: 1,
            MaxQuantity: 4,
            IsActive: true,
          },
        },
      ],
      product_selling_model_option: [
        {
          _id: 'psmo_motkit_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_motor_kit',
          data: {
            ProductId: 'prod_motor_kit',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
        {
          _id: 'psmo_motkit_monthly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_motor_kit',
          data: {
            ProductId: 'prod_motor_kit',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.MONTHLY_TERM,
            IsDefault: false,
          },
        },
        {
          _id: 'psmo_motkit_yearly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_motor_kit',
          data: {
            ProductId: 'prod_motor_kit',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.YEARLY_TERM,
            IsDefault: false,
          },
        },
      ],
    },
  },
  // Pump Station Kit Bundle
  {
    _id: 'prod_pump_station_kit',
    _objectId: 'product',
    data: {
      Name: 'Pump Station Assembly Kit',
      ProductCode: 'KIT-PMP-STN',
      Description: 'Complete pump station kit with hydraulic pump, piping connections, and mounting base',
      Family: 'Kits',
      IsActive: true,
      QuantityUnitOfMeasure: 'Kit',
      StockKeepingUnit: 'SKU-KIT-003',
      Type: 'Bundle',
    },
    _childEntries: {
      product_related_component: [
        {
          _id: 'prc_pmpkit_pump',
          _objectId: 'product_related_component',
          _parentId: 'prod_pump_station_kit',
          data: {
            ParentProductId: 'prod_pump_station_kit',
            ChildProductId: 'prod_hydraulic_pump',
            IsRequired: true,
            Quantity: 1,
            MinQuantity: 1,
            MaxQuantity: 2,
            IsActive: true,
          },
        },
        {
          _id: 'prc_pmpkit_plate',
          _objectId: 'product_related_component',
          _parentId: 'prod_pump_station_kit',
          data: {
            ParentProductId: 'prod_pump_station_kit',
            ChildProductId: 'prod_steel_plate',
            IsRequired: true,
            Quantity: 1,
            MinQuantity: 1,
            MaxQuantity: 1,
            IsActive: true,
          },
        },
        {
          _id: 'prc_pmpkit_fasteners',
          _objectId: 'product_related_component',
          _parentId: 'prod_pump_station_kit',
          data: {
            ParentProductId: 'prod_pump_station_kit',
            ChildProductId: 'prod_fastener_kit',
            IsRequired: true,
            Quantity: 3,
            MinQuantity: 2,
            MaxQuantity: 5,
            IsActive: true,
          },
        },
      ],
      product_selling_model_option: [
        {
          _id: 'psmo_pmpkit_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_pump_station_kit',
          data: {
            ProductId: 'prod_pump_station_kit',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
        {
          _id: 'psmo_pmpkit_monthly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_pump_station_kit',
          data: {
            ProductId: 'prod_pump_station_kit',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.MONTHLY_TERM,
            IsDefault: false,
          },
        },
        {
          _id: 'psmo_pmpkit_yearly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_pump_station_kit',
          data: {
            ProductId: 'prod_pump_station_kit',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.YEARLY_TERM,
            IsDefault: false,
          },
        },
      ],
    },
  },
  // Conveyor Line Kit Bundle
  {
    _id: 'prod_conveyor_line_kit',
    _objectId: 'product',
    data: {
      Name: 'Conveyor Line Assembly Kit',
      ProductCode: 'KIT-CNV-LINE',
      Description: 'Complete conveyor line kit with belt conveyor system, motor drive, and support structure',
      Family: 'Kits',
      IsActive: true,
      QuantityUnitOfMeasure: 'Kit',
      StockKeepingUnit: 'SKU-KIT-004',
      Type: 'Bundle',
    },
    _childEntries: {
      product_related_component: [
        {
          _id: 'prc_cnvkit_conveyor',
          _objectId: 'product_related_component',
          _parentId: 'prod_conveyor_line_kit',
          data: {
            ParentProductId: 'prod_conveyor_line_kit',
            ChildProductId: 'prod_conveyor_belt',
            IsRequired: true,
            Quantity: 1,
            MinQuantity: 1,
            MaxQuantity: 5,
            IsActive: true,
          },
        },
        {
          _id: 'prc_cnvkit_motor',
          _objectId: 'product_related_component',
          _parentId: 'prod_conveyor_line_kit',
          data: {
            ParentProductId: 'prod_conveyor_line_kit',
            ChildProductId: 'prod_electric_motor',
            IsRequired: true,
            Quantity: 1,
            MinQuantity: 1,
            MaxQuantity: 2,
            IsActive: true,
          },
        },
        {
          _id: 'prc_cnvkit_aluminum',
          _objectId: 'product_related_component',
          _parentId: 'prod_conveyor_line_kit',
          data: {
            ParentProductId: 'prod_conveyor_line_kit',
            ChildProductId: 'prod_aluminum_bar',
            IsRequired: true,
            Quantity: 4,
            MinQuantity: 2,
            MaxQuantity: 10,
            IsActive: true,
          },
        },
        {
          _id: 'prc_cnvkit_fasteners',
          _objectId: 'product_related_component',
          _parentId: 'prod_conveyor_line_kit',
          data: {
            ParentProductId: 'prod_conveyor_line_kit',
            ChildProductId: 'prod_fastener_kit',
            IsRequired: true,
            Quantity: 4,
            MinQuantity: 2,
            MaxQuantity: 8,
            IsActive: true,
          },
        },
      ],
      product_selling_model_option: [
        {
          _id: 'psmo_cnvkit_onetime',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_conveyor_line_kit',
          data: {
            ProductId: 'prod_conveyor_line_kit',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.ONE_TIME,
            IsDefault: true,
          },
        },
        {
          _id: 'psmo_cnvkit_monthly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_conveyor_line_kit',
          data: {
            ProductId: 'prod_conveyor_line_kit',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.MONTHLY_TERM,
            IsDefault: false,
          },
        },
        {
          _id: 'psmo_cnvkit_yearly',
          _objectId: 'product_selling_model_option',
          _parentId: 'prod_conveyor_line_kit',
          data: {
            ProductId: 'prod_conveyor_line_kit',
            ProductSellingModelId: SELLING_MODEL_PLACEHOLDERS.YEARLY_TERM,
            IsDefault: false,
          },
        },
      ],
    },
  },
];

// ============================================
// PRODUCT CATEGORY ASSIGNMENTS
// ============================================
export const productCategoryAssignments: HierarchicalEntry[] = [
  // Hardware & Fasteners
  { _id: 'pcp_bolt_hw', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_hardware', ProductId: 'prod_hex_bolt_m8', IsPrimaryCategory: true } },
  { _id: 'pcp_nut_hw', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_hardware', ProductId: 'prod_hex_nut_m8', IsPrimaryCategory: true } },
  { _id: 'pcp_washer_hw', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_hardware', ProductId: 'prod_washer_m8', IsPrimaryCategory: true } },
  { _id: 'pcp_lock_hw', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_hardware', ProductId: 'prod_lock_washer_m8', IsPrimaryCategory: true } },

  // Motors & Drives
  { _id: 'pcp_motor_mot', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_motors', ProductId: 'prod_electric_motor', IsPrimaryCategory: true } },

  // Pumps
  { _id: 'pcp_hydpump_pmp', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_pumps', ProductId: 'prod_hydraulic_pump', IsPrimaryCategory: true } },
  { _id: 'pcp_centpump_pmp', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_pumps', ProductId: 'prod_centrifugal_pump', IsPrimaryCategory: true } },

  // Conveyors
  { _id: 'pcp_convbelt_cnv', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_conveyors', ProductId: 'prod_conveyor_belt', IsPrimaryCategory: true } },

  // Assembly Kits
  { _id: 'pcp_fastkit_asm', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_assemblies', ProductId: 'prod_fastener_kit', IsPrimaryCategory: true } },
  { _id: 'pcp_motkit_asm', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_assemblies', ProductId: 'prod_motor_kit', IsPrimaryCategory: true } },
  { _id: 'pcp_pmpkit_asm', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_assemblies', ProductId: 'prod_pump_station_kit', IsPrimaryCategory: true } },
  { _id: 'pcp_cnvkit_asm', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_assemblies', ProductId: 'prod_conveyor_line_kit', IsPrimaryCategory: true } },

  // Raw Materials
  { _id: 'pcp_steel_raw', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_raw_materials', ProductId: 'prod_steel_plate', IsPrimaryCategory: true } },
  { _id: 'pcp_aluminum_raw', _objectId: 'product_category_product', data: { ProductCategoryId: 'cat_raw_materials', ProductId: 'prod_aluminum_bar', IsPrimaryCategory: true } },
];

// ============================================
// PRICEBOOK AND ENTRIES
// ============================================
export const pricebook: HierarchicalEntry = {
  _id: 'pb_standard',
  _objectId: 'pricebook',
  data: {
    Name: 'Industrial Standard Price Book',
    Description: 'Standard pricing for industrial manufacturing products',
    IsActive: true,
    IsStandard: false,
  },
  _childEntries: {
    pricebook_entry: [
      // Simple Products
      { _id: 'pbe_bolt', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_hex_bolt_m8', UnitPrice: 0.45, IsActive: true } },
      { _id: 'pbe_nut', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_hex_nut_m8', UnitPrice: 0.25, IsActive: true } },
      { _id: 'pbe_washer', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_washer_m8', UnitPrice: 0.08, IsActive: true } },
      { _id: 'pbe_lock_washer', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_lock_washer_m8', UnitPrice: 0.12, IsActive: true } },
      { _id: 'pbe_steel', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_steel_plate', UnitPrice: 285.00, IsActive: true } },
      { _id: 'pbe_aluminum', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_aluminum_bar', UnitPrice: 142.50, IsActive: true } },

      // Configurable Products (base pricing)
      { _id: 'pbe_motor', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_electric_motor', UnitPrice: 1250.00, IsActive: true } },
      { _id: 'pbe_hydpump', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_hydraulic_pump', UnitPrice: 2875.00, IsActive: true } },
      { _id: 'pbe_centpump', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_centrifugal_pump', UnitPrice: 3450.00, IsActive: true } },
      { _id: 'pbe_conveyor', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_conveyor_belt', UnitPrice: 4500.00, IsActive: true } },

      // Bundle Products
      { _id: 'pbe_fastkit', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_fastener_kit', UnitPrice: 22.50, IsActive: true } },
      { _id: 'pbe_motkit', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_motor_kit', UnitPrice: 1495.00, IsActive: true } },
      { _id: 'pbe_pmpkit', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_pump_station_kit', UnitPrice: 3650.00, IsActive: true } },
      { _id: 'pbe_cnvkit', _objectId: 'pricebook_entry', _parentId: 'pb_standard', data: { Pricebook2Id: 'pb_standard', Product2Id: 'prod_conveyor_line_kit', UnitPrice: 7250.00, IsActive: true } },
    ],
  },
};

// ============================================
// COMPLETE SEED DATA EXPORT
// ============================================
export const INDUSTRIAL_MANUFACTURING_SEED_DATA = {
  attributePicklists,
  attributeDefinitions,
  productClassifications,
  productCatalog,
  sellingModels,
  simpleProducts,
  configurableProducts,
  bundleProducts,
  productCategoryAssignments,
  pricebook,

  // Metadata
  metadata: {
    name: 'Industrial Manufacturing Catalog',
    description: 'Sample seed data for industrial manufacturing products including simple products, configurable products with attributes, and product bundles',
    version: '1.0.0',
    productCount: {
      simple: 6,
      configurable: 4,
      bundles: 4,
      total: 14,
    },
    sellingModelPlaceholders: SELLING_MODEL_PLACEHOLDERS,
  },
};

// Helper to get all entries in deployment order
export function getSeedDataInDeploymentOrder(): HierarchicalEntry[] {
  return [
    // 1. Attribute Picklists (with values)
    ...attributePicklists,

    // 2. Attribute Definitions
    ...attributeDefinitions,

    // 3. Product Classifications
    ...productClassifications,

    // 4. Product Catalog (with categories)
    productCatalog,

    // 5. Selling Models
    ...sellingModels,

    // 6. Products (simple first, then configurable, then bundles)
    ...simpleProducts,
    ...configurableProducts,
    ...bundleProducts,

    // 7. Product Category Assignments
    ...productCategoryAssignments,

    // 8. Pricebook (with entries)
    pricebook,
  ];
}
