'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, Button, Alert } from '@/components/ui';
import { PipelineEditor } from '@/components/pipeline';
import { DEFAULT_PIPELINE_CONFIG, validatePipelineConfig } from '@/lib/pipeline/config';
import { downloadAllTemplates, downloadCSV, generateCSVTemplates } from '@/lib/csv/generator';
import type { PipelineConfig } from '@/types';

export default function PipelinePage() {
  const supabase = createClient();
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_PIPELINE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

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
    setMessage(null);

    try {
      // Validate config
      const validation = validatePipelineConfig(newConfig);
      if (!validation.valid) {
        setMessage({
          type: 'error',
          text: `Validation errors: ${validation.errors.join(', ')}`,
        });
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

      setConfig(newConfig);
      setMessage({ type: 'success', text: 'Pipeline configuration saved successfully' });
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save configuration',
      });
    } finally {
      setSaving(false);
    }
  }, [supabase]);

  const handleGenerateCSV = useCallback((currentConfig: PipelineConfig) => {
    setShowDownloadOptions(true);
    setConfig(currentConfig);
  }, []);

  const handleDownloadAll = () => {
    downloadAllTemplates(config);
    setShowDownloadOptions(false);
    setMessage({ type: 'success', text: 'CSV templates downloaded successfully' });
  };

  const handleDownloadSingle = (worksheetName: string) => {
    const templates = generateCSVTemplates(config);
    const fileName = `${worksheetName}.csv`;
    const content = templates.get(fileName);
    if (content) {
      downloadCSV(fileName, content);
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Are you sure you want to reset to the default configuration? This will overwrite your changes.')) {
      setConfig(DEFAULT_PIPELINE_CONFIG);
      setMessage({ type: 'warning', text: 'Configuration reset to default. Click "Save Configuration" to persist.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pipeline Configuration</h1>
          <p className="text-gray-600 mt-1">
            Configure deployment objects, dependencies, and field mappings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleResetToDefault}>
            Reset to Default
          </Button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <Alert
          variant={message.type}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

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
          />
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">Order</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">Object</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">API Name</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">CSV File</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">Columns</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">Dependencies</th>
                  <th className="py-2 px-3 text-left text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {config.steps.map((step, index) => (
                  <tr key={step.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <span className="w-6 h-6 inline-flex items-center justify-center bg-black text-white text-xs font-medium rounded-full">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-gray-900">{step.name}</td>
                    <td className="py-2 px-3 font-mono text-xs text-gray-600">{step.apiName}</td>
                    <td className="py-2 px-3 text-gray-600">{step.worksheetName}.csv</td>
                    <td className="py-2 px-3 text-gray-600">{step.columns.length}</td>
                    <td className="py-2 px-3">
                      {step.dependsOn.length > 0 ? (
                        <span className="text-gray-600">
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
        </CardContent>
      </Card>

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
  );
}
