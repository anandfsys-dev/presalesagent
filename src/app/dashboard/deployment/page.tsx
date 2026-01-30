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
import type { WorksheetData, SalesforceConnection } from '@/types';

interface DeploymentData {
  connectionId: string;
  fileName: string;
  worksheets: WorksheetData[];
}

interface DeploymentProgress {
  currentStep: string;
  currentStepIndex: number;
  totalSteps: number;
  processedRecords: number;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
}

interface DeploymentLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
}

type DeploymentMode = 'full' | 'incremental' | 'validation_only';

export default function DeploymentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [deploymentData, setDeploymentData] = useState<DeploymentData | null>(null);
  const [connection, setConnection] = useState<SalesforceConnection | null>(null);
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>('full');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentComplete, setDeploymentComplete] = useState(false);
  const [progress, setProgress] = useState<DeploymentProgress | null>(null);
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    totalObjects: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
  } | null>(null);

  // Load deployment data from session storage
  useEffect(() => {
    const storedData = sessionStorage.getItem('deploymentData');
    if (storedData) {
      const data: DeploymentData = JSON.parse(storedData);
      setDeploymentData(data);

      // Fetch connection details
      const fetchConnection = async () => {
        const { data: conn } = await supabase
          .from('connections')
          .select('*')
          .eq('id', data.connectionId)
          .single();

        if (conn) {
          setConnection(conn);
        }
      };

      fetchConnection();
    }
  }, [supabase]);

  const addLog = useCallback((level: DeploymentLog['level'], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        level,
        message,
      },
    ]);
  }, []);

  const handleStartDeployment = async () => {
    if (!deploymentData || !connection) return;

    setIsDeploying(true);
    setDeploymentComplete(false);
    setError(null);
    setLogs([]);
    setResult(null);

    addLog('info', `Starting ${deploymentMode} deployment to ${connection.name}`);
    addLog('info', `Processing file: ${deploymentData.fileName}`);

    try {
      const response = await fetch('/api/deployment/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: deploymentData.connectionId,
          fileName: deploymentData.fileName,
          worksheets: deploymentData.worksheets,
          mode: deploymentMode,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const event = JSON.parse(line);

            if (event.type === 'progress') {
              setProgress(event.data);
            } else if (event.type === 'log') {
              addLog(event.data.level, event.data.message);
            } else if (event.type === 'complete') {
              setResult(event.data);
              setDeploymentComplete(true);
            } else if (event.type === 'error') {
              setError(event.data.message);
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
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
    // In a real implementation, this would abort the fetch request
    setIsDeploying(false);
    addLog('warning', 'Deployment cancelled by user');
  };

  const getTotalRecords = () => {
    if (!deploymentData) return 0;
    return deploymentData.worksheets.reduce((sum, ws) => sum + ws.rowCount, 0);
  };

  if (!deploymentData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Deployment</h1>
          <p className="text-gray-600 mt-1">No deployment data available</p>
        </div>

        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Template Uploaded
            </h3>
            <p className="text-gray-600 mb-6">
              Upload an Excel template first to start a deployment.
            </p>
            <Button onClick={() => router.push('/dashboard/upload')}>
              Go to Upload
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
          Deploy configuration to Salesforce
        </p>
      </div>

      {/* Deployment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Template File
              </label>
              <p className="text-gray-900 font-medium">{deploymentData.fileName}</p>
              <p className="text-sm text-gray-500">
                {getTotalRecords()} total records across {deploymentData.worksheets.length} worksheets
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Target Connection
              </label>
              <p className="text-gray-900 font-medium">{connection?.name || 'Loading...'}</p>
              <p className="text-sm text-gray-500">{connection?.instance_url}</p>
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

            <div className="flex items-end">
              {!isDeploying && !deploymentComplete && (
                <Button onClick={handleStartDeployment} className="w-full md:w-auto">
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
                  <Button onClick={() => router.push('/dashboard/upload')}>
                    New Deployment
                  </Button>
                </div>
              )}
            </div>
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
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Step {progress.currentStepIndex + 1} of {progress.totalSteps}: {progress.currentStep}
                    </span>
                    <span className="text-sm text-gray-500">
                      {progress.processedRecords} / {progress.totalRecords} records
                    </span>
                  </div>
                  <ProgressBar
                    value={progress.processedRecords}
                    max={progress.totalRecords}
                    showPercentage
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold text-green-700">{progress.successCount}</p>
                    <p className="text-sm text-green-600">Successful</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold text-red-700">{progress.failureCount}</p>
                    <p className="text-sm text-red-600">Failed</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold text-gray-700">{progress.skippedCount}</p>
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
                All {result.successCount} objects were created successfully.
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

      {/* Logs */}
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
                        : log.level === 'info'
                        ? 'text-blue-400'
                        : 'text-gray-400'
                    }`}
                  >
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="text-gray-100">{log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Worksheets Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Worksheet</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Records</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Columns</th>
                </tr>
              </thead>
              <tbody>
                {deploymentData.worksheets.map((ws) => (
                  <tr key={ws.name} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{ws.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{ws.rowCount}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {ws.columns.slice(0, 5).join(', ')}
                      {ws.columns.length > 5 && ` +${ws.columns.length - 5} more`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
