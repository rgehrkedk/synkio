/**
 * Variable Comparator Tests
 *
 * Tests for token-level comparison logic.
 */

import { describe, it, expect } from 'vitest';
import {
  compareTokens,
  detectDeletedVariables,
  buildBaselineByVarId,
} from './variable-comparator.js';
import type { BaselineEntry } from '../../types/index.js';

describe('variable-comparator', () => {
  describe('buildBaselineByVarId', () => {
    it('should build lookup map by variableId and mode', () => {
      const entries: Record<string, BaselineEntry> = {
        'VariableID:1:1:theme.light': {
          variableId: 'VariableID:1:1',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
        'VariableID:1:1:theme.dark': {
          variableId: 'VariableID:1:1',
          path: 'colors.primary',
          value: '#000',
          type: 'COLOR',
          collection: 'theme',
          mode: 'dark',
        },
      };

      const result = buildBaselineByVarId(entries);

      expect(result.has('VariableID:1:1')).toBe(true);
      expect(result.get('VariableID:1:1')?.has('light')).toBe(true);
      expect(result.get('VariableID:1:1')?.has('dark')).toBe(true);
      expect(result.get('VariableID:1:1')?.get('light')?.value).toBe('#fff');
      expect(result.get('VariableID:1:1')?.get('dark')?.value).toBe('#000');
    });

    it('should extract varId from prefixedId when variableId is not present', () => {
      const entries: Record<string, BaselineEntry> = {
        'var1:light': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      };

      const result = buildBaselineByVarId(entries);

      expect(result.has('var1')).toBe(true);
      expect(result.get('var1')?.has('light')).toBe(true);
    });
  });

  describe('compareTokens', () => {
    it('should detect value changes', () => {
      const baselineByVarId = new Map<string, Map<string, BaselineEntry>>();
      baselineByVarId.set('VariableID:1:1', new Map([
        ['light', {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        }],
      ]));

      const fetchedEntries: Record<string, BaselineEntry> = {
        'VariableID:1:1:theme.light': {
          variableId: 'VariableID:1:1',
          path: 'colors.primary',
          value: '#eee',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      };

      const result = compareTokens(baselineByVarId, fetchedEntries, new Set());

      expect(result.valueChanges.length).toBe(1);
      expect(result.valueChanges[0].oldValue).toBe('#fff');
      expect(result.valueChanges[0].newValue).toBe('#eee');
    });

    it('should detect path changes', () => {
      const baselineByVarId = new Map<string, Map<string, BaselineEntry>>();
      baselineByVarId.set('VariableID:1:1', new Map([
        ['light', {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        }],
      ]));

      const fetchedEntries: Record<string, BaselineEntry> = {
        'VariableID:1:1:theme.light': {
          variableId: 'VariableID:1:1',
          path: 'colors.primary.base',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      };

      const result = compareTokens(baselineByVarId, fetchedEntries, new Set());

      expect(result.pathChanges.length).toBe(1);
      expect(result.pathChanges[0].oldPath).toBe('colors.primary');
      expect(result.pathChanges[0].newPath).toBe('colors.primary.base');
    });

    it('should detect new variables', () => {
      const baselineByVarId = new Map<string, Map<string, BaselineEntry>>();

      const fetchedEntries: Record<string, BaselineEntry> = {
        'VariableID:2:1:theme.light': {
          variableId: 'VariableID:2:1',
          path: 'colors.secondary',
          value: '#000',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      };

      const result = compareTokens(baselineByVarId, fetchedEntries, new Set());

      expect(result.newVariables.length).toBe(1);
      expect(result.newVariables[0].path).toBe('colors.secondary');
    });

    it('should detect simultaneous path and value changes', () => {
      const baselineByVarId = new Map<string, Map<string, BaselineEntry>>();
      baselineByVarId.set('VariableID:1:1', new Map([
        ['light', {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        }],
      ]));

      const fetchedEntries: Record<string, BaselineEntry> = {
        'VariableID:1:1:theme.light': {
          variableId: 'VariableID:1:1',
          path: 'colors.primary.base',
          value: '#eee',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      };

      const result = compareTokens(baselineByVarId, fetchedEntries, new Set());

      expect(result.pathChanges.length).toBe(1);
      expect(result.valueChanges.length).toBe(1);
    });
  });

  describe('detectDeletedVariables', () => {
    it('should detect deleted variables', () => {
      const baselineEntries: Record<string, BaselineEntry> = {
        'VariableID:1:1:theme.light': {
          variableId: 'VariableID:1:1',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
        'VariableID:1:2:theme.light': {
          variableId: 'VariableID:1:2',
          path: 'colors.secondary',
          value: '#000',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      };

      const fetchedEntries: Record<string, BaselineEntry> = {
        'VariableID:1:1:theme.light': {
          variableId: 'VariableID:1:1',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      };

      const result = detectDeletedVariables(
        baselineEntries,
        fetchedEntries,
        new Set(),
        new Set()
      );

      expect(result.length).toBe(1);
      expect(result[0].path).toBe('colors.secondary');
    });

    it('should exclude variables from deleted modes', () => {
      const baselineEntries: Record<string, BaselineEntry> = {
        'VariableID:1:1:theme.light': {
          variableId: 'VariableID:1:1',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      };

      const fetchedEntries: Record<string, BaselineEntry> = {};

      const deletedModeSet = new Set(['theme:light']);
      const renamedModes = new Set<string>();

      const result = detectDeletedVariables(
        baselineEntries,
        fetchedEntries,
        deletedModeSet,
        renamedModes
      );

      expect(result.length).toBe(0);
    });

    it('should exclude variables from renamed modes', () => {
      const baselineEntries: Record<string, BaselineEntry> = {
        'VariableID:1:1:theme.light': {
          variableId: 'VariableID:1:1',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      };

      const fetchedEntries: Record<string, BaselineEntry> = {};

      const deletedModeSet = new Set<string>();
      const renamedModes = new Set(['theme:light']);

      const result = detectDeletedVariables(
        baselineEntries,
        fetchedEntries,
        deletedModeSet,
        renamedModes
      );

      expect(result.length).toBe(0);
    });
  });
});
