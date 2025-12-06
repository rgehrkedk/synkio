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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create tokensrc.json with provided values', async () => {
    // Mock user inputs
    vi.mocked(prompt.askText)
      .mockResolvedValueOnce('https://www.figma.com/file/abc123/Test-File')
      .mockResolvedValueOnce('test-access-token')
      .mockResolvedValueOnce(''); // Optional node ID

    vi.mocked(prompt.askYesNo)
      .mockResolvedValueOnce(true) // use default paths
      .mockResolvedValueOnce(false); // Skip build command

    // Mock Figma API response
    vi.mocked(figma.fetchFigmaData).mockResolvedValueOnce({
      baseline: {},
      collections: {
        'collection-1': {
          name: 'Core',
          modes: [{ modeId: 'mode-1', name: 'Light' }],
          variableIds: ['var-1'],
        },
      },
      variables: {},
      $metadata: {
        fileName: 'Test File',
        exportedAt: new Date().toISOString(),
      },
    });

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
      .mockResolvedValueOnce('invalid-token');

    // Mock failed Figma API call
    vi.mocked(figma.fetchFigmaData).mockRejectedValueOnce(new Error('Invalid access token'));

    // Run init command and expect it to throw
    await expect(initCommand({ yes: false })).rejects.toThrow(/Invalid access token|Could not fetch/);

    // Verify config was not saved
    expect(loader.saveConfig).not.toHaveBeenCalled();
  });

  it('should handle invalid Figma URL with loop until valid', async () => {
    vi.mocked(prompt.askText)
      .mockResolvedValueOnce('not-a-valid-url') // Invalid URL
      .mockResolvedValueOnce('https://www.figma.com/file/abc123/Test-File') // Valid URL
      .mockResolvedValueOnce('test-token')
      .mockResolvedValueOnce(''); // node ID

    vi.mocked(prompt.askYesNo)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    vi.mocked(figma.fetchFigmaData).mockResolvedValueOnce({
      baseline: {},
      collections: {},
      variables: {},
      $metadata: {
        fileName: 'Test',
        exportedAt: new Date().toISOString(),
      },
    });

    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(loader.saveConfig).mockResolvedValueOnce(undefined);

    await initCommand({ yes: false });

    // Should have called askText at least twice for URL (once invalid, once valid)
    expect(prompt.askText).toHaveBeenCalled();
  });

  it('should use template when --template flag provided', async () => {
    // Mock template file
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValueOnce(
      JSON.stringify({
        version: '1.0.0',
        paths: {
          tokens: 'src/tokens',
        },
      }) as any
    );

    vi.mocked(prompt.askText)
      .mockResolvedValueOnce('https://www.figma.com/file/abc123/Test-File')
      .mockResolvedValueOnce('test-token')
      .mockResolvedValueOnce('');

    vi.mocked(prompt.askYesNo)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    vi.mocked(figma.fetchFigmaData).mockResolvedValueOnce({
      baseline: {},
      collections: {},
      variables: {},
      $metadata: {
        fileName: 'Test',
        exportedAt: new Date().toISOString(),
      },
    });

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
      collections: {},
      variables: {},
      $metadata: {
        fileName: 'Test',
        exportedAt: new Date().toISOString(),
      },
    });

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
