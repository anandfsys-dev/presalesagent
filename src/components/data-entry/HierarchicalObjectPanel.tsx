'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { HierarchicalEntryForm } from './HierarchicalEntryForm';
import { useHierarchicalData } from '@/contexts/HierarchicalDataContext';
import type { SchemaObject, ObjectRelationship, HierarchicalEntry, LoopDefinition } from '@/lib/schema';

interface HierarchicalObjectPanelProps {
  object: SchemaObject;
  expanded?: boolean;
  onToggle?: () => void;
}

export function HierarchicalObjectPanel({ object, expanded = false, onToggle }: HierarchicalObjectPanelProps) {
  const {
    getEntriesForObject,
    addEntry,
    updateEntry,
    deleteEntry,
    addChildEntry,
    getChildRelationships,
    getLoopsForObject,
    toggleExpand,
    state,
    schema,
    getObject,
  } = useHierarchicalData();

  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HierarchicalEntry | undefined>();
  const [addingChildTo, setAddingChildTo] = useState<{
    parentEntry: HierarchicalEntry;
    childObjectId: string;
    relationship: ObjectRelationship;
  } | undefined>();

  const entries = getEntriesForObject(object.id);
  const childRelationships = getChildRelationships(object.id);
  const loops = getLoopsForObject(object.id);

  const handleAdd = () => {
    setEditingEntry(undefined);
    setShowForm(true);
  };

  const handleEdit = (entry: HierarchicalEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = (entryId: string) => {
    if (confirm('Are you sure you want to delete this entry and all its children?')) {
      deleteEntry(object.id, entryId);
    }
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editingEntry) {
      updateEntry(object.id, editingEntry._id, data);
    } else {
      addEntry(object.id, data);
    }
    setShowForm(false);
    setEditingEntry(undefined);
  };

  const handleAddChild = (parentEntry: HierarchicalEntry, rel: ObjectRelationship) => {
    setAddingChildTo({
      parentEntry,
      childObjectId: rel.childObject,
      relationship: rel,
    });
  };

  const handleChildSubmit = (data: Record<string, unknown>) => {
    if (!addingChildTo) return;

    // Set the parent link field
    const parentIdentifier = addingChildTo.parentEntry.data[object.identifierField];
    const childData = {
      ...data,
      [addingChildTo.relationship.childField]: parentIdentifier,
    };

    addChildEntry(
      object.id,
      addingChildTo.parentEntry._id,
      addingChildTo.childObjectId,
      childData
    );
    setAddingChildTo(undefined);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEntry(undefined);
    setAddingChildTo(undefined);
  };

  const getDisplayValue = (entry: HierarchicalEntry): string => {
    const displayField = object.displayField || object.identifierField;
    return String(entry.data[displayField] || entry._id);
  };

  const getIdentifierValue = (entry: HierarchicalEntry): string => {
    return String(entry.data[object.identifierField] || entry._id);
  };

  // Count children for an entry
  const getChildCount = (entry: HierarchicalEntry): number => {
    if (!entry._childEntries) return 0;
    return Object.values(entry._childEntries).reduce((total, children) => total + children.length, 0);
  };

  return (
    <Card className={`transition-all ${expanded ? 'ring-2 ring-black' : ''}`}>
      <button
        onClick={onToggle}
        className="w-full text-left cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                entries.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {object.deploymentOrder}
              </div>
              <div>
                <CardTitle className="text-lg">{object.pluralName}</CardTitle>
                <p className="text-sm text-gray-500">{object.salesforceObject}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {childRelationships.length > 0 && (
                <Badge variant="default" size="sm">
                  {childRelationships.length} child types
                </Badge>
              )}
              <Badge variant={entries.length > 0 ? 'success' : 'default'}>
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </Badge>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="border-t">
          {/* Description */}
          {object.description && (
            <p className="text-sm text-gray-600 mb-4">{object.description}</p>
          )}

          {/* Child relationships info */}
          {childRelationships.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="font-medium text-blue-800">This object can have children:</p>
              <ul className="mt-1 text-blue-700">
                {childRelationships.map(rel => {
                  const childObj = getObject(rel.childObject);
                  return (
                    <li key={rel.id}>• {rel.name} ({childObj?.pluralName})</li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Add form */}
          {showForm && !addingChildTo ? (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-4">
                {editingEntry ? `Edit ${object.name}` : `Add New ${object.name}`}
              </h4>
              <HierarchicalEntryForm
                object={object}
                entry={editingEntry}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            </div>
          ) : !addingChildTo && (
            <Button onClick={handleAdd} className="mb-4">
              + Add {object.name}
            </Button>
          )}

          {/* Child form */}
          {addingChildTo && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium mb-2">
                Add {getObject(addingChildTo.childObjectId)?.name} to "{getDisplayValue(addingChildTo.parentEntry)}"
              </h4>
              <HierarchicalEntryForm
                object={getObject(addingChildTo.childObjectId)!}
                parentEntry={addingChildTo.parentEntry}
                parentLinkField={addingChildTo.relationship.childField}
                onSubmit={handleChildSubmit}
                onCancel={handleCancel}
              />
            </div>
          )}

          {/* Entries list */}
          {entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((entry) => {
                const isExpanded = state.expandedEntries.has(entry._id);
                const childCount = getChildCount(entry);

                return (
                  <div
                    key={entry._id}
                    className={`border rounded-lg ${isExpanded ? 'ring-1 ring-black' : ''}`}
                  >
                    {/* Entry header */}
                    <div className="flex items-center justify-between p-3 bg-white">
                      <div className="flex items-center gap-3">
                        {childRelationships.length > 0 && (
                          <button
                            onClick={() => toggleExpand(entry._id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <svg
                              className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                        <div>
                          <p className="font-medium">{getDisplayValue(entry)}</p>
                          <p className="text-xs text-gray-500">{getIdentifierValue(entry)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {childCount > 0 && (
                          <Badge variant="default" size="sm">
                            {childCount} children
                          </Badge>
                        )}
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-sm text-blue-600 hover:text-blue-800 px-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry._id)}
                          className="text-sm text-red-600 hover:text-red-800 px-2"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Expanded children section */}
                    {isExpanded && childRelationships.length > 0 && (
                      <div className="border-t bg-gray-50 p-3">
                        {childRelationships.map(rel => {
                          const childObj = getObject(rel.childObject);
                          if (!childObj) return null;

                          const children = entry._childEntries?.[rel.childObject] || [];

                          return (
                            <div key={rel.id} className="mb-3 last:mb-0">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  {rel.name} ({children.length})
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddChild(entry, rel)}
                                >
                                  + Add {childObj.name}
                                </Button>
                              </div>

                              {children.length > 0 ? (
                                <div className="space-y-1">
                                  {children.map(child => (
                                    <div
                                      key={child._id}
                                      className="flex items-center justify-between p-2 bg-white rounded border text-sm"
                                    >
                                      <span>
                                        {String(child.data[childObj.displayField || childObj.identifierField] || child._id)}
                                      </span>
                                      <button
                                        onClick={() => deleteEntry(childObj.id, child._id)}
                                        className="text-red-600 hover:text-red-800 text-xs"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic">No {childObj.pluralName.toLowerCase()} yet</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No {object.pluralName.toLowerCase()} yet. Click "Add {object.name}" to get started.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
