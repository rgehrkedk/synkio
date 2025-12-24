# Synkio Figma Plugin - Code Breakdown & Cleanup Spec

## Overview

This document breaks down the Figma plugin codebase for maintenance purposes and identifies legacy/redundant code that should be removed.

**Current State:**
- ~2,575 lines of TypeScript
- Multiple code duplications identified
- Dead code files and functions present
- Type definitions scattered across files

---

## Code Cleanup Summary

### Immediate Actions Required

| Priority | Issue | Location | Action | Lines Saved |
|----------|-------|----------|--------|-------------|
| **P0** | Dead file | `shared.ts` | DELETE entire file | 166 lines |
| **P0** | Duplicate function | `code.ts:631-688` | DELETE, use lib/remote-fetch.ts | 57 lines |
| **P0** | Dead function | `code.ts:895-930` | DELETE `resolveReference()` | 35 lines |
| **P1** | Unused exports | `lib/github.ts` | Remove 3 functions | 75 lines |
| **P1** | Unused exports | `lib/settings.ts` | Remove 2 functions | 75 lines |
| **P1** | Unused exports | `lib/types.ts` | Remove 5 types | 25 lines |
| **P2** | Duplicate types | `ui.ts:5-32` | Import from lib/types.ts | 27 lines |

**Total lines to remove: ~460 lines (~18% of codebase)**

---

## Detailed Breakdown

### 1. DEAD FILE: `shared.ts` (166 lines)

**Status:** DELETE ENTIRE FILE

**Evidence:**
```bash
# No imports found
grep -r "from './shared" . → 0 results
```

**Contents (all duplicated elsewhere):**

| Code in shared.ts | Already exists in |
|-------------------|-------------------|
| `TokenEntry` interface | `lib/types.ts:9-21` |
| `SyncData` interface | `lib/types.ts:119-124` |
| `ChangeType` type | `lib/types.ts:126` |
| `DiffEntry` interface | `lib/types.ts:128-136` |
| `SyncEvent` interface | `lib/types.ts:138-143` |
| `chunkData()` function | `lib/chunking.ts:8-14` |
| `reassembleChunks()` function | `lib/chunking.ts:16-25` |
| `addHistoryEntry()` function | `lib/history.ts:9-14` |
| `parseHistory()` function | `lib/history.ts:17-23` |
| `serializeHistory()` function | `lib/history.ts:26-28` |
| `compareSnapshots()` function | `lib/compare.ts:33-196` (improved version) |

**Note:** The `compareSnapshots()` in `shared.ts` is an older, simpler version. The `lib/compare.ts` version includes style support and rename detection.

---

### 2. DUPLICATE FUNCTION: `convertCLIBaselineToSyncData`

**Defined in TWO places:**
- `code.ts:631-688` (57 lines)
- `lib/remote-fetch.ts:119-176` (57 lines)

**The code is IDENTICAL.**

**Action:** Delete from `code.ts`, import from `lib/remote-fetch.ts`

```typescript
// code.ts - BEFORE (line 631)
function convertCLIBaselineToSyncData(cliBaseline: any): SyncData | { error: string } {
  // ... 57 lines of duplicate code
}

// code.ts - AFTER
import { convertCLIBaselineToSyncData } from './lib/remote-fetch';
```

**Note:** The function in `lib/remote-fetch.ts` is NOT currently exported. Need to add `export`:

```typescript
// lib/remote-fetch.ts - Line 119
// Change from:
function convertCLIBaselineToSyncData(...)
// To:
export function convertCLIBaselineToSyncData(...)
```

---

### 3. DEAD FUNCTION: `resolveReference()`

**Location:** `code.ts:895-930` (35 lines)

**Evidence:**
```bash
grep -r "resolveReference(" .
# Only result is the definition itself at line 895
```

**This function is never called.** The code uses `caseInsensitiveGet()` directly instead.

**Action:** DELETE lines 895-930

```typescript
// DELETE THIS ENTIRE BLOCK (code.ts:895-930)
function resolveReference(
  refPath: string,
  currentCollection: string,
  existingVars: Map<string, Variable>,
  createdVars: Map<string, string>
): string {
  // ... 35 lines of dead code
}
```

---

### 4. UNUSED EXPORTS: `lib/github.ts`

**Exported but never imported:**

| Export | Lines | Status |
|--------|-------|--------|
| `isGitHubUrl()` | 147-173 (26 lines) | UNUSED |
| `TokenInfo` interface | 178-183 (5 lines) | UNUSED |
| `validateGitHubToken()` | 201-250 (49 lines) | UNUSED |

**Evidence:**
```bash
grep -r "isGitHubUrl\|validateGitHubToken\|TokenInfo" . --include="*.ts"
# Only results are definitions in lib/github.ts
```

**Action Options:**
1. **DELETE** if not planned for future use
2. **Keep but mark** with `// @internal - not currently used` comment

**Recommendation:** DELETE - these can be re-added from git history if needed.

---

### 5. UNUSED EXPORTS: `lib/settings.ts`

**Exported but never imported:**

| Export | Lines | Status |
|--------|-------|--------|
| `validateRemoteUrl()` | 120-153 (33 lines) | UNUSED |
| `validateGitHubSettings()` | 158-193 (35 lines) | UNUSED |

**Evidence:**
```bash
grep -r "validateRemoteUrl\|validateGitHubSettings" . --include="*.ts"
# Only results are definitions in lib/settings.ts
```

**Recommendation:** These validation functions SHOULD be used but aren't. Two options:
1. **DELETE** now and re-add when implementing validation
2. **INTEGRATE** into save flow (better UX)

---

### 6. UNUSED EXPORTS: `lib/types.ts`

**Never imported outside of lib/ folder:**

| Export | Line | Imported by |
|--------|------|-------------|
| `ChangeType` | 126 | None |
| `DiffEntry` | 128-136 | None (redefined in ui.ts) |
| `CollectionRename` | 145-148 | None (redefined in ui.ts) |
| `ModeRename` | 150-154 | None (redefined in ui.ts) |
| `ComparisonResult` | 156-160 | None |

**Action:** These types SHOULD be used by `ui.ts` but are redefined locally instead.

---

### 7. DUPLICATE TYPES: `ui.ts`

**Lines 5-32 redefine types that exist in `lib/types.ts`:**

```typescript
// ui.ts - Lines 5-32 (DUPLICATES)
interface DiffEntry {        // Same as lib/types.ts:128
  id: string;
  name: string;
  type: 'added' | 'deleted' | 'modified' | 'renamed';
  oldName?: string;
  oldValue?: any;
  newValue?: any;
  collection: string;
  mode: string;
}

interface CollectionRename {  // Same as lib/types.ts:145
  oldCollection: string;
  newCollection: string;
}

interface ModeRename {        // Same as lib/types.ts:150
  collection: string;
  oldMode: string;
  newMode: string;
}

interface SyncEvent {         // Same as lib/types.ts:138
  u: string;
  t: number;
  c: number;
  p?: string[];
}
```

**Problem:** `ui.ts` runs in browser context (no access to `lib/`).

**Solution Options:**
1. Keep duplicates (current state) - they're separate bundles
2. Create shared types file that both can import during build

**Recommendation:** Keep as-is since UI and code.ts are separate bundles. Document this intentional duplication.

---

## File Structure After Cleanup

```
synkio-ui/
├── code.ts              # 1,481 → ~1,330 lines (-150)
├── ui.ts                # 930 lines (unchanged - types intentionally duplicated)
├── shared.ts            # DELETE (166 lines)
├── ui.template.html     # 994 lines (unchanged)
│
├── lib/
│   ├── types.ts         # 161 → ~136 lines (-25)
│   ├── compare.ts       # 197 lines (unchanged)
│   ├── settings.ts      # 364 → ~296 lines (-68)
│   ├── remote-fetch.ts  # 412 lines (add export)
│   ├── github.ts        # 251 → ~175 lines (-76)
│   ├── history.ts       # 28 lines (unchanged)
│   ├── sanitize.ts      # 96 lines (unchanged)
│   └── chunking.ts      # 25 lines (unchanged)
```

---

## Implementation Steps

### Step 1: Delete `shared.ts`

```bash
rm packages/figma-plugin/synkio-ui/shared.ts
```

### Step 2: Fix `convertCLIBaselineToSyncData` duplication

1. Export from remote-fetch.ts:
```typescript
// lib/remote-fetch.ts line 119
export function convertCLIBaselineToSyncData(cliBaseline: any): SyncData | { error: string } {
```

2. Update code.ts imports:
```typescript
// code.ts - add to imports
import { fetchRemoteBaseline, checkForUpdates, convertCLIBaselineToSyncData } from './lib/remote-fetch';
```

3. Delete code.ts lines 619-688 (CLIBaseline interface + function)

### Step 3: Delete dead `resolveReference` function

Delete code.ts lines 895-930

### Step 4: Clean unused exports from lib/github.ts

Delete these blocks:
- Lines 147-173: `isGitHubUrl()` function
- Lines 175-183: `TokenInfo` interface
- Lines 185-189: `MINIMUM_SCOPE` and `ACCEPTABLE_SCOPES` constants
- Lines 201-250: `validateGitHubToken()` function

### Step 5: Clean unused exports from lib/settings.ts

Delete these blocks:
- Lines 107-116: `UrlValidationResult` interface
- Lines 120-153: `validateRemoteUrl()` function
- Lines 158-193: `validateGitHubSettings()` function

### Step 6: Clean unused exports from lib/types.ts

Delete these blocks:
- Line 126: `ChangeType` type
- Lines 128-136: `DiffEntry` interface
- Lines 145-160: `CollectionRename`, `ModeRename`, `ComparisonResult`

---

## Module Dependency Graph

```
code.ts
├── lib/chunking.ts      ✓ (used: chunkData, reassembleChunks)
├── lib/compare.ts       ✓ (used: compareSnapshots, SimpleDiff, SimpleCompareResult)
├── lib/history.ts       ✓ (used: addHistoryEntry, parseHistory, serializeHistory)
├── lib/settings.ts      ✓ (used: getSettings, saveSettings, saveLastFetchInfo, getLastFetchInfo)
│   └── lib/sanitize.ts  ✓ (internal dependency)
├── lib/remote-fetch.ts  ✓ (used: fetchRemoteBaseline, checkForUpdates)
│   ├── lib/settings.ts  ✓ (internal)
│   ├── lib/github.ts    ✓ (internal)
│   └── lib/types.ts     ✓ (internal)
├── lib/github.ts        ✓ (used: parseGitHubUrl, buildGitHubRawUrl)
└── lib/types.ts         ✓ (used: SyncData, TokenEntry, SyncEvent, StyleEntry, etc.)

ui.ts (browser bundle - no lib/ imports)
└── Communicates via postMessage with code.ts
```

---

## Functions by File

### code.ts (Backend) - Key Functions

| Function | Lines | Status |
|----------|-------|--------|
| `getExcludedCollections()` | 46-54 | ✓ KEEP |
| `getExcludedStyleTypes()` | 59-67 | ✓ KEEP |
| `resolveValue()` | 72-87 | ✓ KEEP |
| `collectTokens()` | 92-131 | ✓ KEEP |
| `buildVariableMap()` | 140-155 | ✓ KEEP |
| `roundValue()` | 161-164 | ✓ KEEP |
| `formatPx()` | 169-172 | ✓ KEEP |
| `rgbaToString()` | 177-187 | ✓ KEEP |
| `fontStyleToWeight()` | 192-204 | ✓ KEEP |
| `formatLineHeight()` | 209-218 | ✓ KEEP |
| `formatLetterSpacing()` | 223-229 | ✓ KEEP |
| `mapTextCase()` | 234-241 | ✓ KEEP |
| `mapTextDecoration()` | 246-252 | ✓ KEEP |
| `mapGradientType()` | 257-266 | ✓ KEEP |
| `convertPaintStyle()` | 271-337 | ✓ KEEP |
| `convertTextStyle()` | 343-396 | ✓ KEEP |
| `formatShadow()` | 401-422 | ✓ KEEP |
| `convertEffectStyle()` | 427-478 | ✓ KEEP |
| `collectStyles()` | 483-514 | ✓ KEEP |
| `getBaselineSnapshot()` | 519-534 | ✓ KEEP |
| `saveBaselineSnapshot()` | 539-574 | ✓ KEEP |
| `getHistory()` | 579-582 | ✓ KEEP |
| `addToHistory()` | 587-591 | ✓ KEEP |
| `filterBaselineByExclusions()` | 596-615 | ✓ KEEP |
| `convertCLIBaselineToSyncData()` | 631-688 | **DELETE (duplicate)** |
| `buildExistingVariableMap()` | 694-710 | ✓ KEEP |
| `buildCollectionMap()` | 712-721 | ✓ KEEP |
| `getOrCreateCollection()` | 723-735 | ✓ KEEP |
| `getOrCreateMode()` | 737-760 | ✓ KEEP |
| `mapTokenTypeToFigma()` | 762-778 | ✓ KEEP |
| `parseColorValue()` | 780-801 | ✓ KEEP |
| `convertValueToFigma()` | 803-837 | ✓ KEEP |
| `extractReferences()` | 839-845 | ✓ KEEP |
| `sortByDependencies()` | 847-893 | ✓ KEEP |
| `resolveReference()` | 895-930 | **DELETE (dead code)** |
| `caseInsensitiveGet()` | 936-951 | ✓ KEEP |
| `applyBaselineToFigma()` | 953-1053 | ✓ KEEP |
| `sendDiffToUI()` | 1058-1110 | ✓ KEEP |

### ui.ts (Frontend) - All Functions

| Function | Lines | Status |
|----------|-------|--------|
| `updateRemoteStatus()` | 108-154 | ✓ KEEP |
| `showSettingsPanel()` | 156-160 | ✓ KEEP |
| `hideSettingsPanel()` | 162-164 | ✓ KEEP |
| `updateSourceTypeVisibility()` | 166-172 | ✓ KEEP |
| `populateSettingsForm()` | 174-203 | ✓ KEEP |
| `renderCollections()` | 398-401 | ✓ KEEP |
| `renderStyleTypes()` | 404-407 | ✓ KEEP |
| `updateCollectionsView()` | 410-469 | ✓ KEEP |
| `validateCollections()` | 472-483 | ✓ KEEP |
| `updateExcludedBadge()` | 486-497 | ✓ KEEP |
| `renderDiffs()` | 500-625 | ✓ KEEP |
| `renderHistory()` | 628-674 | ✓ KEEP |
| `toggleChanges()` | 677-685 | ✓ KEEP |
| `escapeHtml()` | 691-695 | ✓ KEEP |
| `formatValue()` | 698-703 | ✓ KEEP |
| `formatTimeAgo()` | 706-715 | ✓ KEEP |
| `updateStatus()` | 718-726 | ✓ KEEP |

---

## Testing After Cleanup

After making changes, verify:

1. **Build succeeds:**
   ```bash
   cd packages/figma-plugin/synkio-ui
   npm run build
   ```

2. **No runtime errors** - Load plugin in Figma and test:
   - [ ] Sync button works
   - [ ] Import baseline works
   - [ ] Apply to Figma works
   - [ ] Remote fetch works (GitHub, URL, localhost)
   - [ ] Collections exclusion works
   - [ ] History shows correctly

3. **CLI can still read data:**
   ```bash
   cd packages/cli
   npm run build
   npx synkio sync
   ```

---

## Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total TypeScript lines | ~2,575 | ~2,115 | -460 (-18%) |
| Files | 11 | 10 | -1 |
| Duplicate functions | 2 | 0 | -2 |
| Dead functions | 1 | 0 | -1 |
| Unused exports | 10 | 0 | -10 |

The codebase will be cleaner, more maintainable, and easier to understand after these changes.
