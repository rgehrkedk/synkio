/**
 * File Generator Module Tests
 *
 * Tests for output file generation utilities in the import module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildSplitOptions, buildFilesByDirectory, formatExtrasString } from './file-generator.js';
import type { Config } from '../config.js';

describe('file-generator', () => {
  describe('buildSplitOptions', () => {
    it('should use config collections when provided', () => {
      const config = {
        tokens: {
          dir: 'tokens',
          collections: {
            theme: { splitBy: 'mode' as const },
            globals: { splitBy: 'none' as const },
          },
          dtcg: true,
        },
      } as Config;

      const result = buildSplitOptions(config);

      expect(result.collections).toEqual({
        theme: { splitBy: 'mode' },
        globals: { splitBy: 'none' },
      });
      expect(result.dtcg).toBe(true);
    });

    it('should default dtcg to true when not specified', () => {
      const config = {
        tokens: {
          dir: 'tokens',
        },
      } as Config;

      const result = buildSplitOptions(config);

      expect(result.dtcg).toBe(true);
    });

    it('should explicitly set dtcg to false when configured', () => {
      const config = {
        tokens: {
          dir: 'tokens',
          dtcg: false,
        },
      } as Config;

      const result = buildSplitOptions(config);

      expect(result.dtcg).toBe(false);
    });

    it('should set includeVariableId only when explicitly true', () => {
      const configTrue = {
        tokens: { dir: 'tokens', includeVariableId: true },
      } as Config;

      const configFalse = {
        tokens: { dir: 'tokens', includeVariableId: false },
      } as Config;

      const configUndefined = {
        tokens: { dir: 'tokens' },
      } as Config;

      expect(buildSplitOptions(configTrue).includeVariableId).toBe(true);
      expect(buildSplitOptions(configFalse).includeVariableId).toBe(false);
      expect(buildSplitOptions(configUndefined).includeVariableId).toBe(false);
    });

    it('should pass through extensions config', () => {
      const config = {
        tokens: {
          dir: 'tokens',
          extensions: {
            description: true,
            scopes: false,
            codeSyntax: true,
          },
        },
      } as Config;

      const result = buildSplitOptions(config);

      expect(result.extensions).toEqual({
        description: true,
        scopes: false,
        codeSyntax: true,
      });
    });

    it('should pass through splitBy and includeMode', () => {
      const config = {
        tokens: {
          dir: 'tokens',
          splitBy: 'group' as const,
          includeMode: true,
        },
      } as Config;

      const result = buildSplitOptions(config);

      expect(result.splitBy).toBe('group');
      expect(result.includeMode).toBe(true);
    });
  });

  describe('buildFilesByDirectory', () => {
    it('should group files by default directory', () => {
      const processedTokens = new Map([
        ['theme.light.json', { content: { colors: {} } }],
        ['theme.dark.json', { content: { colors: {} } }],
      ]);

      const result = buildFilesByDirectory(processedTokens, '/project/tokens');

      expect(result.size).toBe(1);
      expect(result.has('/project/tokens')).toBe(true);
      expect(result.get('/project/tokens')!.size).toBe(2);
    });

    it('should separate files with custom directories', () => {
      const processedTokens = new Map([
        ['theme.light.json', { content: { colors: {} }, dir: '/project/custom' }],
        ['globals.json', { content: { spacing: {} } }],
      ]);

      const result = buildFilesByDirectory(processedTokens, '/project/tokens');

      expect(result.size).toBe(2);
      expect(result.has('/project/tokens')).toBe(true);
      expect(result.has('/project/custom')).toBe(true);
    });

    it('should extract content from file data', () => {
      const processedTokens = new Map([
        ['theme.json', { content: { colors: { primary: '#007bff' } } }],
      ]);

      const result = buildFilesByDirectory(processedTokens, '/project/tokens');
      const files = result.get('/project/tokens')!;

      expect(files.get('theme.json')).toEqual({ colors: { primary: '#007bff' } });
    });
  });

  describe('formatExtrasString', () => {
    it('should return empty string when no extras', () => {
      expect(formatExtrasString(0, 0)).toBe('');
    });

    it('should format CSS count only', () => {
      expect(formatExtrasString(2, 0)).toBe(' (+ 2 CSS)');
    });

    it('should format docs only', () => {
      expect(formatExtrasString(0, 5)).toBe(' (+ docs)');
    });

    it('should format both CSS and docs', () => {
      expect(formatExtrasString(3, 1)).toBe(' (+ 3 CSS, docs)');
    });

    it('should handle single CSS file', () => {
      expect(formatExtrasString(1, 0)).toBe(' (+ 1 CSS)');
    });
  });
});
