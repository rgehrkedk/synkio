/**
 * Export functionality tests for the Figma Token Sync Plugin
 *
 * These tests verify the core export utility functions work correctly.
 * The Figma API is mocked for sandbox isolation.
 */

const {
  parseCollectionType,
  rgbToHex,
  createExportOutput,
  validateExportOutput
} = require('../src/export-utils.js');

describe('Export Functionality', () => {
  describe('parseCollectionType', () => {
    test('correctly identifies brand collection', () => {
      expect(parseCollectionType('brand')).toBe('brand');
    });

    test('correctly identifies theme collection', () => {
      expect(parseCollectionType('theme')).toBe('theme');
    });

    test('correctly identifies globals collection', () => {
      expect(parseCollectionType('globals')).toBe('globals');
    });

    test('handles slash-based brand naming (legacy format)', () => {
      expect(parseCollectionType('brand/colors')).toBe('brand');
      expect(parseCollectionType('brand/spacing')).toBe('brand');
    });

    test('handles slash-based theme naming (legacy format)', () => {
      expect(parseCollectionType('theme/semantic')).toBe('theme');
    });

    test('returns unknown for unrecognized collection names', () => {
      expect(parseCollectionType('custom')).toBe('unknown');
      expect(parseCollectionType('colors')).toBe('unknown');
      expect(parseCollectionType('')).toBe('unknown');
    });
  });

  describe('rgbToHex', () => {
    test('converts RGB object to hex string correctly', () => {
      // Pure red (r=1, g=0, b=0)
      expect(rgbToHex({ r: 1, g: 0, b: 0 })).toBe('#ff0000');

      // Pure green
      expect(rgbToHex({ r: 0, g: 1, b: 0 })).toBe('#00ff00');

      // Pure blue
      expect(rgbToHex({ r: 0, g: 0, b: 1 })).toBe('#0000ff');

      // White
      expect(rgbToHex({ r: 1, g: 1, b: 1 })).toBe('#ffffff');

      // Black
      expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    });

    test('converts RGB with fractional values correctly', () => {
      // Mid gray (0.5, 0.5, 0.5) -> should be ~#808080
      const result = rgbToHex({ r: 0.5, g: 0.5, b: 0.5 });
      expect(result).toBe('#808080');

      // Another test value
      expect(rgbToHex({ r: 0.2, g: 0.4, b: 0.6 })).toBe('#336699');
    });

    test('handles RGBA with full alpha as RGB', () => {
      // Full alpha (a=1) should produce same result as RGB
      expect(rgbToHex({ r: 1, g: 0, b: 0, a: 1 })).toBe('#ff0000');
    });

    test('converts RGBA with partial alpha to 8-digit hex', () => {
      // 50% alpha
      expect(rgbToHex({ r: 1, g: 0, b: 0, a: 0.5 })).toBe('#ff000080');

      // 0% alpha (transparent)
      expect(rgbToHex({ r: 1, g: 1, b: 1, a: 0 })).toBe('#ffffff00');

      // ~75% alpha
      expect(rgbToHex({ r: 0, g: 0, b: 1, a: 0.75 })).toBe('#0000ffbf');
    });
  });

  describe('export message flow produces valid JSON structure', () => {
    test('creates valid export output structure with all required sections', () => {
      const output = createExportOutput({
        version: '2.0.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        pluginVersion: '1.0.0',
        fileKey: 'test-file-key',
        fileName: 'Test Design File'
      });

      // Validate structure
      const validation = validateExportOutput(output);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Check $metadata
      expect(output.$metadata).toBeDefined();
      expect(output.$metadata.version).toBe('2.0.0');
      expect(output.$metadata.exportedAt).toBe('2024-01-15T10:30:00.000Z');
      expect(output.$metadata.pluginVersion).toBe('1.0.0');
      expect(output.$metadata.fileKey).toBe('test-file-key');
      expect(output.$metadata.fileName).toBe('Test Design File');

      // Check all sections exist
      expect(output.brand).toBeDefined();
      expect(output.theme).toBeDefined();
      expect(output.globals).toBeDefined();
      expect(output.baseline).toBeDefined();
      expect(output.migrations).toBeDefined();
      expect(Array.isArray(output.migrations)).toBe(true);
    });

    test('creates valid structure with brand, theme, and baseline data', () => {
      const output = createExportOutput({
        brand: {
          eboks: {
            colors: {
              primary: {
                $value: '#0066cc',
                $type: 'color',
                $variableId: 'brand:eboks:VariableID:123:456'
              }
            }
          }
        },
        theme: {
          light: {
            bg: {
              primary: {
                $value: '{colors.neutral.100}',
                $type: 'color',
                $variableId: 'theme:light:VariableID:789:012'
              }
            }
          }
        },
        baseline: {
          'brand:eboks:VariableID:123:456': {
            path: 'colors.primary',
            value: '#0066cc',
            type: 'color',
            brand: 'eboks',
            collection: 'brand'
          }
        }
      });

      const validation = validateExportOutput(output);
      expect(validation.valid).toBe(true);

      // Verify nested token structure
      expect(output.brand.eboks.colors.primary.$value).toBe('#0066cc');
      expect(output.brand.eboks.colors.primary.$type).toBe('color');
      expect(output.brand.eboks.colors.primary.$variableId).toBe('brand:eboks:VariableID:123:456');

      // Verify theme structure with alias reference
      expect(output.theme.light.bg.primary.$value).toBe('{colors.neutral.100}');

      // Verify baseline entry
      const baselineEntry = output.baseline['brand:eboks:VariableID:123:456'];
      expect(baselineEntry.path).toBe('colors.primary');
      expect(baselineEntry.value).toBe('#0066cc');
      expect(baselineEntry.type).toBe('color');
      expect(baselineEntry.brand).toBe('eboks');
      expect(baselineEntry.collection).toBe('brand');
    });

    test('validates missing sections are detected', () => {
      // Test with missing $metadata
      const noMetadata = { brand: {}, theme: {}, globals: {}, baseline: {}, migrations: [] };
      expect(validateExportOutput(noMetadata).valid).toBe(false);
      expect(validateExportOutput(noMetadata).errors).toContain('Missing $metadata section');

      // Test with missing brand section
      const noBrand = {
        $metadata: { version: '1.0', exportedAt: '2024-01-01' },
        theme: {}, globals: {}, baseline: {}, migrations: []
      };
      expect(validateExportOutput(noBrand).valid).toBe(false);
      expect(validateExportOutput(noBrand).errors).toContain('Missing brand section');

      // Test with migrations not being an array
      const invalidMigrations = {
        $metadata: { version: '1.0', exportedAt: '2024-01-01' },
        brand: {}, theme: {}, globals: {}, baseline: {},
        migrations: {}
      };
      expect(validateExportOutput(invalidMigrations).valid).toBe(false);
      expect(validateExportOutput(invalidMigrations).errors).toContain('migrations must be an array');
    });
  });
});
