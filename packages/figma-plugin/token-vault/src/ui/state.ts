/**
 * UI State Management
 * Type-safe state container with observer pattern for reactive updates
 */

import type { CollectionSummary } from '../types/collection.types.js';
import type { BaselineDetectionResult } from '../backend/utils/baseline-detector.js';
import type { ValidationResult } from '../backend/utils/baseline-validator.js';
import type { VersionBump } from '../backend/utils/version-manager.js';
import type { LevelConfiguration, FileGroup, CollectionConfiguration } from '../types/level-config.types.js';

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
 * Import step in the flexible import flow
 */
export type ImportStep = 'upload' | 'group' | 'configure' | 'preview';

/**
 * Structure configuration state
 */
export interface StructureConfigState {
  /**
   * File name being configured (for single-file imports)
   */
  fileName?: string;

  /**
   * Group ID being configured (for multi-file imports)
   */
  groupId?: string;

  /**
   * Level configurations
   */
  levels: LevelConfiguration[];
}

/**
 * Application state shape
 */
export interface AppState {
  // File management
  files: Map<string, UploadedFile>;
  collections: CollectionConfig[];
  currentTab: 'import' | 'export' | 'sync';

  // Figma collections
  figmaCollections: CollectionSummary[];
  selectedExportCollections: Set<string>;
  selectedSyncCollections: Set<string>;

  // NEW: Flexible import flow state
  currentImportStep?: ImportStep;
  fileGroups?: FileGroup[];
  structureConfig?: StructureConfigState;
  collectionConfigurations?: CollectionConfiguration[];

  // Baseline detection (kept for baseline import)
  baselineDetection?: BaselineDetectionResult;
  validation?: ValidationResult;
  versionBump?: VersionBump;
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
 * Update import step
 */
export function setImportStep(step: ImportStep): void {
  setState({ currentImportStep: step });
}

/**
 * Update file groups
 */
export function setFileGroups(groups: FileGroup[]): void {
  setState({ fileGroups: groups });
}

/**
 * Update structure configuration
 */
export function setStructureConfig(config: StructureConfigState): void {
  setState({ structureConfig: config });
}

/**
 * Update level configuration
 */
export function updateLevelConfiguration(levels: LevelConfiguration[]): void {
  const currentConfig = state.structureConfig;
  if (currentConfig) {
    setState({
      structureConfig: {
        ...currentConfig,
        levels,
      },
    });
  }
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
