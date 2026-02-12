'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Node } from '@xyflow/react';
import {
  Button,
  useConfirmDialog,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
} from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import type { PipelineStep, SalesforceConnection, ColumnDefinition } from '@/types';

interface SobjectOption {
  name: string;
  label: string;
  custom: boolean;
}

interface NodeConfigPanelProps {
  node: Node;
  allNodes: Node[];
  onUpdate: (nodeId: string, data: Partial<Node['data']>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
  apiVersion?: string;
}

export function NodeConfigPanel({
  node,
  allNodes,
  onUpdate,
  onDelete,
  onClose,
  apiVersion = '65.0',
}: NodeConfigPanelProps) {
  const supabase = createClient();
  const { confirm } = useConfirmDialog();
  const [label, setLabel] = useState(node.data.label as string);
  const [apiName, setApiName] = useState(node.data.apiName as string);
  const [category, setCategory] = useState(node.data.category as string || '');
  const [customCategoryMode, setCustomCategoryMode] = useState(false);
  const [customCategoryDraft, setCustomCategoryDraft] = useState('');
  const [endpoint, setEndpoint] = useState(node.data.endpoint as string || '');
  const [method, setMethod] = useState(node.data.method as string || 'POST');
  const [columns, setColumns] = useState<PipelineStep['columns']>(
    (node.data.columns as PipelineStep['columns']) || []
  );
  const [requiresInactivationBeforeDelete, setRequiresInactivationBeforeDelete] = useState(
    (node.data.requiresInactivationBeforeDelete as boolean) || false
  );

  // State for external reference Salesforce objects
  const [connections, setConnections] = useState<SalesforceConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [sobjects, setSobjects] = useState<SobjectOption[]>([]);
  const [loadingSobjects, setLoadingSobjects] = useState(false);
  const [sobjectSearch, setSobjectSearch] = useState('');

  // Fetch connections on mount
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

  // Fetch Salesforce objects when connection changes
  const fetchSobjects = useCallback(async () => {
    if (!selectedConnection) return;

    setLoadingSobjects(true);
    try {
      const response = await fetch(`/api/salesforce/sobjects?connectionId=${selectedConnection}`);
      const data = await response.json();
      if (data.success) {
        setSobjects(data.sobjects);
      }
    } catch (error) {
      console.error('Failed to fetch SObjects:', error);
    } finally {
      setLoadingSobjects(false);
    }
  }, [selectedConnection]);

  useEffect(() => {
    if (selectedConnection) {
      fetchSobjects();
    }
  }, [selectedConnection, fetchSobjects]);

  // Filter sobjects based on search
  const filteredSobjects = sobjects.filter(
    (obj) =>
      obj.label.toLowerCase().includes(sobjectSearch.toLowerCase()) ||
      obj.name.toLowerCase().includes(sobjectSearch.toLowerCase())
  );

  // Derive existing categories from all nodes
  const existingCategories = useMemo(() => {
    const cats = allNodes
      .map(n => n.data.category as string)
      .filter(c => c && c.trim() !== '');
    return [...new Set(cats)].sort();
  }, [allNodes]);

  // Reset form when node changes
  useEffect(() => {
    setLabel(node.data.label as string);
    setApiName(node.data.apiName as string);
    setCategory(node.data.category as string || '');
    setEndpoint(node.data.endpoint as string || '');
    setMethod(node.data.method as string || 'POST');
    setColumns((node.data.columns as PipelineStep['columns']) || []);
    setRequiresInactivationBeforeDelete((node.data.requiresInactivationBeforeDelete as boolean) || false);
    setCustomCategoryMode(false);
    setCustomCategoryDraft('');
  }, [node]);

  // Auto-generate endpoint when apiName changes
  useEffect(() => {
    if (apiName && !endpoint) {
      setEndpoint(`/services/data/v${apiVersion}/sobjects/${apiName}/`);
    }
  }, [apiName, endpoint, apiVersion]);

  const handleSave = () => {
    const generatedMappings = columns
      .filter(col => col.type === 'reference' && col.referenceTo)
      .map(col => ({
        field: col.name,
        parentStep: col.referenceTo!,
        parentField: 'Name',
        parentIdField: 'id',
      }));

    onUpdate(node.id, {
      label,
      apiName,
      worksheetName: label,
      category,
      endpoint: endpoint || `/services/data/v${apiVersion}/sobjects/${apiName}/`,
      method,
      columns,
      parentIdMappings: generatedMappings,
      requiresInactivationBeforeDelete: method === 'POST' ? requiresInactivationBeforeDelete : false,
    });
  };

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'string', required: false }]);
  };

  const updateColumn = (index: number, field: string, value: string | boolean | undefined) => {
    setColumns(
      columns.map((col, i) => {
        if (i !== index) return col;

        const updatedCol = { ...col, [field]: value };

        if (field === 'type') {
          if (value !== 'reference') {
            delete updatedCol.referenceTo;
          }
          if (value !== 'salesforce_id') {
            delete updatedCol.externalSobject;
            delete updatedCol.multiSelect;
            delete updatedCol.filterByStep;
            delete updatedCol.filterByColumn;
          }
        }

        return updatedCol;
      })
    );
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const otherNodes = allNodes.filter((n) => n.id !== node.id);

  // Category select options
  const categoryOptions = [
    { value: '', label: '-- None (Custom Objects) --' },
    ...existingCategories.map(cat => ({ value: cat, label: cat })),
    { value: '__new__', label: '-- Add new category --' },
  ];

  const methodOptions = [
    { value: 'POST', label: 'POST' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'PUT', label: 'PUT' },
  ];

  const columnTypeOptions = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
    { value: 'currency', label: 'Currency' },
    { value: 'picklist', label: 'Picklist' },
    { value: 'reference', label: 'Reference' },
    { value: 'salesforce_id', label: 'Salesforce ID' },
  ];

  // Max chips to show before "+N more"
  const MAX_CHIPS = 8;

  const handleCustomCategorySave = () => {
    if (customCategoryDraft.trim()) {
      setCategory(customCategoryDraft.trim());
    }
    setCustomCategoryMode(false);
    setCustomCategoryDraft('');
  };

  const handleCustomCategoryUndo = () => {
    setCustomCategoryMode(false);
    setCustomCategoryDraft('');
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[50vw] bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Configure Object</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 px-4 pt-3">
          <TabsList>
            <TabsTrigger value="general">General Configuration</TabsTrigger>
            <TabsTrigger value="columns">Columns / Fields</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: General Configuration */}
        <TabsContent value="general" className="flex-1 overflow-auto p-4 space-y-4">
          {/* Card 1: Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Display Name"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <div className="flex gap-4">
                <div className="flex-[3]">
                  <Input
                    label="Salesforce API Name"
                    value={apiName}
                    onChange={(e) => setApiName(e.target.value)}
                  />
                </div>
                <div className="flex-[2]">
                  {customCategoryMode ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customCategoryDraft}
                          onChange={(e) => setCustomCategoryDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCustomCategorySave();
                            }
                          }}
                          placeholder="New category name..."
                          autoFocus
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                        />
                        <button
                          onClick={handleCustomCategoryUndo}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                          title="Undo"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
                          </svg>
                        </button>
                        <button
                          onClick={handleCustomCategorySave}
                          className="px-2 py-1 text-xs text-white bg-black rounded-lg hover:bg-gray-800"
                          title="Save category"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Select
                      label="Category"
                      value={category}
                      options={categoryOptions}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setCustomCategoryMode(true);
                          setCustomCategoryDraft('');
                        } else {
                          setCategory(e.target.value);
                        }
                      }}
                    />
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Groups this object in the sidebar and data summary views.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: API Configuration */}
          <Card>
            <CardHeader
              action={
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="px-3 py-1 text-xs font-medium border border-gray-200 rounded-full bg-gray-50 focus:ring-2 focus:ring-black focus:border-black cursor-pointer"
                >
                  {methodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              }
            >
              <CardTitle>API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="API Endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={`/services/data/v${apiVersion}/sobjects/${apiName || 'ObjectName'}/`}
                className="font-mono text-xs"
                helperText={`Leave empty to use default: /services/data/v${apiVersion}/sobjects/{API Name}/`}
              />
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Inject Parameters to Endpoint
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Use {'{FieldName}'} placeholders to inject field values into the endpoint. Click a field to insert.
                </p>
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 min-h-[40px]">
                  {columns.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      Add fields first to use them in the URL.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {columns.slice(0, MAX_CHIPS).map((col) => {
                        const placeholderKey = col.sfField || col.name;
                        if (!placeholderKey) return null;
                        const token = `{${placeholderKey}}`;
                        return (
                          <button
                            key={placeholderKey}
                            type="button"
                            onClick={() =>
                              setEndpoint((prev) => `${prev || ''}${token}`)
                            }
                            className="px-2 py-1 rounded-full border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100"
                            title={`Insert ${token} into endpoint`}
                          >
                            {col.name || placeholderKey}
                          </button>
                        );
                      })}
                      {columns.length > MAX_CHIPS && (
                        <span className="px-2 py-1 text-xs text-gray-400">
                          +{columns.length - MAX_CHIPS} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Rollback Settings — only visible for POST steps */}
          {method === 'POST' && (
            <Card>
              <CardHeader>
                <CardTitle>Rollback Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={requiresInactivationBeforeDelete}
                    onClick={() => setRequiresInactivationBeforeDelete(!requiresInactivationBeforeDelete)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      requiresInactivationBeforeDelete ? 'bg-black' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        requiresInactivationBeforeDelete ? 'translate-x-[18px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    Inactivate before delete
                  </span>
                </label>
                <p className="text-xs text-gray-400 mt-2 ml-12">
                  When enabled, rollback will set Status to &quot;Inactive&quot; before deleting records of this object. Required for Salesforce objects that cannot be deleted while Active.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Columns / Fields */}
        <TabsContent value="columns" className="flex-1 overflow-auto p-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-700">
              Managed Fields: <strong>{columns.length}</strong>
            </span>
            <Button size="sm" variant="outline" onClick={addColumn}>
              + Add New Field
            </Button>
          </div>

          {columns.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              No columns defined. Click &quot;+ Add New Field&quot; to add.
            </p>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,0.8fr)] gap-4 px-3 pb-2 border-b border-gray-200 mb-2">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Field Definition</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Settings</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Mapping</span>
              </div>

              {/* Column rows */}
              <div className="space-y-2">
                {columns.map((col, index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,0.8fr)] gap-4 p-3 bg-gray-50 rounded-lg items-start">
                    {/* FIELD DEFINITION */}
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => updateColumn(index, 'name', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                        placeholder="Field name"
                      />
                      <div>
                        <select
                          value={col.type}
                          onChange={(e) => updateColumn(index, 'type', e.target.value)}
                          className={`px-2 py-1 text-xs border rounded-full focus:ring-1 focus:ring-black ${
                            col.type === 'reference'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : col.type === 'salesforce_id'
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {columnTypeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Salesforce Object picker (salesforce_id) — below type */}
                      {col.type === 'salesforce_id' && (
                        <div className="pt-2 border-t border-gray-200">
                          <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                            Salesforce Object {!col.externalSobject && <span className="text-red-400">*</span>}
                          </label>
                          {connections.length === 0 ? (
                            <p className="text-xs text-amber-600">
                              No Salesforce connections available.
                            </p>
                          ) : (
                            <>
                              {connections.length > 1 && (
                                <select
                                  value={selectedConnection}
                                  onChange={(e) => setSelectedConnection(e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black mb-2"
                                >
                                  {connections.map((conn) => (
                                    <option key={conn.id} value={conn.id}>
                                      {conn.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <div className="relative">
                                <input
                                  type="text"
                                  value={col.externalSobject || sobjectSearch}
                                  onChange={(e) => {
                                    setSobjectSearch(e.target.value);
                                    if (col.externalSobject) {
                                      updateColumn(index, 'externalSobject', '');
                                    }
                                  }}
                                  onFocus={() => setSobjectSearch('')}
                                  placeholder={loadingSobjects ? 'Loading objects...' : 'Search Salesforce objects...'}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black"
                                  disabled={loadingSobjects}
                                />
                                {sobjectSearch && !col.externalSobject && filteredSobjects.length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                    {filteredSobjects.slice(0, 20).map((obj) => (
                                      <button
                                        key={obj.name}
                                        onClick={() => {
                                          updateColumn(index, 'externalSobject', obj.name);
                                          setSobjectSearch('');
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center justify-between"
                                      >
                                        <span>{obj.label}</span>
                                        <span className="text-gray-400">{obj.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {col.externalSobject && (
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-xs text-green-600">Selected: {col.externalSobject}</span>
                                  <button
                                    onClick={() => updateColumn(index, 'externalSobject', '')}
                                    className="text-xs text-red-500 hover:text-red-700"
                                  >
                                    Clear
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {/* Cross-step filter config */}
                          <div className="pt-2 mt-2 border-t border-gray-200">
                            <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                              Filter by Another Step
                            </label>
                            <select
                              value={col.filterByStep || ''}
                              onChange={(e) => {
                                const stepId = e.target.value || undefined;
                                updateColumn(index, 'filterByStep', stepId);
                                if (!stepId) {
                                  updateColumn(index, 'filterByColumn', undefined);
                                }
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black mb-1"
                            >
                              <option value="">No filter</option>
                              {otherNodes.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.data.label as string}
                                </option>
                              ))}
                            </select>
                            {col.filterByStep && (() => {
                              const sourceNode = otherNodes.find(n => n.id === col.filterByStep);
                              const sourceCols = ((sourceNode?.data?.columns as ColumnDefinition[]) || [])
                                .filter(c => c.type === 'salesforce_id');
                              return (
                                <>
                                  <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider mt-1">
                                    Source Column
                                  </label>
                                  <select
                                    value={col.filterByColumn || ''}
                                    onChange={(e) => updateColumn(index, 'filterByColumn', e.target.value || undefined)}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black"
                                  >
                                    <option value="">Select column...</option>
                                    {sourceCols.map(sc => (
                                      <option key={sc.name} value={sc.name}>{sc.name}</option>
                                    ))}
                                  </select>
                                  {col.filterByColumn && (
                                    <p className="text-[10px] text-green-600 mt-1">
                                      Will filter to IDs from: {sourceNode?.data?.label as string} → {col.filterByColumn}
                                    </p>
                                  )}
                                  {sourceCols.length === 0 && (
                                    <p className="text-[10px] text-amber-500 mt-1">
                                      No salesforce_id columns found in this step.
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Reference step picker (reference) — below type */}
                      {col.type === 'reference' && (
                        <div className="pt-2 border-t border-gray-200">
                          <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                            References Step {!col.referenceTo && <span className="text-red-400">*</span>}
                          </label>
                          <select
                            value={col.referenceTo || ''}
                            onChange={(e) => updateColumn(index, 'referenceTo', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black"
                          >
                            <option value="">Select step...</option>
                            {otherNodes.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.data.label as string}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* SETTINGS */}
                    <div className="flex items-center gap-2 justify-center flex-wrap pt-1">
                      {/* Required */}
                      <button
                        type="button"
                        onClick={() => updateColumn(index, 'required', !col.required)}
                        className={`p-1.5 rounded-md transition-colors ${col.required ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                        title="Required"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l2.09 6.26L20.18 9l-5.09 3.74L16.18 19 12 15.27 7.82 19l1.09-6.26L3.82 9l6.09-.74z"/>
                        </svg>
                      </button>
                      {/* Autogenerate */}
                      <button
                        type="button"
                        onClick={() => updateColumn(index, 'autogenerate', !col.autogenerate)}
                        className={`p-1.5 rounded-md transition-colors ${col.autogenerate ? 'text-blue-500 bg-blue-50' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                        title="Autogenerate"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                        </svg>
                      </button>
                      {/* Key */}
                      <button
                        type="button"
                        onClick={() => updateColumn(index, 'isKey', !col.isKey)}
                        className={`p-1.5 rounded-md transition-colors ${col.isKey ? 'text-amber-500 bg-amber-50' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                        title="Unique key"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                      </button>
                      {/* Ignore from payload */}
                      <button
                        type="button"
                        onClick={() => updateColumn(index, 'ignoreFromPayload', !col.ignoreFromPayload)}
                        className={`p-1.5 rounded-md transition-colors ${col.ignoreFromPayload ? 'text-purple-500 bg-purple-50' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                        title="Ignore from payload"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                      </button>
                      {/* Hide in form */}
                      <button
                        type="button"
                        onClick={() => updateColumn(index, 'hideInEntryForm', !col.hideInEntryForm)}
                        className={`p-1.5 rounded-md transition-colors ${col.hideInEntryForm ? 'text-purple-500 bg-purple-50' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                        title="Hide in form"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      </button>
                      {/* Multi-select (only for reference/salesforce_id) */}
                      {(col.type === 'reference' || col.type === 'salesforce_id') && (
                        <button
                          type="button"
                          onClick={() => updateColumn(index, 'multiSelect', !col.multiSelect)}
                          className={`p-1.5 rounded-md transition-colors ${col.multiSelect ? 'text-blue-500 bg-blue-50' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                          title="Multi-select lookup"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25h2.25A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* MAPPING + DELETE */}
                    <div className="space-y-2">
                      {/* MAP (sameAs) */}
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider w-8 shrink-0">Map</label>
                        <select
                          value={col.sameAs || ''}
                          onChange={(e) => updateColumn(index, 'sameAs', e.target.value || undefined)}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black"
                        >
                          <option value="">None</option>
                          {columns
                            .filter((_, ci) => ci !== index)
                            .map(otherCol => (
                              <option key={otherCol.name} value={otherCol.name}>{otherCol.name}</option>
                            ))}
                        </select>
                      </div>

                      {/* DEF (defaultValue) */}
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider w-8 shrink-0">Def</label>
                        <input
                          type="text"
                          value={col.defaultValue !== undefined ? String(col.defaultValue) : ''}
                          onChange={(e) => updateColumn(index, 'defaultValue', e.target.value || undefined)}
                          placeholder="Default value"
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black"
                        />
                        {/* Delete button */}
                        <button
                          onClick={() => removeColumn(index)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                          title="Delete field"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Footer — always visible */}
        <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Delete Object',
                message: 'Are you sure you want to delete this object? This will remove it from the pipeline configuration.',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                variant: 'danger',
              });
              if (confirmed) {
                onDelete(node.id);
              }
            }}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Delete Config
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
