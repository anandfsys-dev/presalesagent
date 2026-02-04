'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Handle,
  Position,
  Panel,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useConfigData, DataEntry } from '@/contexts/ConfigDataContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Badge } from '@/components/ui';
import { SalesforceRecordPicker } from './SalesforceRecordPicker';
import type { PipelineStep, ColumnDefinition } from '@/types';

// Custom node data type
interface EntryNodeData {
  entry: DataEntry;
  step: PipelineStep;
  onEdit: (entry: DataEntry, step: PipelineStep) => void;
  onDelete: (entryId: string, stepId: string) => void;
  onAddChild: (parentEntry: DataEntry, parentStep: PipelineStep, childStepId: string, refField: string) => void;
  getDisplayValue: (col: ColumnDefinition, value: unknown) => string;
  childSteps: { stepId: string; stepName: string; refField: string }[];
}

// Get color for each step type
function getStepColor(stepId: string): { bg: string; border: string; badge: string } {
  const colors: Record<string, { bg: string; border: string; badge: string }> = {
    picklists: { bg: 'bg-purple-50', border: 'border-purple-300', badge: 'bg-purple-100 text-purple-700' },
    picklist_values: { bg: 'bg-purple-100', border: 'border-purple-400', badge: 'bg-purple-200 text-purple-800' },
    attributes: { bg: 'bg-blue-50', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-700' },
    classifications: { bg: 'bg-green-50', border: 'border-green-300', badge: 'bg-green-100 text-green-700' },
    classification_attributes: { bg: 'bg-green-100', border: 'border-green-400', badge: 'bg-green-200 text-green-800' },
    catalogs: { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-100 text-yellow-700' },
    categories: { bg: 'bg-yellow-100', border: 'border-yellow-400', badge: 'bg-yellow-200 text-yellow-800' },
    products: { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-700' },
    category_products: { bg: 'bg-orange-50', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-700' },
    selling_model_options: { bg: 'bg-indigo-50', border: 'border-indigo-300', badge: 'bg-indigo-100 text-indigo-700' },
    pricebook_entries: { bg: 'bg-pink-50', border: 'border-pink-300', badge: 'bg-pink-100 text-pink-700' },
  };
  return colors[stepId] || { bg: 'bg-gray-50', border: 'border-gray-300', badge: 'bg-gray-100 text-gray-700' };
}

// Custom Entry Node Component
function EntryNode({ data, selected }: { data: EntryNodeData; selected: boolean }) {
  const { entry, step, onEdit, onDelete, onAddChild, getDisplayValue, childSteps } = data;
  const colors = getStepColor(step.id);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as globalThis.Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get display name for the entry
  const displayName = (entry.Name as string) || (entry.Code as string) || (entry.Label as string) || entry._id;

  // Get key fields to display (first 3 non-internal fields)
  const displayFields = step.columns
    .filter(col => !col.name.endsWith('Id') || col.type !== 'reference')
    .slice(0, 3);

  return (
    <div
      className={`relative ${colors.bg} ${colors.border} border-2 rounded-lg shadow-md min-w-[220px] max-w-[280px] ${
        selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
    >
      {/* Input handle (top) - for receiving references */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />

      {/* Header */}
      <div className={`px-3 py-2 border-b ${colors.border} flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${colors.badge}`}>
            {step.apiName}
          </span>
          <span className="font-medium text-sm text-gray-900 truncate" title={displayName}>
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(entry, step)}
            className="p-1 hover:bg-white/50 rounded text-gray-600 hover:text-blue-600"
            title="Edit"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(entry._id, step.id)}
            className="p-1 hover:bg-white/50 rounded text-gray-600 hover:text-red-600"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="px-3 py-2 space-y-1">
        {displayFields.map(col => {
          const value = entry[col.name];
          if (value === undefined || value === null || value === '') return null;
          return (
            <div key={col.name} className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 flex-shrink-0">{col.name}:</span>
              <span className="text-gray-800 truncate" title={String(value)}>
                {getDisplayValue(col, value)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Add child button */}
      {childSteps.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 relative" ref={menuRef}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full flex items-center justify-center gap-1 text-xs text-gray-600 hover:text-blue-600 py-1 hover:bg-white/50 rounded"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Linked Entry
          </button>

          {/* Dropdown menu */}
          {showAddMenu && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              {childSteps.map(child => (
                <button
                  key={`${child.stepId}-${child.refField}`}
                  onClick={() => {
                    onAddChild(entry, step, child.stepId, child.refField);
                    setShowAddMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-gray-600">+ {child.stepName}</span>
                  <span className="text-gray-400">({child.refField})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Output handle (bottom) - for sending references */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
    </div>
  );
}

// Node types for React Flow
const nodeTypes: NodeTypes = {
  entryNode: EntryNode,
};

// Edit Panel Component
function EditPanel({
  entry,
  step,
  onSave,
  onClose,
  connectionId,
}: {
  entry: DataEntry | null;
  step: PipelineStep | null;
  onSave: (stepId: string, entryId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  connectionId?: string;
}) {
  const { getReferenceOptions } = useConfigData();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [pickerColumn, setPickerColumn] = useState<ColumnDefinition | null>(null);
  const [externalRefNames, setExternalRefNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (entry) {
      setFormData({ ...entry });
    }
  }, [entry]);

  if (!entry || !step) return null;

  const handleChange = (name: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(step.id, entry._id, formData);
    onClose();
  };

  const handleExternalRefSelect = (colName: string, record: { id: string; name: string }) => {
    handleChange(colName, record.id);
    setExternalRefNames(prev => ({ ...prev, [colName]: record.name }));
    setPickerColumn(null);
  };

  const renderField = (col: ColumnDefinition) => {
    const value = formData[col.name];

    switch (col.type) {
      case 'reference': {
        // Check if this is an external reference
        if (col.referenceType === 'external' && col.externalSobject) {
          return (
            <div key={col.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {col.name.replace(/_/g, ' ')} {col.required && <span className="text-red-500">*</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={externalRefNames[col.name] || (value as string) || ''}
                  onChange={(e) => {
                    handleChange(col.name, e.target.value);
                    if (externalRefNames[col.name]) {
                      setExternalRefNames(prev => {
                        const newNames = { ...prev };
                        delete newNames[col.name];
                        return newNames;
                      });
                    }
                  }}
                  placeholder={`Enter ${col.externalSobject} ID`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setPickerColumn(col)}
                  disabled={!connectionId}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title={!connectionId ? 'No connection selected' : `Select from ${col.externalSobject}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Get
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                From: {col.externalSobject}
              </p>
            </div>
          );
        }

        // Internal reference
        const options = getReferenceOptions(step.id, col);
        return (
          <div key={col.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {col.name.replace(/_/g, ' ')} {col.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={(value as string) || ''}
              onChange={(e) => handleChange(col.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={col.required}
            >
              <option value="">Select {col.name.replace(/_/g, ' ')}...</option>
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );
      }

      case 'picklist':
        return (
          <div key={col.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {col.name.replace(/_/g, ' ')} {col.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={(value as string) || String(col.defaultValue || '')}
              onChange={(e) => handleChange(col.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={col.required}
            >
              <option value="">Select {col.name.replace(/_/g, ' ')}...</option>
              {(col.picklistValues || []).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        );

      case 'boolean':
        return (
          <div key={col.name} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`edit-${col.name}`}
              checked={Boolean(value)}
              onChange={(e) => handleChange(col.name, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={`edit-${col.name}`} className="text-sm font-medium text-gray-700">
              {col.name.replace(/_/g, ' ')}
            </label>
          </div>
        );

      case 'number':
      case 'currency':
        return (
          <div key={col.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {col.name.replace(/_/g, ' ')} {col.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              value={(value as number) ?? ''}
              onChange={(e) => handleChange(col.name, e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={col.required}
              step={col.type === 'currency' ? '0.01' : '1'}
            />
          </div>
        );

      default:
        return (
          <div key={col.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {col.name.replace(/_/g, ' ')} {col.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={(value as string) || ''}
              onChange={(e) => handleChange(col.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={col.required}
            />
          </div>
        );
    }
  };

  return (
    <>
      <div className="absolute right-4 top-4 bottom-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Edit {step.name.replace(/s$/, '')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {step.columns.map(renderField)}
        </form>
        <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} className="flex-1">
            Save
          </Button>
        </div>
      </div>

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

// Sidebar Component for dragging new entries
function Sidebar({ onDragStart, isFullscreen }: { onDragStart: (event: React.DragEvent, step: PipelineStep) => void; isFullscreen?: boolean }) {
  const { pipelineConfig, stepsByCategory, getEntryCountByStep } = useConfigData();

  return (
    <div className={`absolute left-4 ${isFullscreen ? 'top-20' : 'top-16'} bottom-4 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-40 flex flex-col`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 text-sm">Object Types</h3>
        <p className="text-xs text-gray-500 mt-1">Drag to add to canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(stepsByCategory).map(([category, steps]) => (
          <div key={category} className="mb-3">
            <h4 className="text-xs font-medium text-gray-500 px-2 mb-1">{category}</h4>
            {steps.map(step => {
              const count = getEntryCountByStep(step.id);
              const colors = getStepColor(step.id);
              return (
                <div
                  key={step.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, step)}
                  className={`px-3 py-2 rounded-md cursor-grab active:cursor-grabbing mb-1 ${colors.bg} ${colors.border} border hover:shadow-md transition-shadow flex items-center justify-between`}
                >
                  <span className="text-xs font-medium text-gray-800">{step.name}</span>
                  {count > 0 && (
                    <Badge variant="default">{count}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Visual Data Builder Component
interface VisualDataBuilderInnerProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  connectionId?: string;
}

function VisualDataBuilderInner({ isFullscreen, onToggleFullscreen, connectionId }: VisualDataBuilderInnerProps) {
  const {
    state,
    pipelineConfig,
    addEntry,
    updateEntry,
    deleteEntry,
    getReferenceOptions,
  } = useConfigData();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [editingEntry, setEditingEntry] = useState<{ entry: DataEntry; step: PipelineStep } | null>(null);

  // Find which steps can reference a given step
  const getChildSteps = useCallback((stepId: string): { stepId: string; stepName: string; refField: string }[] => {
    const children: { stepId: string; stepName: string; refField: string }[] = [];

    for (const step of pipelineConfig.steps) {
      // Check parentIdMappings
      if (step.parentIdMappings) {
        for (const mapping of step.parentIdMappings) {
          if (mapping.parentStep === stepId) {
            children.push({
              stepId: step.id,
              stepName: step.name,
              refField: mapping.field,
            });
          }
        }
      }

      // Check column referenceTo
      for (const col of step.columns) {
        if (col.type === 'reference' && col.referenceTo === stepId) {
          // Avoid duplicates from parentIdMappings
          if (!children.some(c => c.stepId === step.id && c.refField === col.name)) {
            children.push({
              stepId: step.id,
              stepName: step.name,
              refField: col.name,
            });
          }
        }
      }
    }

    return children;
  }, [pipelineConfig]);

  // Get display value for reference fields
  const getDisplayValue = useCallback((col: ColumnDefinition, value: unknown): string => {
    if (!value) return '-';

    if (col.type === 'reference') {
      // Find the referenced entry
      for (const [, entries] of Object.entries(state)) {
        const entry = entries.find(e => e._id === value);
        if (entry) {
          return (entry.Name as string) || (entry.Code as string) || (entry.Label as string) || String(value);
        }
      }
    }

    if (col.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (col.type === 'currency') {
      return `$${Number(value).toFixed(2)}`;
    }

    return String(value);
  }, [state]);

  // Handle edit
  const handleEdit = useCallback((entry: DataEntry, step: PipelineStep) => {
    setEditingEntry({ entry, step });
  }, []);

  // Handle delete
  const handleDelete = useCallback((entryId: string, stepId: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      deleteEntry(stepId, entryId);
    }
  }, [deleteEntry]);

  // Handle add child entry
  const handleAddChild = useCallback((parentEntry: DataEntry, parentStep: PipelineStep, childStepId: string, refField: string) => {
    const childStep = pipelineConfig.steps.find(s => s.id === childStepId);
    if (!childStep) return;

    // Create initial data with reference to parent
    const initialData: Record<string, unknown> = {};

    // Set default values
    for (const col of childStep.columns) {
      if (col.defaultValue !== undefined) {
        initialData[col.name] = col.defaultValue;
      }
    }

    // Set the reference field to point to parent
    initialData[refField] = parentEntry._id;

    // Add the entry
    const newId = addEntry(childStepId, initialData);

    // Find the new entry and open edit panel
    setTimeout(() => {
      const newEntry = state[childStepId]?.find(e => e._id === newId);
      if (newEntry) {
        setEditingEntry({ entry: newEntry, step: childStep });
      }
    }, 100);
  }, [pipelineConfig, addEntry, state]);

  // Handle save from edit panel
  const handleSave = useCallback((stepId: string, entryId: string, data: Record<string, unknown>) => {
    updateEntry(stepId, entryId, data);
  }, [updateEntry]);

  // Convert state to nodes and edges
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodePositions: Record<string, { x: number; y: number }> = {};

    // Calculate positions based on step order and entry index
    let yOffset = 50;

    for (const step of pipelineConfig.steps) {
      const entries = state[step.id] || [];
      const childSteps = getChildSteps(step.id);

      let xOffset = 50;
      const stepYBase = yOffset;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const nodeId = entry._id;

        // Check if node already has a position
        const existingNode = nodes.find(n => n.id === nodeId);
        const position = existingNode?.position || { x: xOffset, y: stepYBase };

        nodePositions[nodeId] = position;

        newNodes.push({
          id: nodeId,
          type: 'entryNode',
          position,
          data: {
            entry,
            step,
            onEdit: handleEdit,
            onDelete: handleDelete,
            onAddChild: handleAddChild,
            getDisplayValue,
            childSteps,
          },
        });

        xOffset += 300;
      }

      if (entries.length > 0) {
        yOffset += 200;
      }
    }

    // Create edges for references
    for (const step of pipelineConfig.steps) {
      const entries = state[step.id] || [];

      for (const entry of entries) {
        // Check all reference columns
        for (const col of step.columns) {
          if (col.type === 'reference') {
            const refValue = entry[col.name] as string;
            if (refValue && refValue.startsWith('entry_')) {
              // Find which step this reference belongs to
              let sourceStepId: string | undefined;
              for (const [stepId, stepEntries] of Object.entries(state)) {
                if (stepEntries.some(e => e._id === refValue)) {
                  sourceStepId = stepId;
                  break;
                }
              }

              if (sourceStepId) {
                const edgeId = `${refValue}-${entry._id}-${col.name}`;
                newEdges.push({
                  id: edgeId,
                  source: refValue,
                  target: entry._id,
                  label: col.name,
                  labelStyle: { fontSize: 10, fill: '#6b7280' },
                  labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
                  labelBgPadding: [4, 2] as [number, number],
                  style: { stroke: '#94a3b8', strokeWidth: 2 },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#94a3b8',
                  },
                  animated: false,
                });
              }
            }
          }
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [state, pipelineConfig, getChildSteps, handleEdit, handleDelete, handleAddChild, getDisplayValue]);

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const stepData = event.dataTransfer.getData('application/json');
    if (!stepData) return;

    const step: PipelineStep = JSON.parse(stepData);

    // Get the position where the node was dropped
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Create initial entry with default values
    const initialData: Record<string, unknown> = {};
    for (const col of step.columns) {
      if (col.defaultValue !== undefined) {
        initialData[col.name] = col.defaultValue;
      }
    }

    // Add the entry
    const newId = addEntry(step.id, initialData);

    // Open edit panel for new entry
    setTimeout(() => {
      const newEntry = state[step.id]?.find(e => e._id === newId);
      if (newEntry) {
        setEditingEntry({ entry: newEntry, step });

        // Update the node position to where it was dropped
        setNodes(nds => nds.map(n =>
          n.id === newId ? { ...n, position } : n
        ));
      }
    }, 100);
  }, [screenToFlowPosition, addEntry, state, setNodes]);

  // Handle drag start from sidebar
  const onDragStart = useCallback((event: React.DragEvent, step: PipelineStep) => {
    event.dataTransfer.setData('application/json', JSON.stringify(step));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // Handle node drag stop to update positions
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    // Node positions are automatically maintained by react-flow
  }, []);

  return (
    <div
      className={`w-full bg-gray-50 rounded-lg border border-gray-200 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-white' : 'relative h-[700px]'
      }`}
      ref={reactFlowWrapper}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />

        {/* Legend Panel */}
        <Panel position="top-right" className="bg-white/90 rounded-lg p-3 shadow-sm border border-gray-200 m-4">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">Legend</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Source (can link from)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span>Target (can link to)</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Fullscreen Toggle - positioned above sidebar */}
      {onToggleFullscreen && (
        <div className="absolute top-4 left-4 z-50">
          <Button
            onClick={onToggleFullscreen}
            variant="outline"
            size="sm"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="bg-white shadow-md"
          >
            {isFullscreen ? (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Exit Fullscreen
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Fullscreen
              </>
            )}
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar onDragStart={onDragStart} isFullscreen={isFullscreen} />

      {/* Edit Panel */}
      {editingEntry && (
        <EditPanel
          entry={editingEntry.entry}
          step={editingEntry.step}
          onSave={handleSave}
          onClose={() => setEditingEntry(null)}
          connectionId={connectionId}
        />
      )}
    </div>
  );
}

// Wrapper with ReactFlowProvider
interface VisualDataBuilderProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  connectionId?: string;
}

export default function VisualDataBuilder({ isFullscreen, onToggleFullscreen, connectionId }: VisualDataBuilderProps) {
  return (
    <ReactFlowProvider>
      <VisualDataBuilderInner isFullscreen={isFullscreen} onToggleFullscreen={onToggleFullscreen} connectionId={connectionId} />
    </ReactFlowProvider>
  );
}
