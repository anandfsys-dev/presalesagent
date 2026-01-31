'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { useConfigData, type DataEntry, type ConfigDataState } from '@/contexts/ConfigDataContext';
import type { ColumnDefinition } from '@/types';

interface EntryFormProps {
  stepId: keyof ConfigDataState;
  columns: ColumnDefinition[];
  entry?: DataEntry;
  onSubmit: (entry: DataEntry) => void;
  onCancel: () => void;
}

export function EntryForm({ stepId, columns, entry, onSubmit, onCancel }: EntryFormProps) {
  const { getReferenceOptions } = useConfigData();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data
  useEffect(() => {
    if (entry) {
      setFormData({ ...entry });
    } else {
      // Set default values
      const defaults: Record<string, unknown> = {};
      for (const col of columns) {
        if (col.type === 'boolean') {
          defaults[col.name] = col.defaultValue === 'true' || false;
        } else if (col.defaultValue) {
          defaults[col.name] = col.defaultValue;
        }
      }
      setFormData(defaults);
    }
  }, [entry, columns]);

  const handleChange = (name: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const col of columns) {
      const value = formData[col.name];

      if (col.required && (value === undefined || value === '' || value === null)) {
        newErrors[col.name] = `${col.name.replace(/_/g, ' ')} is required`;
      }

      if (col.type === 'number' && value !== undefined && value !== '' && isNaN(Number(value))) {
        newErrors[col.name] = 'Must be a valid number';
      }

      if (col.type === 'currency' && value !== undefined && value !== '' && isNaN(Number(value))) {
        newErrors[col.name] = 'Must be a valid amount';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Convert form data to proper types
    const processedData: Record<string, unknown> = { ...formData };

    for (const col of columns) {
      const value = formData[col.name];

      if (col.type === 'number' || col.type === 'currency') {
        if (value !== undefined && value !== '') {
          processedData[col.name] = Number(value);
        }
      } else if (col.type === 'boolean') {
        processedData[col.name] = Boolean(value);
      }
    }

    // Keep the _id if editing
    if (entry?._id) {
      processedData._id = entry._id;
    }

    onSubmit(processedData as unknown as DataEntry);
  };

  const renderField = (col: ColumnDefinition) => {
    const value = formData[col.name];
    const error = errors[col.name];

    // Reference fields get dropdown
    if (col.type === 'reference') {
      const options = getReferenceOptions(stepId, col.name);
      return (
        <div key={col.name} className="space-y-1">
          <Select
            label={`${col.name.replace(/_/g, ' ')}${col.required ? ' *' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleChange(col.name, e.target.value)}
            options={[
              { value: '', label: `Select ${col.name.replace(/_/g, ' ')}` },
              ...options,
            ]}
            error={error}
          />
          {col.description && (
            <p className="text-xs text-gray-500">{col.description}</p>
          )}
        </div>
      );
    }

    // Boolean fields get checkbox
    if (col.type === 'boolean') {
      return (
        <div key={col.name} className="space-y-1">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleChange(col.name, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <span className="text-sm font-medium text-gray-700">
              {col.name.replace(/_/g, ' ')}
            </span>
          </label>
          {col.description && (
            <p className="text-xs text-gray-500 ml-6">{col.description}</p>
          )}
        </div>
      );
    }

    // Date fields
    if (col.type === 'date') {
      return (
        <div key={col.name}>
          <Input
            type="date"
            label={`${col.name.replace(/_/g, ' ')}${col.required ? ' *' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleChange(col.name, e.target.value)}
            error={error}
          />
          {col.description && (
            <p className="text-xs text-gray-500 mt-1">{col.description}</p>
          )}
        </div>
      );
    }

    // Number/Currency fields
    if (col.type === 'number' || col.type === 'currency') {
      return (
        <div key={col.name}>
          <Input
            type="number"
            label={`${col.name.replace(/_/g, ' ')}${col.required ? ' *' : ''}${col.type === 'currency' ? ' ($)' : ''}`}
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => handleChange(col.name, e.target.value)}
            error={error}
            step={col.type === 'currency' ? '0.01' : '1'}
          />
          {col.description && (
            <p className="text-xs text-gray-500 mt-1">{col.description}</p>
          )}
        </div>
      );
    }

    // Default: text input
    return (
      <div key={col.name}>
        <Input
          label={`${col.name.replace(/_/g, ' ')}${col.required ? ' *' : ''}`}
          value={String(value || '')}
          onChange={(e) => handleChange(col.name, e.target.value)}
          error={error}
        />
        {col.description && (
          <p className="text-xs text-gray-500 mt-1">{col.description}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {columns.map(renderField)}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {entry ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  );
}
