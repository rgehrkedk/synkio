/**
 * Rollback Command Tests
 *
 * Tests for the rollback command (synkio rollback)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as files from '../../files/index.js';
import * as compare from '../../compare/index.js';
import * as prompt from '../prompt.js';

// Mock modules BEFORE importing the command
vi.mock('../../files/index.js');
vi.mock('../../compare/index.js');
vi.mock('../prompt.js');

// NOW import the command under test
import { rollbackCommand } from './rollback-cmd.js';

describe('rollback command', () => {
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

  const mockCurrentBaseline = {
    baseline: {},
    collections: { 'col-1': { name: 'Current' } },
    variables: {},
  };

  const mockPreviousBaseline = {
    baseline: {},
    collections: { 'col-1': { name: 'Previous' } },
    variables: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(files.loadConfigOrThrow).mockReturnValue(mockConfig as any);
    vi.mocked(files.getBaselinePath).mockReturnValue('.synkio/data/baseline.json');

    vi.mocked(prompt.createPrompt).mockReturnValue({
      question: vi.fn(),
      close: vi.fn(),
    } as any);
  });

  it('should restore previous baseline', async () => {
    vi.mocked(files.loadBaseline)
      .mockReturnValueOnce(mockPreviousBaseline) // previous
      .mockReturnValueOnce(mockCurrentBaseline); // current

    vi.mocked(compare.compareBaselines).mockReturnValue({
      valueChanges: [{ path: 'test', oldValue: 'a', newValue: 'b' }],
      pathChanges: [],
      newVariables: [],
      deletedVariables: [],
      breakingChanges: [],
    } as any);

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

    vi.mocked(prompt.askYesNo).mockResolvedValue(true);

    await rollbackCommand({ force: false });

    expect(files.restoreBaseline).toHaveBeenCalled();
  });

  it('should skip confirmation with --force flag', async () => {
    vi.mocked(files.loadBaseline)
      .mockReturnValueOnce(mockPreviousBaseline)
      .mockReturnValueOnce(mockCurrentBaseline);

    vi.mocked(compare.compareBaselines).mockReturnValue({
      valueChanges: [{ path: 'test', oldValue: 'a', newValue: 'b' }],
      pathChanges: [],
      newVariables: [],
      deletedVariables: [],
      breakingChanges: [],
    } as any);

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

    await rollbackCommand({ force: true });

    // Should not prompt
    expect(prompt.askYesNo).not.toHaveBeenCalled();
    // Should restore
    expect(files.restoreBaseline).toHaveBeenCalled();
  });

  it('should error when no previous baseline exists', async () => {
    vi.mocked(files.loadBaseline).mockReturnValue(null);

    await expect(rollbackCommand({})).rejects.toThrow(/no previous baseline/i);
  });

  it('should not restore if user cancels confirmation', async () => {
    vi.mocked(files.loadBaseline)
      .mockReturnValueOnce(mockPreviousBaseline)
      .mockReturnValueOnce(mockCurrentBaseline);

    vi.mocked(compare.compareBaselines).mockReturnValue({
      valueChanges: [{ path: 'test', oldValue: 'a', newValue: 'b' }],
      pathChanges: [],
      newVariables: [],
      deletedVariables: [],
      breakingChanges: [],
    } as any);

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

    vi.mocked(prompt.askYesNo).mockResolvedValue(false);

    await rollbackCommand({ force: false });

    // Should not restore
    expect(files.restoreBaseline).not.toHaveBeenCalled();
  });
});
