import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  discoverTokenFiles,
  extractModeFromFile,
  extractGroupFromFile,
  type DiscoveredFile,
  type CollectionConfig,
} from './file-discoverer.js';

const TEST_DIR = 'test-temp-file-discoverer';

describe('file-discoverer', () => {
  const originalCwd = process.cwd();

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('discoverTokenFiles', () => {
    it('should discover JSON files in collection directories', async () => {
      // Create collection directories with token files
      mkdirSync('tokens/theme', { recursive: true });
      writeFileSync('tokens/theme/light.json', '{}');
      writeFileSync('tokens/theme/dark.json', '{}');

      const collections: Record<string, CollectionConfig> = {
        theme: { dir: 'tokens/theme', splitBy: 'mode' },
      };

      const result = await discoverTokenFiles(collections, process.cwd());

      expect(result.files).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.files.map(f => f.filename).sort()).toEqual(['dark.json', 'light.json']);
    });

    it('should use collection name as directory when dir not specified', async () => {
      mkdirSync('primitives', { recursive: true });
      writeFileSync('primitives/colors.json', '{}');

      const collections: Record<string, CollectionConfig> = {
        primitives: { splitBy: 'group' },
      };

      const result = await discoverTokenFiles(collections, process.cwd());

      expect(result.files).toHaveLength(1);
      expect(result.files[0].collection).toBe('primitives');
      expect(result.files[0].filename).toBe('colors.json');
    });

    it('should include collection metadata in discovered files', async () => {
      mkdirSync('tokens/theme', { recursive: true });
      writeFileSync('tokens/theme/light.json', '{}');

      const collections: Record<string, CollectionConfig> = {
        theme: { dir: 'tokens/theme', splitBy: 'mode' },
      };

      const result = await discoverTokenFiles(collections, process.cwd());

      expect(result.files[0]).toMatchObject({
        collection: 'theme',
        splitBy: 'mode',
        filename: 'light.json',
      });
      expect(result.files[0].path).toContain('tokens/theme/light.json');
    });

    it('should default splitBy to none when not specified', async () => {
      mkdirSync('base', { recursive: true });
      writeFileSync('base/tokens.json', '{}');

      const collections: Record<string, CollectionConfig> = {
        base: {},
      };

      const result = await discoverTokenFiles(collections, process.cwd());

      expect(result.files[0].splitBy).toBe('none');
    });

    it('should report error when directory does not exist', async () => {
      const collections: Record<string, CollectionConfig> = {
        missing: { dir: 'nonexistent/path' },
      };

      const result = await discoverTokenFiles(collections, process.cwd());

      expect(result.files).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Cannot read directory');
    });

    it('should report error when directory has no JSON files', async () => {
      mkdirSync('empty', { recursive: true });
      writeFileSync('empty/readme.txt', 'not a json file');

      const collections: Record<string, CollectionConfig> = {
        empty: { dir: 'empty' },
      };

      const result = await discoverTokenFiles(collections, process.cwd());

      expect(result.files).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('No JSON files found');
    });

    it('should discover files from multiple collections', async () => {
      mkdirSync('tokens/theme', { recursive: true });
      mkdirSync('tokens/primitives', { recursive: true });
      writeFileSync('tokens/theme/light.json', '{}');
      writeFileSync('tokens/theme/dark.json', '{}');
      writeFileSync('tokens/primitives/colors.json', '{}');
      writeFileSync('tokens/primitives/spacing.json', '{}');

      const collections: Record<string, CollectionConfig> = {
        theme: { dir: 'tokens/theme', splitBy: 'mode' },
        primitives: { dir: 'tokens/primitives', splitBy: 'group' },
      };

      const result = await discoverTokenFiles(collections, process.cwd());

      expect(result.files).toHaveLength(4);
      expect(result.errors).toHaveLength(0);

      const themeFiles = result.files.filter(f => f.collection === 'theme');
      const primFiles = result.files.filter(f => f.collection === 'primitives');

      expect(themeFiles).toHaveLength(2);
      expect(primFiles).toHaveLength(2);
      expect(themeFiles[0].splitBy).toBe('mode');
      expect(primFiles[0].splitBy).toBe('group');
    });

    it('should only include .json files', async () => {
      mkdirSync('tokens', { recursive: true });
      writeFileSync('tokens/theme.json', '{}');
      writeFileSync('tokens/theme.json.bak', '{}');
      writeFileSync('tokens/README.md', '# Tokens');
      writeFileSync('tokens/.DS_Store', '');

      const collections: Record<string, CollectionConfig> = {
        tokens: { dir: 'tokens' },
      };

      const result = await discoverTokenFiles(collections, process.cwd());

      expect(result.files).toHaveLength(1);
      expect(result.files[0].filename).toBe('theme.json');
    });

    it('should handle empty collections config', async () => {
      const collections: Record<string, CollectionConfig> = {};

      const result = await discoverTokenFiles(collections, process.cwd());

      expect(result.files).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('extractModeFromFile', () => {
    it('should extract mode from filename when splitBy is mode', () => {
      const file: DiscoveredFile = {
        path: '/path/to/theme.light.json',
        filename: 'theme.light.json',
        collection: 'theme',
        splitBy: 'mode',
      };

      const mode = extractModeFromFile(file);

      expect(mode).toBe('light');
    });

    it('should extract mode from compound filename', () => {
      const file: DiscoveredFile = {
        path: '/path/to/collection.mode.json',
        filename: 'brand.light-mode.json',
        collection: 'brand',
        splitBy: 'mode',
      };

      const mode = extractModeFromFile(file);

      expect(mode).toBe('light-mode');
    });

    it('should return default mode when splitBy is not mode', () => {
      const file: DiscoveredFile = {
        path: '/path/to/tokens.json',
        filename: 'tokens.json',
        collection: 'base',
        splitBy: 'none',
      };

      const mode = extractModeFromFile(file);

      expect(mode).toBe('value');
    });

    it('should return custom default mode', () => {
      const file: DiscoveredFile = {
        path: '/path/to/tokens.json',
        filename: 'tokens.json',
        collection: 'base',
        splitBy: 'group',
      };

      const mode = extractModeFromFile(file, 'default');

      expect(mode).toBe('default');
    });

    it('should handle single-part filename when splitBy is mode', () => {
      const file: DiscoveredFile = {
        path: '/path/to/light.json',
        filename: 'light.json',
        collection: 'theme',
        splitBy: 'mode',
      };

      const mode = extractModeFromFile(file);

      expect(mode).toBe('light');
    });
  });

  describe('extractGroupFromFile', () => {
    it('should extract group from filename when splitBy is group', () => {
      const file: DiscoveredFile = {
        path: '/path/to/primitives.colors.json',
        filename: 'primitives.colors.json',
        collection: 'primitives',
        splitBy: 'group',
      };

      const group = extractGroupFromFile(file);

      expect(group).toBe('colors');
    });

    it('should return null when splitBy is not group', () => {
      const file: DiscoveredFile = {
        path: '/path/to/theme.light.json',
        filename: 'theme.light.json',
        collection: 'theme',
        splitBy: 'mode',
      };

      const group = extractGroupFromFile(file);

      expect(group).toBeNull();
    });

    it('should return null when splitBy is none', () => {
      const file: DiscoveredFile = {
        path: '/path/to/tokens.json',
        filename: 'tokens.json',
        collection: 'base',
        splitBy: 'none',
      };

      const group = extractGroupFromFile(file);

      expect(group).toBeNull();
    });

    it('should handle single-part filename when splitBy is group', () => {
      const file: DiscoveredFile = {
        path: '/path/to/colors.json',
        filename: 'colors.json',
        collection: 'primitives',
        splitBy: 'group',
      };

      const group = extractGroupFromFile(file);

      expect(group).toBe('colors');
    });

    it('should extract last part of multi-part filename', () => {
      const file: DiscoveredFile = {
        path: '/path/to/globals.colors.brand.json',
        filename: 'globals.colors.brand.json',
        collection: 'globals',
        splitBy: 'group',
      };

      const group = extractGroupFromFile(file);

      expect(group).toBe('brand');
    });
  });
});
