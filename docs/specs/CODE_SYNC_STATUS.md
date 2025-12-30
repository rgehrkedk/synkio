# Code Sync Status Feature Specification

## Overview

Enable the Figma plugin to display whether the CLI has synced the latest exported tokens. This creates a complete feedback loop where designers can see if their changes have been picked up by the codebase.

## Problem Statement

Currently, when a designer clicks "Sync" in the Figma plugin:
1. The plugin exports token data to `sharedPluginData`
2. The designer has no visibility into whether the CLI has fetched this data
3. They must ask developers or check git history to confirm

This feature adds a **"Pending Code Sync"** status that shows:
- Whether the CLI has synced the latest export
- When the last CLI sync occurred
- How to trigger a sync (helpful hint)

## Technical Approach

### Constraint

**The Figma REST API cannot write to `sharedPluginData`** - it's read-only. The plugin must actively fetch status from an external source.

### Solution: Hash-Based Status Verification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYNC FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   FIGMA PLUGIN                              CLI                              │
│   ─────────────                             ───                              │
│                                                                              │
│   1. User clicks "Sync"                                                      │
│      ↓                                                                       │
│   2. Collects variables/styles                                               │
│      ↓                                                                       │
│   3. Computes hash of baseline data                                          │
│      ↓                                                                       │
│   4. Saves to sharedPluginData:                                              │
│      • Full token/style data (existing)                                      │
│      • baselineHash (new)                                                    │
│      • exportedAt timestamp (new)                                            │
│      ↓                                                                       │
│   5. Shows "Pending Code Sync"              6. `synkio sync` runs            │
│      with hash preview                         ↓                             │
│                                             7. Fetches sharedPluginData      │
│                                                ↓                             │
│                                             8. Computes same hash            │
│                                                ↓                             │
│                                             9. Writes sync-status.json       │
│                                                with matching hash            │
│                                                                              │
│  10. Plugin fetches sync-status.json        ←─────────────────────────────── │
│      (from GitHub / localhost)                                               │
│      ↓                                                                       │
│  11. Compares hashes:                                                        │
│      • Match → "Code In Sync"                                                │
│      • Mismatch → "Pending Code Sync"                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Structures

### Plugin: New Metadata in sharedPluginData

```typescript
// Added to CLI-compatible storage (storage.ts)
figma.root.setSharedPluginData(NAMESPACE, 'baselineHash', hash);
figma.root.setSharedPluginData(NAMESPACE, 'exportedAt', new Date().toISOString());
```

### CLI: New sync-status.json File

Location: `synkio/sync-status.json`

```json
{
  "fileKey": "abc123xyz789",
  "baselineHash": "sha256:a1b2c3d4e5f6...",
  "syncedAt": "2024-01-15T10:30:00.000Z",
  "syncedBy": "cli",
  "cliVersion": "1.2.0",
  "summary": {
    "tokenCount": 150,
    "styleCount": 25,
    "collections": ["primitives", "semantic", "theme"]
  }
}
```

### Plugin: New Types

```typescript
// types.ts additions

export interface CodeSyncStatus {
  state: 'unknown' | 'pending' | 'synced' | 'error';
  localHash?: string;        // Hash of current plugin export
  remoteHash?: string;       // Hash from sync-status.json
  exportedAt?: string;       // When plugin last exported
  syncedAt?: string;         // When CLI last synced
  error?: string;            // Error message if fetch failed
}

// Updated SyncStatus
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
```

### Plugin: Updated Settings

```typescript
// RemoteSettings additions
export interface RemoteSettings {
  enabled: boolean;
  source: 'github' | 'url' | 'none';
  github?: GitHubSettings;
  customUrl?: string;
  autoCheck: boolean;         // Existing - always enabled by default
  lastFetch?: string;
  statusPath?: string;        // NEW - path to sync-status.json
}
```

## Hash Algorithm

Use a simple, deterministic hash of the baseline content:

```typescript
// In plugin (storage.ts)
function computeBaselineHash(data: CLISyncData): string {
  // Sort keys for determinism
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  // Use simple hash (Web Crypto API not available in Figma)
  return 'sha256:' + simpleHash(normalized);
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
```

```typescript
// In CLI (same algorithm)
function computeBaselineHash(data: SynkioPluginData): string {
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  return 'sha256:' + simpleHash(normalized);
}
```

## UI States

### State 1: Not Setup

When GitHub is not configured:

```
┌─────────────────────────────────────┐
│  CODE SYNC STATUS                   │
├─────────────────────────────────────┤
│                                     │
│  ○ Not Configured                   │
│                                     │
│  Configure GitHub connection to     │
│  track when code syncs your         │
│  exported tokens.                   │
│                                     │
│  [Configure in Settings]            │
│                                     │
└─────────────────────────────────────┘
```

### State 2: Pending Code Sync

When plugin has exported but CLI hasn't synced yet:

```
┌─────────────────────────────────────┐
│  CODE SYNC STATUS                   │
├─────────────────────────────────────┤
│                                     │
│  ◐ Pending Code Sync                │   ← Orange/yellow indicator
│                                     │
│  Exported 10 minutes ago            │
│  Waiting for: synkio sync           │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Run in your terminal:           ││
│  │ $ synkio sync                   ││
│  └─────────────────────────────────┘│
│                                     │
│        [↻ Check Status]             │
│                                     │
└─────────────────────────────────────┘
```

### State 3: Code In Sync

When CLI has synced the latest export:

```
┌─────────────────────────────────────┐
│  CODE SYNC STATUS                   │
├─────────────────────────────────────┤
│                                     │
│  ● Code In Sync                     │   ← Green indicator
│                                     │
│  Synced 2 hours ago                 │
│  via CLI v1.2.0                     │
│                                     │
│  150 tokens · 25 styles             │
│                                     │
│        [↻ Check Status]             │
│                                     │
└─────────────────────────────────────┘
```

### State 4: Checking Status

While fetching sync-status.json:

```
┌─────────────────────────────────────┐
│  CODE SYNC STATUS                   │
├─────────────────────────────────────┤
│                                     │
│  ◌ Checking...                      │   ← Spinner
│                                     │
└─────────────────────────────────────┘
```

### State 5: Error

When fetch fails:

```
┌─────────────────────────────────────┐
│  CODE SYNC STATUS                   │
├─────────────────────────────────────┤
│                                     │
│  ⚠ Could not check status           │   ← Warning indicator
│                                     │
│  File not found: sync-status.json   │
│  The CLI may not have synced yet.   │
│                                     │
│        [↻ Retry]                    │
│                                     │
└─────────────────────────────────────┘
```

## Plugin UI Integration

### Home Screen Changes

Add a new card below the status card:

```typescript
// home.ts - new function
function buildCodeSyncCard(state: PluginState, actions: RouterActions): HTMLElement {
  const { syncStatus, settings } = state;
  const codeSync = syncStatus.codeSync;

  // ... build card based on codeSync.state
}
```

Layout:

```
┌─────────────────────────────────────┐
│  Synkio                         ⚙️  │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │  SYNC STATUS                  │  │  ← Existing status card
│  │  [Figma] ←→ [Code]            │  │
│  │  ● In Sync                    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  CODE SYNC STATUS             │  │  ← NEW card
│  │  ◐ Pending Code Sync          │  │
│  │  Exported 10m ago             │  │
│  │        [↻ Check]              │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌──────────────┐ ┌──────────────┐  │
│  │ FIGMA → CODE │ │ CODE → FIGMA │  │  ← Existing workflow cards
│  └──────────────┘ └──────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Settings Screen Changes

Add a new section for status file configuration:

```
┌─────────────────────────────────────┐
│  CODE SYNC STATUS                   │
├─────────────────────────────────────┤
│                                     │
│  Status file path                   │
│  ┌─────────────────────────────────┐│
│  │ synkio/sync-status.json       ││
│  └─────────────────────────────────┘│
│                                     │
│  This file is created by the CLI    │
│  after each sync. The plugin reads  │
│  it to show sync status.            │
│                                     │
└─────────────────────────────────────┘
```

## Message Types

### New Messages

```typescript
// MessageToCode additions
| { type: 'check-code-sync' }           // Trigger status check

// MessageToUI additions
| { type: 'code-sync-checking' }        // Started checking
| { type: 'code-sync-result'; status: CodeSyncStatus }  // Result
| { type: 'code-sync-error'; error: string }            // Failed
```

## Implementation Checklist

### Plugin Changes (synkio-v2)

- [ ] **storage.ts**
  - [ ] Add `computeBaselineHash()` function
  - [ ] Update `saveForCLI()` to store `baselineHash` and `exportedAt`

- [ ] **types.ts**
  - [ ] Add `CodeSyncStatus` interface
  - [ ] Update `SyncStatus` to include `codeSync`
  - [ ] Add `statusPath` to `RemoteSettings`

- [ ] **code.ts**
  - [ ] Add `handleCheckCodeSync()` handler
  - [ ] Fetch sync-status.json from GitHub
  - [ ] Compare hashes and return status
  - [ ] Call on plugin open if GitHub configured

- [ ] **screens/home.ts**
  - [ ] Add `buildCodeSyncCard()` function
  - [ ] Integrate into home screen layout

- [ ] **screens/settings.ts**
  - [ ] Add status path configuration field
  - [ ] Show current status path with explanation

- [ ] **ui/components.ts** (if needed)
  - [ ] Add any new status indicator variants

### CLI Changes (packages/cli)

- [ ] **core/sync/status-writer.ts** (new file)
  - [ ] `computeBaselineHash()` function (matching plugin)
  - [ ] `writeSyncStatus()` function
  - [ ] Generate sync-status.json content

- [ ] **core/sync/pipeline.ts**
  - [ ] Call `writeSyncStatus()` after successful sync
  - [ ] Pass file key and baseline hash

- [ ] **types/schemas.ts**
  - [ ] Add `SyncStatusSchema` for validation

## Configuration

### Default Status Path

The default path for sync-status.json is:

```
synkio/sync-status.json
```

This can be customized in Settings if needed.

### GitHub Fetch URL

The plugin will fetch from:

```
# Public repos
https://raw.githubusercontent.com/{owner}/{repo}/{branch}/synkio/sync-status.json

# Private repos (with token)
https://api.github.com/repos/{owner}/{repo}/contents/synkio/sync-status.json?ref={branch}
```

## Edge Cases

### 1. File Not Found (404)

If sync-status.json doesn't exist:
- Show "Pending Code Sync" with explanation
- "The CLI hasn't synced yet, or the file isn't committed."

### 2. Network Error

If GitHub is unreachable:
- Show warning state
- Allow manual retry
- Don't block plugin functionality

### 3. Hash Mismatch After Code Changes

If code makes token changes and regenerates:
- The hash will change
- Plugin will show "Code Ahead" or similar
- This is expected and informative

### 4. Multiple Figma Files

Each Figma file has its own export. The CLI should:
- Include `fileKey` in sync-status.json
- Plugin verifies it matches current file

## Future Enhancements

1. **Webhook Integration**: Real-time updates via webhooks instead of polling
2. **CI/CD Integration**: Automatic sync on git push
3. **Slack/Teams Notifications**: Alert designers when code syncs
4. **Sync History**: Show timeline of code syncs
