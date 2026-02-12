'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useConfigData, DataEntry } from '@/contexts/ConfigDataContext';
import { Button, Badge, Input, Select, useConfirmDialog } from '@/components/ui';
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

// Get subtitle for an entry (usually Code)
function getEntrySubtitle(entry: DataEntry): string | null {
  if (entry.Code && entry.Name !== entry.Code) {
    return entry.Code as string;
  }
  return null;
}

interface HierarchicalDataEntryProps {
  connectionId?: string; // Optional - used for Salesforce ID picker
}

// Step Navigator - Left panel showing all steps grouped by category
function StepNavigator({
  stepsByCategory,
  selectedStepId,
  onSelectStep,
  getEntryCount,
}: {
  stepsByCategory: Record<string, PipelineStep[]>;
  selectedStepId: string;
  onSelectStep: (stepId: string) => void;
  getEntryCount: (stepId: string) => number;
}) {
  // Start with all categories collapsed, but expand the one containing the selected step
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
    const all = new Set(Object.keys(stepsByCategory));
    // Expand the category that contains the selected step
    for (const [cat, steps] of Object.entries(stepsByCategory)) {
      if (steps.some(s => s.id === selectedStepId)) {
        all.delete(cat);
        break;
      }
    }
    return all;
  });

  // When new categories appear, default them to collapsed
  useEffect(() => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      for (const cat of Object.keys(stepsByCategory)) {
        if (!prev.has(cat)) {
          // Check if this is a genuinely new category (not the initially expanded one)
          const containsSelected = stepsByCategory[cat]?.some(s => s.id === selectedStepId);
          if (!containsSelected) {
            next.add(cat);
          }
        }
      }
      return next;
    });
  }, [stepsByCategory, selectedStepId]);

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Object Types</h3>
      </div>
      <nav className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {Object.entries(stepsByCategory).map(([category, steps]) => {
          const isCollapsed = collapsedCategories.has(category);
          const totalCount = steps.reduce((sum, s) => sum + getEntryCount(s.id), 0);

          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full text-left px-4 py-2 flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-100"
              >
                <span>{category}</span>
                <span className="flex items-center gap-1">
                  <span className="text-gray-400 text-xs font-normal">{totalCount}</span>
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
              {!isCollapsed && steps.map((step) => {
                const count = getEntryCount(step.id);
                const isSelected = step.id === selectedStepId;
                return (
                  <button
                    key={step.id}
                    onClick={() => onSelectStep(step.id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700'
                        : 'hover:bg-gray-100 border-l-4 border-transparent text-gray-700'
                    }`}
                  >
                    <span className={`text-sm ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                      {step.name}
                    </span>
                    <span className={`text-sm ${isSelected ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

// Inline Entry Form
function InlineEntryForm({
  step,
  entry,
  parentRefField,
  parentId,
  onSave,
  onSaveAndNew,
  onCancel,
  onDelete,
  connectionId,
  getReferenceOptions,
  isNew,
  onMultiSelectCreate,
  getAllowedSalesforceIds,
}: {
  step: PipelineStep;
  entry?: DataEntry;
  parentRefField?: string;
  parentId?: string;
  onSave: (data: Record<string, unknown>) => void;
  onSaveAndNew?: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  connectionId?: string;
  getReferenceOptions: (stepId: string, col: ColumnDefinition) => { value: string; label: string }[];
  isNew: boolean;
  onMultiSelectCreate?: (colName: string, records: { id: string; name: string }[]) => void;
  getAllowedSalesforceIds?: (col: ColumnDefinition) => Set<string> | null | undefined;
}) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if (entry) {
      return { ...entry };
    }
    // Initialize with default values and autogenerate values
    const defaults: Record<string, unknown> = {};
    for (const col of step.columns) {
      if (col.defaultValue !== undefined) {
        defaults[col.name] = col.defaultValue;
      }
      if (col.autogenerate) {
        defaults[col.name] = generateUniqueCode(step.name);
      }
    }
    // Apply sameAs: copy value from the referenced field
    for (const col of step.columns) {
      if (col.sameAs && defaults[col.sameAs] !== undefined) {
        defaults[col.name] = defaults[col.sameAs];
      }
    }
    // Set parent reference if provided
    if (parentRefField && parentId) {
      defaults[parentRefField] = parentId;
    }
    return defaults;
  });

  const [userModifiedFields, setUserModifiedFields] = useState<Set<string>>(new Set());
  const [pickerColumn, setPickerColumn] = useState<ColumnDefinition | null>(null);
  const [externalRefNames, setExternalRefNames] = useState<Record<string, string>>(
    () => (entry?._sfNames as Record<string, string>) || {}
  );
  const formRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the first input field when the form mounts
  useEffect(() => {
    // Small delay to ensure the DOM is ready
    const timer = setTimeout(() => {
      if (firstInputRef.current) {
        firstInputRef.current.focus();
        firstInputRef.current.select();
      } else if (formRef.current) {
        // Fallback: find the first input/select in the form
        const firstInput = formRef.current.querySelector('input, select') as HTMLElement;
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this form is focused (active element is within the form)
      if (!formRef.current?.contains(document.activeElement)) return;

      const activeElement = document.activeElement;
      const isInSelect = activeElement?.tagName === 'SELECT';
      const isInDropdown = activeElement?.getAttribute('role') === 'listbox' ||
                          activeElement?.closest('[role="listbox"]') !== null;

      // Ctrl+Shift+Enter or Cmd+Shift+Enter - save and new (only for new records)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter' && isNew && onSaveAndNew) {
        e.preventDefault();
        onSaveAndNew(formData);
        return;
      }

      // Enter key - save (but not if in a select/dropdown)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (!isInSelect && !isInDropdown) {
          e.preventDefault();
          onSave(formData);
        }
      }

      // Escape key - cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formData, onSave, onSaveAndNew, onCancel, isNew]);

  const handleChange = (name: string, value: unknown) => {
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
      // Propagate to sameAs fields
      for (const col of step.columns) {
        if (col.sameAs === name) {
          newData[col.name] = value;
        }
      }
      return newData;
    });
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const handleSaveAndNew = () => {
    if (onSaveAndNew) {
      onSaveAndNew(formData);
    }
  };

  const handleExternalRefSelect = (colName: string, record: { id: string; name: string }) => {
    handleChange(colName, record.id);
    setExternalRefNames(prev => ({ ...prev, [colName]: record.name }));
    setFormData(prev => ({
      ...prev,
      _sfNames: { ...(prev._sfNames as Record<string, string> || {}), [colName]: record.name },
    }));
    setPickerColumn(null);
  };

  // Filter columns - hide the parent reference field and hideInEntryForm columns
  const visibleColumns = step.columns.filter(col => {
    if (parentRefField && col.name === parentRefField) return false;
    if (col.hideInEntryForm) return false;
    return true;
  });

  const renderField = (col: ColumnDefinition, isFirst: boolean) => {
    const value = formData[col.name];

    switch (col.type) {
      case 'salesforce_id': {
        const allowedSet = getAllowedSalesforceIds?.(col);
        const manualVal = (value as string) || '';
        const isNotAllowed = allowedSet instanceof Set && manualVal.trim() !== '' && !allowedSet.has(manualVal);
        return (
          <div key={col.name} className="flex-1 min-w-[200px]">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase mb-1">
              {col.name.replace(/_/g, ' ')}{col.required && '*'}
              {col.multiSelect && (
                <span
                  className="text-blue-500"
                  title="Multi-select: picking multiple records will create one entry per selection"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </span>
              )}
            </label>
            <div className="flex gap-1">
              <input
                ref={isFirst ? firstInputRef : undefined}
                type="text"
                value={manualVal}
                onChange={(e) => handleChange(col.name, e.target.value)}
                placeholder={`Enter ${col.externalSobject || 'Salesforce'} ID`}
                className={`flex-1 px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isNotAllowed ? 'border-amber-400' : 'border-gray-300'}`}
              />
              <button
                type="button"
                onClick={() => setPickerColumn(col)}
                disabled={!connectionId || !col.externalSobject}
                className="px-2 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                title="Lookup"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            {isNotAllowed && (
              <p className="text-[10px] text-amber-600 mt-0.5">This ID is not in the allowed set from the source step.</p>
            )}
            {externalRefNames[col.name] && (
              <p className="text-xs text-green-600 mt-0.5">{externalRefNames[col.name]}</p>
            )}
          </div>
        );
      }

      case 'reference': {
        const options = getReferenceOptions(step.id, col);
        return (
          <div key={col.name} className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              {col.name.replace(/_/g, ' ')}{col.required && '*'}
            </label>
            <select
              value={(value as string) || ''}
              onChange={(e) => handleChange(col.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select...</option>
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );
      }

      case 'picklist':
        return (
          <div key={col.name} className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              {col.name.replace(/_/g, ' ')}{col.required && '*'}
            </label>
            <select
              value={(value as string) || String(col.defaultValue || '')}
              onChange={(e) => handleChange(col.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select...</option>
              {(col.picklistValues || []).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        );

      case 'boolean':
        return (
          <div key={col.name} className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              {col.name.replace(/_/g, ' ')}
            </label>
            <div className="flex items-center h-[42px]">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => handleChange(col.name, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">{value ? 'Yes' : 'No'}</span>
            </div>
          </div>
        );

      case 'number':
      case 'currency':
        return (
          <div key={col.name} className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              {col.name.replace(/_/g, ' ')}{col.required && '*'}
            </label>
            <input
              ref={isFirst ? firstInputRef : undefined}
              type="number"
              value={(value as number) ?? ''}
              onChange={(e) => handleChange(col.name, e.target.value ? Number(e.target.value) : null)}
              step={col.type === 'currency' ? '0.01' : '1'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );

      default:
        return (
          <div key={col.name} className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              {col.name.replace(/_/g, ' ')}{col.required && '*'}
            </label>
            <input
              ref={isFirst ? firstInputRef : undefined}
              type="text"
              value={(value as string) || ''}
              onChange={(e) => handleChange(col.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );
    }
  };

  return (
    <>
      <div ref={formRef} className="border-2 border-blue-400 rounded-xl p-4 bg-blue-50/30">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
            {isNew ? 'New Record' : 'Editing Record'}
            <span className="ml-2 text-xs font-normal text-gray-400">
              (Enter: save{isNew && onSaveAndNew ? ', Ctrl+Shift+Enter: save & new' : ''}, Esc: cancel)
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
              title="Save (Enter)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            {isNew && onSaveAndNew && (
              <button
                onClick={handleSaveAndNew}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                title="Save and Add New (Ctrl+Shift+Enter)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            )}
            {onDelete && !isNew && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={onCancel}
              className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
              title="Cancel (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          {visibleColumns.map((col, index) => renderField(col, index === 0))}
        </div>
      </div>

      {/* Salesforce Record Picker Modal */}
      {pickerColumn && connectionId && pickerColumn.externalSobject && (
        <SalesforceRecordPicker
          connectionId={connectionId}
          sobjectName={pickerColumn.externalSobject}
          sobjectLabel={pickerColumn.externalSobject}
          onSelect={(record) => handleExternalRefSelect(pickerColumn.name, record)}
          multiSelect={pickerColumn.multiSelect}
          allowedIds={getAllowedSalesforceIds?.(pickerColumn)}
          onMultiSelect={(records) => {
            if (onMultiSelectCreate && pickerColumn.multiSelect) {
              onMultiSelectCreate(pickerColumn.name, records);
            }
            setPickerColumn(null);
          }}
          onClose={() => setPickerColumn(null)}
          currentValue={formData[pickerColumn.name] as string}
        />
      )}
    </>
  );
}

// Entry Card - Display mode for an entry
function EntryCard({
  step,
  entry,
  onEdit,
  onDelete,
  keyFields,
}: {
  step: PipelineStep;
  entry: DataEntry;
  onEdit: () => void;
  onDelete: () => void;
  keyFields: ColumnDefinition[];
}) {
  const displayName = getEntryDisplayName(entry);
  const subtitle = getEntrySubtitle(entry);

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{displayName}</h4>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Key field values */}
          <div className="flex items-center gap-6 text-sm">
            {keyFields.slice(0, 3).map(col => {
              const value = entry[col.name];
              if (value === undefined || value === null || value === '') return null;
              const sfName = (entry._sfNames as Record<string, string> | undefined)?.[col.name];
              return (
                <div key={col.name} className="text-right">
                  <span className="text-xs text-gray-400 uppercase block">{col.name}</span>
                  <span className="text-gray-700">{String(value)}</span>
                  {sfName && <span className="text-xs text-green-600 block">{sfName}</span>}
                </div>
              );
            })}
          </div>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Parent Section - Groups child entries under a parent
function ParentSection({
  parentStep,
  parentEntry,
  childStep,
  childEntries,
  refField,
  onAddChild,
  onEditChild,
  onDeleteChild,
  editingEntryId,
  editingEntryIds,
  connectionId,
  getReferenceOptions,
  onSaveChild,
  onSaveAndNewChild,
  onCancelEdit,
  onMultiSelectCreate,
  getAllowedSalesforceIds,
}: {
  parentStep: PipelineStep;
  parentEntry: DataEntry;
  childStep: PipelineStep;
  childEntries: DataEntry[];
  refField: string;
  onAddChild: () => void;
  onEditChild: (entryId: string) => void;
  onDeleteChild: (entryId: string) => void;
  editingEntryId: string | null;
  editingEntryIds?: Set<string>;
  connectionId?: string;
  getReferenceOptions: (stepId: string, col: ColumnDefinition) => { value: string; label: string }[];
  onSaveChild: (entryId: string | null, data: Record<string, unknown>) => void;
  onSaveAndNewChild?: (data: Record<string, unknown>) => void;
  onCancelEdit: () => void;
  onMultiSelectCreate?: (colName: string, records: { id: string; name: string }[]) => void;
  getAllowedSalesforceIds?: (col: ColumnDefinition) => Set<string> | null | undefined;
}) {
  const [formKey, setFormKey] = useState(0);
  const parentName = getEntryDisplayName(parentEntry);

  // Get key fields for display (non-reference, non-hidden fields)
  const keyFields = childStep.columns.filter(col =>
    col.type !== 'reference' &&
    col.name !== refField &&
    col.name !== 'Name' &&
    col.name !== 'Code' &&
    col.name !== 'Label'
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Parent Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="font-semibold text-gray-900">{parentName}</span>
        </div>
        <button
          onClick={onAddChild}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <span>+ Add {childStep.name.replace(/s$/, '')}</span>
        </button>
      </div>

      {/* Child Entries */}
      <div className="p-4 space-y-3">
        {/* New entry form */}
        {editingEntryId === 'new' && (
          <InlineEntryForm
            key={formKey}
            step={childStep}
            parentRefField={refField}
            parentId={parentEntry._id}
            onSave={(data) => onSaveChild(null, data)}
            onSaveAndNew={onSaveAndNewChild ? (data) => {
              onSaveAndNewChild(data);
              setFormKey(k => k + 1);
            } : undefined}
            onCancel={onCancelEdit}
            connectionId={connectionId}
            getReferenceOptions={getReferenceOptions}
            isNew={true}
            onMultiSelectCreate={onMultiSelectCreate}
            getAllowedSalesforceIds={getAllowedSalesforceIds}
          />
        )}

        {childEntries.length === 0 && editingEntryId !== 'new' && (
          <p className="text-center text-gray-400 py-4 italic">No entries yet.</p>
        )}

        {childEntries.map(entry => {
          const isEditingThis = editingEntryId === entry._id || (editingEntryIds?.has(entry._id) ?? false);
          return (
          <div key={entry._id}>
            {isEditingThis ? (
              <InlineEntryForm
                step={childStep}
                entry={entry}
                parentRefField={refField}
                parentId={parentEntry._id}
                onSave={(data) => onSaveChild(entry._id, data)}
                onCancel={onCancelEdit}
                onDelete={() => onDeleteChild(entry._id)}
                connectionId={connectionId}
                getReferenceOptions={getReferenceOptions}
                isNew={false}
                onMultiSelectCreate={onMultiSelectCreate}
                getAllowedSalesforceIds={getAllowedSalesforceIds}
              />
            ) : (
              <EntryCard
                step={childStep}
                entry={entry}
                onEdit={() => onEditChild(entry._id)}
                onDelete={() => onDeleteChild(entry._id)}
                keyFields={keyFields}
              />
            )}
          </div>
          );
        })}
      </div>
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
  isAddingNew,
  getAllowedSalesforceIds,
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
  isAddingNew?: boolean;
  getAllowedSalesforceIds?: (col: ColumnDefinition) => Set<string> | null | undefined;
}) {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryIds, setEditingEntryIds] = useState<Set<string>>(new Set());
  const [addingNewEntry, setAddingNewEntry] = useState(false);
  // Track which parent section is adding/editing
  const [editingInParent, setEditingInParent] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();

  // Get key fields for display (non-reference fields after Name/Code)
  const keyFields = step.columns.filter(col =>
    col.type !== 'reference' &&
    col.name !== 'Name' &&
    col.name !== 'Code' &&
    col.name !== 'Label'
  );

  const handleSaveEntry = (entryId: string | null, data: Record<string, unknown>) => {
    if (entryId) {
      updateEntry(step.id, entryId, data);
    } else {
      addEntry(step.id, data);
    }
    setEditingEntryId(null);
    if (entryId) {
      setEditingEntryIds(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
    setAddingNewEntry(false);
    setEditingInParent(null);
  };

  const handleDeleteEntry = async (entryId: string) => {
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
      setEditingEntryIds(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  const handleMultiSelectCreate = (parentEntryId: string | undefined, refFieldName: string | undefined, colName: string, records: { id: string; name: string }[]) => {
    // Cancel any current form
    setAddingNewEntry(false);
    setEditingEntryId(null);

    const newIds: string[] = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const data: Record<string, unknown> = {};

      for (const col of step.columns) {
        if (col.defaultValue !== undefined) {
          data[col.name] = col.defaultValue;
        }
        if (col.autogenerate) {
          data[col.name] = generateUniqueCode(step.name) + String.fromCharCode(65 + (i % 26));
        }
      }
      for (const col of step.columns) {
        if (col.sameAs && data[col.sameAs] !== undefined) {
          data[col.name] = data[col.sameAs];
        }
      }

      data[colName] = record.id;
      data._sfNames = { [colName]: record.name };

      if (refFieldName && parentEntryId) {
        data[refFieldName] = parentEntryId;
      }

      const newId = addEntry(step.id, data);
      newIds.push(newId);
    }

    setEditingEntryIds(new Set(newIds));
  };

  // If this step has a parent, show grouped view
  if (parentStep && parentEntries && refField) {
    return (
      <div className="space-y-6">
        {parentEntries.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-500 mb-2">No {parentStep.name} Found</h3>
            <p className="text-sm text-gray-400 mb-4">
              Create {parentStep.name.toLowerCase()} first to add {step.name.toLowerCase()} here.
            </p>
            <p className="text-xs text-gray-400">
              Go to &quot;{parentStep.name}&quot; in the left panel to add entries.
            </p>
          </div>
        )}

        {parentEntries.map(parentEntry => {
          const childEntries = entries.filter(e => e[refField] === parentEntry._id);
          const isEditingInThisParent = editingInParent === parentEntry._id;

          return (
            <ParentSection
              key={parentEntry._id}
              parentStep={parentStep}
              parentEntry={parentEntry}
              childStep={step}
              childEntries={childEntries}
              refField={refField}
              onAddChild={() => {
                setEditingInParent(parentEntry._id);
                setEditingEntryId('new');
              }}
              onEditChild={(entryId) => {
                setEditingInParent(parentEntry._id);
                setEditingEntryId(entryId);
              }}
              onDeleteChild={handleDeleteEntry}
              editingEntryId={isEditingInThisParent ? editingEntryId : null}
              editingEntryIds={editingEntryIds}
              connectionId={connectionId}
              getReferenceOptions={getReferenceOptions}
              onSaveChild={(entryId, data) => {
                // Ensure parent reference is set
                data[refField] = parentEntry._id;
                handleSaveEntry(entryId, data);
              }}
              onSaveAndNewChild={(data) => {
                // Ensure parent reference is set and keep form open
                data[refField] = parentEntry._id;
                addEntry(step.id, data);
              }}
              onCancelEdit={() => {
                setEditingEntryId(null);
                setEditingInParent(null);
              }}
              onMultiSelectCreate={(colName, records) => {
                handleMultiSelectCreate(parentEntry._id, refField, colName, records);
                setEditingInParent(parentEntry._id);
              }}
              getAllowedSalesforceIds={getAllowedSalesforceIds}
            />
          );
        })}
      </div>
    );
  }

  // Root object view (no parent)
  return (
    <div className="space-y-4">
      {/* Add new entry form */}
      {addingNewEntry && (
        <InlineEntryForm
          step={step}
          onSave={(data) => handleSaveEntry(null, data)}
          onCancel={() => setAddingNewEntry(false)}
          connectionId={connectionId}
          getReferenceOptions={getReferenceOptions}
          isNew={true}
          getAllowedSalesforceIds={getAllowedSalesforceIds}
        />
      )}

      {entries.length === 0 && !addingNewEntry && !isAddingNew && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-500 mb-2">No {step.name} Yet</h3>
          <p className="text-sm text-gray-400">
            Click &quot;+ Add Entry&quot; to create your first {step.name.replace(/s$/, '').toLowerCase()}.
          </p>
        </div>
      )}

      {entries.map(entry => {
        const isEditingThis = editingEntryId === entry._id || editingEntryIds.has(entry._id);
        return (
        <div key={entry._id}>
          {isEditingThis ? (
            <InlineEntryForm
              step={step}
              entry={entry}
              onSave={(data) => handleSaveEntry(entry._id, data)}
              onCancel={() => {
                setEditingEntryId(null);
                setEditingEntryIds(prev => {
                  const next = new Set(prev);
                  next.delete(entry._id);
                  return next;
                });
              }}
              onDelete={() => handleDeleteEntry(entry._id)}
              connectionId={connectionId}
              getReferenceOptions={getReferenceOptions}
              isNew={false}
              getAllowedSalesforceIds={getAllowedSalesforceIds}
              onMultiSelectCreate={(colName, records) => {
                handleMultiSelectCreate(undefined, undefined, colName, records);
              }}
            />
          ) : (
            <EntryCard
              step={step}
              entry={entry}
              onEdit={() => setEditingEntryId(entry._id)}
              onDelete={() => handleDeleteEntry(entry._id)}
              keyFields={keyFields}
            />
          )}
        </div>
        );
      })}
    </div>
  );
}

// Main Component
export default function HierarchicalDataEntry({ connectionId }: HierarchicalDataEntryProps) {
  const {
    state,
    pipelineConfig,
    stepsByCategory,
    getEntryCountByStep,
    getReferenceOptions,
    getAllowedSalesforceIds,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useConfigData();

  const [selectedStepId, setSelectedStepId] = useState<string>(
    pipelineConfig.steps[0]?.id || ''
  );
  const [addingNewEntry, setAddingNewEntry] = useState(false);
  const [formKey, setFormKey] = useState(0); // Used to reset form on Save and New

  // Get the selected step
  const selectedStep = useMemo(() =>
    pipelineConfig.steps.find(s => s.id === selectedStepId),
    [pipelineConfig.steps, selectedStepId]
  );

  // Find primary parent for the selected step (only if reference field is REQUIRED)
  // Objects with optional references should appear as root-level with a dropdown
  const parentInfo = useMemo(() => {
    if (!selectedStep) return null;

    // Look for primary parent through parentIdMappings first
    // But only if the corresponding column is required
    if (selectedStep.parentIdMappings && selectedStep.parentIdMappings.length > 0) {
      const primaryMapping = selectedStep.parentIdMappings[0];
      // Find the corresponding column to check if it's required
      const refColumn = selectedStep.columns.find(col => col.name === primaryMapping.field);
      // Only treat as parent-child if the reference is required
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

    // Fall back to finding reference column - only if it's REQUIRED
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

  // Handle Ctrl+Enter to add new entry (only for root objects without parent)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to add new entry
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !parentInfo && !addingNewEntry) {
        e.preventDefault();
        setAddingNewEntry(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [parentInfo, addingNewEntry]);

  if (!selectedStep) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">No pipeline steps configured.</p>
      </div>
    );
  }

  return (
    <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: '600px' }}>
      {/* Left Navigation */}
      <StepNavigator
        stepsByCategory={stepsByCategory}
        selectedStepId={selectedStepId}
        onSelectStep={(stepId) => {
          setSelectedStepId(stepId);
          setAddingNewEntry(false);
        }}
        getEntryCount={getEntryCountByStep}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedStep.name}</h2>
            <p className="text-sm text-gray-500 mt-1">API Name: {selectedStep.apiName}</p>
          </div>
          {!parentInfo && (
            <Button
              onClick={() => setAddingNewEntry(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              title="Add Entry (Ctrl+Enter)"
            >
              + Add Entry
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
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
            isAddingNew={addingNewEntry}
            getAllowedSalesforceIds={getAllowedSalesforceIds}
          />

          {/* New entry form for root objects */}
          {!parentInfo && addingNewEntry && (
            <div className="mt-4">
              <InlineEntryForm
                key={formKey}
                step={selectedStep}
                onSave={(data) => {
                  addEntry(selectedStep.id, data);
                  setAddingNewEntry(false);
                }}
                onSaveAndNew={(data) => {
                  addEntry(selectedStep.id, data);
                  setFormKey(k => k + 1); // Reset form for new entry
                }}
                onCancel={() => setAddingNewEntry(false)}
                connectionId={connectionId}
                getReferenceOptions={getReferenceOptions}
                isNew={true}
                getAllowedSalesforceIds={getAllowedSalesforceIds}
                onMultiSelectCreate={(colName, records) => {
                  setAddingNewEntry(false);
                  const newIds: string[] = [];
                  for (let i = 0; i < records.length; i++) {
                    const record = records[i];
                    const data: Record<string, unknown> = {};
                    for (const col of selectedStep.columns) {
                      if (col.defaultValue !== undefined) data[col.name] = col.defaultValue;
                      if (col.autogenerate) data[col.name] = generateUniqueCode(selectedStep.name) + String.fromCharCode(65 + (i % 26));
                    }
                    for (const col of selectedStep.columns) {
                      if (col.sameAs && data[col.sameAs] !== undefined) data[col.name] = data[col.sameAs];
                    }
                    data[colName] = record.id;
                    data._sfNames = { [colName]: record.name };
                    newIds.push(addEntry(selectedStep.id, data));
                  }
                  // Note: editingEntryIds is in StepContent, entries will appear as non-editing cards
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
