'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useState } from 'react';
import { DEFAULT_PIPELINE_CONFIG, getStepsByCategory } from '@/lib/pipeline/config';
import type { PipelineStep, ColumnDefinition } from '@/types';

const STORAGE_KEY = 'salesforce-rca-config-data';

// Generic entry type that works with any step
export interface DataEntry {
  _id: string;
  _stepId: string;
  [key: string]: unknown;
}

// State type - dynamic based on pipeline steps
export type ConfigDataState = {
  [stepId: string]: DataEntry[];
};

// Initialize state from pipeline config
function createInitialState(): ConfigDataState {
  const state: ConfigDataState = {};
  for (const step of DEFAULT_PIPELINE_CONFIG.steps) {
    state[step.id] = [];
  }
  return state;
}

// Load state from localStorage
function loadStateFromStorage(): ConfigDataState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the structure
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
  }
  return null;
}

// Save state to localStorage
function saveStateToStorage(state: ConfigDataState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
}

// Action types
type ConfigDataAction =
  | { type: 'ADD_ENTRY'; stepId: string; entry: DataEntry }
  | { type: 'UPDATE_ENTRY'; stepId: string; id: string; entry: Partial<DataEntry> }
  | { type: 'DELETE_ENTRY'; stepId: string; id: string }
  | { type: 'SET_ENTRIES'; stepId: string; entries: DataEntry[] }
  | { type: 'CLEAR_ALL' }
  | { type: 'LOAD_DATA'; data: Partial<ConfigDataState> }
  | { type: 'IMPORT_DATA'; data: ConfigDataState };

// Reducer
function configDataReducer(state: ConfigDataState, action: ConfigDataAction): ConfigDataState {
  switch (action.type) {
    case 'ADD_ENTRY':
      return {
        ...state,
        [action.stepId]: [...(state[action.stepId] || []), action.entry],
      };
    case 'UPDATE_ENTRY':
      return {
        ...state,
        [action.stepId]: (state[action.stepId] || []).map((entry) =>
          entry._id === action.id ? { ...entry, ...action.entry } : entry
        ),
      };
    case 'DELETE_ENTRY':
      return {
        ...state,
        [action.stepId]: (state[action.stepId] || []).filter(
          (entry) => entry._id !== action.id
        ),
      };
    case 'SET_ENTRIES':
      return {
        ...state,
        [action.stepId]: action.entries,
      };
    case 'CLEAR_ALL':
      return createInitialState();
    case 'LOAD_DATA': {
      const newState = { ...state };
      for (const [key, value] of Object.entries(action.data)) {
        if (value !== undefined) {
          newState[key] = value;
        }
      }
      return newState;
    }
    case 'IMPORT_DATA': {
      // Merge imported data with initial state structure
      const newState = createInitialState();
      for (const [key, value] of Object.entries(action.data)) {
        if (Array.isArray(value)) {
          newState[key] = value;
        }
      }
      return newState;
    }
    default:
      return state;
  }
}

// Export data format (for Import/Export)
export interface ExportData {
  version: string;
  exportedAt: string;
  data: ConfigDataState;
}

// Context type
interface ConfigDataContextType {
  state: ConfigDataState;
  pipelineConfig: typeof DEFAULT_PIPELINE_CONFIG;
  stepsByCategory: Record<string, PipelineStep[]>;
  addEntry: (stepId: string, entry: Omit<DataEntry, '_id' | '_stepId'>) => string;
  updateEntry: (stepId: string, id: string, entry: Partial<DataEntry>) => void;
  deleteEntry: (stepId: string, id: string) => void;
  setEntries: (stepId: string, entries: DataEntry[]) => void;
  clearAll: () => void;
  loadData: (data: Partial<ConfigDataState>) => void;
  importData: (data: ConfigDataState) => void;
  exportData: () => ExportData;
  getStepConfig: (stepId: string) => PipelineStep | undefined;
  getReferenceOptions: (stepId: string, column: ColumnDefinition) => { value: string; label: string }[];
  getTotalEntryCount: () => number;
  getEntryCountByStep: (stepId: string) => number;
  convertToDeploymentPayload: () => DeploymentPayload;
  isHydrated: boolean;
}

// Deployment payload structure
export interface DeploymentPayload {
  steps: {
    stepId: string;
    stepName: string;
    apiName: string;
    endpoint: string;
    method: string;
    entries: Record<string, unknown>[];
  }[];
  metadata: {
    totalEntries: number;
    stepCount: number;
  };
}

// Create context
const ConfigDataContext = createContext<ConfigDataContextType | null>(null);

// Generate unique ID
function generateId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Provider component
export function ConfigDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(configDataReducer, null, createInitialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const stepsByCategory = useMemo(() => getStepsByCategory(DEFAULT_PIPELINE_CONFIG), []);

  // Load from localStorage on mount
  useEffect(() => {
    const storedState = loadStateFromStorage();
    if (storedState) {
      dispatch({ type: 'IMPORT_DATA', data: storedState });
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever state changes (after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveStateToStorage(state);
    }
  }, [state, isHydrated]);

  const addEntry = useCallback((stepId: string, entry: Omit<DataEntry, '_id' | '_stepId'>): string => {
    const id = generateId();
    const entryWithId: DataEntry = { ...entry, _id: id, _stepId: stepId };
    dispatch({ type: 'ADD_ENTRY', stepId, entry: entryWithId });
    return id;
  }, []);

  const updateEntry = useCallback((stepId: string, id: string, entry: Partial<DataEntry>) => {
    dispatch({ type: 'UPDATE_ENTRY', stepId, id, entry });
  }, []);

  const deleteEntry = useCallback((stepId: string, id: string) => {
    dispatch({ type: 'DELETE_ENTRY', stepId, id });
  }, []);

  const setEntries = useCallback((stepId: string, entries: DataEntry[]) => {
    dispatch({ type: 'SET_ENTRIES', stepId, entries });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const loadData = useCallback((data: Partial<ConfigDataState>) => {
    dispatch({ type: 'LOAD_DATA', data });
  }, []);

  const importData = useCallback((data: ConfigDataState) => {
    dispatch({ type: 'IMPORT_DATA', data });
  }, []);

  const exportData = useCallback((): ExportData => {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: state,
    };
  }, [state]);

  const getStepConfig = useCallback((stepId: string) => {
    return DEFAULT_PIPELINE_CONFIG.steps.find(s => s.id === stepId);
  }, []);

  // Get reference options for dropdown fields
  const getReferenceOptions = useCallback((stepId: string, column: ColumnDefinition): { value: string; label: string }[] => {
    if (column.type !== 'reference' || !column.referenceTo) return [];

    const refStepId = column.referenceTo;
    const refEntries = state[refStepId] || [];
    const refStep = getStepConfig(refStepId);

    if (!refStep) return [];

    // Find the display field (usually 'Name')
    const displayField = column.referenceDisplayField || 'Name';

    return refEntries.map(e => ({
      value: e._id,
      label: (e[displayField] as string) || e._id,
    }));
  }, [state, getStepConfig]);

  const getTotalEntryCount = useCallback(() => {
    return Object.values(state).reduce((total, entries) => total + entries.length, 0);
  }, [state]);

  const getEntryCountByStep = useCallback((stepId: string) => {
    return (state[stepId] || []).length;
  }, [state]);

  // Convert state to deployment payload format
  const convertToDeploymentPayload = useCallback((): DeploymentPayload => {
    const steps: DeploymentPayload['steps'] = [];

    for (const step of DEFAULT_PIPELINE_CONFIG.steps) {
      const entries = state[step.id] || [];
      if (entries.length === 0) continue;

      // Convert entries to Salesforce format
      const sfEntries = entries.map(entry => {
        const sfEntry: Record<string, unknown> = {};

        // Store internal ID for reference resolution
        sfEntry._internalId = entry._id;

        for (const col of step.columns) {
          const value = entry[col.name];
          if (value !== undefined && value !== null && value !== '') {
            // For reference fields, store the internal ID (will be resolved during deployment)
            if (col.type === 'reference' && col.referenceTo) {
              sfEntry[col.sfField || col.name] = value;
            } else {
              sfEntry[col.sfField || col.name] = value;
            }
          }
        }

        return sfEntry;
      });

      steps.push({
        stepId: step.id,
        stepName: step.name,
        apiName: step.apiName,
        endpoint: step.endpoint || `/services/data/v60.0/sobjects/${step.apiName}/`,
        method: step.method || 'POST',
        entries: sfEntries,
      });
    }

    return {
      steps,
      metadata: {
        totalEntries: getTotalEntryCount(),
        stepCount: steps.length,
      },
    };
  }, [state, getTotalEntryCount]);

  const value = useMemo(() => ({
    state,
    pipelineConfig: DEFAULT_PIPELINE_CONFIG,
    stepsByCategory,
    addEntry,
    updateEntry,
    deleteEntry,
    setEntries,
    clearAll,
    loadData,
    importData,
    exportData,
    getStepConfig,
    getReferenceOptions,
    getTotalEntryCount,
    getEntryCountByStep,
    convertToDeploymentPayload,
    isHydrated,
  }), [state, stepsByCategory, addEntry, updateEntry, deleteEntry, setEntries, clearAll, loadData, importData, exportData, getStepConfig, getReferenceOptions, getTotalEntryCount, getEntryCountByStep, convertToDeploymentPayload, isHydrated]);

  return (
    <ConfigDataContext.Provider value={value}>
      {children}
    </ConfigDataContext.Provider>
  );
}

// Hook to use the context
export function useConfigData() {
  const context = useContext(ConfigDataContext);
  if (!context) {
    throw new Error('useConfigData must be used within a ConfigDataProvider');
  }
  return context;
}
