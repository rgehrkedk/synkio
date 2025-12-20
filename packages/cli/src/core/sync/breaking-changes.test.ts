/**
 * Breaking Changes Module Tests
 *
 * Tests for breaking changes detection and display.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  displayBreakingChanges,
  shouldBlockSync,
  formatBreakingChangesSummary,
} from './breaking-changes.js';
import type { ComparisonResult, StyleComparisonResult } from '../../types/index.js';

// Mock chalk to simplify output testing
vi.mock('chalk', () => ({
  default: {
    yellow: (s: string) => s,
    red: (s: string) => s,
    dim: (s: string) => s,
    cyan: (s: string) => s,
  },
}));

describe('breaking-changes', () => {
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

  const emptyStyleResult: StyleComparisonResult = {
    valueChanges: [],
    pathChanges: [],
    newStyles: [],
    deletedStyles: [],
  };

  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('shouldBlockSync', () => {
    it('should return false for no breaking changes', () => {
      expect(shouldBlockSync(emptyResult, emptyStyleResult, false)).toBe(false);
    });

    it('should return false when force is true', () => {
      const resultWithBreaking: ComparisonResult = {
        ...emptyResult,
        pathChanges: [
          { variableId: 'v1', oldPath: 'old', newPath: 'new', value: '#fff', type: 'COLOR' },
        ],
      };
      expect(shouldBlockSync(resultWithBreaking, emptyStyleResult, true)).toBe(false);
    });

    it('should return true for path changes without force', () => {
      const resultWithBreaking: ComparisonResult = {
        ...emptyResult,
        pathChanges: [
          { variableId: 'v1', oldPath: 'old', newPath: 'new', value: '#fff', type: 'COLOR' },
        ],
      };
      expect(shouldBlockSync(resultWithBreaking, emptyStyleResult, false)).toBe(true);
    });

    it('should return true for deleted variables without force', () => {
      const resultWithBreaking: ComparisonResult = {
        ...emptyResult,
        deletedVariables: [
          { variableId: 'v1', path: 'deleted', value: '#ccc', type: 'COLOR', collection: 'c', mode: 'm' },
        ],
      };
      expect(shouldBlockSync(resultWithBreaking, emptyStyleResult, false)).toBe(true);
    });

    it('should return true for style path changes without force', () => {
      const styleResultWithBreaking: StyleComparisonResult = {
        ...emptyStyleResult,
        pathChanges: [
          { styleId: 's1', oldPath: 'old', newPath: 'new', value: {}, styleType: 'paint' },
        ],
      };
      expect(shouldBlockSync(emptyResult, styleResultWithBreaking, false)).toBe(true);
    });
  });

  describe('formatBreakingChangesSummary', () => {
    it('should return empty array for no breaking changes', () => {
      const summary = formatBreakingChangesSummary(emptyResult, emptyStyleResult);
      expect(summary).toEqual([]);
    });

    it('should include path changes count', () => {
      const result: ComparisonResult = {
        ...emptyResult,
        pathChanges: [
          { variableId: 'v1', oldPath: 'old1', newPath: 'new1', value: '#fff', type: 'COLOR' },
          { variableId: 'v2', oldPath: 'old2', newPath: 'new2', value: '#000', type: 'COLOR' },
        ],
      };
      const summary = formatBreakingChangesSummary(result, emptyStyleResult);
      expect(summary).toContain('Path changes: 2');
    });

    it('should include collection renames', () => {
      const result: ComparisonResult = {
        ...emptyResult,
        collectionRenames: [
          { oldCollection: 'base', newCollection: 'tokens', modeMapping: [] },
        ],
      };
      const summary = formatBreakingChangesSummary(result, emptyStyleResult);
      expect(summary).toContain('Collection renames: 1');
    });

    it('should include style breaking changes', () => {
      const styleResult: StyleComparisonResult = {
        ...emptyStyleResult,
        deletedStyles: [
          { styleId: 's1', path: 'deleted', value: {}, styleType: 'paint' },
        ],
      };
      const summary = formatBreakingChangesSummary(emptyResult, styleResult);
      expect(summary).toContain('Deleted styles: 1');
    });
  });

  describe('displayBreakingChanges', () => {
    it('should display header for breaking changes', () => {
      const result: ComparisonResult = {
        ...emptyResult,
        pathChanges: [
          { variableId: 'v1', oldPath: 'old', newPath: 'new', value: '#fff', type: 'COLOR' },
        ],
      };

      displayBreakingChanges(result, emptyStyleResult);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('BREAKING CHANGES DETECTED'));
    });

    it('should truncate long lists to 5 items', () => {
      const pathChanges = Array.from({ length: 10 }, (_, i) => ({
        variableId: `v${i}`,
        oldPath: `old${i}`,
        newPath: `new${i}`,
        value: '#fff',
        type: 'COLOR',
      }));

      const result: ComparisonResult = {
        ...emptyResult,
        pathChanges,
      };

      displayBreakingChanges(result, emptyStyleResult);

      // Should show "and 5 more"
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('and 5 more'));
    });
  });
});
