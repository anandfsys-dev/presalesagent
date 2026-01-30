'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
  Select,
} from '@/components/ui';
import { parseExcelFile, validateExcelData, getExcelSummary } from '@/lib/excel/parser';
import type { SalesforceConnection, ValidationError, ValidationWarning } from '@/types';

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();

  const [connections, setConnections] = useState<SalesforceConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ReturnType<typeof parseExcelFile> | null>(null);
  const [validationResult, setValidationResult] = useState<{ errors: ValidationError[]; warnings: ValidationWarning[] } | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Fetch connections on mount
  useEffect(() => {
    const fetchConnections = async () => {
      const { data } = await supabase
        .from('connections')
        .select('*')
        .eq('status', 'active')
        .order('is_default', { ascending: false });

      if (data) {
        setConnections(data);
        // Select default connection
        const defaultConn = data.find((c) => c.is_default);
        if (defaultConn) {
          setSelectedConnection(defaultConn.id);
        } else if (data.length > 0) {
          setSelectedConnection(data[0].id);
        }
      }
    };

    fetchConnections();
  }, [supabase]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
      processFile(droppedFile);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setParsing(true);
    setParsedData(null);
    setValidationResult(null);
    setSummary(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const parsed = parseExcelFile(buffer, selectedFile.name, selectedFile.size);

      setParsedData(parsed);

      if (parsed.parseErrors.length === 0) {
        const validation = validateExcelData(parsed);
        setValidationResult(validation);
        setSummary(getExcelSummary(parsed));
      }
    } catch (error) {
      console.error('Error parsing file:', error);
    } finally {
      setParsing(false);
    }
  };

  const handleValidate = () => {
    if (parsedData) {
      const validation = validateExcelData(parsedData);
      setValidationResult(validation);
    }
  };

  const handleDeploy = () => {
    if (!selectedConnection || !parsedData) return;

    // Store parsed data in session storage for the deployment page
    sessionStorage.setItem('deploymentData', JSON.stringify({
      connectionId: selectedConnection,
      fileName: file?.name,
      worksheets: parsedData.worksheets,
    }));

    router.push('/dashboard/deployment');
  };

  const canDeploy = parsedData &&
    parsedData.parseErrors.length === 0 &&
    validationResult &&
    validationResult.errors.length === 0 &&
    selectedConnection;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Upload Template</h1>
        <p className="text-gray-600 mt-1">
          Upload an Excel template to configure your Salesforce Revenue Cloud
        </p>
      </div>

      {/* Connection Selector */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                label="Target Connection"
                value={selectedConnection}
                onChange={(e) => setSelectedConnection(e.target.value)}
                options={connections.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.instance_url})`,
                }))}
                placeholder="Select a Salesforce connection"
              />
            </div>
            {connections.length === 0 && (
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/connections')}
              >
                Add Connection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Excel Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-12 text-center transition-colors
              ${dragActive ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drop your Excel file here
                </p>
                <p className="text-gray-500">
                  or click to browse (.xlsx files only)
                </p>
              </div>
            </div>
          </div>

          {/* Download Template Link */}
          <div className="mt-4 text-center">
            <a
              href="/templates/rca-template.xlsx"
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Download sample template
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Parsing Status */}
      {parsing && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
              <span className="text-gray-600">Parsing Excel file...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Info & Summary */}
      {parsedData && !parsing && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {parsedData.fileName}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parsedData.parseErrors.length > 0 ? (
              <Alert variant="error" title="Parse Errors">
                <ul className="list-disc list-inside">
                  {parsedData.parseErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </Alert>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  File size: {(parsedData.fileSize / 1024).toFixed(2)} KB |{' '}
                  {parsedData.worksheets.length} worksheets detected
                </p>

                {summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Object.entries(summary).map(([name, count]) => (
                      <div
                        key={name}
                        className="bg-gray-50 rounded-lg p-3 text-center"
                      >
                        <p className="text-sm font-medium text-gray-900">{name}</p>
                        <p className="text-2xl font-semibold text-gray-700">{count}</p>
                        <p className="text-xs text-gray-500">records</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-3">
                Validation Results
                {validationResult.errors.length === 0 ? (
                  <Badge variant="success">Passed</Badge>
                ) : (
                  <Badge variant="error">{validationResult.errors.length} Errors</Badge>
                )}
                {validationResult.warnings.length > 0 && (
                  <Badge variant="warning">{validationResult.warnings.length} Warnings</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validationResult.errors.length === 0 && validationResult.warnings.length === 0 ? (
              <Alert variant="success" title="Validation Passed">
                All data validated successfully. Ready for deployment.
              </Alert>
            ) : (
              <div className="space-y-4">
                {validationResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Errors (must fix)</h4>
                    <div className="max-h-60 overflow-y-auto border border-red-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-red-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Worksheet</th>
                            <th className="px-3 py-2 text-left">Row</th>
                            <th className="px-3 py-2 text-left">Column</th>
                            <th className="px-3 py-2 text-left">Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validationResult.errors.map((error, i) => (
                            <tr key={i} className="border-t border-red-100">
                              <td className="px-3 py-2">{error.worksheet}</td>
                              <td className="px-3 py-2">{error.row}</td>
                              <td className="px-3 py-2">{error.column}</td>
                              <td className="px-3 py-2 text-red-700">{error.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {validationResult.warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">Warnings (review recommended)</h4>
                    <div className="max-h-40 overflow-y-auto border border-yellow-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-yellow-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Worksheet</th>
                            <th className="px-3 py-2 text-left">Row</th>
                            <th className="px-3 py-2 text-left">Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validationResult.warnings.map((warning, i) => (
                            <tr key={i} className="border-t border-yellow-100">
                              <td className="px-3 py-2">{warning.worksheet}</td>
                              <td className="px-3 py-2">{warning.row}</td>
                              <td className="px-3 py-2 text-yellow-700">{warning.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {parsedData && parsedData.parseErrors.length === 0 && (
        <div className="flex items-center justify-end gap-4">
          <Button variant="outline" onClick={handleValidate}>
            Re-validate
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={!canDeploy}
          >
            {canDeploy ? 'Proceed to Deployment' : 'Fix Errors to Deploy'}
          </Button>
        </div>
      )}
    </div>
  );
}
