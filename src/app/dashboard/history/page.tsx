'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Modal,
  Select,
} from '@/components/ui';
import { format } from 'date-fns';

interface Deployment {
  id: string;
  connection_id: string;
  template_file_name: string;
  status: string;
  mode: string;
  started_at: string;
  completed_at: string | null;
  summary: {
    total_objects?: number;
    success_count?: number;
    failure_count?: number;
    skipped_count?: number;
    duration_seconds?: number;
  };
  created_at: string;
  connections?: {
    name: string;
  };
}

interface DeploymentDetail {
  id: string;
  step_id: string;
  object_type: string;
  object_name: string;
  salesforce_id: string | null;
  status: string;
  error_message: string | null;
}

export default function HistoryPage() {
  const supabase = createClient();

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [deploymentDetails, setDeploymentDetails] = useState<DeploymentDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchDeployments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('deployments')
        .select(`
          *,
          connections (name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDeployments(data || []);
    } catch (error) {
      console.error('Error fetching deployments:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  const handleViewDetails = async (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setDetailsLoading(true);

    try {
      const { data } = await supabase
        .from('deployment_details')
        .select('*')
        .eq('deployment_id', deployment.id)
        .order('step_order', { ascending: true });

      setDeploymentDetails(data || []);
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'in_progress':
        return <Badge variant="info">In Progress</Badge>;
      case 'rolled_back':
        return <Badge variant="warning">Rolled Back</Badge>;
      case 'validation_only':
        return <Badge variant="default">Validation Only</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Deployment History</h1>
          <p className="text-gray-600 mt-1">
            View past deployments and their results
          </p>
        </div>
        <Button variant="outline" onClick={fetchDeployments}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              label="Status Filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'validation_only', label: 'Validation Only' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Deployments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : deployments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No deployments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Template</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Connection</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Results</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Duration</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Date</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((deployment) => (
                    <tr key={deployment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {deployment.template_file_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {deployment.connections?.name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(deployment.status)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="text-green-600">{deployment.summary?.success_count || 0}</span>
                        {' / '}
                        <span className="text-red-600">{deployment.summary?.failure_count || 0}</span>
                        {' / '}
                        <span className="text-gray-400">{deployment.summary?.skipped_count || 0}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDuration(deployment.summary?.duration_seconds)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {format(new Date(deployment.created_at), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(deployment)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedDeployment}
        onClose={() => setSelectedDeployment(null)}
        title="Deployment Details"
        size="xl"
      >
        {selectedDeployment && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Template</p>
                <p className="font-medium">{selectedDeployment.template_file_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                {getStatusBadge(selectedDeployment.status)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Objects</p>
                <p className="font-medium">{selectedDeployment.summary?.total_objects || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">
                  {formatDuration(selectedDeployment.summary?.duration_seconds)}
                </p>
              </div>
            </div>

            {/* Results Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-semibold text-green-700">
                  {selectedDeployment.summary?.success_count || 0}
                </p>
                <p className="text-sm text-green-600">Successful</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-semibold text-red-700">
                  {selectedDeployment.summary?.failure_count || 0}
                </p>
                <p className="text-sm text-red-600">Failed</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-semibold text-gray-700">
                  {selectedDeployment.summary?.skipped_count || 0}
                </p>
                <p className="text-sm text-gray-600">Skipped</p>
              </div>
            </div>

            {/* Details Table */}
            {detailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
              </div>
            ) : deploymentDetails.length > 0 ? (
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Object Type</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Salesforce ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deploymentDetails.map((detail) => (
                      <tr key={detail.id} className="border-t">
                        <td className="px-3 py-2">{detail.object_type}</td>
                        <td className="px-3 py-2">{detail.object_name}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              detail.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : detail.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {detail.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {detail.salesforce_id || (
                            <span className="text-red-500" title={detail.error_message || ''}>
                              {detail.error_message ? 'Error' : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No detail records found</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
