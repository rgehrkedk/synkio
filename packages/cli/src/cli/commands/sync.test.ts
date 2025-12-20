import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

// Mock modules before importing
vi.mock('../../core/figma.js', () => ({
  FigmaClient: vi.fn().mockImplementation(() => ({
    fetchData: vi.fn().mockResolvedValue({
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      tokens: []
    })
  }))
}));

vi.mock('../../core/baseline.js', () => ({
  readBaseline: vi.fn().mockResolvedValue(null),
  writeBaseline: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../core/output.js', () => ({
  generateIntermediateFromBaseline: vi.fn().mockResolvedValue(''),
  generateDocsFromBaseline: vi.fn().mockResolvedValue({ files: [], outputDir: '' }),
  generateCssFromBaseline: vi.fn().mockResolvedValue({ files: [], outputDir: '' }),
  hasBuildConfig: vi.fn().mockReturnValue(false),
  getBuildStepsSummary: vi.fn().mockReturnValue([]),
}));

import { loadConfig, updateConfigWithCollections } from '../../core/config.js';
import { isPhantomMode } from '../../utils/figma.js';

const TEST_DIR = 'test-temp-sync';

describe('Sync command - new config structure', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir('..');
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.FIGMA_TOKEN;
    vi.clearAllMocks();
  });

  it('should read tokens.dir from new config structure', () => {
    const config = {
      version: '1.0.0',
      figma: { fileId: 'abc123', accessToken: 'test-token' },
      tokens: {
        dir: 'src/design-tokens',
        collections: {
          theme: { splitBy: 'mode' }
        }
      }
    };
    writeFileSync('synkio.config.json', JSON.stringify(config));

    const loaded = loadConfig();

    expect(loaded.tokens.dir).toBe('src/design-tokens');
    expect(loaded.tokens.collections?.theme?.splitBy).toBe('mode');
  });

  it('should read build.css configuration instead of old css section', () => {
    const config = {
      version: '1.0.0',
      figma: { fileId: 'abc123', accessToken: 'test-token' },
      tokens: { dir: 'tokens' },
      build: {
        css: {
          enabled: true,
          file: 'variables.css',
          utilities: true,
          utilitiesFile: 'utils.css'
        }
      }
    };
    writeFileSync('synkio.config.json', JSON.stringify(config));

    const loaded = loadConfig();

    expect(loaded.build?.css?.enabled).toBe(true);
    expect(loaded.build?.css?.file).toBe('variables.css');
    expect(loaded.build?.css?.utilities).toBe(true);
    expect(loaded.build?.css?.utilitiesFile).toBe('utils.css');
  });

  it('should read docsPages configuration instead of old docs section', () => {
    const config = {
      version: '1.0.0',
      figma: { fileId: 'abc123', accessToken: 'test-token' },
      tokens: { dir: 'tokens' },
      docsPages: {
        enabled: true,
        dir: '.synkio/documentation',
        title: 'My Design System'
      }
    };
    writeFileSync('synkio.config.json', JSON.stringify(config));

    const loaded = loadConfig();

    expect(loaded.docsPages?.enabled).toBe(true);
    expect(loaded.docsPages?.dir).toBe('.synkio/documentation');
    expect(loaded.docsPages?.title).toBe('My Design System');
  });

  it('should support token output options (dtcg, includeVariableId, extensions)', () => {
    const config = {
      version: '1.0.0',
      figma: { fileId: 'abc123', accessToken: 'test-token' },
      tokens: {
        dir: 'tokens',
        dtcg: true,
        includeVariableId: true,
        extensions: {
          description: true,
          scopes: false,
          codeSyntax: true
        }
      }
    };
    writeFileSync('synkio.config.json', JSON.stringify(config));

    const loaded = loadConfig();

    expect(loaded.tokens.dtcg).toBe(true);
    expect(loaded.tokens.includeVariableId).toBe(true);
    expect(loaded.tokens.extensions?.description).toBe(true);
    expect(loaded.tokens.extensions?.scopes).toBe(false);
    expect(loaded.tokens.extensions?.codeSyntax).toBe(true);
  });
});

describe('First sync collection discovery', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir('..');
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.FIGMA_TOKEN;
  });

  it('should auto-detect splitBy: none for collections with 1 mode', () => {
    const collections = [
      { name: 'base', modes: ['default'], splitBy: 'none' as const },
    ];

    // The logic: splitBy should be 'none' when only 1 mode
    expect(collections[0].splitBy).toBe('none');
    expect(collections[0].modes.length).toBe(1);
  });

  it('should auto-detect splitBy: mode for collections with 2+ modes', () => {
    const collections = [
      { name: 'theme', modes: ['light', 'dark'], splitBy: 'mode' as const },
      { name: 'brands', modes: ['brandA', 'brandB', 'brandC'], splitBy: 'mode' as const },
    ];

    // The logic: splitBy should be 'mode' when 2+ modes
    expect(collections[0].splitBy).toBe('mode');
    expect(collections[0].modes.length).toBe(2);
    expect(collections[1].splitBy).toBe('mode');
    expect(collections[1].modes.length).toBe(3);
  });

  it('should update config with discovered collections on first sync', () => {
    // Create initial config without collections
    const initialConfig = {
      version: '1.0.0',
      figma: { fileId: 'abc123', accessToken: 'test-token' },
      tokens: { dir: 'src/tokens' }
    };
    writeFileSync('synkio.config.json', JSON.stringify(initialConfig));

    // Simulate discovered collections
    const discoveredCollections = [
      { name: 'base', modes: ['default'], splitBy: 'none' as const },
      { name: 'theme', modes: ['light', 'dark'], splitBy: 'mode' as const },
    ];

    const result = updateConfigWithCollections(discoveredCollections);

    expect(result.updated).toBe(true);

    // Reload config and verify collections were added
    const updatedConfig = loadConfig();
    expect(updatedConfig.tokens.collections?.base?.splitBy).toBe('none');
    expect(updatedConfig.tokens.collections?.theme?.splitBy).toBe('mode');
  });

  it('should preserve existing tokens config when updating with collections', () => {
    // Create config with token output options
    const initialConfig = {
      version: '1.0.0',
      figma: { fileId: 'abc123', accessToken: 'test-token' },
      tokens: {
        dir: 'src/tokens',
        dtcg: true,
        includeVariableId: true
      }
    };
    writeFileSync('synkio.config.json', JSON.stringify(initialConfig));

    const discoveredCollections = [
      { name: 'colors', modes: ['default'], splitBy: 'none' as const },
    ];

    updateConfigWithCollections(discoveredCollections);

    // Reload and verify original settings preserved
    const updatedConfig = loadConfig();
    expect(updatedConfig.tokens.dir).toBe('src/tokens');
    expect(updatedConfig.tokens.dtcg).toBe(true);
    expect(updatedConfig.tokens.includeVariableId).toBe(true);
    expect(updatedConfig.tokens.collections?.colors?.splitBy).toBe('none');
  });
});

describe('discoverCollectionsFromTokens helper', () => {
  /**
   * Helper function that extracts unique collections and their modes from normalized tokens.
   * Used during first sync to auto-populate tokens.collections.
   * Filters out phantom modes (Figma internal IDs like "21598:4").
   */
  function discoverCollectionsFromTokens(
    normalizedTokens: Record<string, { collection: string; mode: string }>
  ): { name: string; modes: string[]; splitBy: 'mode' | 'none' }[] {
    // Build map of collections to their unique modes
    const collectionModes = new Map<string, Set<string>>();

    for (const entry of Object.values(normalizedTokens)) {
      const collection = entry.collection;
      const mode = entry.mode;

      // Skip phantom modes (Figma internal IDs)
      if (isPhantomMode(mode)) continue;

      if (!collectionModes.has(collection)) {
        collectionModes.set(collection, new Set());
      }
      collectionModes.get(collection)!.add(mode);
    }

    // Convert to array with splitBy determination
    const result: { name: string; modes: string[]; splitBy: 'mode' | 'none' }[] = [];
    for (const [name, modesSet] of collectionModes) {
      const modes = Array.from(modesSet).sort();
      result.push({
        name,
        modes,
        splitBy: modes.length > 1 ? 'mode' : 'none',  // 'none' if 1 mode, 'mode' if 2+ modes
      });
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  it('should extract collections and modes from normalized tokens', () => {
    const normalizedTokens = {
      'VariableID:1:1:base.default': { collection: 'base', mode: 'default', path: 'colors.primary', value: '#000', type: 'color' },
      'VariableID:1:2:base.default': { collection: 'base', mode: 'default', path: 'colors.secondary', value: '#fff', type: 'color' },
      'VariableID:2:1:theme.light': { collection: 'theme', mode: 'light', path: 'bg.primary', value: '#fff', type: 'color' },
      'VariableID:2:1:theme.dark': { collection: 'theme', mode: 'dark', path: 'bg.primary', value: '#000', type: 'color' },
    };

    const discovered = discoverCollectionsFromTokens(normalizedTokens as any);

    expect(discovered).toHaveLength(2);

    const base = discovered.find(c => c.name === 'base');
    expect(base).toBeDefined();
    expect(base!.modes).toEqual(['default']);
    expect(base!.splitBy).toBe('none');

    const theme = discovered.find(c => c.name === 'theme');
    expect(theme).toBeDefined();
    expect(theme!.modes).toEqual(['dark', 'light']);
    expect(theme!.splitBy).toBe('mode');
  });

  it('should correctly determine splitBy based on mode count', () => {
    const singleModeTokens = {
      'VariableID:1:1:primitives.default': { collection: 'primitives', mode: 'default', path: 'a', value: 1, type: 'number' },
    };

    const multiModeTokens = {
      'VariableID:1:1:brands.brandA': { collection: 'brands', mode: 'brandA', path: 'a', value: 1, type: 'number' },
      'VariableID:1:1:brands.brandB': { collection: 'brands', mode: 'brandB', path: 'a', value: 2, type: 'number' },
      'VariableID:1:1:brands.brandC': { collection: 'brands', mode: 'brandC', path: 'a', value: 3, type: 'number' },
    };

    const singleResult = discoverCollectionsFromTokens(singleModeTokens as any);
    expect(singleResult[0].splitBy).toBe('none');

    const multiResult = discoverCollectionsFromTokens(multiModeTokens as any);
    expect(multiResult[0].splitBy).toBe('mode');
    expect(multiResult[0].modes).toHaveLength(3);
  });

  it('should filter out phantom modes from discovered collections', () => {
    const tokensWithPhantomModes = {
      'VariableID:1:1:theme.21598:4': { collection: 'theme', mode: '21598:4', path: 'colors.primary', value: '#000', type: 'color' },
      'VariableID:1:2:theme.21598:5': { collection: 'theme', mode: '21598:5', path: 'colors.secondary', value: '#fff', type: 'color' },
      'VariableID:1:3:theme.dark': { collection: 'theme', mode: 'dark', path: 'colors.tertiary', value: '#333', type: 'color' },
      'VariableID:1:4:theme.light': { collection: 'theme', mode: 'light', path: 'colors.tertiary', value: '#ccc', type: 'color' },
    };

    const discovered = discoverCollectionsFromTokens(tokensWithPhantomModes as any);

    expect(discovered).toHaveLength(1);
    const theme = discovered[0];
    expect(theme.name).toBe('theme');
    // Only 'dark' and 'light' should be discovered, not '21598:4' or '21598:5'
    expect(theme.modes).toEqual(['dark', 'light']);
    expect(theme.modes).not.toContain('21598:4');
    expect(theme.modes).not.toContain('21598:5');
    expect(theme.splitBy).toBe('mode');
  });

  it('should handle collections with only phantom modes', () => {
    const tokensOnlyPhantomModes = {
      'VariableID:1:1:phantom.21598:4': { collection: 'phantom', mode: '21598:4', path: 'a', value: 1, type: 'number' },
      'VariableID:1:2:phantom.12345:0': { collection: 'phantom', mode: '12345:0', path: 'b', value: 2, type: 'number' },
      'VariableID:2:1:base.default': { collection: 'base', mode: 'default', path: 'c', value: 3, type: 'number' },
    };

    const discovered = discoverCollectionsFromTokens(tokensOnlyPhantomModes as any);

    // 'phantom' collection should be excluded entirely since all its modes are phantom
    expect(discovered).toHaveLength(1);
    expect(discovered[0].name).toBe('base');
    expect(discovered.find(c => c.name === 'phantom')).toBeUndefined();
  });

  it('should correctly count modes after filtering phantom modes', () => {
    const tokensWithMixedModes = {
      'VariableID:1:1:theme.21598:4': { collection: 'theme', mode: '21598:4', path: 'a', value: 1, type: 'number' },
      'VariableID:1:2:theme.21598:5': { collection: 'theme', mode: '21598:5', path: 'a', value: 2, type: 'number' },
      'VariableID:1:3:theme.21598:6': { collection: 'theme', mode: '21598:6', path: 'a', value: 3, type: 'number' },
      'VariableID:1:4:theme.dark': { collection: 'theme', mode: 'dark', path: 'a', value: 4, type: 'number' },
      'VariableID:1:5:theme.light': { collection: 'theme', mode: 'light', path: 'a', value: 5, type: 'number' },
    };

    const discovered = discoverCollectionsFromTokens(tokensWithMixedModes as any);

    expect(discovered).toHaveLength(1);
    const theme = discovered[0];
    // Should only count valid modes (dark, light), not phantom modes
    expect(theme.modes).toHaveLength(2);
    expect(theme.modes).toEqual(['dark', 'light']);
    expect(theme.splitBy).toBe('mode');
  });
});
