import { describe, it, expect } from 'vitest';
import { splitTokens, parseVariableId, normalizeStyleData, hasStyles, getStyleCount, splitStyles } from './tokens.js';
import { RawTokens, RawStyles } from '../types/index.js';

describe('tokens', () => {
  describe('splitTokens', () => {
    it('should split raw flat tokens into a map of file names to nested content', () => {
      // Note: path format is "collection.group.name" - the collection is used for file naming
      const rawTokens: RawTokens = {
        'var1': { variableId: 'var1', path: 'colors.primary.base', value: '#0000ff', type: 'COLOR', collection: 'colors', mode: 'value' },
        'var2': { variableId: 'var2', path: 'colors.primary.hover', value: '#0000dd', type: 'COLOR', collection: 'colors', mode: 'value' },
        'var3': { variableId: 'var3', path: 'spacing.small', value: '8px', type: 'FLOAT', collection: 'spacing', mode: 'value' },
      };

      const result = splitTokens(rawTokens);

      expect(result.size).toBe(2);
      // File key is "collection.mode", nested path does NOT include mode by default (includeMode: false)
      const colorsFile = result.get('colors.value.json');
      expect(colorsFile).toBeDefined();
      expect(colorsFile!.collection).toBe('colors');
      expect(colorsFile!.content).toEqual({
        colors: {
          primary: {
            base: { '$value': '#0000ff', '$type': 'color' },
            hover: { '$value': '#0000dd', '$type': 'color' },
          },
        },
      });

      const spacingFile = result.get('spacing.value.json');
      expect(spacingFile).toBeDefined();
      expect(spacingFile!.collection).toBe('spacing');
      // Type is inferred from path: "spacing" in path → dimension type
      expect(spacingFile!.content).toEqual({
        spacing: {
          small: { '$value': '8px', '$type': 'dimension' },
        },
      });
    });

    it('should handle an empty object', () => {
      const result = splitTokens({});
      expect(result.size).toBe(0);
    });

    it('should include custom dir when configured', () => {
      const rawTokens: RawTokens = {
        'var1': { variableId: 'var1', path: 'colors.primary.base', value: '#0000ff', type: 'COLOR', collection: 'colors', mode: 'light' },
      };

      const result = splitTokens(rawTokens, {
        collections: {
          colors: { dir: 'src/tokens/colors' }
        }
      });

      const colorsFile = result.get('colors.light.json');
      expect(colorsFile).toBeDefined();
      expect(colorsFile!.dir).toBe('src/tokens/colors');
    });

    // Token Output Options Tests
    describe('dtcg option', () => {
      it('should use DTCG format ($value, $type) by default', () => {
        const rawTokens: RawTokens = {
          'var1': { variableId: 'var1', path: 'colors.primary', value: '#0066cc', type: 'COLOR', collection: 'colors', mode: 'default' },
        };

        const result = splitTokens(rawTokens);
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).toHaveProperty('$value', '#0066cc');
        expect(token).toHaveProperty('$type', 'color');
        expect(token).not.toHaveProperty('value');
        expect(token).not.toHaveProperty('type');
      });

      it('should use legacy format (value, type) when dtcg is false', () => {
        const rawTokens: RawTokens = {
          'var1': { variableId: 'var1', path: 'colors.primary', value: '#0066cc', type: 'COLOR', collection: 'colors', mode: 'default' },
        };

        const result = splitTokens(rawTokens, { dtcg: false });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).toHaveProperty('value', '#0066cc');
        expect(token).toHaveProperty('type', 'color');
        expect(token).not.toHaveProperty('$value');
        expect(token).not.toHaveProperty('$type');
      });
    });

    describe('includeVariableId option', () => {
      it('should not include variableId by default', () => {
        const rawTokens: RawTokens = {
          'var1': { variableId: 'VariableID:123:456', path: 'colors.primary', value: '#0066cc', type: 'COLOR', collection: 'colors', mode: 'default' },
        };

        const result = splitTokens(rawTokens);
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).not.toHaveProperty('$extensions');
      });

      it('should include variableId in $extensions when includeVariableId is true', () => {
        const rawTokens: RawTokens = {
          'var1': { variableId: 'VariableID:123:456', path: 'colors.primary', value: '#0066cc', type: 'COLOR', collection: 'colors', mode: 'default' },
        };

        const result = splitTokens(rawTokens, { includeVariableId: true });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).toHaveProperty('$extensions');
        expect(token.$extensions).toHaveProperty('com.figma');
        expect(token.$extensions['com.figma']).toHaveProperty('variableId', 'VariableID:123:456');
      });

      it('should use extensions key (not $extensions) when dtcg is false and includeVariableId is true', () => {
        const rawTokens: RawTokens = {
          'var1': { variableId: 'VariableID:123:456', path: 'colors.primary', value: '#0066cc', type: 'COLOR', collection: 'colors', mode: 'default' },
        };

        const result = splitTokens(rawTokens, { dtcg: false, includeVariableId: true });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).toHaveProperty('extensions');
        expect(token).not.toHaveProperty('$extensions');
        expect(token.extensions['com.figma']).toHaveProperty('variableId', 'VariableID:123:456');
      });
    });

    describe('extensions.description option', () => {
      it('should not include description by default', () => {
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'var1',
            path: 'colors.primary',
            value: '#0066cc',
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            description: 'Primary brand color',
          },
        };

        const result = splitTokens(rawTokens);
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).not.toHaveProperty('$description');
        expect(token).not.toHaveProperty('description');
      });

      it('should include $description when extensions.description is true', () => {
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'var1',
            path: 'colors.primary',
            value: '#0066cc',
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            description: 'Primary brand color',
          },
        };

        const result = splitTokens(rawTokens, { extensions: { description: true } });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).toHaveProperty('$description', 'Primary brand color');
      });

      it('should use description key (not $description) when dtcg is false and extensions.description is true', () => {
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'var1',
            path: 'colors.primary',
            value: '#0066cc',
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            description: 'Primary brand color',
          },
        };

        const result = splitTokens(rawTokens, { dtcg: false, extensions: { description: true } });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).toHaveProperty('description', 'Primary brand color');
        expect(token).not.toHaveProperty('$description');
      });
    });

    describe('extensions.scopes option', () => {
      it('should not include scopes by default', () => {
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'var1',
            path: 'colors.primary',
            value: '#0066cc',
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            scopes: ['FRAME_FILL', 'TEXT_FILL'],
          },
        };

        const result = splitTokens(rawTokens);
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).not.toHaveProperty('$extensions');
      });

      it('should include scopes in $extensions when extensions.scopes is true', () => {
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'var1',
            path: 'colors.primary',
            value: '#0066cc',
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            scopes: ['FRAME_FILL', 'TEXT_FILL'],
          },
        };

        const result = splitTokens(rawTokens, { extensions: { scopes: true } });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).toHaveProperty('$extensions');
        expect(token.$extensions['com.figma']).toHaveProperty('scopes', ['FRAME_FILL', 'TEXT_FILL']);
      });

      it('should not include scopes if array is empty', () => {
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'var1',
            path: 'colors.primary',
            value: '#0066cc',
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            scopes: [],
          },
        };

        const result = splitTokens(rawTokens, { extensions: { scopes: true } });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).not.toHaveProperty('$extensions');
      });
    });

    describe('extensions.codeSyntax option', () => {
      it('should not include codeSyntax by default', () => {
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'var1',
            path: 'colors.primary',
            value: '#0066cc',
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            codeSyntax: { WEB: 'var(--colors-primary)' },
          },
        };

        const result = splitTokens(rawTokens);
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).not.toHaveProperty('$extensions');
      });

      it('should include codeSyntax in $extensions when extensions.codeSyntax is true', () => {
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'var1',
            path: 'colors.primary',
            value: '#0066cc',
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            codeSyntax: { WEB: 'var(--colors-primary)', ANDROID: 'colorsPrimary' },
          },
        };

        const result = splitTokens(rawTokens, { extensions: { codeSyntax: true } });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).toHaveProperty('$extensions');
        expect(token.$extensions['com.figma']).toHaveProperty('codeSyntax');
        expect(token.$extensions['com.figma'].codeSyntax).toEqual({ WEB: 'var(--colors-primary)', ANDROID: 'colorsPrimary' });
      });

      it('should not include codeSyntax if object is empty', () => {
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'var1',
            path: 'colors.primary',
            value: '#0066cc',
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            codeSyntax: {},
          },
        };

        const result = splitTokens(rawTokens, { extensions: { codeSyntax: true } });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;
        expect(token).not.toHaveProperty('$extensions');
      });
    });

    describe('combined extensions', () => {
      it('should include all extensions when all options are enabled', () => {
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'VariableID:123:456',
            path: 'colors.primary',
            value: '#0066cc',
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            description: 'Primary brand color',
            scopes: ['FRAME_FILL', 'TEXT_FILL'],
            codeSyntax: { WEB: 'var(--colors-primary)' },
          },
        };

        const result = splitTokens(rawTokens, {
          includeVariableId: true,
          extensions: {
            description: true,
            scopes: true,
            codeSyntax: true
          }
        });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;

        // Check DTCG format
        expect(token).toHaveProperty('$value', '#0066cc');
        expect(token).toHaveProperty('$type', 'color');
        expect(token).toHaveProperty('$description', 'Primary brand color');

        // Check extensions
        expect(token).toHaveProperty('$extensions');
        expect(token.$extensions['com.figma']).toHaveProperty('variableId', 'VariableID:123:456');
        expect(token.$extensions['com.figma']).toHaveProperty('scopes', ['FRAME_FILL', 'TEXT_FILL']);
        expect(token.$extensions['com.figma']).toHaveProperty('codeSyntax', { WEB: 'var(--colors-primary)' });
      });

      it('should match expected output format from requirements', () => {
        // This test matches the example from the requirements
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'VariableID:123:456',
            path: 'colors.primary',
            value: { r: 0, g: 0.4, b: 0.8, a: 1 }, // Figma color format
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            description: 'Primary brand color',
            scopes: ['FRAME_FILL', 'TEXT_FILL'],
            codeSyntax: { WEB: 'var(--colors-primary)' },
          },
        };

        const result = splitTokens(rawTokens, {
          includeVariableId: true,
          extensions: {
            description: true,
            scopes: true,
            codeSyntax: true
          }
        });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;

        // Check expected output structure
        expect(token.$value).toBe('#0066cc'); // Color converted from Figma format
        expect(token.$type).toBe('color');
        expect(token.$description).toBe('Primary brand color');
        expect(token.$extensions).toEqual({
          'com.figma': {
            variableId: 'VariableID:123:456',
            scopes: ['FRAME_FILL', 'TEXT_FILL'],
            codeSyntax: { WEB: 'var(--colors-primary)' },
          },
        });
      });
    });

    describe('defaults work correctly', () => {
      it('should use all defaults when no options provided', () => {
        const rawTokens: RawTokens = {
          'var1': {
            variableId: 'VariableID:123:456',
            path: 'colors.primary',
            value: '#0066cc',
            type: 'COLOR',
            collection: 'colors',
            mode: 'default',
            description: 'Primary brand color',
            scopes: ['FRAME_FILL', 'TEXT_FILL'],
            codeSyntax: { WEB: 'var(--colors-primary)' },
          },
        };

        const result = splitTokens(rawTokens);
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.colors.primary;

        // Default: dtcg = true
        expect(token).toHaveProperty('$value');
        expect(token).toHaveProperty('$type');

        // Default: includeVariableId = false, extensions.* = false, includeMode = false
        expect(token).not.toHaveProperty('$description');
        expect(token).not.toHaveProperty('$extensions');
      });
    });

    describe('names mapping option', () => {
      it('should rename modes in output filenames when using splitBy: mode', () => {
        const rawTokens: RawTokens = {
          'var1': { variableId: 'var1', path: 'bg.primary', value: '#ffffff', type: 'COLOR', collection: 'theme', mode: 'light' },
          'var2': { variableId: 'var2', path: 'bg.primary', value: '#000000', type: 'COLOR', collection: 'theme', mode: 'dark' },
        };

        const result = splitTokens(rawTokens, {
          collections: {
            theme: {
              splitBy: 'mode',
              names: { light: 'day', dark: 'night' },
            }
          }
        });

        expect(result.size).toBe(2);
        expect(result.has('theme.day.json')).toBe(true);
        expect(result.has('theme.night.json')).toBe(true);
        expect(result.has('theme.light.json')).toBe(false);
        expect(result.has('theme.dark.json')).toBe(false);
      });

      it('should rename groups in output filenames when using splitBy: group', () => {
        const rawTokens: RawTokens = {
          'var1': { variableId: 'var1', path: 'colors.primary', value: '#0066cc', type: 'COLOR', collection: 'globals', mode: 'default' },
          'var2': { variableId: 'var2', path: 'spacing.md', value: '16px', type: 'FLOAT', collection: 'globals', mode: 'default' },
        };

        const result = splitTokens(rawTokens, {
          collections: {
            globals: {
              splitBy: 'group',
              names: { colors: 'palette', spacing: 'space' },
            }
          }
        });

        expect(result.size).toBe(2);
        expect(result.has('palette.json')).toBe(true);
        expect(result.has('space.json')).toBe(true);
        expect(result.has('colors.json')).toBe(false);
        expect(result.has('spacing.json')).toBe(false);
      });

      it('should only rename mapped names, leave unmapped as-is', () => {
        const rawTokens: RawTokens = {
          'var1': { variableId: 'var1', path: 'colors.primary', value: '#0066cc', type: 'COLOR', collection: 'globals', mode: 'default' },
          'var2': { variableId: 'var2', path: 'spacing.md', value: '16px', type: 'FLOAT', collection: 'globals', mode: 'default' },
          'var3': { variableId: 'var3', path: 'font.size', value: '14px', type: 'FLOAT', collection: 'globals', mode: 'default' },
        };

        const result = splitTokens(rawTokens, {
          collections: {
            globals: {
              splitBy: 'group',
              names: { colors: 'palette' },  // Only colors mapped
            }
          }
        });

        expect(result.size).toBe(3);
        expect(result.has('palette.json')).toBe(true);  // Mapped
        expect(result.has('spacing.json')).toBe(true);  // Not mapped, uses original
        expect(result.has('font.json')).toBe(true);     // Not mapped, uses original
      });

      it('should work with custom file prefix and mode names mapping', () => {
        const rawTokens: RawTokens = {
          'var1': { variableId: 'var1', path: 'bg.primary', value: '#ffffff', type: 'COLOR', collection: 'theme', mode: 'light' },
          'var2': { variableId: 'var2', path: 'bg.primary', value: '#000000', type: 'COLOR', collection: 'theme', mode: 'dark' },
        };

        const result = splitTokens(rawTokens, {
          collections: {
            theme: {
              file: 'semantic',
              splitBy: 'mode',
              names: { light: 'day' },  // Only light is mapped
            }
          }
        });

        expect(result.size).toBe(2);
        expect(result.has('semantic.day.json')).toBe(true);   // Mapped
        expect(result.has('semantic.dark.json')).toBe(true);  // Not mapped, uses original
      });

      it('should not affect token content, only filenames', () => {
        const rawTokens: RawTokens = {
          'var1': { variableId: 'var1', path: 'bg.primary', value: '#ffffff', type: 'COLOR', collection: 'theme', mode: 'light' },
        };

        const result = splitTokens(rawTokens, {
          collections: {
            theme: {
              splitBy: 'mode',
              names: { light: 'day' },
            }
          }
        });

        const file = result.get('theme.day.json');
        expect(file).toBeDefined();
        // Token content should still use original path structure
        expect(file!.content.bg.primary.$value).toBe('#ffffff');
      });
    });
  });

  describe('parseVariableId', () => {
    it('should parse new format with collection.mode', () => {
      const { varId, collection, mode } = parseVariableId('VariableID:1:31:colors.default');
      expect(varId).toBe('VariableID:1:31');
      expect(collection).toBe('colors');
      expect(mode).toBe('default');
    });

    it('should parse new format with multi-word mode', () => {
      const { varId, collection, mode } = parseVariableId('VariableID:2:64:theme.light');
      expect(varId).toBe('VariableID:2:64');
      expect(collection).toBe('theme');
      expect(mode).toBe('light');
    });

    it('should handle legacy format without collection (fallback)', () => {
      const { varId, collection, mode } = parseVariableId('VariableID:12345:dark');
      expect(varId).toBe('VariableID:12345');
      expect(collection).toBe('unknown');
      expect(mode).toBe('dark');
    });

    it('should handle IDs without a mode prefix', () => {
      const { varId, collection, mode } = parseVariableId('VariableID:67890');
      expect(varId).toBe('VariableID');
      expect(collection).toBe('unknown');
      expect(mode).toBe('67890');
    });

    it('should handle IDs that might not have a colon', () => {
        const { varId, collection, mode } = parseVariableId('JustOneId');
        expect(varId).toBe('JustOneId');
        expect(collection).toBe('unknown');
        expect(mode).toBe('default');
    });
  });
});

// =============================================================================
// Style Functions Tests
// =============================================================================

describe('styles', () => {
  const samplePluginDataWithStyles = {
    version: '3.0.0',
    timestamp: '2024-01-01T00:00:00Z',
    tokens: [],
    styles: [
      {
        styleId: 'S:paint1',
        type: 'paint',
        path: 'brand.primary',
        value: { $type: 'color', $value: '#ff0000' },
        description: 'Primary brand color',
      },
      {
        styleId: 'S:paint2',
        type: 'paint',
        path: 'brand.secondary',
        value: { $type: 'color', $value: '#00ff00' },
      },
      {
        styleId: 'S:text1',
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
      {
        styleId: 'S:effect1',
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
    ],
  };

  describe('hasStyles', () => {
    it('should return true when styles array is present and not empty', () => {
      expect(hasStyles(samplePluginDataWithStyles)).toBe(true);
    });

    it('should return false when styles is empty', () => {
      expect(hasStyles({ ...samplePluginDataWithStyles, styles: [] })).toBe(false);
    });

    it('should return false when styles is undefined', () => {
      const noStyles = { version: '2.0.0', timestamp: '2024-01-01', tokens: [] };
      expect(hasStyles(noStyles)).toBe(false);
    });
  });

  describe('getStyleCount', () => {
    it('should count styles by type', () => {
      const counts = getStyleCount(samplePluginDataWithStyles);
      expect(counts.paint).toBe(2);
      expect(counts.text).toBe(1);
      expect(counts.effect).toBe(1);
      expect(counts.total).toBe(4);
    });

    it('should return zeros when no styles', () => {
      const counts = getStyleCount({ styles: [] });
      expect(counts.paint).toBe(0);
      expect(counts.text).toBe(0);
      expect(counts.effect).toBe(0);
      expect(counts.total).toBe(0);
    });
  });

  describe('normalizeStyleData', () => {
    it('should convert styles array to RawStyles map keyed by styleId:type', () => {
      const result = normalizeStyleData(samplePluginDataWithStyles);

      expect(Object.keys(result)).toHaveLength(4);
      expect(result['S:paint1:paint']).toBeDefined();
      expect(result['S:paint2:paint']).toBeDefined();
      expect(result['S:text1:text']).toBeDefined();
      expect(result['S:effect1:effect']).toBeDefined();
    });

    it('should preserve all style properties', () => {
      const result = normalizeStyleData(samplePluginDataWithStyles);

      const paintStyle = result['S:paint1:paint'];
      expect(paintStyle.styleId).toBe('S:paint1');
      expect(paintStyle.type).toBe('paint');
      expect(paintStyle.path).toBe('brand.primary');
      expect(paintStyle.value.$value).toBe('#ff0000');
      expect(paintStyle.description).toBe('Primary brand color');
    });

    it('should return empty object when no styles', () => {
      const result = normalizeStyleData({ tokens: [] });
      expect(result).toEqual({});
    });
  });

  describe('splitStyles', () => {
    const normalizedStyles: RawStyles = {
      'S:paint1:paint': {
        styleId: 'S:paint1',
        type: 'paint',
        path: 'brand.primary',
        value: { $type: 'color', $value: '#ff0000' },
      },
      'S:paint2:paint': {
        styleId: 'S:paint2',
        type: 'paint',
        path: 'brand.secondary',
        value: { $type: 'color', $value: '#00ff00' },
      },
      'S:text1:text': {
        styleId: 'S:text1',
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
      'S:effect1:effect': {
        styleId: 'S:effect1',
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

    it('should split styles by type into separate files', () => {
      const result = splitStyles(normalizedStyles);

      expect(result.size).toBe(3); // paint, text, effect
      expect(result.has('paint-styles.json')).toBe(true);
      expect(result.has('text-styles.json')).toBe(true);
      expect(result.has('effect-styles.json')).toBe(true);
    });

    it('should create nested structure from paths', () => {
      const result = splitStyles(normalizedStyles);

      const paintFile = result.get('paint-styles.json');
      expect(paintFile).toBeDefined();
      expect(paintFile!.content.brand.primary.$value).toBe('#ff0000');
      expect(paintFile!.content.brand.secondary.$value).toBe('#00ff00');
    });

    it('should use custom filenames when configured', () => {
      const result = splitStyles(normalizedStyles, {
        paint: { file: 'colors' },
        text: { file: 'typography' },
      });

      expect(result.has('colors.json')).toBe(true);
      expect(result.has('typography.json')).toBe(true);
      expect(result.has('effect-styles.json')).toBe(true); // Uses default
    });

    it('should exclude disabled style types', () => {
      const result = splitStyles(normalizedStyles, {
        paint: { enabled: false },
        effect: { enabled: false },
      });

      expect(result.size).toBe(1);
      expect(result.has('text-styles.json')).toBe(true);
      expect(result.has('paint-styles.json')).toBe(false);
      expect(result.has('effect-styles.json')).toBe(false);
    });

    it('should return empty map when all styles disabled', () => {
      const result = splitStyles(normalizedStyles, { enabled: false });
      expect(result.size).toBe(0);
    });

    it('should return empty map for empty input', () => {
      const result = splitStyles({});
      expect(result.size).toBe(0);
    });

    it('should include custom dir in file data', () => {
      const result = splitStyles(normalizedStyles, {
        paint: { dir: 'src/styles/colors' },
      });

      const paintFile = result.get('paint-styles.json');
      expect(paintFile).toBeDefined();
      expect(paintFile!.dir).toBe('src/styles/colors');

      const textFile = result.get('text-styles.json');
      expect(textFile).toBeDefined();
      expect(textFile!.dir).toBeUndefined(); // No custom dir
    });

    it('should set correct styleType on each file', () => {
      const result = splitStyles(normalizedStyles);

      expect(result.get('paint-styles.json')?.styleType).toBe('paint');
      expect(result.get('text-styles.json')?.styleType).toBe('text');
      expect(result.get('effect-styles.json')?.styleType).toBe('effect');
    });

    it('should only output files for types that have styles', () => {
      const paintOnly: RawStyles = {
        'S:paint1:paint': normalizedStyles['S:paint1:paint'],
      };

      const result = splitStyles(paintOnly);
      expect(result.size).toBe(1);
      expect(result.has('paint-styles.json')).toBe(true);
      expect(result.has('text-styles.json')).toBe(false);
      expect(result.has('effect-styles.json')).toBe(false);
    });

    describe('mergeInto option', () => {
      it('should include mergeInto info in result when configured', () => {
        const result = splitStyles(normalizedStyles, {
          text: {
            mergeInto: {
              collection: 'globals',
              group: 'font',
            },
          },
        });

        const textFile = result.get('text-styles.json');
        expect(textFile).toBeDefined();
        expect(textFile!.mergeInto).toBeDefined();
        expect(textFile!.mergeInto!.collection).toBe('globals');
        expect(textFile!.mergeInto!.group).toBe('font');
      });

      it('should not have mergeInto when not configured', () => {
        const result = splitStyles(normalizedStyles, {
          text: { file: 'typography' },
        });

        const textFile = result.get('typography.json');
        expect(textFile).toBeDefined();
        expect(textFile!.mergeInto).toBeUndefined();
      });

      it('should support mergeInto without group for splitBy: none collections', () => {
        const result = splitStyles(normalizedStyles, {
          paint: {
            mergeInto: {
              collection: 'colors',
            },
          },
        });

        const paintFile = result.get('paint-styles.json');
        expect(paintFile).toBeDefined();
        expect(paintFile!.mergeInto).toBeDefined();
        expect(paintFile!.mergeInto!.collection).toBe('colors');
        expect(paintFile!.mergeInto!.group).toBeUndefined();
      });

      it('should work with custom file name and mergeInto together', () => {
        const result = splitStyles(normalizedStyles, {
          effect: {
            file: 'shadows',
            mergeInto: {
              collection: 'globals',
              group: 'shadow',
            },
          },
        });

        const effectFile = result.get('shadows.json');
        expect(effectFile).toBeDefined();
        expect(effectFile!.mergeInto!.collection).toBe('globals');
        expect(effectFile!.mergeInto!.group).toBe('shadow');
      });
    });
  });
});
