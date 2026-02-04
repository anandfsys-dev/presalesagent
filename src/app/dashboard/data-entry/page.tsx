'use client';

import React, { useState, useRef, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Alert,
  Badge,
} from '@/components/ui';
import { useConfigData, ExportData } from '@/contexts/ConfigDataContext';
import HierarchicalDataEntry from '@/components/data-entry/HierarchicalDataEntry';

// Lazy load the Visual Data Builder to avoid SSR issues with React Flow
const VisualDataBuilder = lazy(() => import('@/components/data-entry/VisualDataBuilder'));

type ViewMode = 'hierarchical' | 'visual';

// Main Data Entry Content
export default function DataEntryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    state,
    pipelineConfig,
    getTotalEntryCount,
    clearAll,
    exportData,
    importData,
    isHydrated,
  } = useConfigData();

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchical');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalEntries = getTotalEntryCount();

  const handleDeploy = () => {
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

      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Data Entry</h1>
          <p className="text-gray-600 mt-1">
            Configure Salesforce Revenue Cloud objects with automatic relationship mapping
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={totalEntries > 0 ? 'success' : 'default'}>
            {totalEntries} total entries
          </Badge>
        </div>
      </div>

      {/* Controls - Common for both tabs */}
      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
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
          <Button variant="outline" size="sm" onClick={handleClear} disabled={totalEntries === 0}>
            Clear All
          </Button>
          <Button size="sm" onClick={handleDeploy} disabled={totalEntries === 0}>
            Proceed to Deployment ({totalEntries})
          </Button>
        </div>
      </div>

      {statusMessage && (
        <Alert
          variant={statusMessage.type === 'error' ? 'error' : 'success'}
          onClose={() => setStatusMessage(null)}
        >
          {statusMessage.message}
        </Alert>
      )}

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

      {/* Hierarchical View */}
      {viewMode === 'hierarchical' && (
        <HierarchicalDataEntry />
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
                  <Button onClick={handleDeploy} disabled={totalEntries === 0}>
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
