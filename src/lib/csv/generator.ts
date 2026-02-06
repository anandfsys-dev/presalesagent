/**
 * CSV Template Generator
 *
 * Generates CSV templates based on pipeline configuration.
 * Creates one CSV file per object type with the correct columns.
 */

import type { PipelineConfig, PipelineStep, ColumnDefinition } from '@/types';
import { getExecutionOrder } from '@/lib/pipeline/config';

interface CSVTemplate {
  fileName: string;
  headers: string[];
  sampleRows: string[][];
  instructions: string[];
}

/**
 * Generate sample value based on column type
 */
function getSampleValue(column: ColumnDefinition, rowIndex: number): string {
  const name = column.name.toLowerCase();

  switch (column.type) {
    case 'string':
      if (name.includes('name')) return `Sample ${column.name.replace(/_/g, ' ')} ${rowIndex + 1}`;
      if (name.includes('code')) return `CODE_${rowIndex + 1}`;
      if (name.includes('description')) return `Description for item ${rowIndex + 1}`;
      if (name.includes('api_name')) return `API_Name_${rowIndex + 1}`;
      if (name.includes('type')) return 'Standalone';
      if (name.includes('family')) return 'Default Family';
      if (name.includes('method')) return 'List Price';
      if (name.includes('treatment')) return 'Taxable';
      if (name.includes('rule')) return 'Default Rule';
      if (name.includes('frequency')) return 'Monthly';
      return `Sample Value ${rowIndex + 1}`;

    case 'number':
      if (name.includes('sequence') || name.includes('order')) return String(rowIndex + 1);
      if (name.includes('quantity')) return '1';
      if (name.includes('min')) return '0';
      if (name.includes('max')) return '100';
      if (name.includes('length')) return '255';
      return String((rowIndex + 1) * 10);

    case 'boolean':
      return 'TRUE';

    case 'date':
      const date = new Date();
      if (name.includes('end') || name.includes('expiration')) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date.toISOString().split('T')[0];

    case 'currency':
      return String(99.99 + rowIndex * 10);

    case 'reference':
      // For reference fields, use the lookup value format
      if (name.includes('parent') && name.includes('product')) return rowIndex > 0 ? 'PROD_1' : '';
      if (name.includes('category')) return 'CAT_1';
      if (name.includes('product')) return `PROD_${rowIndex + 1}`;
      if (name.includes('picklist')) return 'PICK_1';
      if (name.includes('catalog')) return 'CAT_1';
      if (name.includes('pricebook')) return 'PB_1';
      if (name.includes('attribute')) return 'ATTR_1';
      return `REF_${rowIndex + 1}`;

    default:
      return '';
  }
}

/**
 * Generate CSV template for a single pipeline step
 */
function generateStepTemplate(step: PipelineStep, allSteps: PipelineStep[]): CSVTemplate {
  const headers = step.columns.map((col) => col.name);

  // Generate 3 sample rows
  const sampleRows: string[][] = [];
  for (let i = 0; i < 3; i++) {
    const row = step.columns.map((col) => getSampleValue(col, i));
    sampleRows.push(row);
  }

  // Generate instructions
  const instructions: string[] = [
    `# ${step.name} Template`,
    `# Salesforce Object: ${step.apiName}`,
    `# `,
    `# Column Definitions:`,
  ];

  step.columns.forEach((col) => {
    let colInfo = `#   ${col.name}: ${col.type}`;
    if (col.required) colInfo += ' (REQUIRED)';
    if (col.referenceTo) {
      const refStep = allSteps.find((s) => s.id === col.referenceTo);
      if (refStep) {
        colInfo += ` - References ${refStep.name}`;
      }
    }
    instructions.push(colInfo);
  });

  if (step.parentIdMappings.length > 0) {
    instructions.push(`# `);
    instructions.push(`# ID Mappings:`);
    step.parentIdMappings.forEach((mapping) => {
      const parentStep = allSteps.find((s) => s.id === mapping.parentStep);
      instructions.push(
        `#   ${mapping.field} -> ${parentStep?.name || mapping.parentStep}.${mapping.parentField}`
      );
    });
  }

  instructions.push(`# `);

  return {
    fileName: `${step.worksheetName}.csv`,
    headers,
    sampleRows,
    instructions,
  };
}

/**
 * Convert template to CSV string
 */
function templateToCSV(template: CSVTemplate, includeSampleData: boolean = true): string {
  const lines: string[] = [];

  // Add instructions as comments (optional - some parsers don't support this)
  // template.instructions.forEach((instruction) => lines.push(instruction));

  // Add header row
  lines.push(template.headers.join(','));

  // Add sample data rows
  if (includeSampleData) {
    template.sampleRows.forEach((row) => {
      // Escape values that contain commas or quotes
      const escapedRow = row.map((value) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      lines.push(escapedRow.join(','));
    });
  }

  return lines.join('\n');
}

/**
 * Generate all CSV templates for a pipeline configuration
 */
export function generateCSVTemplates(
  config: PipelineConfig,
  includeSampleData: boolean = true
): Map<string, string> {
  const templates = new Map<string, string>();
  const orderedSteps = getExecutionOrder(config);

  orderedSteps.forEach((step) => {
    const template = generateStepTemplate(step, config.steps);
    const csvContent = templateToCSV(template, includeSampleData);
    templates.set(template.fileName, csvContent);
  });

  return templates;
}

/**
 * Generate a single ZIP-like structure containing all templates
 * Returns an object with file names as keys and content as values
 */
export function generateTemplateBundle(
  config: PipelineConfig,
  includeSampleData: boolean = true
): Record<string, string> {
  const templates = generateCSVTemplates(config, includeSampleData);
  const bundle: Record<string, string> = {};

  templates.forEach((content, fileName) => {
    bundle[fileName] = content;
  });

  // Add a README file
  bundle['README.txt'] = generateReadme(config);

  return bundle;
}

/**
 * Generate README content for the template bundle
 */
function generateReadme(config: PipelineConfig): string {
  const orderedSteps = getExecutionOrder(config);

  let readme = `# ${config.name} - CSV Templates\n\n`;
  readme += `Version: ${config.version}\n`;
  readme += `Generated: ${new Date().toISOString()}\n\n`;

  readme += `## Files Included\n\n`;
  readme += `The following CSV files are included in this template bundle:\n\n`;

  orderedSteps.forEach((step, index) => {
    readme += `${index + 1}. ${step.worksheetName}.csv - ${step.name}\n`;
    readme += `   Salesforce Object: ${step.apiName}\n`;
    if (step.dependsOn.length > 0) {
      const deps = step.dependsOn
        .map((depId) => {
          const depStep = config.steps.find((s) => s.id === depId);
          return depStep?.name || depId;
        })
        .join(', ');
      readme += `   Depends on: ${deps}\n`;
    }
    readme += `\n`;
  });

  readme += `## Deployment Order\n\n`;
  readme += `Files should be processed in the following order to ensure ID dependencies are resolved:\n\n`;
  orderedSteps.forEach((step, index) => {
    readme += `${index + 1}. ${step.name}\n`;
  });

  readme += `\n## Notes\n\n`;
  readme += `- All required fields must be filled in\n`;
  readme += `- Reference fields should contain the lookup value (e.g., Product_Code, Category_Code)\n`;
  readme += `- Boolean values should be TRUE or FALSE\n`;
  readme += `- Date values should be in YYYY-MM-DD format\n`;
  readme += `- Currency values should be numeric (e.g., 99.99)\n`;

  return readme;
}

/**
 * Download a single CSV file
 */
export function downloadCSV(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download all templates as individual CSV files (triggers multiple downloads)
 */
export function downloadAllTemplates(config: PipelineConfig): void {
  const bundle = generateTemplateBundle(config);

  // Download each file with a small delay to prevent browser blocking
  let delay = 0;
  Object.entries(bundle).forEach(([fileName, content]) => {
    setTimeout(() => {
      downloadCSV(fileName, content);
    }, delay);
    delay += 200;
  });
}
