# Code Sync Status - Plugin Implementation Specification

## Overview

The Figma plugin (synkio-v2) displays whether the CLI has synced the latest exported tokens. This document specifies the plugin-side implementation.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         PLUGIN ARCHITECTURE                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   UI (iframe)                          Code (main thread)                 │
│   ───────────                          ─────────────────                  │
│                                                                           │
│   ┌─────────────────────┐              ┌─────────────────────┐           │
│   │   HomeScreen        │              │   code.ts           │           │
│   │   - CodeSyncCard    │ ──message──► │   - handleCheck     │           │
│   │   - Check button    │              │     CodeSync()      │           │
│   └─────────────────────┘              └──────────┬──────────┘           │
│                                                   │                       │
│   ┌─────────────────────┐                         │ fetch()              │
│   │   SettingsScreen    │                         ▼                       │
│   │   - Status path     │              ┌─────────────────────┐           │
│   │   - Current status  │              │   GitHub API        │           │
│   └─────────────────────┘              │   (sync-status.json)│           │
│                                        └─────────────────────┘           │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Type Definitions

### New Types (`lib/types.ts`)

```typescript
// =============================================================================
// Code Sync Status Types
// =============================================================================

/**
 * Status of whether the CLI has synced the latest plugin export
 */
export interface CodeSyncStatus {
  /** Current state */
  state: 'unknown' | 'pending' | 'synced' | 'checking' | 'error';

  /** Hash of the current plugin export */
  localHash?: string;

  /** Hash from sync-status.json (if fetched) */
  remoteHash?: string;

  /** When plugin last exported (ISO string) */
  exportedAt?: string;

  /** When CLI last synced (ISO string) */
  syncedAt?: string;

  /** CLI version that performed sync */
  cliVersion?: string;

  /** Summary from sync-status.json */
  summary?: {
    tokenCount: number;
    styleCount: number;
    collections: string[];
  };

  /** Error message if state is 'error' */
  error?: string;

  /** When status was last checked */
  lastChecked?: string;
}

// Update SyncStatus to include code sync
export interface SyncStatus {
  state: 'in-sync' | 'pending-changes' | 'out-of-sync' | 'not-setup';
  lastSync?: {
    timestamp: number;
    user: string;
    changeCount: number;
  };
  pendingChanges?: number;
  codeSync?: CodeSyncStatus;  // NEW
}

// Update RemoteSettings
export interface RemoteSettings {
  enabled: boolean;
  source: 'github' | 'url' | 'none';
  github?: GitHubSettings;
  customUrl?: string;
  autoCheck: boolean;
  lastFetch?: string;
  statusPath?: string;  // NEW - defaults to 'synkio/sync-status.json'
}
```

### New Messages

```typescript
// MessageToCode additions
export type MessageToCode =
  // ... existing messages ...
  | { type: 'check-code-sync' };

// MessageToUI additions
export type MessageToUI =
  // ... existing messages ...
  | { type: 'code-sync-checking' }
  | { type: 'code-sync-result'; status: CodeSyncStatus }
  | { type: 'code-sync-error'; error: string };
```

## Storage Updates (`lib/storage.ts`)

### Hash Computation

```typescript
// =============================================================================
// Hash Computation
// =============================================================================

/**
 * Compute a deterministic hash of the baseline data.
 * Must match the CLI's hash algorithm exactly.
 */
export function computeBaselineHash(data: CLISyncData): string {
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  return 'sha256:' + simpleHash(normalized);
}

/**
 * Simple 32-bit hash function (same as CLI)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
```

### Updated `saveForCLI()`

```typescript
export function saveForCLI(data: CLISyncData): void {
  const json = JSON.stringify(data);
  const chunks = chunkString(json, MAX_CHUNK_SIZE);

  // Clear old CLI chunks first
  const oldCount = figma.root.getSharedPluginData(NAMESPACE, 'chunkCount');
  if (oldCount) {
    const count = parseInt(oldCount, 10);
    for (let i = 0; i < count; i++) {
      figma.root.setSharedPluginData(NAMESPACE, `chunk_${i}`, '');
    }
  }

  // Save chunk count and chunks
  figma.root.setSharedPluginData(NAMESPACE, 'chunkCount', String(chunks.length));
  for (let i = 0; i < chunks.length; i++) {
    figma.root.setSharedPluginData(NAMESPACE, `chunk_${i}`, chunks[i]);
  }

  // Save metadata
  figma.root.setSharedPluginData(NAMESPACE, 'version', data.version);
  figma.root.setSharedPluginData(NAMESPACE, 'timestamp', data.timestamp);
  figma.root.setSharedPluginData(NAMESPACE, 'tokenCount', String(data.tokens.length));
  figma.root.setSharedPluginData(NAMESPACE, 'styleCount', String(data.styles?.length || 0));

  // NEW: Save baseline hash for sync status verification
  const hash = computeBaselineHash(data);
  figma.root.setSharedPluginData(NAMESPACE, 'baselineHash', hash);
  figma.root.setSharedPluginData(NAMESPACE, 'exportedAt', new Date().toISOString());
}

/**
 * Get the current export hash and timestamp
 */
export function getExportMetadata(): { hash: string | null; exportedAt: string | null } {
  return {
    hash: figma.root.getSharedPluginData(NAMESPACE, 'baselineHash') || null,
    exportedAt: figma.root.getSharedPluginData(NAMESPACE, 'exportedAt') || null,
  };
}
```

## Code Handler Updates (`code.ts`)

### New Handler

```typescript
// =============================================================================
// Code Sync Status Handler
// =============================================================================

async function handleCheckCodeSync() {
  sendMessage({ type: 'code-sync-checking' });

  try {
    const settings = await loadClientStorage<PluginSettings>('settings');

    // Check if GitHub is configured
    if (!settings?.remote.github?.owner || !settings?.remote.github?.repo) {
      sendMessage({
        type: 'code-sync-result',
        status: {
          state: 'unknown',
          error: 'GitHub not configured',
        },
      });
      return;
    }

    // Get local export metadata
    const { hash: localHash, exportedAt } = getExportMetadata();

    if (!localHash) {
      sendMessage({
        type: 'code-sync-result',
        status: {
          state: 'unknown',
          error: 'No export found. Sync tokens first.',
        },
      });
      return;
    }

    // Fetch sync-status.json from GitHub
    const { owner, repo, branch, token } = settings.remote.github;
    const statusPath = settings.remote.statusPath || 'synkio/sync-status.json';

    const url = token
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${statusPath}?ref=${branch || 'main'}`
      : `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}/${statusPath}`;

    const headers: Record<string, string> = {
      'Accept': token ? 'application/vnd.github.v3+json' : 'application/json',
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(url, { headers });

    if (response.status === 404) {
      // File not found - CLI hasn't synced yet
      sendMessage({
        type: 'code-sync-result',
        status: {
          state: 'pending',
          localHash,
          exportedAt,
          error: 'sync-status.json not found',
          lastChecked: new Date().toISOString(),
        },
      });
      return;
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    let content: string;
    if (token) {
      const data = await response.json();
      content = atob(data.content);
    } else {
      content = await response.text();
    }

    const syncStatus = JSON.parse(content) as {
      fileKey: string;
      baselineHash: string;
      syncedAt: string;
      cliVersion: string;
      summary: {
        tokenCount: number;
        styleCount: number;
        collections: string[];
      };
    };

    // Compare hashes
    const isInSync = localHash === syncStatus.baselineHash;

    sendMessage({
      type: 'code-sync-result',
      status: {
        state: isInSync ? 'synced' : 'pending',
        localHash,
        remoteHash: syncStatus.baselineHash,
        exportedAt,
        syncedAt: syncStatus.syncedAt,
        cliVersion: syncStatus.cliVersion,
        summary: syncStatus.summary,
        lastChecked: new Date().toISOString(),
      },
    });

  } catch (error) {
    sendMessage({
      type: 'code-sync-result',
      status: {
        state: 'error',
        error: String(error),
        lastChecked: new Date().toISOString(),
      },
    });
  }
}
```

### Update Message Handler

```typescript
figma.ui.onmessage = async (message: MessageToCode) => {
  try {
    switch (message.type) {
      // ... existing cases ...

      case 'check-code-sync':
        await handleCheckCodeSync();
        break;
    }
  } catch (error) {
    // ... error handling ...
  }
};
```

### Auto-Check on Plugin Open

Update `handleReady()` to auto-check code sync status:

```typescript
async function handleReady() {
  // ... existing code to load data ...

  sendMessage({
    type: 'initialized',
    state: {
      // ... existing state ...
    },
  });

  // Auto-check code sync status if GitHub is configured
  const settings = await loadClientStorage<PluginSettings>('settings');
  if (settings?.remote.github?.owner && settings?.remote.github?.repo) {
    // Delay slightly to let UI render first
    setTimeout(() => {
      handleCheckCodeSync();
    }, 500);
  }
}
```

## UI Implementation

### New Component: `CodeSyncCard`

Create in `screens/home.ts`:

```typescript
function buildCodeSyncCard(state: PluginState, actions: RouterActions): HTMLElement {
  const { syncStatus, settings } = state;
  const codeSync = syncStatus.codeSync;
  const isGitHubConfigured = settings.remote.github?.owner && settings.remote.github?.repo;

  const card = Card({ padding: 'md' });

  // Title
  const title = el('div', {
    style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);',
  }, 'CODE SYNC STATUS');
  card.appendChild(title);

  // Not configured state
  if (!isGitHubConfigured) {
    return buildNotConfiguredCard(card, actions);
  }

  // Checking state
  if (codeSync?.state === 'checking') {
    return buildCheckingCard(card);
  }

  // Synced state
  if (codeSync?.state === 'synced') {
    return buildSyncedCard(card, codeSync, actions);
  }

  // Pending state (default)
  return buildPendingCard(card, codeSync, actions);
}

function buildNotConfiguredCard(card: HTMLElement, actions: RouterActions): HTMLElement {
  const statusBadge = el('div', {
    style: 'display: flex; align-items: center; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm);',
  });
  statusBadge.appendChild(el('span', {
    style: 'width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--color-text-tertiary);',
  }));
  statusBadge.appendChild(el('span', {
    style: 'font-weight: 500;',
  }, 'Not Configured'));
  card.appendChild(statusBadge);

  const description = el('div', {
    style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-md);',
  }, 'Connect to GitHub to track when your exported tokens are synced to code.');
  card.appendChild(description);

  const button = Button({
    label: 'Configure in Settings',
    variant: 'secondary',
    size: 'sm',
    onClick: () => actions.navigate('settings'),
  });
  card.appendChild(button);

  return card;
}

function buildCheckingCard(card: HTMLElement): HTMLElement {
  const statusRow = el('div', {
    style: 'display: flex; align-items: center; gap: var(--spacing-sm);',
  });
  statusRow.appendChild(Spinner('Checking status...'));
  card.appendChild(statusRow);
  return card;
}

function buildSyncedCard(card: HTMLElement, codeSync: CodeSyncStatus, actions: RouterActions): HTMLElement {
  // Status badge
  const statusBadge = el('div', {
    style: 'display: flex; align-items: center; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm);',
  });
  statusBadge.appendChild(el('span', {
    style: 'width: 8px; height: 8px; border-radius: 50%; background: var(--color-success);',
  }));
  statusBadge.appendChild(el('span', {
    style: 'font-weight: 500; color: var(--color-success);',
  }, 'Code In Sync'));
  card.appendChild(statusBadge);

  // Details
  if (codeSync.syncedAt) {
    const syncedAt = new Date(codeSync.syncedAt);
    const timeAgo = getTimeAgo(syncedAt);
    const details = el('div', {
      style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-xs);',
    }, `Synced ${timeAgo}${codeSync.cliVersion ? ` via CLI v${codeSync.cliVersion}` : ''}`);
    card.appendChild(details);
  }

  // Summary
  if (codeSync.summary) {
    const summary = el('div', {
      style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--spacing-md);',
    }, `${codeSync.summary.tokenCount} tokens · ${codeSync.summary.styleCount} styles`);
    card.appendChild(summary);
  }

  // Check button
  const button = Button({
    label: '↻ Check Status',
    variant: 'ghost',
    size: 'sm',
    onClick: () => actions.send({ type: 'check-code-sync' }),
  });
  card.appendChild(button);

  return card;
}

function buildPendingCard(card: HTMLElement, codeSync: CodeSyncStatus | undefined, actions: RouterActions): HTMLElement {
  // Status badge
  const statusBadge = el('div', {
    style: 'display: flex; align-items: center; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm);',
  });
  statusBadge.appendChild(el('span', {
    style: 'width: 8px; height: 8px; border-radius: 50%; background: var(--color-warning);',
  }));
  statusBadge.appendChild(el('span', {
    style: 'font-weight: 500; color: var(--color-warning);',
  }, 'Pending Code Sync'));
  card.appendChild(statusBadge);

  // Time since export
  if (codeSync?.exportedAt) {
    const exportedAt = new Date(codeSync.exportedAt);
    const timeAgo = getTimeAgo(exportedAt);
    const details = el('div', {
      style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-xs);',
    }, `Exported ${timeAgo}`);
    card.appendChild(details);
  }

  const waitingFor = el('div', {
    style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--spacing-md);',
  }, 'Waiting for: synkio sync');
  card.appendChild(waitingFor);

  // Help box with command
  const helpBox = el('div', {
    style: 'background: var(--color-bg-secondary); border-radius: var(--radius-md); padding: var(--spacing-sm); margin-bottom: var(--spacing-md);',
  });

  const helpTitle = el('div', {
    style: 'font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--spacing-xs);',
  }, '💡 Run in your terminal:');
  helpBox.appendChild(helpTitle);

  const commandRow = el('div', {
    style: 'display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm);',
  });

  const command = el('code', {
    style: 'font-family: var(--font-family-mono); font-size: var(--font-size-sm);',
  }, '$ synkio sync');
  commandRow.appendChild(command);

  const copyBtn = Button({
    label: 'Copy',
    variant: 'ghost',
    size: 'sm',
    onClick: () => {
      navigator.clipboard.writeText('synkio sync');
      // TODO: Show "Copied!" feedback
    },
  });
  commandRow.appendChild(copyBtn);

  helpBox.appendChild(commandRow);
  card.appendChild(helpBox);

  // Check button
  const button = Button({
    label: '↻ Check Status',
    variant: 'secondary',
    size: 'sm',
    fullWidth: true,
    onClick: () => actions.send({ type: 'check-code-sync' }),
  });
  card.appendChild(button);

  return card;
}
```

### Update HomeScreen

```typescript
export function HomeScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { syncStatus, history, settings } = state;

  const statusCard = buildStatusCard(syncStatus, history);
  const codeSyncCard = buildCodeSyncCard(state, actions);  // NEW
  const syncCard = buildSyncCard(state, actions);
  const applyCard = buildApplyCard(state, actions);
  const activitySection = buildActivitySection(history, actions);

  // ... header setup ...

  const content = createContentArea([
    statusCard,
    codeSyncCard,  // NEW - between status and workflow cards
    createRow([syncCard, applyCard], 'var(--spacing-md)'),
    activitySection,
  ]);

  // ... rest of function ...
}
```

### Settings Screen Update

Add status path configuration:

```typescript
function buildCodeSyncSection(remote: RemoteSettings, actions: RouterActions): HTMLElement {
  const children: HTMLElement[] = [];

  // Status path input
  const pathInput = Input({
    label: 'Status file path',
    placeholder: 'synkio/sync-status.json',
    value: remote.statusPath || 'synkio/sync-status.json',
    onChange: (value) => {
      actions.send({
        type: 'save-settings',
        settings: { statusPath: value.trim() || 'synkio/sync-status.json' },
      });
    },
  });
  children.push(pathInput);

  // Helper text
  const helperText = el('div', {
    style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--spacing-xs);',
  }, 'This file is written by the CLI after each sync. The plugin reads it to show sync status.');
  children.push(helperText);

  return Section({
    title: 'CODE SYNC STATUS',
    collapsible: true,
    defaultExpanded: true,
    children,
  });
}
```

## State Management

### PluginState Updates

The UI should handle `code-sync-*` messages in the message handler:

```typescript
// In ui/main.ts or similar
window.onmessage = (event) => {
  const message = event.data.pluginMessage as MessageToUI;

  switch (message.type) {
    // ... existing handlers ...

    case 'code-sync-checking':
      updateState({
        syncStatus: {
          ...state.syncStatus,
          codeSync: { state: 'checking' },
        },
      });
      break;

    case 'code-sync-result':
      updateState({
        syncStatus: {
          ...state.syncStatus,
          codeSync: message.status,
        },
      });
      break;

    case 'code-sync-error':
      updateState({
        syncStatus: {
          ...state.syncStatus,
          codeSync: {
            state: 'error',
            error: message.error,
            lastChecked: new Date().toISOString(),
          },
        },
      });
      break;
  }
};
```

## Implementation Checklist

### Types (`lib/types.ts`)
- [ ] Add `CodeSyncStatus` interface
- [ ] Update `SyncStatus` with `codeSync` field
- [ ] Add `statusPath` to `RemoteSettings`
- [ ] Add new message types

### Storage (`lib/storage.ts`)
- [ ] Add `computeBaselineHash()` function
- [ ] Add `simpleHash()` helper
- [ ] Update `saveForCLI()` to store hash and timestamp
- [ ] Add `getExportMetadata()` function

### Code Handler (`code.ts`)
- [ ] Add `handleCheckCodeSync()` handler
- [ ] Add to message handler switch
- [ ] Add auto-check in `handleReady()`

### Home Screen (`screens/home.ts`)
- [ ] Add `buildCodeSyncCard()` function
- [ ] Add `buildNotConfiguredCard()` helper
- [ ] Add `buildCheckingCard()` helper
- [ ] Add `buildSyncedCard()` helper
- [ ] Add `buildPendingCard()` helper
- [ ] Update `HomeScreen()` to include card

### Settings Screen (`screens/settings.ts`)
- [ ] Add `buildCodeSyncSection()` function
- [ ] Add status path input
- [ ] Add to settings screen layout

### UI Main (`ui/main.ts` or similar)
- [ ] Handle `code-sync-checking` message
- [ ] Handle `code-sync-result` message
- [ ] Handle `code-sync-error` message

## Testing Scenarios

1. **GitHub not configured**
   - Card shows "Not Configured" state
   - "Configure in Settings" button navigates to settings

2. **No export yet**
   - Card shows appropriate message
   - Prompts user to sync tokens first

3. **Export exists, no status file**
   - Card shows "Pending Code Sync"
   - Shows time since export
   - Shows command to run

4. **Export exists, status file exists, hashes match**
   - Card shows "Code In Sync"
   - Shows sync time and CLI version
   - Shows summary

5. **Export exists, status file exists, hashes differ**
   - Card shows "Pending Code Sync"
   - Indicates CLI has old version

6. **Network error**
   - Card shows error state
   - Retry button available

7. **Manual check**
   - Button shows spinner while checking
   - Updates to result when done

8. **Auto-check on open**
   - Triggers automatically if GitHub configured
   - Doesn't block UI rendering
