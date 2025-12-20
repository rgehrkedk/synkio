/**
 * Collection Matcher
 *
 * Handles ID-based and heuristic matching for collections and modes.
 * Used for detecting renames, additions, and deletions of collections/modes.
 */

import type {
  BaselineEntry,
  CollectionRename,
  ModeRename,
  ModeChange,
} from '../../types/index.js';

/**
 * Collection information with its modes
 */
export interface CollectionInfo {
  name: string;
  modes: Map<string, string>; // modeId -> modeName
}

/**
 * Result of collection matching
 */
export interface CollectionMatchResult {
  collectionRenames: CollectionRename[];
  modeRenames: ModeRename[];
  newModes: ModeChange[];
  deletedModes: ModeChange[];
  renamedModes: Set<string>; // Set of "collection:mode" keys for modes that were renamed
}

/**
 * Build a map of collectionId -> CollectionInfo from baseline entries
 *
 * @param entries - Baseline entries with collection/mode IDs
 * @returns Map of collectionId to CollectionInfo
 */
export function buildCollectionMaps(
  entries: Record<string, BaselineEntry>
): Map<string, CollectionInfo> {
  const collections = new Map<string, CollectionInfo>();

  for (const entry of Object.values(entries)) {
    if (!entry.collectionId || !entry.modeId) continue;

    if (!collections.has(entry.collectionId)) {
      collections.set(entry.collectionId, {
        name: entry.collection,
        modes: new Map(),
      });
    }

    collections.get(entry.collectionId)!.modes.set(entry.modeId, entry.mode);
  }

  return collections;
}

/**
 * Build a map of collection names to their mode sets (for heuristic matching)
 *
 * @param entries - Baseline entries
 * @returns Map of collection name to Set of mode names
 */
export function buildModesByCollection(
  entries: Record<string, BaselineEntry>
): Map<string, Set<string>> {
  const modesByCollection = new Map<string, Set<string>>();

  for (const entry of Object.values(entries)) {
    const collection = entry.collection || 'unknown';
    if (!modesByCollection.has(collection)) {
      modesByCollection.set(collection, new Set());
    }
    modesByCollection.get(collection)!.add(entry.mode);
  }

  return modesByCollection;
}

// ============================================================================
// Helper functions for ID-based matching (extracted for reduced complexity)
// ============================================================================

/**
 * Detect collection renames by comparing collectionIds
 */
function detectCollectionRenamesById(
  baselineCollections: Map<string, CollectionInfo>,
  fetchedCollections: Map<string, CollectionInfo>
): CollectionRename[] {
  const renames: CollectionRename[] = [];
  for (const [collectionId, baselineCol] of baselineCollections) {
    const fetchedCol = fetchedCollections.get(collectionId);
    if (fetchedCol && baselineCol.name !== fetchedCol.name) {
      renames.push({
        oldCollection: baselineCol.name,
        newCollection: fetchedCol.name,
        modeMapping: [],
      });
    }
  }
  return renames;
}

/**
 * Detect mode renames within collections
 */
function detectModeRenamesById(
  baselineCollections: Map<string, CollectionInfo>,
  fetchedCollections: Map<string, CollectionInfo>
): { renames: ModeRename[]; renamedModes: Set<string> } {
  const renames: ModeRename[] = [];
  const renamedModes = new Set<string>();

  for (const [collectionId, baselineCol] of baselineCollections) {
    const fetchedCol = fetchedCollections.get(collectionId);
    if (!fetchedCol) continue;

    for (const [modeId, baselineModeName] of baselineCol.modes) {
      const fetchedModeName = fetchedCol.modes.get(modeId);
      if (fetchedModeName && baselineModeName !== fetchedModeName) {
        renames.push({
          collection: fetchedCol.name,
          oldMode: baselineModeName,
          newMode: fetchedModeName,
        });
        renamedModes.add(`${baselineCol.name}:${baselineModeName}`);
      }
    }
  }

  return { renames, renamedModes };
}

/**
 * Detect new collections (all their modes are new)
 */
function detectNewCollectionsById(
  baselineCollections: Map<string, CollectionInfo>,
  fetchedCollections: Map<string, CollectionInfo>
): ModeChange[] {
  const newModes: ModeChange[] = [];
  for (const [collectionId, fetchedCol] of fetchedCollections) {
    if (!baselineCollections.has(collectionId)) {
      for (const modeName of fetchedCol.modes.values()) {
        newModes.push({ collection: fetchedCol.name, mode: modeName });
      }
    }
  }
  return newModes;
}

/**
 * Detect deleted collections (all their modes are deleted)
 */
function detectDeletedCollectionsById(
  baselineCollections: Map<string, CollectionInfo>,
  fetchedCollections: Map<string, CollectionInfo>
): { deletedModes: ModeChange[]; renamedModes: Set<string> } {
  const deletedModes: ModeChange[] = [];
  const renamedModes = new Set<string>();

  for (const [collectionId, baselineCol] of baselineCollections) {
    if (!fetchedCollections.has(collectionId)) {
      for (const modeName of baselineCol.modes.values()) {
        deletedModes.push({ collection: baselineCol.name, mode: modeName });
        renamedModes.add(`${baselineCol.name}:${modeName}`);
      }
    }
  }

  return { deletedModes, renamedModes };
}

/**
 * Detect mode changes within shared collections
 */
function detectModeChangesWithinCollectionsById(
  baselineCollections: Map<string, CollectionInfo>,
  fetchedCollections: Map<string, CollectionInfo>
): { newModes: ModeChange[]; deletedModes: ModeChange[]; renamedModes: Set<string> } {
  const newModes: ModeChange[] = [];
  const deletedModes: ModeChange[] = [];
  const renamedModes = new Set<string>();

  for (const [collectionId, baselineCol] of baselineCollections) {
    const fetchedCol = fetchedCollections.get(collectionId);
    if (!fetchedCol) continue;

    // New modes
    for (const [modeId, modeName] of fetchedCol.modes) {
      if (!baselineCol.modes.has(modeId)) {
        newModes.push({ collection: fetchedCol.name, mode: modeName });
      }
    }

    // Deleted modes
    for (const [modeId, modeName] of baselineCol.modes) {
      if (!fetchedCol.modes.has(modeId)) {
        deletedModes.push({ collection: baselineCol.name, mode: modeName });
        renamedModes.add(`${baselineCol.name}:${modeName}`);
      }
    }
  }

  return { newModes, deletedModes, renamedModes };
}

/**
 * Match collections and modes using Figma IDs (preferred method).
 * This provides accurate rename detection based on permanent IDs.
 *
 * @param baselineEntries - Previous baseline entries
 * @param fetchedEntries - Newly fetched entries
 * @returns CollectionMatchResult with detected changes
 */
export function matchCollectionsById(
  baselineEntries: Record<string, BaselineEntry>,
  fetchedEntries: Record<string, BaselineEntry>
): CollectionMatchResult {
  const baselineCollections = buildCollectionMaps(baselineEntries);
  const fetchedCollections = buildCollectionMaps(fetchedEntries);

  const collectionRenames = detectCollectionRenamesById(baselineCollections, fetchedCollections);
  const modeRenameResult = detectModeRenamesById(baselineCollections, fetchedCollections);
  const newFromNewCollections = detectNewCollectionsById(baselineCollections, fetchedCollections);
  const deletedResult = detectDeletedCollectionsById(baselineCollections, fetchedCollections);
  const withinResult = detectModeChangesWithinCollectionsById(baselineCollections, fetchedCollections);

  // Merge all renamed modes sets
  const renamedModes = new Set([
    ...modeRenameResult.renamedModes,
    ...deletedResult.renamedModes,
    ...withinResult.renamedModes,
  ]);

  return {
    collectionRenames,
    modeRenames: modeRenameResult.renames,
    newModes: [...newFromNewCollections, ...withinResult.newModes],
    deletedModes: [...deletedResult.deletedModes, ...withinResult.deletedModes],
    renamedModes,
  };
}

// ============================================================================
// Helper functions for heuristic matching (extracted for reduced complexity)
// ============================================================================

interface HeuristicMatchResult {
  collectionRenames: CollectionRename[];
  modeRenames: ModeRename[];
  renamedModes: Set<string>;
  unmatchedBaseline: string[];
  unmatchedFetched: string[];
}

/**
 * Match collections by mode count (heuristic for renames)
 */
function matchCollectionsByModeCount(
  baselineOnlyCollections: string[],
  fetchedOnlyCollections: string[],
  baselineModesByCollection: Map<string, Set<string>>,
  fetchedModesByCollection: Map<string, Set<string>>
): HeuristicMatchResult {
  const collectionRenames: CollectionRename[] = [];
  const modeRenames: ModeRename[] = [];
  const renamedModes = new Set<string>();
  const unmatchedBaseline = [...baselineOnlyCollections];
  const unmatchedFetched = [...fetchedOnlyCollections];

  for (const oldCollection of baselineOnlyCollections) {
    const oldModes = [...(baselineModesByCollection.get(oldCollection) || new Set<string>())];

    const matchIndex = unmatchedFetched.findIndex(newCollection => {
      const newModes = fetchedModesByCollection.get(newCollection) || new Set<string>();
      return newModes.size === oldModes.length;
    });

    if (matchIndex !== -1) {
      const newCollection = unmatchedFetched[matchIndex];
      const newModes = [...(fetchedModesByCollection.get(newCollection) || new Set<string>())];

      collectionRenames.push({ oldCollection, newCollection, modeMapping: [] });

      for (let i = 0; i < oldModes.length; i++) {
        renamedModes.add(`${oldCollection}:${oldModes[i]}`);
        if (oldModes[i] !== newModes[i]) {
          modeRenames.push({ collection: newCollection, oldMode: oldModes[i], newMode: newModes[i] });
        }
      }

      unmatchedBaseline.splice(unmatchedBaseline.indexOf(oldCollection), 1);
      unmatchedFetched.splice(matchIndex, 1);
    }
  }

  return { collectionRenames, modeRenames, renamedModes, unmatchedBaseline, unmatchedFetched };
}

/**
 * Handle unmatched collections as truly new/deleted
 */
function handleUnmatchedCollections(
  unmatchedBaseline: string[],
  unmatchedFetched: string[],
  baselineModesByCollection: Map<string, Set<string>>,
  fetchedModesByCollection: Map<string, Set<string>>
): { deletedModes: ModeChange[]; newModes: ModeChange[]; renamedModes: Set<string> } {
  const deletedModes: ModeChange[] = [];
  const newModes: ModeChange[] = [];
  const renamedModes = new Set<string>();

  for (const collection of unmatchedBaseline) {
    const modes = baselineModesByCollection.get(collection) || new Set<string>();
    for (const mode of modes) {
      deletedModes.push({ collection, mode });
      renamedModes.add(`${collection}:${mode}`);
    }
  }

  for (const collection of unmatchedFetched) {
    const modes = fetchedModesByCollection.get(collection) || new Set<string>();
    for (const mode of modes) {
      newModes.push({ collection, mode });
    }
  }

  return { deletedModes, newModes, renamedModes };
}

/**
 * Detect mode changes within shared collections
 */
function detectModeChangesInSharedCollections(
  sharedCollections: string[],
  baselineModesByCollection: Map<string, Set<string>>,
  fetchedModesByCollection: Map<string, Set<string>>
): { modeRenames: ModeRename[]; deletedModes: ModeChange[]; newModes: ModeChange[]; renamedModes: Set<string> } {
  const modeRenames: ModeRename[] = [];
  const deletedModes: ModeChange[] = [];
  const newModes: ModeChange[] = [];
  const renamedModes = new Set<string>();

  for (const collection of sharedCollections) {
    const baselineModes = baselineModesByCollection.get(collection) || new Set<string>();
    const fetchedModes = fetchedModesByCollection.get(collection) || new Set<string>();

    const deletedInCollection = [...baselineModes].filter(m => !fetchedModes.has(m));
    const newInCollection = [...fetchedModes].filter(m => !baselineModes.has(m));

    if (deletedInCollection.length === newInCollection.length && deletedInCollection.length > 0) {
      // Likely a rename
      for (let i = 0; i < deletedInCollection.length; i++) {
        modeRenames.push({ collection, oldMode: deletedInCollection[i], newMode: newInCollection[i] });
        renamedModes.add(`${collection}:${deletedInCollection[i]}`);
      }
    } else {
      // Not a simple rename
      for (const mode of deletedInCollection) {
        deletedModes.push({ collection, mode });
        renamedModes.add(`${collection}:${mode}`);
      }
      for (const mode of newInCollection) {
        newModes.push({ collection, mode });
      }
    }
  }

  return { modeRenames, deletedModes, newModes, renamedModes };
}

/**
 * Match collections and modes using heuristics (fallback for legacy baselines).
 * Uses mode count matching to infer collection renames.
 *
 * @param baselineEntries - Previous baseline entries
 * @param fetchedEntries - Newly fetched entries
 * @returns CollectionMatchResult with detected changes
 */
export function matchCollectionsByHeuristic(
  baselineEntries: Record<string, BaselineEntry>,
  fetchedEntries: Record<string, BaselineEntry>
): CollectionMatchResult {
  const baselineModesByCollection = buildModesByCollection(baselineEntries);
  const fetchedModesByCollection = buildModesByCollection(fetchedEntries);

  // Find collections only in baseline or only in fetched
  const baselineOnlyCollections = [...baselineModesByCollection.keys()].filter(
    c => !fetchedModesByCollection.has(c)
  );
  const fetchedOnlyCollections = [...fetchedModesByCollection.keys()].filter(
    c => !baselineModesByCollection.has(c)
  );

  // Match by mode count
  const matchResult = matchCollectionsByModeCount(
    baselineOnlyCollections,
    fetchedOnlyCollections,
    baselineModesByCollection,
    fetchedModesByCollection
  );

  // Handle unmatched
  const unmatchedResult = handleUnmatchedCollections(
    matchResult.unmatchedBaseline,
    matchResult.unmatchedFetched,
    baselineModesByCollection,
    fetchedModesByCollection
  );

  // Handle shared collections
  const sharedCollections = [...baselineModesByCollection.keys()].filter(c =>
    fetchedModesByCollection.has(c)
  );
  const sharedResult = detectModeChangesInSharedCollections(
    sharedCollections,
    baselineModesByCollection,
    fetchedModesByCollection
  );

  // Merge all results
  const renamedModes = new Set([
    ...matchResult.renamedModes,
    ...unmatchedResult.renamedModes,
    ...sharedResult.renamedModes,
  ]);

  return {
    collectionRenames: matchResult.collectionRenames,
    modeRenames: [...matchResult.modeRenames, ...sharedResult.modeRenames],
    newModes: [...unmatchedResult.newModes, ...sharedResult.newModes],
    deletedModes: [...unmatchedResult.deletedModes, ...sharedResult.deletedModes],
    renamedModes,
  };
}

/**
 * Check if entries have ID-based matching available
 *
 * @param entries - Baseline entries to check
 * @returns true if entries have collectionId and modeId
 */
export function hasIdBasedMatching(entries: Record<string, BaselineEntry>): boolean {
  return Object.values(entries).some(e => e.collectionId && e.modeId);
}
