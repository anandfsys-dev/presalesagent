'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import {
  DEFAULT_SCHEMA_CONFIG,
  getObjectById,
  getChildRelationships,
  type SchemaConfig,
  type SchemaObject,
  type HierarchicalEntry,
  type ObjectRelationship,
  type LoopDefinition,
} from '@/lib/schema';

// Generate unique ID
function generateId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// State type
export interface HierarchicalDataState {
  schema: SchemaConfig;
  entries: Record<string, HierarchicalEntry[]>;  // Entries by object ID
  expandedEntries: Set<string>;
  selectedEntryId?: string;
  activeLoopId?: string;
}

// Action types
type HierarchicalDataAction =
  | { type: 'ADD_ENTRY'; objectId: string; entry: HierarchicalEntry; parentEntryId?: string }
  | { type: 'UPDATE_ENTRY'; objectId: string; entryId: string; data: Record<string, unknown> }
  | { type: 'DELETE_ENTRY'; objectId: string; entryId: string }
  | { type: 'ADD_CHILD_ENTRY'; parentObjectId: string; parentEntryId: string; childObjectId: string; childEntry: HierarchicalEntry }
  | { type: 'TOGGLE_EXPAND'; entryId: string }
  | { type: 'SELECT_ENTRY'; entryId?: string }
  | { type: 'SET_ACTIVE_LOOP'; loopId?: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'LOAD_DATA'; entries: Record<string, HierarchicalEntry[]> }
  | { type: 'UPDATE_SCHEMA'; schema: SchemaConfig };

// Initial state
const initialState: HierarchicalDataState = {
  schema: DEFAULT_SCHEMA_CONFIG,
  entries: {},
  expandedEntries: new Set(),
  selectedEntryId: undefined,
  activeLoopId: undefined,
};

// Helper to update nested child entries
function updateChildEntry(
  entries: HierarchicalEntry[],
  parentEntryId: string,
  childObjectId: string,
  childEntry: HierarchicalEntry
): HierarchicalEntry[] {
  return entries.map(entry => {
    if (entry._id === parentEntryId) {
      const childEntries = entry._childEntries || {};
      const existingChildren = childEntries[childObjectId] || [];
      return {
        ...entry,
        _childEntries: {
          ...childEntries,
          [childObjectId]: [...existingChildren, childEntry],
        },
      };
    }
    return entry;
  });
}

// Helper to delete entry and its children recursively
function deleteEntryRecursive(
  allEntries: Record<string, HierarchicalEntry[]>,
  objectId: string,
  entryId: string,
  schema: SchemaConfig
): Record<string, HierarchicalEntry[]> {
  const result = { ...allEntries };
  const entry = result[objectId]?.find(e => e._id === entryId);

  if (!entry) return result;

  // Delete children first
  if (entry._childEntries) {
    for (const [childObjectId, children] of Object.entries(entry._childEntries)) {
      for (const child of children) {
        result[childObjectId] = (result[childObjectId] || []).filter(e => e._id !== child._id);
      }
    }
  }

  // Delete the entry itself
  result[objectId] = (result[objectId] || []).filter(e => e._id !== entryId);

  // Also delete any entries in other objects that reference this entry
  const childRelationships = getChildRelationships(schema, objectId);
  for (const rel of childRelationships) {
    const parentField = rel.parentField;
    const childField = rel.childField;
    const parentValue = entry.data[parentField];

    if (parentValue && result[rel.childObject]) {
      result[rel.childObject] = result[rel.childObject].filter(
        childEntry => childEntry.data[childField] !== parentValue
      );
    }
  }

  return result;
}

// Reducer
function hierarchicalDataReducer(
  state: HierarchicalDataState,
  action: HierarchicalDataAction
): HierarchicalDataState {
  switch (action.type) {
    case 'ADD_ENTRY': {
      const existingEntries = state.entries[action.objectId] || [];
      return {
        ...state,
        entries: {
          ...state.entries,
          [action.objectId]: [...existingEntries, action.entry],
        },
      };
    }

    case 'UPDATE_ENTRY': {
      const entries = state.entries[action.objectId] || [];
      return {
        ...state,
        entries: {
          ...state.entries,
          [action.objectId]: entries.map(entry =>
            entry._id === action.entryId
              ? { ...entry, data: { ...entry.data, ...action.data } }
              : entry
          ),
        },
      };
    }

    case 'DELETE_ENTRY': {
      const newEntries = deleteEntryRecursive(
        state.entries,
        action.objectId,
        action.entryId,
        state.schema
      );
      return {
        ...state,
        entries: newEntries,
      };
    }

    case 'ADD_CHILD_ENTRY': {
      // Add to parent's _childEntries
      const parentEntries = state.entries[action.parentObjectId] || [];
      const updatedParentEntries = updateChildEntry(
        parentEntries,
        action.parentEntryId,
        action.childObjectId,
        action.childEntry
      );

      // Also add to flat entries list for the child object
      const childEntries = state.entries[action.childObjectId] || [];

      return {
        ...state,
        entries: {
          ...state.entries,
          [action.parentObjectId]: updatedParentEntries,
          [action.childObjectId]: [...childEntries, action.childEntry],
        },
      };
    }

    case 'TOGGLE_EXPAND': {
      const newExpanded = new Set(state.expandedEntries);
      if (newExpanded.has(action.entryId)) {
        newExpanded.delete(action.entryId);
      } else {
        newExpanded.add(action.entryId);
      }
      return { ...state, expandedEntries: newExpanded };
    }

    case 'SELECT_ENTRY':
      return { ...state, selectedEntryId: action.entryId };

    case 'SET_ACTIVE_LOOP':
      return { ...state, activeLoopId: action.loopId };

    case 'CLEAR_ALL':
      return { ...initialState, schema: state.schema };

    case 'LOAD_DATA':
      return { ...state, entries: action.entries };

    case 'UPDATE_SCHEMA':
      return { ...state, schema: action.schema };

    default:
      return state;
  }
}

// Context type
interface HierarchicalDataContextType {
  state: HierarchicalDataState;
  schema: SchemaConfig;

  // Entry operations
  addEntry: (objectId: string, data: Record<string, unknown>, parentEntryId?: string) => string;
  updateEntry: (objectId: string, entryId: string, data: Record<string, unknown>) => void;
  deleteEntry: (objectId: string, entryId: string) => void;

  // Child entry operations (for loops)
  addChildEntry: (
    parentObjectId: string,
    parentEntryId: string,
    childObjectId: string,
    childData: Record<string, unknown>
  ) => string;

  // UI operations
  toggleExpand: (entryId: string) => void;
  selectEntry: (entryId?: string) => void;
  setActiveLoop: (loopId?: string) => void;

  // Data operations
  clearAll: () => void;
  loadData: (entries: Record<string, HierarchicalEntry[]>) => void;

  // Schema helpers
  getObject: (objectId: string) => SchemaObject | undefined;
  getChildRelationships: (objectId: string) => ObjectRelationship[];
  getLoopsForObject: (objectId: string) => LoopDefinition[];
  getReferenceOptions: (objectId: string, fieldName: string) => { value: string; label: string }[];

  // Data helpers
  getEntriesForObject: (objectId: string) => HierarchicalEntry[];
  getChildEntriesForParent: (parentObjectId: string, parentEntryId: string, childObjectId: string) => HierarchicalEntry[];
  getTotalEntryCount: () => number;

  // Deployment helpers
  convertToDeploymentFormat: () => Record<string, { columns: string[]; data: Record<string, unknown>[] }>;
}

// Create context
const HierarchicalDataContext = createContext<HierarchicalDataContextType | null>(null);

// Provider component
export function HierarchicalDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(hierarchicalDataReducer, initialState);

  const addEntry = useCallback((
    objectId: string,
    data: Record<string, unknown>,
    parentEntryId?: string
  ): string => {
    const entryId = generateId();
    const entry: HierarchicalEntry = {
      _id: entryId,
      _objectId: objectId,
      _parentId: parentEntryId,
      data,
    };
    dispatch({ type: 'ADD_ENTRY', objectId, entry, parentEntryId });
    return entryId;
  }, []);

  const updateEntry = useCallback((objectId: string, entryId: string, data: Record<string, unknown>) => {
    dispatch({ type: 'UPDATE_ENTRY', objectId, entryId, data });
  }, []);

  const deleteEntry = useCallback((objectId: string, entryId: string) => {
    dispatch({ type: 'DELETE_ENTRY', objectId, entryId });
  }, []);

  const addChildEntry = useCallback((
    parentObjectId: string,
    parentEntryId: string,
    childObjectId: string,
    childData: Record<string, unknown>
  ): string => {
    const entryId = generateId();
    const childEntry: HierarchicalEntry = {
      _id: entryId,
      _objectId: childObjectId,
      _parentId: parentEntryId,
      data: childData,
    };
    dispatch({
      type: 'ADD_CHILD_ENTRY',
      parentObjectId,
      parentEntryId,
      childObjectId,
      childEntry,
    });
    return entryId;
  }, []);

  const toggleExpand = useCallback((entryId: string) => {
    dispatch({ type: 'TOGGLE_EXPAND', entryId });
  }, []);

  const selectEntry = useCallback((entryId?: string) => {
    dispatch({ type: 'SELECT_ENTRY', entryId });
  }, []);

  const setActiveLoop = useCallback((loopId?: string) => {
    dispatch({ type: 'SET_ACTIVE_LOOP', loopId });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const loadData = useCallback((entries: Record<string, HierarchicalEntry[]>) => {
    dispatch({ type: 'LOAD_DATA', entries });
  }, []);

  const getObject = useCallback((objectId: string) => {
    return getObjectById(state.schema, objectId);
  }, [state.schema]);

  const getChildRelationshipsForObject = useCallback((objectId: string) => {
    return getChildRelationships(state.schema, objectId);
  }, [state.schema]);

  const getLoopsForObjectFn = useCallback((objectId: string) => {
    return state.schema.loops.filter(l => l.parentObject === objectId);
  }, [state.schema]);

  const getReferenceOptions = useCallback((objectId: string, fieldName: string): { value: string; label: string }[] => {
    const object = getObject(objectId);
    if (!object) return [];

    const field = object.fields.find(f => f.name === fieldName);
    if (!field || (field.type !== 'reference' && field.type !== 'lookup') || !field.referenceTo) {
      return [];
    }

    const refObject = getObject(field.referenceTo);
    if (!refObject) return [];

    const refEntries = state.entries[field.referenceTo] || [];
    const identifierField = refObject.identifierField;
    const displayField = refObject.displayField || identifierField;

    return refEntries.map(entry => ({
      value: String(entry.data[identifierField] || entry._id),
      label: String(entry.data[displayField] || entry.data[identifierField] || entry._id),
    }));
  }, [state.entries, getObject]);

  const getEntriesForObject = useCallback((objectId: string) => {
    return state.entries[objectId] || [];
  }, [state.entries]);

  const getChildEntriesForParent = useCallback((
    parentObjectId: string,
    parentEntryId: string,
    childObjectId: string
  ) => {
    const parentEntry = state.entries[parentObjectId]?.find(e => e._id === parentEntryId);
    if (!parentEntry?._childEntries) return [];
    return parentEntry._childEntries[childObjectId] || [];
  }, [state.entries]);

  const getTotalEntryCount = useCallback(() => {
    return Object.values(state.entries).reduce((total, entries) => total + entries.length, 0);
  }, [state.entries]);

  const convertToDeploymentFormat = useCallback(() => {
    const worksheetData: Record<string, { columns: string[]; data: Record<string, unknown>[] }> = {};

    for (const object of state.schema.objects) {
      const entries = state.entries[object.id];
      if (entries && entries.length > 0) {
        const columns = object.fields.map(f => f.name);
        const data = entries.map(entry => {
          const record: Record<string, unknown> = {};
          for (const field of object.fields) {
            record[field.name] = entry.data[field.name];
          }
          return record;
        });

        // Use the salesforce object name as worksheet name
        worksheetData[object.pluralName] = { columns, data };
      }
    }

    return worksheetData;
  }, [state.entries, state.schema.objects]);

  const value = useMemo(() => ({
    state,
    schema: state.schema,
    addEntry,
    updateEntry,
    deleteEntry,
    addChildEntry,
    toggleExpand,
    selectEntry,
    setActiveLoop,
    clearAll,
    loadData,
    getObject,
    getChildRelationships: getChildRelationshipsForObject,
    getLoopsForObject: getLoopsForObjectFn,
    getReferenceOptions,
    getEntriesForObject,
    getChildEntriesForParent,
    getTotalEntryCount,
    convertToDeploymentFormat,
  }), [
    state,
    addEntry,
    updateEntry,
    deleteEntry,
    addChildEntry,
    toggleExpand,
    selectEntry,
    setActiveLoop,
    clearAll,
    loadData,
    getObject,
    getChildRelationshipsForObject,
    getLoopsForObjectFn,
    getReferenceOptions,
    getEntriesForObject,
    getChildEntriesForParent,
    getTotalEntryCount,
    convertToDeploymentFormat,
  ]);

  return (
    <HierarchicalDataContext.Provider value={value}>
      {children}
    </HierarchicalDataContext.Provider>
  );
}

// Hook to use the context
export function useHierarchicalData() {
  const context = useContext(HierarchicalDataContext);
  if (!context) {
    throw new Error('useHierarchicalData must be used within a HierarchicalDataProvider');
  }
  return context;
}
