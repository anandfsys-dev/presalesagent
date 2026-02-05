'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useConfigData, DataEntry } from '@/contexts/ConfigDataContext';
import { useConfirmDialog } from '@/components/ui';
import { SalesforceRecordPicker } from './SalesforceRecordPicker';
import type { PipelineStep, ColumnDefinition } from '@/types';

// Generate unique code for autogenerate fields
function generateUniqueCode(stepName: string, recordName?: string): string {
  const stepAbbrev = stepName
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3);

  const nameInitials = recordName
    ? recordName
        .split(/[\s_-]+/)
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 3)
    : '';

  const timestamp = Date.now();
  const base26Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  let num = timestamp % (26 * 26 * 26 * 26);
  for (let i = 0; i < 4; i++) {
    code = base26Chars[num % 26] + code;
    num = Math.floor(num / 26);
  }

  if (nameInitials) {
    return `${stepAbbrev}-${nameInitials}-${code}`;
  }
  return `${stepAbbrev}-${code}`;
}

// Get display name for an entry
function getEntryDisplayName(entry: DataEntry): string {
  return (entry.Name as string) || (entry.Label as string) || (entry.Code as string) || entry._id;
}

interface TableDataEntryProps {
  connectionId?: string;
}

// Object Library - Left sidebar showing all steps
function ObjectLibrary({
  steps,
  selectedStepId,
  onSelectStep,
  getEntryCount,
}: {
  steps: PipelineStep[];
  selectedStepId: string;
  onSelectStep: (stepId: string) => void;
  getEntryCount: (stepId: string) => number;
}) {
  return (
    <div className="w-56 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Object Library</h3>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {steps.map((step) => {
          const count = getEntryCount(step.id);
          const isSelected = step.id === selectedStepId;
          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                isSelected
                  ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className={`text-sm ${isSelected ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
                {step.name}
              </span>
              <span className={`text-sm ${isSelected ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// Table Row for inline editing
function TableRow({
  step,
  entry,
  visibleColumns,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  connectionId,
  getReferenceOptions,
  isNew,
  onSaveAndNew,
  parentRefField,
  parentId,
}: {
  step: PipelineStep;
  entry?: DataEntry;
  visibleColumns: ColumnDefinition[];
  isEditing: boolean;
  onStartEdit?: () => void;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  connectionId?: string;
  getReferenceOptions: (stepId: string, col: ColumnDefinition) => { value: string; label: string }[];
  isNew: boolean;
  onSaveAndNew?: (data: Record<string, unknown>) => void;
  parentRefField?: string;
  parentId?: string;
}) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if (entry) {
      return { ...entry };
    }
    // Initialize with default values
    const defaults: Record<string, unknown> = {};
    for (const col of step.columns) {
      if (col.defaultValue !== undefined) {
        defaults[col.name] = col.defaultValue;
      }
      if (col.autogenerate) {
        defaults[col.name] = generateUniqueCode(step.name);
      }
    }
    if (parentRefField && parentId) {
      defaults[parentRefField] = parentId;
    }
    return defaults;
  });

  const [userModifiedFields, setUserModifiedFields] = useState<Set<string>>(new Set());
  const [pickerColumn, setPickerColumn] = useState<ColumnDefinition | null>(null);
  const [externalRefNames, setExternalRefNames] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const rowRef = useRef<HTMLTableRowElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus first input when editing starts
  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
          firstInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!rowRef.current?.contains(document.activeElement)) return;

      const activeElement = document.activeElement;
      const isInSelect = activeElement?.tagName === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter' && isNew && onSaveAndNew) {
        e.preventDefault();
        handleSaveAndNewClick();
        return;
      }

      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !isInSelect) {
        e.preventDefault();
        handleSaveClick();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formData, onSave, onSaveAndNew, onCancel, isNew, isEditing]);

  const handleChange = (name: string, value: unknown) => {
    setValidationErrors(prev => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    const col = step.columns.find(c => c.name === name);
    if (col?.autogenerate) {
      setUserModifiedFields(prev => new Set(prev).add(name));
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'Name' && typeof value === 'string') {
        for (const autoCol of step.columns) {
          if (autoCol.autogenerate && !userModifiedFields.has(autoCol.name)) {
            newData[autoCol.name] = generateUniqueCode(step.name, value);
          }
        }
      }
      return newData;
    });
  };

  const handleExternalRefSelect = (colName: string, record: { id: string; name: string }) => {
    handleChange(colName, record.id);
    setExternalRefNames(prev => ({ ...prev, [colName]: record.name }));
    setPickerColumn(null);
  };


  const isValueMissing = (value: unknown) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    return false;
  };

  const validateRequiredFields = () => {
    const errors: Record<string, string> = {};
    for (const col of step.columns) {
      if (!col.required) continue;
      if (parentRefField && col.name === parentRefField && parentId) continue;
      const value = formData[col.name];
      if (isValueMissing(value)) {
        errors[col.name] = `${col.name} is required`;
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveClick = () => {
    if (!validateRequiredFields()) {
      return;
    }
    onSave(formData);
  };

  const handleSaveAndNewClick = () => {
    if (!onSaveAndNew) return;
    if (!validateRequiredFields()) {
      return;
    }
    onSaveAndNew(formData);
  };

  const renderCell = (col: ColumnDefinition, isFirst: boolean) => {
    const value = formData[col.name];

    if (!isEditing) {
      // Display mode
      let displayValue = value;

      if (col.type === 'boolean') {
        displayValue = value ? 'Yes' : 'No';
      } else if (col.type === 'reference') {
        const options = getReferenceOptions(step.id, col);
        const opt = options.find(o => o.value === value);
        displayValue = opt?.label || value;
      } else if (col.type === 'picklist' && col.name.toLowerCase().includes('status')) {
        // Special rendering for status fields
        return (
          <td key={col.name} className="px-4 py-3 whitespace-nowrap">
            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
              value === 'Active' ? 'bg-green-100 text-green-700' :
              value === 'Inactive' ? 'bg-gray-100 text-gray-600' :
              'bg-blue-100 text-blue-700'
            }`}>
              {String(value || '')}
            </span>
          </td>
        );
      }

      return (
        <td key={col.name} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
          {String(displayValue ?? '')}
        </td>
      );
    }

    // Edit mode
    switch (col.type) {
      case 'salesforce_id':
        return (
          <td key={col.name} className="px-2 py-2">
            <div className="flex gap-1">
              <input
                ref={isFirst ? firstInputRef : undefined}
                type="text"
                value={(value as string) || ''}
                onChange={(e) => handleChange(col.name, e.target.value)}
                placeholder={`${col.externalSobject || 'SF'} ID`}
                className={`w-full px-2 py-1.5 border rounded text-sm font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${validationErrors[col.name] ? 'border-red-500' : 'border-gray-300'}`}
              />
              <button
                type="button"
                onClick={() => setPickerColumn(col)}
                disabled={!connectionId || !col.externalSobject}
                className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                title="Lookup"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </td>
        );

      case 'reference': {
        const options = getReferenceOptions(step.id, col);
        return (
          <td key={col.name} className="px-2 py-2">
            <select
              value={(value as string) || ''}
              onChange={(e) => handleChange(col.name, e.target.value)}
              className={`w-full px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white ${validationErrors[col.name] ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select...</option>
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </td>
        );
      }

      case 'picklist':
        return (
          <td key={col.name} className="px-2 py-2">
            <select
              value={(value as string) || String(col.defaultValue || '')}
              onChange={(e) => handleChange(col.name, e.target.value)}
              className={`w-full px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white ${validationErrors[col.name] ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select...</option>
              {(col.picklistValues || []).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </td>
        );

      case 'boolean':
        return (
          <td key={col.name} className="px-2 py-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleChange(col.name, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </td>
        );

      case 'number':
      case 'currency':
        return (
          <td key={col.name} className="px-2 py-2">
            <input
              ref={isFirst ? firstInputRef : undefined}
              type="number"
              value={(value as number) ?? ''}
              onChange={(e) => handleChange(col.name, e.target.value ? Number(e.target.value) : null)}
              step={col.type === 'currency' ? '0.01' : '1'}
              className={`w-full px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${validationErrors[col.name] ? 'border-red-500' : 'border-gray-300'}`}
            />
          </td>
        );

      default:
        return (
          <td key={col.name} className="px-2 py-2">
            <input
              ref={isFirst ? firstInputRef : undefined}
              type="text"
              value={(value as string) || ''}
              onChange={(e) => handleChange(col.name, e.target.value)}
              className={`w-full px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${validationErrors[col.name] ? 'border-red-500' : 'border-gray-300'}`}
            />
          </td>
        );
    }
  };

  if (!isEditing && entry) {
    // Display row
    return (
      <tr className="hover:bg-gray-50 border-b border-gray-100" onDoubleClick={onStartEdit}>
        {visibleColumns.map((col, index) => renderCell(col, index === 0))}
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={onStartEdit}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // Edit/New row
  return (
    <>
      <tr ref={rowRef} className={`${isNew ? 'bg-blue-50' : 'bg-yellow-50'} border-b border-gray-200`}>
        {visibleColumns.map((col, index) => renderCell(col, index === 0))}
        <td className="px-4 py-2 whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleSaveClick}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
              title="Save (Enter)"
            >
              SAVE
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-gray-600 text-sm font-medium border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              title="Cancel (Esc)"
            >
              CANCEL
            </button>
          </div>
        </td>
      </tr>

      {Object.keys(validationErrors).length > 0 && (
        <tr className="bg-red-50 border-b border-red-100">
          <td colSpan={visibleColumns.length + 1} className="px-4 py-2 text-xs text-red-700">
            Please fill required fields: {Object.values(validationErrors).join(', ')}
          </td>
        </tr>
      )}

      {/* Salesforce Record Picker Modal */}
      {pickerColumn && connectionId && pickerColumn.externalSobject && (
        <SalesforceRecordPicker
          connectionId={connectionId}
          sobjectName={pickerColumn.externalSobject}
          sobjectLabel={pickerColumn.externalSobject}
          onSelect={(record) => handleExternalRefSelect(pickerColumn.name, record)}
          onClose={() => setPickerColumn(null)}
          currentValue={formData[pickerColumn.name] as string}
        />
      )}
    </>
  );
}

// Data Table for a step
function DataTable({
  step,
  entries,
  connectionId,
  getReferenceOptions,
  addEntry,
  updateEntry,
  deleteEntry,
  parentStep,
  parentEntry,
  refField,
}: {
  step: PipelineStep;
  entries: DataEntry[];
  connectionId?: string;
  getReferenceOptions: (stepId: string, col: ColumnDefinition) => { value: string; label: string }[];
  addEntry: (stepId: string, data: Record<string, unknown>) => string;
  updateEntry: (stepId: string, entryId: string, data: Record<string, unknown>) => void;
  deleteEntry: (stepId: string, entryId: string) => void;
  parentStep?: PipelineStep;
  parentEntry?: DataEntry;
  refField?: string;
}) {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { confirm } = useConfirmDialog();

  // Get visible columns (hide parent reference field)
  const visibleColumns = useMemo(() => {
    return step.columns.filter(col => {
      if (refField && col.name === refField) return false;
      return true;
    });
  }, [step.columns, refField]);

  const handleSave = (entryId: string | null, data: Record<string, unknown>) => {
    if (refField && parentEntry) {
      data[refField] = parentEntry._id;
    }
    if (entryId) {
      updateEntry(step.id, entryId, data);
    } else {
      addEntry(step.id, data);
    }
    setEditingEntryId(null);
    setIsAddingNew(false);
  };

  const handleSaveAndNew = (data: Record<string, unknown>) => {
    if (refField && parentEntry) {
      data[refField] = parentEntry._id;
    }
    addEntry(step.id, data);
    setFormKey(k => k + 1);
  };

  const handleDelete = async (entryId: string) => {
    const confirmed = await confirm({
      title: 'Delete Entry',
      message: 'Are you sure you want to delete this entry? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      deleteEntry(step.id, entryId);
      setEditingEntryId(null);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {visibleColumns.map(col => (
              <th
                key={col.name}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                {col.name.replace(/_/g, ' ')}
              </th>
            ))}
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {/* New entry row */}
          {isAddingNew && (
            <TableRow
              key={`new-${formKey}`}
              step={step}
              visibleColumns={visibleColumns}
              isEditing={true}
              onSave={(data) => handleSave(null, data)}
              onSaveAndNew={handleSaveAndNew}
              onCancel={() => setIsAddingNew(false)}
              connectionId={connectionId}
              getReferenceOptions={getReferenceOptions}
              isNew={true}
              parentRefField={refField}
              parentId={parentEntry?._id}
            />
          )}

          {/* Existing entries */}
          {entries.map(entry => (
            <TableRow
              key={entry._id}
              step={step}
              entry={entry}
              visibleColumns={visibleColumns}
              isEditing={editingEntryId === entry._id}
              onStartEdit={() => setEditingEntryId(entry._id)}
              onSave={(data) => handleSave(entry._id, data)}
              onCancel={() => setEditingEntryId(null)}
              onDelete={() => handleDelete(entry._id)}
              connectionId={connectionId}
              getReferenceOptions={getReferenceOptions}
              isNew={false}
            />
          ))}

          {/* Empty state */}
          {entries.length === 0 && !isAddingNew && (
            <tr>
              <td
                colSpan={visibleColumns.length + 1}
                className="px-4 py-8 text-center text-sm text-gray-400 italic"
              >
                No values configured{parentEntry ? ' for this parent' : ''}. Click &quot;+ Add{parentEntry ? ' New Value' : ' Entry'}&quot; to start.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Add button for tables within parent groups */}
      {parentEntry && !isAddingNew && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => setIsAddingNew(true)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            + Add New Value
          </button>
        </div>
      )}
    </div>
  );
}

// Parent Group Section for hierarchical data
function ParentGroupSection({
  parentStep,
  parentEntry,
  childStep,
  childEntries,
  refField,
  connectionId,
  getReferenceOptions,
  addEntry,
  updateEntry,
  deleteEntry,
}: {
  parentStep: PipelineStep;
  parentEntry: DataEntry;
  childStep: PipelineStep;
  childEntries: DataEntry[];
  refField: string;
  connectionId?: string;
  getReferenceOptions: (stepId: string, col: ColumnDefinition) => { value: string; label: string }[];
  addEntry: (stepId: string, data: Record<string, unknown>) => string;
  updateEntry: (stepId: string, entryId: string, data: Record<string, unknown>) => void;
  deleteEntry: (stepId: string, entryId: string) => void;
}) {
  const parentName = getEntryDisplayName(parentEntry);

  return (
    <div className="mb-6">
      {/* Parent Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-blue-500">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="text-sm font-medium text-gray-500 uppercase">Parent {parentStep.name.replace(/s$/, '')}:</span>
        <span className="text-sm font-bold text-blue-600 uppercase">{parentName}</span>
      </div>

      {/* Child Data Table */}
      <DataTable
        step={childStep}
        entries={childEntries}
        connectionId={connectionId}
        getReferenceOptions={getReferenceOptions}
        addEntry={addEntry}
        updateEntry={updateEntry}
        deleteEntry={deleteEntry}
        parentStep={parentStep}
        parentEntry={parentEntry}
        refField={refField}
      />
    </div>
  );
}

// Main Step Content
function StepContent({
  step,
  entries,
  parentStep,
  parentEntries,
  refField,
  connectionId,
  getReferenceOptions,
  addEntry,
  updateEntry,
  deleteEntry,
  onAddEntry,
}: {
  step: PipelineStep;
  entries: DataEntry[];
  parentStep?: PipelineStep;
  parentEntries?: DataEntry[];
  refField?: string;
  connectionId?: string;
  getReferenceOptions: (stepId: string, col: ColumnDefinition) => { value: string; label: string }[];
  addEntry: (stepId: string, data: Record<string, unknown>) => string;
  updateEntry: (stepId: string, entryId: string, data: Record<string, unknown>) => void;
  deleteEntry: (stepId: string, entryId: string) => void;
  onAddEntry: () => void;
}) {
  // If this step has a parent, show grouped view
  if (parentStep && parentEntries && refField) {
    if (parentEntries.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-500 mb-2">No {parentStep.name} Found</h3>
          <p className="text-sm text-gray-400 mb-4">
            Create {parentStep.name.toLowerCase()} first to add {step.name.toLowerCase()} here.
          </p>
          <p className="text-xs text-gray-400">
            Go to &quot;{parentStep.name}&quot; in the Object Library to add entries.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {parentEntries.map(parentEntry => {
          const childEntries = entries.filter(e => e[refField] === parentEntry._id);
          return (
            <ParentGroupSection
              key={parentEntry._id}
              parentStep={parentStep}
              parentEntry={parentEntry}
              childStep={step}
              childEntries={childEntries}
              refField={refField}
              connectionId={connectionId}
              getReferenceOptions={getReferenceOptions}
              addEntry={addEntry}
              updateEntry={updateEntry}
              deleteEntry={deleteEntry}
            />
          );
        })}
      </div>
    );
  }

  // Root object view (no parent) - uses shared DataTable
  return (
    <DataTable
      step={step}
      entries={entries}
      connectionId={connectionId}
      getReferenceOptions={getReferenceOptions}
      addEntry={addEntry}
      updateEntry={updateEntry}
      deleteEntry={deleteEntry}
    />
  );
}

// Main Component
export default function TableDataEntry({ connectionId }: TableDataEntryProps) {
  const {
    state,
    pipelineConfig,
    getEntryCountByStep,
    getReferenceOptions,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useConfigData();

  const [selectedStepId, setSelectedStepId] = useState<string>(
    pipelineConfig.steps[0]?.id || ''
  );
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Get the selected step
  const selectedStep = useMemo(() =>
    pipelineConfig.steps.find(s => s.id === selectedStepId),
    [pipelineConfig.steps, selectedStepId]
  );

  // Find primary parent for the selected step (only if reference field is REQUIRED)
  const parentInfo = useMemo(() => {
    if (!selectedStep) return null;

    if (selectedStep.parentIdMappings && selectedStep.parentIdMappings.length > 0) {
      const primaryMapping = selectedStep.parentIdMappings[0];
      const refColumn = selectedStep.columns.find(col => col.name === primaryMapping.field);
      if (refColumn && refColumn.required === true) {
        const parentStep = pipelineConfig.steps.find(s => s.id === primaryMapping.parentStep);
        if (parentStep) {
          return {
            parentStep,
            refField: primaryMapping.field,
          };
        }
      }
    }

    const refColumn = selectedStep.columns.find(col =>
      col.type === 'reference' && col.referenceTo && col.required === true
    );
    if (refColumn && refColumn.referenceTo) {
      const parentStep = pipelineConfig.steps.find(s => s.id === refColumn.referenceTo);
      if (parentStep) {
        return {
          parentStep,
          refField: refColumn.name,
        };
      }
    }

    return null;
  }, [selectedStep, pipelineConfig.steps]);

  const entries = state[selectedStepId] || [];
  const parentEntries = parentInfo ? (state[parentInfo.parentStep.id] || []) : [];

  // Update selection if current step no longer exists
  useEffect(() => {
    if (!selectedStep && pipelineConfig.steps.length > 0) {
      setSelectedStepId(pipelineConfig.steps[0].id);
    }
  }, [selectedStep, pipelineConfig.steps]);

  // Keyboard shortcut: Ctrl+Enter to add new entry (only for root objects)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !parentInfo && !isAddingNew) {
        e.preventDefault();
        setIsAddingNew(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [parentInfo, isAddingNew]);

  if (!selectedStep) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">No pipeline steps configured.</p>
      </div>
    );
  }

  // Get visible columns for the header badge
  const totalStepEntries = entries.length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Object Library - Left Sidebar */}
      <ObjectLibrary
        steps={pipelineConfig.steps}
        selectedStepId={selectedStepId}
        onSelectStep={(stepId) => {
          setSelectedStepId(stepId);
          setIsAddingNew(false);
        }}
        getEntryCount={getEntryCountByStep}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Content Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{selectedStep.name}</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                {totalStepEntries} Total Entries
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 uppercase tracking-wide">
              Object API: <span className="text-gray-600">{selectedStep.apiName}</span>
            </p>
          </div>
          {!parentInfo && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              title="Add Entry (Ctrl+Enter)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              ADD ENTRY
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* New entry form for root objects */}
          {!parentInfo && isAddingNew && (
            <div className="mb-6">
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {selectedStep.columns.map(col => (
                        <th
                          key={col.name}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {col.name.replace(/_/g, ' ')}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      key={`new-${formKey}`}
                      step={selectedStep}
                      visibleColumns={selectedStep.columns}
                      isEditing={true}
                      onSave={(data) => {
                        addEntry(selectedStep.id, data);
                        setIsAddingNew(false);
                      }}
                      onSaveAndNew={(data) => {
                        addEntry(selectedStep.id, data);
                        setFormKey(k => k + 1);
                      }}
                      onCancel={() => setIsAddingNew(false)}
                      connectionId={connectionId}
                      getReferenceOptions={getReferenceOptions}
                      isNew={true}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <StepContent
            step={selectedStep}
            entries={entries}
            parentStep={parentInfo?.parentStep}
            parentEntries={parentInfo ? parentEntries : undefined}
            refField={parentInfo?.refField}
            connectionId={connectionId}
            getReferenceOptions={getReferenceOptions}
            addEntry={addEntry}
            updateEntry={updateEntry}
            deleteEntry={deleteEntry}
            onAddEntry={() => setIsAddingNew(true)}
          />
        </div>
      </div>
    </div>
  );
}
