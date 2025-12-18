import { describe, it, expect } from 'vitest';
import { splitTokens, parseVariableId } from './tokens.js';
import { RawTokens } from '../types/index.js';

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
      // File key is "collection.mode", nested path includes mode + full path
      const colorsFile = result.get('colors.value.json');
      expect(colorsFile).toBeDefined();
      expect(colorsFile!.collection).toBe('colors');
      expect(colorsFile!.content).toEqual({
        value: {
          colors: {
            primary: {
              base: { '$value': '#0000ff', '$type': 'color' },
              hover: { '$value': '#0000dd', '$type': 'color' },
            },
          },
        },
      });

      const spacingFile = result.get('spacing.value.json');
      expect(spacingFile).toBeDefined();
      expect(spacingFile!.collection).toBe('spacing');
      // Type is inferred from path: "spacing" in path → dimension type
      expect(spacingFile!.content).toEqual({
        value: {
          spacing: {
            small: { '$value': '8px', '$type': 'dimension' },
          },
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
        expect(token).not.toHaveProperty('$extensions');
      });

      it('should include variableId in $extensions when includeVariableId is true', () => {
        const rawTokens: RawTokens = {
          'var1': { variableId: 'VariableID:123:456', path: 'colors.primary', value: '#0066cc', type: 'COLOR', collection: 'colors', mode: 'default' },
        };

        const result = splitTokens(rawTokens, { includeVariableId: true });
        const colorsFile = result.get('colors.default.json');

        expect(colorsFile).toBeDefined();
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;
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
        const token = colorsFile!.content.default.colors.primary;

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
        const token = colorsFile!.content.default.colors.primary;

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
        const token = colorsFile!.content.default.colors.primary;

        // Default: dtcg = true
        expect(token).toHaveProperty('$value');
        expect(token).toHaveProperty('$type');

        // Default: includeVariableId = false, extensions.* = false
        expect(token).not.toHaveProperty('$description');
        expect(token).not.toHaveProperty('$extensions');
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
