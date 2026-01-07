# Synkio Product Review

Deep analysis of architecture, dead ends, and shaky functionality.

---

## Critical Issues

### 1. Documentation References Deprecated `sync` Command

**Severity: Critical**

The CLI intentionally split `sync` into `pull` + `build` for better separation of concerns. However, **all documentation still references the old `sync` command.**

Current architecture:
- `synkio pull` - Fetches from Figma, updates baseline.json
- `synkio build` - Generates token files from baseline

**Evidence:**
- README.md line 87: `npx synkio sync` - outdated
- README.md lines 162-168: Documents 6 `sync` flags that don't exist
- 50+ references to `synkio sync` across docs, examples, and specs

**Impact:** Every new user following the README will hit "Unknown command: sync" error immediately.

**Fix:** Update all documentation to use `pull` + `build` workflow. Files to update:
- README.md
- packages/cli/README.md
- packages/cli/USER_GUIDE.md
- docs/CONFIGURATION.md
- docs/HOSTING.md
- docs/USE_CASES.md
- examples/*/README.md
- docs/specs/*.md

---

### 2. Dead Code in Figma Plugin

**Severity: High**

Two exported functions in [pr-handlers.ts](packages/figma-plugin/synkio-v2/src/handlers/pr-handlers.ts) are never called:

```typescript
// Lines 213-236 - Exported but never imported
export async function handleCheckPRStatus(send: SendMessage): Promise<void>

// Lines 241-288 - Exported but never imported
export async function handlePRMerged(prNumber, prUrl, send): Promise<void>
```

**Evidence:**
- [handlers/index.ts](packages/figma-plugin/synkio-v2/src/handlers/index.ts) line 29 imports only `handleCreatePR, handlePRCreated`
- No message type routes to these handlers

**Impact:**
- Dead code increases maintenance burden
- These send undefined message types (`do-check-pr-status`, `pr-merged`) that UI doesn't handle
- Incomplete PR tracking feature gives false impression of functionality

---

### 3. No Tests for Critical Commands

**Severity: High**

The three most important commands have zero test coverage:

| Command | Lines | Status |
|---------|-------|--------|
| [pull.ts](packages/cli/src/cli/commands/pull.ts) | 581 | **No tests** |
| [build.ts](packages/cli/src/cli/commands/build.ts) | 401 | **No tests** |
| [export-baseline.ts](packages/cli/src/cli/commands/export-baseline.ts) | 435 | **No tests** |

Also missing tests:
- [pipeline.ts](packages/cli/src/core/sync/pipeline.ts) - 817 lines, core orchestration
- [figma.ts](packages/cli/src/core/figma.ts) - 234 lines, API client
- [baseline.ts](packages/cli/src/core/baseline.ts) - 151 lines, data persistence

**Impact:** No safety net for the primary user workflows. Regressions likely.

---

## Architecture Issues

### 4. Dual Facade Anti-Pattern

**Severity: Medium**

The compare module has TWO facade files that both re-export the same submodules:

```
core/compare.ts          (lines 32-44) - Re-exports + implements compareBaselines()
core/compare/index.ts    (lines 8-57)  - Pure re-export facade
```

**Problem:** Commands import from both:
- `build.ts` line 23: `from '../../core/compare.js'`
- `pull.ts` line 35: `from '../../core/compare/console-display.js'` (bypasses facade)

**Impact:** Confusing import paths, facade doesn't actually encapsulate.

**Fix:** Remove `compare/index.ts`, keep all exports in `compare.ts`.

---

### 5. No Transaction Rollback in Plugin

**Severity: Medium**

[apply-handlers.ts](packages/figma-plugin/synkio-v2/src/handlers/apply-handlers.ts) applies changes to Figma without rollback:

```typescript
// Lines 75-204 - No try-catch around individual operations
for (const [path, token] of Object.entries(flatTokens)) {
  await createOrUpdateVariable(...); // If this fails mid-loop, partial state
}
```

**Impact:** If Figma API fails after creating 50 of 100 variables, you get partial state with no way to undo.

---

### 6. Generic Error Handling Loses Context

**Severity: Medium**

All plugin handlers stringify errors:

```typescript
// sync-handlers.ts:249
catch (error) {
  send({ type: 'sync-error', error: String(error) });
}
```

**Impact:** Stack traces, error types, and debugging context lost. Users see "Error: [object Object]" or bare messages.

---

## Inconsistencies

### 7. ~~Import Path Chaos~~ ✅ FIXED

~~Commands use inconsistent import patterns~~

**Status:** Fixed. All commands now import from the facade (`compare.js`). Missing exports (`compareBaselinesByPath`, `baselineHasIds`, `hasPathChanges`, `displayPathComparisonResult`) added to both `compare.ts` and `compare/index.ts`.

---

### 8. ~~Incomplete Tokens Facade~~ ✅ FIXED

~~[tokens/index.ts](packages/cli/src/core/tokens/index.ts) re-exports split strategies but NOT the main functions from [tokens.ts](packages/cli/src/core/tokens.ts)~~

**Status:** Fixed. The facade now re-exports all main functions: `splitTokens`, `splitStyles`, `normalizePluginData`, `normalizeStyleData`, `parseVariableId`, `hasStyles`, `getStyleCount`, `mapToDTCGType`, plus all associated types.

---

### 9. ~~Deprecated Fields Still in Types~~ ✅ FIXED

~~[lib/types.ts](packages/figma-plugin/synkio-v2/src/lib/types.ts) has deprecated fields with active fallback chains~~

**Status:** Fixed. Removed deprecated fields (`prPath`, `exportUrl`, `customUrl`) from type definitions and cleaned up all fallback chains in `pr-handlers.ts` and `remote-handlers.ts`.

---

## Minor Issues

### 10. Unused Error Utilities

[errors.ts](packages/figma-plugin/synkio-v2/src/lib/errors.ts) defines `ErrorCodes` and `getErrorCode()` that are never imported anywhere.

### 11. Module-Level Mutable State

[main.ts](packages/figma-plugin/synkio-v2/src/screens/main.ts) line 26:
```typescript
let currentTab: MainTab = 'sync';
```

Mutable module state can cause race conditions during rapid tab switches.

### 12. Hardcoded Plugin ID

[figma.ts](packages/cli/src/core/figma.ts) line 95:
```typescript
const pluginId = '1234567890'; // Token Vault plugin ID
```

Hardcoded placeholder that appears to be legacy/unused but still in codebase.

---

## What Works Well

1. **No circular dependencies** - Clean unidirectional module flow
2. **ID-based diffing** - Core innovation works correctly
3. **Chunked storage** - Handles Figma's 100KB limits properly
4. **Retry logic** - FigmaClient has solid exponential backoff
5. **Type safety** - Comprehensive Zod schemas for validation
6. **Comparison system** - Thoroughly tested (compare.test.ts has 850 lines)

---

## Priority Fixes

| Priority | Issue | Effort | Status |
|----------|-------|--------|--------|
| P0 | Update all docs from `sync` to `pull`+`build` | 2h | ✅ Fixed |
| P0 | Add tests for pull/build commands | 4h | ✅ Fixed |
| P1 | Remove dead PR status code | 30m | |
| P1 | Add rollback for apply operations | 2h | |
| P2 | Consolidate compare facades | 1h | ✅ Fixed |
| P2 | Standardize import paths | 1h | ✅ Fixed |
| P3 | Remove deprecated type fields | 1h | ✅ Fixed |
| P3 | Clean up unused error utilities | 30m | |

---

## Summary

The core token syncing functionality is solid. The ID-based diffing is genuinely innovative. ~~However, the product has significant documentation rot (`sync` command), dead code in the plugin, and zero test coverage for primary user workflows.~~ **Update:** Documentation has been fixed and tests have been added for pull/build commands. ~~The architecture is clean but has inconsistent facade patterns that make the codebase harder to navigate.~~ **Update:** Facade inconsistencies have been resolved.

**Recommendation:** Continue adding more comprehensive integration tests and address the remaining P1 issues (dead PR status code, apply rollback).

---

## Changelog

- **2026-01-05:** Added tests for pull and build commands (Issue #3 - P0 priority)
- **2026-01-04:** Fixed import path chaos, incomplete tokens facade, and deprecated type fields (Issues #7, #8, #9)
