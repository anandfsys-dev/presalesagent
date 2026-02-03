'use client';

import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { Button } from '@/components/ui';
import type { PipelineStep } from '@/types';

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
      columns.map((col, i) =>
        i === index ? { ...col, [field]: value } : col
      )
    );
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
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
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {columns.map((col, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
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
                <button
                  onClick={() => removeColumn(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
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
                      {columns
                        .filter((col) => col.type === 'reference' || col.name.toLowerCase().includes('id'))
                        .map((col) => (
                          <option key={col.name} value={col.name}>
                            {col.name}
                          </option>
                        ))}
                      {columns.map((col) => (
                        <option key={`all-${col.name}`} value={col.name}>
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
