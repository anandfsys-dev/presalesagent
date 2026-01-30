/**
 * Excel Parser Module
 *
 * Handles parsing of Excel (.xlsx) files for RCA configuration data.
 */

import * as XLSX from 'xlsx';
import type { WorksheetData, ValidationError, ValidationWarning } from '@/types';

export interface ParsedExcel {
  fileName: string;
  fileSize: number;
  worksheets: WorksheetData[];
  parseErrors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Parse Excel file from buffer or array buffer
 */
export function parseExcelFile(
  buffer: ArrayBuffer,
  fileName: string,
  fileSize: number
): ParsedExcel {
  const parseErrors: string[] = [];
  const worksheets: WorksheetData[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    for (const sheetName of workbook.SheetNames) {
      try {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: null,
          raw: false, // Convert all values to strings for consistency
        });

        // Get column headers
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        const columns: string[] = [];

        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          const cell = sheet[cellAddress];
          if (cell && cell.v) {
            columns.push(String(cell.v));
          }
        }

        worksheets.push({
          name: sheetName,
          rowCount: jsonData.length,
          columns,
          data: jsonData,
        });
      } catch (sheetError) {
        parseErrors.push(`Error parsing sheet "${sheetName}": ${sheetError instanceof Error ? sheetError.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    parseErrors.push(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    fileName,
    fileSize,
    worksheets,
    parseErrors,
  };
}

/**
 * Validate parsed Excel data against schema requirements
 */
export function validateExcelData(parsed: ParsedExcel): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Define required columns for each worksheet type
  const worksheetSchemas: Record<string, { required: string[]; optional: string[] }> = {
    Products: {
      required: ['Product_Code', 'Product_Name', 'Product_Type', 'Active'],
      optional: ['Description', 'Product_Family', 'Pricing_Method', 'Revenue_Recognition_Rule', 'Tax_Treatment', 'Parent_Product_Code'],
    },
    Attributes: {
      required: ['Attribute_Name', 'Attribute_API_Name', 'Data_Type'],
      optional: ['Display_Type', 'Picklist_Name', 'Sequence', 'Required', 'Default_Value', 'Help_Text', 'Min_Value', 'Max_Value', 'Max_Length'],
    },
    Picklists: {
      required: ['Picklist_Name', 'Picklist_API_Name', 'Active'],
      optional: [],
    },
    Picklist_Values: {
      required: ['Picklist_Name', 'Value_Label', 'Value_API_Name', 'Active'],
      optional: ['Display_Order', 'Is_Default'],
    },
    Categories: {
      required: ['Category_Name', 'Category_Code', 'Active'],
      optional: ['Parent_Category_Code', 'Sequence', 'Description'],
    },
    Catalogs: {
      required: ['Catalog_Name', 'Catalog_Code', 'Active'],
      optional: ['Start_Date', 'End_Date', 'Description'],
    },
    Catalog_Products: {
      required: ['Catalog_Code', 'Product_Code'],
      optional: ['Sequence'],
    },
    PriceBooks: {
      required: ['PriceBook_Name', 'PriceBook_Code', 'Currency', 'Active'],
      optional: ['Description'],
    },
    PriceListItems: {
      required: ['PriceBook_Code', 'Product_Code', 'List_Price'],
      optional: ['Effective_Date', 'Expiration_Date', 'Discount_Schedule'],
    },
    SellingModels: {
      required: ['Selling_Model_Name', 'Selling_Model_Code', 'Selling_Term_Type', 'Product_Code'],
      optional: ['Billing_Frequency', 'Revenue_Recognition_Method'],
    },
    ProductRelationships: {
      required: ['Parent_Product_Code', 'Child_Product_Code', 'Relationship_Type'],
      optional: ['Required', 'Min_Quantity', 'Max_Quantity', 'Default_Quantity'],
    },
    AttributeMappings: {
      required: ['Product_Code', 'Attribute_API_Name'],
      optional: ['Required', 'Display_Order', 'Default_Value'],
    },
  };

  // Track unique values for referential integrity checks
  const uniqueValues: Record<string, Set<string>> = {
    Product_Code: new Set(),
    Picklist_Name: new Set(),
    Category_Code: new Set(),
    Catalog_Code: new Set(),
    PriceBook_Code: new Set(),
    Attribute_API_Name: new Set(),
    Selling_Model_Code: new Set(),
  };

  // First pass: collect unique values
  for (const worksheet of parsed.worksheets) {
    for (const row of worksheet.data) {
      for (const [key, set] of Object.entries(uniqueValues)) {
        if (row[key] && row[key] !== '') {
          set.add(String(row[key]));
        }
      }
    }
  }

  // Second pass: validate each worksheet
  for (const worksheet of parsed.worksheets) {
    const normalizedName = normalizeWorksheetName(worksheet.name);
    const schema = findSchemaForWorksheet(normalizedName, worksheetSchemas);

    if (!schema) {
      warnings.push({
        worksheet: worksheet.name,
        row: 0,
        column: '',
        message: `Worksheet "${worksheet.name}" does not match any known schema. It will be skipped during deployment.`,
        severity: 'warning',
      });
      continue;
    }

    // Check required columns exist
    const missingColumns = schema.required.filter(
      (col) => !worksheet.columns.some((c) => normalizeColumnName(c) === normalizeColumnName(col))
    );

    if (missingColumns.length > 0) {
      errors.push({
        worksheet: worksheet.name,
        row: 0,
        column: '',
        message: `Missing required columns: ${missingColumns.join(', ')}`,
        severity: 'error',
      });
    }

    // Validate each row
    for (let rowIndex = 0; rowIndex < worksheet.data.length; rowIndex++) {
      const row = worksheet.data[rowIndex];
      const rowNum = rowIndex + 2; // +2 because row 1 is headers and Excel is 1-indexed

      // Check required fields have values
      for (const requiredCol of schema.required) {
        const value = findColumnValue(row, requiredCol, worksheet.columns);
        if (value === null || value === undefined || value === '') {
          errors.push({
            worksheet: worksheet.name,
            row: rowNum,
            column: requiredCol,
            message: `Required field "${requiredCol}" is empty`,
            severity: 'error',
          });
        }
      }

      // Validate data types
      validateRowDataTypes(row, worksheet.name, rowNum, errors, warnings);

      // Validate referential integrity
      validateReferentialIntegrity(row, worksheet.name, rowNum, uniqueValues, errors);
    }

    // Check for duplicates in key fields
    validateDuplicates(worksheet, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Find the value for a column, handling case-insensitive matching
 */
function findColumnValue(
  row: Record<string, unknown>,
  columnName: string,
  columns: string[]
): unknown {
  // Try exact match first
  if (row[columnName] !== undefined) {
    return row[columnName];
  }

  // Try case-insensitive match
  const normalizedTarget = normalizeColumnName(columnName);
  for (const col of columns) {
    if (normalizeColumnName(col) === normalizedTarget && row[col] !== undefined) {
      return row[col];
    }
  }

  return undefined;
}

/**
 * Normalize column name for comparison
 */
function normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/[_\s-]/g, '');
}

/**
 * Normalize worksheet name for schema matching
 */
function normalizeWorksheetName(name: string): string {
  return name.replace(/[_\s-]/g, '');
}

/**
 * Find matching schema for worksheet
 */
function findSchemaForWorksheet(
  normalizedName: string,
  schemas: Record<string, { required: string[]; optional: string[] }>
): { required: string[]; optional: string[] } | null {
  const lowerName = normalizedName.toLowerCase();

  for (const [schemaName, schema] of Object.entries(schemas)) {
    const normalizedSchema = schemaName.toLowerCase().replace(/[_\s-]/g, '');
    if (lowerName === normalizedSchema || lowerName.includes(normalizedSchema)) {
      return schema;
    }
  }

  return null;
}

/**
 * Validate data types in a row
 */
function validateRowDataTypes(
  row: Record<string, unknown>,
  worksheet: string,
  rowNum: number,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Validate Active field is boolean-like
  if (row['Active'] !== undefined && row['Active'] !== null) {
    const value = String(row['Active']).toLowerCase();
    if (!['true', 'false', 'yes', 'no', '1', '0', ''].includes(value)) {
      warnings.push({
        worksheet,
        row: rowNum,
        column: 'Active',
        message: `"${row['Active']}" is not a valid boolean value. Use TRUE/FALSE, YES/NO, or 1/0.`,
        severity: 'warning',
      });
    }
  }

  // Validate numeric fields
  const numericFields = ['Sequence', 'Display_Order', 'Min_Quantity', 'Max_Quantity', 'Default_Quantity', 'List_Price', 'Min_Value', 'Max_Value', 'Max_Length'];
  for (const field of numericFields) {
    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
      const numValue = Number(row[field]);
      if (isNaN(numValue)) {
        errors.push({
          worksheet,
          row: rowNum,
          column: field,
          message: `"${row[field]}" is not a valid number`,
          severity: 'error',
        });
      }
    }
  }

  // Validate date fields
  const dateFields = ['Start_Date', 'End_Date', 'Effective_Date', 'Expiration_Date'];
  for (const field of dateFields) {
    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
      const dateValue = new Date(String(row[field]));
      if (isNaN(dateValue.getTime())) {
        warnings.push({
          worksheet,
          row: rowNum,
          column: field,
          message: `"${row[field]}" may not be a valid date format. Recommended format: YYYY-MM-DD`,
          severity: 'warning',
        });
      }
    }
  }

  // Validate picklist values
  const productTypes = ['Standalone', 'Bundle', 'Configurable'];
  if (row['Product_Type'] && !productTypes.includes(String(row['Product_Type']))) {
    warnings.push({
      worksheet,
      row: rowNum,
      column: 'Product_Type',
      message: `"${row['Product_Type']}" is not a standard product type. Expected: ${productTypes.join(', ')}`,
      severity: 'warning',
    });
  }

  const dataTypes = ['Text', 'Number', 'Picklist', 'Multi-Picklist', 'Date', 'Boolean', 'Currency'];
  if (row['Data_Type'] && !dataTypes.includes(String(row['Data_Type']))) {
    errors.push({
      worksheet,
      row: rowNum,
      column: 'Data_Type',
      message: `"${row['Data_Type']}" is not a valid data type. Expected: ${dataTypes.join(', ')}`,
      severity: 'error',
    });
  }

  const relationshipTypes = ['Bundle Component', 'Cross-Sell', 'Up-Sell', 'Related', 'Dependency'];
  if (row['Relationship_Type'] && !relationshipTypes.includes(String(row['Relationship_Type']))) {
    errors.push({
      worksheet,
      row: rowNum,
      column: 'Relationship_Type',
      message: `"${row['Relationship_Type']}" is not a valid relationship type. Expected: ${relationshipTypes.join(', ')}`,
      severity: 'error',
    });
  }
}

/**
 * Validate referential integrity
 */
function validateReferentialIntegrity(
  row: Record<string, unknown>,
  worksheet: string,
  rowNum: number,
  uniqueValues: Record<string, Set<string>>,
  errors: ValidationError[]
): void {
  // Check parent references exist
  const parentReferences: Array<{ field: string; referenceSet: string }> = [
    { field: 'Parent_Product_Code', referenceSet: 'Product_Code' },
    { field: 'Parent_Category_Code', referenceSet: 'Category_Code' },
    { field: 'Picklist_Name', referenceSet: 'Picklist_Name' },
    { field: 'Catalog_Code', referenceSet: 'Catalog_Code' },
    { field: 'PriceBook_Code', referenceSet: 'PriceBook_Code' },
    { field: 'Product_Code', referenceSet: 'Product_Code' },
    { field: 'Child_Product_Code', referenceSet: 'Product_Code' },
    { field: 'Attribute_API_Name', referenceSet: 'Attribute_API_Name' },
  ];

  for (const { field, referenceSet } of parentReferences) {
    const value = row[field];
    if (value && value !== '' && field !== referenceSet) {
      // Only validate if not self-referencing in the same worksheet
      const isDirectReference = worksheet.toLowerCase().includes(referenceSet.toLowerCase().replace('_', ''));
      if (!isDirectReference && !uniqueValues[referenceSet]?.has(String(value))) {
        errors.push({
          worksheet,
          row: rowNum,
          column: field,
          message: `Referenced ${referenceSet} "${value}" does not exist in the template`,
          severity: 'error',
        });
      }
    }
  }
}

/**
 * Validate for duplicate key values
 */
function validateDuplicates(worksheet: WorksheetData, errors: ValidationError[]): void {
  const keyFields = ['Product_Code', 'Picklist_Name', 'Category_Code', 'Catalog_Code', 'PriceBook_Code', 'Attribute_API_Name', 'Selling_Model_Code'];

  for (const keyField of keyFields) {
    if (!worksheet.columns.some((c) => normalizeColumnName(c) === normalizeColumnName(keyField))) {
      continue;
    }

    const seen = new Map<string, number>();

    for (let i = 0; i < worksheet.data.length; i++) {
      const value = worksheet.data[i][keyField];
      if (value && value !== '') {
        const strValue = String(value);
        if (seen.has(strValue)) {
          errors.push({
            worksheet: worksheet.name,
            row: i + 2,
            column: keyField,
            message: `Duplicate ${keyField} "${strValue}" (first occurrence at row ${seen.get(strValue)})`,
            severity: 'error',
          });
        } else {
          seen.set(strValue, i + 2);
        }
      }
    }
  }
}

/**
 * Get summary statistics from parsed Excel
 */
export function getExcelSummary(parsed: ParsedExcel): Record<string, number> {
  const summary: Record<string, number> = {};

  for (const worksheet of parsed.worksheets) {
    summary[worksheet.name] = worksheet.rowCount;
  }

  return summary;
}
