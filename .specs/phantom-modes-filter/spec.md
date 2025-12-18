# Phantom Modes Filter - CLI

## Problem

When displaying collections from Figma during init/sync, phantom modes appear that are Figma internal IDs rather than actual mode names:

```
theme (5 modes: 21598:4, 21598:5, 21598:6, dark, light)
```

The IDs like `21598:4` are Figma's internal mode identifiers that leak through when:
- Modes were deleted but not fully cleaned up
- Mode names weren't properly resolved by the plugin

## Solution

Add a filter in the CLI to detect and exclude phantom modes (Figma internal IDs) from display and processing.

## Detection Pattern

Phantom modes follow the pattern `number:number` (e.g., `21598:4`, `12345:0`).

```typescript
const isPhantomMode = (mode: string): boolean => /^\d+:\d+$/.test(mode);
```

## Implementation

### 1. Filter in `discoverCollectionsFromTokens` (sync.ts)

Location: `packages/cli/src/cli/commands/sync.ts` lines 31-59

```typescript
function discoverCollectionsFromTokens(
  normalizedTokens: RawTokens
): { name: string; modes: string[]; splitModes: boolean }[] {
  const isPhantomMode = (mode: string): boolean => /^\d+:\d+$/.test(mode);

  // Build map of collections to their unique modes
  const collectionModes = new Map<string, Set<string>>();

  for (const entry of Object.values(normalizedTokens)) {
    const collection = entry.collection || entry.path.split('.')[0];
    const mode = entry.mode || 'default';

    // Skip phantom modes
    if (isPhantomMode(mode)) continue;

    if (!collectionModes.has(collection)) {
      collectionModes.set(collection, new Set());
    }
    collectionModes.get(collection)!.add(mode);
  }

  // ... rest unchanged
}
```

### 2. Filter tokens before baseline storage (sync.ts)

After fetching and normalizing tokens, filter out entries with phantom modes:

```typescript
// Filter out phantom mode tokens
const isPhantomMode = (mode: string): boolean => /^\d+:\d+$/.test(mode);
const filteredTokens = Object.fromEntries(
  Object.entries(normalizedTokens).filter(([_, entry]) => !isPhantomMode(entry.mode || ''))
);
```

### 3. Add utility function

Create a shared utility in `packages/cli/src/utils/figma.ts`:

```typescript
/**
 * Detects phantom Figma modes (internal IDs like "21598:4")
 * These occur when modes are deleted or names aren't properly resolved
 */
export const isPhantomMode = (mode: string): boolean => /^\d+:\d+$/.test(mode);

/**
 * Filters out tokens with phantom modes
 */
export const filterPhantomModes = <T extends { mode?: string }>(
  tokens: Record<string, T>
): Record<string, T> => {
  return Object.fromEntries(
    Object.entries(tokens).filter(([_, entry]) => !isPhantomMode(entry.mode || ''))
  );
};
```

## Files to Modify

1. `packages/cli/src/utils/figma.ts` (create if needed) - Add utility functions
2. `packages/cli/src/cli/commands/sync.ts` - Filter in discovery and token processing
3. `packages/cli/src/cli/commands/sync.test.ts` - Add tests for phantom mode filtering

## Tests

```typescript
describe('isPhantomMode', () => {
  it('detects Figma internal IDs', () => {
    expect(isPhantomMode('21598:4')).toBe(true);
    expect(isPhantomMode('12345:0')).toBe(true);
    expect(isPhantomMode('0:0')).toBe(true);
  });

  it('allows valid mode names', () => {
    expect(isPhantomMode('dark')).toBe(false);
    expect(isPhantomMode('light')).toBe(false);
    expect(isPhantomMode('Desktop')).toBe(false);
    expect(isPhantomMode('value')).toBe(false);
    expect(isPhantomMode('Mode 1')).toBe(false);
  });

  it('handles edge cases', () => {
    expect(isPhantomMode('')).toBe(false);
    expect(isPhantomMode('21598')).toBe(false);  // no colon
    expect(isPhantomMode(':4')).toBe(false);      // no number before
    expect(isPhantomMode('abc:123')).toBe(false); // not all numbers
  });
});
```

## Acceptance Criteria

- [x] Phantom modes (e.g., `21598:4`) are not displayed in "Collections from Figma" output
- [x] Tokens with phantom modes are filtered out before saving to baseline
- [x] Valid mode names are not affected
- [x] Tests cover detection and filtering
- [x] No breaking changes to existing functionality
