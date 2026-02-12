'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Input,
  Select,
  Alert,
} from '@/components/ui';
import { DEFAULT_PIPELINE_CONFIG } from '@/lib/pipeline/config';

interface UserSettings {
  api_version: string;
  batch_size: number;
  max_retries: number;
  session_timeout: number;
  logging_level: string;
  auto_refresh_tokens: boolean;
  deployment_mode: string;
  theme: string;
}

const defaultSettings: UserSettings = {
  api_version: '65.0',
  batch_size: 200,
  max_retries: 3,
  session_timeout: 1800,
  logging_level: 'info',
  auto_refresh_tokens: true,
  deployment_mode: 'continue_on_errors',
  theme: 'light',
};

export default function SettingsPage() {
  const supabase = createClient();

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setSettings({
          api_version: data.api_version || defaultSettings.api_version,
          batch_size: data.batch_size || defaultSettings.batch_size,
          max_retries: data.max_retries || defaultSettings.max_retries,
          session_timeout: data.session_timeout || defaultSettings.session_timeout,
          logging_level: data.logging_level || defaultSettings.logging_level,
          auto_refresh_tokens: data.auto_refresh_tokens ?? defaultSettings.auto_refresh_tokens,
          deployment_mode: data.deployment_mode || defaultSettings.deployment_mode,
          theme: data.theme || defaultSettings.theme,
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 pb-12 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure application preferences and defaults
        </p>
      </div>

      {success && (
        <Alert variant="success" onClose={() => setSuccess(false)}>
          Settings saved successfully
        </Alert>
      )}

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Salesforce API Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Salesforce API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="API Version"
              value={settings.api_version}
              onChange={(e) => setSettings({ ...settings, api_version: e.target.value })}
              options={[
                { value: '64.0', label: 'v64.0 (Spring \'25)' },
                { value: '65.0', label: 'v65.0 (Summer \'25)' },
                { value: '66.0', label: 'v66.0 (Winter \'26)' },
              ]}
              helperText="Salesforce REST API version to use"
            />

            <Input
              label="Batch Size"
              type="number"
              value={settings.batch_size}
              onChange={(e) => setSettings({ ...settings, batch_size: parseInt(e.target.value) || 200 })}
              helperText="Number of records per API batch (max 200)"
            />

            <Input
              label="Max Retries"
              type="number"
              value={settings.max_retries}
              onChange={(e) => setSettings({ ...settings, max_retries: parseInt(e.target.value) || 3 })}
              helperText="Number of retry attempts for failed API calls"
            />

            <Select
              label="Auto Refresh Tokens"
              value={settings.auto_refresh_tokens ? 'true' : 'false'}
              onChange={(e) => setSettings({ ...settings, auto_refresh_tokens: e.target.value === 'true' })}
              options={[
                { value: 'true', label: 'Enabled' },
                { value: 'false', label: 'Disabled' },
              ]}
              helperText="Automatically refresh expired access tokens"
            />
          </div>
        </CardContent>
      </Card>

      {/* Deployment Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Error Handling"
              value={settings.deployment_mode}
              onChange={(e) => setSettings({ ...settings, deployment_mode: e.target.value })}
              options={[
                { value: 'continue_on_errors', label: 'Continue on errors' },
                { value: 'stop_on_error', label: 'Stop on first error' },
              ]}
              helperText="How to handle errors during deployment"
            />

            <Select
              label="Logging Level"
              value={settings.logging_level}
              onChange={(e) => setSettings({ ...settings, logging_level: e.target.value })}
              options={[
                { value: 'debug', label: 'Debug (verbose)' },
                { value: 'info', label: 'Info (standard)' },
                { value: 'warning', label: 'Warning' },
                { value: 'error', label: 'Error only' },
              ]}
              helperText="Level of detail in deployment logs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Session Timeout (seconds)"
              type="number"
              value={settings.session_timeout}
              onChange={(e) => setSettings({ ...settings, session_timeout: parseInt(e.target.value) || 1800 })}
              helperText="Idle timeout before requiring re-authentication"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Configuration Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Current deployment pipeline has {DEFAULT_PIPELINE_CONFIG.steps.length} steps:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {DEFAULT_PIPELINE_CONFIG.steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
              >
                <span className="w-6 h-6 flex items-center justify-center bg-black text-white text-xs font-medium rounded-full">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-700">{step.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Pipeline configuration can be customized in future versions.
            Steps are executed in dependency order.
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardFooter className="flex items-center justify-end gap-4">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
