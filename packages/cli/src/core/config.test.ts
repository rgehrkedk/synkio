import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, ConfigSchema } from './config.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const TEST_DIR = 'test-temp-config';

describe('loadConfig', () => {
  beforeEach(() => {
    // Create a temporary directory for our test files
    mkdirSync(TEST_DIR, { recursive: true });
    // Mock process.cwd to point to our test directory
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    // Go back to the original directory
    process.chdir('..');
    // Clean up the temporary directory
    rmSync(TEST_DIR, { recursive: true, force: true });
    // Clear any environment variables we set
    delete process.env.FIGMA_TOKEN;
  });

  it('should throw an error if the config file is not found', () => {
    expect(() => loadConfig()).toThrow('No config file found');
  });

  it('should throw an error for invalid JSON', () => {
    writeFileSync('synkio.config.json', 'not-valid-json');
    expect(() => loadConfig()).toThrow('Could not parse JSON');
  });

  it('should throw an error if FIGMA_TOKEN is required but not set', () => {
    const mockConfig = {
      version: '1.0.0',
      figma: {
        fileId: 'abc',
        accessToken: '${FIGMA_TOKEN}',
      },
      tokens: {
        dir: 'tokens',
      },
    };
    writeFileSync('synkio.config.json', JSON.stringify(mockConfig));
    // Note: FIGMA_TOKEN is not set in process.env
    expect(() => loadConfig()).toThrow('FIGMA_TOKEN environment variable is not set');
  });
});

describe('ConfigSchema - new structure validation', () => {
  it('should validate new config structure with tokens.dir and build sections', () => {
    const config = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      tokens: {
        dir: 'src/tokens',
        collections: {
          theme: {
            splitBy: 'mode',
          },
          colors: {
            dir: 'src/tokens/colors',
            file: 'colors',
            splitBy: 'none',
          },
        },
      },
      build: {
        css: {
          enabled: true,
          file: 'tokens.css',
          utilities: true,
        },
      },
      docsPages: {
        enabled: true,
        dir: 'synkio/docs',
        title: 'Design Tokens',
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tokens.dir).toBe('src/tokens');
      expect(result.data.tokens.collections?.theme?.splitBy).toBe('mode');
      expect(result.data.build?.css?.enabled).toBe(true);
      expect(result.data.docsPages?.enabled).toBe(true);
    }
  });

  it('should reject old schema keys (output.*, css.*, docs.*)', () => {
    // Helper to check if error contains unrecognized key
    const hasUnrecognizedKey = (result: any, key: string): boolean => {
      if (result.success) return false;
      return result.error.issues.some(
        (i: any) => i.code === 'unrecognized_keys' && i.keys?.includes(key)
      );
    };

    const oldConfigWithOutput = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      output: {
        dir: 'tokens',
        format: 'json',
        mode: 'json',
      },
      tokens: {
        dir: 'tokens',
      },
    };

    const result1 = ConfigSchema.safeParse(oldConfigWithOutput);
    expect(result1.success).toBe(false);
    expect(hasUnrecognizedKey(result1, 'output')).toBe(true);

    const oldConfigWithCss = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      css: {
        enabled: true,
      },
      tokens: {
        dir: 'tokens',
      },
    };

    const result2 = ConfigSchema.safeParse(oldConfigWithCss);
    expect(result2.success).toBe(false);
    expect(hasUnrecognizedKey(result2, 'css')).toBe(true);

    const oldConfigWithDocs = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      docs: {
        enabled: true,
      },
      tokens: {
        dir: 'tokens',
      },
    };

    const result3 = ConfigSchema.safeParse(oldConfigWithDocs);
    expect(result3.success).toBe(false);
    expect(hasUnrecognizedKey(result3, 'docs')).toBe(true);

    // Also test old 'collections' at root level (should be under tokens.collections)
    const oldConfigWithCollections = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      collections: {
        theme: { splitBy: 'mode' },
      },
      tokens: {
        dir: 'tokens',
      },
    };

    const result4 = ConfigSchema.safeParse(oldConfigWithCollections);
    expect(result4.success).toBe(false);
    expect(hasUnrecognizedKey(result4, 'collections')).toBe(true);
  });

  it('should validate env var substitution for figma.accessToken', () => {
    // Save original cwd
    const originalCwd = process.cwd();
    const testDir = 'test-env-var-config';

    try {
      // Create test directory and change to it
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      const mockConfig = {
        version: '1.0.0',
        figma: {
          fileId: 'abc123',
          accessToken: '${FIGMA_TOKEN}',
        },
        tokens: {
          dir: 'tokens',
        },
      };
      writeFileSync('synkio.config.json', JSON.stringify(mockConfig));
      process.env.FIGMA_TOKEN = 'my-secret-token';

      const config = loadConfig();

      expect(config.figma.fileId).toBe('abc123');
      expect(config.figma.accessToken).toBe('my-secret-token');
    } finally {
      // Cleanup
      process.chdir(originalCwd);
      rmSync(testDir, { recursive: true, force: true });
      delete process.env.FIGMA_TOKEN;
    }
  });

  it('should provide clear validation error messages for malformed config', () => {
    const malformedConfig = {
      version: '1.0.0',
      figma: {
        // Missing fileId
        accessToken: 'test-token',
      },
      tokens: {
        // dir is missing (required)
      },
    };

    const result = ConfigSchema.safeParse(malformedConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      // Should have error for missing figma.fileId
      expect(messages.some(m => m.includes('figma.fileId'))).toBe(true);
      // Should have error for missing tokens.dir
      expect(messages.some(m => m.includes('tokens.dir'))).toBe(true);
    }
  });

  it('should validate minimal config with only required fields', () => {
    const minimalConfig = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      tokens: {
        dir: 'tokens',
      },
    };

    const result = ConfigSchema.safeParse(minimalConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tokens.dir).toBe('tokens');
      expect(result.data.build).toBeUndefined();
      expect(result.data.docsPages).toBeUndefined();
    }
  });

  it('should validate build.css configuration with all options', () => {
    const config = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      tokens: {
        dir: 'tokens',
      },
      build: {
        css: {
          enabled: true,
          dir: 'styles',
          file: 'custom-tokens.css',
          utilities: true,
          utilitiesFile: 'custom-utilities.css',
          transforms: {
            useRem: true,
            basePxFontSize: 16,
          },
        },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.build?.css?.enabled).toBe(true);
      expect(result.data.build?.css?.dir).toBe('styles');
      expect(result.data.build?.css?.file).toBe('custom-tokens.css');
      expect(result.data.build?.css?.utilities).toBe(true);
      expect(result.data.build?.css?.transforms?.useRem).toBe(true);
    }
  });
});

describe('ConfigSchema - token output options', () => {
  it('should validate tokens.dtcg option with default value true', () => {
    const configWithoutDtcg = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      tokens: {
        dir: 'tokens',
      },
    };

    const result = ConfigSchema.safeParse(configWithoutDtcg);
    expect(result.success).toBe(true);
    if (result.success) {
      // Default should be true
      expect(result.data.tokens.dtcg).toBe(true);
    }
  });

  it('should validate tokens.dtcg option when explicitly set to false', () => {
    const configWithDtcgFalse = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      tokens: {
        dir: 'tokens',
        dtcg: false,
      },
    };

    const result = ConfigSchema.safeParse(configWithDtcgFalse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tokens.dtcg).toBe(false);
    }
  });

  it('should validate tokens.includeVariableId option with default value false', () => {
    const configWithoutIncludeVariableId = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      tokens: {
        dir: 'tokens',
      },
    };

    const result = ConfigSchema.safeParse(configWithoutIncludeVariableId);
    expect(result.success).toBe(true);
    if (result.success) {
      // Default should be false
      expect(result.data.tokens.includeVariableId).toBe(false);
    }
  });

  it('should validate tokens.includeVariableId option when explicitly set to true', () => {
    const configWithIncludeVariableId = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      tokens: {
        dir: 'tokens',
        includeVariableId: true,
      },
    };

    const result = ConfigSchema.safeParse(configWithIncludeVariableId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tokens.includeVariableId).toBe(true);
    }
  });

  it('should validate tokens.extensions with all options', () => {
    const configWithExtensions = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      tokens: {
        dir: 'tokens',
        extensions: {
          description: true,
          scopes: true,
          codeSyntax: true,
        },
      },
    };

    const result = ConfigSchema.safeParse(configWithExtensions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tokens.extensions?.description).toBe(true);
      expect(result.data.tokens.extensions?.scopes).toBe(true);
      expect(result.data.tokens.extensions?.codeSyntax).toBe(true);
    }
  });

  it('should validate tokens.extensions with default values (all false)', () => {
    const configWithEmptyExtensions = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      tokens: {
        dir: 'tokens',
        extensions: {},
      },
    };

    const result = ConfigSchema.safeParse(configWithEmptyExtensions);
    expect(result.success).toBe(true);
    if (result.success) {
      // All extensions should default to false
      expect(result.data.tokens.extensions?.description).toBe(false);
      expect(result.data.tokens.extensions?.scopes).toBe(false);
      expect(result.data.tokens.extensions?.codeSyntax).toBe(false);
    }
  });

  it('should validate full token output options configuration', () => {
    const fullConfig = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      tokens: {
        dir: 'src/tokens',
        dtcg: true,
        includeVariableId: false,
        extensions: {
          description: false,
          scopes: false,
          codeSyntax: false,
        },
        collections: {
          colors: { splitBy: 'mode' },
        },
      },
    };

    const result = ConfigSchema.safeParse(fullConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tokens.dir).toBe('src/tokens');
      expect(result.data.tokens.dtcg).toBe(true);
      expect(result.data.tokens.includeVariableId).toBe(false);
      expect(result.data.tokens.extensions?.description).toBe(false);
      expect(result.data.tokens.extensions?.scopes).toBe(false);
      expect(result.data.tokens.extensions?.codeSyntax).toBe(false);
      expect(result.data.tokens.collections?.colors?.splitBy).toBe('mode');
    }
  });

  it('should validate partial extensions configuration', () => {
    const configWithPartialExtensions = {
      version: '1.0.0',
      figma: {
        fileId: 'abc123',
        accessToken: 'test-token',
      },
      tokens: {
        dir: 'tokens',
        extensions: {
          description: true,
          // scopes and codeSyntax not specified, should default to false
        },
      },
    };

    const result = ConfigSchema.safeParse(configWithPartialExtensions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tokens.extensions?.description).toBe(true);
      expect(result.data.tokens.extensions?.scopes).toBe(false);
      expect(result.data.tokens.extensions?.codeSyntax).toBe(false);
    }
  });
});
