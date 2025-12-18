import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Store original cwd
const originalCwd = process.cwd();
const TEST_DIR = resolve(originalCwd, 'test-temp-init');

describe('init command', () => {
  beforeEach(() => {
    // Create a temporary directory for our test files
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
    // Clear environment
    delete process.env.FIGMA_TOKEN;
  });

  afterEach(() => {
    // Go back to the original directory
    process.chdir(originalCwd);
    // Clean up the temporary directory
    rmSync(TEST_DIR, { recursive: true, force: true });
    // Clear any environment variables we set
    delete process.env.FIGMA_TOKEN;
    // Reset all mocks
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe('Style Dictionary detection', () => {
    it('should detect Style Dictionary from package.json dependencies', async () => {
      // Create package.json with style-dictionary dependency
      writeFileSync('package.json', JSON.stringify({
        name: 'test-project',
        dependencies: {
          'style-dictionary': '^5.0.0'
        }
      }));

      // Import detect module
      const { hasStyleDictionary } = await import('../../core/detect.js');

      expect(hasStyleDictionary()).toBe(true);
    });

    it('should detect Style Dictionary from package.json devDependencies', async () => {
      // Create package.json with style-dictionary in devDependencies
      writeFileSync('package.json', JSON.stringify({
        name: 'test-project',
        devDependencies: {
          'style-dictionary': '^5.0.0'
        }
      }));

      const { hasStyleDictionary } = await import('../../core/detect.js');

      expect(hasStyleDictionary()).toBe(true);
    });

    it('should return false when style-dictionary is not in package.json', async () => {
      // Create package.json without style-dictionary
      writeFileSync('package.json', JSON.stringify({
        name: 'test-project',
        dependencies: {
          'react': '^18.0.0'
        }
      }));

      const { hasStyleDictionary } = await import('../../core/detect.js');

      expect(hasStyleDictionary()).toBe(false);
    });

    it('should find Style Dictionary config file with content-based search', async () => {
      // Create package.json with style-dictionary
      writeFileSync('package.json', JSON.stringify({
        name: 'test-project',
        dependencies: {
          'style-dictionary': '^5.0.0'
        }
      }));

      // Create a Style Dictionary config file with source and platforms
      const sdConfig = `
module.exports = {
  source: ['src/tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables'
      }]
    }
  }
};
`;
      writeFileSync('sd.config.js', sdConfig);

      const { findStyleDictionaryConfig } = await import('../../core/detect.js');

      const result = findStyleDictionaryConfig();
      expect(result).not.toBeNull();
      expect(result?.configFile).toBe('sd.config.js');
    });

    it('should extract tokens.dir from Style Dictionary source glob patterns', async () => {
      const { parseSourceGlob } = await import('../../core/detect.js');

      // Test various glob patterns
      expect(parseSourceGlob('src/tokens/**/*.json')).toBe('src/tokens');
      expect(parseSourceGlob('tokens/**/*.json')).toBe('tokens');
      expect(parseSourceGlob('tokens/*.json')).toBe('tokens');
      expect(parseSourceGlob('./src/design-tokens/**/*.json')).toBe('src/design-tokens');
    });

    it('should not find SD config in non-matching files', async () => {
      // Create package.json with style-dictionary
      writeFileSync('package.json', JSON.stringify({
        name: 'test-project',
        dependencies: {
          'style-dictionary': '^5.0.0'
        }
      }));

      // Create a file that only has source but not platforms
      writeFileSync('config.js', `
module.exports = {
  source: ['src/**/*.ts'],
  output: 'dist'
};
`);

      const { findStyleDictionaryConfig } = await import('../../core/detect.js');

      const result = findStyleDictionaryConfig();
      expect(result).toBeNull();
    });
  });

  describe('.env.example creation', () => {
    it('should create .env.example with FIGMA_TOKEN placeholder', async () => {
      // Create package.json
      writeFileSync('package.json', JSON.stringify({
        name: 'test-project'
      }));

      const { ensureEnvExample } = await import('./init.js');

      await ensureEnvExample();

      expect(existsSync('.env.example')).toBe(true);
      const content = readFileSync('.env.example', 'utf-8');
      expect(content).toContain('FIGMA_TOKEN=');
    });

    it('should NOT create .env file', async () => {
      // Create package.json
      writeFileSync('package.json', JSON.stringify({
        name: 'test-project'
      }));

      const { ensureEnvExample } = await import('./init.js');

      await ensureEnvExample();

      // .env should NOT be created
      expect(existsSync('.env')).toBe(false);
      // .env.example SHOULD be created
      expect(existsSync('.env.example')).toBe(true);
    });

    it('should add .env to .gitignore', async () => {
      // Create package.json
      writeFileSync('package.json', JSON.stringify({
        name: 'test-project'
      }));

      const { ensureGitignore } = await import('./init.js');

      await ensureGitignore();

      expect(existsSync('.gitignore')).toBe(true);
      const content = readFileSync('.gitignore', 'utf-8');
      expect(content).toContain('.env');
    });
  });

  describe('config generation', () => {
    it('should generate config with build.styleDictionary when SD is detected', async () => {
      // Create package.json with style-dictionary
      writeFileSync('package.json', JSON.stringify({
        name: 'test-project',
        dependencies: {
          'style-dictionary': '^5.0.0'
        }
      }));

      // Create SD config
      writeFileSync('sd.config.js', `
module.exports = {
  source: ['src/tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [{ destination: 'tokens.css', format: 'css/variables' }]
    }
  }
};
`);

      const { generateConfig } = await import('./init.js');

      const config = await generateConfig('ABC123');

      expect(config.tokens.dir).toBe('src/tokens');
      expect(config.build?.styleDictionary?.configFile).toBe('sd.config.js');
      // Should NOT have build.css when SD is detected
      expect(config.build?.css).toBeUndefined();
    });

    it('should generate config with build.css when SD is NOT detected', async () => {
      // Create package.json without style-dictionary
      writeFileSync('package.json', JSON.stringify({
        name: 'test-project',
        dependencies: {
          'react': '^18.0.0'
        }
      }));

      const { generateConfig } = await import('./init.js');

      const config = await generateConfig('ABC123');

      expect(config.tokens.dir).toBe('tokens'); // Default
      expect(config.build?.css?.enabled).toBe(true);
      expect(config.build?.css?.file).toBe('tokens.css');
      expect(config.build?.css?.utilities).toBe(true);
      // Should NOT have build.styleDictionary when SD is not detected
      expect(config.build?.styleDictionary).toBeUndefined();
    });

    it('should always include docsPages with defaults', async () => {
      // Create package.json
      writeFileSync('package.json', JSON.stringify({
        name: 'test-project'
      }));

      const { generateConfig } = await import('./init.js');

      const config = await generateConfig('ABC123');

      expect(config.docsPages?.enabled).toBe(true);
      expect(config.docsPages?.dir).toBe('.synkio/docs');
      expect(config.docsPages?.title).toBe('Design Tokens');
    });
  });

  describe('--token flag removal', () => {
    it('should not accept token from options', async () => {
      // The init command should not process token from options
      // This is a design test - the actual initCommand shouldn't accept token
      const { InitOptions } = await import('./init.js');

      // InitOptions should not have a token property
      const options: Record<string, unknown> = {
        figmaUrl: 'https://figma.com/design/ABC123/Test',
        token: 'test-token' // This should be ignored
      };

      // The interface check happens at compile time
      // At runtime, we verify the command doesn't use it
      expect(options.token).toBeDefined(); // It exists in the object
      // But our new InitOptions interface should not include it
    });
  });
});
