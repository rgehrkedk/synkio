import { describe, it, expect } from 'vitest';
import { inferTypeFromPath, inferTypeFromValue } from '../../../src/backend/type-inference';

describe('inferTypeFromPath', () => {
  it('should infer color type from path containing "color"', () => {
    expect(inferTypeFromPath('colors/primary')).toBe('color');
    expect(inferTypeFromPath('semantic/background-color')).toBe('color');
  });

  it('should infer dimension type from path containing "spacing"', () => {
    expect(inferTypeFromPath('spacing/small')).toBe('dimension');
    expect(inferTypeFromPath('size/button-height')).toBe('dimension');
  });

  it('should infer fontWeight from font path with weight', () => {
    expect(inferTypeFromPath('font/weight/bold')).toBe('fontWeight');
    expect(inferTypeFromPath('typography/weight')).toBe('fontWeight');
  });

  it('should infer dimension from font size', () => {
    expect(inferTypeFromPath('font/size/large')).toBe('dimension');
  });

  it('should infer shadow type from path', () => {
    expect(inferTypeFromPath('shadow/card')).toBe('shadow');
  });

  it('should default to string for unknown paths', () => {
    expect(inferTypeFromPath('unknown/path')).toBe('string');
  });
});

describe('inferTypeFromValue', () => {
  it('should infer color from hex value', () => {
    expect(inferTypeFromValue('#ff0000')).toBe('color');
    expect(inferTypeFromValue('#00FF00')).toBe('color');
  });

  it('should infer dimension from value with units', () => {
    expect(inferTypeFromValue('16px')).toBe('dimension');
    expect(inferTypeFromValue('1.5rem')).toBe('dimension');
  });

  it('should infer number from numeric value', () => {
    expect(inferTypeFromValue(42)).toBe('number');
  });

  it('should infer boolean from boolean value', () => {
    expect(inferTypeFromValue(true)).toBe('boolean');
    expect(inferTypeFromValue(false)).toBe('boolean');
  });

  it('should return null for plain strings', () => {
    expect(inferTypeFromValue('some text')).toBeNull();
  });
});
