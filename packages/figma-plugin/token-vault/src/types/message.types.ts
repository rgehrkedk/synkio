/**
 * Message types for plugin <-> UI communication
 */

import type { CollectionConfig, CollectionSummary } from './collection.types.js';
import type { BaselineSnapshot } from './token.types.js';
import type { BaselineDetectionResult } from '../backend/utils/baseline-detector.js';
import type { ValidationResult } from '../backend/utils/baseline-validator.js';
import type { VersionBump, TokenChange } from '../backend/utils/version-manager.js';
import type { LevelConfiguration, FileGroup } from './level-config.types.js';

/**
 * Sync metadata stored in node
 */
export interface SyncMetadata {
  chunkCount: number;
  updatedAt: string;
  variableCount: number;
}

/**
 * Sync information display
 */
export interface SyncInfo {
  exists: boolean;
  nodeId?: string;
  updatedAt?: string;
  variableCount?: number;
}

/**
 * Configuration for importing with manual level mapping
 */
export interface ManualImportConfig {
  /**
   * Single-file import configuration
   */
  singleFile?: {
    fileName: string;
    data: unknown;
    levels: LevelConfiguration[];
  };

  /**
   * Multi-file import configuration
   */
  multiFile?: {
    groups: FileGroup[];
    levelsByGroup: Record<string, LevelConfiguration[]>;
    filesData: Record<string, unknown>;
  };
}

/**
 * Preview structure for a collection
 */
export interface PreviewCollection {
  name: string;
  modes: PreviewMode[];
}

/**
 * Preview structure for a mode
 */
export interface PreviewMode {
  name: string;
  variableCount: number;
  sampleVariables: string[];
}

/**
 * Complete preview structure
 */
export interface PreviewStructure {
  collections: PreviewCollection[];
  totalCollections: number;
  totalModes: number;
  totalVariables: number;
}

/**
 * Messages sent from UI to Plugin backend
 */
export type UIMessage =
  // Collection management
  | { type: 'get-collections' }
  | { type: 'get-last-sync' }

  // Legacy import (will be deprecated)
  | { type: 'import-tokens'; data: { collections: CollectionConfig[] } }

  // Export and sync
  | { type: 'export-baseline'; collectionIds: string[] }
  | { type: 'sync-to-node'; collectionIds: string[] }
  | { type: 'check-sync-changes' }
  | { type: 'sync-with-version'; version: string; changes: TokenChange[] }

  // Format detection (baseline only)
  | { type: 'detect-import-format'; fileName: string; jsonData: unknown }

  // Baseline import
  | { type: 'import-baseline'; baseline: unknown; versionOverride?: string }

  // Baseline import preview (diff before applying)
  | { type: 'preview-baseline-import'; baseline: unknown }
  | { type: 'confirm-baseline-import'; baseline: unknown }

  // Flexible import - structure analysis
  | { type: 'analyze-structure'; fileName: string; jsonData: unknown; metadata?: { groupId: string } }

  // Flexible import - manual configuration
  | { type: 'import-with-manual-config'; config: ManualImportConfig }

  // Flexible import - preview generation
  | { type: 'generate-preview'; fileName: string; jsonData: unknown; levels: LevelConfiguration[] }

  // General
  | { type: 'cancel' };

/**
 * Messages sent from Plugin backend to UI
 */
export type PluginMessage =
  // Collection management
  | { type: 'collections-loaded'; collections: CollectionSummary[] }
  | { type: 'last-sync-loaded'; exists: boolean; nodeId?: string; updatedAt?: string; variableCount?: number }

  // Import results
  | { type: 'import-complete'; message: string }
  | { type: 'import-error'; message: string }

  // Export results
  | { type: 'export-complete'; data: BaselineSnapshot }
  | { type: 'export-error'; message: string }

  // Sync results
  | { type: 'sync-complete'; nodeId: string; variableCount: number }
  | { type: 'sync-error'; message: string }
  | { type: 'sync-changes-detected'; versionBump: VersionBump }

  // Import preview results (diff before applying)
  | { type: 'import-changes-detected'; versionBump: VersionBump; baseline: unknown }

  // Format detection response (baseline only)
  | {
      type: 'import-format-detected';
      fileName: string;
      baselineDetection: BaselineDetectionResult;
      validation?: ValidationResult;
    }

  // Flexible import - structure analysis response
  | {
      type: 'structure-analyzed';
      fileName: string;
      levels: LevelConfiguration[];
      metadata?: { groupId: string };
    }

  // Flexible import - preview generation response
  | {
      type: 'preview-generated';
      preview: PreviewStructure;
    };
