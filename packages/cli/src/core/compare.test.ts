import { describe, it, expect } from 'vitest';
import { compareBaselines, getChangeCounts, compareStyleBaselines, hasStyleChanges, hasBreakingStyleChanges, getStyleChangeCounts } from './compare.js';
import { BaselineData, RawStyles } from '../types/index.js';

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

// =============================================================================
// Style Comparison Tests
// =============================================================================

const baseStyles: RawStyles = {
  'S:style1:paint': {
    styleId: 'S:style1',
    type: 'paint',
    path: 'brand.primary',
    value: { $type: 'color', $value: '#ff0000' },
  },
  'S:style2:text': {
    styleId: 'S:style2',
    type: 'text',
    path: 'heading.h1',
    value: {
      $type: 'typography',
      $value: {
        fontFamily: 'Inter',
        fontSize: '32px',
        fontWeight: 700,
        lineHeight: '1.2',
        letterSpacing: '0',
      },
    },
  },
  'S:style3:effect': {
    styleId: 'S:style3',
    type: 'effect',
    path: 'elevation.md',
    value: {
      $type: 'shadow',
      $value: {
        offsetX: '0',
        offsetY: '4px',
        blur: '8px',
        spread: '0',
        color: 'rgba(0,0,0,0.1)',
      },
    },
  },
};

describe('compareStyleBaselines - Basic Functionality', () => {
  it('should detect no changes when styles are identical', () => {
    const identicalFetched = JSON.parse(JSON.stringify(baseStyles));
    const result = compareStyleBaselines(baseStyles, identicalFetched);
    expect(hasStyleChanges(result)).toBe(false);
    expect(getStyleChangeCounts(result).total).toBe(0);
  });

  it('should handle undefined/empty baselines', () => {
    const result1 = compareStyleBaselines(undefined, undefined);
    expect(hasStyleChanges(result1)).toBe(false);

    const result2 = compareStyleBaselines(baseStyles, undefined);
    expect(result2.deletedStyles.length).toBe(3);

    const result3 = compareStyleBaselines(undefined, baseStyles);
    expect(result3.newStyles.length).toBe(3);
  });

  it('should detect value changes', () => {
    const fetched: RawStyles = {
      ...baseStyles,
      'S:style1:paint': {
        ...baseStyles['S:style1:paint'],
        value: { $type: 'color', $value: '#0000ff' }, // Changed value
      },
    };
    const result = compareStyleBaselines(baseStyles, fetched);
    expect(result.valueChanges.length).toBe(1);
    expect(result.valueChanges[0].styleId).toBe('S:style1');
    expect(result.valueChanges[0].oldValue.$value).toBe('#ff0000');
    expect(result.valueChanges[0].newValue.$value).toBe('#0000ff');
    expect(hasBreakingStyleChanges(result)).toBe(false);
  });

  it('should detect path changes (breaking)', () => {
    const fetched: RawStyles = {
      ...baseStyles,
      'S:style1:paint': {
        ...baseStyles['S:style1:paint'],
        path: 'brand.primary.base', // Changed path (rename)
      },
    };
    const result = compareStyleBaselines(baseStyles, fetched);
    expect(result.pathChanges.length).toBe(1);
    expect(result.pathChanges[0].styleId).toBe('S:style1');
    expect(result.pathChanges[0].oldPath).toBe('brand.primary');
    expect(result.pathChanges[0].newPath).toBe('brand.primary.base');
    expect(hasBreakingStyleChanges(result)).toBe(true);
    expect(getStyleChangeCounts(result).breaking).toBe(1);
  });

  it('should detect new styles', () => {
    const fetched: RawStyles = {
      ...baseStyles,
      'S:style4:paint': {
        styleId: 'S:style4',
        type: 'paint',
        path: 'brand.secondary',
        value: { $type: 'color', $value: '#00ff00' },
      },
    };
    const result = compareStyleBaselines(baseStyles, fetched);
    expect(result.newStyles.length).toBe(1);
    expect(result.newStyles[0].styleId).toBe('S:style4');
    expect(result.newStyles[0].path).toBe('brand.secondary');
    expect(hasBreakingStyleChanges(result)).toBe(false);
  });

  it('should detect deleted styles (breaking)', () => {
    const fetched: RawStyles = {
      'S:style1:paint': baseStyles['S:style1:paint'],
      // style2 and style3 are deleted
    };
    const result = compareStyleBaselines(baseStyles, fetched);
    expect(result.deletedStyles.length).toBe(2);
    expect(result.deletedStyles.map(s => s.styleId).sort()).toEqual(['S:style2', 'S:style3']);
    expect(hasBreakingStyleChanges(result)).toBe(true);
    expect(getStyleChangeCounts(result).breaking).toBe(2);
  });

  it('should detect simultaneous path and value changes', () => {
    const fetched: RawStyles = {
      ...baseStyles,
      'S:style2:text': {
        ...baseStyles['S:style2:text'],
        path: 'heading.display', // Path changed
        value: {
          ...baseStyles['S:style2:text'].value,
          $value: {
            ...baseStyles['S:style2:text'].value.$value,
            fontSize: '48px', // Value also changed
          },
        },
      },
    };
    const result = compareStyleBaselines(baseStyles, fetched);
    expect(result.pathChanges.length).toBe(1);
    expect(result.valueChanges.length).toBe(1);
    expect(result.pathChanges[0].styleId).toBe('S:style2');
    expect(result.valueChanges[0].styleId).toBe('S:style2');
  });

  it('should correctly report style types in results', () => {
    const fetched: RawStyles = {
      'S:style1:paint': {
        ...baseStyles['S:style1:paint'],
        value: { $type: 'color', $value: '#0000ff' },
      },
      'S:style2:text': {
        ...baseStyles['S:style2:text'],
        path: 'heading.display',
      },
      // effect style deleted
    };
    const result = compareStyleBaselines(baseStyles, fetched);

    expect(result.valueChanges[0].styleType).toBe('paint');
    expect(result.pathChanges[0].styleType).toBe('text');
    expect(result.deletedStyles[0].styleType).toBe('effect');
  });
});

describe('compareStyleBaselines - ID-Based Matching', () => {
  it('should use styleId for matching even when path changes', () => {
    const baseline: RawStyles = {
      'S:123:paint': {
        styleId: 'S:123',
        type: 'paint',
        path: 'colors.old-name',
        value: { $type: 'color', $value: '#ff0000' },
      },
    };

    const fetched: RawStyles = {
      'S:123:paint': {
        styleId: 'S:123', // Same ID
        type: 'paint',
        path: 'colors.new-name', // Different path
        value: { $type: 'color', $value: '#ff0000' },
      },
    };

    const result = compareStyleBaselines(baseline, fetched);

    // Should detect as path change (rename), not deletion + addition
    expect(result.pathChanges.length).toBe(1);
    expect(result.deletedStyles.length).toBe(0);
    expect(result.newStyles.length).toBe(0);
  });

  it('should detect new style when styleId does not exist in baseline', () => {
    const baseline: RawStyles = {
      'S:123:paint': {
        styleId: 'S:123',
        type: 'paint',
        path: 'colors.primary',
        value: { $type: 'color', $value: '#ff0000' },
      },
    };

    const fetched: RawStyles = {
      'S:123:paint': baseline['S:123:paint'],
      'S:456:paint': {
        styleId: 'S:456', // New ID
        type: 'paint',
        path: 'colors.secondary',
        value: { $type: 'color', $value: '#00ff00' },
      },
    };

    const result = compareStyleBaselines(baseline, fetched);
    expect(result.newStyles.length).toBe(1);
    expect(result.newStyles[0].styleId).toBe('S:456');
  });

  it('should detect deleted style when styleId no longer exists', () => {
    const baseline: RawStyles = {
      'S:123:paint': {
        styleId: 'S:123',
        type: 'paint',
        path: 'colors.primary',
        value: { $type: 'color', $value: '#ff0000' },
      },
      'S:456:paint': {
        styleId: 'S:456',
        type: 'paint',
        path: 'colors.secondary',
        value: { $type: 'color', $value: '#00ff00' },
      },
    };

    const fetched: RawStyles = {
      'S:123:paint': baseline['S:123:paint'],
      // S:456 is deleted
    };

    const result = compareStyleBaselines(baseline, fetched);
    expect(result.deletedStyles.length).toBe(1);
    expect(result.deletedStyles[0].styleId).toBe('S:456');
  });
});
