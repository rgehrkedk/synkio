# Synkio-v2 Figma Plugin Refactoring Plan

## Overview

Refactor the synkio-v2 Figma plugin to fix 117 TypeScript errors, remove legacy/dead code, eliminate duplication, and decompose the monolithic code.ts into focused modules.

## Backup Created

A backup of the original synkio-v2 plugin was created at:
`packages/figma-plugin/synkio-v2-backup-20251228-212416/`

## Dead Code Verification Summary

All dead code items have been **verified** through grep searches to confirm they are not used:

| Item | Location | Verification |
|------|----------|--------------|
| `isReference()` | compare.ts:469 | Only definition found, never called |
| `compareByPath()` | compare.ts:477 | Exported but never imported |
| `compareStylesByPath()` | compare.ts:561 | Only called by unused compareByPath |
| `hasChanges()` | compare.ts:633 | Never imported (sync.ts uses local variable with same name) |
| `hasBreakingChanges()` | compare.ts:650 | Never imported |
| `getTimestamp()` | storage.ts:76 | Only definition found, never called |
| `filterBaseline()` | code.ts:1271 | Only definition found, never called |
| `show()` / `hide()` | components.ts:55-61 | Only definitions found, never called |
| `createSpacer()` | router.ts:148 | Only definition found, never called |
| `createText()` | router.ts:164 | Imported in sync.ts/home.ts but never called |
| `resetOnboarding` | screens/index.ts:10 | KEEP - useful cleanup function, needs to be wired up |
| `DiffSummary` | types.ts:255 | Only definition found, never used |
| 8 unused icons | icons.ts | Only definitions found, never rendered |

**Note:** `updateConnectionStatus` was initially flagged but IS used in main.ts:230 - verified and kept.

---

## Phase 1: Fix TypeScript Configuration

**Problem:** `tsconfig.json` has `"lib": ["ES2020"]` which excludes DOM types. The UI files need HTMLElement, document, window, etc.

**Solution:** Create separate tsconfig files for the two environments.

### Files to Create/Modify

| File | Action |
|------|--------|
| `tsconfig.base.json` | CREATE - Shared compiler options |
| `tsconfig.code.json` | CREATE - Figma sandbox (no DOM, uses @figma types) |
| `tsconfig.ui.json` | CREATE - UI iframe (with DOM types) |
| `tsconfig.json` | MODIFY - Reference project configs |

### Configuration

**tsconfig.base.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

**tsconfig.code.json:**
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2020"],
    "typeRoots": ["./node_modules/@figma"]
  },
  "include": ["src/code.ts", "src/lib/**/*.ts"]
}
```

**tsconfig.ui.json:**
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["src/ui/**/*.ts", "src/screens/**/*.ts"]
}
```

**tsconfig.json:**
```json
{
  "references": [
    { "path": "./tsconfig.code.json" },
    { "path": "./tsconfig.ui.json" }
  ],
  "files": []
}
```

---

## Phase 2: Remove Dead/Legacy Code

### compare.ts - Remove 5 functions

| Function | Lines | Reason |
|----------|-------|--------|
| `isReference()` | ~469-471 | Never called |
| `compareByPath()` | ~477-556 | Legacy fallback, unused |
| `compareStylesByPath()` | ~561-618 | Only used by compareByPath |
| `hasChanges()` | ~633-648 | Duplicate of countChanges > 0 |
| `hasBreakingChanges()` | ~650-658 | Never used |

### storage.ts - Remove 1 function

| Function | Lines | Reason |
|----------|-------|--------|
| `getTimestamp()` | ~76-78 | Never called |

### code.ts - Remove 1 function

| Function | Lines | Reason |
|----------|-------|--------|
| `filterBaseline()` | ~1271-1300 | Defined but never called |

### components.ts - Remove 2 functions

| Function | Lines | Reason |
|----------|-------|--------|
| `show()` | ~55-57 | Never called |
| `hide()` | ~59-61 | Never called |

### router.ts - Remove 2 functions

| Function | Lines | Reason |
|----------|-------|--------|
| `createSpacer()` | ~148-152 | Never used |
| `createText()` | ~164-175 | Never used |

### screens/index.ts - Keep resetOnboarding export (FIX, not remove)

| Export | Action |
|--------|--------|
| `resetOnboarding` | KEEP - needs to be called on navigation and data-clear |

---

## Phase 2b: Add Screen Cleanup Hooks

**Problem:** Module-level state in screens persists incorrectly across navigation.

**Affected screens:**
- `onboarding.ts` - `currentStep`, `githubRepo` persist when user navigates away
- `apply.ts` - `currentView` persists (should reset to 'source')
- `settings.ts` - `githubForm`, `connectionStatus` persist

**Solution:** Add cleanup functions and call them on navigation.

### Create cleanup functions

**apply.ts** - Add:
```typescript
export function resetApplyScreen() {
  currentView = 'source';
}
```

**settings.ts** - Add:
```typescript
export function resetSettingsScreen() {
  githubForm = {};
  connectionStatus = { tested: false };
}
```

### Update router.ts

Add `onLeave` callbacks to the router:

```typescript
export type ScreenCleanup = () => void;

const screenCleanup: Partial<Record<Screen, ScreenCleanup>> = {
  onboarding: resetOnboarding,
  apply: resetApplyScreen,
  settings: resetSettingsScreen,
};

// In navigate():
navigate: (screen: Screen) => {
  // Call cleanup for current screen before switching
  const cleanup = screenCleanup[state.screen];
  if (cleanup) cleanup();

  state = { ...state, screen };
  render();
},
```

### Update main.ts

Call `resetOnboarding()` on `data-cleared`:

```typescript
case 'data-cleared':
  resetOnboarding(); // Reset UI state before closing
  alert('All plugin data has been cleared...');
  sendMessage({ type: 'close' });
  break;
```

### Update screens/index.ts

Export new cleanup functions:
```typescript
export { ApplyScreen, resetApplyScreen } from './apply';
export { SettingsScreen, updateConnectionStatus, resetSettingsScreen } from './settings';
export { OnboardingScreen, resetOnboarding } from './onboarding';
```

### icons.ts - Remove 8 unused icons

Remove from `iconPaths` and `IconName` type: `chevron-right`, `layers`, `paint`, `type`, `sparkles`, `clipboard`, `folder`, `package`

### types.ts - Remove 1 unused interface

| Interface | Reason |
|-----------|--------|
| `DiffSummary` | Defined but never used anywhere |

### sync.ts and home.ts - Remove unused imports

Remove `createText` import (imported but never called)

---

## Phase 3: Extract Shared Diff Utilities

**Problem:** sync.ts and apply.ts have 7 identical functions duplicated.

**Solution:** Create `src/lib/diff-utils.ts`

### Functions to Extract

| Function | From |
|----------|------|
| `groupByCollection()` | sync.ts:178-205, apply.ts:314-341 |
| `groupStylesByType()` | sync.ts:207-235, apply.ts:343-371 |
| `buildDiffItems()` | sync.ts:281-325, apply.ts:373-413 |
| `buildStyleDiffItems()` | sync.ts:237-279, apply.ts:415-453 |
| `formatValue()` | sync.ts:358-367, apply.ts:477-486 |

### Update Imports

- `sync.ts`: Import from `../lib/diff-utils` and `../lib/compare` (for countChanges/countStyleChanges)
- `apply.ts`: Import from `../lib/diff-utils` and `../lib/compare`
- Remove local duplicate functions from both files

---

## Phase 4: Create Debug Logger

**code.ts has 51 console.log statements:**
- 38 in debug block (lines 412-500)
- 13 scattered throughout handlers

### Create `src/lib/debug.ts`

```typescript
const DEBUG_KEY = 'synkio_debug';
let debugEnabled: boolean | null = null;

export function isDebugEnabled(): boolean {
  if (debugEnabled === null) {
    debugEnabled = false; // Default off
  }
  return debugEnabled;
}

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

export function debug(message: string, ...args: unknown[]): void {
  if (isDebugEnabled()) {
    console.log(`[synkio] ${message}`, ...args);
  }
}

export function debugGroup(label: string): void {
  if (isDebugEnabled()) {
    console.group(`[synkio] ${label}`);
  }
}

export function debugGroupEnd(): void {
  if (isDebugEnabled()) {
    console.groupEnd();
  }
}
```

### Update code.ts

1. Import debug functions from `./lib/debug`
2. Replace `console.log('Plugin received:', ...)` with `debug('Plugin received:', ...)`
3. Wrap debug block (lines 412-500) with `if (isDebugEnabled()) { ... }`
4. Convert all other console.log calls to debug() calls

---

## Phase 5: Decompose code.ts into Modules

**Current:** 1,319 lines handling 17 message types + all operations

### Target Structure

```
src/
  code.ts                    # Entry point only (~80 lines)
  handlers/
    index.ts                 # Handler registry and dispatch
    sync-handlers.ts         # handleSync, handleReady, handleInit
    collection-handlers.ts   # handleGetCollections, handleSaveExcludedCollections, etc.
    remote-handlers.ts       # handleFetchRemote, handleFetchRemoteResult, handleTestConnection
    apply-handlers.ts        # handleImportBaseline, handleApplyToFigma
    settings-handlers.ts     # handleGetSettings, handleSaveSettings, handleGetHistory
    data-handlers.ts         # handleClearAllData
  operations/
    variable-ops.ts          # createOrUpdateVariable, getResolvedType, convertValueForFigma
    style-ops.ts             # createOrUpdateStyle, convertToPaints, applyTypographyStyle, convertToEffects
    baseline.ts              # buildBaseline
  utils/
    sync-status.ts           # recalculateSyncStatus
    color-parser.ts          # parseColor, weightToStyle
```

### New code.ts (Entry Point)

```typescript
import { MessageToCode, MessageToUI } from './lib/types';
import { handleMessage } from './handlers';
import { debug } from './lib/debug';

figma.showUI(__html__, {
  width: 360,
  height: 560,
  themeColors: true,
});

export function sendMessage(message: MessageToUI): void {
  figma.ui.postMessage(message);
}

figma.ui.onmessage = async (message: MessageToCode) => {
  debug('Plugin received:', message.type);
  await handleMessage(message, sendMessage);
};
```

### Handler Registry (handlers/index.ts)

```typescript
import { MessageToCode, MessageToUI } from '../lib/types';
import { handleReady, handleInit, handleSync } from './sync-handlers';
import { handleGetCollections, handleSaveExcludedCollections, handleGetStyleTypes, handleSaveExcludedStyleTypes } from './collection-handlers';
import { handleFetchRemote, handleFetchRemoteResult, handleFetchRemoteError, handleTestConnection } from './remote-handlers';
import { handleImportBaseline, handleApplyToFigma } from './apply-handlers';
import { handleGetSettings, handleSaveSettings, handleGetHistory } from './settings-handlers';
import { handleClearAllData } from './data-handlers';

export type SendMessage = (message: MessageToUI) => void;

type Handler = (message: any, send: SendMessage) => Promise<void>;

const handlers: Record<string, Handler> = {
  'ready': handleReady,
  'init': handleInit,
  'sync': handleSync,
  'get-collections': handleGetCollections,
  'save-excluded-collections': handleSaveExcludedCollections,
  'get-style-types': handleGetStyleTypes,
  'save-excluded-style-types': handleSaveExcludedStyleTypes,
  'fetch-remote': handleFetchRemote,
  'fetch-remote-result': handleFetchRemoteResult,
  'fetch-remote-error': handleFetchRemoteError,
  'test-connection': handleTestConnection,
  'import-baseline': handleImportBaseline,
  'apply-to-figma': handleApplyToFigma,
  'get-settings': handleGetSettings,
  'save-settings': handleSaveSettings,
  'get-history': handleGetHistory,
  'clear-all-data': handleClearAllData,
  'close': async () => figma.closePlugin(),
};

export async function handleMessage(message: MessageToCode, send: SendMessage): Promise<void> {
  const handler = handlers[message.type];
  if (handler) {
    try {
      await handler(message, send);
    } catch (error) {
      console.error('Error handling message:', error);
      send({ type: 'state-update', state: { isLoading: false, error: String(error) } });
    }
  }
}
```

### Handler Module Breakdown

| File | Handlers | Approx Lines |
|------|----------|--------------|
| `sync-handlers.ts` | handleReady, handleInit, handleSync | ~250 |
| `collection-handlers.ts` | handleGetCollections, handleSaveExcludedCollections, handleGetStyleTypes, handleSaveExcludedStyleTypes | ~120 |
| `remote-handlers.ts` | handleFetchRemote, handleFetchRemoteResult, handleFetchRemoteError, handleTestConnection | ~200 |
| `apply-handlers.ts` | handleImportBaseline, handleApplyToFigma | ~250 |
| `settings-handlers.ts` | handleGetSettings, handleSaveSettings, handleGetHistory | ~100 |
| `data-handlers.ts` | handleClearAllData | ~30 |

### Operations Module Breakdown

| File | Functions | Approx Lines |
|------|-----------|--------------|
| `variable-ops.ts` | createOrUpdateVariable, getResolvedType, convertValueForFigma | ~100 |
| `style-ops.ts` | createOrUpdateStyle, convertToPaints, applyTypographyStyle, convertToEffects, weightToStyle | ~300 |
| `baseline.ts` | buildBaseline | ~60 |

### Utils Module Breakdown

| File | Functions | Approx Lines |
|------|-----------|--------------|
| `sync-status.ts` | recalculateSyncStatus | ~100 |
| `color-parser.ts` | parseColor | ~40 |

---

## Implementation Order

| Phase | Risk | Impact | Effort |
|-------|------|--------|--------|
| 1. TypeScript Config | Low | High (fixes 117 errors) | 30 min |
| 2. Remove Dead Code | Low | Medium (cleaner codebase) | 45 min |
| 2b. Add Screen Cleanup Hooks | Low | Medium (fixes state bugs) | 30 min |
| 3. Extract Diff Utils | Low | Medium (DRY principle) | 1 hour |
| 4. Create Debug Logger | Low | Medium (diagnostic capability) | 30 min |
| 5. Decompose code.ts | Medium | High (maintainability) | 3-4 hours |

**Total estimated effort:** 6.5-7.5 hours

---

## Critical Files

### Phase 1 - TypeScript Config
- [tsconfig.json](packages/figma-plugin/synkio-v2/tsconfig.json) - Modify to reference project configs
- [tsconfig.base.json](packages/figma-plugin/synkio-v2/tsconfig.base.json) - CREATE
- [tsconfig.code.json](packages/figma-plugin/synkio-v2/tsconfig.code.json) - CREATE
- [tsconfig.ui.json](packages/figma-plugin/synkio-v2/tsconfig.ui.json) - CREATE

### Phase 2 - Remove Dead Code
- [compare.ts](packages/figma-plugin/synkio-v2/src/lib/compare.ts) - Remove 5 dead functions
- [storage.ts](packages/figma-plugin/synkio-v2/src/lib/storage.ts) - Remove getTimestamp
- [types.ts](packages/figma-plugin/synkio-v2/src/lib/types.ts) - Remove DiffSummary interface
- [code.ts](packages/figma-plugin/synkio-v2/src/code.ts) - Remove filterBaseline
- [components.ts](packages/figma-plugin/synkio-v2/src/ui/components.ts) - Remove show/hide
- [icons.ts](packages/figma-plugin/synkio-v2/src/ui/icons.ts) - Remove 8 unused icons
- [screens/sync.ts](packages/figma-plugin/synkio-v2/src/screens/sync.ts) - Remove unused createText import
- [screens/home.ts](packages/figma-plugin/synkio-v2/src/screens/home.ts) - Remove unused createText import

### Phase 2b - Add Screen Cleanup Hooks
- [router.ts](packages/figma-plugin/synkio-v2/src/ui/router.ts) - Remove createSpacer/createText, add cleanup hook system
- [screens/apply.ts](packages/figma-plugin/synkio-v2/src/screens/apply.ts) - Add resetApplyScreen()
- [screens/settings.ts](packages/figma-plugin/synkio-v2/src/screens/settings.ts) - Add resetSettingsScreen()
- [screens/index.ts](packages/figma-plugin/synkio-v2/src/screens/index.ts) - Export new cleanup functions
- [main.ts](packages/figma-plugin/synkio-v2/src/ui/main.ts) - Call resetOnboarding on data-cleared, register cleanup hooks

### Phase 3 - Extract Shared Utils
- [diff-utils.ts](packages/figma-plugin/synkio-v2/src/lib/diff-utils.ts) - CREATE
- [sync.ts](packages/figma-plugin/synkio-v2/src/screens/sync.ts) - Import shared utils, remove duplicates
- [apply.ts](packages/figma-plugin/synkio-v2/src/screens/apply.ts) - Import shared utils, remove duplicates

### Phase 4 - Debug Logger
- [debug.ts](packages/figma-plugin/synkio-v2/src/lib/debug.ts) - CREATE
- [code.ts](packages/figma-plugin/synkio-v2/src/code.ts) - Convert console.log to debug()

### Phase 5 - Decompose code.ts
- [code.ts](packages/figma-plugin/synkio-v2/src/code.ts) - Reduce to entry point
- [handlers/index.ts](packages/figma-plugin/synkio-v2/src/handlers/index.ts) - CREATE
- [handlers/sync-handlers.ts](packages/figma-plugin/synkio-v2/src/handlers/sync-handlers.ts) - CREATE
- [handlers/collection-handlers.ts](packages/figma-plugin/synkio-v2/src/handlers/collection-handlers.ts) - CREATE
- [handlers/remote-handlers.ts](packages/figma-plugin/synkio-v2/src/handlers/remote-handlers.ts) - CREATE
- [handlers/apply-handlers.ts](packages/figma-plugin/synkio-v2/src/handlers/apply-handlers.ts) - CREATE
- [handlers/settings-handlers.ts](packages/figma-plugin/synkio-v2/src/handlers/settings-handlers.ts) - CREATE
- [handlers/data-handlers.ts](packages/figma-plugin/synkio-v2/src/handlers/data-handlers.ts) - CREATE
- [operations/variable-ops.ts](packages/figma-plugin/synkio-v2/src/operations/variable-ops.ts) - CREATE
- [operations/style-ops.ts](packages/figma-plugin/synkio-v2/src/operations/style-ops.ts) - CREATE
- [operations/baseline.ts](packages/figma-plugin/synkio-v2/src/operations/baseline.ts) - CREATE
- [utils/sync-status.ts](packages/figma-plugin/synkio-v2/src/utils/sync-status.ts) - CREATE
- [utils/color-parser.ts](packages/figma-plugin/synkio-v2/src/utils/color-parser.ts) - CREATE

---

## Testing After Each Phase

1. Run `npm run build` in synkio-v2 directory
2. Load plugin in Figma
3. Test sync flow (Figma → Code)
4. Test apply flow (Code → Figma)
5. Verify settings persistence
6. Test history display
