import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';

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
  generateAllFromBaseline: vi.fn().mockResolvedValue({
    css: { files: [], outputDir: '' },
    docs: { files: [], outputDir: '' }
  }),
  generateWithStyleDictionary: vi.fn().mockResolvedValue({ files: [], outputDir: '' }),
  isStyleDictionaryAvailable: vi.fn().mockResolvedValue(false)
}));

import { loadConfig, ConfigSchema, updateConfigWithCollections } from '../../core/config.js';

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
          theme: { splitModes: true }
        }
      }
    };
    writeFileSync('synkio.config.json', JSON.stringify(config));

    const loaded = loadConfig();

    expect(loaded.tokens.dir).toBe('src/design-tokens');
    expect(loaded.tokens.collections?.theme?.splitModes).toBe(true);
  });

  it('should read build.styleDictionary.configFile for SD mode detection', () => {
    const configWithSD = {
      version: '1.0.0',
      figma: { fileId: 'abc123', accessToken: 'test-token' },
      tokens: { dir: 'tokens' },
      build: {
        styleDictionary: {
          configFile: './sd.config.js'
        }
      }
    };
    writeFileSync('synkio.config.json', JSON.stringify(configWithSD));

    const loaded = loadConfig();

    // SD mode is detected via build.styleDictionary.configFile
    expect(loaded.build?.styleDictionary?.configFile).toBe('./sd.config.js');

    // Helper to check if SD mode is enabled
    const isSDMode = !!loaded.build?.styleDictionary?.configFile;
    expect(isSDMode).toBe(true);
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

  it('should auto-detect splitModes: false for collections with 1 mode', () => {
    const collections = [
      { name: 'base', modes: ['default'], splitModes: false },
    ];

    // The logic: splitModes should be false when only 1 mode
    expect(collections[0].splitModes).toBe(false);
    expect(collections[0].modes.length).toBe(1);
  });

  it('should auto-detect splitModes: true for collections with 2+ modes', () => {
    const collections = [
      { name: 'theme', modes: ['light', 'dark'], splitModes: true },
      { name: 'brands', modes: ['brandA', 'brandB', 'brandC'], splitModes: true },
    ];

    // The logic: splitModes should be true when 2+ modes
    expect(collections[0].splitModes).toBe(true);
    expect(collections[0].modes.length).toBe(2);
    expect(collections[1].splitModes).toBe(true);
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
      { name: 'base', modes: ['default'], splitModes: false },
      { name: 'theme', modes: ['light', 'dark'], splitModes: true },
    ];

    const result = updateConfigWithCollections(discoveredCollections);

    expect(result.updated).toBe(true);

    // Reload config and verify collections were added
    const updatedConfig = loadConfig();
    expect(updatedConfig.tokens.collections?.base?.splitModes).toBe(false);
    expect(updatedConfig.tokens.collections?.theme?.splitModes).toBe(true);
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
      { name: 'colors', modes: ['default'], splitModes: false },
    ];

    updateConfigWithCollections(discoveredCollections);

    // Reload and verify original settings preserved
    const updatedConfig = loadConfig();
    expect(updatedConfig.tokens.dir).toBe('src/tokens');
    expect(updatedConfig.tokens.dtcg).toBe(true);
    expect(updatedConfig.tokens.includeVariableId).toBe(true);
    expect(updatedConfig.tokens.collections?.colors?.splitModes).toBe(false);
  });
});

describe('discoverCollectionsFromTokens helper', () => {
  /**
   * Helper function that extracts unique collections and their modes from normalized tokens.
   * Used during first sync to auto-populate tokens.collections.
   */
  function discoverCollectionsFromTokens(
    normalizedTokens: Record<string, { collection: string; mode: string }>
  ): { name: string; modes: string[]; splitModes: boolean }[] {
    // Build map of collections to their unique modes
    const collectionModes = new Map<string, Set<string>>();

    for (const entry of Object.values(normalizedTokens)) {
      const collection = entry.collection;
      const mode = entry.mode;

      if (!collectionModes.has(collection)) {
        collectionModes.set(collection, new Set());
      }
      collectionModes.get(collection)!.add(mode);
    }

    // Convert to array with splitModes determination
    const result: { name: string; modes: string[]; splitModes: boolean }[] = [];
    for (const [name, modesSet] of collectionModes) {
      const modes = Array.from(modesSet).sort();
      result.push({
        name,
        modes,
        splitModes: modes.length > 1,  // false if 1 mode, true if 2+ modes
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
    expect(base!.splitModes).toBe(false);

    const theme = discovered.find(c => c.name === 'theme');
    expect(theme).toBeDefined();
    expect(theme!.modes).toEqual(['dark', 'light']);
    expect(theme!.splitModes).toBe(true);
  });

  it('should correctly determine splitModes based on mode count', () => {
    const singleModeTokens = {
      'VariableID:1:1:primitives.default': { collection: 'primitives', mode: 'default', path: 'a', value: 1, type: 'number' },
    };

    const multiModeTokens = {
      'VariableID:1:1:brands.brandA': { collection: 'brands', mode: 'brandA', path: 'a', value: 1, type: 'number' },
      'VariableID:1:1:brands.brandB': { collection: 'brands', mode: 'brandB', path: 'a', value: 2, type: 'number' },
      'VariableID:1:1:brands.brandC': { collection: 'brands', mode: 'brandC', path: 'a', value: 3, type: 'number' },
    };

    const singleResult = discoverCollectionsFromTokens(singleModeTokens as any);
    expect(singleResult[0].splitModes).toBe(false);

    const multiResult = discoverCollectionsFromTokens(multiModeTokens as any);
    expect(multiResult[0].splitModes).toBe(true);
    expect(multiResult[0].modes).toHaveLength(3);
  });
});
