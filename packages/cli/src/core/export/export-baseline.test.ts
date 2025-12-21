/**
 * Export Baseline Tests
 *
 * Tests for the export functionality modules:
 * - file-discoverer: Discovers token files based on collection configuration
 * - token-parser: Parses DTCG-format token files into flat token entries
 * - baseline-builder: Builds export baseline structure from parsed tokens
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  discoverTokenFiles,
  extractModeFromFile,
  extractGroupFromFile,
  type DiscoveredFile,
  type CollectionConfig,
} from './file-discoverer.js';
import {
  parseTokenFile,
  parseMultiModeFile,
  type ParsedToken,
} from './token-parser.js';
import {
  buildBaselineKey,
  buildBaselineEntry,
  buildExportBaseline,
  type BaselineEntry,
} from './baseline-builder.js';

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

import { readdir, readFile } from 'node:fs/promises';

describe('file-discoverer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('discoverTokenFiles', () => {
    it('should discover files for splitBy: mode', async () => {
      const collections: Record<string, CollectionConfig> = {
        theme: { dir: 'tokens/theme', splitBy: 'mode' },
      };

      vi.mocked(readdir).mockResolvedValueOnce(['light.json', 'dark.json'] as any);

      const result = await discoverTokenFiles(collections, '/project');

      expect(result.files).toHaveLength(2);
      expect(result.files[0]).toMatchObject({
        filename: 'light.json',
        collection: 'theme',
        splitBy: 'mode',
        path: '/project/tokens/theme/light.json',
      });
      expect(result.files[1]).toMatchObject({
        filename: 'dark.json',
        collection: 'theme',
        splitBy: 'mode',
        path: '/project/tokens/theme/dark.json',
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should discover files for splitBy: group', async () => {
      const collections: Record<string, CollectionConfig> = {
        globals: { dir: 'tokens/globals', splitBy: 'group' },
      };

      vi.mocked(readdir).mockResolvedValueOnce([
        'globals.colors.json',
        'globals.spacing.json',
      ] as any);

      const result = await discoverTokenFiles(collections, '/project');

      expect(result.files).toHaveLength(2);
      expect(result.files[0]).toMatchObject({
        filename: 'globals.colors.json',
        collection: 'globals',
        splitBy: 'group',
      });
      expect(result.files[1]).toMatchObject({
        filename: 'globals.spacing.json',
        collection: 'globals',
        splitBy: 'group',
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should discover files for splitBy: none', async () => {
      const collections: Record<string, CollectionConfig> = {
        brand: { dir: 'tokens/brand', splitBy: 'none' },
      };

      vi.mocked(readdir).mockResolvedValueOnce(['brand.json'] as any);

      const result = await discoverTokenFiles(collections, '/project');

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toMatchObject({
        filename: 'brand.json',
        collection: 'brand',
        splitBy: 'none',
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should default to collection name if dir not specified', async () => {
      const collections: Record<string, CollectionConfig> = {
        theme: { splitBy: 'mode' },
      };

      vi.mocked(readdir).mockResolvedValueOnce(['light.json'] as any);

      const result = await discoverTokenFiles(collections, '/project');

      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('/project/theme/light.json');
      expect(result.errors).toHaveLength(0);
    });

    it('should default splitBy to "none" if not specified', async () => {
      const collections: Record<string, CollectionConfig> = {
        theme: { dir: 'tokens' },
      };

      vi.mocked(readdir).mockResolvedValueOnce(['theme.json'] as any);

      const result = await discoverTokenFiles(collections, '/project');

      expect(result.files).toHaveLength(1);
      expect(result.files[0].splitBy).toBe('none');
    });

    it('should filter out non-JSON files', async () => {
      const collections: Record<string, CollectionConfig> = {
        theme: { dir: 'tokens' },
      };

      vi.mocked(readdir).mockResolvedValueOnce([
        'theme.json',
        'README.md',
        'theme.ts',
        '.DS_Store',
      ] as any);

      const result = await discoverTokenFiles(collections, '/project');

      expect(result.files).toHaveLength(1);
      expect(result.files[0].filename).toBe('theme.json');
    });

    it('should handle missing directories', async () => {
      const collections: Record<string, CollectionConfig> = {
        theme: { dir: 'tokens/missing' },
      };

      vi.mocked(readdir).mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

      const result = await discoverTokenFiles(collections, '/project');

      expect(result.files).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Cannot read directory');
      expect(result.errors[0]).toContain('tokens/missing');
    });

    it('should add error when no JSON files found', async () => {
      const collections: Record<string, CollectionConfig> = {
        theme: { dir: 'tokens/empty' },
      };

      vi.mocked(readdir).mockResolvedValueOnce(['README.md', '.gitkeep'] as any);

      const result = await discoverTokenFiles(collections, '/project');

      expect(result.files).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('No JSON files found');
    });

    it('should discover files from multiple collections', async () => {
      const collections: Record<string, CollectionConfig> = {
        theme: { dir: 'tokens/theme', splitBy: 'mode' },
        globals: { dir: 'tokens/globals', splitBy: 'group' },
      };

      vi.mocked(readdir)
        .mockResolvedValueOnce(['light.json', 'dark.json'] as any)
        .mockResolvedValueOnce(['globals.colors.json'] as any);

      const result = await discoverTokenFiles(collections, '/project');

      expect(result.files).toHaveLength(3);
      expect(result.files.filter(f => f.collection === 'theme')).toHaveLength(2);
      expect(result.files.filter(f => f.collection === 'globals')).toHaveLength(1);
    });
  });

  describe('extractModeFromFile', () => {
    it('should extract mode from filename for splitBy: mode', () => {
      const file: DiscoveredFile = {
        path: '/project/tokens/theme.light.json',
        filename: 'theme.light.json',
        collection: 'theme',
        splitBy: 'mode',
      };

      const mode = extractModeFromFile(file);

      expect(mode).toBe('light');
    });

    it('should extract mode from multi-part filename', () => {
      const file: DiscoveredFile = {
        path: '/project/tokens/brand.tokens.dark.json',
        filename: 'brand.tokens.dark.json',
        collection: 'brand',
        splitBy: 'mode',
      };

      const mode = extractModeFromFile(file);

      expect(mode).toBe('dark');
    });

    it('should use filename without extension if no dots', () => {
      const file: DiscoveredFile = {
        path: '/project/tokens/light.json',
        filename: 'light.json',
        collection: 'theme',
        splitBy: 'mode',
      };

      const mode = extractModeFromFile(file);

      expect(mode).toBe('light');
    });

    it('should return default mode for splitBy: none', () => {
      const file: DiscoveredFile = {
        path: '/project/tokens/theme.json',
        filename: 'theme.json',
        collection: 'theme',
        splitBy: 'none',
      };

      const mode = extractModeFromFile(file);

      expect(mode).toBe('value');
    });

    it('should return default mode for splitBy: group', () => {
      const file: DiscoveredFile = {
        path: '/project/tokens/globals.colors.json',
        filename: 'globals.colors.json',
        collection: 'globals',
        splitBy: 'group',
      };

      const mode = extractModeFromFile(file);

      expect(mode).toBe('value');
    });

    it('should use custom default mode when provided', () => {
      const file: DiscoveredFile = {
        path: '/project/tokens/theme.json',
        filename: 'theme.json',
        collection: 'theme',
        splitBy: 'none',
      };

      const mode = extractModeFromFile(file, 'default');

      expect(mode).toBe('default');
    });
  });

  describe('extractGroupFromFile', () => {
    it('should extract group from filename for splitBy: group', () => {
      const file: DiscoveredFile = {
        path: '/project/tokens/globals.colors.json',
        filename: 'globals.colors.json',
        collection: 'globals',
        splitBy: 'group',
      };

      const group = extractGroupFromFile(file);

      expect(group).toBe('colors');
    });

    it('should extract group from multi-part filename', () => {
      const file: DiscoveredFile = {
        path: '/project/tokens/design.tokens.spacing.json',
        filename: 'design.tokens.spacing.json',
        collection: 'design',
        splitBy: 'group',
      };

      const group = extractGroupFromFile(file);

      expect(group).toBe('spacing');
    });

    it('should return filename without extension if no dots', () => {
      const file: DiscoveredFile = {
        path: '/project/tokens/colors.json',
        filename: 'colors.json',
        collection: 'globals',
        splitBy: 'group',
      };

      const group = extractGroupFromFile(file);

      expect(group).toBe('colors');
    });

    it('should return null for splitBy: mode', () => {
      const file: DiscoveredFile = {
        path: '/project/tokens/theme.light.json',
        filename: 'theme.light.json',
        collection: 'theme',
        splitBy: 'mode',
      };

      const group = extractGroupFromFile(file);

      expect(group).toBe(null);
    });

    it('should return null for splitBy: none', () => {
      const file: DiscoveredFile = {
        path: '/project/tokens/theme.json',
        filename: 'theme.json',
        collection: 'theme',
        splitBy: 'none',
      };

      const group = extractGroupFromFile(file);

      expect(group).toBe(null);
    });
  });
});

describe('token-parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseTokenFile', () => {
    it('should parse simple tokens', async () => {
      const fileContent = JSON.stringify({
        colors: {
          primary: {
            $type: 'color',
            $value: '#0066cc',
          },
        },
      });

      vi.mocked(readFile).mockResolvedValueOnce(fileContent);

      const result = await parseTokenFile('/path/to/theme.json');

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]).toMatchObject({
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should parse nested token groups', async () => {
      const fileContent = JSON.stringify({
        colors: {
          brand: {
            primary: {
              $type: 'color',
              $value: '#0066cc',
            },
            secondary: {
              $type: 'color',
              $value: '#6c757d',
            },
          },
        },
        spacing: {
          base: {
            $type: 'dimension',
            $value: '8px',
          },
        },
      });

      vi.mocked(readFile).mockResolvedValueOnce(fileContent);

      const result = await parseTokenFile('/path/to/tokens.json');

      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].path).toBe('colors.brand.primary');
      expect(result.tokens[1].path).toBe('colors.brand.secondary');
      expect(result.tokens[2].path).toBe('spacing.base');
    });

    it('should extract variableId from extensions', async () => {
      const fileContent = JSON.stringify({
        colors: {
          primary: {
            $type: 'color',
            $value: '#0066cc',
            $extensions: {
              'com.figma': {
                variableId: 'VariableID:1:31',
              },
            },
          },
        },
      });

      vi.mocked(readFile).mockResolvedValueOnce(fileContent);

      const result = await parseTokenFile('/path/to/theme.json');

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].variableId).toBe('VariableID:1:31');
    });

    it('should extract scopes from extensions', async () => {
      const fileContent = JSON.stringify({
        colors: {
          primary: {
            $type: 'color',
            $value: '#0066cc',
            $extensions: {
              'com.figma': {
                variableId: 'VariableID:1:31',
                scopes: ['ALL_SCOPES'],
              },
            },
          },
        },
      });

      vi.mocked(readFile).mockResolvedValueOnce(fileContent);

      const result = await parseTokenFile('/path/to/theme.json');

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].scopes).toEqual(['ALL_SCOPES']);
    });

    it('should extract description', async () => {
      const fileContent = JSON.stringify({
        colors: {
          primary: {
            $type: 'color',
            $value: '#0066cc',
            $description: 'Primary brand color',
          },
        },
      });

      vi.mocked(readFile).mockResolvedValueOnce(fileContent);

      const result = await parseTokenFile('/path/to/theme.json');

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].description).toBe('Primary brand color');
    });

    it('should skip $-prefixed properties', async () => {
      const fileContent = JSON.stringify({
        $schema: 'https://example.com/schema.json',
        colors: {
          primary: {
            $type: 'color',
            $value: '#0066cc',
          },
        },
      });

      vi.mocked(readFile).mockResolvedValueOnce(fileContent);

      const result = await parseTokenFile('/path/to/theme.json');

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].path).toBe('colors.primary');
    });

    it('should handle empty file', async () => {
      const fileContent = JSON.stringify({});

      vi.mocked(readFile).mockResolvedValueOnce(fileContent);

      const result = await parseTokenFile('/path/to/empty.json');

      expect(result.tokens).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse multiple token types', async () => {
      const fileContent = JSON.stringify({
        colors: {
          primary: { $type: 'color', $value: '#0066cc' },
        },
        spacing: {
          base: { $type: 'dimension', $value: '8px' },
        },
        typography: {
          heading: { $type: 'fontFamily', $value: 'Inter' },
        },
      });

      vi.mocked(readFile).mockResolvedValueOnce(fileContent);

      const result = await parseTokenFile('/path/to/tokens.json');

      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].type).toBe('color');
      expect(result.tokens[1].type).toBe('dimension');
      expect(result.tokens[2].type).toBe('fontFamily');
    });
  });

  describe('parseMultiModeFile', () => {
    it('should handle multi-mode structure', () => {
      const json = {
        light: {
          colors: {
            primary: { $type: 'color', $value: '#ffffff' },
          },
        },
        dark: {
          colors: {
            primary: { $type: 'color', $value: '#000000' },
          },
        },
      };

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(2);
      expect(result.has('light')).toBe(true);
      expect(result.has('dark')).toBe(true);
      expect(result.get('light')).toHaveLength(1);
      expect(result.get('dark')).toHaveLength(1);
      expect(result.get('light')![0].value).toBe('#ffffff');
      expect(result.get('dark')![0].value).toBe('#000000');
    });

    it('should skip $-prefixed properties', () => {
      const json = {
        $schema: 'https://example.com/schema.json',
        light: {
          colors: {
            primary: { $type: 'color', $value: '#ffffff' },
          },
        },
      };

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(1);
      expect(result.has('light')).toBe(true);
      expect(result.has('$schema')).toBe(false);
    });

    it('should skip top-level tokens', () => {
      const json = {
        topLevel: { $type: 'color', $value: '#000000' },
        light: {
          colors: {
            primary: { $type: 'color', $value: '#ffffff' },
          },
        },
      };

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(1);
      expect(result.has('light')).toBe(true);
      expect(result.has('topLevel')).toBe(false);
    });

    it('should handle modes with multiple tokens', () => {
      const json = {
        light: {
          colors: {
            primary: { $type: 'color', $value: '#ffffff' },
            secondary: { $type: 'color', $value: '#cccccc' },
          },
          spacing: {
            base: { $type: 'dimension', $value: '8px' },
          },
        },
      };

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(1);
      expect(result.get('light')).toHaveLength(3);
    });

    it('should skip modes with no tokens', () => {
      const json = {
        light: {
          colors: {
            primary: { $type: 'color', $value: '#ffffff' },
          },
        },
        empty: {},
      };

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(1);
      expect(result.has('light')).toBe(true);
      expect(result.has('empty')).toBe(false);
    });

    it('should handle empty input', () => {
      const json = {};

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(0);
    });
  });
});

describe('baseline-builder', () => {
  describe('buildBaselineKey', () => {
    it('should build correct baseline key without variableId', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
      };

      const key = buildBaselineKey(token, 'theme', 'light');

      expect(key).toBe('colors.primary:theme.light');
    });

    it('should build correct baseline key with variableId', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
        variableId: 'VariableID:1:31',
      };

      const key = buildBaselineKey(token, 'theme', 'light');

      expect(key).toBe('VariableID:1:31:theme.light');
    });

    it('should prefer variableId over path when both present', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
        variableId: 'VariableID:1:31',
      };

      const key = buildBaselineKey(token, 'theme', 'dark');

      expect(key).toContain('VariableID:1:31');
      expect(key).not.toContain('colors.primary');
    });

    it('should include collection and mode in suffix', () => {
      const token: ParsedToken = {
        path: 'spacing.base',
        value: '8px',
        type: 'dimension',
      };

      const key = buildBaselineKey(token, 'globals', 'default');

      expect(key).toBe('spacing.base:globals.default');
    });
  });

  describe('buildBaselineEntry', () => {
    it('should build entry with required fields', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry).toMatchObject({
        collection: 'theme',
        mode: 'light',
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
      });
    });

    it('should include variableId when present', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
        variableId: 'VariableID:1:31',
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry.variableId).toBe('VariableID:1:31');
    });

    it('should include description when present', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
        description: 'Primary brand color',
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry.description).toBe('Primary brand color');
    });

    it('should include scopes when present', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
        scopes: ['ALL_SCOPES'],
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry.scopes).toEqual(['ALL_SCOPES']);
    });

    it('should not include scopes when empty array', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
        scopes: [],
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry.scopes).toBeUndefined();
    });

    it('should include all optional fields when present', () => {
      const token: ParsedToken = {
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
        variableId: 'VariableID:1:31',
        description: 'Primary brand color',
        scopes: ['ALL_SCOPES', 'FRAME_FILL'],
      };

      const entry = buildBaselineEntry(token, 'theme', 'light');

      expect(entry).toMatchObject({
        collection: 'theme',
        mode: 'light',
        path: 'colors.primary',
        value: '#0066cc',
        type: 'color',
        variableId: 'VariableID:1:31',
        description: 'Primary brand color',
        scopes: ['ALL_SCOPES', 'FRAME_FILL'],
      });
    });
  });

  describe('buildExportBaseline', () => {
    const createDiscoveredFile = (overrides?: Partial<DiscoveredFile>): DiscoveredFile => ({
      path: '/project/tokens/theme.light.json',
      filename: 'theme.light.json',
      collection: 'theme',
      splitBy: 'mode',
      ...overrides,
    });

    it('should build baseline from single file', () => {
      const parsedFiles = [
        {
          file: createDiscoveredFile(),
          tokens: [
            {
              path: 'colors.primary',
              value: '#0066cc',
              type: 'color',
            },
          ],
          mode: 'light',
        },
      ];

      const result = buildExportBaseline(parsedFiles);

      expect(Object.keys(result.baseline)).toHaveLength(1);
      expect(result.baseline['colors.primary:theme.light']).toBeDefined();
      expect(result.metadata.source).toBe('export');
      expect(result.metadata.syncedAt).toBeDefined();
    });

    it('should build baseline from multiple files', () => {
      const parsedFiles = [
        {
          file: createDiscoveredFile({ filename: 'theme.light.json' }),
          tokens: [
            { path: 'colors.primary', value: '#ffffff', type: 'color' },
          ],
          mode: 'light',
        },
        {
          file: createDiscoveredFile({ filename: 'theme.dark.json' }),
          tokens: [
            { path: 'colors.primary', value: '#000000', type: 'color' },
          ],
          mode: 'dark',
        },
      ];

      const result = buildExportBaseline(parsedFiles);

      expect(Object.keys(result.baseline)).toHaveLength(2);
      expect(result.baseline['colors.primary:theme.light']).toBeDefined();
      expect(result.baseline['colors.primary:theme.dark']).toBeDefined();
    });

    it('should build baseline with variableIds', () => {
      const parsedFiles = [
        {
          file: createDiscoveredFile(),
          tokens: [
            {
              path: 'colors.primary',
              value: '#0066cc',
              type: 'color',
              variableId: 'VariableID:1:31',
            },
          ],
          mode: 'light',
        },
      ];

      const result = buildExportBaseline(parsedFiles);

      expect(result.baseline['VariableID:1:31:theme.light']).toBeDefined();
      expect(result.baseline['VariableID:1:31:theme.light'].variableId).toBe('VariableID:1:31');
    });

    it('should detect duplicate tokens with same path', () => {
      const parsedFiles = [
        {
          file: createDiscoveredFile(),
          tokens: [
            { path: 'colors.primary', value: '#0066cc', type: 'color' },
            { path: 'colors.primary', value: '#ff0000', type: 'color' },
          ],
          mode: 'light',
        },
      ];

      expect(() => buildExportBaseline(parsedFiles)).toThrow('Duplicate token');
      expect(() => buildExportBaseline(parsedFiles)).toThrow('colors.primary');
      expect(() => buildExportBaseline(parsedFiles)).toThrow('theme');
      expect(() => buildExportBaseline(parsedFiles)).toThrow('light');
    });

    it('should allow same path in different modes', () => {
      const parsedFiles = [
        {
          file: createDiscoveredFile(),
          tokens: [
            { path: 'colors.primary', value: '#ffffff', type: 'color' },
          ],
          mode: 'light',
        },
        {
          file: createDiscoveredFile(),
          tokens: [
            { path: 'colors.primary', value: '#000000', type: 'color' },
          ],
          mode: 'dark',
        },
      ];

      expect(() => buildExportBaseline(parsedFiles)).not.toThrow();
    });

    it('should allow same path in different collections', () => {
      const parsedFiles = [
        {
          file: createDiscoveredFile({ collection: 'theme' }),
          tokens: [
            { path: 'colors.primary', value: '#0066cc', type: 'color' },
          ],
          mode: 'light',
        },
        {
          file: createDiscoveredFile({ collection: 'globals' }),
          tokens: [
            { path: 'colors.primary', value: '#ff0000', type: 'color' },
          ],
          mode: 'light',
        },
      ];

      expect(() => buildExportBaseline(parsedFiles)).not.toThrow();
      const result = buildExportBaseline(parsedFiles);
      expect(Object.keys(result.baseline)).toHaveLength(2);
    });

    it('should create valid ISO timestamp', () => {
      const before = new Date().toISOString();
      const result = buildExportBaseline([]);
      const after = new Date().toISOString();

      expect(result.metadata.syncedAt >= before).toBe(true);
      expect(result.metadata.syncedAt <= after).toBe(true);
      expect(new Date(result.metadata.syncedAt).getTime()).not.toBeNaN();
    });

    it('should handle multiple tokens from same file', () => {
      const parsedFiles = [
        {
          file: createDiscoveredFile(),
          tokens: [
            { path: 'colors.primary', value: '#0066cc', type: 'color' },
            { path: 'colors.secondary', value: '#6c757d', type: 'color' },
            { path: 'spacing.base', value: '8px', type: 'dimension' },
          ],
          mode: 'light',
        },
      ];

      const result = buildExportBaseline(parsedFiles);

      expect(Object.keys(result.baseline)).toHaveLength(3);
    });

    it('should preserve optional fields in baseline entries', () => {
      const parsedFiles = [
        {
          file: createDiscoveredFile(),
          tokens: [
            {
              path: 'colors.primary',
              value: '#0066cc',
              type: 'color',
              variableId: 'VariableID:1:31',
              description: 'Primary brand color',
              scopes: ['ALL_SCOPES'],
            },
          ],
          mode: 'light',
        },
      ];

      const result = buildExportBaseline(parsedFiles);
      const entry = result.baseline['VariableID:1:31:theme.light'];

      expect(entry.description).toBe('Primary brand color');
      expect(entry.scopes).toEqual(['ALL_SCOPES']);
    });

    it('should handle empty token list', () => {
      const parsedFiles = [
        {
          file: createDiscoveredFile(),
          tokens: [],
          mode: 'light',
        },
      ];

      const result = buildExportBaseline(parsedFiles);

      expect(Object.keys(result.baseline)).toHaveLength(0);
      expect(result.metadata.source).toBe('export');
    });
  });
});
