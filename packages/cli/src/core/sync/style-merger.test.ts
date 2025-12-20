/**
 * Style Merger Module Tests
 *
 * Tests for merging styles into token files.
 * This module consolidates ~150 LOC of duplicated logic from sync.ts.
 */

import { describe, it, expect } from 'vitest';
import {
  mergeStylesIntoTokens,
  determineTargetFile,
  type MergeResult,
} from './style-merger.js';
import type { SplitStyleFile } from '../tokens.js';

describe('style-merger', () => {
  describe('determineTargetFile', () => {
    it('should return group-based filename for splitBy: group', () => {
      const result = determineTargetFile(
        { collection: 'globals', group: 'font' },
        { splitBy: 'group' },
        'group',
        {},
        '/tokens'
      );

      expect(result).toBe('font.json');
    });

    it('should apply names mapping for group splitting', () => {
      const result = determineTargetFile(
        { collection: 'globals', group: 'colors' },
        { splitBy: 'group' },
        'group',
        { colors: 'colour' },
        '/tokens'
      );

      expect(result).toBe('colour.json');
    });

    it('should return collection filename for splitBy: none', () => {
      const result = determineTargetFile(
        { collection: 'theme' },
        { splitBy: 'none', file: 'design-tokens' },
        'none',
        {},
        '/tokens'
      );

      expect(result).toBe('design-tokens.json');
    });

    it('should return null for splitBy: mode (handled separately)', () => {
      const result = determineTargetFile(
        { collection: 'theme' },
        { splitBy: 'mode' },
        'mode',
        {},
        '/tokens'
      );

      expect(result).toBeNull();
    });
  });

  describe('mergeStylesIntoTokens', () => {
    it('should merge styles into mode-split files', () => {
      // Setup processed styles with mergeInto
      const processedStyles = new Map<string, SplitStyleFile>([
        ['paint-styles.json', {
          content: { brand: { $value: '#ff0000', $type: 'color' } },
          styleType: 'paint',
          mergeInto: { collection: 'theme' },
        }],
      ]);

      // Setup filesByDir with mode-split token files
      const filesByDir = new Map<string, Map<string, any>>([
        ['/tokens', new Map([
          ['theme.light.json', { colors: { primary: { $value: '#007bff' } } }],
          ['theme.dark.json', { colors: { primary: { $value: '#0056b3' } } }],
        ])],
      ]);

      const config = {
        tokens: {
          collections: {
            theme: { splitBy: 'mode' },
          },
          splitBy: 'mode',
          dir: 'tokens',
        },
      };

      const result = mergeStylesIntoTokens(processedStyles, filesByDir, config, '/tokens');

      // Styles should be merged into both mode files
      const lightFile = filesByDir.get('/tokens')!.get('theme.light.json');
      const darkFile = filesByDir.get('/tokens')!.get('theme.dark.json');

      expect(lightFile.brand).toEqual({ $value: '#ff0000', $type: 'color' });
      expect(darkFile.brand).toEqual({ $value: '#ff0000', $type: 'color' });
      expect(result.standaloneStyleFiles).toHaveLength(0);
      expect(result.mergedCount).toBeGreaterThan(0);
    });

    it('should merge styles into group-split files with group as nested path', () => {
      // When mergeInto has a group, the content is nested under that group key
      const processedStyles = new Map<string, SplitStyleFile>([
        ['text-styles.json', {
          content: { heading: { $value: { fontFamily: 'Inter' }, $type: 'typography' } },
          styleType: 'text',
          mergeInto: { collection: 'globals', group: 'typography' },
        }],
      ]);

      const filesByDir = new Map<string, Map<string, any>>([
        ['/tokens', new Map([
          ['typography.json', { body: { $value: { fontFamily: 'System' } } }],
        ])],
      ]);

      const config = {
        tokens: {
          collections: {
            globals: { splitBy: 'group' },
          },
          splitBy: 'mode',
          dir: 'tokens',
        },
      };

      const result = mergeStylesIntoTokens(processedStyles, filesByDir, config, '/tokens');

      const typographyFile = filesByDir.get('/tokens')!.get('typography.json');
      // Content is nested under the group key 'typography'
      expect(typographyFile.typography.heading).toEqual({ $value: { fontFamily: 'Inter' }, $type: 'typography' });
      expect(result.standaloneStyleFiles).toHaveLength(0);
    });

    it('should merge at root level when no group specified', () => {
      const processedStyles = new Map<string, SplitStyleFile>([
        ['text-styles.json', {
          content: { heading: { $value: { fontFamily: 'Inter' }, $type: 'typography' } },
          styleType: 'text',
          mergeInto: { collection: 'globals' }, // No group - merge at root
        }],
      ]);

      const filesByDir = new Map<string, Map<string, any>>([
        ['/tokens', new Map([
          ['globals.json', { body: { $value: { fontFamily: 'System' } } }],
        ])],
      ]);

      const config = {
        tokens: {
          collections: {
            globals: { splitBy: 'none' },
          },
          splitBy: 'mode',
          dir: 'tokens',
        },
      };

      const result = mergeStylesIntoTokens(processedStyles, filesByDir, config, '/tokens');

      const globalsFile = filesByDir.get('/tokens')!.get('globals.json');
      // Content is merged at root level
      expect(globalsFile.heading).toEqual({ $value: { fontFamily: 'Inter' }, $type: 'typography' });
      expect(result.standaloneStyleFiles).toHaveLength(0);
    });

    it('should queue standalone files when target not found', () => {
      const processedStyles = new Map<string, SplitStyleFile>([
        ['paint-styles.json', {
          content: { brand: { $value: '#ff0000' } },
          styleType: 'paint',
          mergeInto: { collection: 'nonexistent' },
        }],
      ]);

      const filesByDir = new Map<string, Map<string, any>>([
        ['/tokens', new Map([
          ['theme.light.json', { colors: {} }],
        ])],
      ]);

      const config = {
        tokens: {
          collections: {},
          splitBy: 'mode',
          dir: 'tokens',
        },
      };

      const result = mergeStylesIntoTokens(processedStyles, filesByDir, config, '/tokens');

      expect(result.standaloneStyleFiles).toHaveLength(1);
      expect(result.standaloneStyleFiles[0].fileName).toBe('paint-styles.json');
    });

    it('should handle standalone style files without mergeInto', () => {
      const processedStyles = new Map<string, SplitStyleFile>([
        ['effect-styles.json', {
          content: { shadow: { $value: '0 2px 4px rgba(0,0,0,0.1)' } },
          styleType: 'effect',
          // No mergeInto - should be standalone
        }],
      ]);

      const filesByDir = new Map<string, Map<string, any>>([
        ['/tokens', new Map()],
      ]);

      const config = {
        tokens: {
          collections: {},
          splitBy: 'mode',
          dir: 'tokens',
        },
      };

      const result = mergeStylesIntoTokens(processedStyles, filesByDir, config, '/tokens');

      expect(result.standaloneStyleFiles).toHaveLength(1);
      expect(result.standaloneStyleFiles[0].fileName).toBe('effect-styles.json');
      expect(result.standaloneStyleFiles[0].content).toEqual({
        shadow: { $value: '0 2px 4px rgba(0,0,0,0.1)' },
      });
    });
  });
});
