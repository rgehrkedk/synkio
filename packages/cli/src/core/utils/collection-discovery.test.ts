import { describe, it, expect } from 'vitest';
import { discoverCollectionsFromTokens, CollectionInfo } from './collection-discovery.js';
import type { RawTokens } from '../tokens.js';

describe('discoverCollectionsFromTokens', () => {
  it('should discover collections with multiple modes', () => {
    const tokens: RawTokens = {
      'var1': { variableId: 'var1', path: 'colors.primary', value: '#fff', type: 'COLOR', collection: 'theme', mode: 'light' },
      'var2': { variableId: 'var2', path: 'colors.primary', value: '#000', type: 'COLOR', collection: 'theme', mode: 'dark' },
      'var3': { variableId: 'var3', path: 'spacing.sm', value: '8px', type: 'FLOAT', collection: 'globals', mode: 'default' },
    };

    const result = discoverCollectionsFromTokens(tokens);

    expect(result).toHaveLength(2);

    const globals = result.find((c: CollectionInfo) => c.name === 'globals');
    expect(globals).toBeDefined();
    expect(globals!.modes).toEqual(['default']);
    expect(globals!.splitBy).toBe('none'); // Single mode

    const theme = result.find((c: CollectionInfo) => c.name === 'theme');
    expect(theme).toBeDefined();
    expect(theme!.modes).toEqual(['dark', 'light']); // Sorted alphabetically
    expect(theme!.splitBy).toBe('mode'); // Multiple modes
  });

  it('should filter out phantom modes', () => {
    const tokens: RawTokens = {
      'var1': { variableId: 'var1', path: 'colors.primary', value: '#fff', type: 'COLOR', collection: 'theme', mode: 'light' },
      'var2': { variableId: 'var2', path: 'colors.primary', value: '#000', type: 'COLOR', collection: 'theme', mode: '21598:4' }, // Phantom mode
    };

    const result = discoverCollectionsFromTokens(tokens);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('theme');
    expect(result[0].modes).toEqual(['light']);
    expect(result[0].splitBy).toBe('none'); // Only one valid mode
  });

  it('should return empty array for empty tokens', () => {
    const result = discoverCollectionsFromTokens({});
    expect(result).toEqual([]);
  });

  it('should fall back to path-based collection when collection field is missing', () => {
    const tokens: RawTokens = {
      'var1': { variableId: 'var1', path: 'colors.primary.base', value: '#fff', type: 'COLOR', mode: 'default' },
    } as RawTokens;

    const result = discoverCollectionsFromTokens(tokens);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('colors');
    expect(result[0].modes).toEqual(['default']);
  });

  it('should use default mode when mode field is missing', () => {
    const tokens: RawTokens = {
      'var1': { variableId: 'var1', path: 'colors.primary', value: '#fff', type: 'COLOR', collection: 'theme' },
    } as RawTokens;

    const result = discoverCollectionsFromTokens(tokens);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('theme');
    expect(result[0].modes).toEqual(['default']);
  });

  it('should sort collections alphabetically', () => {
    const tokens: RawTokens = {
      'var1': { variableId: 'var1', path: 'bg.primary', value: '#fff', type: 'COLOR', collection: 'zebra', mode: 'default' },
      'var2': { variableId: 'var2', path: 'fg.primary', value: '#000', type: 'COLOR', collection: 'alpha', mode: 'default' },
      'var3': { variableId: 'var3', path: 'text.primary', value: '#333', type: 'COLOR', collection: 'beta', mode: 'default' },
    };

    const result = discoverCollectionsFromTokens(tokens);

    expect(result.map((c: CollectionInfo) => c.name)).toEqual(['alpha', 'beta', 'zebra']);
  });

  it('should detect multiple modes across many tokens', () => {
    const tokens: RawTokens = {
      'var1': { variableId: 'var1', path: 'colors.primary', value: '#fff', type: 'COLOR', collection: 'theme', mode: 'light' },
      'var2': { variableId: 'var2', path: 'colors.secondary', value: '#fff', type: 'COLOR', collection: 'theme', mode: 'light' },
      'var3': { variableId: 'var3', path: 'colors.primary', value: '#000', type: 'COLOR', collection: 'theme', mode: 'dark' },
      'var4': { variableId: 'var4', path: 'colors.secondary', value: '#000', type: 'COLOR', collection: 'theme', mode: 'dark' },
      'var5': { variableId: 'var5', path: 'colors.primary', value: '#ccc', type: 'COLOR', collection: 'theme', mode: 'dimmed' },
    };

    const result = discoverCollectionsFromTokens(tokens);

    expect(result).toHaveLength(1);
    expect(result[0].modes).toEqual(['dark', 'dimmed', 'light']); // Sorted alphabetically
    expect(result[0].splitBy).toBe('mode');
  });
});
