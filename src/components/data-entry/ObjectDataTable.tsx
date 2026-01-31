'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { EntryForm } from './EntryForm';
import { useConfigData, type DataEntry, type ConfigDataState } from '@/contexts/ConfigDataContext';
import type { PipelineStep } from '@/types';

interface ObjectDataTableProps {
  step: PipelineStep;
  expanded?: boolean;
  onToggle?: () => void;
}

export function ObjectDataTable({ step, expanded = false, onToggle }: ObjectDataTableProps) {
  const { state, addEntry, updateEntry, deleteEntry, getReferenceOptions } = useConfigData();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DataEntry | undefined>();

  const entries = state[step.id as keyof ConfigDataState] || [];
  const displayColumns = step.columns.filter(c => c.required || entries.some(e => (e as Record<string, unknown>)[c.name] !== undefined));

  const handleAdd = () => {
    setEditingEntry(undefined);
    setShowForm(true);
  };

  const handleEdit = (entry: DataEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      deleteEntry(step.id as keyof ConfigDataState, id);
    }
  };

  const handleSubmit = (entry: DataEntry) => {
    if (editingEntry) {
      updateEntry(step.id as keyof ConfigDataState, editingEntry._id, entry);
    } else {
      addEntry(step.id as keyof ConfigDataState, entry);
    }
    setShowForm(false);
    setEditingEntry(undefined);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEntry(undefined);
  };

  const formatCellValue = (value: unknown, columnName: string): string => {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    // For reference fields, try to get the label
    const column = step.columns.find(c => c.name === columnName);
    if (column?.type === 'reference') {
      const options = getReferenceOptions(step.id as keyof ConfigDataState, columnName);
      const option = options.find(o => o.value === value);
      if (option) return option.label;
    }

    return String(value);
  };

  // Get parent dependencies info
  const dependencies = step.dependsOn.length > 0
    ? step.dependsOn.map(depId => {
        const depStep = useConfigData().pipelineConfig.steps.find(s => s.id === depId);
        const depEntries = state[depId as keyof ConfigDataState] || [];
        return { name: depStep?.name || depId, count: depEntries.length };
      })
    : [];

  const hasMissingDependencies = dependencies.some(d => d.count === 0);

  return (
    <Card className={`transition-all ${expanded ? 'ring-2 ring-black' : ''}`}>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              entries.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {step.order}
            </div>
            <div>
              <CardTitle className="text-lg">{step.name}</CardTitle>
              <p className="text-sm text-gray-500">{step.apiName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={entries.length > 0 ? 'success' : 'default'}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Badge>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t">
          {/* Dependencies warning */}
          {hasMissingDependencies && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium text-yellow-800">Dependencies Required</p>
                  <p className="text-yellow-700">
                    This object requires: {dependencies.map(d => `${d.name} (${d.count} entries)`).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Add button and form */}
          {showForm ? (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-4">
                {editingEntry ? 'Edit Entry' : 'Add New Entry'}
              </h4>
              <EntryForm
                stepId={step.id as keyof ConfigDataState}
                columns={step.columns}
                entry={editingEntry}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            </div>
          ) : (
            <Button onClick={handleAdd} className="mb-4">
              + Add {step.name.replace(/s$/, '')}
            </Button>
          )}

          {/* Data table */}
          {entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    {displayColumns.slice(0, 5).map(col => (
                      <th key={col.name} className="px-3 py-2 text-left font-medium text-gray-700">
                        {col.name.replace(/_/g, ' ')}
                        {col.required && <span className="text-red-500 ml-1">*</span>}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry: DataEntry) => (
                    <tr key={entry._id} className="border-b hover:bg-gray-50">
                      {displayColumns.slice(0, 5).map(col => (
                        <td key={col.name} className="px-3 py-2">
                          {formatCellValue((entry as Record<string, unknown>)[col.name], col.name)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(entry._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No entries yet. Click "Add {step.name.replace(/s$/, '')}" to get started.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
