/**
 * Console Display Tests
 *
 * Tests for console output formatting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  printDiffSummary,
  printCountsSummary,
  printBreakingChangesDetails,
  printNewVariables,
  printValueChanges,
} from './console-display.js';
import type { ComparisonResult } from '../../types/index.js';

describe('console-display', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let logOutput: string[];

  beforeEach(() => {
    logOutput = [];
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      logOutput.push(args.join(' '));
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  const emptyResult: ComparisonResult = {
    valueChanges: [],
    pathChanges: [],
    collectionRenames: [],
    modeRenames: [],
    newModes: [],
    deletedModes: [],
    newVariables: [],
    deletedVariables: [],
  };

  describe('printDiffSummary', () => {
    it('should print "No changes detected" for empty result', () => {
      printDiffSummary(emptyResult);

      const output = logOutput.join('\n');
      expect(output).toContain('Comparison Summary');
      expect(output).toContain('No changes detected.');
    });

    it('should print summary with changes', () => {
      const result: ComparisonResult = {
        ...emptyResult,
        valueChanges: [
          {
            variableId: 'var1',
            path: 'colors.primary',
            oldValue: '#fff',
            newValue: '#eee',
            type: 'COLOR',
          },
        ],
      };

      printDiffSummary(result);

      const output = logOutput.join('\n');
      expect(output).toContain('Value changes:        1');
      expect(output).toContain('Total changes: 1');
    });
  });

  describe('printCountsSummary', () => {
    it('should print all counts with BREAKING markers', () => {
      const counts = {
        valueChanges: 2,
        pathChanges: 1,
        collectionRenames: 1,
        modeRenames: 2,
        newModes: 0,
        deletedModes: 1,
        newVariables: 3,
        deletedVariables: 1,
        total: 11,
        breaking: 6,
      };

      printCountsSummary(counts);

      const output = logOutput.join('\n');
      expect(output).toContain('Value changes:        2');
      expect(output).toContain('Path changes:         1 (BREAKING)');
      expect(output).toContain('Collection renames:   1 (BREAKING)');
      expect(output).toContain('Mode renames:         2 (BREAKING)');
      expect(output).toContain('Deleted modes:        1 (BREAKING)');
      expect(output).toContain('Total changes: 11');
      expect(output).toContain('Breaking changes: 6');
    });

    it('should not show BREAKING marker for zero counts', () => {
      const counts = {
        valueChanges: 1,
        pathChanges: 0,
        collectionRenames: 0,
        modeRenames: 0,
        newModes: 0,
        deletedModes: 0,
        newVariables: 0,
        deletedVariables: 0,
        total: 1,
        breaking: 0,
      };

      printCountsSummary(counts);

      const output = logOutput.join('\n');
      expect(output).toContain('Path changes:         0 ');
      expect(output).not.toContain('Breaking changes:');
    });
  });

  describe('printBreakingChangesDetails', () => {
    it('should print path changes', () => {
      const result: ComparisonResult = {
        ...emptyResult,
        pathChanges: [
          {
            variableId: 'var1',
            oldPath: 'colors.primary',
            newPath: 'colors.primary.base',
            value: '#fff',
            type: 'COLOR',
          },
        ],
      };

      printBreakingChangesDetails(result, {
        valueChanges: 0, pathChanges: 1, collectionRenames: 0, modeRenames: 0,
        newModes: 0, deletedModes: 0, newVariables: 0, deletedVariables: 0,
        total: 1, breaking: 1
      });

      const output = logOutput.join('\n');
      expect(output).toContain('Path changes (1):');
      expect(output).toContain('colors.primary');
      expect(output).toContain('-> colors.primary.base');
    });

    it('should print collection renames', () => {
      const result: ComparisonResult = {
        ...emptyResult,
        collectionRenames: [
          { oldCollection: 'base', newCollection: 'tokens', modeMapping: [] },
        ],
      };

      printBreakingChangesDetails(result, {
        valueChanges: 0, pathChanges: 0, collectionRenames: 1, modeRenames: 0,
        newModes: 0, deletedModes: 0, newVariables: 0, deletedVariables: 0,
        total: 1, breaking: 1
      });

      const output = logOutput.join('\n');
      expect(output).toContain('Collection renames (1):');
      expect(output).toContain('base -> tokens');
    });

    it('should not print anything when no breaking changes', () => {
      printBreakingChangesDetails(emptyResult, {
        valueChanges: 0, pathChanges: 0, collectionRenames: 0, modeRenames: 0,
        newModes: 0, deletedModes: 0, newVariables: 0, deletedVariables: 0,
        total: 0, breaking: 0
      });

      expect(logOutput.length).toBe(0);
    });
  });

  describe('printNewVariables', () => {
    it('should print new variables list', () => {
      const newVariables = [
        {
          variableId: 'var1',
          path: 'colors.secondary',
          value: '#000',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
        {
          variableId: 'var2',
          path: 'spacing.large',
          value: '24px',
          type: 'DIMENSION',
          collection: 'globals',
          mode: 'default',
        },
      ];

      printNewVariables(newVariables);

      const output = logOutput.join('\n');
      expect(output).toContain('New variables');
      expect(output).toContain('+ colors.secondary (COLOR)');
      expect(output).toContain('+ spacing.large (DIMENSION)');
    });

    it('should not print anything for empty array', () => {
      printNewVariables([]);
      expect(logOutput.length).toBe(0);
    });
  });

  describe('printValueChanges', () => {
    it('should print value changes with old and new values', () => {
      const valueChanges = [
        {
          variableId: 'var1',
          path: 'colors.primary',
          oldValue: '#fff',
          newValue: '#eee',
          type: 'COLOR',
        },
      ];

      printValueChanges(valueChanges);

      const output = logOutput.join('\n');
      expect(output).toContain('Value changes');
      expect(output).toContain('colors.primary');
      expect(output).toContain('"#fff" -> "#eee"');
    });

    it('should not print anything for empty array', () => {
      printValueChanges([]);
      expect(logOutput.length).toBe(0);
    });
  });
});
