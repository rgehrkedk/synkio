import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from './config.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

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

  it('should load a valid config file and resolve env var', () => {
    const mockConfig = {
      version: '1.0.0',
      figma: {
        fileId: 'abc',
        nodeId: '123',
        accessToken: '${FIGMA_TOKEN}',
      },
      output: {
        dir: 'tokens',
        format: 'json',
      },
    };
    writeFileSync('tokensrc.json', JSON.stringify(mockConfig));
    process.env.FIGMA_TOKEN = 'my-secret-token';

    const config = loadConfig();

    expect(config.figma.fileId).toBe('abc');
    expect(config.figma.accessToken).toBe('my-secret-token');
  });

  it('should throw an error if the config file is not found', () => {
    expect(() => loadConfig()).toThrow('Config file not found');
  });

  it('should throw an error for invalid JSON', () => {
    writeFileSync('tokensrc.json', 'not-valid-json');
    expect(() => loadConfig()).toThrow('Could not parse JSON');
  });

  it('should throw an error if FIGMA_TOKEN is required but not set', () => {
    const mockConfig = {
      version: '1.0.0',
      figma: {
        fileId: 'abc',
        nodeId: '123',
        accessToken: '${FIGMA_TOKEN}',
      },
      output: {
        dir: 'tokens',
        format: 'json',
      },
    };
    writeFileSync('tokensrc.json', JSON.stringify(mockConfig));
    // Note: FIGMA_TOKEN is not set in process.env
    expect(() => loadConfig()).toThrow('FIGMA_TOKEN environment variable is not set');
  });

  it('should throw an error for invalid config schema', () => {
    const invalidConfig = {
      version: '1.0.0',
      // 'figma' property is missing
      output: {
        dir: 'tokens',
        format: 'json',
      },
    };
    writeFileSync('tokensrc.json', JSON.stringify(invalidConfig));
    expect(() => loadConfig()).toThrow('Invalid configuration');
  });
});
