'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, useConfirmDialog } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { PipelineEditor } from '@/components/pipeline';
import { DEFAULT_PIPELINE_CONFIG, validatePipelineConfig } from '@/lib/pipeline/config';
import { downloadAllTemplates, downloadCSV, generateCSVTemplates } from '@/lib/csv/generator';
import { useConfigData } from '@/contexts/ConfigDataContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';
import type { PipelineConfig, PostDeploymentOperation } from '@/types';

type TabType = 'editor' | 'summary' | 'postDeployment';

// Post Deployment Section Component
function PostDeploymentSection({
  operations,
  onUpdate,
  onSave,
  onConfirm,
}: {
  operations: PostDeploymentOperation[];
  onUpdate: (operations: PostDeploymentOperation[]) => void;
  onSave: () => void;
  onConfirm: (options: { title: string; message: string; confirmText?: string; cancelText?: string; variant?: 'danger' | 'warning' | 'info' }) => Promise<boolean>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PostDeploymentOperation>>({});

  const handleAddOperation = (type: 'wait' | 'GET' | 'POST') => {
    const newOp: PostDeploymentOperation = {
      id: `op_${Date.now()}`,
      name: type === 'wait' ? 'Wait before next step' : `${type} Request`,
      type,
      order: operations.length + 1,
      ...(type === 'wait' ? { waitTimeSeconds: 5 } : {}),
      ...(type !== 'wait' ? { endpoint: '', payload: type === 'POST' ? {} : undefined } : {}),
    };
    onUpdate([...operations, newOp]);
  };

  const handleDeleteOperation = async (id: string) => {
    const confirmed = await onConfirm({
      title: 'Delete Operation',
      message: 'Are you sure you want to delete this operation?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      const updated = operations.filter(op => op.id !== id)
        .map((op, index) => ({ ...op, order: index + 1 }));
      onUpdate(updated);
    }
  };

  const handleMoveOperation = (index: number, direction: 'up' | 'down') => {
    const newOps = [...operations];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newOps.length) return;
    [newOps[index], newOps[newIndex]] = [newOps[newIndex], newOps[index]];
    newOps.forEach((op, i) => { op.order = i + 1; });
    onUpdate(newOps);
  };

  const handleStartEdit = (op: PostDeploymentOperation) => {
    setEditingId(op.id);
    setEditForm({ ...op });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const updated = operations.map(op =>
      op.id === editingId ? { ...op, ...editForm } as PostDeploymentOperation : op
    );
    onUpdate(updated);
    setEditingId(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Post Deployment Operations</h3>
              <p className="text-sm text-gray-600 mt-1">
                Configure operations to run after the main deployment completes. Use this for tasks like
                triggering catalog builds, refreshing caches, or making additional API calls.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between">
              <span>Operations ({operations.length})</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleAddOperation('wait')}>
                  + Wait
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAddOperation('GET')}>
                  + GET
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAddOperation('POST')}>
                  + POST
                </Button>
                <Button size="sm" onClick={onSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p>No post-deployment operations configured.</p>
              <p className="text-sm mt-1">Click the buttons above to add Wait, GET, or POST operations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 px-3 text-left text-gray-500 font-medium w-20">Order</th>
                    <th className="py-2 px-3 text-left text-gray-500 font-medium">Name</th>
                    <th className="py-2 px-3 text-left text-gray-500 font-medium">Type</th>
                    <th className="py-2 px-3 text-left text-gray-500 font-medium">Configuration</th>
                    <th className="py-2 px-3 text-left text-gray-500 font-medium w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op, index) => (
                    <tr key={op.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <span className="w-6 h-6 inline-flex items-center justify-center bg-purple-600 text-white text-xs font-medium rounded-full">
                            {index + 1}
                          </span>
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleMoveOperation(index, 'up')}
                              disabled={index === 0}
                              className={`p-0.5 rounded hover:bg-gray-200 ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'}`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleMoveOperation(index, 'down')}
                              disabled={index === operations.length - 1}
                              className={`p-0.5 rounded hover:bg-gray-200 ${index === operations.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'}`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">{op.name}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          op.type === 'wait' ? 'bg-gray-100 text-gray-800' :
                          op.type === 'GET' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {op.type}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {op.type === 'wait' ? (
                          <span className="text-gray-600">{op.waitTimeSeconds} seconds</span>
                        ) : (
                          <div>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 block truncate max-w-md">
                              {op.endpoint || 'No endpoint set'}
                            </code>
                            {op.type === 'POST' && op.payload && Object.keys(op.payload).length > 0 && (
                              <details className="mt-1">
                                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                  View Payload
                                </summary>
                                <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto max-w-md">
                                  {JSON.stringify(op.payload, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEdit(op)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteOperation(op.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
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
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Edit Operation</h3>
              <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              {editForm.type === 'wait' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wait Time (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={editForm.waitTimeSeconds || 5}
                    onChange={(e) => setEditForm({ ...editForm, waitTimeSeconds: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>
              )}

              {(editForm.type === 'GET' || editForm.type === 'POST') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
                    <input
                      type="text"
                      value={editForm.endpoint || ''}
                      onChange={(e) => setEditForm({ ...editForm, endpoint: e.target.value })}
                      placeholder="/services/data/v60.0/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black font-mono text-sm"
                    />
                  </div>

                  {editForm.type === 'POST' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">JSON Payload</label>
                      <textarea
                        value={editForm.payload ? JSON.stringify(editForm.payload, null, 2) : '{}'}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setEditForm({ ...editForm, payload: parsed });
                          } catch {
                            // Invalid JSON, keep as is
                          }
                        }}
                        rows={8}
                        placeholder='{"key": "value"}'
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter valid JSON for the request body
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PipelinePage() {
  const supabase = createClient();
  const { user } = useUser();
  const { pipelineConfig: contextConfig, updatePipelineConfig, migrateDataForColumnChanges, refreshPipelineConfig } = useConfigData();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_PIPELINE_CONFIG);
  const [previousConfig, setPreviousConfig] = useState<PipelineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('editor');
  const [changedSteps, setChangedSteps] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load saved config from Supabase
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Try to find default config first, then most recent
        const { data } = await supabase
          .from('pipeline_configs')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('updated_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0 && data[0].config) {
          setConfig(data[0].config as PipelineConfig);
        }
      } catch (error) {
        // No saved config, use default
        console.log('Using default pipeline config');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [supabase]);

  const handleSave = useCallback(async (newConfig: PipelineConfig) => {
    setSaving(true);

    try {
      // Validate config
      const validation = validatePipelineConfig(newConfig);
      if (!validation.valid) {
        toast.error(`Validation errors: ${validation.errors.join(', ')}`);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if config already exists for this user
      const { data: existingConfig } = await supabase
        .from('pipeline_configs')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from('pipeline_configs')
          .update({
            config: newConfig,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        // Insert new config
        const { error } = await supabase
          .from('pipeline_configs')
          .insert({
            user_id: user.id,
            name: newConfig.name || 'Default Pipeline',
            description: 'Salesforce Revenue Cloud deployment pipeline',
            config: newConfig,
            is_default: true,
          });

        if (error) throw error;
      }

      // Migrate data for column changes (if any columns were renamed)
      const migrated = migrateDataForColumnChanges(config, newConfig);
      if (migrated.length > 0) {
        setChangedSteps(migrated);
        toast.success(`Pipeline configuration saved. Data migrated for: ${migrated.join(', ')}`);
      } else {
        toast.success('Pipeline configuration saved successfully');
      }

      // Update context and local state
      setPreviousConfig(config);
      setConfig(newConfig);
      updatePipelineConfig(newConfig);
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }, [supabase, config, migrateDataForColumnChanges, updatePipelineConfig, toast]);

  const handleGenerateCSV = useCallback((currentConfig: PipelineConfig) => {
    setShowDownloadOptions(true);
    setConfig(currentConfig);
  }, []);

  const handleDownloadAll = () => {
    downloadAllTemplates(config);
    setShowDownloadOptions(false);
    toast.success('CSV templates downloaded successfully');
  };

  const handleDownloadSingle = (worksheetName: string) => {
    const templates = generateCSVTemplates(config);
    const fileName = `${worksheetName}.csv`;
    const content = templates.get(fileName);
    if (content) {
      downloadCSV(fileName, content);
    }
  };

  const handleResetToDefault = async () => {
    const confirmed = await confirm({
      title: 'Reset Configuration',
      message: 'Are you sure you want to reset to the default configuration? This will overwrite your changes.',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      variant: 'warning',
    });

    if (confirmed) {
      setConfig(DEFAULT_PIPELINE_CONFIG);
      toast.warning('Configuration reset to default. Click "Save Configuration" to persist.');
    }
  };

  const handleMoveStep = useCallback((index: number, direction: 'up' | 'down') => {
    const newSteps = [...config.steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newSteps.length) return;

    // Swap the steps
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];

    // Update order numbers
    newSteps.forEach((step, i) => {
      step.order = i + 1;
    });

    const newConfig = { ...config, steps: newSteps };
    setConfig(newConfig);
    toast.info('Step order changed. Click "Save" to persist changes.');
  }, [config, toast]);

  const handleSaveReorder = useCallback(async () => {
    await handleSave(config);
  }, [config, handleSave]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Pipeline Config"
        subtitle="Configure Deployment Objects and Mappings"
        user={user}
      >
        <Button variant="outline" onClick={handleResetToDefault}>
          Reset to Default
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
        <div className="max-w-6xl mx-auto space-y-6">

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('editor')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'editor'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              Deployment Pipeline
            </div>
          </button>
          <button
            onClick={() => setActiveTab('postDeployment')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'postDeployment'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Post Deployment
            </div>
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Configuration Summary
            </div>
          </button>
        </nav>
      </div>

      {/* Deployment Pipeline Tab */}
      {activeTab === 'editor' && (
        <>
          {/* Instructions Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Visual Pipeline Editor</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Use the visual editor below to configure your deployment pipeline. Drag nodes to reposition them,
                    connect nodes to define dependencies, and click on a node to edit its properties including
                    Salesforce API names, columns, and ID mappings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Editor */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center justify-between">
                  <span>Deployment Pipeline</span>
                  <span className="text-sm font-normal text-gray-500">
                    {config.steps.length} objects configured
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PipelineEditor
                initialConfig={config}
                onSave={handleSave}
                onGenerateCSV={handleGenerateCSV}
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Configuration Summary Tab */}
      {activeTab === 'summary' && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center justify-between">
                <span>Configuration Summary</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-normal text-gray-500">
                    {config.steps.length} objects configured
                  </span>
                  <Button size="sm" onClick={handleSaveReorder}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-3 text-left text-gray-500 font-medium w-20">Order</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">Object</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">API Endpoint</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">Method</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">Columns</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">Dependencies</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {config.steps.map((step, index) => (
                  <tr
                    key={step.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      changedSteps.includes(step.name) ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <span className="w-6 h-6 inline-flex items-center justify-center bg-black text-white text-xs font-medium rounded-full">
                          {index + 1}
                        </span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMoveStep(index, 'up')}
                            disabled={index === 0}
                            className={`p-0.5 rounded hover:bg-gray-200 ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'}`}
                            title="Move up"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveStep(index, 'down')}
                            disabled={index === config.steps.length - 1}
                            className={`p-0.5 rounded hover:bg-gray-200 ${index === config.steps.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'}`}
                            title="Move down"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-medium text-gray-900">{step.name}</td>
                    <td className="py-2 px-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {step.endpoint || `/services/data/v60.0/sobjects/${step.apiName}/`}
                      </code>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        step.method === 'PATCH' ? 'bg-yellow-100 text-yellow-800' :
                        step.method === 'PUT' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {step.method || 'POST'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{step.columns.length}</td>
                    <td className="py-2 px-3">
                      {step.dependsOn.length > 0 ? (
                        <span className="text-gray-600 text-xs">
                          {step.dependsOn.map((depId) => {
                            const dep = config.steps.find((s) => s.id === depId);
                            return dep?.name || depId;
                          }).join(', ')}
                        </span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => handleDownloadSingle(step.worksheetName)}
                        className="text-gray-600 hover:text-black"
                        title="Download CSV template"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Post Deployment Operations Summary */}
          {(config.postDeploymentOperations?.length ?? 0) > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Post Deployment Operations ({config.postDeploymentOperations?.length || 0})
              </h3>
              <p className="text-xs text-gray-500 mb-3">These operations will execute after all objects are deployed.</p>
              <div className="space-y-2">
                {config.postDeploymentOperations?.map((op, index) => (
                  <div key={op.id} className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="w-6 h-6 flex items-center justify-center bg-purple-600 text-white text-xs font-medium rounded-full">
                      {index + 1}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      op.type === 'wait' ? 'bg-gray-200 text-gray-700' :
                      op.type === 'GET' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {op.type}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{op.name}</span>
                    {op.type === 'wait' && (
                      <span className="text-xs text-gray-500">{op.waitTimeSeconds}s delay</span>
                    )}
                    {op.endpoint && (
                      <code className="text-xs bg-white/70 px-2 py-0.5 rounded text-gray-600 truncate max-w-xs">
                        {op.endpoint}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Post Deployment Tab */}
      {activeTab === 'postDeployment' && (
        <PostDeploymentSection
          operations={config.postDeploymentOperations || []}
          onUpdate={(operations) => {
            const newConfig = { ...config, postDeploymentOperations: operations };
            setConfig(newConfig);
          }}
          onSave={() => handleSave(config)}
          onConfirm={confirm}
        />
      )}

      {/* Download Options Modal */}
      {showDownloadOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Download CSV Templates</h3>
              <button
                onClick={() => setShowDownloadOptions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-gray-600 text-sm">
                Download CSV templates based on your current pipeline configuration.
                Each object will have its own CSV file with the correct columns.
              </p>

              <div className="space-y-2">
                <Button onClick={handleDownloadAll} className="w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download All Templates ({config.steps.length} files)
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or download individually</span>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {config.steps.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => handleDownloadSingle(step.worksheetName)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-lg"
                    >
                      <span>{step.worksheetName}.csv</span>
                      <span className="text-gray-400">{step.columns.length} columns</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button variant="outline" onClick={() => setShowDownloadOptions(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
}
