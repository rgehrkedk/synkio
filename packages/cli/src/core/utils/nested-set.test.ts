import { describe, it, expect } from 'vitest';
import { setNestedPath } from './nested-set.js';

describe('setNestedPath', () => {
  it('should create nested structure from empty object', () => {
    const obj = {};

    setNestedPath(obj, ['a', 'b', 'c'], 42);

    expect(obj).toEqual({ a: { b: { c: 42 } } });
  });

  it('should overwrite existing values at path', () => {
    const obj = { a: { b: { c: 'old' } } };

    setNestedPath(obj, ['a', 'b', 'c'], 'new');

    expect(obj).toEqual({ a: { b: { c: 'new' } } });
  });

  it('should preserve existing sibling properties', () => {
    const obj = { a: { existing: 1 } };

    setNestedPath(obj, ['a', 'b', 'c'], 42);

    expect(obj).toEqual({
      a: {
        existing: 1,
        b: { c: 42 },
      },
    });
  });

  it('should handle single-level path', () => {
    const obj = {};

    setNestedPath(obj, ['key'], 'value');

    expect(obj).toEqual({ key: 'value' });
  });

  it('should set object values', () => {
    const obj = {};
    const value = { $value: '#ff0000', $type: 'color' };

    setNestedPath(obj, ['colors', 'primary'], value);

    expect(obj).toEqual({
      colors: {
        primary: { $value: '#ff0000', $type: 'color' },
      },
    });
  });

  it('should set array values', () => {
    const obj = {};

    setNestedPath(obj, ['items'], [1, 2, 3]);

    expect(obj).toEqual({ items: [1, 2, 3] });
  });

  it('should handle deeply nested paths', () => {
    const obj = {};

    setNestedPath(obj, ['a', 'b', 'c', 'd', 'e', 'f'], 'deep');

    expect(obj).toEqual({
      a: { b: { c: { d: { e: { f: 'deep' } } } } },
    });
  });
});
