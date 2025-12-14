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

describe('compareBaselines', () => {
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
