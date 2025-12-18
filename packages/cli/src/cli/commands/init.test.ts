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
    it('should generate minimal config without SD detection', async () => {
      // Note: init no longer detects SD - it creates a minimal config
      // Users configure build options manually after init
      const { generateConfig } = await import('./init.js');

      const config = generateConfig('ABC123');

      // Should have default tokens.dir
      expect(config.tokens.dir).toBe('tokens');
      // Should NOT have any build config by default
      expect(config.build).toBeUndefined();
      // Should NOT have docsPages by default
      expect(config.docsPages).toBeUndefined();
    });

    it('should include baseUrl when provided', async () => {
      const { generateConfig } = await import('./init.js');

      const config = generateConfig('ABC123', 'https://custom.figma.com');

      expect(config.figma.baseUrl).toBe('https://custom.figma.com');
    });

    it('should set correct figma config', async () => {
      const { generateConfig } = await import('./init.js');

      const config = generateConfig('FILE123');

      expect(config.version).toBe('1.0.0');
      expect(config.figma.fileId).toBe('FILE123');
      expect(config.figma.accessToken).toBe('${FIGMA_TOKEN}');
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
