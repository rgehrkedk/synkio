/**
 * Reference Resolver Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildVariableIdLookup,
  resolveReference,
  isReference,
} from './reference-resolver.js';
import type { RawTokens } from '../tokens.js';

describe('reference-resolver', () => {
  describe('buildVariableIdLookup', () => {
    it('should build lookup map from variableId to path', () => {
      const rawTokens: RawTokens = {
        'var1': {
          variableId: 'VariableID:1:31',
          path: 'colors.primary',
          value: '#0066cc',
          type: 'COLOR',
          collection: 'colors',
          mode: 'default',
        },
        'var2': {
          variableId: 'VariableID:1:32',
          path: 'colors.secondary',
          value: '#00cc66',
          type: 'COLOR',
          collection: 'colors',
          mode: 'default',
        },
      };

      const lookup = buildVariableIdLookup(rawTokens);

      expect(lookup.size).toBe(2);
      expect(lookup.get('VariableID:1:31')).toBe('colors.primary');
      expect(lookup.get('VariableID:1:32')).toBe('colors.secondary');
    });

    it('should handle empty tokens', () => {
      const lookup = buildVariableIdLookup({});
      expect(lookup.size).toBe(0);
    });

    it('should skip entries without variableId or path', () => {
      const rawTokens: RawTokens = {
        'var1': {
          variableId: 'VariableID:1:31',
          path: 'colors.primary',
          value: '#0066cc',
          type: 'COLOR',
          collection: 'colors',
          mode: 'default',
        },
        'var2': {
          variableId: '',
          path: 'colors.secondary',
          value: '#00cc66',
          type: 'COLOR',
          collection: 'colors',
          mode: 'default',
        },
      };

      const lookup = buildVariableIdLookup(rawTokens);

      expect(lookup.size).toBe(1);
      expect(lookup.get('VariableID:1:31')).toBe('colors.primary');
    });
  });

  describe('resolveReference', () => {
    const lookup = new Map([
      ['VariableID:1:31', 'colors.primary'],
      ['VariableID:1:32', 'colors.secondary'],
    ]);

    it('should resolve $ref to DTCG path format', () => {
      const value = { $ref: 'VariableID:1:31' };
      const result = resolveReference(value, lookup, 'bg.primary');

      expect(result).toBe('{colors.primary}');
    });

    it('should return original value when $ref not found in lookup', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const value = { $ref: 'VariableID:999:999' };
      const result = resolveReference(value, lookup, 'bg.unknown');

      expect(result).toEqual({ $ref: 'VariableID:999:999' });
      expect(warnSpy).toHaveBeenCalledWith(
        'Warning: Could not resolve reference VariableID:999:999 for token bg.unknown'
      );

      warnSpy.mockRestore();
    });

    it('should return non-reference values unchanged', () => {
      expect(resolveReference('#ff0000', lookup, 'colors.accent')).toBe('#ff0000');
      expect(resolveReference(42, lookup, 'spacing.md')).toBe(42);
      expect(resolveReference(null, lookup, 'empty')).toBe(null);
    });

    it('should return object without $ref unchanged', () => {
      const value = { r: 1, g: 0, b: 0, a: 1 };
      const result = resolveReference(value, lookup, 'colors.red');

      expect(result).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    });
  });

  describe('isReference', () => {
    it('should return true for objects with $ref', () => {
      expect(isReference({ $ref: 'VariableID:1:31' })).toBe(true);
    });

    it('should return false for non-reference values', () => {
      expect(isReference('#ff0000')).toBe(false);
      expect(isReference(42)).toBe(false);
      expect(isReference(null)).toBe(false);
      expect(isReference(undefined)).toBe(false);
      expect(isReference({ value: '#ff0000' })).toBe(false);
      expect(isReference({ r: 1, g: 0, b: 0 })).toBe(false);
    });
  });
});
