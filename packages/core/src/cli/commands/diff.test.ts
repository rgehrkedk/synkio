/**
 * Diff Command Tests
 *
 * Tests for the diff command (synkio diff)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as figma from '../../figma/index.js';
import * as files from '../../files/index.js';
import * as compare from '../../compare/index.js';

// Mock modules BEFORE importing the command
vi.mock('../../figma/index.js');
vi.mock('../../files/index.js');
vi.mock('../../compare/index.js');

// NOW import the command under test
import { diffCommand } from './diff-cmd.js';

describe('diff command', () => {
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

  const mockBaseline = {
    baseline: {},
    collections: {},
    variables: {},
    $metadata: {
      fileName: 'Test',
      exportedAt: new Date().toISOString(),
    },
  };

  const mockComparison = {
    valueChanges: [
      {
        path: 'color.primary',
        oldValue: '#FF0000',
        newValue: '#00FF00',
        type: 'modified',
      },
    ],
    pathChanges: [],
    newVariables: [],
    deletedVariables: [],
    breakingChanges: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(files.loadConfigOrThrow).mockReturnValue(mockConfig as any);
    vi.mocked(files.loadBaseline).mockReturnValue(mockBaseline);
    vi.mocked(files.getBaselinePath).mockReturnValue('.synkio/data/baseline.json');
    vi.mocked(figma.fetchFigmaData).mockResolvedValue(mockBaseline);
    vi.mocked(compare.compareBaselines).mockReturnValue(mockComparison as any);
    vi.mocked(compare.hasChanges).mockReturnValue(true);
    vi.mocked(compare.getChangeCounts).mockReturnValue({
      total: 1,
      breaking: 0,
      nonBreaking: 1,
    });
  });

  it('should compare Figma tokens with local baseline', async () => {
    await diffCommand({});

    expect(figma.fetchFigmaData).toHaveBeenCalled();
    expect(compare.compareBaselines).toHaveBeenCalled();
  });

  it('should output in table format by default', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    await diffCommand({ format: 'table' });

    // Should output table
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should output in JSON format when requested', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    await diffCommand({ format: 'json' });

    // Should output JSON
    const output = consoleSpy.mock.calls.find(call =>
      typeof call[0] === 'string' && call[0].includes('{')
    );
    expect(output).toBeDefined();
  });

  it('should compare local files with --local flag', async () => {
    await diffCommand({ local: true });

    // Should not fetch from Figma
    expect(figma.fetchFigmaData).not.toHaveBeenCalled();
    // Should compare local baselines
    expect(compare.compareBaselines).toHaveBeenCalled();
  });
});
