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
      expect(result.get('colors.value.json')).toEqual({
        value: {
          colors: {
            primary: {
              base: { '$value': '#0000ff', '$type': 'COLOR' },
              hover: { '$value': '#0000dd', '$type': 'COLOR' },
            },
          },
        },
      });
      expect(result.get('spacing.value.json')).toEqual({
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
  });

  describe('parseVariableId', () => {
    it('should parse a standard prefixed ID', () => {
      const { varId, mode } = parseVariableId('VariableID:12345:dark');
      expect(varId).toBe('VariableID:12345');
      expect(mode).toBe('dark');
    });

    it('should handle IDs without a mode prefix', () => {
      const { varId, mode } = parseVariableId('VariableID:67890');
      expect(varId).toBe('VariableID');
      expect(mode).toBe('67890');
    });

    it('should handle IDs that might not have a colon', () => {
        const { varId, mode } = parseVariableId('JustOneId');
        expect(varId).toBe('JustOneId');
        expect(mode).toBe('default');
    });
  });
});
