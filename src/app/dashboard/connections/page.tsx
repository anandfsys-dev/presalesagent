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
  ModalFooter,
  Input,
  Alert,
  Spinner,
} from '@/components/ui';
import type { SalesforceConnection, ConnectionFormData } from '@/types';

export default function ConnectionsPage() {
  const supabase = createClient();
  const [connections, setConnections] = useState<SalesforceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<SalesforceConnection | null>(null);
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    instance_url: 'https://login.salesforce.com',
    client_id: '',
    client_secret: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching connections:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Check connection status
  const checkConnectionStatus = useCallback(async (connectionId: string) => {
    setCheckingStatus((prev) => new Set(prev).add(connectionId));

    try {
      const response = await fetch('/api/salesforce/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      const result = await response.json();

      // Update connection status in state
      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === connectionId
            ? {
                ...conn,
                status: response.ok ? 'active' : 'error',
                last_connected: response.ok ? new Date().toISOString() : conn.last_connected,
              }
            : conn
        )
      );

      if (!response.ok) {
        console.warn(`Connection ${connectionId} check failed:`, result.error);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === connectionId ? { ...conn, status: 'error' } : conn
        )
      );
    } finally {
      setCheckingStatus((prev) => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  }, []);

  // Check all connections on page load
  useEffect(() => {
    const initAndCheck = async () => {
      const fetchedConnections = await fetchConnections();
      // Check status of all connections in parallel
      if (fetchedConnections.length > 0) {
        fetchedConnections.forEach((conn) => {
          checkConnectionStatus(conn.id);
        });
      }
    };
    initAndCheck();
  }, [fetchConnections, checkConnectionStatus]);

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      // Call API to initiate OAuth flow with Salesforce
      const response = await fetch('/api/salesforce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to connect to Salesforce');
      }

      // If OAuth URL is returned, redirect to Salesforce login
      if (result.authUrl) {
        // Store connection data temporarily
        sessionStorage.setItem('pendingConnection', JSON.stringify({
          name: formData.name,
          client_id: formData.client_id,
          client_secret: formData.client_secret,
          instance_url: formData.instance_url,
        }));
        // Redirect to Salesforce OAuth
        window.location.href = result.authUrl;
        return;
      }

      setShowAddModal(false);
      setFormData({
        name: '',
        instance_url: 'https://login.salesforce.com',
        client_id: '',
        client_secret: '',
      });
      setStatusMessage({ type: 'success', message: 'Connection added successfully' });
      fetchConnections();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConnection = async () => {
    if (!selectedConnection) return;

    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', selectedConnection.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setSelectedConnection(null);
      setStatusMessage({ type: 'success', message: 'Connection deleted successfully' });
      fetchConnections();
    } catch (error) {
      console.error('Error deleting connection:', error);
      setStatusMessage({ type: 'error', message: 'Failed to delete connection' });
    }
  };

  const handleSetDefault = async (connectionId: string) => {
    try {
      // First, unset all defaults
      await supabase
        .from('connections')
        .update({ is_default: false })
        .neq('id', '');

      // Set new default
      await supabase
        .from('connections')
        .update({ is_default: true })
        .eq('id', connectionId);

      fetchConnections();
      setStatusMessage({ type: 'success', message: 'Default connection updated' });
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const handleRefreshConnection = (connectionId: string) => {
    checkConnectionStatus(connectionId);
  };

  const handleReauthenticate = async (connectionId: string) => {
    setFormLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/salesforce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate re-authentication');
      }

      if (result.authUrl) {
        window.location.href = result.authUrl;
        return;
      }

      setStatusMessage({ type: 'success', message: 'Re-authentication initiated' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Re-authentication failed',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expired':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Connections</h1>
          <p className="text-gray-600 mt-1">
            Manage your Salesforce org connections
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Connection
        </Button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <Alert
          variant={statusMessage.type}
          onClose={() => setStatusMessage(null)}
        >
          {statusMessage.message}
        </Alert>
      )}

      {/* Connections List */}
      {connections.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Connections
            </h3>
            <p className="text-gray-600 mb-6">
              Add your first Salesforce connection to get started
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              Add Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {connection.name}
                        </h3>
                        {connection.is_default && (
                          <Badge variant="default">Default</Badge>
                        )}
                        <Badge variant={getStatusColor(connection.status)}>
                          {checkingStatus.has(connection.id) ? (
                            <span className="flex items-center gap-1">
                              <Spinner size="sm" />
                              Checking...
                            </span>
                          ) : (
                            connection.status
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {connection.instance_url}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>Org ID: {connection.org_id || 'N/A'}</span>
                        <span>Type: {connection.org_type || 'Unknown'}</span>
                        {connection.last_connected && (
                          <span>
                            Last connected: {new Date(connection.last_connected).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshConnection(connection.id)}
                      disabled={checkingStatus.has(connection.id)}
                      title="Test Connection"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReauthenticate(connection.id)}
                      disabled={formLoading}
                      title="Re-authenticate"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </Button>
                    {!connection.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(connection.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedConnection(connection);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      title="Delete Connection"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Connection Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormError(null);
        }}
        title="Add Salesforce Connection"
      >
        <form onSubmit={handleAddConnection}>
          <div className="space-y-4">
            {formError && (
              <Alert variant="error">{formError}</Alert>
            )}

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">OAuth 2.0 Authentication</h4>
              <p className="text-sm text-blue-700">
                Enter your Connected App credentials. You&apos;ll be redirected to Salesforce to authorize the connection.
              </p>
            </div>

            <Input
              label="Connection Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Production Org, Sandbox"
              required
            />

            <Input
              label="Salesforce Login URL"
              value={formData.instance_url}
              onChange={(e) => setFormData({ ...formData, instance_url: e.target.value })}
              placeholder="https://login.salesforce.com or https://test.salesforce.com"
              helperText="Use test.salesforce.com for sandboxes"
              required
            />

            <Input
              label="Connected App Client ID (Consumer Key)"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              placeholder="Enter your Connected App Consumer Key"
              required
            />

            <Input
              label="Connected App Client Secret (Consumer Secret)"
              type="password"
              value={formData.client_secret}
              onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
              placeholder="Enter your Connected App Consumer Secret"
              required
            />

            <div className="p-3 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Don&apos;t have a Connected App?
              </h5>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Go to Setup &gt; App Manager in Salesforce</li>
                <li>Click &quot;New Connected App&quot;</li>
                <li>Enable OAuth Settings</li>
                <li>Set Callback URL to: <code className="bg-gray-200 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback</code></li>
                <li>Select scopes: api, refresh_token, full</li>
                <li>Save and copy the Consumer Key and Secret</li>
              </ol>
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={formLoading}>
              Connect to Salesforce
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedConnection(null);
        }}
        title="Delete Connection"
      >
        <p className="text-gray-600">
          Are you sure you want to delete the connection &quot;{selectedConnection?.name}&quot;?
          This action cannot be undone.
        </p>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteModal(false);
              setSelectedConnection(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConnection}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
