'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input } from '@/components/ui';

interface SalesforceRecord {
  Id: string;
  Name: string;
  [key: string]: unknown;
}

interface SalesforceRecordPickerProps {
  connectionId: string;
  sobjectName: string;
  sobjectLabel?: string;
  onSelect: (record: { id: string; name: string }) => void;
  onClose: () => void;
  currentValue?: string;
}

export function SalesforceRecordPicker({
  connectionId,
  sobjectName,
  sobjectLabel,
  onSelect,
  onClose,
  currentValue,
}: SalesforceRecordPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<SalesforceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(currentValue || null);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch records from Salesforce
  const fetchRecords = useCallback(async (search?: string) => {
    if (!connectionId || !sobjectName) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        connectionId,
        sobject: sobjectName,
        limit: '50',
      });

      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/salesforce/records?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch records');
      }

      setRecords(data.records || []);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [connectionId, sobjectName]);

  // Fetch initial records on mount
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Handle search
  const handleSearch = () => {
    fetchRecords(searchTerm);
  };

  // Handle key press for search
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle select
  const handleSelect = () => {
    const record = records.find(r => r.Id === selectedId);
    if (record) {
      onSelect({ id: record.Id, name: record.Name });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Select {sobjectLabel || sobjectName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Search and select a record from Salesforce
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex gap-2">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Search ${sobjectLabel || sobjectName}...`}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Records List */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-4 text-center text-red-600 text-sm">
              {error}
            </div>
          )}

          {!error && loading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-3">Loading records...</p>
            </div>
          )}

          {!error && !loading && records.length === 0 && hasSearched && (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No records found</p>
              {searchTerm && (
                <p className="text-xs mt-1">Try a different search term</p>
              )}
            </div>
          )}

          {!error && !loading && records.length > 0 && (
            <div className="divide-y divide-gray-100">
              {records.map((record) => (
                <button
                  key={record.Id}
                  onClick={() => setSelectedId(record.Id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors ${
                    selectedId === record.Id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div>
                    <p className={`font-medium ${selectedId === record.Id ? 'text-blue-700' : 'text-gray-900'}`}>
                      {record.Name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{record.Id}</p>
                  </div>
                  {selectedId === record.Id && (
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-500">
            {records.length > 0 ? `${records.length} records found` : ''}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSelect} disabled={!selectedId}>
              Select Record
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
