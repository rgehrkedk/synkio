// =============================================================================
// Compare Tests - ID-based Diffing
// =============================================================================

import { describe, it, expect } from 'vitest';
import { compareBaselines, countChanges } from './compare';
import { BaselineData } from './types';

// Helper to create baseline data
function createBaseline(entries: Array<{
  variableId: string;
  path: string;
  value: unknown;
  type?: string;
  collection: string;
  mode: string;
  collectionId?: string;
  modeId?: string;
}>): BaselineData {
  const baseline: Record<string, unknown> = {};
  for (const entry of entries) {
    const key = `${entry.collection}/${entry.mode}/${entry.path}`;
    baseline[key] = {
      variableId: entry.variableId,
      path: entry.path,
      value: entry.value,
      type: entry.type || 'string',
      collection: entry.collection,
      mode: entry.mode,
      collectionId: entry.collectionId,
      modeId: entry.modeId,
    };
  }
  return {
    baseline: baseline as BaselineData['baseline'],
    metadata: { syncedAt: new Date().toISOString() },
  };
}

describe('compareBaselines', () => {
  describe('value changes', () => {
    it('should detect value changes', () => {
      const oldBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'light' },
      ]);
      const newBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#0000ff', collection: 'theme', mode: 'light' },
      ]);

      const result = compareBaselines(oldBaseline, newBaseline);

      expect(result.valueChanges).toHaveLength(1);
      expect(result.valueChanges[0]).toMatchObject({
        variableId: 'var1',
        path: 'colors.primary',
        oldValue: '#ff0000',
        newValue: '#0000ff',
      });
    });

    it('should not report changes when values are equal', () => {
      const oldBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'light' },
      ]);
      const newBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'light' },
      ]);

      const result = compareBaselines(oldBaseline, newBaseline);

      expect(result.valueChanges).toHaveLength(0);
      expect(countChanges(result)).toBe(0);
    });
  });

  describe('path changes (renames)', () => {
    it('should detect path changes using variable ID', () => {
      const oldBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'light' },
      ]);
      const newBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.brand.primary', value: '#ff0000', collection: 'theme', mode: 'light' },
      ]);

      const result = compareBaselines(oldBaseline, newBaseline);

      expect(result.pathChanges).toHaveLength(1);
      expect(result.pathChanges[0]).toMatchObject({
        variableId: 'var1',
        oldPath: 'colors.primary',
        newPath: 'colors.brand.primary',
      });
      expect(result.deletedVariables).toHaveLength(0);
      expect(result.newVariables).toHaveLength(0);
    });
  });

  describe('new and deleted variables', () => {
    it('should detect new variables', () => {
      const oldBaseline = createBaseline([]);
      const newBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'light' },
      ]);

      const result = compareBaselines(oldBaseline, newBaseline);

      expect(result.newVariables).toHaveLength(1);
      expect(result.newVariables[0]).toMatchObject({
        variableId: 'var1',
        path: 'colors.primary',
      });
    });

    it('should detect deleted variables', () => {
      const oldBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'light' },
      ]);
      const newBaseline = createBaseline([]);

      const result = compareBaselines(oldBaseline, newBaseline);

      expect(result.deletedVariables).toHaveLength(1);
      expect(result.deletedVariables[0]).toMatchObject({
        variableId: 'var1',
        path: 'colors.primary',
      });
    });
  });

  describe('mode changes', () => {
    it('should detect new modes', () => {
      const oldBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'light' },
      ]);
      const newBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'light' },
        { variableId: 'var1', path: 'colors.primary', value: '#0000ff', collection: 'theme', mode: 'dark' },
      ]);

      const result = compareBaselines(oldBaseline, newBaseline);

      expect(result.newModes).toHaveLength(1);
      expect(result.newModes[0]).toMatchObject({
        collection: 'theme',
        mode: 'dark',
      });
    });

    it('should detect deleted modes', () => {
      const oldBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'light' },
        { variableId: 'var1', path: 'colors.primary', value: '#0000ff', collection: 'theme', mode: 'dark' },
      ]);
      const newBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'light' },
      ]);

      const result = compareBaselines(oldBaseline, newBaseline);

      expect(result.deletedModes).toHaveLength(1);
      expect(result.deletedModes[0]).toMatchObject({
        collection: 'theme',
        mode: 'dark',
      });
    });

    it('should detect mode renames using modeId', () => {
      const oldBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'light', modeId: 'mode1' },
      ]);
      const newBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'theme', mode: 'default', modeId: 'mode1' },
      ]);

      const result = compareBaselines(oldBaseline, newBaseline);

      expect(result.modeRenames).toHaveLength(1);
      expect(result.modeRenames[0]).toMatchObject({
        collection: 'theme',
        oldMode: 'light',
        newMode: 'default',
      });
      // Should NOT report as new/deleted when it's a rename
      expect(result.newModes).toHaveLength(0);
      expect(result.deletedModes).toHaveLength(0);
    });
  });

  describe('collection renames', () => {
    it('should detect collection renames using collectionId', () => {
      const oldBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'Theme', mode: 'light', collectionId: 'col1' },
      ]);
      const newBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000', collection: 'Tokens', mode: 'light', collectionId: 'col1' },
      ]);

      const result = compareBaselines(oldBaseline, newBaseline);

      expect(result.collectionRenames).toHaveLength(1);
      expect(result.collectionRenames[0]).toMatchObject({
        oldCollection: 'Theme',
        newCollection: 'Tokens',
      });
    });
  });

  describe('alias handling', () => {
    it('should treat both sides as aliases as equal', () => {
      const oldBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: { $ref: 'VariableID:123:456' }, collection: 'theme', mode: 'light' },
      ]);
      const newBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.primary', value: '{colors.blue.500}', collection: 'theme', mode: 'light' },
      ]);

      const result = compareBaselines(oldBaseline, newBaseline);

      // Both are aliases, so no value change should be detected
      expect(result.valueChanges).toHaveLength(0);
    });
  });

  describe('countChanges', () => {
    it('should count all changes', () => {
      const oldBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.a', value: '#111', collection: 'theme', mode: 'light' },
        { variableId: 'var2', path: 'colors.b', value: '#222', collection: 'theme', mode: 'light' },
        { variableId: 'var3', path: 'colors.c', value: '#333', collection: 'theme', mode: 'light' },
      ]);
      const newBaseline = createBaseline([
        { variableId: 'var1', path: 'colors.a', value: '#999', collection: 'theme', mode: 'light' }, // value change
        { variableId: 'var2', path: 'colors.renamed', value: '#222', collection: 'theme', mode: 'light' }, // path change
        // var3 deleted
        { variableId: 'var4', path: 'colors.d', value: '#444', collection: 'theme', mode: 'light' }, // new
      ]);

      const result = compareBaselines(oldBaseline, newBaseline);
      const count = countChanges(result);

      expect(count).toBe(4); // 1 value + 1 path + 1 deleted + 1 new
    });
  });
});
