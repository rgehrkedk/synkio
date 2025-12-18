import { describe, it, expect } from 'vitest';
import { isPhantomMode, filterPhantomModes } from './figma.js';

describe('isPhantomMode', () => {
  it('detects Figma internal IDs', () => {
    expect(isPhantomMode('21598:4')).toBe(true);
    expect(isPhantomMode('12345:0')).toBe(true);
    expect(isPhantomMode('0:0')).toBe(true);
    expect(isPhantomMode('999999:123456')).toBe(true);
  });

  it('allows valid mode names', () => {
    expect(isPhantomMode('dark')).toBe(false);
    expect(isPhantomMode('light')).toBe(false);
    expect(isPhantomMode('Desktop')).toBe(false);
    expect(isPhantomMode('value')).toBe(false);
    expect(isPhantomMode('Mode 1')).toBe(false);
    expect(isPhantomMode('default')).toBe(false);
    expect(isPhantomMode('brandA')).toBe(false);
  });

  it('handles edge cases', () => {
    expect(isPhantomMode('')).toBe(false);
    expect(isPhantomMode('21598')).toBe(false);  // no colon
    expect(isPhantomMode(':4')).toBe(false);      // no number before
    expect(isPhantomMode('abc:123')).toBe(false); // not all numbers
    expect(isPhantomMode('123:abc')).toBe(false); // not all numbers
    expect(isPhantomMode('21598:4:5')).toBe(false); // too many colons
    expect(isPhantomMode('mode:name')).toBe(false); // words with colon
  });
});

describe('filterPhantomModes', () => {
  it('filters out tokens with phantom modes', () => {
    const tokens = {
      'VariableID:1:1:theme.21598:4': {
        collection: 'theme',
        mode: '21598:4',
        path: 'colors.primary',
        value: '#000',
        type: 'color'
      },
      'VariableID:1:2:theme.light': {
        collection: 'theme',
        mode: 'light',
        path: 'colors.primary',
        value: '#fff',
        type: 'color'
      },
      'VariableID:1:3:theme.dark': {
        collection: 'theme',
        mode: 'dark',
        path: 'colors.secondary',
        value: '#333',
        type: 'color'
      },
      'VariableID:2:1:base.12345:0': {
        collection: 'base',
        mode: '12345:0',
        path: 'spacing.sm',
        value: 8,
        type: 'number'
      }
    };

    const filtered = filterPhantomModes(tokens);

    expect(Object.keys(filtered)).toHaveLength(2);
    expect(filtered['VariableID:1:2:theme.light']).toBeDefined();
    expect(filtered['VariableID:1:3:theme.dark']).toBeDefined();
    expect(filtered['VariableID:1:1:theme.21598:4']).toBeUndefined();
    expect(filtered['VariableID:2:1:base.12345:0']).toBeUndefined();
  });

  it('preserves all tokens when no phantom modes exist', () => {
    const tokens = {
      'VariableID:1:1:theme.light': {
        collection: 'theme',
        mode: 'light',
        path: 'colors.primary',
        value: '#fff',
        type: 'color'
      },
      'VariableID:1:2:theme.dark': {
        collection: 'theme',
        mode: 'dark',
        path: 'colors.primary',
        value: '#000',
        type: 'color'
      }
    };

    const filtered = filterPhantomModes(tokens);

    expect(Object.keys(filtered)).toHaveLength(2);
    expect(filtered).toEqual(tokens);
  });

  it('handles tokens without mode property', () => {
    const tokens = {
      'VariableID:1:1:base': {
        collection: 'base',
        path: 'colors.primary',
        value: '#000',
        type: 'color'
        // mode is undefined
      },
      'VariableID:1:2:theme.light': {
        collection: 'theme',
        mode: 'light',
        path: 'colors.secondary',
        value: '#fff',
        type: 'color'
      }
    };

    const filtered = filterPhantomModes(tokens as any);

    // Token without mode should be preserved (defaults to empty string check)
    expect(Object.keys(filtered)).toHaveLength(2);
  });

  it('returns empty object when all tokens have phantom modes', () => {
    const tokens = {
      'VariableID:1:1:theme.21598:4': {
        collection: 'theme',
        mode: '21598:4',
        path: 'colors.primary',
        value: '#000',
        type: 'color'
      },
      'VariableID:2:1:base.12345:0': {
        collection: 'base',
        mode: '12345:0',
        path: 'spacing.sm',
        value: 8,
        type: 'number'
      }
    };

    const filtered = filterPhantomModes(tokens);

    expect(Object.keys(filtered)).toHaveLength(0);
  });

  it('returns empty object for empty input', () => {
    const filtered = filterPhantomModes({});
    expect(filtered).toEqual({});
  });
});
