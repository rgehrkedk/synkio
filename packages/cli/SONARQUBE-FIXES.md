# SonarQube Fixes - Technical Specification

**Author:** Claude Opus 4.5 (AI Code Reviewer)
**Date:** 2025-12-20
**Branch:** `refactor/cli-cognitive-complexity`
**Context:** Independent code review of the `packages/cli` codebase

---

## Executive Summary

I conducted a thorough review of the Synkio CLI package and analyzed 26 SonarQube findings. After examining the actual code, I've categorized them by legitimacy and priority. **6 findings require action**, the rest are false positives, borderline cases, or stylistic preferences.

This document provides actionable specifications for each fix.

---

## Priority Matrix

| Priority | Count | Effort | Description |
|----------|-------|--------|-------------|
| P0 - Critical | 2 | 2-3 hrs | Cognitive complexity in collection-matcher.ts |
| P1 - High | 4 | 1 hr | Unused imports, duplicate imports, dead code |
| P2 - Medium | 2 | 30 min | Borderline complexity (optional) |
| P3 - Skip | 18 | - | False positives or stylistic |

---

## P0 - Critical Fixes

### 1. `matchCollectionsById` - Cognitive Complexity 38 → 15

**File:** `src/core/compare/collection-matcher.ts:91-178`
**Rule:** S3776

**Problem:**
Function has 5 separate `for` loops with nested conditionals. Each loop handles a distinct concern but they're all in one function.

**Solution:**
Extract each loop into a focused helper function:

```typescript
// NEW: Extract these helper functions

function detectCollectionRenames(
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

function detectModeRenames(
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

function detectNewCollections(
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

function detectDeletedCollections(
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

function detectModeChangesWithinCollections(
  baselineCollections: Map<string, CollectionInfo>,
  fetchedCollections: Map<string, CollectionInfo>
): { newModes: ModeChange[]; deletedModes: ModeChange[]; renamedModes: Set<string> } {
  const newModes: ModeChange[] = [];
  const deletedModes: ModeChange[] = [];
  const renamedModes = new Set<string>();

  for (const [collectionId, baselineCol] of baselineCollections) {
    const fetchedCol = fetchedCollections.get(collectionId);
    if (!fetchedCol) continue;

    for (const [modeId, modeName] of fetchedCol.modes) {
      if (!baselineCol.modes.has(modeId)) {
        newModes.push({ collection: fetchedCol.name, mode: modeName });
      }
    }

    for (const [modeId, modeName] of baselineCol.modes) {
      if (!fetchedCol.modes.has(modeId)) {
        deletedModes.push({ collection: baselineCol.name, mode: modeName });
        renamedModes.add(`${baselineCol.name}:${modeName}`);
      }
    }
  }

  return { newModes, deletedModes, renamedModes };
}
```

**Refactored main function:**

```typescript
export function matchCollectionsById(
  baselineEntries: Record<string, BaselineEntry>,
  fetchedEntries: Record<string, BaselineEntry>
): CollectionMatchResult {
  const baselineCollections = buildCollectionMaps(baselineEntries);
  const fetchedCollections = buildCollectionMaps(fetchedEntries);

  const collectionRenames = detectCollectionRenames(baselineCollections, fetchedCollections);
  const modeRenameResult = detectModeRenames(baselineCollections, fetchedCollections);
  const newFromNewCollections = detectNewCollections(baselineCollections, fetchedCollections);
  const deletedResult = detectDeletedCollections(baselineCollections, fetchedCollections);
  const withinResult = detectModeChangesWithinCollections(baselineCollections, fetchedCollections);

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
```

**Test Impact:** Existing tests should pass. Add unit tests for each extracted function.

---

### 2. `matchCollectionsByHeuristic` - Cognitive Complexity 30 → 15

**File:** `src/core/compare/collection-matcher.ts:188-309`
**Rule:** S3776

**Problem:**
Similar structure to `matchCollectionsById` but with heuristic matching logic. Multiple nested loops with complex conditions.

**Solution:**
Apply the same extraction pattern. Key helpers to extract:

```typescript
function matchCollectionsByModeCount(
  baselineOnlyCollections: string[],
  fetchedOnlyCollections: string[],
  baselineModesByCollection: Map<string, Set<string>>,
  fetchedModesByCollection: Map<string, Set<string>>
): {
  collectionRenames: CollectionRename[];
  modeRenames: ModeRename[];
  renamedModes: Set<string>;
  unmatchedBaseline: string[];
  unmatchedFetched: string[];
} {
  // ... extraction of lines 214-256
}

function handleUnmatchedCollections(
  unmatchedBaseline: string[],
  unmatchedFetched: string[],
  baselineModesByCollection: Map<string, Set<string>>,
  fetchedModesByCollection: Map<string, Set<string>>
): {
  deletedModes: ModeChange[];
  newModes: ModeChange[];
  renamedModes: Set<string>;
} {
  // ... extraction of lines 258-272
}

function detectModeChangesInSharedCollections(
  sharedCollections: string[],
  baselineModesByCollection: Map<string, Set<string>>,
  fetchedModesByCollection: Map<string, Set<string>>
): {
  modeRenames: ModeRename[];
  deletedModes: ModeChange[];
  newModes: ModeChange[];
  renamedModes: Set<string>;
} {
  // ... extraction of lines 274-306
}
```

**Note:** Consider whether both ID-based and heuristic matching share enough logic to create a common abstraction. They follow similar patterns but with different matching strategies.

---

## P1 - High Priority Fixes

### 3. Unused Import: `hasBreakingChanges`

**File:** `src/core/sync/pipeline.ts:17`
**Rule:** S1128

**Fix:**
```diff
- import { compareBaselines, hasChanges, hasBreakingChanges, getChangeCounts, ... } from '../compare.js';
+ import { compareBaselines, hasChanges, getChangeCounts, ... } from '../compare.js';
```

**Why unused:** The `shouldBlockSync` function in `breaking-changes.ts` now handles this check.

---

### 4. Unused Import: `SplitStyleFile`

**File:** `src/core/sync/style-merger.ts:17`
**Rule:** S1128

**Fix:**
```diff
- import type { SplitStyles, SplitStyleFile, MergeInto } from '../tokens.js';
+ import type { SplitStyles, MergeInto } from '../tokens.js';
```

---

### 5. Duplicate Imports from `../compare.js`

**File:** `src/core/sync/breaking-changes.ts:10-11`
**Rule:** S3863

**Current:**
```typescript
import { hasBreakingChanges } from '../compare.js';
import { hasBreakingStyleChanges } from '../compare.js';
```

**Fix:**
```typescript
import { hasBreakingChanges, hasBreakingStyleChanges } from '../compare.js';
```

---

### 6. Useless Assignment: `docsDir`

**File:** `src/core/sync/pipeline.ts:487-493`
**Rule:** S1854

**Current:**
```typescript
let docsDir = '';
if (config.docsPages?.enabled) {
  spinner.text = 'Generating documentation...';
  const docsResult = await generateDocsFromBaseline(newBaseline, config);
  docsFilesWritten = docsResult.files.length;
  docsDir = docsResult.outputDir;  // Never used
}
```

**Options:**

A) **Remove if unused:**
```typescript
if (config.docsPages?.enabled) {
  spinner.text = 'Generating documentation...';
  const docsResult = await generateDocsFromBaseline(newBaseline, config);
  docsFilesWritten = docsResult.files.length;
}
```

B) **Use it** (e.g., in logging or result):
```typescript
// Add to SyncPipelineResult interface if needed
docsDir?: string;

// Then in return:
return {
  // ...
  docsDir: docsDir || undefined,
};
```

**Recommendation:** Option A unless there's a planned use for `docsDir`.

---

## P2 - Medium Priority (Optional)

### 7. `normalizePluginData` - Cognitive Complexity 22 → 15

**File:** `src/core/tokens.ts:141-213`
**Rule:** S3776

**Problem:**
Nested if/else chain for format detection with error handling.

**Suggested Refactor:**
Use early returns and extract format detection:

```typescript
type PluginDataFormat = 'synkio' | 'legacy-baseline' | 'legacy-direct' | 'unknown';

function detectPluginDataFormat(rawData: any): PluginDataFormat {
  if (rawData.tokens && Array.isArray(rawData.tokens)) {
    return 'synkio';
  }
  if (rawData.baseline && typeof rawData.baseline === 'object') {
    return 'legacy-baseline';
  }
  if (typeof rawData === 'object' && !rawData.tokens && !rawData.baseline) {
    const firstKey = Object.keys(rawData)[0];
    if (firstKey && rawData[firstKey]?.path !== undefined) {
      return 'legacy-direct';
    }
  }
  return 'unknown';
}

function normalizeSynkioFormat(rawData: any): RawTokens {
  const validationResult = SynkioPluginDataSchema.safeParse(rawData);
  if (!validationResult.success) {
    throw createValidationError(validationResult.error);
  }
  // ... rest of synkio normalization
}

export function normalizePluginData(rawData: any): RawTokens {
  const format = detectPluginDataFormat(rawData);

  switch (format) {
    case 'synkio':
      return normalizeSynkioFormat(rawData);
    case 'legacy-baseline':
      return rawData.baseline;
    case 'legacy-direct':
      return rawData;
    default:
      throw new Error('Unrecognized plugin data format...');
  }
}
```

**Priority:** Medium - current code works fine, this is a readability improvement.

---

### 8. `executeSyncPipeline` - Cognitive Complexity 27 → 15

**File:** `src/core/sync/pipeline.ts:280-525`
**Rule:** S3776

**Problem:**
This is your main orchestrator with 14 steps. Some complexity is inherent.

**Suggested Extractions:**

```typescript
// Extract: Collection filtering (lines 351-368)
function filterByCollection(
  tokens: RawTokens,
  collectionFilter: string,
  logger: Logger
): RawTokens {
  const collectionsToSync = new Set(
    collectionFilter.split(',').map(c => c.trim().toLowerCase())
  );

  const filtered = Object.fromEntries(
    Object.entries(tokens).filter(([_, entry]) => {
      const entryCollection = (entry.collection || entry.path.split('.')[0]).toLowerCase();
      return collectionsToSync.has(entryCollection);
    })
  );

  if (Object.keys(filtered).length === 0) {
    throw new Error(`No tokens found for collection(s): ${collectionFilter}`);
  }

  logger.debug(`Filtered to ${Object.keys(filtered).length} tokens`);
  return filtered;
}

// Extract: Baseline building (lines 374-380)
function buildNewBaseline(tokens: RawTokens, styles?: RawStyles): BaselineData {
  return {
    baseline: tokens,
    styles,
    metadata: {
      syncedAt: new Date().toISOString(),
    },
  };
}
```

**Priority:** Medium - the function is well-commented and follows a clear step sequence.

---

## P3 - Skip (False Positives / Stylistic)

These do not require action:

| Rule | File:Line | Reason to Skip |
|------|-----------|----------------|
| S2486 | config.ts:205-207 | **False positive** - catch block DOES handle error (rethrows with context) |
| S2486 | config.ts:212-214 | **False positive** - same as above |
| S3776 | config.ts:242 | Borderline (16 vs 15), refactoring would hurt readability |
| S3776 | html-generator.ts:73 | Template code, nested ternaries are readable in context |
| S3358 | html-generator.ts:103+ | 6 violations for template ternaries - acceptable for HTML generation |
| S6582 | source-resolver.ts:113 | Stylistic - explicit null check is equally valid |
| S7735 | html-generator.ts:314 | Pedantic - positive/negative condition order is fine |
| S3776 | style-merger.ts:182 | Borderline (17 vs 15), code is clear |
| S1854 | token-builder.ts:82 | **False positive** - variable IS used after destructuring |

---

## Testing Requirements

After implementing P0 and P1 fixes:

```bash
# Run full test suite
npm run test

# Verify no regressions in comparison logic
npm run test -- collection-matcher

# Verify pipeline still works
npm run test -- pipeline
```

**Expected:** All 349 tests should pass.

---

## Verification

After fixes, run SonarQube analysis to confirm:

```bash
# If using SonarLint in IDE, just save files and check
# If using sonar-scanner:
sonar-scanner -Dsonar.projectKey=synkio-cli
```

**Target:** Reduce from 26 findings to ~18 (P3 items will remain as accepted technical debt).

---

## Questions for Developer - ANSWERED

### 1. `docsDir` variable - Keep and use for `--open` flag

**Decision:** Keep `docsDir` and implement a `--open` flag.

**Scope:**

```typescript
// New CLI options
synkio sync --open    // Opens docs folder after sync (if docsPages.enabled)
synkio docs --open    // Opens docs folder after generation
```

**Implementation:**

```typescript
// src/core/sync/pipeline.ts - Update SyncPipelineResult
export interface SyncPipelineResult {
  filesWritten: number;
  styleFilesWritten: number;
  docsFilesWritten: number;
  docsDir?: string;        // ← Add this
  cssFilesWritten: number;
  buildScriptRan: boolean;
  hasChanges: boolean;
  reportPath?: string;
}

// Return docsDir in result
return {
  // ...existing fields
  docsDir: docsDir || undefined,
};
```

```typescript
// src/cli/commands/sync.ts - Handle --open flag
import { openFolder } from '../utils.js';

// After sync completes:
if (options.open && result.docsDir) {
  await openFolder(result.docsDir);
}
```

```typescript
// src/cli/utils.ts - Cross-platform folder opener
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function openFolder(path: string): Promise<void> {
  const command = process.platform === 'darwin'
    ? `open "${path}"`
    : process.platform === 'win32'
      ? `start "" "${path}"`
      : `xdg-open "${path}"`;

  await execAsync(command);
}
```

**CLI changes:**

```typescript
// src/cli/bin.ts - Add --open flag to sync command
.option('--open', 'Open docs folder after sync')

// src/cli/commands/docs.ts - Add --open flag
.option('--open', 'Open docs folder after generation')
```

---

### 2. Heuristic matcher - Full refactor

**Decision:** Apply the same extraction pattern as the ID-based matcher.

**Rationale:**
- Fallback code that breaks is the worst kind of bug (hard to reproduce)
- Consistent structure between both matchers reduces cognitive load
- Makes future maintenance easier

**Action:** Refactor `matchCollectionsByHeuristic` using the same helper extraction pattern shown in P0 section above.

---

### 3. Test coverage - Test public API only

**Decision:** No new unit tests for extracted helpers.

**Rationale:**
- Extracted helpers are implementation details
- Existing tests for `matchCollectionsById` and `matchCollectionsByHeuristic` provide sufficient coverage
- Testing helpers directly couples tests to structure, making future refactoring painful

**Exception:** If the "match by mode count" heuristic logic is complex enough to warrant isolated testing, add one targeted test for that specific helper.

**Verification:** After refactoring, run existing tests:
```bash
npm run test -- collection-matcher
```

All existing tests should pass without modification.

---

## Summary of Decisions

| Item | Decision | Effort |
|------|----------|--------|
| `docsDir` | Keep + implement `--open` flag | +30 min |
| Heuristic matcher | Full refactor (same pattern as ID matcher) | Included in P0 |
| Helper tests | No - existing public API tests are sufficient | 0 |

**Updated total effort:** ~4 hours (was 3-4 hours)

---

*Review conducted by Claude Opus 4.5. Decisions confirmed by product owner 2025-12-20.*
