/**
 * Tests for Structure Analyzer
 *
 * Validates that JSON structure analysis correctly extracts levels,
 * keys, and sample values without performing role detection.
 */

import { describe, it, expect } from 'vitest';
import { analyzeJsonStructure } from '../../../src/backend/utils/structure-analyzer.js';

describe('Structure Analyzer', () => {
  it('analyzes flat token structure (1 level)', () => {
    const data = {
      'color-primary': '#FF0000',
      'color-secondary': '#00FF00',
      'spacing-sm': 8,
      'spacing-md': 16,
      'spacing-lg': 24,
    };

    const result = analyzeJsonStructure(data);

    expect(result.maxDepth).toBe(1);
    expect(result.levels).toHaveLength(1);
    expect(result.hasTokenValues).toBe(false);

    const level1 = result.levels[0];
    expect(level1.depth).toBe(1);
    expect(level1.keyCount).toBe(5);
    expect(level1.keys).toContain('color-primary');
    expect(level1.keys).toContain('spacing-sm');
    expect(level1.sampleValues).toHaveLength(3);
  });

  it('analyzes nested structure (3 levels)', () => {
    const data = {
      theme: {
        light: {
          colors: {
            primary: '#FF0000',
            secondary: '#00FF00',
          },
          spacing: {
            sm: 8,
            md: 16,
          },
        },
        dark: {
          colors: {
            primary: '#0000FF',
            secondary: '#FFFF00',
          },
        },
      },
    };

    const result = analyzeJsonStructure(data);

    expect(result.maxDepth).toBe(4);
    expect(result.levels).toHaveLength(4);
    expect(result.hasTokenValues).toBe(false);

    // Level 1: "theme"
    const level1 = result.levels[0];
    expect(level1.depth).toBe(1);
    expect(level1.keys).toEqual(['theme']);
    expect(level1.keyCount).toBe(1);

    // Level 2: "light", "dark"
    const level2 = result.levels[1];
    expect(level2.depth).toBe(2);
    expect(level2.keys).toContain('light');
    expect(level2.keys).toContain('dark');
    expect(level2.keyCount).toBe(2);

    // Level 3: "colors", "spacing"
    const level3 = result.levels[2];
    expect(level3.depth).toBe(3);
    expect(level3.keys).toContain('colors');
    expect(level3.keys).toContain('spacing');
    expect(level3.keyCount).toBe(2);

    // Level 4: token names
    const level4 = result.levels[3];
    expect(level4.depth).toBe(4);
    expect(level4.keys).toContain('primary');
    expect(level4.keys).toContain('secondary');
    expect(level4.keys).toContain('sm');
    expect(level4.keys).toContain('md');
  });

  it('analyzes Design Tokens format with $value keys', () => {
    const data = {
      colors: {
        primary: {
          $value: '#FF0000',
          $type: 'color',
        },
        secondary: {
          $value: '#00FF00',
          $type: 'color',
        },
      },
      spacing: {
        sm: {
          $value: 8,
          $type: 'dimension',
        },
      },
    };

    const result = analyzeJsonStructure(data);

    expect(result.hasTokenValues).toBe(true);
    expect(result.maxDepth).toBe(2);
    expect(result.levels).toHaveLength(2);

    // Level 1: "colors", "spacing"
    const level1 = result.levels[0];
    expect(level1.keys).toContain('colors');
    expect(level1.keys).toContain('spacing');

    // Level 2: token names (should not traverse into $value objects)
    const level2 = result.levels[1];
    expect(level2.keys).toContain('primary');
    expect(level2.keys).toContain('secondary');
    expect(level2.keys).toContain('sm');

    // Should not have level 3 (since $value objects are not traversed)
    expect(result.levels).toHaveLength(2);
  });

  it('includes sample values with correct types', () => {
    const data = {
      string: 'hello',
      number: 42,
      boolean: true,
      object: { nested: 'value' },
      array: [1, 2, 3],
    };

    const result = analyzeJsonStructure(data);

    const level1 = result.levels[0];
    expect(level1.sampleValues).toHaveLength(3);

    const samples = level1.sampleValues;
    expect(samples.some((s) => s.type === 'string')).toBe(true);
    expect(samples.some((s) => s.type === 'number')).toBe(true);
    expect(samples.some((s) => s.type === 'boolean')).toBe(true);
  });

  it('limits sample values to 3 per level', () => {
    const data = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
      key4: 'value4',
      key5: 'value5',
      key6: 'value6',
    };

    const result = analyzeJsonStructure(data);

    const level1 = result.levels[0];
    expect(level1.keyCount).toBe(6);
    expect(level1.sampleValues).toHaveLength(3);
  });

  it('sorts keys alphabetically', () => {
    const data = {
      zebra: 'value',
      apple: 'value',
      mango: 'value',
      banana: 'value',
    };

    const result = analyzeJsonStructure(data);

    const level1 = result.levels[0];
    expect(level1.keys).toEqual(['apple', 'banana', 'mango', 'zebra']);
  });

  it('throws error for invalid input', () => {
    expect(() => analyzeJsonStructure(null)).toThrow('Invalid JSON data');
    expect(() => analyzeJsonStructure(undefined)).toThrow('Invalid JSON data');
    expect(() => analyzeJsonStructure('string')).toThrow('Invalid JSON data');
    expect(() => analyzeJsonStructure(42)).toThrow('Invalid JSON data');
  });
});
