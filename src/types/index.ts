// ============================================
// Core Types for Salesforce RCA Configuration Tool
// ============================================

// User & Auth Types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

// Connection Types
export interface SalesforceConnection {
  id: string;
  user_id: string;
  name: string;
  instance_url: string;
  org_id: string;
  org_type: 'production' | 'sandbox' | 'developer';
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  connected_app_consumer_key: string;
  connected_app_consumer_secret_encrypted: string;
  status: 'active' | 'expired' | 'error';
  last_connected: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectionFormData {
  name: string;
  instance_url: string;
  client_id: string;
  client_secret: string;
}

// Deployment Pipeline Types
export interface PipelineStep {
  id: string;
  name: string;
  apiName: string; // Salesforce API name (e.g., Product2, Custom__c)
  endpoint?: string; // Salesforce REST API endpoint
  method?: 'POST' | 'PATCH' | 'PUT'; // HTTP method for deployment
  worksheetName: string; // CSV file name for this object
  order: number;
  dependsOn: string[]; // IDs of steps this depends on
  columns: ColumnDefinition[]; // Column/field definitions
  parentIdMappings: ParentIdMapping[]; // How to map parent IDs
}

export interface ColumnDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'currency' | 'reference' | 'picklist';
  required: boolean;
  description?: string;
  defaultValue?: string | number | boolean;
  referenceTo?: string; // For reference types, which object it references (internal step ID)
  referenceDisplayField?: string; // Field to display for reference selection
  sfField?: string; // Salesforce API field name
  picklistValues?: string[]; // For picklist types, allowed values
  // External Salesforce reference properties
  referenceType?: 'internal' | 'external'; // 'internal' = pipeline step reference, 'external' = Salesforce record
  externalSobject?: string; // For external references, the Salesforce object API name (e.g., 'Account', 'Product2')
}

export interface ParentIdMapping {
  field: string; // Field in this object that holds the reference
  parentStep: string; // Step ID of the parent object
  parentField: string; // Field in parent to match against (e.g., 'Id', 'External_Id__c')
  parentIdField?: string; // The ID field in parent (default: 'id')
}

export interface PipelineConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: PipelineStep[];
  postDeploymentOperations?: PostDeploymentOperation[];
  created_at: string;
  updated_at: string;
}

// Post Deployment Operations
export interface PostDeploymentOperation {
  id: string;
  name: string;
  type: 'wait' | 'GET' | 'POST';
  order: number;
  // For wait type
  waitTimeSeconds?: number;
  // For GET/POST types
  endpoint?: string;
  payload?: Record<string, unknown>;
}

// Excel Template Types
export interface ExcelTemplate {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  worksheets: WorksheetData[];
  validationStatus: 'pending' | 'valid' | 'invalid';
  validationErrors: ValidationError[];
  validationWarnings: ValidationWarning[];
}

export interface WorksheetData {
  name: string;
  rowCount: number;
  columns: string[];
  data: Record<string, unknown>[];
}

export interface ValidationError {
  worksheet: string;
  row: number;
  column: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  worksheet: string;
  row: number;
  column: string;
  message: string;
  severity: 'warning';
}

// Deployment Types
export interface Deployment {
  id: string;
  user_id: string;
  connection_id: string;
  template_file_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  mode: 'full' | 'incremental' | 'validation_only';
  started_at: string;
  completed_at: string | null;
  summary: DeploymentSummary;
  created_at: string;
}

export interface DeploymentSummary {
  total_objects: number;
  success_count: number;
  failure_count: number;
  skipped_count: number;
  api_calls_consumed: number;
  duration_seconds: number;
}

export interface DeploymentDetail {
  id: string;
  deployment_id: string;
  step_id: string;
  step_order: number;
  object_type: string;
  object_name: string;
  object_identifier: string;
  salesforce_id: string | null;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'skipped';
  error_message: string | null;
  created_at: string;
}

export interface DeploymentLog {
  id: string;
  deployment_id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  metadata: Record<string, unknown>;
}

// Salesforce Object Types (RCA specific)
export interface SalesforceProduct {
  Product_Code: string;
  Product_Name: string;
  Product_Type: 'Standalone' | 'Bundle' | 'Configurable';
  Description?: string;
  Product_Family?: string;
  Active: boolean;
  Pricing_Method?: string;
  Revenue_Recognition_Rule?: string;
  Tax_Treatment?: string;
  Parent_Product_Code?: string;
}

export interface SalesforceAttribute {
  Attribute_Name: string;
  Attribute_API_Name: string;
  Data_Type: 'Text' | 'Number' | 'Picklist' | 'Multi-Picklist' | 'Date' | 'Boolean' | 'Currency';
  Display_Type?: string;
  Picklist_Name?: string;
  Sequence?: number;
  Required?: boolean;
  Default_Value?: string;
  Help_Text?: string;
  Min_Value?: number;
  Max_Value?: number;
  Max_Length?: number;
}

export interface SalesforcePicklist {
  Picklist_Name: string;
  Picklist_API_Name: string;
  Active: boolean;
}

export interface SalesforcePicklistValue {
  Picklist_Name: string;
  Value_Label: string;
  Value_API_Name: string;
  Display_Order?: number;
  Active: boolean;
  Is_Default?: boolean;
}

export interface SalesforceCategory {
  Category_Name: string;
  Category_Code: string;
  Parent_Category_Code?: string;
  Sequence?: number;
  Active: boolean;
  Description?: string;
}

export interface SalesforceCatalog {
  Catalog_Name: string;
  Catalog_Code: string;
  Active: boolean;
  Start_Date?: string;
  End_Date?: string;
  Description?: string;
}

export interface SalesforcePriceBook {
  PriceBook_Name: string;
  PriceBook_Code: string;
  Currency: string;
  Active: boolean;
  Description?: string;
}

export interface SalesforcePriceListItem {
  PriceBook_Code: string;
  Product_Code: string;
  List_Price: number;
  Effective_Date?: string;
  Expiration_Date?: string;
  Discount_Schedule?: string;
}

export interface SalesforceSellingModel {
  Selling_Model_Name: string;
  Selling_Model_Code: string;
  Selling_Term_Type: 'Evergreen' | 'Termed' | 'Milestone';
  Billing_Frequency?: 'One-time' | 'Monthly' | 'Quarterly' | 'Annually';
  Revenue_Recognition_Method?: string;
  Product_Code: string;
}

export interface SalesforceProductRelationship {
  Parent_Product_Code: string;
  Child_Product_Code: string;
  Relationship_Type: 'Bundle Component' | 'Cross-Sell' | 'Up-Sell' | 'Related' | 'Dependency';
  Required?: boolean;
  Min_Quantity?: number;
  Max_Quantity?: number;
  Default_Quantity?: number;
}

export interface SalesforceAttributeMapping {
  Product_Code: string;
  Attribute_API_Name: string;
  Required?: boolean;
  Display_Order?: number;
  Default_Value?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SalesforceApiError {
  errorCode: string;
  message: string;
  fields?: string[];
}

// Application Settings
export interface AppSettings {
  api_version: string;
  batch_size: number;
  max_retries: number;
  session_timeout: number;
  logging_level: 'debug' | 'info' | 'warning' | 'error';
  auto_refresh_tokens: boolean;
  deployment_mode: 'stop_on_error' | 'continue_on_errors';
  theme: 'light' | 'dark';
}

// ID Mapping for deployment (tracks created IDs for dependency resolution)
export interface IdMappingStore {
  [stepId: string]: {
    [lookupValue: string]: string; // lookupValue -> Salesforce ID
  };
}
