/**
 * UI State Management
 * Type-safe state container with observer pattern for reactive updates
 */

import type { CollectionSummary } from '../types/collection.types.js';

/**
 * Uploaded file representation
 */
export interface UploadedFile {
  name: string;
  content: unknown;
  size: number;
}

/**
 * Collection configuration for import
 */
export interface CollectionConfig {
  name: string;
  isModeCollection: boolean;
  fileNames: string[];
}

/**
 * Application state shape
 */
export interface AppState {
  files: Map<string, UploadedFile>;
  collections: CollectionConfig[];
  currentTab: 'import' | 'export' | 'sync';
  figmaCollections: CollectionSummary[];
  selectedExportCollections: Set<string>;
  selectedSyncCollections: Set<string>;
}

/**
 * State change listener callback
 */
export type StateListener = (state: AppState) => void;

/**
 * Initial state
 */
const initialState: AppState = {
  files: new Map(),
  collections: [],
  currentTab: 'import',
  figmaCollections: [],
  selectedExportCollections: new Set(),
  selectedSyncCollections: new Set(),
};

/**
 * Current application state
 */
let state: AppState = { ...initialState };

/**
 * Registered state change listeners
 */
const listeners: Set<StateListener> = new Set();

/**
 * Get current state (read-only)
 */
export function getState(): Readonly<AppState> {
  return state;
}

/**
 * Update state and notify listeners
 * @param updates - Partial state updates to apply
 */
export function setState(updates: Partial<AppState>): void {
  state = { ...state, ...updates };
  notifyListeners();
}

/**
 * Reset state to initial values
 */
export function resetState(): void {
  state = {
    files: new Map(),
    collections: [],
    currentTab: 'import',
    figmaCollections: [],
    selectedExportCollections: new Set(),
    selectedSyncCollections: new Set(),
  };
  notifyListeners();
}

/**
 * Subscribe to state changes
 * @param listener - Callback to invoke on state changes
 * @returns Unsubscribe function
 */
export function subscribe(listener: StateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of state change
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener(state));
}
