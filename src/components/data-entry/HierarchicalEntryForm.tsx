'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { useHierarchicalData } from '@/contexts/HierarchicalDataContext';
import type { SchemaObject, SchemaField, HierarchicalEntry } from '@/lib/schema';

interface HierarchicalEntryFormProps {
  object: SchemaObject;
  entry?: HierarchicalEntry;
  parentEntry?: HierarchicalEntry;
  parentLinkField?: string;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function HierarchicalEntryForm({
  object,
  entry,
  parentEntry,
  parentLinkField,
  onSubmit,
  onCancel,
}: HierarchicalEntryFormProps) {
  const { getReferenceOptions, schema } = useHierarchicalData();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data
  useEffect(() => {
    if (entry) {
      setFormData({ ...entry.data });
    } else {
      // Set default values
      const defaults: Record<string, unknown> = {};
      for (const field of object.fields) {
        if (field.defaultValue !== undefined) {
          defaults[field.name] = field.defaultValue;
        }
        // If there's a parent link, set it automatically
        if (parentEntry && parentLinkField && field.name === parentLinkField) {
          const parentObject = schema.objects.find(o => o.id === parentEntry._objectId);
          if (parentObject) {
            defaults[field.name] = parentEntry.data[parentObject.identifierField];
          }
        }
      }
      setFormData(defaults);
    }
  }, [entry, object.fields, parentEntry, parentLinkField, schema.objects]);

  const handleChange = (name: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of object.fields) {
      const value = formData[field.name];

      if (field.required && (value === undefined || value === '' || value === null)) {
        newErrors[field.name] = `${field.label} is required`;
      }

      if ((field.type === 'number' || field.type === 'currency') &&
          value !== undefined && value !== '' && isNaN(Number(value))) {
        newErrors[field.name] = 'Must be a valid number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Process and convert data types
    const processedData: Record<string, unknown> = {};
    for (const field of object.fields) {
      const value = formData[field.name];
      if (value !== undefined && value !== '') {
        if (field.type === 'number' || field.type === 'currency') {
          processedData[field.name] = Number(value);
        } else if (field.type === 'boolean') {
          processedData[field.name] = Boolean(value);
        } else {
          processedData[field.name] = value;
        }
      }
    }

    onSubmit(processedData);
  };

  const renderField = (field: SchemaField) => {
    const value = formData[field.name];
    const error = errors[field.name];

    // Skip auto-linked parent fields in child forms
    if (parentEntry && field.name === parentLinkField) {
      const parentObject = schema.objects.find(o => o.id === parentEntry._objectId);
      const displayValue = parentObject
        ? parentEntry.data[parentObject.displayField || parentObject.identifierField]
        : parentEntry._id;

      return (
        <div key={field.name} className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            {field.label}
          </label>
          <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
            {String(displayValue)} (auto-linked)
          </div>
        </div>
      );
    }

    // Reference/Lookup fields get dropdown
    if ((field.type === 'reference' || field.type === 'lookup') && field.referenceTo) {
      const options = getReferenceOptions(object.id, field.name);
      return (
        <div key={field.name}>
          <Select
            label={`${field.label}${field.required ? ' *' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleChange(field.name, e.target.value)}
            options={[
              { value: '', label: `Select ${field.label}` },
              ...options,
            ]}
            error={error}
          />
          {field.description && (
            <p className="text-xs text-gray-500 mt-1">{field.description}</p>
          )}
        </div>
      );
    }

    // Picklist fields
    if (field.type === 'picklist' && field.picklistValues) {
      return (
        <div key={field.name}>
          <Select
            label={`${field.label}${field.required ? ' *' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleChange(field.name, e.target.value)}
            options={[
              { value: '', label: `Select ${field.label}` },
              ...field.picklistValues.map(v => ({ value: v, label: v })),
            ]}
            error={error}
          />
        </div>
      );
    }

    // Boolean fields
    if (field.type === 'boolean') {
      return (
        <div key={field.name} className="flex items-center gap-2">
          <input
            type="checkbox"
            id={field.name}
            checked={Boolean(value)}
            onChange={(e) => handleChange(field.name, e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <label htmlFor={field.name} className="text-sm font-medium text-gray-700">
            {field.label}
          </label>
        </div>
      );
    }

    // Date fields
    if (field.type === 'date') {
      return (
        <div key={field.name}>
          <Input
            type="date"
            label={`${field.label}${field.required ? ' *' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleChange(field.name, e.target.value)}
            error={error}
          />
        </div>
      );
    }

    // Number/Currency fields
    if (field.type === 'number' || field.type === 'currency') {
      return (
        <div key={field.name}>
          <Input
            type="number"
            label={`${field.label}${field.required ? ' *' : ''}${field.type === 'currency' ? ' ($)' : ''}`}
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            error={error}
            step={field.type === 'currency' ? '0.01' : '1'}
          />
        </div>
      );
    }

    // Default: text input
    return (
      <div key={field.name}>
        <Input
          label={`${field.label}${field.required ? ' *' : ''}`}
          value={String(value || '')}
          onChange={(e) => handleChange(field.name, e.target.value)}
          error={error}
          placeholder={field.description}
        />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {object.fields.map(renderField)}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {entry ? 'Update' : 'Add'} {object.name}
        </Button>
      </div>
    </form>
  );
}
