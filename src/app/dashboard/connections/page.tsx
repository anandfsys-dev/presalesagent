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
  Select,
  Alert,
} from '@/components/ui';
import type { SalesforceConnection, ConnectionFormData } from '@/types';

export default function ConnectionsPage() {
  const supabase = createClient();
  const [connections, setConnections] = useState<SalesforceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<SalesforceConnection | null>(null);
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    instance_url: 'https://login.salesforce.com',
    username: '',
    password: '',
    security_token: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      // Call API to authenticate with Salesforce
      const response = await fetch('/api/salesforce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to connect to Salesforce');
      }

      setShowAddModal(false);
      setFormData({
        name: '',
        instance_url: 'https://login.salesforce.com',
        username: '',
        password: '',
        security_token: '',
      });
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
      fetchConnections();
    } catch (error) {
      console.error('Error deleting connection:', error);
    }
  };

  const handleSetDefault = async (connection: SalesforceConnection) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ is_default: true })
        .eq('id', connection.id);

      if (error) throw error;
      fetchConnections();
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const handleTestConnection = async (connection: SalesforceConnection) => {
    try {
      const response = await fetch('/api/salesforce/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: connection.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Connection test failed');
      }

      alert('Connection successful!');
      fetchConnections();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Connection test failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" dot>Active</Badge>;
      case 'expired':
        return <Badge variant="warning" dot>Expired</Badge>;
      case 'error':
        return <Badge variant="error" dot>Error</Badge>;
      default:
        return <Badge variant="default" dot>{status}</Badge>;
    }
  };

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Connection
        </Button>
      </div>

      {/* Connections List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : connections.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No connections yet
            </h3>
            <p className="text-gray-600 mb-6">
              Add your first Salesforce org connection to get started.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              Add Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id} hover>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{connection.name}</h3>
                        {connection.is_default && (
                          <Badge variant="info" size="sm">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{connection.instance_url}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-400">
                          Org ID: {connection.org_id || 'N/A'}
                        </span>
                        <span className="text-xs text-gray-400">
                          Type: {connection.org_type || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {getStatusBadge(connection.status)}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestConnection(connection)}
                      >
                        Test
                      </Button>
                      {!connection.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(connection)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedConnection(connection);
                          setShowDeleteModal(true);
                        }}
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
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
        size="lg"
      >
        <form onSubmit={handleAddConnection}>
          {formError && (
            <Alert variant="error" className="mb-4" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          <div className="space-y-4">
            <Input
              label="Connection Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Production Org"
              required
            />

            <Select
              label="Environment"
              value={formData.instance_url}
              onChange={(e) => setFormData({ ...formData, instance_url: e.target.value })}
              options={[
                { value: 'https://login.salesforce.com', label: 'Production / Developer' },
                { value: 'https://test.salesforce.com', label: 'Sandbox' },
              ]}
              required
            />

            <Input
              label="Username"
              type="email"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="admin@company.com"
              required
              helperText="Salesforce admin username"
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
              required
            />

            <Input
              label="Security Token"
              type="password"
              value={formData.security_token}
              onChange={(e) => setFormData({ ...formData, security_token: e.target.value })}
              placeholder="Enter security token"
              required
              helperText="Find this in Salesforce: Settings > My Personal Information > Reset Security Token"
            />
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={formLoading}>
              Connect
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
        size="sm"
      >
        <p className="text-gray-600">
          Are you sure you want to delete the connection{' '}
          <strong>{selectedConnection?.name}</strong>? This action cannot be undone.
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
          <Button variant="danger" onClick={handleDeleteConnection}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
