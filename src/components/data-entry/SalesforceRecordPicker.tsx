'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  onMultiSelect?: (records: { id: string; name: string }[]) => void;
  onClose: () => void;
  currentValue?: string;
  multiSelect?: boolean;
  allowedIds?: Set<string> | null; // null = empty state, Set = filter, undefined = no filter
}

export function SalesforceRecordPicker({
  connectionId,
  sobjectName,
  sobjectLabel,
  onSelect,
  onMultiSelect,
  onClose,
  currentValue,
  multiSelect,
  allowedIds,
}: SalesforceRecordPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<SalesforceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(currentValue || null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Fetch initial records on mount (skip if allowedIds is null = empty state)
  useEffect(() => {
    if (allowedIds === null) return;
    fetchRecords();
  }, [fetchRecords, allowedIds]);

  // Filter records by allowed IDs when configured
  const filteredRecords = allowedIds instanceof Set
    ? records.filter(r => allowedIds.has(r.Id))
    : records;

  // Handle search
  const handleSearch = () => {
    if (allowedIds === null) return;
    fetchRecords(searchTerm);
  };

  // Handle key press for search
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle single select
  const handleSelect = () => {
    const record = filteredRecords.find(r => r.Id === selectedId);
    if (record) {
      onSelect({ id: record.Id, name: record.Name });
    }
    onClose();
  };

  // Toggle multi-select record
  const toggleRecord = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Handle multi-select confirm
  const handleMultiSelect = () => {
    const selected = filteredRecords
      .filter(r => selectedIds.has(r.Id))
      .map(r => ({ id: r.Id, name: r.Name }));
    onMultiSelect?.(selected);
  };

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Select {sobjectLabel || sobjectName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {multiSelect
                ? 'Select one or more records from Salesforce'
                : 'Search and select a record from Salesforce'}
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
          {/* Empty state when filter configured but source step has no entries */}
          {allowedIds === null && (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm font-medium">No allowed records</p>
              <p className="text-xs mt-1">Add entries to the source step first, then their Salesforce IDs will appear here.</p>
            </div>
          )}

          {allowedIds !== null && error && (
            <div className="p-4 text-center text-red-600 text-sm">
              {error}
            </div>
          )}

          {allowedIds !== null && !error && loading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-3">Loading records...</p>
            </div>
          )}

          {allowedIds !== null && !error && !loading && filteredRecords.length === 0 && hasSearched && (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No records found</p>
              {searchTerm && (
                <p className="text-xs mt-1">Try a different search term</p>
              )}
              {allowedIds instanceof Set && records.length > 0 && (
                <p className="text-xs mt-1 text-amber-600">
                  {records.length} records fetched but none match the {allowedIds.size} allowed IDs from the source step.
                </p>
              )}
            </div>
          )}

          {allowedIds !== null && !error && !loading && filteredRecords.length > 0 && (
            <div className="divide-y divide-gray-100">
              {filteredRecords.map((record) => {
                const isSelected = multiSelect
                  ? selectedIds.has(record.Id)
                  : selectedId === record.Id;

                return (
                  <button
                    key={record.Id}
                    onClick={() => multiSelect ? toggleRecord(record.Id) : setSelectedId(record.Id)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {multiSelect && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(record.Id)}
                          readOnly
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 pointer-events-none"
                        />
                      )}
                      <div>
                        <p className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                          {record.Name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{record.Id}</p>
                      </div>
                    </div>
                    {isSelected && !multiSelect && (
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-500">
            {allowedIds === null
              ? 'Filtered — no source entries'
              : allowedIds instanceof Set
                ? `Filtered (${allowedIds.size} allowed) — ${filteredRecords.length} shown`
                : filteredRecords.length > 0 ? `${filteredRecords.length} records found` : ''}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {multiSelect ? (
              <Button onClick={handleMultiSelect} disabled={selectedIds.size === 0}>
                Add Selection ({selectedIds.size})
              </Button>
            ) : (
              <Button onClick={handleSelect} disabled={!selectedId}>
                Select Record
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
