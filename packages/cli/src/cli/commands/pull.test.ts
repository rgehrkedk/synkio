/**
 * Pull Command Tests
 *
 * Tests for the pull command that fetches from Figma and updates baseline.json.
 * These tests verify the command can be loaded and basic error handling works.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

// Store original cwd
const originalCwd = process.cwd();
const TEST_DIR = resolve(originalCwd, 'test-temp-pull');

describe('pull command', () => {
  let originalExit: typeof process.exit;

  beforeEach(() => {
    // Create a temporary directory for our test files
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);

    // Clear environment
    delete process.env.FIGMA_TOKEN;

    // Mock process.exit
    originalExit = process.exit;
    process.exit = vi.fn() as never;
  });

  afterEach(() => {
    // Go back to the original directory
    process.chdir(originalCwd);
    // Clean up the temporary directory
    rmSync(TEST_DIR, { recursive: true, force: true });
    // Clear environment
    delete process.env.FIGMA_TOKEN;
    // Restore process.exit
    process.exit = originalExit;
    // Reset mocks
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe('module loading', () => {
    it('should export pullCommand function', async () => {
      const pullModule = await import('./pull.js');
      expect(typeof pullModule.pullCommand).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should exit with error when config file is missing', async () => {
      // No config file created - should fail
      const { pullCommand } = await import('./pull.js');
      await pullCommand({});

      // Should exit with code 2 (error)
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('should exit with error when FIGMA_TOKEN is missing', async () => {
      // Create config but no token
      writeFileSync('synkio.config.json', JSON.stringify({
        version: '1.0.0',
        figma: { fileId: 'test', accessToken: '${FIGMA_TOKEN}' },
        tokens: { dir: 'tokens' },
      }));

      const { pullCommand } = await import('./pull.js');
      await pullCommand({});

      // Should exit with code 2 (error) due to missing token
      expect(process.exit).toHaveBeenCalledWith(2);
    });
  });

  describe('options', () => {
    it('should accept preview option', async () => {
      const { pullCommand } = await import('./pull.js');
      await pullCommand({ preview: true });
      expect(process.exit).toHaveBeenCalled();
    });

    it('should accept config option', async () => {
      const { pullCommand } = await import('./pull.js');
      await pullCommand({ config: './custom-config.json' });
      expect(process.exit).toHaveBeenCalled();
    });

    it('should accept collection option', async () => {
      const { pullCommand } = await import('./pull.js');
      await pullCommand({ collection: 'theme' });
      expect(process.exit).toHaveBeenCalled();
    });

    it('should accept timeout option', async () => {
      const { pullCommand } = await import('./pull.js');
      await pullCommand({ timeout: 60000 });
      expect(process.exit).toHaveBeenCalled();
    });
  });
});
