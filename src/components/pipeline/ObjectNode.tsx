'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ObjectNodeData {
  label: string;
  apiName: string;
  worksheetName: string;
  order: number;
  columns: Array<{ name: string; type: string; required: boolean }>;
  parentIdMappings: Array<{ field: string; parentStep: string; parentField: string }>;
}

export const ObjectNode = memo(function ObjectNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ObjectNodeData;
  const columnCount = nodeData.columns?.length || 0;
  const dependencyCount = nodeData.parentIdMappings?.length || 0;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[180px]
        transition-all duration-200
        ${selected ? 'border-black shadow-lg' : 'border-gray-200 hover:border-gray-400'}
      `}
    >
      {/* Input Handle (Top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />

      {/* Node Content */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm truncate">
            {nodeData.label}
          </h4>
          <p className="text-xs text-gray-500 truncate">
            {nodeData.apiName}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {columnCount} fields
        </span>
        {dependencyCount > 0 && (
          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
            {dependencyCount} refs
          </span>
        )}
      </div>

      {/* Order Badge */}
      <div className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs font-medium">
        {nodeData.order}
      </div>

      {/* Output Handle (Bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-black border-2 border-white"
      />
    </div>
  );
});
