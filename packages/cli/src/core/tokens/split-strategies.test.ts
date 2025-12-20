/**
 * Split Strategies Tests
 */

import { describe, it, expect } from 'vitest';
import {
  determineSplitStrategy,
  getFileKey,
  getNestedPath,
} from './split-strategies.js';

describe('split-strategies', () => {
  describe('determineSplitStrategy', () => {
    it('should split by mode with default configuration', () => {
      const result = determineSplitStrategy({
        collection: 'theme',
        mode: 'light',
        pathParts: ['bg', 'primary'],
        defaultSplitBy: 'mode',
        defaultIncludeMode: false,
      });

      expect(result.fileKey).toBe('theme.light');
      expect(result.nestedPath).toEqual(['bg', 'primary']);
      expect(result.group).toBeUndefined();
    });

    it('should split by group when configured', () => {
      const result = determineSplitStrategy({
        collection: 'globals',
        mode: 'default',
        pathParts: ['colors', 'primary', 'base'],
        collectionConfig: { splitBy: 'group' },
        defaultSplitBy: 'mode',
        defaultIncludeMode: false,
      });

      expect(result.fileKey).toBe('globals.colors');
      expect(result.nestedPath).toEqual(['primary', 'base']);
      expect(result.group).toBe('colors');
    });

    it('should not split when splitBy is none', () => {
      const result = determineSplitStrategy({
        collection: 'theme',
        mode: 'light',
        pathParts: ['bg', 'primary'],
        collectionConfig: { splitBy: 'none' },
        defaultSplitBy: 'mode',
        defaultIncludeMode: false,
      });

      expect(result.fileKey).toBe('theme');
      expect(result.nestedPath).toEqual(['bg', 'primary']);
      expect(result.group).toBeUndefined();
    });

    it('should include mode in nested path when includeMode is true', () => {
      const result = determineSplitStrategy({
        collection: 'theme',
        mode: 'dark',
        pathParts: ['bg', 'primary'],
        collectionConfig: { splitBy: 'mode', includeMode: true },
        defaultSplitBy: 'mode',
        defaultIncludeMode: false,
      });

      expect(result.fileKey).toBe('theme.dark');
      expect(result.nestedPath).toEqual(['dark', 'bg', 'primary']);
    });
  });

  describe('getFileKey', () => {
    it('should generate mode-based file key', () => {
      expect(getFileKey('theme', 'light', 'bg', 'mode')).toBe('theme.light');
      expect(getFileKey('colors', 'dark', 'primary', 'mode')).toBe('colors.dark');
    });

    it('should generate group-based file key', () => {
      expect(getFileKey('globals', 'default', 'colors', 'group')).toBe('globals.colors');
      expect(getFileKey('globals', 'default', 'spacing', 'group')).toBe('globals.spacing');
    });

    it('should generate collection-only file key for splitBy none', () => {
      expect(getFileKey('theme', 'light', 'bg', 'none')).toBe('theme');
      expect(getFileKey('colors', 'dark', 'primary', 'none')).toBe('colors');
    });
  });

  describe('getNestedPath', () => {
    it('should return path as-is for mode splitting without includeMode', () => {
      expect(getNestedPath(['colors', 'primary'], 'light', 'mode', false)).toEqual(['colors', 'primary']);
    });

    it('should prepend mode for mode splitting with includeMode', () => {
      expect(getNestedPath(['colors', 'primary'], 'light', 'mode', true)).toEqual(['light', 'colors', 'primary']);
    });

    it('should remove top-level group for group splitting without includeMode', () => {
      expect(getNestedPath(['colors', 'primary', 'base'], 'default', 'group', false)).toEqual(['primary', 'base']);
    });

    it('should remove top-level group and prepend mode for group splitting with includeMode', () => {
      expect(getNestedPath(['colors', 'primary', 'base'], 'default', 'group', true)).toEqual(['default', 'primary', 'base']);
    });

    it('should return path as-is for none splitting without includeMode', () => {
      expect(getNestedPath(['bg', 'primary'], 'light', 'none', false)).toEqual(['bg', 'primary']);
    });

    it('should prepend mode for none splitting with includeMode', () => {
      expect(getNestedPath(['bg', 'primary'], 'light', 'none', true)).toEqual(['light', 'bg', 'primary']);
    });
  });
});
