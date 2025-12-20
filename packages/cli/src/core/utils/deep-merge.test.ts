import { describe, it, expect } from 'vitest';
import { deepMerge } from './deep-merge.js';

describe('deepMerge', () => {
  it('should merge nested objects recursively', () => {
    const target = { a: { b: 1, c: 2 } };
    const source = { a: { d: 3 }, e: 4 };

    deepMerge(target, source);

    expect(target).toEqual({
      a: { b: 1, c: 2, d: 3 },
      e: 4,
    });
  });

  it('should overwrite primitive values', () => {
    const target = { a: 1, b: 'old' };
    const source = { a: 2, b: 'new' };

    deepMerge(target, source);

    expect(target).toEqual({ a: 2, b: 'new' });
  });

  it('should replace arrays instead of merging them', () => {
    const target = { arr: [1, 2, 3] };
    const source = { arr: [4, 5] };

    deepMerge(target, source);

    expect(target).toEqual({ arr: [4, 5] });
  });

  it('should handle null and undefined values in source', () => {
    const target = { a: 1, b: 2, c: 3 };
    const source = { a: null, b: undefined };

    deepMerge(target, source);

    expect(target).toEqual({ a: null, b: undefined, c: 3 });
  });

  it('should create nested structure when target key does not exist', () => {
    const target = {};
    const source = { a: { b: { c: 1 } } };

    deepMerge(target, source);

    expect(target).toEqual({ a: { b: { c: 1 } } });
  });

  it('should handle target with primitive where source has object', () => {
    const target = { a: 1 };
    const source = { a: { b: 2 } };

    deepMerge(target, source);

    expect(target).toEqual({ a: { b: 2 } });
  });

  it('should handle empty source object', () => {
    const target = { a: 1 };
    const source = {};

    deepMerge(target, source);

    expect(target).toEqual({ a: 1 });
  });

  it('should handle deeply nested structures', () => {
    const target = {
      level1: {
        level2: {
          level3: {
            value: 'original',
          },
        },
      },
    };
    const source = {
      level1: {
        level2: {
          level3: {
            newValue: 'added',
          },
          newLevel3: { value: 'new' },
        },
      },
    };

    deepMerge(target, source);

    expect(target).toEqual({
      level1: {
        level2: {
          level3: {
            value: 'original',
            newValue: 'added',
          },
          newLevel3: { value: 'new' },
        },
      },
    });
  });
});
