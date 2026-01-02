// =============================================================================
// Storage Tests
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { resetFigmaMock, setSharedPluginData } from '../__mocks__/figma';
import {
  saveChunked,
  loadChunked,
  clearChunks,
  saveSimple,
  loadSimple,
  generateBaselineHash,
} from './storage';

describe('storage', () => {
  beforeEach(() => {
    resetFigmaMock();
  });

  describe('saveSimple / loadSimple', () => {
    it('should save and load simple data', () => {
      const data = { foo: 'bar', count: 42 };
      saveSimple('testKey', data);
      const loaded = loadSimple<typeof data>('testKey');
      expect(loaded).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      const loaded = loadSimple('nonExistent');
      expect(loaded).toBeNull();
    });

    it('should handle arrays', () => {
      const data = ['a', 'b', 'c'];
      saveSimple('arrayKey', data);
      const loaded = loadSimple<string[]>('arrayKey');
      expect(loaded).toEqual(data);
    });

    it('should handle nested objects', () => {
      const data = {
        level1: {
          level2: {
            value: 'deep',
          },
        },
      };
      saveSimple('nestedKey', data);
      const loaded = loadSimple<typeof data>('nestedKey');
      expect(loaded).toEqual(data);
    });
  });

  describe('saveChunked / loadChunked', () => {
    it('should save and load small data', () => {
      const data = { small: 'data' };
      saveChunked('testChunked', data);
      const loaded = loadChunked<typeof data>('testChunked');
      expect(loaded).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      const loaded = loadChunked('nonExistentChunked');
      expect(loaded).toBeNull();
    });

    it('should save and load complex data', () => {
      const data = {
        baseline: {
          'colors.primary': {
            variableId: 'VariableID:123:456',
            path: 'colors.primary',
            value: { r: 1, g: 0, b: 0 },
          },
        },
        metadata: {
          syncedAt: '2024-01-01T00:00:00Z',
        },
      };
      saveChunked('complexData', data);
      const loaded = loadChunked<typeof data>('complexData');
      expect(loaded).toEqual(data);
    });
  });

  describe('clearChunks', () => {
    it('should clear saved chunks', () => {
      const data = { test: 'data' };
      saveChunked('toClear', data);

      // Verify it exists
      expect(loadChunked('toClear')).toEqual(data);

      // Clear it
      clearChunks('toClear');

      // Should be null now
      expect(loadChunked('toClear')).toBeNull();
    });
  });

  describe('generateBaselineHash', () => {
    it('should generate consistent hash for same content', () => {
      const tokens = [
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000' },
        { variableId: 'var2', path: 'colors.secondary', value: '#00ff00' },
      ];
      const styles = [
        { styleId: 'style1', path: 'text.heading', value: { fontSize: 24 } },
      ];

      const hash1 = generateBaselineHash(tokens, styles);
      const hash2 = generateBaselineHash(tokens, styles);

      expect(hash1).toBe(hash2);
    });

    it('should generate same hash regardless of token order', () => {
      const tokens1 = [
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000' },
        { variableId: 'var2', path: 'colors.secondary', value: '#00ff00' },
      ];
      const tokens2 = [
        { variableId: 'var2', path: 'colors.secondary', value: '#00ff00' },
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000' },
      ];

      const hash1 = generateBaselineHash(tokens1, []);
      const hash2 = generateBaselineHash(tokens2, []);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different content', () => {
      const tokens1 = [
        { variableId: 'var1', path: 'colors.primary', value: '#ff0000' },
      ];
      const tokens2 = [
        { variableId: 'var1', path: 'colors.primary', value: '#0000ff' },
      ];

      const hash1 = generateBaselineHash(tokens1, []);
      const hash2 = generateBaselineHash(tokens2, []);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle nested value objects deterministically', () => {
      const tokens1 = [
        { variableId: 'var1', path: 'color', value: { r: 1, g: 0.5, b: 0 } },
      ];
      const tokens2 = [
        { variableId: 'var1', path: 'color', value: { b: 0, r: 1, g: 0.5 } },
      ];

      const hash1 = generateBaselineHash(tokens1, []);
      const hash2 = generateBaselineHash(tokens2, []);

      expect(hash1).toBe(hash2);
    });

    it('should return 8-character hex string', () => {
      const hash = generateBaselineHash([], []);
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
  });
});
