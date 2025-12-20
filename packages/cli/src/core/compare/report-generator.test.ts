/**
 * Report Generator Tests
 *
 * Tests for markdown report generation.
 */

import { describe, it, expect } from 'vitest';
import {
  generateDiffReport,
  generateSummaryTable,
  generateValueChangesSection,
  generatePathChangesSection,
} from './report-generator.js';
import type { ComparisonResult } from '../../types/index.js';

describe('report-generator', () => {
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

  describe('generateSummaryTable', () => {
    it('should generate markdown summary table', () => {
      const counts = {
        valueChanges: 3,
        pathChanges: 1,
        collectionRenames: 0,
        modeRenames: 2,
        newModes: 1,
        deletedModes: 0,
        newVariables: 5,
        deletedVariables: 1,
        total: 13,
        breaking: 5,
      };

      const result = generateSummaryTable(counts);

      expect(result).toContain('| Category | Count |');
      expect(result).toContain('| Value Changes | 3 |');
      expect(result).toContain('| Path Changes (BREAKING) | 1 |');
      expect(result).toContain('| Mode Renames (BREAKING) | 2 |');
      expect(result).toContain('| New Variables | 5 |');
    });
  });

  describe('generateValueChangesSection', () => {
    it('should generate markdown for value changes', () => {
      const valueChanges = [
        {
          variableId: 'VariableID:1:1',
          path: 'colors.primary',
          oldValue: '#fff',
          newValue: '#eee',
          type: 'COLOR',
        },
      ];

      const result = generateValueChangesSection(valueChanges);

      expect(result).toContain('## Value Changes (1)');
      expect(result).toContain('### `colors.primary`');
      expect(result).toContain('**Old value:** `"#fff"`');
      expect(result).toContain('**New value:** `"#eee"`');
    });

    it('should return empty string for no changes', () => {
      const result = generateValueChangesSection([]);
      expect(result).toBe('');
    });
  });

  describe('generatePathChangesSection', () => {
    it('should generate markdown for path changes', () => {
      const pathChanges = [
        {
          variableId: 'VariableID:1:1',
          oldPath: 'colors.primary',
          newPath: 'colors.primary.base',
          value: '#fff',
          type: 'COLOR',
        },
      ];

      const result = generatePathChangesSection(pathChanges);

      expect(result).toContain('## Path Changes - BREAKING (1)');
      expect(result).toContain('**Old path:** `colors.primary`');
      expect(result).toContain('**New path:** `colors.primary.base`');
    });
  });

  describe('generateDiffReport', () => {
    it('should generate full report with header', () => {
      const result = generateDiffReport(emptyResult, {
        fileName: 'test.json',
        exportedAt: '2025-01-01T00:00:00Z',
      });

      expect(result).toContain('# Figma Token Comparison Report');
      expect(result).toContain('**File:** test.json');
      expect(result).toContain('**No changes detected!**');
    });

    it('should include all sections with changes', () => {
      const resultWithChanges: ComparisonResult = {
        valueChanges: [
          {
            variableId: 'VariableID:1:1',
            path: 'colors.primary',
            oldValue: '#fff',
            newValue: '#eee',
            type: 'COLOR',
          },
        ],
        pathChanges: [
          {
            variableId: 'VariableID:1:2',
            oldPath: 'spacing.small',
            newPath: 'spacing.xs',
            value: '8px',
            type: 'DIMENSION',
          },
        ],
        collectionRenames: [
          { oldCollection: 'base', newCollection: 'tokens', modeMapping: [] },
        ],
        modeRenames: [
          { collection: 'theme', oldMode: 'light', newMode: 'day' },
        ],
        newModes: [{ collection: 'theme', mode: 'night' }],
        deletedModes: [{ collection: 'old', mode: 'deprecated' }],
        newVariables: [
          {
            variableId: 'VariableID:2:1',
            path: 'colors.secondary',
            value: '#000',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        ],
        deletedVariables: [
          {
            variableId: 'VariableID:3:1',
            path: 'colors.tertiary',
            value: '#333',
            type: 'COLOR',
            collection: 'theme',
            mode: 'light',
          },
        ],
      };

      const result = generateDiffReport(resultWithChanges);

      expect(result).toContain('## Value Changes (1)');
      expect(result).toContain('## Path Changes - BREAKING (1)');
      expect(result).toContain('## Collection Renames - BREAKING (1)');
      expect(result).toContain('## Mode Renames - BREAKING (1)');
      expect(result).toContain('## New Modes - BREAKING (1)');
      expect(result).toContain('## Deleted Modes - BREAKING (1)');
      expect(result).toContain('## New Variables (1)');
      expect(result).toContain('## Deleted Variables - BREAKING (1)');
    });
  });
});
