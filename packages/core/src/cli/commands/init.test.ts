/**
 * Init Command Tests
 *
 * Tests for the interactive setup command (synkio init)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as figma from '../../figma/index.js';
import * as loader from '../../files/loader.js';
import * as prompt from '../prompt.js';

// Mock modules BEFORE importing the command
vi.mock('fs');
vi.mock('../../figma/index.js');
vi.mock('../../files/loader.js');
vi.mock('../prompt.js');

// NOW import the command under test
import { initCommand } from './init.js';

describe('init command', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(prompt.createPrompt).mockReturnValue({
      question: vi.fn(),
      close: vi.fn(),
    } as any);

    vi.mocked(loader.findConfigFile).mockReturnValue(null);

    // Mock fs.readdirSync to return an empty array by default
    vi.mocked(fs.readdirSync).mockReturnValue([] as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create tokensrc.json with provided values', async () => {
    // Mock user inputs - need enough for all prompts
    vi.mocked(prompt.askText)
      .mockResolvedValueOnce('https://www.figma.com/file/abc123/Test-File')
      .mockResolvedValueOnce('test-access-token')
      .mockResolvedValueOnce('') // Optional node ID
      // First collection (Core)
      .mockResolvedValueOnce('1') // Strategy choice (1 = byMode)
      .mockResolvedValueOnce('tokens/core') // Output directory
      .mockResolvedValue(''); // Any other prompts

    vi.mocked(prompt.askYesNo)
      .mockResolvedValueOnce(true) // Confirm file paths for first collection
      .mockResolvedValueOnce(true) // use default data paths
      .mockResolvedValueOnce(false) // Skip build command
      .mockResolvedValue(false); // Any other yes/no prompts

    // Mock Figma API response with ONE collection
    // Only 'baseline' and '$metadata' keys are ignored by extractCollections
    // Everything else becomes a collection
    vi.mocked(figma.fetchFigmaData).mockResolvedValueOnce({
      baseline: {},
      $metadata: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        pluginVersion: '1.0.0',
        fileKey: 'abc123',
        fileName: 'Test File',
      },
      // Collection data at top level - only 'Core' collection
      'Core': {
        'Light': {},
      },
    } as any);

    // Mock file operations
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(loader.saveConfig).mockResolvedValueOnce(undefined);

    // Run init command
    await initCommand({ yes: false });

    // Verify config was saved
    expect(loader.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        version: expect.any(String),
        figma: expect.objectContaining({
          fileId: 'abc123',
          accessToken: expect.any(String),
        }),
      }),
      expect.any(String)
    );
  });

  it('should validate Figma connection before proceeding', async () => {
    vi.mocked(prompt.askText)
      .mockResolvedValueOnce('https://www.figma.com/file/abc123/Test-File')
      .mockResolvedValueOnce('invalid-token')
      .mockResolvedValueOnce(''); // node ID

    vi.mocked(prompt.askYesNo)
      .mockResolvedValueOnce(false); // Don't retry after failure

    // Mock failed Figma API call
    vi.mocked(figma.fetchFigmaData).mockRejectedValueOnce(new Error('Invalid access token'));

    // Run init command and expect it to throw
    // The error message changed - it now says "Setup cancelled by user" when user declines retry
    await expect(initCommand({ yes: false })).rejects.toThrow(/Setup cancelled/);

    // Verify config was not saved
    expect(loader.saveConfig).not.toHaveBeenCalled();
  });

  it('should handle invalid Figma URL with loop until valid', async () => {
    vi.mocked(prompt.askText)
      .mockResolvedValueOnce('not-a-valid-url') // Invalid URL
      .mockResolvedValueOnce('https://www.figma.com/file/abc123/Test-File') // Valid URL
      .mockResolvedValueOnce('test-token')
      .mockResolvedValueOnce('') // node ID
      .mockResolvedValue(''); // Any other prompts

    vi.mocked(prompt.askYesNo)
      .mockResolvedValueOnce(true) // use default data paths
      .mockResolvedValueOnce(false) // Skip build
      .mockResolvedValue(false); // Any other yes/no prompts

    // Return baseline with NO collections (only baseline and $metadata keys)
    vi.mocked(figma.fetchFigmaData).mockResolvedValueOnce({
      baseline: {},
      $metadata: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        pluginVersion: '1.0.0',
        fileKey: 'abc123',
        fileName: 'Test',
      },
    } as any);

    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(loader.saveConfig).mockResolvedValueOnce(undefined);

    await initCommand({ yes: false });

    // Should have called askText at least twice for URL (once invalid, once valid)
    expect(prompt.askText).toHaveBeenCalled();
  });

  it('should use template when --template flag provided', async () => {
    // Mock template file EXISTS and readFileSync returns template config
    vi.mocked(fs.existsSync).mockImplementation((path: any) => {
      const pathStr = String(path);
      // Template file exists
      if (pathStr.includes('tokensrc.nextjs.json')) {
        return true;
      }
      // All other paths (token directories during detection) don't exist
      return false;
    });

    vi.mocked(fs.readFileSync).mockReturnValueOnce(
      JSON.stringify({
        version: '1.0.0',
        paths: {
          tokens: 'src/tokens',
        },
      }) as any
    );

    // Mock readdirSync to return empty array (no token directories found)
    vi.mocked(fs.readdirSync).mockReturnValue([] as any);

    vi.mocked(prompt.askText)
      .mockResolvedValueOnce('https://www.figma.com/file/abc123/Test-File')
      .mockResolvedValueOnce('test-token')
      .mockResolvedValueOnce(''); // node ID

    vi.mocked(prompt.askYesNo)
      .mockResolvedValueOnce(true) // use default data paths
      .mockResolvedValueOnce(false); // Skip build

    // Return baseline with NO collections (only baseline and $metadata keys)
    vi.mocked(figma.fetchFigmaData).mockResolvedValueOnce({
      baseline: {},
      $metadata: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        pluginVersion: '1.0.0',
        fileKey: 'abc123',
        fileName: 'Test',
      },
    } as any);

    vi.mocked(loader.saveConfig).mockResolvedValueOnce(undefined);

    await initCommand({ template: 'nextjs', yes: false });

    // Verify template paths were used
    expect(loader.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        paths: expect.objectContaining({
          tokens: 'src/tokens',
        }),
      }),
      expect.any(String)
    );
  });

  it('should skip prompts with --yes flag', async () => {
    // Set environment variables
    process.env.FIGMA_FILE_URL = 'https://www.figma.com/file/abc123/Test-File';
    process.env.FIGMA_ACCESS_TOKEN = 'test-token';

    vi.mocked(figma.fetchFigmaData).mockResolvedValueOnce({
      baseline: {},
      $metadata: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        pluginVersion: '1.0.0',
        fileKey: 'abc123',
        fileName: 'Test',
      },
    } as any);

    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(loader.saveConfig).mockResolvedValueOnce(undefined);

    await initCommand({ yes: true });

    // Verify no prompts were shown
    expect(prompt.askText).not.toHaveBeenCalled();

    // Verify config was created with env vars
    expect(loader.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        figma: expect.objectContaining({
          fileId: 'abc123',
          accessToken: '${FIGMA_ACCESS_TOKEN}',
        }),
      }),
      expect.any(String)
    );

    // Cleanup
    delete process.env.FIGMA_FILE_URL;
    delete process.env.FIGMA_ACCESS_TOKEN;
  });
});
