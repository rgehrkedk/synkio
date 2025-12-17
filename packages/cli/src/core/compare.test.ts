import { describe, it, expect } from 'vitest';
import { compareBaselines, getChangeCounts } from './compare.js';
import { BaselineData } from '../types/index.js';

const base: BaselineData = {
  metadata: { syncedAt: 'yesterday' },
  baseline: {
    'var1:light': { path: 'colors.primary', value: '#fff', type: 'COLOR', collection: 'Default', mode: 'light' },
    'var2:light': { path: 'spacing.small', value: '8px', type: 'DIMENSION', collection: 'Default', mode: 'light' },
    'var3:light': { path: 'radius.round', value: '50%', type: 'DIMENSION', collection: 'Default', mode: 'light' },
  },
};

describe('compareBaselines - Basic Functionality', () => {
  it('should detect no changes when baselines are identical', () => {
    const identicalFetched = JSON.parse(JSON.stringify(base)); // Deep clone
    const result = compareBaselines(base, identicalFetched);
    const counts = getChangeCounts(result);
    expect(counts.total).toBe(0);
  });

  it('should detect value changes', () => {
    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'var1:light': { path: 'colors.primary', value: '#eee', type: 'COLOR', collection: 'Default', mode: 'light' }, // Changed value
        'var2:light': { path: 'spacing.small', value: '8px', type: 'DIMENSION', collection: 'Default', mode: 'light' },
        'var3:light': { path: 'radius.round', value: '50%', type: 'DIMENSION', collection: 'Default', mode: 'light' },
      },
    };
    const result = compareBaselines(base, fetched);
    const counts = getChangeCounts(result);
    expect(counts.total).toBe(1);
    expect(counts.valueChanges).toBe(1);
    expect(result.valueChanges[0].oldValue).toBe('#fff');
    expect(result.valueChanges[0].newValue).toBe('#eee');
  });

  it('should detect path changes (breaking)', () => {
    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'var1:light': { path: 'colors.primary.base', value: '#fff', type: 'COLOR', collection: 'Default', mode: 'light' }, // Changed path
        'var2:light': { path: 'spacing.small', value: '8px', type: 'DIMENSION', collection: 'Default', mode: 'light' },
        'var3:light': { path: 'radius.round', value: '50%', type: 'DIMENSION', collection: 'Default', mode: 'light' },
      },
    };
    const result = compareBaselines(base, fetched);
    const counts = getChangeCounts(result);
    expect(counts.total).toBe(1);
    expect(counts.pathChanges).toBe(1);
    expect(counts.breaking).toBe(1);
    expect(result.pathChanges[0].oldPath).toBe('colors.primary');
    expect(result.pathChanges[0].newPath).toBe('colors.primary.base');
  });

  it('should detect new variables', () => {
    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        ...base.baseline,
        'var4:light': { path: 'opacity.translucent', value: '50%', type: 'NUMBER', collection: 'Default', mode: 'light' }, // New variable
      },
    };
    const result = compareBaselines(base, fetched);
    const counts = getChangeCounts(result);
    expect(counts.total).toBe(1);
    expect(counts.newVariables).toBe(1);
  });

  it('should detect deleted variables (breaking)', () => {
    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'var1:light': { path: 'colors.primary', value: '#fff', type: 'COLOR', collection: 'Default', mode: 'light' },
        // var2 and var3 are deleted
      },
    };
    const result = compareBaselines(base, fetched);
    const counts = getChangeCounts(result);
    expect(counts.total).toBe(2);
    expect(counts.deletedVariables).toBe(2);
    expect(counts.breaking).toBe(2);
  });
});

describe('compareBaselines - ID-Based Rename Detection', () => {
  it('should detect collection rename using collectionId', () => {
    const baseline: BaselineData = {
      metadata: { syncedAt: 'yesterday' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        'VariableID:1:2:base.light': {
          variableId: 'VariableID:1:2',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.secondary',
          value: '#000',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
      },
    };

    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'VariableID:1:1:tokens.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2', // Same ID
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'tokens', // Renamed from 'base'
          mode: 'light',
        },
        'VariableID:1:2:tokens.light': {
          variableId: 'VariableID:1:2',
          collectionId: 'VariableCollectionId:1:2', // Same ID
          modeId: '1:0',
          path: 'colors.secondary',
          value: '#000',
          type: 'COLOR',
          collection: 'tokens', // Renamed from 'base'
          mode: 'light',
        },
      },
    };

    const result = compareBaselines(baseline, fetched);
    const counts = getChangeCounts(result);

    expect(counts.collectionRenames).toBe(1);
    expect(result.collectionRenames[0].oldCollection).toBe('base');
    expect(result.collectionRenames[0].newCollection).toBe('tokens');
    expect(counts.modeRenames).toBe(0); // Mode names unchanged
    expect(counts.valueChanges).toBe(0); // No value changes
  });

  it('should detect mode rename using modeId', () => {
    const baseline: BaselineData = {
      metadata: { syncedAt: 'yesterday' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
      },
    };

    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'VariableID:1:1:base.default': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0', // Same ID
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'default', // Renamed from 'light'
        },
      },
    };

    const result = compareBaselines(baseline, fetched);
    const counts = getChangeCounts(result);

    expect(counts.modeRenames).toBe(1);
    expect(result.modeRenames[0].collection).toBe('base');
    expect(result.modeRenames[0].oldMode).toBe('light');
    expect(result.modeRenames[0].newMode).toBe('default');
    expect(counts.collectionRenames).toBe(0);
    expect(counts.valueChanges).toBe(0);
  });

  it('should detect simultaneous collection and mode renames', () => {
    const baseline: BaselineData = {
      metadata: { syncedAt: 'yesterday' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        'VariableID:1:1:base.dark': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:1',
          path: 'colors.primary',
          value: '#000',
          type: 'COLOR',
          collection: 'base',
          mode: 'dark',
        },
      },
    };

    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'VariableID:1:1:tokens.default': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2', // Same collection ID
          modeId: '1:0', // Same mode ID
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'tokens', // Collection renamed
          mode: 'default', // Mode renamed
        },
        'VariableID:1:1:tokens.night': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2', // Same collection ID
          modeId: '1:1', // Same mode ID
          path: 'colors.primary',
          value: '#000',
          type: 'COLOR',
          collection: 'tokens', // Collection renamed
          mode: 'night', // Mode renamed
        },
      },
    };

    const result = compareBaselines(baseline, fetched);
    const counts = getChangeCounts(result);

    expect(counts.collectionRenames).toBe(1);
    expect(result.collectionRenames[0].oldCollection).toBe('base');
    expect(result.collectionRenames[0].newCollection).toBe('tokens');
    expect(counts.modeRenames).toBe(2);
    expect(result.modeRenames.find(r => r.oldMode === 'light' && r.newMode === 'default')).toBeDefined();
    expect(result.modeRenames.find(r => r.oldMode === 'dark' && r.newMode === 'night')).toBeDefined();
  });

  it('should detect new collection based on collectionId', () => {
    const baseline: BaselineData = {
      metadata: { syncedAt: 'yesterday' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
      },
    };

    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        'VariableID:2:1:theme.light': {
          variableId: 'VariableID:2:1',
          collectionId: 'VariableCollectionId:2:3', // New collection ID
          modeId: '2:0',
          path: 'colors.accent',
          value: '#00f',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      },
    };

    const result = compareBaselines(baseline, fetched);
    const counts = getChangeCounts(result);

    expect(counts.newModes).toBe(1);
    expect(result.newModes[0].collection).toBe('theme');
    expect(result.newModes[0].mode).toBe('light');
  });

  it('should detect deleted collection based on collectionId', () => {
    const baseline: BaselineData = {
      metadata: { syncedAt: 'yesterday' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        'VariableID:2:1:theme.light': {
          variableId: 'VariableID:2:1',
          collectionId: 'VariableCollectionId:2:3',
          modeId: '2:0',
          path: 'colors.accent',
          value: '#00f',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      },
    };

    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        // theme collection deleted
      },
    };

    const result = compareBaselines(baseline, fetched);
    const counts = getChangeCounts(result);

    expect(counts.deletedModes).toBe(1);
    expect(result.deletedModes[0].collection).toBe('theme');
    expect(result.deletedModes[0].mode).toBe('light');
  });

  it('should detect new mode within existing collection based on modeId', () => {
    const baseline: BaselineData = {
      metadata: { syncedAt: 'yesterday' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
      },
    };

    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        'VariableID:1:1:base.dark': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:1', // New mode ID
          path: 'colors.primary',
          value: '#000',
          type: 'COLOR',
          collection: 'base',
          mode: 'dark',
        },
      },
    };

    const result = compareBaselines(baseline, fetched);
    const counts = getChangeCounts(result);

    expect(counts.newModes).toBe(1);
    expect(result.newModes[0].collection).toBe('base');
    expect(result.newModes[0].mode).toBe('dark');
  });

  it('should detect deleted mode within existing collection based on modeId', () => {
    const baseline: BaselineData = {
      metadata: { syncedAt: 'yesterday' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        'VariableID:1:1:base.dark': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:1',
          path: 'colors.primary',
          value: '#000',
          type: 'COLOR',
          collection: 'base',
          mode: 'dark',
        },
      },
    };

    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        // dark mode deleted
      },
    };

    const result = compareBaselines(baseline, fetched);
    const counts = getChangeCounts(result);

    expect(counts.deletedModes).toBe(1);
    expect(result.deletedModes[0].collection).toBe('base');
    expect(result.deletedModes[0].mode).toBe('dark');
  });
});

describe('compareBaselines - Fallback to Heuristic Matching', () => {
  it('should use heuristic matching when IDs are not available', () => {
    const baseline: BaselineData = {
      metadata: { syncedAt: 'yesterday' },
      baseline: {
        'var1:light': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
          // No collectionId or modeId
        },
      },
    };

    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'var1:default': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'tokens', // Different collection name
          mode: 'default', // Different mode name
          // No collectionId or modeId
        },
      },
    };

    const result = compareBaselines(baseline, fetched);
    const counts = getChangeCounts(result);

    // Heuristic matching should detect this as a collection rename (same mode count)
    expect(counts.collectionRenames).toBe(1);
    expect(counts.modeRenames).toBe(1);
  });

  it('should use ID-based matching when both baselines have IDs', () => {
    const baseline: BaselineData = {
      metadata: { syncedAt: 'yesterday' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        'VariableID:1:1:base.dark': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:1',
          path: 'colors.primary',
          value: '#000',
          type: 'COLOR',
          collection: 'base',
          mode: 'dark',
        },
      },
    };

    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'VariableID:1:1:tokens.default': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2', // Same ID
          modeId: '1:0', // Same ID
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'tokens',
          mode: 'default',
        },
        'VariableID:1:1:tokens.night': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2', // Same ID
          modeId: '1:1', // Same ID
          path: 'colors.primary',
          value: '#000',
          type: 'COLOR',
          collection: 'tokens',
          mode: 'night',
        },
      },
    };

    const result = compareBaselines(baseline, fetched);
    const counts = getChangeCounts(result);

    // ID-based matching should precisely detect renames
    expect(counts.collectionRenames).toBe(1);
    expect(result.collectionRenames[0].oldCollection).toBe('base');
    expect(result.collectionRenames[0].newCollection).toBe('tokens');
    expect(counts.modeRenames).toBe(2);
  });

  it('should fallback to heuristic when only baseline has IDs', () => {
    const baseline: BaselineData = {
      metadata: { syncedAt: 'yesterday' },
      baseline: {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
      },
    };

    const fetched: BaselineData = {
      metadata: { syncedAt: 'today' },
      baseline: {
        'var1:default': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'tokens',
          mode: 'default',
          // No IDs
        },
      },
    };

    const result = compareBaselines(baseline, fetched);
    const counts = getChangeCounts(result);

    // Should fallback to heuristic matching
    expect(counts.collectionRenames).toBe(1);
  });
});
