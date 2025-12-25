# Synkio Figma Plugin - Complete Refactor Spec

## Executive Summary

This document defines the full refactor plan for the Synkio Figma Plugin codebase. The goal is to transform a ~2,575 line codebase with monolithic files into a maintainable, modular architecture.

**Current State:**
- `code.ts`: 1,481 lines (backend logic)
- `ui.ts`: 930 lines (frontend logic)
- `shared.ts`: 166 lines (100% dead code)
- `lib/*.ts`: 8 utility files (~1,400 lines total)
- Dead code, duplicate functions, unused exports
- Validation functions written but never wired up
- **Bug fixed:** Missing localhost token input field in settings UI (backend supported it in `lib/settings.ts` but UI never added the field)

**Target State:**
- Modular folder structure with focused modules (<400 lines each)
- No dead code
- All validation functions integrated
- UI broken into reusable components
- Clear separation of concerns

---

## Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **UI Framework** | Vanilla JS (no framework) | Plugin is small, no complex state management needed. Adding React/Preact adds bundle size and complexity. |
| **Component Pattern** | Module pattern with functions | Simple, tree-shakeable, works well with esbuild. |
| **Type Sharing** | Keep duplicated in ui.ts | Backend and frontend are separate bundles. Build-time sharing adds complexity with minimal benefit. |
| **Build System** | Keep esbuild | Fast, simple, already works. Just update entry points. |
| **Testing** | Manual testing per phase | No existing test infrastructure. Each phase verified before next. |
| **Phasing** | 4 sequential phases | Each phase is independently shippable. |

---

## Phase Overview

| Phase | Focus | Lines Changed | Risk |
|-------|-------|---------------|------|
| **1** | Dead code cleanup | -283 lines | Low |
| **2** | Validation integration | +50 lines | Low |
| **3** | Backend restructuring | 0 net (reorganize) | Medium |
| **4** | UI componentization | 0 net (reorganize) | Medium |

---

## Phase 1: Dead Code Cleanup

### 1.1 DELETE: `shared.ts` (166 lines)

**File:** `shared.ts`
**Action:** Delete entire file
**Evidence:** Zero imports anywhere in codebase

```bash
# Verification
grep -r "from './shared" . # 0 results
grep -r "from \"./shared" . # 0 results
```

All code in `shared.ts` is duplicated in `lib/` modules:

| Code in shared.ts | Duplicated in |
|-------------------|---------------|
| `TokenEntry` interface | `lib/types.ts:9-21` |
| `SyncData` interface | `lib/types.ts:119-124` |
| `ChangeType` type | `lib/types.ts:126` |
| `DiffEntry` interface | `lib/types.ts:128-136` |
| `SyncEvent` interface | `lib/types.ts:138-143` |
| `chunkData()` | `lib/chunking.ts:8-14` |
| `reassembleChunks()` | `lib/chunking.ts:16-25` |
| `addHistoryEntry()` | `lib/history.ts:9-14` |
| `parseHistory()` | `lib/history.ts:17-23` |
| `serializeHistory()` | `lib/history.ts:26-28` |
| `compareSnapshots()` | `lib/compare.ts:33-196` (improved version) |

### 1.2 DELETE: Duplicate `convertCLIBaselineToSyncData` (57 lines)

**Location:** `code.ts:631-688`
**Also exists:** `lib/remote-fetch.ts:119-176` (identical)

**Steps:**
1. Export from `lib/remote-fetch.ts`:
   ```typescript
   // Change line 119 from:
   function convertCLIBaselineToSyncData(...)
   // To:
   export function convertCLIBaselineToSyncData(...)
   ```

2. Update `code.ts` imports:
   ```typescript
   import { fetchRemoteBaseline, checkForUpdates, convertCLIBaselineToSyncData } from './lib/remote-fetch';
   ```

3. Delete `code.ts` lines 619-688 (interface + function)

### 1.3 DELETE: Dead `resolveReference` function (35 lines)

**Location:** `code.ts:895-930`
**Evidence:** Function is never called anywhere

```bash
# Verification
grep -r "resolveReference(" .
# Only result is the definition itself
```

The codebase uses `caseInsensitiveGet()` directly instead.

**Action:** Delete lines 895-930

### 1.4 CLEAN: Unused exports in `lib/types.ts` (25 lines)

These types are defined but never imported outside `lib/`:

| Export | Line | Status |
|--------|------|--------|
| `ChangeType` | 126 | Unused |
| `DiffEntry` | 128-136 | Redefined in ui.ts |
| `CollectionRename` | 145-148 | Redefined in ui.ts |
| `ModeRename` | 150-154 | Redefined in ui.ts |
| `ComparisonResult` | 156-160 | Unused |

**Action:** Remove these exports from `lib/types.ts`

### Phase 1 Summary

| Item | Lines Removed |
|------|---------------|
| `shared.ts` | -166 |
| Duplicate function | -57 |
| Dead function | -35 |
| Unused types | -25 |
| **Total** | **-283 lines** |

---

## Phase 2: Validation Integration

These validation functions were written but never wired into the UI handlers. They provide better UX by preventing invalid settings from being saved.

### 2.1 Validation Functions to Wire Up

| Function | Location | Purpose |
|----------|----------|---------|
| `validateGitHubSettings()` | lib/settings.ts:158-193 | Validate owner/repo format |
| `validateRemoteUrl()` | lib/settings.ts:120-153 | Validate URL format, warn HTTP |
| `validateGitHubToken()` | lib/github.ts:201-250 | Validate token scopes |
| `isGitHubUrl()` | lib/github.ts:147-173 | Auto-detect GitHub URL |

### 2.2 Wire into `save-settings` handler

**Current code (code.ts:1409-1414):**
```typescript
if (msg.type === 'save-settings') {
  const { settings } = msg;
  await saveSettings(settings);  // NO VALIDATION
  figma.ui.postMessage({ type: 'settings-saved' });
  figma.notify('Settings saved');
}
```

**Updated code:**
```typescript
import { validateGitHubSettings, validateRemoteUrl } from './lib/settings';

if (msg.type === 'save-settings') {
  const { settings } = msg;

  // Validate GitHub settings
  if (settings.remote.type === 'github' && settings.remote.github) {
    const validation = validateGitHubSettings(settings.remote.github);
    if (!validation.valid) {
      figma.ui.postMessage({ type: 'settings-error', error: validation.error });
      figma.notify(validation.error, { error: true });
      return;
    }
  }

  // Validate custom URL
  if (settings.remote.type === 'url' && settings.remote.url) {
    const validation = validateRemoteUrl(settings.remote.url);
    if (!validation.valid) {
      figma.ui.postMessage({ type: 'settings-error', error: validation.error });
      figma.notify(validation.error, { error: true });
      return;
    }
    if (validation.warning) {
      figma.notify(validation.warning, { timeout: 4000 });
    }
  }

  await saveSettings(settings);
  figma.ui.postMessage({ type: 'settings-saved', settings });
  figma.notify('Settings saved');
}
```

### 2.3 Wire into `test-github-connection` handler

**Current code (code.ts:1416-1472):**
- Does inline HTTP HEAD request
- No token scope validation
- No settings format validation

**Updated code:**
```typescript
import { validateGitHubSettings } from './lib/settings';
import { validateGitHubToken } from './lib/github';

if (msg.type === 'test-github-connection') {
  const { github } = msg;

  // 1. Validate settings format
  const settingsValid = validateGitHubSettings(github);
  if (!settingsValid.valid) {
    figma.ui.postMessage({
      type: 'connection-test-result',
      success: false,
      error: settingsValid.error
    });
    return;
  }

  // 2. Validate token scopes (if token provided)
  if (github.token) {
    const tokenInfo = await validateGitHubToken(github.token);
    if (!tokenInfo.valid) {
      figma.ui.postMessage({
        type: 'connection-test-result',
        success: false,
        error: tokenInfo.error
      });
      return;
    }
    if (tokenInfo.warning) {
      // Token works but has excessive permissions
      figma.notify(tokenInfo.warning, { timeout: 5000 });
    }
  }

  // 3. Test actual connection (existing logic)
  try {
    // ... existing HTTP HEAD logic
  }
}
```

### 2.4 Add UI support for validation errors

**Add new message type handling in ui.ts:**
```typescript
if (msg && msg.type === 'settings-error') {
  saveSettingsBtn.disabled = false;
  saveSettingsBtn.textContent = 'Save Settings';

  // Show error in settings panel
  const errorEl = document.getElementById('settings-error');
  if (errorEl) {
    errorEl.textContent = msg.error;
    errorEl.style.display = 'block';
  }
}
```

### Phase 2 Summary

| Change | Impact |
|--------|--------|
| Wire validation into save-settings | Better UX: prevents invalid settings |
| Wire validation into test-connection | Better UX: validates token scopes |
| Add UI error handling | Shows validation errors to user |
| **Net lines** | +50 lines |

---

## Phase 3: Backend Restructuring

Restructure `code.ts` (1,481 lines) into focused modules under `src/`.

### 3.1 Proposed Folder Structure

```
synkio-ui/
├── src/
│   ├── main.ts                 # Entry point (~50 lines)
│   │   - figma.showUI()
│   │   - Message router
│   │
│   ├── collect/
│   │   ├── variables.ts        # Variable collection (~60 lines)
│   │   │   - collectTokens()
│   │   │   - resolveValue()
│   │   │
│   │   └── styles.ts           # Style collection (~380 lines)
│   │       - collectStyles()
│   │       - convertPaintStyle()
│   │       - convertTextStyle()
│   │       - convertEffectStyle()
│   │       - Helper functions
│   │
│   ├── baseline/
│   │   ├── storage.ts          # Baseline CRUD (~80 lines)
│   │   │   - getBaselineSnapshot()
│   │   │   - saveBaselineSnapshot()
│   │   │
│   │   └── exclusions.ts       # Collection filtering (~50 lines)
│   │       - getExcludedCollections()
│   │       - getExcludedStyleTypes()
│   │       - filterBaselineByExclusions()
│   │
│   ├── apply/
│   │   └── index.ts            # Apply baseline to Figma (~300 lines)
│   │       - applyBaselineToFigma()
│   │       - Variable creation helpers
│   │       - Type conversion helpers
│   │
│   ├── handlers/
│   │   ├── sync.ts             # Sync handler
│   │   ├── import.ts           # Import baseline handler
│   │   ├── remote.ts           # Remote fetch handlers
│   │   ├── collections.ts      # Collection/style exclusion
│   │   └── settings.ts         # Settings handlers (with validation)
│   │
│   └── ui/
│       └── diff.ts             # UI communication (~60 lines)
│           - sendDiffToUI()
│
├── lib/                        # Unchanged utilities
│   ├── types.ts
│   ├── compare.ts
│   ├── settings.ts
│   ├── remote-fetch.ts
│   ├── github.ts
│   ├── history.ts
│   ├── sanitize.ts
│   └── chunking.ts
│
├── ui.ts                       # Frontend (Phase 4)
└── ui.template.html
```

### 3.2 Module Dependencies

```
src/main.ts
├── src/handlers/sync.ts
│   ├── src/collect/variables.ts
│   ├── src/collect/styles.ts
│   ├── src/baseline/storage.ts
│   ├── src/ui/diff.ts
│   └── lib/history.ts
│
├── src/handlers/import.ts
│   ├── src/baseline/storage.ts
│   ├── src/ui/diff.ts
│   └── lib/remote-fetch.ts
│
├── src/handlers/remote.ts
│   ├── src/baseline/storage.ts
│   ├── src/ui/diff.ts
│   └── lib/remote-fetch.ts
│
├── src/handlers/collections.ts
│   └── src/baseline/exclusions.ts
│
├── src/handlers/settings.ts
│   ├── lib/settings.ts
│   └── lib/github.ts (validation)
│
└── src/apply/index.ts
    └── src/baseline/storage.ts
```

### 3.3 Entry Point Pattern

**Option A: Keep `code.ts` as thin wrapper**
```typescript
// code.ts (becomes ~10 lines)
export * from './src/main';
```

**Option B: Change entry point to `src/main.ts`**
```javascript
// build.js
esbuild.build({
  entryPoints: ['src/main.ts', 'ui.ts'],
  outdir: 'dist',
  // ...
});
```

**Decision:** Use Option A for minimal build config changes.

### 3.4 Migration Steps

1. Create folder structure:
   ```bash
   mkdir -p src/{collect,baseline,apply,handlers,ui}
   ```

2. Extract modules in dependency order:
   - `src/collect/variables.ts` (no dependencies)
   - `src/collect/styles.ts` (no dependencies)
   - `src/baseline/exclusions.ts` (no dependencies)
   - `src/baseline/storage.ts` (depends on lib/chunking)
   - `src/apply/index.ts` (depends on baseline/exclusions)
   - `src/ui/diff.ts` (depends on collect/*, baseline/*)
   - `src/handlers/*.ts` (depends on all above)
   - `src/main.ts` (imports handlers, wires router)

3. Update `code.ts` to re-export:
   ```typescript
   export * from './src/main';
   ```

4. Verify build:
   ```bash
   npm run build
   ```

### Phase 3 Summary

| Metric | Before | After |
|--------|--------|-------|
| Largest file | 1,481 lines | ~380 lines |
| Backend files | 1 monolithic | 10 focused |
| Finding code | Scroll 1400 lines | Navigate to folder |

---

## Phase 4: UI Componentization

Restructure `ui.ts` (930 lines) into focused components.

### 4.1 Current ui.ts Analysis

| Section | Lines | Responsibility |
|---------|-------|----------------|
| Interfaces | 5-65 | Type definitions |
| State | 67-76 | Global state variables |
| DOM Elements | 78-105 | Element references |
| Remote Status | 107-203 | Remote sync UI |
| Tab Switching | 205-225 | Navigation |
| Remote Handlers | 227-300 | Button handlers |
| Action Handlers | 302-395 | Main actions |
| Collections Render | 397-497 | Collections view |
| Diff Render | 499-625 | Diff view |
| History Render | 627-685 | History view |
| Utilities | 690-726 | Helper functions |
| Message Handler | 728-929 | Message routing |

### 4.2 Proposed UI Structure

```
synkio-ui/
├── ui/
│   ├── main.ts                 # Entry point (~100 lines)
│   │   - Initialize components
│   │   - Message router
│   │   - State management
│   │
│   ├── components/
│   │   ├── remote-status.ts    # Remote sync status bar (~100 lines)
│   │   │   - updateRemoteStatus()
│   │   │   - Button handlers
│   │   │
│   │   ├── settings-panel.ts   # Settings modal (~130 lines)
│   │   │   - showSettingsPanel()
│   │   │   - hideSettingsPanel()
│   │   │   - populateSettingsForm()
│   │   │   - updateSourceTypeVisibility()
│   │   │
│   │   ├── tab-bar.ts          # Tab navigation (~30 lines)
│   │   │   - Tab switching
│   │   │
│   │   ├── diff-list.ts        # Pending changes view (~130 lines)
│   │   │   - renderDiffs()
│   │   │
│   │   ├── history-list.ts     # Sync history view (~60 lines)
│   │   │   - renderHistory()
│   │   │   - toggleChanges()
│   │   │
│   │   ├── collections-list.ts # Collections/styles filter (~100 lines)
│   │   │   - renderCollections()
│   │   │   - renderStyleTypes()
│   │   │   - updateCollectionsView()
│   │   │   - validateCollections()
│   │   │   - updateExcludedBadge()
│   │   │
│   │   ├── action-bar.ts       # Main action buttons (~100 lines)
│   │   │   - Sync button handler
│   │   │   - Import button handler
│   │   │   - Apply button handler
│   │   │
│   │   └── status-indicator.ts # Sync status dot (~20 lines)
│   │       - updateStatus()
│   │
│   ├── types.ts                # UI-specific types (~60 lines)
│   │   - DiffEntry
│   │   - CollectionRename
│   │   - ModeRename
│   │   - SyncEvent
│   │   - CollectionInfo
│   │   - StyleTypeInfo
│   │   - RemoteSettings
│   │   - RemoteStatus
│   │
│   └── utils.ts                # Shared utilities (~30 lines)
│       - escapeHtml()
│       - formatValue()
│       - formatTimeAgo()
│
└── ui.ts                       # Thin wrapper → ui/main.ts
```

### 4.3 Component Pattern

Each component follows a consistent pattern:

```typescript
// ui/components/status-indicator.ts

interface StatusState {
  diffCount: number;
}

// DOM references (grabbed once on init)
let statusDot: HTMLElement;
let statusText: HTMLElement;

export function initStatusIndicator() {
  statusDot = document.getElementById('statusDot')!;
  statusText = document.getElementById('statusText')!;
}

export function updateStatus(diffCount: number) {
  if (diffCount > 0) {
    statusDot.className = 'status-dot unsynced';
    statusText.textContent = 'Unsynced changes';
  } else {
    statusDot.className = 'status-dot synced';
    statusText.textContent = 'Synced';
  }
}
```

### 4.4 State Management

Simple module-level state (no external library needed):

```typescript
// ui/main.ts

import { initDiffList, renderDiffs } from './components/diff-list';
import { initHistoryList, renderHistory } from './components/history-list';
// ...

// Centralized state
interface UIState {
  diffs: DiffEntry[];
  collectionRenames: CollectionRename[];
  modeRenames: ModeRename[];
  history: SyncEvent[];
  collections: CollectionInfo[];
  styleTypes: StyleTypeInfo[];
  isSyncing: boolean;
  remoteStatus: RemoteStatus;
  remoteSettings: RemoteSettings;
}

const state: UIState = {
  diffs: [],
  collectionRenames: [],
  modeRenames: [],
  history: [],
  collections: [],
  styleTypes: [],
  isSyncing: false,
  remoteStatus: { state: 'idle' },
  remoteSettings: { sourceType: 'disabled' },
};

// Initialize all components
function init() {
  initStatusIndicator();
  initRemoteStatus();
  initSettingsPanel();
  initTabBar();
  initDiffList();
  initHistoryList();
  initCollectionsList();
  initActionBar();
}

// Message handler routes to components
window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  switch (msg.type) {
    case 'update':
      state.diffs = msg.diffs;
      state.collectionRenames = msg.collectionRenames || [];
      state.modeRenames = msg.modeRenames || [];
      state.history = msg.history;
      renderDiffs(state.diffs, state.collectionRenames, state.modeRenames);
      renderHistory(state.history);
      updateStatus(state.diffs.length + state.collectionRenames.length + state.modeRenames.length);
      break;

    // ... other cases delegate to components
  }
};

init();
parent.postMessage({ pluginMessage: { type: 'ready' } }, '*');
```

### 4.5 Migration Steps

1. Create folder structure:
   ```bash
   mkdir -p ui/components
   ```

2. Extract in order (leaf components first):
   - `ui/utils.ts` (no dependencies)
   - `ui/types.ts` (no dependencies)
   - `ui/components/status-indicator.ts`
   - `ui/components/tab-bar.ts`
   - `ui/components/diff-list.ts` (depends on utils)
   - `ui/components/history-list.ts` (depends on utils)
   - `ui/components/collections-list.ts` (depends on utils)
   - `ui/components/action-bar.ts`
   - `ui/components/remote-status.ts`
   - `ui/components/settings-panel.ts`
   - `ui/main.ts` (imports all)

3. Update `ui.ts` to re-export:
   ```typescript
   export * from './ui/main';
   ```

4. Verify build and test in Figma

### Phase 4 Summary

| Metric | Before | After |
|--------|--------|-------|
| Largest file | 930 lines | ~130 lines |
| Frontend files | 1 monolithic | 12 focused |
| Component reuse | None | Composable modules |

---

## Build Configuration

### Current build.js

```javascript
const esbuild = require('esbuild');
const fs = require('fs');

// Build code.ts (backend)
esbuild.buildSync({
  entryPoints: ['code.ts'],
  bundle: true,
  outfile: 'code.js',
  format: 'iife',
  target: 'es2017',
});

// Build ui.ts (frontend)
esbuild.buildSync({
  entryPoints: ['ui.ts'],
  bundle: true,
  outfile: 'ui.js',
  format: 'iife',
  target: 'es2017',
});

// Inject ui.js into HTML
const html = fs.readFileSync('ui.template.html', 'utf8');
const js = fs.readFileSync('ui.js', 'utf8');
const final = html.replace('/* UI_SCRIPT */', js);
fs.writeFileSync('ui.html', final);
```

### No Changes Needed

Because we use thin wrapper re-exports (`code.ts` → `src/main.ts`, `ui.ts` → `ui/main.ts`), the build configuration remains unchanged.

---

## Testing Checklist

### After Phase 1 (Dead Code Cleanup)
- [ ] `npm run build` succeeds
- [ ] Plugin loads in Figma
- [ ] Sync button works
- [ ] Import baseline works
- [ ] Apply to Figma works
- [ ] Remote fetch works
- [ ] Collections exclusion works
- [ ] History shows correctly

### After Phase 2 (Validation Integration)
- [ ] Invalid GitHub repo format shows error
- [ ] Invalid URL shows error
- [ ] HTTP URL shows warning
- [ ] Invalid token shows specific scope error
- [ ] Overly permissive token shows warning
- [ ] Valid settings save successfully

### After Phase 3 (Backend Restructuring)
- [ ] All Phase 1 tests pass
- [ ] All Phase 2 tests pass
- [ ] No console errors

### After Phase 4 (UI Componentization)
- [ ] All previous tests pass
- [ ] Tab switching works
- [ ] Settings panel opens/closes
- [ ] All button states work correctly

---

## Summary

| Phase | Effort | Risk | Benefit |
|-------|--------|------|---------|
| 1: Dead Code | 2 hours | Low | -283 lines, cleaner codebase |
| 2: Validation | 2 hours | Low | Better UX, prevents invalid settings |
| 3: Backend | 4 hours | Medium | Maintainable modules |
| 4: UI | 4 hours | Medium | Reusable components |
| **Total** | **12 hours** | | **Professional codebase** |

### Dependency Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
   │         │         │         │
   │         │         │         └── UI components
   │         │         └── Backend modules
   │         └── Validation wiring
   └── Dead code removal
```

Each phase is independently shippable and can be reviewed/tested before proceeding.

---

## Appendix: Functions by Module

### Backend Modules (Phase 3)

#### src/collect/variables.ts
- `collectTokens()`
- `resolveValue()`

#### src/collect/styles.ts
- `collectStyles()`
- `convertPaintStyle()`
- `convertTextStyle()`
- `convertEffectStyle()`
- `buildVariableMap()`
- `formatShadow()`
- `roundValue()`
- `formatPx()`
- `rgbaToString()`
- `fontStyleToWeight()`
- `formatLineHeight()`
- `formatLetterSpacing()`
- `mapTextCase()`
- `mapTextDecoration()`
- `mapGradientType()`

#### src/baseline/storage.ts
- `getBaselineSnapshot()`
- `saveBaselineSnapshot()`
- `getHistory()`
- `addToHistory()`

#### src/baseline/exclusions.ts
- `getExcludedCollections()`
- `getExcludedStyleTypes()`
- `filterBaselineByExclusions()`

#### src/apply/index.ts
- `applyBaselineToFigma()`
- `buildExistingVariableMap()`
- `buildCollectionMap()`
- `getOrCreateCollection()`
- `getOrCreateMode()`
- `mapTokenTypeToFigma()`
- `parseColorValue()`
- `convertValueToFigma()`
- `extractReferences()`
- `sortByDependencies()`
- `caseInsensitiveGet()`

#### src/ui/diff.ts
- `sendDiffToUI()`

#### src/handlers/sync.ts
- `handleSync()`

#### src/handlers/import.ts
- `handleImport()`

#### src/handlers/remote.ts
- `handleRemoteFetch()`
- `handleCheckForUpdates()`

#### src/handlers/collections.ts
- `handleGetCollections()`
- `handleSaveExcludedCollections()`
- `handleGetStyleTypes()`
- `handleSaveExcludedStyleTypes()`

#### src/handlers/settings.ts
- `handleGetSettings()`
- `handleSaveSettings()` (with validation)
- `handleTestGitHubConnection()` (with validation)

### UI Components (Phase 4)

#### ui/components/status-indicator.ts
- `initStatusIndicator()`
- `updateStatus()`

#### ui/components/tab-bar.ts
- `initTabBar()`

#### ui/components/diff-list.ts
- `initDiffList()`
- `renderDiffs()`

#### ui/components/history-list.ts
- `initHistoryList()`
- `renderHistory()`
- `toggleChanges()`

#### ui/components/collections-list.ts
- `initCollectionsList()`
- `renderCollections()`
- `renderStyleTypes()`
- `updateCollectionsView()`
- `validateCollections()`
- `updateExcludedBadge()`

#### ui/components/action-bar.ts
- `initActionBar()`
- Sync button handler
- Import button handler
- Apply button handler

#### ui/components/remote-status.ts
- `initRemoteStatus()`
- `updateRemoteStatus()`
- Fetch/check button handlers

#### ui/components/settings-panel.ts
- `initSettingsPanel()`
- `showSettingsPanel()`
- `hideSettingsPanel()`
- `populateSettingsForm()`
- `updateSourceTypeVisibility()`
- Save/test handlers

#### ui/utils.ts
- `escapeHtml()`
- `formatValue()`
- `formatTimeAgo()`

#### ui/types.ts
- `DiffEntry`
- `CollectionRename`
- `ModeRename`
- `SyncEvent`
- `CollectionInfo`
- `StyleTypeInfo`
- `RemoteSettings`
- `RemoteStatus`
