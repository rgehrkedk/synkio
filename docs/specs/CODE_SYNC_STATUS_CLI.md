# Code Sync Status - CLI Implementation Specification

## Overview

The CLI writes a `sync-status.json` file after each successful sync. This file allows the Figma plugin to determine whether the latest exported tokens have been synced.

## File Location

**Default:** `synkio/sync-status.json`

This file is written alongside the existing `synkio/baseline.json` file.

## File Format

```json
{
  "fileKey": "abc123xyz789def456",
  "baselineHash": "sha256:a1b2c3d4",
  "syncedAt": "2024-01-15T10:30:00.000Z",
  "syncedBy": "cli",
  "cliVersion": "1.2.0",
  "summary": {
    "tokenCount": 150,
    "styleCount": 25,
    "collectionCount": 3,
    "collections": ["primitives", "semantic", "theme"]
  }
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileKey` | string | Yes | Figma file key (from config or URL) |
| `baselineHash` | string | Yes | Hash of the synced baseline data |
| `syncedAt` | ISO 8601 | Yes | Timestamp of sync completion |
| `syncedBy` | string | Yes | Always "cli" for now |
| `cliVersion` | string | Yes | Version of synkio CLI |
| `summary.tokenCount` | number | Yes | Total tokens synced |
| `summary.styleCount` | number | Yes | Total styles synced |
| `summary.collectionCount` | number | Yes | Number of collections |
| `summary.collections` | string[] | Yes | Collection names |

## Hash Algorithm

The hash must match the algorithm used by the Figma plugin. Both use a simple 32-bit hash:

```typescript
/**
 * Compute a deterministic hash of the plugin data.
 * This hash is used to verify sync status between plugin and CLI.
 */
export function computeBaselineHash(data: SynkioPluginData): string {
  // Sort keys for deterministic serialization
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  return 'sha256:' + simpleHash(normalized);
}

/**
 * Simple 32-bit hash function.
 * Not cryptographically secure, but fast and deterministic.
 */
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

### Hash Input

The hash is computed from the **raw plugin data** fetched from Figma, not the processed baseline. This ensures the plugin and CLI hash the same data.

```typescript
// In pipeline.ts
const pluginData = await figmaClient.fetchData();  // Raw plugin data
const hash = computeBaselineHash(pluginData);      // Hash this
```

## New File: `src/core/sync/status-writer.ts`

```typescript
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { version } from '../../../package.json';
import type { SynkioPluginData } from '../../types/schemas.js';

export interface SyncStatus {
  fileKey: string;
  baselineHash: string;
  syncedAt: string;
  syncedBy: 'cli';
  cliVersion: string;
  summary: {
    tokenCount: number;
    styleCount: number;
    collectionCount: number;
    collections: string[];
  };
}

/**
 * Write sync status file after successful sync.
 * This file is read by the Figma plugin to show sync status.
 */
export async function writeSyncStatus(
  outputDir: string,
  fileKey: string,
  pluginData: SynkioPluginData,
  collections: string[]
): Promise<void> {
  const statusPath = join(outputDir, 'sync-status.json');

  const status: SyncStatus = {
    fileKey,
    baselineHash: computeBaselineHash(pluginData),
    syncedAt: new Date().toISOString(),
    syncedBy: 'cli',
    cliVersion: version,
    summary: {
      tokenCount: pluginData.tokens?.length ?? 0,
      styleCount: pluginData.styles?.length ?? 0,
      collectionCount: collections.length,
      collections,
    },
  };

  // Ensure directory exists
  await mkdir(dirname(statusPath), { recursive: true });

  // Write status file
  await writeFile(statusPath, JSON.stringify(status, null, 2), 'utf-8');
}

/**
 * Compute a deterministic hash of the plugin data.
 */
export function computeBaselineHash(data: SynkioPluginData): string {
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  return 'sha256:' + simpleHash(normalized);
}

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

## Pipeline Integration

Update `src/core/sync/pipeline.ts` to write sync status:

```typescript
// At the end of the sync pipeline, after all files are written

import { writeSyncStatus } from './status-writer.js';

// Inside runSyncPipeline(), after successful sync:
async function runSyncPipeline(options: SyncOptions): Promise<SyncResult> {
  // ... existing pipeline code ...

  // After writing baseline and token files:
  try {
    await writeSyncStatus(
      synkioDir,              // .synkio directory
      config.figma.fileId,    // Figma file key
      pluginData,             // Raw plugin data (for hash)
      collections.map(c => c.name)  // Collection names
    );
    logger?.debug?.('Wrote sync status file');
  } catch (error) {
    // Non-fatal - don't fail sync if status write fails
    logger?.warn?.('Failed to write sync status file', { error });
  }

  return result;
}
```

## File Key Extraction

The file key is extracted from the Figma URL or config:

```typescript
// In config.ts or figma.ts
export function extractFileKey(figmaUrl: string): string {
  // https://www.figma.com/file/abc123xyz/Design-System?...
  // https://www.figma.com/design/abc123xyz/Design-System?...
  const match = figmaUrl.match(/(?:file|design)\/([a-zA-Z0-9]+)/);
  if (!match) {
    throw new Error('Invalid Figma URL');
  }
  return match[1];
}
```

## Git Considerations

### Should sync-status.json be committed?

**Yes** - Commit this file so the Figma plugin can fetch it from GitHub.

Add to `.gitignore` if you want local-only status:

```gitignore
# Uncommitted - local status only
synkio/sync-status.json
```

Or keep it tracked (default):

```gitignore
# .synkio files are tracked
!synkio/
```

### CI/CD Integration

In CI pipelines, sync-status.json provides a record of what was synced:

```yaml
# Example GitHub Actions
- name: Sync Figma tokens
  run: npx synkio sync

- name: Commit sync status
  run: |
    git add synkio/sync-status.json tokens/
    git commit -m "chore: sync design tokens"
```

## Regenerate Mode

When running `synkio sync --regenerate`, the status file should **not** be updated since no actual sync from Figma occurs:

```typescript
// In pipeline.ts
if (!options.regenerate) {
  await writeSyncStatus(...);
}
```

This prevents false positives in the plugin's status check.

## Error Handling

### Status Write Failure

If status write fails, the sync should still succeed:

```typescript
try {
  await writeSyncStatus(...);
} catch (error) {
  logger?.warn?.('Could not write sync status', { error });
  // Don't throw - sync was successful
}
```

### Missing File Key

If file key cannot be determined:

```typescript
if (!fileKey) {
  logger?.debug?.('No file key available, skipping status write');
  return;
}
```

## Testing

### Unit Tests

```typescript
// status-writer.test.ts
import { describe, it, expect } from 'vitest';
import { computeBaselineHash, writeSyncStatus } from './status-writer.js';

describe('computeBaselineHash', () => {
  it('produces deterministic hash', () => {
    const data = { tokens: [{ id: '1', value: 'red' }] };
    const hash1 = computeBaselineHash(data);
    const hash2 = computeBaselineHash(data);
    expect(hash1).toBe(hash2);
  });

  it('produces different hash for different data', () => {
    const data1 = { tokens: [{ id: '1', value: 'red' }] };
    const data2 = { tokens: [{ id: '1', value: 'blue' }] };
    expect(computeBaselineHash(data1)).not.toBe(computeBaselineHash(data2));
  });

  it('is not affected by key order', () => {
    const data1 = { a: 1, b: 2 };
    const data2 = { b: 2, a: 1 };
    expect(computeBaselineHash(data1)).toBe(computeBaselineHash(data2));
  });
});

describe('writeSyncStatus', () => {
  it('writes valid JSON', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'synkio-'));
    await writeSyncStatus(tmpDir, 'abc123', mockPluginData, ['colors']);

    const content = await readFile(join(tmpDir, 'sync-status.json'), 'utf-8');
    const status = JSON.parse(content);

    expect(status.fileKey).toBe('abc123');
    expect(status.baselineHash).toMatch(/^sha256:[a-f0-9]{8}$/);
    expect(status.syncedBy).toBe('cli');
  });
});
```

## Zod Schema

Add to `src/types/schemas.ts`:

```typescript
import { z } from 'zod';

export const SyncStatusSchema = z.object({
  fileKey: z.string(),
  baselineHash: z.string().regex(/^sha256:[a-f0-9]{8}$/),
  syncedAt: z.string().datetime(),
  syncedBy: z.literal('cli'),
  cliVersion: z.string(),
  summary: z.object({
    tokenCount: z.number().int().nonnegative(),
    styleCount: z.number().int().nonnegative(),
    collectionCount: z.number().int().nonnegative(),
    collections: z.array(z.string()),
  }),
});

export type SyncStatus = z.infer<typeof SyncStatusSchema>;
```

## CLI Output

Update the sync completion message to mention status:

```
✔ Synced 150 tokens across 3 collections
✔ Wrote sync status to synkio/sync-status.json

Run `git add synkio/ tokens/` to commit changes.
```

## Implementation Checklist

- [ ] Create `src/core/sync/status-writer.ts`
  - [ ] `computeBaselineHash()` function
  - [ ] `writeSyncStatus()` function
  - [ ] Export types

- [ ] Update `src/core/sync/pipeline.ts`
  - [ ] Import status writer
  - [ ] Call `writeSyncStatus()` after successful sync
  - [ ] Skip for `--regenerate` mode

- [ ] Update `src/types/schemas.ts`
  - [ ] Add `SyncStatusSchema`
  - [ ] Export `SyncStatus` type

- [ ] Add tests
  - [ ] Hash determinism tests
  - [ ] Status file write tests
  - [ ] Integration test with mock data

- [ ] Update CLI output
  - [ ] Show status file write in sync output
  - [ ] Include in verbose logging

## Future Enhancements

1. **Multiple File Support**: If CLI supports multiple Figma files, write separate status files or use file key as filename
2. **Status History**: Keep last N sync statuses for debugging
3. **Webhook Trigger**: POST to webhook when sync completes
4. **Lock File**: Prevent concurrent syncs with lock file
