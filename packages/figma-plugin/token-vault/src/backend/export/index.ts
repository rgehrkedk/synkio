/**
 * Export orchestrator module
 * Main entry point for exporting baseline snapshots from Figma variables
 *
 * @module backend/export
 */

import type { BaselineSnapshot } from '../../types/index.js';
import { buildBaselineSnapshot } from './baseline.js';

/**
 * Export baseline snapshot with optional collection filtering.
 *
 * Creates a complete snapshot of Figma variables in a standardized baseline format
 * that can be used for:
 * - Syncing to the registry node for API access
 * - Exporting to JSON files for version control
 * - Diffing against previous baselines to detect changes
 *
 * The baseline snapshot includes:
 * - Nested token structure organized by collection → mode → group → token
 * - Flat baseline lookup mapping variable IDs to metadata
 * - Metadata about the export (timestamp, file info, plugin version)
 *
 * @param filterCollectionIds - Optional array of collection IDs to export.
 *                              If null or empty, all collections are exported.
 * @returns Promise resolving to complete baseline snapshot
 *
 * @throws {Error} If Figma API calls fail
 * @throws {Error} If variable value resolution fails
 *
 * @example
 * ```ts
 * // Export all collections
 * const fullBaseline = await exportBaseline();
 *
 * // Export specific collections
 * const filteredBaseline = await exportBaseline(['collection-id-1', 'collection-id-2']);
 *
 * // Access nested structure
 * const primaryColor = fullBaseline['Design Tokens'].light.colors.primary;
 *
 * // Access flat baseline
 * const variableInfo = fullBaseline.baseline['123:456'];
 * // { path: 'colors/primary', value: '#0000ff', type: 'color', ... }
 * ```
 */
export async function exportBaseline(
  filterCollectionIds: string[] | null = null
): Promise<BaselineSnapshot> {
  return buildBaselineSnapshot(filterCollectionIds);
}

// Re-export transformer utilities for convenience
export { resolveVariableValue, setNestedValue } from './transformer.js';
export { buildBaselineSnapshot } from './baseline.js';
