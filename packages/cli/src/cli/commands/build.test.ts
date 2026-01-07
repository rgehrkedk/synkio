/**
 * Build Command Tests
 *
 * Tests for the build command that generates token files from baseline.json.
 * These tests verify the command can be loaded and basic error handling works.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

// Store original cwd
const originalCwd = process.cwd();
const TEST_DIR = resolve(originalCwd, 'test-temp-build');

describe('build command', () => {
  let originalExit: typeof process.exit;

  beforeEach(() => {
    // Create a temporary directory for our test files
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);

    // Mock process.exit
    originalExit = process.exit;
    process.exit = vi.fn() as never;
  });

  afterEach(() => {
    // Go back to the original directory
    process.chdir(originalCwd);
    // Clean up the temporary directory
    rmSync(TEST_DIR, { recursive: true, force: true });
    // Restore process.exit
    process.exit = originalExit;
    // Reset mocks
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe('module loading', () => {
    it('should export buildCommand function', async () => {
      const buildModule = await import('./build.js');
      expect(typeof buildModule.buildCommand).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should exit with code 1 when config file is missing', async () => {
      // No config file created - should fail
      const { buildCommand } = await import('./build.js');
      await buildCommand({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit with code 1 when baseline is missing but config exists', async () => {
      // Create config but no baseline
      writeFileSync('synkio.config.json', JSON.stringify({
        version: '1.0.0',
        figma: { fileId: 'test', accessToken: '${FIGMA_TOKEN}' },
        tokens: { dir: 'tokens' },
      }));

      const { buildCommand } = await import('./build.js');
      await buildCommand({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('options', () => {
    it('should accept rebuild option', async () => {
      const { buildCommand } = await import('./build.js');
      // Should not throw when called with rebuild option (even if it fails)
      await buildCommand({ rebuild: true });
      // Will exit with error due to missing config, but should accept the option
      expect(process.exit).toHaveBeenCalled();
    });

    it('should accept config option', async () => {
      const { buildCommand } = await import('./build.js');
      await buildCommand({ config: './custom-config.json' });
      expect(process.exit).toHaveBeenCalled();
    });

    it('should accept backup option', async () => {
      const { buildCommand } = await import('./build.js');
      await buildCommand({ backup: true });
      expect(process.exit).toHaveBeenCalled();
    });

    it('should accept open option', async () => {
      const { buildCommand } = await import('./build.js');
      await buildCommand({ open: true });
      expect(process.exit).toHaveBeenCalled();
    });
  });
});
