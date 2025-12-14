import { describe, it, expect } from 'vitest';
import { splitTokens, parseVariableId } from './tokens.js';
import { RawTokens } from '../types/index.js';

describe('tokens', () => {
  describe('splitTokens', () => {
    it('should split raw flat tokens into a map of file names to nested content', () => {
      const rawTokens: RawTokens = {
        'var1': { path: 'colors.primary.base', value: '#0000ff', type: 'COLOR', collection: 'Default', mode: 'light' },
        'var2': { path: 'colors.primary.hover', value: '#0000dd', type: 'COLOR', collection: 'Default', mode: 'light' },
        'var3': { path: 'spacing.small', value: '8px', type: 'DIMENSION', collection: 'Default', mode: 'light' },
      };

      const result = splitTokens(rawTokens);

      expect(result.size).toBe(2);
      expect(result.get('colors.json')).toEqual({
        primary: {
          base: { value: '#0000ff' },
          hover: { value: '#0000dd' },
        },
      });
      expect(result.get('spacing.json')).toEqual({
        small: { value: '8px' },
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
