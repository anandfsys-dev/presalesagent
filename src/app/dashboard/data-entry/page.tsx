'use client';

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Alert,
  Badge,
  Select,
  Input,
} from '@/components/ui';
import { useConfigData, DataEntry, ExportData } from '@/contexts/ConfigDataContext';
import { SalesforceRecordPicker } from '@/components/data-entry/SalesforceRecordPicker';
import type { SalesforceConnection, PipelineStep, ColumnDefinition } from '@/types';

// Lazy load the Visual Data Builder to avoid SSR issues with React Flow
const VisualDataBuilder = lazy(() => import('@/components/data-entry/VisualDataBuilder'));

type ViewMode = 'hierarchical' | 'visual';

// Generate unique code for autogenerate fields
// Format: STEP-NAME-TIMESTAMP where STEP is abbreviation, NAME is initials, TIMESTAMP is base-26
function generateUniqueCode(stepName: string, recordName?: string): string {
  // Get abbreviation from step name (first letters of each word)
  const stepAbbrev = stepName
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3);

  // Get initials from record name if available
  const nameInitials = recordName
    ? recordName
        .split(/[\s_-]+/)
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 3)
    : '';

  // Generate base-26 timestamp (uses a-z characters)
  // This gives us a 6-character code that changes every ~10ms
  const timestamp = Date.now();
  const base26Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  let num = timestamp % (26 * 26 * 26 * 26); // Use lower bits for shorter codes
  for (let i = 0; i < 4; i++) {
    code = base26Chars[num % 26] + code;
    num = Math.floor(num / 26);
  }

  // Combine: STEP-NAME-CODE or STEP-CODE
  if (nameInitials) {
    return `${stepAbbrev}-${nameInitials}-${code}`;
  }
  return `${stepAbbrev}-${code}`;
}

// Entry Form Component
function EntryForm({
  step,
  onSubmit,
  onCancel,
  initialData,
  connectionId,
}: {
  step: PipelineStep;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  initialData?: DataEntry;
  connectionId?: string;
}) {
  const { getReferenceOptions } = useConfigData();
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if (initialData) {
      return { ...initialData };
    }
    // Initialize with default values and autogenerate values
    const defaults: Record<string, unknown> = {};
    for (const col of step.columns) {
      if (col.defaultValue !== undefined) {
        defaults[col.name] = col.defaultValue;
      }
      // Generate values for autogenerate fields (only for new entries)
      if (col.autogenerate) {
        defaults[col.name] = generateUniqueCode(step.name);
      }
    }
    return defaults;
  });

  // Track if autogenerate fields have been user-modified
  const [userModifiedFields, setUserModifiedFields] = useState<Set<string>>(new Set());

  // State for external reference picker
  const [pickerColumn, setPickerColumn] = useState<ColumnDefinition | null>(null);
  // Store display names for external references
  const [externalRefNames, setExternalRefNames] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: unknown) => {
    // Track if user manually modifies an autogenerate field
    const col = step.columns.find(c => c.name === name);
    if (col?.autogenerate) {
      setUserModifiedFields(prev => new Set(prev).add(name));
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // If Name field changes and there are autogenerate fields that haven't been user-modified,
      // update them with a new code incorporating the name
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleExternalRefSelect = (colName: string, record: { id: string; name: string }) => {
    handleChange(colName, record.id);
    setExternalRefNames(prev => ({ ...prev, [colName]: record.name }));
    setPickerColumn(null);
  };

  const renderField = (col: ColumnDefinition) => {
    const value = formData[col.name];

    switch (col.type) {
      case 'salesforce_id':
        // Salesforce ID - external Salesforce record lookup
        return (
          <div key={col.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {col.name.replace(/_/g, ' ')} {col.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={(value as string) || ''}
                onChange={(e) => {
                  handleChange(col.name, e.target.value);
                  // Clear the display name if user manually edits
                  if (externalRefNames[col.name]) {
                    setExternalRefNames(prev => {
                      const newNames = { ...prev };
                      delete newNames[col.name];
                      return newNames;
                    });
                  }
                }}
                placeholder={`Enter ${col.externalSobject || 'Salesforce'} ID or use Get button`}
                className="flex-1 font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPickerColumn(col)}
                disabled={!connectionId || !col.externalSobject}
                title={!connectionId ? 'Select a Salesforce connection first' : !col.externalSobject ? 'No Salesforce object configured' : `Select from ${col.externalSobject}`}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Get
              </Button>
            </div>
            {externalRefNames[col.name] && (
              <p className="text-xs text-green-600 mt-1">
                Selected: {externalRefNames[col.name]}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Lookup from: {col.externalSobject || 'Not configured'}
            </p>
          </div>
        );

      case 'reference':
        // Internal reference (existing behavior)
        const options = getReferenceOptions(step.id, col);
        return (
          <Select
            key={col.name}
            label={col.name.replace(/_/g, ' ')}
            value={(value as string) || ''}
            onChange={(e) => handleChange(col.name, e.target.value)}
            options={[
              { value: '', label: `Select ${col.name.replace(/_/g, ' ')}...` },
              ...options,
            ]}
            required={col.required}
          />
        );

      case 'picklist':
        return (
          <Select
            key={col.name}
            label={col.name.replace(/_/g, ' ')}
            value={(value as string) || String(col.defaultValue || '')}
            onChange={(e) => handleChange(col.name, e.target.value)}
            options={[
              { value: '', label: `Select ${col.name.replace(/_/g, ' ')}...` },
              ...(col.picklistValues || []).map(v => ({ value: v, label: v })),
            ]}
            required={col.required}
          />
        );

      case 'boolean':
        return (
          <div key={col.name} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={col.name}
              checked={Boolean(value)}
              onChange={(e) => handleChange(col.name, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor={col.name} className="text-sm font-medium text-gray-700">
              {col.name.replace(/_/g, ' ')}
            </label>
          </div>
        );

      case 'number':
      case 'currency':
        return (
          <Input
            key={col.name}
            label={col.name.replace(/_/g, ' ')}
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => handleChange(col.name, e.target.value ? Number(e.target.value) : null)}
            required={col.required}
            step={col.type === 'currency' ? '0.01' : '1'}
          />
        );

      default:
        return (
          <Input
            key={col.name}
            label={col.name.replace(/_/g, ' ')}
            type="text"
            value={(value as string) || ''}
            onChange={(e) => handleChange(col.name, e.target.value)}
            required={col.required}
          />
        );
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {step.columns.map(renderField)}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Update' : 'Add'} {step.name.replace(/s$/, '')}
          </Button>
        </div>
      </form>

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

// Step Panel Component
function StepPanel({ step, isHighlighted, connectionId }: { step: PipelineStep; isHighlighted?: boolean; connectionId?: string }) {
  const { state, addEntry, updateEntry, deleteEntry, getEntryCountByStep, getReferenceOptions } = useConfigData();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DataEntry | null>(null);

  const entries = state[step.id] || [];
  const count = getEntryCountByStep(step.id);

  const handleAdd = (data: Record<string, unknown>) => {
    addEntry(step.id, data);
    setShowForm(false);
  };

  const handleUpdate = (data: Record<string, unknown>) => {
    if (editingEntry) {
      updateEntry(step.id, editingEntry._id, data);
      setEditingEntry(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      deleteEntry(step.id, id);
    }
  };

  // Get display value for reference fields
  const getDisplayValue = (col: ColumnDefinition, value: unknown): string => {
    if (!value) return '-';

    if (col.type === 'reference' && col.referenceTo) {
      const options = getReferenceOptions(step.id, col);
      const option = options.find(o => o.value === value);
      return option?.label || String(value);
    }

    if (col.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (col.type === 'currency') {
      return `$${Number(value).toFixed(2)}`;
    }

    return String(value);
  };

  return (
    <Card className={`overflow-hidden ${isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <CardHeader className={`flex flex-row items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors ${isHighlighted ? 'bg-yellow-50' : ''}`}>
          <div className="flex items-center gap-3">
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <CardTitle className="text-base">{step.name}</CardTitle>
            <Badge variant={count > 0 ? 'success' : 'default'}>
              {count}
            </Badge>
            {isHighlighted && (
              <Badge variant="warning">
                Schema Updated
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500">{step.apiName}</span>
        </CardHeader>
      </button>

      {isExpanded && (
        <CardContent className="border-t">
          {/* Add button */}
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setShowForm(true)}>
              + Add {step.name.replace(/s$/, '')}
            </Button>
          </div>

          {/* Entry form */}
          {(showForm || editingEntry) && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium mb-3">
                {editingEntry ? 'Edit' : 'Add'} {step.name.replace(/s$/, '')}
              </h4>
              <EntryForm
                step={step}
                onSubmit={editingEntry ? handleUpdate : handleAdd}
                onCancel={() => {
                  setShowForm(false);
                  setEditingEntry(null);
                }}
                initialData={editingEntry || undefined}
                connectionId={connectionId}
              />
            </div>
          )}

          {/* Entries table */}
          {entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {step.columns.slice(0, 5).map(col => (
                      <th key={col.name} className="px-3 py-2 text-left font-medium text-gray-600">
                        {col.name.replace(/_/g, ' ')}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map(entry => (
                    <tr key={entry._id} className="hover:bg-gray-50">
                      {step.columns.slice(0, 5).map(col => (
                        <td key={col.name} className="px-3 py-2 text-gray-900">
                          {getDisplayValue(col, entry[col.name])}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              No entries yet. Click &quot;Add {step.name.replace(/s$/, '')}&quot; to create one.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Main Data Entry Content
export default function DataEntryPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    state,
    pipelineConfig,
    stepsByCategory,
    getTotalEntryCount,
    clearAll,
    exportData,
    importData,
    isHydrated,
    recentlyChangedSteps,
    clearRecentlyChangedSteps,
  } = useConfigData();

  const [connections, setConnections] = useState<SalesforceConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchical');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch connections
  useEffect(() => {
    const fetchConnections = async () => {
      const { data } = await supabase
        .from('connections')
        .select('*')
        .eq('status', 'active')
        .order('is_default', { ascending: false });

      if (data) {
        setConnections(data);
        const defaultConn = data.find((c) => c.is_default);
        if (defaultConn) {
          setSelectedConnection(defaultConn.id);
        } else if (data.length > 0) {
          setSelectedConnection(data[0].id);
        }
      }
    };

    fetchConnections();
  }, [supabase]);

  const totalEntries = getTotalEntryCount();

  const handleDeploy = () => {
    if (!selectedConnection) return;
    router.push('/dashboard/deployment');
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      clearAll();
      setStatusMessage({ type: 'success', message: 'All data cleared successfully.' });
    }
  };

  const handleExportJSON = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salesforce-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage({ type: 'success', message: 'Data exported successfully.' });
  };

  const handleImportJSON = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported: ExportData = JSON.parse(text);

      // Validate the imported data
      if (!imported.data || typeof imported.data !== 'object') {
        throw new Error('Invalid file format: missing data property');
      }

      // Import the data
      importData(imported.data);

      // Count imported entries
      let count = 0;
      for (const entries of Object.values(imported.data)) {
        if (Array.isArray(entries)) {
          count += entries.length;
        }
      }

      setStatusMessage({
        type: 'success',
        message: `Successfully imported ${count} entries from ${file.name}`,
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: `Failed to import: ${error instanceof Error ? error.message : 'Invalid JSON file'}`,
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show loading state while hydrating from localStorage
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading saved data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Data Entry</h1>
          <p className="text-gray-600 mt-1">
            Configure Salesforce Revenue Cloud objects with automatic relationship mapping
          </p>
        </div>
        <Badge variant={totalEntries > 0 ? 'success' : 'default'}>
          {totalEntries} total entries
        </Badge>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('hierarchical')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              viewMode === 'hierarchical'
                ? 'border-black text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Hierarchical View
            </div>
          </button>
          <button
            onClick={() => setViewMode('visual')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              viewMode === 'visual'
                ? 'border-black text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Visual Builder
            </div>
          </button>
        </nav>
      </div>

      {statusMessage && (
        <Alert
          variant={statusMessage.type === 'error' ? 'error' : 'success'}
          onClose={() => setStatusMessage(null)}
        >
          {statusMessage.message}
        </Alert>
      )}

      {/* Connection Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                label="Target Salesforce Connection"
                value={selectedConnection}
                onChange={(e) => setSelectedConnection(e.target.value)}
                options={[
                  { value: '', label: 'Select a connection...' },
                  ...connections.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.instance_url})`,
                  })),
                ]}
              />
            </div>
            {connections.length === 0 && (
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/connections')}
              >
                Add Connection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImportJSON}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={totalEntries === 0}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClear} disabled={totalEntries === 0}>
            Clear All
          </Button>
          <Button onClick={handleDeploy} disabled={totalEntries === 0 || !selectedConnection}>
            Proceed to Deployment ({totalEntries})
          </Button>
        </div>
      </div>

      {/* Hierarchical View */}
      {viewMode === 'hierarchical' && (
        <>
          {/* Notification for schema updates */}
          {recentlyChangedSteps.length > 0 && (
            <Alert
              variant="warning"
              onClose={clearRecentlyChangedSteps}
            >
              Pipeline configuration has been updated. The highlighted sections below have schema changes.
            </Alert>
          )}

          {/* Data Entry Sections by Category */}
          {Object.entries(stepsByCategory).map(([category, steps]) => (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {category}
              </h2>
              <div className="space-y-2 ml-4">
                {steps.map(step => (
                  <StepPanel
                    key={step.id}
                    step={step}
                    isHighlighted={recentlyChangedSteps.includes(step.id)}
                    connectionId={selectedConnection}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Summary Card */}
          {totalEntries > 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle>Deployment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {pipelineConfig.steps.map((step) => {
                    const count = (state[step.id] || []).length;
                    return (
                      <div
                        key={step.id}
                        className={`p-3 rounded-lg text-center ${
                          count > 0 ? 'bg-white shadow-sm' : 'bg-gray-50'
                        }`}
                      >
                        <p className="text-xs font-medium text-gray-600 truncate" title={step.name}>
                          {step.name}
                        </p>
                        <p className={`text-xl font-bold ${count > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                          {count}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={handleDeploy} disabled={!selectedConnection} className="px-6">
                    Deploy {totalEntries} Entries to Salesforce
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Visual Builder View */}
      {viewMode === 'visual' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Visual Data Builder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Drag objects from the sidebar to the canvas. Click on objects to edit their properties.
                Use the &quot;Add Linked Entry&quot; button to create related objects with automatic reference linking.
              </p>
              <Suspense fallback={
                <div className="h-[700px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading Visual Builder...</p>
                  </div>
                </div>
              }>
                <VisualDataBuilder
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                  connectionId={selectedConnection}
                />
              </Suspense>
            </CardContent>
          </Card>

          {/* Summary for Visual Builder */}
          {totalEntries > 0 && (
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">
                      Total Objects: <span className="text-purple-600 font-bold">{totalEntries}</span>
                    </span>
                    <span className="text-sm text-gray-500">|</span>
                    <div className="flex items-center gap-2">
                      {pipelineConfig.steps.slice(0, 5).map((step) => {
                        const count = (state[step.id] || []).length;
                        if (count === 0) return null;
                        return (
                          <Badge key={step.id} variant="default">
                            {step.name}: {count}
                          </Badge>
                        );
                      })}
                      {pipelineConfig.steps.filter(s => (state[s.id] || []).length > 0).length > 5 && (
                        <span className="text-xs text-gray-500">+more</span>
                      )}
                    </div>
                  </div>
                  <Button onClick={handleDeploy} disabled={!selectedConnection}>
                    Deploy to Salesforce
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Auto-save indicator */}
      <div className="text-center text-sm text-gray-500">
        Data is automatically saved to your browser. Use Export JSON to back up your work.
      </div>
    </div>
  );
}
