'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Alert,
  Badge,
  ProgressBar,
  Select,
} from '@/components/ui';
import { useConfigData, DeploymentPayload } from '@/contexts/ConfigDataContext';
import type { SalesforceConnection } from '@/types';

interface DeploymentProgress {
  currentStep: string;
  currentStepIndex: number;
  totalSteps: number;
  processedRecords: number;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  // Post-deployment phase
  phase?: 'deployment' | 'post_deployment';
  currentOperation?: string;
  currentOperationIndex?: number;
  totalOperations?: number;
  operationType?: string;
}

interface PostDeploymentResult {
  operationId: string;
  operationName: string;
  type: 'GET' | 'POST';
  endpoint: string;
  success: boolean;
  response?: unknown;
  error?: string;
}

interface DeploymentLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  salesforceId?: string;
  objectType?: string;
}

interface CreatedRecord {
  stepId: string;
  stepName: string;
  objectType: string;
  name: string;
  salesforceId: string;
  timestamp: string;
}

type DeploymentMode = 'full' | 'incremental' | 'validation_only';

export default function DeploymentPage() {
  const router = useRouter();
  const supabase = createClient();
  const { state, pipelineConfig, getTotalEntryCount, convertToDeploymentPayload, stepsByCategory } = useConfigData();

  const [connections, setConnections] = useState<SalesforceConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [connection, setConnection] = useState<SalesforceConnection | null>(null);
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>('full');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentComplete, setDeploymentComplete] = useState(false);
  const [progress, setProgress] = useState<DeploymentProgress | null>(null);
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [createdRecords, setCreatedRecords] = useState<CreatedRecord[]>([]);
  const [postDeploymentResults, setPostDeploymentResults] = useState<PostDeploymentResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    totalObjects: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
  } | null>(null);

  // Load connections
  useEffect(() => {
    const fetchConnections = async () => {
      const { data: conns } = await supabase
        .from('connections')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (conns) {
        setConnections(conns);
        if (conns.length > 0 && !selectedConnectionId) {
          setSelectedConnectionId(conns[0].id);
          setConnection(conns[0]);
        }
      }
    };

    fetchConnections();
  }, [supabase, selectedConnectionId]);

  // Update connection when selection changes
  useEffect(() => {
    if (selectedConnectionId) {
      const conn = connections.find(c => c.id === selectedConnectionId);
      setConnection(conn || null);
    }
  }, [selectedConnectionId, connections]);

  const addLog = useCallback((level: DeploymentLog['level'], message: string, salesforceId?: string, objectType?: string) => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        level,
        message,
        salesforceId,
        objectType,
      },
    ]);
  }, []);

  const handleStartDeployment = async () => {
    if (!connection) return;

    const totalEntries = getTotalEntryCount();
    if (totalEntries === 0) {
      setError('No data to deploy. Please add data in the Data Entry page first.');
      return;
    }

    setIsDeploying(true);
    setDeploymentComplete(false);
    setError(null);
    setLogs([]);
    setCreatedRecords([]);
    setPostDeploymentResults([]);
    setResult(null);

    const payload = convertToDeploymentPayload();

    // Initialize progress immediately to show the progress section
    setProgress({
      currentStep: 'Initializing...',
      currentStepIndex: 0,
      totalSteps: payload.metadata.stepCount,
      processedRecords: 0,
      totalRecords: payload.metadata.totalEntries,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      phase: 'deployment',
    });

    addLog('info', `Starting ${deploymentMode} deployment to ${connection.name}`);
    addLog('info', `Processing ${payload.metadata.totalEntries} entries across ${payload.metadata.stepCount} steps`);

    try {
      const response = await fetch('/api/deployment/execute-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: connection.id,
          payload,
          mode: deploymentMode,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream available');
      }

      // Buffer for incomplete lines across chunks
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining buffer content
          if (buffer.trim()) {
            try {
              const event = JSON.parse(buffer);
              processEvent(event);
            } catch {
              // Ignore incomplete final chunk
            }
          }
          break;
        }

        // Decode with stream option for proper handling of partial UTF-8
        buffer += decoder.decode(value, { stream: true });

        // Split on newlines and process complete lines
        const lines = buffer.split('\n');

        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            processEvent(event);
          } catch {
            // Ignore parse errors for malformed chunks
          }
        }
      }

      function processEvent(event: { type: string; data: unknown }) {
        if (event.type === 'progress') {
          setProgress(event.data as DeploymentProgress);
        } else if (event.type === 'log') {
          const logData = event.data as { level: DeploymentLog['level']; message: string; salesforceId?: string; objectType?: string };
          addLog(logData.level, logData.message, logData.salesforceId, logData.objectType);
        } else if (event.type === 'record_created') {
          const recordData = event.data as CreatedRecord;
          setCreatedRecords(prev => [...prev, recordData]);
          addLog('success', `Created ${recordData.objectType}: ${recordData.name}`, recordData.salesforceId, recordData.objectType);
        } else if (event.type === 'post_deployment_result') {
          setPostDeploymentResults(prev => [...prev, event.data as PostDeploymentResult]);
        } else if (event.type === 'complete') {
          setResult(event.data as typeof result);
          setDeploymentComplete(true);
        } else if (event.type === 'error') {
          const errorData = event.data as { message: string };
          setError(errorData.message);
          addLog('error', errorData.message);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Deployment failed';
      setError(errorMessage);
      addLog('error', errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleCancel = () => {
    setIsDeploying(false);
    addLog('warning', 'Deployment cancelled by user');
  };

  // Get entry count by category
  const getEntriesByCategory = () => {
    const categories: Record<string, { count: number; steps: { name: string; count: number }[] }> = {};

    for (const [category, steps] of Object.entries(stepsByCategory)) {
      const stepsWithData = steps
        .map(step => ({
          name: step.name,
          count: (state[step.id] || []).length
        }))
        .filter(s => s.count > 0);

      if (stepsWithData.length > 0) {
        categories[category] = {
          count: stepsWithData.reduce((sum, s) => sum + s.count, 0),
          steps: stepsWithData
        };
      }
    }

    return categories;
  };

  const totalEntries = getTotalEntryCount();
  const entriesByCategory = getEntriesByCategory();

  if (totalEntries === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Deployment</h1>
          <p className="text-gray-600 mt-1">No data available for deployment</p>
        </div>

        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Configuration Data
            </h3>
            <p className="text-gray-600 mb-6">
              Add data in the Data Entry page before deploying to Salesforce.
            </p>
            <Button onClick={() => router.push('/dashboard/data-entry')}>
              Go to Data Entry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Deployment</h1>
        <p className="text-gray-600 mt-1">
          Deploy configuration to Salesforce Revenue Cloud
        </p>
      </div>

      {/* Deployment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Select
                label="Target Connection"
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
                options={connections.map(c => ({
                  value: c.id,
                  label: `${c.name} (${c.instance_url})`
                }))}
                disabled={isDeploying || connections.length === 0}
              />
              {connections.length === 0 && (
                <p className="text-sm text-red-500 mt-1">
                  No active connections. <a href="/dashboard/connections" className="underline">Add a connection</a>
                </p>
              )}
            </div>

            <div>
              <Select
                label="Deployment Mode"
                value={deploymentMode}
                onChange={(e) => setDeploymentMode(e.target.value as DeploymentMode)}
                options={[
                  { value: 'full', label: 'Full Deployment - Create all objects' },
                  { value: 'incremental', label: 'Incremental - Create/update changed objects' },
                  { value: 'validation_only', label: 'Validation Only - Dry run without creating' },
                ]}
                disabled={isDeploying}
              />
            </div>

            <div className="md:col-span-2 flex items-end gap-4">
              {!isDeploying && !deploymentComplete && (
                <Button
                  onClick={handleStartDeployment}
                  disabled={!connection}
                >
                  Start Deployment
                </Button>
              )}
              {isDeploying && (
                <Button variant="danger" onClick={handleCancel}>
                  Cancel Deployment
                </Button>
              )}
              {deploymentComplete && (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => router.push('/dashboard/history')}>
                    View History
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setDeploymentComplete(false);
                    setResult(null);
                    setProgress(null);
                    setLogs([]);
                    setCreatedRecords([]);
                    setPostDeploymentResults([]);
                  }}>
                    Reset
                  </Button>
                  <Button onClick={() => router.push('/dashboard/data-entry')}>
                    Edit Data
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Data Summary - {totalEntries} Total Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(entriesByCategory).map(([category, data]) => (
              <div key={category} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{category}</h4>
                  <Badge variant="default">{data.count}</Badge>
                </div>
                <ul className="space-y-1">
                  {data.steps.map(step => (
                    <li key={step.name} className="text-sm text-gray-600 flex justify-between">
                      <span>{step.name}</span>
                      <span className="text-gray-400">{step.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Post-Deployment Operations */}
            {pipelineConfig.postDeploymentOperations && pipelineConfig.postDeploymentOperations.length > 0 && (
              <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Post-Deployment</h4>
                  <Badge variant="default">{pipelineConfig.postDeploymentOperations.length}</Badge>
                </div>
                <ul className="space-y-1">
                  {pipelineConfig.postDeploymentOperations.map(op => (
                    <li key={op.id} className="text-sm text-gray-600 flex justify-between">
                      <span>{op.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        op.type === 'wait' ? 'bg-gray-200 text-gray-700' :
                        op.type === 'GET' ? 'bg-blue-200 text-blue-700' :
                        'bg-green-200 text-green-700'
                      }`}>{op.type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {(isDeploying || progress) && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-3">
                Deployment Progress
                {isDeploying && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progress && (
              <div className="space-y-4">
                {/* Phase indicator */}
                <div className="flex items-center gap-2 mb-4">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    progress.phase === 'post_deployment'
                      ? 'bg-gray-200 text-gray-600'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${progress.phase !== 'post_deployment' ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
                    Object Deployment
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    progress.phase === 'post_deployment'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${progress.phase === 'post_deployment' ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'}`} />
                    Post-Deployment
                  </div>
                </div>

                {/* Current operation display */}
                {progress.phase === 'post_deployment' ? (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-900">
                        Operation {(progress.currentOperationIndex || 0) + 1} of {progress.totalOperations}: {progress.currentOperation}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        progress.operationType === 'wait' ? 'bg-gray-200 text-gray-700' :
                        progress.operationType === 'GET' ? 'bg-blue-200 text-blue-700' :
                        'bg-green-200 text-green-700'
                      }`}>
                        {progress.operationType}
                      </span>
                    </div>
                    <ProgressBar
                      value={(progress.currentOperationIndex || 0) + 1}
                      max={progress.totalOperations || 1}
                      showPercentage
                    />
                  </div>
                ) : (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-900">
                          Step {progress.currentStepIndex + 1} of {progress.totalSteps}:
                        </span>
                        <span className="text-sm font-semibold text-blue-900">
                          {progress.currentStep}
                        </span>
                      </div>
                      <span className="text-sm text-blue-600">
                        {progress.processedRecords} / {progress.totalRecords} records
                      </span>
                    </div>
                    <ProgressBar
                      value={progress.processedRecords}
                      max={progress.totalRecords}
                      showPercentage
                    />
                  </div>
                )}

                {/* Overall progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500">Overall Progress</span>
                    <span className="text-xs text-gray-500">
                      {(progress.successCount || 0) + (progress.failureCount || 0)} / {totalEntries} records processed
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-black h-2 rounded-full transition-all duration-300"
                      style={{ width: `${totalEntries > 0 ? (((progress.successCount || 0) + (progress.failureCount || 0)) / totalEntries) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold text-green-700">{progress.successCount || 0}</p>
                    <p className="text-sm text-green-600">Successful</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold text-red-700">{progress.failureCount || 0}</p>
                    <p className="text-sm text-red-600">Failed</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold text-gray-700">{progress.skippedCount || 0}</p>
                    <p className="text-sm text-gray-600">Skipped</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Result Summary */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-3">
                Deployment Complete
                {result.success ? (
                  <Badge variant="success">Success</Badge>
                ) : (
                  <Badge variant="error">Completed with Errors</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <Alert variant="success" title="Deployment Successful">
                All {result.successCount} objects were created successfully in Salesforce.
              </Alert>
            ) : (
              <Alert variant="warning" title="Deployment Completed with Issues">
                {result.successCount} succeeded, {result.failureCount} failed, {result.skippedCount} skipped.
                Review the logs below for details.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="error" title="Deployment Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Created Records Log */}
      {createdRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Created Records ({createdRecords.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="py-2 px-3 text-left font-medium text-gray-500">Step</th>
                    <th className="py-2 px-3 text-left font-medium text-gray-500">Object Type</th>
                    <th className="py-2 px-3 text-left font-medium text-gray-500">Name</th>
                    <th className="py-2 px-3 text-left font-medium text-gray-500">Salesforce ID</th>
                  </tr>
                </thead>
                <tbody>
                  {createdRecords.map((record, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-600">{record.stepName}</td>
                      <td className="py-2 px-3">
                        <Badge variant="default">{record.objectType}</Badge>
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">{record.name}</td>
                      <td className="py-2 px-3 font-mono text-xs text-blue-600">{record.salesforceId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post-Deployment Results */}
      {postDeploymentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Post-Deployment Results ({postDeploymentResults.length})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {postDeploymentResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        result.type === 'GET' ? 'bg-blue-200 text-blue-700' : 'bg-green-200 text-green-700'
                      }`}>
                        {result.type}
                      </span>
                      <span className="font-medium text-gray-900">{result.operationName}</span>
                    </div>
                    <Badge variant={result.success ? 'success' : 'error'}>
                      {result.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                  <code className="text-xs bg-white/50 px-2 py-1 rounded text-gray-700 block truncate">
                    {result.endpoint}
                  </code>
                  {result.error && (
                    <p className="text-sm text-red-600 mt-2">{result.error}</p>
                  )}
                  {result.success && result.response !== undefined && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                        View Response
                      </summary>
                      <pre className="text-xs bg-white/50 p-2 rounded mt-1 overflow-x-auto max-h-40">
                        {JSON.stringify(result.response, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deployment Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Deployment Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-4 max-h-80 overflow-y-auto font-mono text-sm">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3 py-1">
                  <span className="text-gray-500 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`flex-shrink-0 w-16 ${
                      log.level === 'error'
                        ? 'text-red-400'
                        : log.level === 'warning'
                        ? 'text-yellow-400'
                        : log.level === 'success'
                        ? 'text-green-400'
                        : 'text-blue-400'
                    }`}
                  >
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="text-gray-100 flex-1">{log.message}</span>
                  {log.salesforceId && (
                    <span className="text-cyan-400 font-mono text-xs">{log.salesforceId}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
