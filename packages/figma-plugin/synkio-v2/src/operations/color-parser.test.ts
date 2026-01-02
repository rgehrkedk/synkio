// =============================================================================
// Color Parser Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import { parseColor } from './color-parser';

describe('parseColor', () => {
  describe('hex colors', () => {
    it('should parse 6-digit hex color', () => {
      const result = parseColor('#ff0000');
      expect(result).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    });

    it('should parse hex with mixed values', () => {
      const result = parseColor('#80ff40');
      expect(result.r).toBeCloseTo(128 / 255);
      expect(result.g).toBeCloseTo(1);
      expect(result.b).toBeCloseTo(64 / 255);
      expect(result.a).toBe(1);
    });

    it('should parse 8-digit hex color with alpha', () => {
      const result = parseColor('#ff000080');
      expect(result.r).toBeCloseTo(1);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.a).toBeCloseTo(128 / 255);
    });

    it('should parse black', () => {
      const result = parseColor('#000000');
      expect(result).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    it('should parse white', () => {
      const result = parseColor('#ffffff');
      expect(result).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    });
  });

  describe('rgba colors', () => {
    it('should parse rgba with integer alpha', () => {
      const result = parseColor('rgba(255, 0, 0, 1)');
      expect(result).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    });

    it('should parse rgba with decimal alpha', () => {
      const result = parseColor('rgba(255, 128, 0, 0.5)');
      expect(result.r).toBe(1);
      expect(result.g).toBeCloseTo(128 / 255);
      expect(result.b).toBe(0);
      expect(result.a).toBe(0.5);
    });

    it('should parse rgb without alpha', () => {
      const result = parseColor('rgb(0, 255, 0)');
      expect(result).toEqual({ r: 0, g: 1, b: 0, a: 1 });
    });

    it('should handle various spacing in rgba', () => {
      const result = parseColor('rgba(100,200,150,0.8)');
      expect(result.r).toBeCloseTo(100 / 255);
      expect(result.g).toBeCloseTo(200 / 255);
      expect(result.b).toBeCloseTo(150 / 255);
      expect(result.a).toBe(0.8);
    });
  });

  describe('invalid colors', () => {
    it('should return black for invalid hex', () => {
      const result = parseColor('#xyz');
      expect(result).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    it('should return black for empty string', () => {
      const result = parseColor('');
      expect(result).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    it('should return black for random string', () => {
      const result = parseColor('not-a-color');
      expect(result).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });
  });

  describe('edge cases', () => {
    it('should handle lowercase hex', () => {
      const result = parseColor('#aabbcc');
      expect(result.r).toBeCloseTo(170 / 255);
      expect(result.g).toBeCloseTo(187 / 255);
      expect(result.b).toBeCloseTo(204 / 255);
    });

    it('should handle uppercase hex', () => {
      const result = parseColor('#AABBCC');
      expect(result.r).toBeCloseTo(170 / 255);
      expect(result.g).toBeCloseTo(187 / 255);
      expect(result.b).toBeCloseTo(204 / 255);
    });

    it('should handle zero alpha in rgba', () => {
      const result = parseColor('rgba(255, 255, 255, 0)');
      expect(result.a).toBe(0);
    });
  });
});
