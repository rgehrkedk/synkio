import { describe, it, expect } from 'vitest';
import { parseColor, parseNumber, parseFontWeight, rgbToHex } from '../../../src/backend/utils/parsers';

describe('parseColor', () => {
  it('should parse 6-digit hex color', () => {
    const result = parseColor('#ff0000');
    expect(result).toEqual({ r: 1, g: 0, b: 0 });
  });

  it('should parse hex color with mixed case', () => {
    const result = parseColor('#00FF00');
    expect(result).toEqual({ r: 0, g: 1, b: 0 });
  });

  it('should parse rgba color', () => {
    const result = parseColor('rgba(255, 0, 0, 1)');
    expect(result).toEqual({ r: 1, g: 0, b: 0 });
  });

  it('should return null for invalid color', () => {
    expect(parseColor('invalid')).toBeNull();
    expect(parseColor('')).toBeNull();
  });
});

describe('parseNumber', () => {
  it('should parse numeric value', () => {
    expect(parseNumber(42)).toBe(42);
    expect(parseNumber(3.14)).toBe(3.14);
  });

  it('should parse string with px unit', () => {
    expect(parseNumber('16px')).toBe(16);
    expect(parseNumber('24px')).toBe(24);
  });

  it('should parse string with rem unit', () => {
    expect(parseNumber('1.5rem')).toBe(1.5);
  });

  it('should return null for invalid number', () => {
    expect(parseNumber('invalid')).toBeNull();
    expect(parseNumber(null)).toBeNull();
  });
});

describe('parseFontWeight', () => {
  it('should map numeric weight to name', () => {
    expect(parseFontWeight(400)).toBe('Regular');
    expect(parseFontWeight(700)).toBe('Bold');
  });

  it('should return string for unknown weight', () => {
    expect(parseFontWeight(450)).toBe('450');
  });

  it('should convert non-numeric to string', () => {
    expect(parseFontWeight('bold')).toBe('bold');
  });
});

describe('rgbToHex', () => {
  it('should convert RGB to hex', () => {
    expect(rgbToHex({ r: 1, g: 0, b: 0 })).toBe('#ff0000');
    expect(rgbToHex({ r: 0, g: 1, b: 0 })).toBe('#00ff00');
    expect(rgbToHex({ r: 0, g: 0, b: 1 })).toBe('#0000ff');
  });

  it('should handle fractional RGB values', () => {
    expect(rgbToHex({ r: 0.5, g: 0.5, b: 0.5 })).toBe('#808080');
  });
});
