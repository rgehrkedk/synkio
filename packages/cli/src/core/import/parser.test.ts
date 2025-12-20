/**
 * Parser Module Tests
 *
 * Tests for parsing import files and building baseline.
 */

import { describe, it, expect } from 'vitest';
import {
  parseImportFiles,
  buildBaselineData,
  groupFilesByCollection,
  getBaselineSummary,
} from './parser.js';
import type { ImportFile } from './source-resolver.js';

// Sample Figma native format content for light mode
const lightModeContent = {
  colors: {
    primary: {
      $type: 'color',
      $value: { hex: '#007bff' },
      $extensions: {
        'com.figma.variableId': 'VariableID:1:1',
        'com.figma.scopes': ['ALL_SCOPES'],
      },
    },
    secondary: {
      $type: 'color',
      $value: { hex: '#6c757d' },
      $extensions: {
        'com.figma.variableId': 'VariableID:1:2',
      },
    },
  },
  $extensions: {
    'com.figma.modeName': 'light',
  },
};

// Sample Figma native format content for dark mode
const darkModeContent = {
  colors: {
    primary: {
      $type: 'color',
      $value: { hex: '#0056b3' },
      $extensions: {
        'com.figma.variableId': 'VariableID:1:1',
      },
    },
  },
  $extensions: {
    'com.figma.modeName': 'dark',
  },
};

// Sample globals content (different collection)
const globalsContent = {
  spacing: {
    small: {
      $type: 'dimension',
      $value: '4px',
      $extensions: {
        'com.figma.variableId': 'VariableID:2:1',
      },
    },
  },
  $extensions: {
    'com.figma.modeName': 'default',
  },
};

describe('parser', () => {
  describe('groupFilesByCollection', () => {
    it('should group files by collection name', () => {
      const files: ImportFile[] = [
        { content: lightModeContent, filename: 'light.json', collection: 'theme' },
        { content: darkModeContent, filename: 'dark.json', collection: 'theme' },
        { content: globalsContent, filename: 'globals.json', collection: 'globals' },
      ];

      const grouped = groupFilesByCollection(files);

      expect(grouped.size).toBe(2);
      expect(grouped.get('theme')).toHaveLength(2);
      expect(grouped.get('globals')).toHaveLength(1);
    });

    it('should handle single collection', () => {
      const files: ImportFile[] = [
        { content: lightModeContent, filename: 'light.json', collection: 'theme' },
      ];

      const grouped = groupFilesByCollection(files);

      expect(grouped.size).toBe(1);
      expect(grouped.get('theme')).toHaveLength(1);
    });

    it('should return empty map for empty files array', () => {
      const grouped = groupFilesByCollection([]);

      expect(grouped.size).toBe(0);
    });
  });

  describe('parseImportFiles', () => {
    it('should parse single file into baseline', () => {
      const files: ImportFile[] = [
        { content: lightModeContent, filename: 'light.json', collection: 'theme' },
      ];

      const result = parseImportFiles(files);

      expect(result.tokenCount).toBe(2); // primary and secondary
      expect(result.collections.has('theme')).toBe(true);
      expect(result.modes.has('light')).toBe(true);
      expect(Object.keys(result.baseline).length).toBe(2);
    });

    it('should parse multiple modes from same collection', () => {
      const files: ImportFile[] = [
        { content: lightModeContent, filename: 'light.json', collection: 'theme' },
        { content: darkModeContent, filename: 'dark.json', collection: 'theme' },
      ];

      const result = parseImportFiles(files);

      // 2 tokens from light + 1 token from dark = 3 entries
      expect(result.tokenCount).toBe(3);
      expect(result.collections.size).toBe(1);
      expect(result.modes.has('light')).toBe(true);
      expect(result.modes.has('dark')).toBe(true);
    });

    it('should parse multiple collections', () => {
      const files: ImportFile[] = [
        { content: lightModeContent, filename: 'light.json', collection: 'theme' },
        { content: globalsContent, filename: 'globals.json', collection: 'globals' },
      ];

      const result = parseImportFiles(files);

      expect(result.collections.has('theme')).toBe(true);
      expect(result.collections.has('globals')).toBe(true);
      expect(result.collections.size).toBe(2);
    });

    it('should include variableId in baseline keys', () => {
      const files: ImportFile[] = [
        { content: lightModeContent, filename: 'light.json', collection: 'theme' },
      ];

      const result = parseImportFiles(files);
      const keys = Object.keys(result.baseline);

      // Keys should include variableId for Figma native format
      expect(keys.some(k => k.includes('VariableID:1:1'))).toBe(true);
    });
  });

  describe('buildBaselineData', () => {
    it('should create BaselineData with metadata', () => {
      const baseline = {
        'VariableID:1:1:theme.light': {
          path: 'colors.primary',
          value: '#007bff',
          type: 'color',
          collection: 'theme',
          mode: 'light',
        },
      };

      const result = buildBaselineData(baseline);

      expect(result.baseline).toBe(baseline);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.syncedAt).toBeDefined();
      expect(new Date(result.metadata.syncedAt).getTime()).not.toBeNaN();
    });

    it('should create valid ISO timestamp', () => {
      const baseline = {};
      const before = new Date().toISOString();
      const result = buildBaselineData(baseline);
      const after = new Date().toISOString();

      // Verify timestamp is between before and after
      expect(result.metadata.syncedAt >= before).toBe(true);
      expect(result.metadata.syncedAt <= after).toBe(true);
    });
  });

  describe('getBaselineSummary', () => {
    it('should extract collections and modes from baseline', () => {
      const baseline = {
        'key1': { path: 'a', value: 1, type: 'number', collection: 'theme', mode: 'light' },
        'key2': { path: 'b', value: 2, type: 'number', collection: 'theme', mode: 'dark' },
        'key3': { path: 'c', value: 3, type: 'number', collection: 'globals', mode: 'default' },
      };

      const summary = getBaselineSummary(baseline);

      expect(summary.collections.sort()).toEqual(['globals', 'theme']);
      expect(summary.modes.sort()).toEqual(['dark', 'default', 'light']);
    });

    it('should handle empty baseline', () => {
      const summary = getBaselineSummary({});

      expect(summary.collections).toHaveLength(0);
      expect(summary.modes).toHaveLength(0);
    });
  });
});
