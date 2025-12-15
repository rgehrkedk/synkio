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
              base: { '$value': '#0000ff', '$type': 'COLOR' },
              hover: { '$value': '#0000dd', '$type': 'COLOR' },
            },
          },
        },
      });
      
      const spacingFile = result.get('spacing.value.json');
      expect(spacingFile).toBeDefined();
      expect(spacingFile!.collection).toBe('spacing');
      expect(spacingFile!.content).toEqual({
        value: {
          spacing: {
            small: { '$value': '8px', '$type': 'FLOAT' },
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
