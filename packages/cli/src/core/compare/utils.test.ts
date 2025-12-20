/**
 * Compare Utils Tests
 *
 * Tests for comparison utility functions.
 */

import { describe, it, expect } from 'vitest';
import { hasChanges, hasBreakingChanges, getChangeCounts } from './utils.js';
import type { ComparisonResult } from '../../types/index.js';

describe('compare-utils', () => {
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

  describe('hasChanges', () => {
    it('should return false for empty result', () => {
      expect(hasChanges(emptyResult)).toBe(false);
    });

    it('should return true when there are value changes', () => {
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
      expect(hasChanges(result)).toBe(true);
    });

    it('should return true when there are path changes', () => {
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
      expect(hasChanges(result)).toBe(true);
    });

    it('should return true when there are new variables', () => {
      const result: ComparisonResult = {
        ...emptyResult,
        newVariables: [
          {
            variableId: 'var2',
            path: 'colors.secondary',
            value: '#000',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        ],
      };
      expect(hasChanges(result)).toBe(true);
    });
  });

  describe('hasBreakingChanges', () => {
    it('should return false for empty result', () => {
      expect(hasBreakingChanges(emptyResult)).toBe(false);
    });

    it('should return false for value changes only', () => {
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
      expect(hasBreakingChanges(result)).toBe(false);
    });

    it('should return true for path changes', () => {
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
      expect(hasBreakingChanges(result)).toBe(true);
    });

    it('should return true for deleted variables', () => {
      const result: ComparisonResult = {
        ...emptyResult,
        deletedVariables: [
          {
            variableId: 'var1',
            path: 'colors.old',
            value: '#ccc',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        ],
      };
      expect(hasBreakingChanges(result)).toBe(true);
    });

    it('should return true for collection renames', () => {
      const result: ComparisonResult = {
        ...emptyResult,
        collectionRenames: [
          { oldCollection: 'base', newCollection: 'tokens', modeMapping: [] },
        ],
      };
      expect(hasBreakingChanges(result)).toBe(true);
    });

    it('should return true for mode renames', () => {
      const result: ComparisonResult = {
        ...emptyResult,
        modeRenames: [
          { collection: 'theme', oldMode: 'light', newMode: 'day' },
        ],
      };
      expect(hasBreakingChanges(result)).toBe(true);
    });
  });

  describe('getChangeCounts', () => {
    it('should return zero counts for empty result', () => {
      const counts = getChangeCounts(emptyResult);

      expect(counts.valueChanges).toBe(0);
      expect(counts.pathChanges).toBe(0);
      expect(counts.collectionRenames).toBe(0);
      expect(counts.modeRenames).toBe(0);
      expect(counts.newModes).toBe(0);
      expect(counts.deletedModes).toBe(0);
      expect(counts.newVariables).toBe(0);
      expect(counts.deletedVariables).toBe(0);
      expect(counts.total).toBe(0);
      expect(counts.breaking).toBe(0);
    });

    it('should calculate correct counts', () => {
      const result: ComparisonResult = {
        valueChanges: [
          { variableId: 'v1', path: 'p1', oldValue: 'a', newValue: 'b', type: 'COLOR' },
          { variableId: 'v2', path: 'p2', oldValue: 'c', newValue: 'd', type: 'COLOR' },
        ],
        pathChanges: [
          { variableId: 'v3', oldPath: 'old', newPath: 'new', value: 'x', type: 'COLOR' },
        ],
        collectionRenames: [
          { oldCollection: 'base', newCollection: 'tokens', modeMapping: [] },
        ],
        modeRenames: [
          { collection: 'theme', oldMode: 'light', newMode: 'day' },
          { collection: 'theme', oldMode: 'dark', newMode: 'night' },
        ],
        newModes: [
          { collection: 'theme', mode: 'contrast' },
        ],
        deletedModes: [],
        newVariables: [
          { variableId: 'v4', path: 'p4', value: 'y', type: 'COLOR', collection: 'c', mode: 'm' },
        ],
        deletedVariables: [
          { variableId: 'v5', path: 'p5', value: 'z', type: 'COLOR', collection: 'c', mode: 'm' },
        ],
      };

      const counts = getChangeCounts(result);

      expect(counts.valueChanges).toBe(2);
      expect(counts.pathChanges).toBe(1);
      expect(counts.collectionRenames).toBe(1);
      expect(counts.modeRenames).toBe(2);
      expect(counts.newModes).toBe(1);
      expect(counts.deletedModes).toBe(0);
      expect(counts.newVariables).toBe(1);
      expect(counts.deletedVariables).toBe(1);
      expect(counts.total).toBe(9);
      expect(counts.breaking).toBe(6); // path + collection + mode renames + new modes + deleted vars
    });
  });
});
