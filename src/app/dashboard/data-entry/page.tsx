'use client';

import React, { useState, useEffect } from 'react';
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
import { ConfigDataProvider, useConfigData } from '@/contexts/ConfigDataContext';
import { ObjectDataTable } from '@/components/data-entry';
import type { SalesforceConnection } from '@/types';

// Wrapper component that uses the context
function DataEntryContent() {
  const router = useRouter();
  const supabase = createClient();
  const { state, pipelineConfig, getTotalEntryCount, convertToWorksheetData, clearAll } = useConfigData();

  const [connections, setConnections] = useState<SalesforceConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set(['picklists']));

  // Fetch connections
  useEffect(() => {
    const fetchConnections = async () => {
      const { data } = await supabase
        .from('connections')
        .select('*')
        .eq('status', 'active')
        .order('is_default', { ascending: false });

      if (data) {
        setConnections(data);
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

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSteps(new Set(pipelineConfig.steps.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedSteps(new Set());
  };

  const handleDeploy = () => {
    if (!selectedConnection) return;

    const worksheetData = convertToWorksheetData();

    // Convert to the format expected by deployment page
    const worksheets = Object.entries(worksheetData).map(([name, { columns, data }]) => ({
      name,
      headers: columns,
      data: data.map((row, index) => ({ ...row, index })),
    }));

    sessionStorage.setItem('deploymentData', JSON.stringify({
      connectionId: selectedConnection,
      fileName: 'Manual Data Entry',
      worksheets,
    }));

    router.push('/dashboard/deployment');
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      clearAll();
    }
  };

  const totalEntries = getTotalEntryCount();

  // Group steps by category for visual hierarchy
  const stepGroups = [
    {
      title: 'Foundation Objects',
      description: 'Basic configuration objects with no dependencies',
      steps: pipelineConfig.steps.filter(s => s.dependsOn.length === 0),
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Dependent Objects',
      description: 'Objects that reference foundation objects',
      steps: pipelineConfig.steps.filter(s => s.dependsOn.length > 0 && !s.dependsOn.includes('products')),
      color: 'bg-green-50 border-green-200',
    },
    {
      title: 'Product-Related Objects',
      description: 'Objects related to products',
      steps: pipelineConfig.steps.filter(s => s.dependsOn.includes('products')),
      color: 'bg-purple-50 border-purple-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Comprehensive Data Entry</h1>
          <p className="text-gray-600 mt-1">
            Enter all configuration data in one place with automatic relationship mapping
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={totalEntries > 0 ? 'success' : 'default'}>
            {totalEntries} total entries
          </Badge>
        </div>
      </div>

      {/* Connection Selector */}
      <Card>
        <CardContent className="py-4">
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

      {/* Relationship Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Object Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center text-sm">
            {pipelineConfig.steps.map((step, index) => {
              const entryCount = state[step.id as keyof typeof state]?.length || 0;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => {
                      setExpandedSteps(new Set([step.id]));
                      document.getElementById(`step-${step.id}`)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`px-3 py-1.5 rounded-lg border transition-colors ${
                      entryCount > 0
                        ? 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100'
                        : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {step.name}
                    <span className="ml-1 text-xs">({entryCount})</span>
                  </button>
                  {index < pipelineConfig.steps.length - 1 && (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClear} disabled={totalEntries === 0}>
            Clear All Data
          </Button>
          <Button onClick={handleDeploy} disabled={totalEntries === 0 || !selectedConnection}>
            Proceed to Deployment
          </Button>
        </div>
      </div>

      {/* Data Entry Sections */}
      {stepGroups.map((group) => (
        <div key={group.title} className="space-y-4">
          <div className={`p-4 rounded-lg border ${group.color}`}>
            <h2 className="font-semibold text-gray-900">{group.title}</h2>
            <p className="text-sm text-gray-600">{group.description}</p>
          </div>

          <div className="space-y-4 pl-4 border-l-2 border-gray-200">
            {group.steps.map((step) => (
              <div key={step.id} id={`step-${step.id}`}>
                <ObjectDataTable
                  step={step}
                  expanded={expandedSteps.has(step.id)}
                  onToggle={() => toggleStep(step.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Summary */}
      {totalEntries > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Entry Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {pipelineConfig.steps.map((step) => {
                const count = state[step.id as keyof typeof state]?.length || 0;
                return (
                  <div
                    key={step.id}
                    className={`p-3 rounded-lg text-center ${
                      count > 0 ? 'bg-green-50' : 'bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate" title={step.name}>
                      {step.name}
                    </p>
                    <p className={`text-2xl font-semibold ${count > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {count}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleDeploy} disabled={!selectedConnection}>
                Deploy {totalEntries} Entries to Salesforce
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main page component with provider
export default function DataEntryPage() {
  return (
    <ConfigDataProvider>
      <DataEntryContent />
    </ConfigDataProvider>
  );
}
