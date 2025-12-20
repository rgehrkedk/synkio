/**
 * Filename Generator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateFilename,
  extractModeFromKey,
  extractCollectionFromKey,
} from './filename-generator.js';

describe('filename-generator', () => {
  describe('generateFilename', () => {
    it('should generate mode-based filename (collection.mode.json)', () => {
      const result = generateFilename(
        'theme.light',
        { collection: 'theme' },
        { splitBy: 'mode' },
        'mode',
        'mode'
      );

      expect(result).toBe('theme.light.json');
    });

    it('should generate group-based filename (group.json)', () => {
      const result = generateFilename(
        'globals.colors',
        { collection: 'globals', group: 'colors' },
        { splitBy: 'group' },
        'group',
        'mode'
      );

      expect(result).toBe('colors.json');
    });

    it('should apply names mapping to modes', () => {
      const result = generateFilename(
        'theme.light',
        { collection: 'theme' },
        { splitBy: 'mode', names: { light: 'day', dark: 'night' } },
        'mode',
        'mode'
      );

      expect(result).toBe('theme.day.json');
    });

    it('should apply names mapping to groups', () => {
      const result = generateFilename(
        'globals.colors',
        { collection: 'globals', group: 'colors' },
        { splitBy: 'group', names: { colors: 'palette' } },
        'group',
        'mode'
      );

      expect(result).toBe('palette.json');
    });

    it('should use custom file base for mode splitting', () => {
      const result = generateFilename(
        'theme.light',
        { collection: 'theme' },
        { file: 'semantic', splitBy: 'mode' },
        'mode',
        'mode'
      );

      expect(result).toBe('semantic.light.json');
    });

    it('should use custom file base with names mapping', () => {
      const result = generateFilename(
        'theme.light',
        { collection: 'theme' },
        { file: 'semantic', splitBy: 'mode', names: { light: 'day' } },
        'mode',
        'mode'
      );

      expect(result).toBe('semantic.day.json');
    });

    it('should use custom file for splitBy none', () => {
      const result = generateFilename(
        'theme',
        { collection: 'theme' },
        { file: 'design-tokens', splitBy: 'none' },
        'none',
        'mode'
      );

      expect(result).toBe('design-tokens.json');
    });

    it('should use key as-is when no config provided', () => {
      const result = generateFilename(
        'theme.default',
        { collection: 'theme' },
        undefined,
        'mode',
        'mode'
      );

      expect(result).toBe('theme.default.json');
    });

    it('should leave unmapped names unchanged', () => {
      const result = generateFilename(
        'theme.dark',
        { collection: 'theme' },
        { splitBy: 'mode', names: { light: 'day' } },
        'mode',
        'mode'
      );

      expect(result).toBe('theme.dark.json');
    });
  });

  describe('extractModeFromKey', () => {
    it('should extract mode from file key', () => {
      expect(extractModeFromKey('theme.light')).toBe('light');
      expect(extractModeFromKey('colors.dark')).toBe('dark');
    });

    it('should handle compound modes', () => {
      expect(extractModeFromKey('colors.dark.high-contrast')).toBe('dark.high-contrast');
    });

    it('should return empty string for keys without mode', () => {
      expect(extractModeFromKey('theme')).toBe('');
      expect(extractModeFromKey('colors')).toBe('');
    });
  });

  describe('extractCollectionFromKey', () => {
    it('should extract collection from file key', () => {
      expect(extractCollectionFromKey('theme.light')).toBe('theme');
      expect(extractCollectionFromKey('globals.colors')).toBe('globals');
    });

    it('should return full key when no dot present', () => {
      expect(extractCollectionFromKey('theme')).toBe('theme');
      expect(extractCollectionFromKey('colors')).toBe('colors');
    });
  });
});
