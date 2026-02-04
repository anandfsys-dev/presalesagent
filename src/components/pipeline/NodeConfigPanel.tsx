'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Node } from '@xyflow/react';
import { Button } from '@/components/ui';
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
}

export function NodeConfigPanel({
  node,
  allNodes,
  onUpdate,
  onDelete,
  onClose,
}: NodeConfigPanelProps) {
  const supabase = createClient();
  const [label, setLabel] = useState(node.data.label as string);
  const [apiName, setApiName] = useState(node.data.apiName as string);
  const [worksheetName, setWorksheetName] = useState(node.data.worksheetName as string);
  const [endpoint, setEndpoint] = useState(node.data.endpoint as string || '');
  const [method, setMethod] = useState(node.data.method as string || 'POST');
  const [columns, setColumns] = useState<PipelineStep['columns']>(
    (node.data.columns as PipelineStep['columns']) || []
  );
  const [parentIdMappings, setParentIdMappings] = useState<PipelineStep['parentIdMappings']>(
    (node.data.parentIdMappings as PipelineStep['parentIdMappings']) || []
  );

  // State for external reference Salesforce objects
  const [connections, setConnections] = useState<SalesforceConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [sobjects, setSobjects] = useState<SobjectOption[]>([]);
  const [loadingSobjects, setLoadingSobjects] = useState(false);
  const [sobjectSearch, setSobjectSearch] = useState('');
  const [expandedColumnIndex, setExpandedColumnIndex] = useState<number | null>(null);

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

  // Reset form when node changes
  useEffect(() => {
    setLabel(node.data.label as string);
    setApiName(node.data.apiName as string);
    setWorksheetName(node.data.worksheetName as string);
    setEndpoint(node.data.endpoint as string || '');
    setMethod(node.data.method as string || 'POST');
    setColumns((node.data.columns as PipelineStep['columns']) || []);
    setParentIdMappings((node.data.parentIdMappings as PipelineStep['parentIdMappings']) || []);
  }, [node]);

  // Auto-generate endpoint when apiName changes
  useEffect(() => {
    if (apiName && !endpoint) {
      setEndpoint(`/services/data/v60.0/sobjects/${apiName}/`);
    }
  }, [apiName, endpoint]);

  const handleSave = () => {
    onUpdate(node.id, {
      label,
      apiName,
      worksheetName,
      endpoint: endpoint || `/services/data/v60.0/sobjects/${apiName}/`,
      method,
      columns,
      parentIdMappings,
    });
  };

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'string', required: false }]);
  };

  const updateColumn = (index: number, field: string, value: string | boolean) => {
    setColumns(
      columns.map((col, i) => {
        if (i !== index) return col;

        const updatedCol = { ...col, [field]: value };

        // When type changes to reference, set default referenceType
        if (field === 'type' && value === 'reference' && !updatedCol.referenceType) {
          updatedCol.referenceType = 'internal';
        }

        // Clear reference fields when type changes away from reference
        if (field === 'type' && value !== 'reference') {
          delete updatedCol.referenceType;
          delete updatedCol.referenceTo;
          delete updatedCol.externalSobject;
        }

        // When referenceType changes, clear the opposite fields
        if (field === 'referenceType') {
          if (value === 'internal') {
            delete updatedCol.externalSobject;
          } else if (value === 'external') {
            delete updatedCol.referenceTo;
          }
        }

        return updatedCol;
      })
    );
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
    if (expandedColumnIndex === index) {
      setExpandedColumnIndex(null);
    }
  };

  const toggleColumnExpand = (index: number) => {
    setExpandedColumnIndex(expandedColumnIndex === index ? null : index);
  };

  const addMapping = () => {
    setParentIdMappings([
      ...parentIdMappings,
      { field: '', parentStep: '', parentField: 'Name', parentIdField: 'id' },
    ]);
  };

  const updateMapping = (index: number, field: string, value: string) => {
    setParentIdMappings(
      parentIdMappings.map((mapping, i) =>
        i === index ? { ...mapping, [field]: value } : mapping
      )
    );
  };

  const removeMapping = (index: number) => {
    setParentIdMappings(parentIdMappings.filter((_, i) => i !== index));
  };

  // Get other nodes for parent mapping selection
  const otherNodes = allNodes.filter((n) => n.id !== node.id);

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 z-50 overflow-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Configure Object</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <section>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Salesforce API Name
              </label>
              <input
                type="text"
                value={apiName}
                onChange={(e) => setApiName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                CSV File Name
              </label>
              <input
                type="text"
                value={worksheetName}
                onChange={(e) => setWorksheetName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
          </div>
        </section>

        {/* API Configuration */}
        <section>
          <h4 className="text-sm font-medium text-gray-700 mb-3">API Configuration</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                API Endpoint
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={`/services/data/v60.0/sobjects/${apiName || 'ObjectName'}/`}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black font-mono text-xs"
              />
              <p className="text-xs text-gray-400 mt-1">
                Leave empty to use default: /services/data/v60.0/sobjects/{'{API Name}'}/
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                HTTP Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="POST">POST (Create)</option>
                <option value="PATCH">PATCH (Update)</option>
                <option value="PUT">PUT (Upsert)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Columns */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Columns / Fields</h4>
            <button
              onClick={addColumn}
              className="text-xs text-gray-600 hover:text-black"
            >
              + Add Column
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {columns.map((col, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => updateColumn(index, 'name', e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black"
                    placeholder="Field name"
                  />
                  <select
                    value={col.type}
                    onChange={(e) => updateColumn(index, 'type', e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                    <option value="currency">Currency</option>
                    <option value="picklist">Picklist</option>
                    <option value="reference">Reference</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={col.required}
                      onChange={(e) => updateColumn(index, 'required', e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black"
                    />
                    Req
                  </label>
                  {col.type === 'reference' && (
                    <button
                      onClick={() => toggleColumnExpand(index)}
                      className={`p-1 rounded ${expandedColumnIndex === index ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                      title="Configure reference"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => removeColumn(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Expanded Reference Configuration */}
                {col.type === 'reference' && expandedColumnIndex === index && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Reference Type</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="radio"
                            name={`refType-${index}`}
                            checked={col.referenceType !== 'external'}
                            onChange={() => updateColumn(index, 'referenceType', 'internal')}
                            className="text-black focus:ring-black"
                          />
                          Internal (Pipeline Step)
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="radio"
                            name={`refType-${index}`}
                            checked={col.referenceType === 'external'}
                            onChange={() => updateColumn(index, 'referenceType', 'external')}
                            className="text-black focus:ring-black"
                          />
                          External (Salesforce Record)
                        </label>
                      </div>
                    </div>

                    {col.referenceType !== 'external' ? (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">References Step</label>
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
                        <p className="text-xs text-gray-400 mt-1">
                          Select which pipeline step this field references
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Salesforce Object</label>
                        {connections.length === 0 ? (
                          <p className="text-xs text-amber-600">
                            No Salesforce connections available. Add a connection first.
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
                            <p className="text-xs text-gray-400 mt-1">
                              Users will be able to pick a record from this Salesforce object
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {columns.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">
                No columns defined. Click &quot;+ Add Column&quot; to add.
              </p>
            )}
          </div>
        </section>

        {/* Parent ID Mappings (Dependencies) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">ID Mappings (References)</h4>
            <button
              onClick={addMapping}
              className="text-xs text-gray-600 hover:text-black"
            >
              + Add Mapping
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Define how fields in this object reference IDs from parent objects.
            Adding a mapping will create a dependency arrow automatically.
          </p>
          <div className="space-y-3">
            {parentIdMappings.map((mapping, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">Mapping {index + 1}</span>
                  <button
                    onClick={() => removeMapping(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">This Field</label>
                    <select
                      value={mapping.field}
                      onChange={(e) => updateMapping(index, 'field', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black"
                    >
                      <option value="">Select field...</option>
                      {columns.map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">References Object</label>
                    <select
                      value={mapping.parentStep}
                      onChange={(e) => updateMapping(index, 'parentStep', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black"
                    >
                      <option value="">Select object...</option>
                      {otherNodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.data.label as string}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Match By Field (lookup key)</label>
                  <input
                    type="text"
                    value={mapping.parentField}
                    onChange={(e) => updateMapping(index, 'parentField', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-black"
                    placeholder="e.g., Name or Code"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Field used to look up the parent record (usually Name or Code)
                  </p>
                </div>
              </div>
            ))}
            {parentIdMappings.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">
                No ID mappings defined. Add mappings to define how this object references parent objects.
              </p>
            )}
          </div>
        </section>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-200 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to delete this object?')) {
                onDelete(node.id);
              }
            }}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Delete
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
      </div>
    </div>
  );
}
