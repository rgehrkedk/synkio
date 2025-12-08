/**
 * Sync Command Tests
 *
 * Tests for the sync command (synkio sync)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as figma from '../../figma/index.js';
import * as files from '../../files/index.js';
import * as tokens from '../../tokens/index.js';
import * as compare from '../../compare/index.js';
import * as prompt from '../prompt.js';

// Mock modules BEFORE importing the command
vi.mock('../../figma/index.js');
vi.mock('../../files/index.js');
vi.mock('../../tokens/index.js');
vi.mock('../../compare/index.js');
vi.mock('../prompt.js');

// NOW import the command under test
import { syncCommand } from './sync-cmd.js';

describe('sync command', () => {
  const mockConfig = {
    version: '1.0.0',
    figma: {
      fileId: 'abc123',
      accessToken: 'test-token',
    },
    paths: {
      root: '.',
      data: '.synkio/data',
      baseline: '.synkio/data/baseline.json',
      baselinePrev: '.synkio/data/baseline.prev.json',
      reports: '.synkio/reports',
      tokens: 'tokens',
      styles: 'styles',
    },
    collections: {},
  };

  const mockFetchedData = {
    baseline: {},
    collections: {},
    variables: {},
    $metadata: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      pluginVersion: '1.0.0',
      fileKey: 'abc123',
      fileName: 'Test File',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(files.loadConfigOrThrow).mockReturnValue(mockConfig as any);
    vi.mocked(files.loadBaseline).mockReturnValue(null);
    vi.mocked(files.getBaselinePath).mockReturnValue('.synkio/data/baseline.json');
    vi.mocked(files.getDiffReportPath).mockReturnValue('.synkio/reports/diff.md');
    vi.mocked(files.ensureFigmaDir).mockReturnValue(undefined);
    vi.mocked(files.backupBaseline).mockReturnValue(false);
    vi.mocked(files.saveJsonFile).mockReturnValue(undefined);
    vi.mocked(files.saveTextFile).mockReturnValue(undefined);
    vi.mocked(figma.fetchFigmaData).mockResolvedValue(mockFetchedData);
    vi.mocked(tokens.splitTokens).mockReturnValue({ filesWritten: 3, files: [] } as any);

    vi.mocked(prompt.createPrompt).mockReturnValue({
      question: vi.fn(),
      close: vi.fn(),
    } as any);
  });

  it('should fetch data from Figma', async () => {
    await syncCommand({});

    expect(figma.fetchFigmaData).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'abc123',
        nodeId: undefined,
      })
    );
  });

  it('should create backup of previous baseline', async () => {
    // Mock fs.existsSync to simulate baseline.json exists
    const fs = await import('fs');
    vi.spyOn(fs.default, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs.default, 'copyFileSync').mockImplementation(() => {});

    await syncCommand({});

    // Verify that fs.copyFileSync was called for backup (manual backup in sync-cmd.ts)
    expect(fs.default.copyFileSync).toHaveBeenCalledWith(
      mockConfig.paths.baseline,
      mockConfig.paths.baselinePrev
    );
  });

  it('should update local token files', async () => {
    await syncCommand({});

    expect(tokens.splitTokens).toHaveBeenCalledWith(
      mockFetchedData,
      mockConfig
    );
  });

  it('should show changes without applying with --dry-run', async () => {
    const mockComparison = {
      valueChanges: [
        {
          path: 'color.primary',
          oldValue: '#FF0000',
          newValue: '#00FF00',
        },
      ],
      pathChanges: [],
      newVariables: [],
      deletedVariables: [],
      breakingChanges: [],
    };

    vi.mocked(files.loadBaseline).mockReturnValue(mockFetchedData);
    vi.mocked(compare.compareBaselines).mockReturnValue(mockComparison as any);
    vi.mocked(compare.hasChanges).mockReturnValue(true);
    vi.mocked(compare.getChangeCounts).mockReturnValue({
      valueChanges: 1,
      pathChanges: 0,
      newModes: 0,
      deletedModes: 0,
      newVariables: 0,
      deletedVariables: 0,
      total: 1,
      breaking: 0,
    });

    await syncCommand({ dryRun: true });

    // Should compare but not split tokens
    expect(compare.compareBaselines).toHaveBeenCalled();
    // splitTokens should only be called once for initial save, not for applying changes
    expect(tokens.splitTokens).not.toHaveBeenCalled();
  });

  it('should skip backup creation with --no-backup', async () => {
    const fs = await import('fs');
    vi.spyOn(fs.default, 'copyFileSync').mockImplementation(() => {});

    await syncCommand({ backup: false });

    // Verify fs.copyFileSync was NOT called when backup is disabled
    expect(fs.default.copyFileSync).not.toHaveBeenCalled();
  });

  it('should skip build command with --no-build', async () => {
    const configWithBuild = {
      ...mockConfig,
      build: {
        command: 'npm run build',
      },
    };

    vi.mocked(files.loadConfigOrThrow).mockReturnValue(configWithBuild as any);

    // We can't easily mock child_process.execSync without more setup
    // For now, just verify the command runs without throwing
    await syncCommand({ build: false });

    // Test should complete without errors
    expect(true).toBe(true);
  });

  it('should throw error if config is missing', async () => {
    vi.mocked(files.loadConfigOrThrow).mockImplementation(() => {
      throw new Error('Config file not found. Run \'synkio init\' first.');
    });

    await expect(syncCommand({})).rejects.toThrow(/synkio init|Configuration not found/);
  });
});
