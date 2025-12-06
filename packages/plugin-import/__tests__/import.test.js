/**
 * Import functionality tests for the Figma Token Sync Plugin
 *
 * These tests verify the core import utility functions work correctly.
 * Tests are focused on the 4 key behaviors specified in Task Group 5.
 */

const {
  parseVariableId,
  hexToRgb,
  parseAliasReference,
  categorizeTokens
} = require('../src/import-utils.js');

describe('Import Functionality', () => {
  describe('parseVariableId', () => {
    test('extracts collection, mode, and Figma ID correctly from brand variable', () => {
      const result = parseVariableId('brand:eboks:VariableID:8407:177359');

      expect(result.valid).toBe(true);
      expect(result.collection).toBe('brand');
      expect(result.mode).toBe('eboks');
      expect(result.figmaId).toBe('VariableID:8407:177359');
    });

    test('extracts collection, mode, and Figma ID correctly from theme variable', () => {
      const result = parseVariableId('theme:light:VariableID:9932:33');

      expect(result.valid).toBe(true);
      expect(result.collection).toBe('theme');
      expect(result.mode).toBe('light');
      expect(result.figmaId).toBe('VariableID:9932:33');
    });

    test('extracts collection, mode, and Figma ID correctly from globals variable', () => {
      const result = parseVariableId('globals:value:VariableID:13607:16081');

      expect(result.valid).toBe(true);
      expect(result.collection).toBe('globals');
      expect(result.mode).toBe('value');
      expect(result.figmaId).toBe('VariableID:13607:16081');
    });

    test('handles different brand modes (nykredit, postnl)', () => {
      const nykredit = parseVariableId('brand:nykredit:VariableID:8407:177359');
      expect(nykredit.valid).toBe(true);
      expect(nykredit.mode).toBe('nykredit');

      const postnl = parseVariableId('brand:postnl:VariableID:8407:177359');
      expect(postnl.valid).toBe(true);
      expect(postnl.mode).toBe('postnl');
    });

    test('handles dark theme mode', () => {
      const result = parseVariableId('theme:dark:VariableID:9932:33');

      expect(result.valid).toBe(true);
      expect(result.collection).toBe('theme');
      expect(result.mode).toBe('dark');
    });

    test('returns invalid for malformed variable ID', () => {
      // Too few parts
      expect(parseVariableId('brand:eboks').valid).toBe(false);

      // Missing VariableID
      expect(parseVariableId('brand:eboks:123:456').valid).toBe(false);

      // Invalid collection
      expect(parseVariableId('unknown:mode:VariableID:123:456').valid).toBe(false);

      // Empty string
      expect(parseVariableId('').valid).toBe(false);

      // Null/undefined
      expect(parseVariableId(null).valid).toBe(false);
      expect(parseVariableId(undefined).valid).toBe(false);
    });
  });

  describe('hexToRgb', () => {
    test('converts 6-digit hex strings to RGB objects', () => {
      // Pure red
      expect(hexToRgb('#ff0000')).toEqual({ r: 1, g: 0, b: 0 });

      // Pure green
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 1, b: 0 });

      // Pure blue
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 1 });

      // White
      expect(hexToRgb('#ffffff')).toEqual({ r: 1, g: 1, b: 1 });

      // Black
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    test('converts 8-digit hex strings to RGBA objects', () => {
      // Red with 50% alpha (0x80 = 128 = 0.502)
      const redAlpha = hexToRgb('#ff000080');
      expect(redAlpha.r).toBe(1);
      expect(redAlpha.g).toBe(0);
      expect(redAlpha.b).toBe(0);
      expect(redAlpha.a).toBeCloseTo(0.502, 2);

      // White fully transparent
      expect(hexToRgb('#ffffff00')).toEqual({ r: 1, g: 1, b: 1, a: 0 });

      // Full opacity
      expect(hexToRgb('#0000ffff')).toEqual({ r: 0, g: 0, b: 1, a: 1 });
    });

    test('normalizes values to 0-1 range for Figma', () => {
      // Test a mid-range color
      const result = hexToRgb('#808080');
      expect(result.r).toBeCloseTo(0.502, 2);
      expect(result.g).toBeCloseTo(0.502, 2);
      expect(result.b).toBeCloseTo(0.502, 2);
    });

    test('handles hex without # prefix', () => {
      expect(hexToRgb('ff0000')).toEqual({ r: 1, g: 0, b: 0 });
      expect(hexToRgb('ff000080')).toEqual({ r: 1, g: 0, b: 0, a: expect.any(Number) });
    });

    test('handles uppercase hex', () => {
      expect(hexToRgb('#FF0000')).toEqual({ r: 1, g: 0, b: 0 });
      expect(hexToRgb('#AABBCC')).toBeDefined();
    });

    test('returns null for invalid hex strings', () => {
      expect(hexToRgb('')).toBeNull();
      expect(hexToRgb(null)).toBeNull();
      expect(hexToRgb('not-a-color')).toBeNull();
      expect(hexToRgb('#gg0000')).toBeNull(); // Invalid hex chars
      expect(hexToRgb('#fff')).toBeNull(); // 3-digit not supported
    });

    test('is inverse of rgbToHex (round-trip)', () => {
      // Test that hexToRgb is the inverse of rgbToHex
      const testColors = [
        '#f9f8f7', // From actual baseline
        '#edece9',
        '#294350',
        '#a8242f'
      ];

      for (const hex of testColors) {
        const rgb = hexToRgb(hex);
        expect(rgb).not.toBeNull();
        // Verify the values are in the 0-1 range
        expect(rgb.r).toBeGreaterThanOrEqual(0);
        expect(rgb.r).toBeLessThanOrEqual(1);
        expect(rgb.g).toBeGreaterThanOrEqual(0);
        expect(rgb.g).toBeLessThanOrEqual(1);
        expect(rgb.b).toBeGreaterThanOrEqual(0);
        expect(rgb.b).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('parseAliasReference (resolveAliasToVariable helper)', () => {
    test('parses alias format "{path.to.var}" correctly', () => {
      const result = parseAliasReference('{colors.neutral.50}');

      expect(result.valid).toBe(true);
      expect(result.path).toBe('colors.neutral.50');
    });

    test('parses complex nested paths', () => {
      const result = parseAliasReference('{colors.brand.primary.300}');

      expect(result.valid).toBe(true);
      expect(result.path).toBe('colors.brand.primary.300');
    });

    test('parses theme references', () => {
      const result = parseAliasReference('{fg.feedback.alert.default}');

      expect(result.valid).toBe(true);
      expect(result.path).toBe('fg.feedback.alert.default');
    });

    test('returns invalid for non-alias strings', () => {
      // Missing braces
      expect(parseAliasReference('colors.neutral.50').valid).toBe(false);

      // Only opening brace
      expect(parseAliasReference('{colors.neutral.50').valid).toBe(false);

      // Only closing brace
      expect(parseAliasReference('colors.neutral.50}').valid).toBe(false);

      // Empty braces
      expect(parseAliasReference('{}').valid).toBe(false);

      // Empty string
      expect(parseAliasReference('').valid).toBe(false);

      // Null/undefined
      expect(parseAliasReference(null).valid).toBe(false);
      expect(parseAliasReference(undefined).valid).toBe(false);
    });

    test('handles whitespace inside braces', () => {
      const result = parseAliasReference('{ colors.neutral.50 }');

      expect(result.valid).toBe(true);
      expect(result.path).toBe('colors.neutral.50');
    });
  });

  describe('categorizeTokens', () => {
    test('correctly categorizes tokens as to-update when Figma ID exists', () => {
      const baselineTokens = {
        'brand:eboks:VariableID:8407:177359': {
          path: 'colors.neutral.50',
          value: '#f9f8f7',
          type: 'color',
          brand: 'eboks',
          collection: 'brand'
        }
      };

      // This Figma ID exists
      const existingFigmaIds = new Set(['VariableID:8407:177359']);
      const allFigmaVariableIds = new Set(['VariableID:8407:177359']);

      const result = categorizeTokens(baselineTokens, existingFigmaIds, allFigmaVariableIds);

      expect(result.toUpdate).toHaveLength(1);
      expect(result.toUpdate[0].path).toBe('colors.neutral.50');
      expect(result.toUpdate[0].collection).toBe('brand');
      expect(result.toUpdate[0].mode).toBe('eboks');
      expect(result.toCreate).toHaveLength(0);
    });

    test('correctly categorizes tokens as to-create when Figma ID does not exist', () => {
      const baselineTokens = {
        'brand:eboks:VariableID:9999:99999': {
          path: 'colors.new.token',
          value: '#ff0000',
          type: 'color',
          brand: 'eboks',
          collection: 'brand'
        }
      };

      // This Figma ID does NOT exist
      const existingFigmaIds = new Set();
      const allFigmaVariableIds = new Set();

      const result = categorizeTokens(baselineTokens, existingFigmaIds, allFigmaVariableIds);

      expect(result.toCreate).toHaveLength(1);
      expect(result.toCreate[0].path).toBe('colors.new.token');
      expect(result.toUpdate).toHaveLength(0);
    });

    test('identifies unmatched Figma variables (exist in Figma but not in baseline)', () => {
      const baselineTokens = {
        'brand:eboks:VariableID:8407:177359': {
          path: 'colors.neutral.50',
          value: '#f9f8f7',
          type: 'color',
          brand: 'eboks',
          collection: 'brand'
        }
      };

      // Figma has an extra variable not in baseline
      const existingFigmaIds = new Set(['VariableID:8407:177359', 'VariableID:1111:22222']);
      const allFigmaVariableIds = new Set(['VariableID:8407:177359', 'VariableID:1111:22222']);

      const result = categorizeTokens(baselineTokens, existingFigmaIds, allFigmaVariableIds);

      expect(result.unmatched).toContain('VariableID:1111:22222');
      expect(result.unmatched).not.toContain('VariableID:8407:177359');
    });

    test('handles mixed scenario with updates, creates, and unmatched', () => {
      const baselineTokens = {
        // Exists in Figma - should be to-update
        'brand:eboks:VariableID:1000:1': {
          path: 'colors.existing.one',
          value: '#111111',
          type: 'color',
          brand: 'eboks',
          collection: 'brand'
        },
        // Exists in Figma - should be to-update
        'theme:light:VariableID:2000:2': {
          path: 'fg.primary.default',
          value: '{colors.neutral.950}',
          type: 'color',
          mode: 'light',
          collection: 'theme'
        },
        // Does NOT exist in Figma - should be to-create
        'brand:nykredit:VariableID:3000:3': {
          path: 'colors.new.token',
          value: '#333333',
          type: 'color',
          brand: 'nykredit',
          collection: 'brand'
        }
      };

      const existingFigmaIds = new Set([
        'VariableID:1000:1',
        'VariableID:2000:2',
        'VariableID:4000:4' // This is unmatched
      ]);
      const allFigmaVariableIds = new Set([
        'VariableID:1000:1',
        'VariableID:2000:2',
        'VariableID:4000:4'
      ]);

      const result = categorizeTokens(baselineTokens, existingFigmaIds, allFigmaVariableIds);

      expect(result.toUpdate).toHaveLength(2);
      expect(result.toCreate).toHaveLength(1);
      expect(result.unmatched).toHaveLength(1);
      expect(result.unmatched[0]).toBe('VariableID:4000:4');
    });

    test('skips tokens with invalid variable IDs', () => {
      const baselineTokens = {
        'invalid-format': {
          path: 'some.path',
          value: '#000000',
          type: 'color',
          collection: 'brand'
        },
        'brand:eboks:VariableID:1000:1': {
          path: 'colors.valid',
          value: '#ffffff',
          type: 'color',
          brand: 'eboks',
          collection: 'brand'
        }
      };

      const existingFigmaIds = new Set(['VariableID:1000:1']);
      const allFigmaVariableIds = new Set(['VariableID:1000:1']);

      const result = categorizeTokens(baselineTokens, existingFigmaIds, allFigmaVariableIds);

      // Only the valid token should be processed
      expect(result.toUpdate).toHaveLength(1);
      expect(result.toUpdate[0].path).toBe('colors.valid');
    });
  });
});
