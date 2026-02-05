'use client';

import React, { useState, useRef, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Badge } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useConfigData, ExportData } from '@/contexts/ConfigDataContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useUser } from '@/contexts/UserContext';
import TableDataEntry from '@/components/data-entry/TableDataEntry';

// Lazy load the Visual Data Builder to avoid SSR issues with React Flow
const VisualDataBuilder = lazy(() => import('@/components/data-entry/VisualDataBuilder'));

type ViewMode = 'hierarchical' | 'visual';

export default function DataEntryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const {
    state,
    pipelineConfig,
    getTotalEntryCount,
    clearAll,
    exportData,
    importData,
    isHydrated,
  } = useConfigData();

  const [viewMode, setViewMode] = useState<ViewMode>('hierarchical');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [relationshipMappingActive, setRelationshipMappingActive] = useState(true);
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const totalEntries = getTotalEntryCount();

  const handleDeploy = () => {
    router.push('/dashboard/deployment');
  };

  const handleClear = async () => {
    const confirmed = await confirm({
      title: 'Clear All Data',
      message: 'Are you sure you want to clear all data? This action cannot be undone.',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      clearAll();
      toast.success('All data cleared successfully.');
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
    toast.success('Data exported successfully.');
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

      if (!imported.data || typeof imported.data !== 'object') {
        throw new Error('Invalid file format: missing data property');
      }

      importData(imported.data);

      let count = 0;
      for (const entries of Object.values(imported.data)) {
        if (Array.isArray(entries)) {
          count += entries.length;
        }
      }

      toast.success(`Successfully imported ${count} entries from ${file.name}`);
    } catch (error) {
      toast.error(`Failed to import: ${error instanceof Error ? error.message : 'Invalid JSON file'}`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show loading state while hydrating from localStorage
  if (!isHydrated) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading saved data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Page Header */}
      <PageHeader
        title="Data Entry"
        subtitle="Salesforce Revenue Cloud Config"
        user={user}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleImportJSON}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            IMPORT JSON
          </button>
          <button
            onClick={handleExportJSON}
            disabled={totalEntries === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            EXPORT JSON
          </button>
          <button
            onClick={handleDeploy}
            disabled={totalEntries === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            PROCEED TO DEPLOYMENT
            {totalEntries > 0 && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalEntries}
              </span>
            )}
          </button>
        </div>
      </PageHeader>

      {/* Sub-header with View Toggle and Relationship Mapping */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between">
        {/* View Toggle Tabs */}
        <div className="flex">
          <button
            onClick={() => setViewMode('hierarchical')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'hierarchical'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Hierarchical View
          </button>
          <button
            onClick={() => setViewMode('visual')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ml-2 ${
              viewMode === 'visual'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Visual Builder
          </button>
        </div>

        {/* Relationship Mapping Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {relationshipMappingActive ? 'AUTOMATIC RELATIONSHIP MAPPING' : 'RELATIONSHIP MAPPING:'}
            </span>
            <span className={`text-sm font-semibold ${relationshipMappingActive ? 'text-green-600' : 'text-gray-400'}`}>
              {relationshipMappingActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <button
            onClick={handleClear}
            disabled={totalEntries === 0}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CLEAR ALL
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'hierarchical' ? (
          <TableDataEntry />
        ) : (
          <div className="h-full p-6 overflow-y-auto">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Visual Data Builder
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Drag objects from the sidebar to the canvas. Click on objects to edit their properties.
                </p>
              </div>
              <Suspense fallback={
                <div className="h-[600px] flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading Visual Builder...</p>
                  </div>
                </div>
              }>
                <VisualDataBuilder
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
