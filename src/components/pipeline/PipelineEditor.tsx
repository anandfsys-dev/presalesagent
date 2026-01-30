'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ObjectNode } from './ObjectNode';
import { NodeConfigPanel } from './NodeConfigPanel';
import { Button } from '@/components/ui';
import type { PipelineStep, PipelineConfig } from '@/types';

interface PipelineEditorProps {
  initialConfig: PipelineConfig;
  onSave: (config: PipelineConfig) => void;
  onGenerateCSV: (config: PipelineConfig) => void;
}

const nodeTypes = {
  objectNode: ObjectNode,
};

// Convert pipeline config to React Flow nodes and edges
function configToFlow(config: PipelineConfig): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Calculate positions in a grid layout
  const cols = 4;
  const nodeWidth = 200;
  const nodeHeight = 120;
  const gapX = 80;
  const gapY = 100;

  config.steps.forEach((step, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    nodes.push({
      id: step.id,
      type: 'objectNode',
      position: {
        x: col * (nodeWidth + gapX) + 50,
        y: row * (nodeHeight + gapY) + 50,
      },
      data: {
        label: step.name,
        apiName: step.apiName,
        worksheetName: step.worksheetName,
        order: step.order,
        columns: step.columns,
        parentIdMappings: step.parentIdMappings,
      },
    });

    // Create edges for dependencies
    step.dependsOn.forEach((depId) => {
      edges.push({
        id: `${depId}-${step.id}`,
        source: depId,
        target: step.id,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: { stroke: '#000', strokeWidth: 2 },
      });
    });
  });

  return { nodes, edges };
}

// Convert React Flow back to pipeline config
function flowToConfig(nodes: Node[], edges: Edge[], originalConfig: PipelineConfig): PipelineConfig {
  const steps: PipelineStep[] = nodes.map((node, index) => {
    const dependsOn = edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => edge.source);

    return {
      id: node.id,
      name: node.data.label as string,
      apiName: node.data.apiName as string,
      worksheetName: node.data.worksheetName as string,
      order: index + 1,
      dependsOn,
      columns: (node.data.columns as PipelineStep['columns']) || [],
      parentIdMappings: (node.data.parentIdMappings as PipelineStep['parentIdMappings']) || [],
    };
  });

  return {
    ...originalConfig,
    steps,
  };
}

export function PipelineEditor({ initialConfig, onSave, onGenerateCSV }: PipelineEditorProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => configToFlow(initialConfig),
    [initialConfig]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            style: { stroke: '#000', strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Partial<Node['data']>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...data },
            };
          }
          return node;
        })
      );
      setSelectedNode(null);
    },
    [setNodes]
  );

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  const handleAddNode = useCallback(
    (nodeData: {
      name: string;
      apiName: string;
      worksheetName: string;
      columns: PipelineStep['columns'];
    }) => {
      const newId = `step_${Date.now()}`;
      const lastNode = nodes[nodes.length - 1];
      const newNode: Node = {
        id: newId,
        type: 'objectNode',
        position: {
          x: lastNode ? lastNode.position.x + 280 : 50,
          y: lastNode ? lastNode.position.y : 50,
        },
        data: {
          label: nodeData.name,
          apiName: nodeData.apiName,
          worksheetName: nodeData.worksheetName,
          order: nodes.length + 1,
          columns: nodeData.columns,
          parentIdMappings: [],
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setShowAddPanel(false);
    },
    [nodes, setNodes]
  );

  const handleSave = useCallback(() => {
    const config = flowToConfig(nodes, edges, initialConfig);
    onSave(config);
  }, [nodes, edges, initialConfig, onSave]);

  const handleGenerateCSV = useCallback(() => {
    const config = flowToConfig(nodes, edges, initialConfig);
    onGenerateCSV(config);
  }, [nodes, edges, initialConfig, onGenerateCSV]);

  return (
    <div className="h-[700px] w-full border border-gray-200 rounded-lg overflow-hidden bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls className="bg-white border border-gray-200" />
        <MiniMap
          nodeColor={(node) => {
            if (selectedNode?.id === node.id) return '#000';
            return '#e5e7eb';
          }}
          className="bg-white border border-gray-200"
        />

        {/* Top Panel */}
        <Panel position="top-left" className="flex items-center gap-2">
          <Button onClick={() => setShowAddPanel(true)} size="sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Object
          </Button>
        </Panel>

        <Panel position="top-right" className="flex items-center gap-2">
          <Button onClick={handleGenerateCSV} variant="outline" size="sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate CSV Template
          </Button>
          <Button onClick={handleSave} size="sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Configuration
          </Button>
        </Panel>

        {/* Instructions Panel */}
        <Panel position="bottom-left" className="bg-white/90 p-3 rounded-lg border border-gray-200 text-xs text-gray-600 max-w-xs">
          <p className="font-medium mb-1">How to use:</p>
          <ul className="space-y-1">
            <li>• Drag nodes to reposition</li>
            <li>• Connect nodes to define dependencies</li>
            <li>• Click a node to edit properties</li>
            <li>• Arrows show execution order</li>
          </ul>
        </Panel>
      </ReactFlow>

      {/* Node Configuration Panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          allNodes={nodes}
          onUpdate={handleNodeUpdate}
          onDelete={handleNodeDelete}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Add Node Panel */}
      {showAddPanel && (
        <AddNodePanel
          onAdd={handleAddNode}
          onClose={() => setShowAddPanel(false)}
        />
      )}
    </div>
  );
}

// Add Node Panel Component
function AddNodePanel({
  onAdd,
  onClose,
}: {
  onAdd: (data: { name: string; apiName: string; worksheetName: string; columns: PipelineStep['columns'] }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [apiName, setApiName] = useState('');
  const [worksheetName, setWorksheetName] = useState('');
  const [columns, setColumns] = useState<PipelineStep['columns']>([
    { name: 'Id', type: 'string', required: true },
    { name: 'Name', type: 'string', required: true },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && apiName && worksheetName) {
      onAdd({ name, apiName, worksheetName, columns });
    }
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Add New Object</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              placeholder="e.g., Products"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salesforce API Name *
            </label>
            <input
              type="text"
              value={apiName}
              onChange={(e) => setApiName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              placeholder="e.g., Product2 or Custom__c"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CSV Worksheet Name *
            </label>
            <input
              type="text"
              value={worksheetName}
              onChange={(e) => setWorksheetName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              placeholder="e.g., Products"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Columns
              </label>
              <button
                type="button"
                onClick={addColumn}
                className="text-sm text-gray-600 hover:text-black"
              >
                + Add Column
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {columns.map((col, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => updateColumn(index, 'name', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-black"
                    placeholder="Column name"
                  />
                  <select
                    value={col.type}
                    onChange={(e) => updateColumn(index, 'type', e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-black"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                    <option value="reference">Reference</option>
                  </select>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={col.required}
                      onChange={(e) => updateColumn(index, 'required', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Req
                  </label>
                  <button
                    type="button"
                    onClick={() => removeColumn(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Object
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
