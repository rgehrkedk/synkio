# Token Mapping Migration - Tasks

## Phase 0: Code Cleanup (Before Implementation)

- [x] **0.1 Remove duplicate escapeRegex functions**
  - `migrate.ts` has escapeRegex (line ~243)
  - `apply-migrations.ts` has escapeRegex (line ~18)
  - `transform.ts` exports escapeRegex
  - Consolidate to single export from `transform.ts`

- [x] **0.2 Remove legacy CSS-specific functions**
  - `pathChangeToReplacement` - replaced by `pathChangeToTokenReplacement`
  - `buildReplacements` - replaced by `buildPlatformReplacements`
  - `findCssFiles` - replaced by `findPlatformFiles`
  - `scanCssUsages` - replaced by `scanPlatformUsages`
  - `applyCssReplacements` - replaced by `applyPlatformReplacements`
  - Keep exports for backward compatibility but mark `@deprecated`

- [x] **0.3 Fix word boundary regex inconsistency**
  - `scanCssUsages` uses `createTokenBoundaryRegex` ✓
  - `applyCssReplacements` uses `createTokenBoundaryRegex` ✓
  - `scanPlatformUsages` uses plain `escapeRegex` ✗ (BUG)
  - `apply-migrations.ts` uses plain `escapeRegex` ✗ (BUG)
  - Fix: All should use boundary regex or (better) token map

- [x] **0.4 Consolidate duplicate type definitions**
  - `CssReplacement` = `TokenReplacement` (same structure)
  - `CssFileMatch` = `FileMatch` (same structure)
  - Keep one, alias the other for backward compat

## Phase 1: Token Map Generation

- [x] **1.1 Add variableId to split token files**
  - File: `src/tokens/split.ts`
  - $variableId already preserved in token output files - no changes needed

- [x] **1.2 Create token map types**
  - File: `src/types/token-map.ts`
  - Define `TokenMapEntry`, `TokenMap`, `TokenMapMetadata`, `TokenOutputs`

- [x] **1.3 Add tokenMap path to config**
  - File: `src/types/config.ts`
  - Add `paths.tokenMap` optional field
  - Default: `.figma/data/token-map.json`

- [x] **1.4 Create platform name transformers**
  - File: `src/tokens/token-map.ts`
  - `getCssVariableName(path, stripSegments)`
  - `getScssVariableName(path, stripSegments)`
  - `getJsPropertyName(path, stripSegments)`
  - `getSwiftPropertyName(path, stripSegments)`
  - `getKotlinPropertyName(path, stripSegments)`

- [x] **1.5 Create token map generator**
  - File: `src/tokens/token-map.ts`
  - `generateTokenMap(baseline, config)` → TokenMap
  - `getTokenMapPath(config)` → string
  - Iterate all tokens, generate outputs for each enabled platform

- [x] **1.6 Integrate map generation into sync**
  - File: `src/cli/commands/sync-cmd.ts`
  - After splitTokens(), call generateTokenMap() and saveJsonFile()
  - Applied to handleFirstSync, handleBreakingChanges, handleNonBreakingChanges

## Phase 2: Migration Using Token Map

- [x] **2.1 Create map loading utilities**
  - File: `src/files/loader.ts`
  - `loadTokenMap(config, ctx)` → TokenMap | null
  - Added to files/index.ts exports

- [x] **2.2 Update migration to use map**
  - File: `src/tokens/migrate.ts`
  - New function: `buildReplacementsFromMap(oldMap, newMap, platform)`
  - Returns exact old → new output name pairs based on Variable ID matching

- [x] **2.3 Update scanAllPlatforms**
  - File: `src/tokens/migrate.ts`
  - New function: `scanAllPlatformsWithMap(oldMap, newMap, platforms)`
  - Uses map-based replacements for precise matching

- [x] **2.4 Update sync-cmd to pass maps**
  - File: `src/cli/commands/sync-cmd.ts`
  - Load previous token map in handleBreakingChanges
  - Generate new token map from fetched data
  - Use scanAllPlatformsWithMap when oldMap exists

- [x] **2.5 Add fallback warning**
  - When no map available, shows warning and uses regex fallback
  - Informs user that map will be generated after sync

## Phase 3: Testing & Polish

- [ ] **3.1 Unit tests for transformers**
  - Test each platform transformer with various paths
  - Test stripSegments behavior

- [ ] **3.2 Integration test**
  - Create test tokens, generate map
  - Rename token, verify precise replacement

- [ ] **3.3 Update documentation**
  - README: explain token-map.json
  - Add to CLI help text

## Completion Checklist

- [ ] All Phase 1 tasks complete
- [ ] All Phase 2 tasks complete
- [ ] All Phase 3 tasks complete
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Pushed to main
