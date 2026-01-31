'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { DEFAULT_PIPELINE_CONFIG } from '@/lib/pipeline/config';
import type { PipelineStep } from '@/types';

// Types for each object's data
export interface PicklistEntry {
  _id: string;
  Picklist_Name: string;
  Picklist_API_Name: string;
  Active: boolean;
}

export interface PicklistValueEntry {
  _id: string;
  Picklist_Name: string;
  Value_Label: string;
  Value_API_Name: string;
  Display_Order?: number;
  Active: boolean;
  Is_Default?: boolean;
}

export interface CategoryEntry {
  _id: string;
  Category_Name: string;
  Category_Code: string;
  Parent_Category_Code?: string;
  Sequence?: number;
  Active: boolean;
  Description?: string;
}

export interface AttributeEntry {
  _id: string;
  Attribute_Name: string;
  Attribute_API_Name: string;
  Data_Type: string;
  Display_Type?: string;
  Picklist_Name?: string;
  Sequence?: number;
  Required?: boolean;
  Default_Value?: string;
  Help_Text?: string;
  Min_Value?: number;
  Max_Value?: number;
  Max_Length?: number;
}

export interface ProductEntry {
  _id: string;
  Product_Code: string;
  Product_Name: string;
  Product_Type: string;
  Description?: string;
  Product_Family?: string;
  Active: boolean;
  Pricing_Method?: string;
  Revenue_Recognition_Rule?: string;
  Tax_Treatment?: string;
  Parent_Product_Code?: string;
  Category_Code?: string;
}

export interface ProductRelationshipEntry {
  _id: string;
  Parent_Product_Code: string;
  Child_Product_Code: string;
  Relationship_Type: string;
  Required?: boolean;
  Min_Quantity?: number;
  Max_Quantity?: number;
  Default_Quantity?: number;
}

export interface CatalogEntry {
  _id: string;
  Catalog_Name: string;
  Catalog_Code: string;
  Active: boolean;
  Start_Date?: string;
  End_Date?: string;
  Description?: string;
}

export interface CatalogProductEntry {
  _id: string;
  Catalog_Code: string;
  Product_Code: string;
  Sequence?: number;
}

export interface PriceBookEntry {
  _id: string;
  PriceBook_Name: string;
  PriceBook_Code: string;
  Currency: string;
  Active: boolean;
  Description?: string;
}

export interface PriceListItemEntry {
  _id: string;
  PriceBook_Code: string;
  Product_Code: string;
  List_Price: number;
  Effective_Date?: string;
  Expiration_Date?: string;
  Discount_Schedule?: string;
}

export interface SellingModelEntry {
  _id: string;
  Selling_Model_Name: string;
  Selling_Model_Code: string;
  Selling_Term_Type: string;
  Billing_Frequency?: string;
  Revenue_Recognition_Method?: string;
  Product_Code: string;
}

export interface AttributeMappingEntry {
  _id: string;
  Product_Code: string;
  Attribute_API_Name: string;
  Required?: boolean;
  Display_Order?: number;
  Default_Value?: string;
}

// Unified entry type
export type DataEntry =
  | PicklistEntry
  | PicklistValueEntry
  | CategoryEntry
  | AttributeEntry
  | ProductEntry
  | ProductRelationshipEntry
  | CatalogEntry
  | CatalogProductEntry
  | PriceBookEntry
  | PriceListItemEntry
  | SellingModelEntry
  | AttributeMappingEntry;

// State type
export interface ConfigDataState {
  picklists: PicklistEntry[];
  picklist_values: PicklistValueEntry[];
  categories: CategoryEntry[];
  attributes: AttributeEntry[];
  products: ProductEntry[];
  product_relationships: ProductRelationshipEntry[];
  catalogs: CatalogEntry[];
  catalog_products: CatalogProductEntry[];
  pricebooks: PriceBookEntry[];
  price_list_items: PriceListItemEntry[];
  selling_models: SellingModelEntry[];
  attribute_mappings: AttributeMappingEntry[];
}

// Action types
type ConfigDataAction =
  | { type: 'ADD_ENTRY'; objectType: keyof ConfigDataState; entry: DataEntry }
  | { type: 'UPDATE_ENTRY'; objectType: keyof ConfigDataState; id: string; entry: Partial<DataEntry> }
  | { type: 'DELETE_ENTRY'; objectType: keyof ConfigDataState; id: string }
  | { type: 'SET_ENTRIES'; objectType: keyof ConfigDataState; entries: DataEntry[] }
  | { type: 'CLEAR_ALL' }
  | { type: 'LOAD_DATA'; data: Partial<ConfigDataState> };

// Initial state
const initialState: ConfigDataState = {
  picklists: [],
  picklist_values: [],
  categories: [],
  attributes: [],
  products: [],
  product_relationships: [],
  catalogs: [],
  catalog_products: [],
  pricebooks: [],
  price_list_items: [],
  selling_models: [],
  attribute_mappings: [],
};

// Reducer
function configDataReducer(state: ConfigDataState, action: ConfigDataAction): ConfigDataState {
  switch (action.type) {
    case 'ADD_ENTRY':
      return {
        ...state,
        [action.objectType]: [...state[action.objectType], action.entry],
      };
    case 'UPDATE_ENTRY':
      return {
        ...state,
        [action.objectType]: state[action.objectType].map((entry: DataEntry) =>
          entry._id === action.id ? { ...entry, ...action.entry } : entry
        ),
      };
    case 'DELETE_ENTRY':
      return {
        ...state,
        [action.objectType]: state[action.objectType].filter(
          (entry: DataEntry) => entry._id !== action.id
        ),
      };
    case 'SET_ENTRIES':
      return {
        ...state,
        [action.objectType]: action.entries,
      };
    case 'CLEAR_ALL':
      return initialState;
    case 'LOAD_DATA':
      return {
        ...state,
        ...action.data,
      };
    default:
      return state;
  }
}

// Context type
interface ConfigDataContextType {
  state: ConfigDataState;
  pipelineConfig: typeof DEFAULT_PIPELINE_CONFIG;
  addEntry: (objectType: keyof ConfigDataState, entry: DataEntry) => void;
  updateEntry: (objectType: keyof ConfigDataState, id: string, entry: Partial<DataEntry>) => void;
  deleteEntry: (objectType: keyof ConfigDataState, id: string) => void;
  setEntries: (objectType: keyof ConfigDataState, entries: DataEntry[]) => void;
  clearAll: () => void;
  loadData: (data: Partial<ConfigDataState>) => void;
  getStepConfig: (stepId: string) => PipelineStep | undefined;
  getReferenceOptions: (stepId: string, fieldName: string) => { value: string; label: string }[];
  getTotalEntryCount: () => number;
  convertToWorksheetData: () => Record<string, { columns: string[]; data: Record<string, unknown>[] }>;
}

// Create context
const ConfigDataContext = createContext<ConfigDataContextType | null>(null);

// Generate unique ID
function generateId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Provider component
export function ConfigDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(configDataReducer, initialState);

  const addEntry = useCallback((objectType: keyof ConfigDataState, entry: DataEntry) => {
    const entryWithId = { ...entry, _id: entry._id || generateId() };
    dispatch({ type: 'ADD_ENTRY', objectType, entry: entryWithId });
  }, []);

  const updateEntry = useCallback((objectType: keyof ConfigDataState, id: string, entry: Partial<DataEntry>) => {
    dispatch({ type: 'UPDATE_ENTRY', objectType, id, entry });
  }, []);

  const deleteEntry = useCallback((objectType: keyof ConfigDataState, id: string) => {
    dispatch({ type: 'DELETE_ENTRY', objectType, id });
  }, []);

  const setEntries = useCallback((objectType: keyof ConfigDataState, entries: DataEntry[]) => {
    dispatch({ type: 'SET_ENTRIES', objectType, entries });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const loadData = useCallback((data: Partial<ConfigDataState>) => {
    dispatch({ type: 'LOAD_DATA', data });
  }, []);

  const getStepConfig = useCallback((stepId: string) => {
    return DEFAULT_PIPELINE_CONFIG.steps.find(s => s.id === stepId);
  }, []);

  // Get reference options for dropdown fields
  const getReferenceOptions = useCallback((stepId: string, fieldName: string): { value: string; label: string }[] => {
    const step = getStepConfig(stepId);
    if (!step) return [];

    const column = step.columns.find(c => c.name === fieldName);
    if (!column || column.type !== 'reference' || !column.referenceTo) return [];

    const referenceTo = column.referenceTo;
    const refEntries = state[referenceTo as keyof ConfigDataState] || [];

    // Determine which field to use as the value and label
    switch (referenceTo) {
      case 'picklists':
        return (refEntries as PicklistEntry[]).map(e => ({
          value: e.Picklist_Name,
          label: e.Picklist_Name,
        }));
      case 'categories':
        return (refEntries as CategoryEntry[]).map(e => ({
          value: e.Category_Code,
          label: `${e.Category_Name} (${e.Category_Code})`,
        }));
      case 'products':
        return (refEntries as ProductEntry[]).map(e => ({
          value: e.Product_Code,
          label: `${e.Product_Name} (${e.Product_Code})`,
        }));
      case 'catalogs':
        return (refEntries as CatalogEntry[]).map(e => ({
          value: e.Catalog_Code,
          label: `${e.Catalog_Name} (${e.Catalog_Code})`,
        }));
      case 'pricebooks':
        return (refEntries as PriceBookEntry[]).map(e => ({
          value: e.PriceBook_Code,
          label: `${e.PriceBook_Name} (${e.PriceBook_Code})`,
        }));
      case 'attributes':
        return (refEntries as AttributeEntry[]).map(e => ({
          value: e.Attribute_API_Name,
          label: `${e.Attribute_Name} (${e.Attribute_API_Name})`,
        }));
      default:
        return [];
    }
  }, [state, getStepConfig]);

  const getTotalEntryCount = useCallback(() => {
    return Object.values(state).reduce((total, entries) => total + entries.length, 0);
  }, [state]);

  // Convert state to worksheet data format for deployment
  const convertToWorksheetData = useCallback(() => {
    const worksheetData: Record<string, { columns: string[]; data: Record<string, unknown>[] }> = {};

    for (const step of DEFAULT_PIPELINE_CONFIG.steps) {
      const entries = state[step.id as keyof ConfigDataState];
      if (entries && entries.length > 0) {
        const columns = step.columns.map(c => c.name);
        const data = entries.map((entry: DataEntry) => {
          const record: Record<string, unknown> = {};
          for (const col of columns) {
            record[col] = (entry as unknown as Record<string, unknown>)[col];
          }
          return record;
        });

        worksheetData[step.worksheetName] = { columns, data };
      }
    }

    return worksheetData;
  }, [state]);

  const value = useMemo(() => ({
    state,
    pipelineConfig: DEFAULT_PIPELINE_CONFIG,
    addEntry,
    updateEntry,
    deleteEntry,
    setEntries,
    clearAll,
    loadData,
    getStepConfig,
    getReferenceOptions,
    getTotalEntryCount,
    convertToWorksheetData,
  }), [state, addEntry, updateEntry, deleteEntry, setEntries, clearAll, loadData, getStepConfig, getReferenceOptions, getTotalEntryCount, convertToWorksheetData]);

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
