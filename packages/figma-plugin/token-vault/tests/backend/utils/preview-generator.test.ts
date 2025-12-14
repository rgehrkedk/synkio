/**
 * Tests for preview generator
 */

import { describe, it, expect } from 'vitest';
import { generatePreview } from '../../../src/backend/utils/preview-generator.js';
import type { LevelConfiguration } from '../../../src/types/level-config.types.js';

describe('generatePreview', () => {
  it('should generate preview for single collection with 1 default mode', () => {
    const data = {
      'red-500': '#ff0000',
      'blue-500': '#0000ff',
      'green-500': '#00ff00',
    };

    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'token-path', exampleKeys: ['red-500', 'blue-500', 'green-500'] }
    ];

    const preview = generatePreview('primitives.json', data, levels);

    expect(preview.totalCollections).toBe(1);
    expect(preview.totalModes).toBe(1);
    expect(preview.totalVariables).toBe(3);
    expect(preview.collections).toHaveLength(1);
    expect(preview.collections[0].name).toBe('primitives');
    expect(preview.collections[0].modes).toHaveLength(1);
    expect(preview.collections[0].modes[0].name).toBe('Mode 1');
    expect(preview.collections[0].modes[0].variableCount).toBe(3);
  });

  it('should generate preview for single collection with 2 modes', () => {
    const data = {
      light: {
        'bg': '#ffffff',
        'text': '#000000',
      },
      dark: {
        'bg': '#000000',
        'text': '#ffffff',
      }
    };

    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'mode', exampleKeys: ['light', 'dark'] },
      { depth: 2, role: 'token-path', exampleKeys: ['bg', 'text'] }
    ];

    const preview = generatePreview('colors.json', data, levels);

    expect(preview.totalCollections).toBe(1);
    expect(preview.totalModes).toBe(2);
    expect(preview.totalVariables).toBe(4);
    expect(preview.collections).toHaveLength(1);
    expect(preview.collections[0].modes).toHaveLength(2);
    expect(preview.collections[0].modes[0].name).toBe('light');
    expect(preview.collections[0].modes[1].name).toBe('dark');
  });

  it('should generate preview for multiple collections', () => {
    const data = {
      semantic: {
        light: {
          'primary': '#0066cc',
        },
        dark: {
          'primary': '#66b3ff',
        }
      },
      primitives: {
        light: {
          'blue-500': '#0066cc',
        },
        dark: {
          'blue-500': '#66b3ff',
        }
      }
    };

    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'collection', exampleKeys: ['semantic', 'primitives'] },
      { depth: 2, role: 'mode', exampleKeys: ['light', 'dark'] },
      { depth: 3, role: 'token-path', exampleKeys: ['primary', 'blue-500'] }
    ];

    const preview = generatePreview('tokens.json', data, levels);

    expect(preview.totalCollections).toBe(2);
    expect(preview.totalModes).toBe(4);
    expect(preview.totalVariables).toBe(4);
    expect(preview.collections).toHaveLength(2);
    expect(preview.collections[0].name).toBe('semantic');
    expect(preview.collections[1].name).toBe('primitives');
  });

  it('should generate sample variables (first 5)', () => {
    const data = {
      'var1': '#ff0000',
      'var2': '#00ff00',
      'var3': '#0000ff',
      'var4': '#ffff00',
      'var5': '#ff00ff',
      'var6': '#00ffff',
      'var7': '#ffffff',
    };

    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'token-path', exampleKeys: ['var1', 'var2', 'var3'] }
    ];

    const preview = generatePreview('colors.json', data, levels);

    expect(preview.collections[0].modes[0].sampleVariables).toHaveLength(5);
    expect(preview.collections[0].modes[0].sampleVariables).toEqual([
      'var1',
      'var2',
      'var3',
      'var4',
      'var5',
    ]);
  });

  it('should generate preview with nested token paths', () => {
    const data = {
      semantic: {
        bg: {
          primary: '#ffffff',
          secondary: '#f5f5f5',
        },
        text: {
          primary: '#000000',
          secondary: '#666666',
        }
      }
    };

    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'collection', exampleKeys: ['semantic'] },
      { depth: 2, role: 'token-path', exampleKeys: ['bg', 'text'] },
      { depth: 3, role: 'token-path', exampleKeys: ['primary', 'secondary'] }
    ];

    const preview = generatePreview('tokens.json', data, levels);

    expect(preview.totalCollections).toBe(1);
    expect(preview.totalModes).toBe(1); // No mode level = default mode
    expect(preview.totalVariables).toBe(4);
    expect(preview.collections[0].modes[0].sampleVariables).toContain('bg/primary');
    expect(preview.collections[0].modes[0].sampleVariables).toContain('bg/secondary');
  });

  it('should handle collection from filename when no collection level defined', () => {
    const data = {
      light: {
        'primary': '#0066cc',
      },
      dark: {
        'primary': '#66b3ff',
      }
    };

    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'mode', exampleKeys: ['light', 'dark'] },
      { depth: 2, role: 'token-path', exampleKeys: ['primary'] }
    ];

    const preview = generatePreview('semantic.json', data, levels);

    expect(preview.totalCollections).toBe(1);
    expect(preview.collections[0].name).toBe('semantic');
    expect(preview.totalModes).toBe(2);
  });

  it('should show Mode 1 when no mode level defined', () => {
    const data = {
      colors: {
        'red': '#ff0000',
        'blue': '#0000ff',
      }
    };

    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'collection', exampleKeys: ['colors'] },
      { depth: 2, role: 'token-path', exampleKeys: ['red', 'blue'] }
    ];

    const preview = generatePreview('tokens.json', data, levels);

    expect(preview.totalModes).toBe(1);
    expect(preview.collections[0].modes[0].name).toBe('Mode 1');
  });

  it('should handle DTCG format tokens with $value', () => {
    const data = {
      'red-500': { $value: '#ff0000', $type: 'color' },
      'blue-500': { $value: '#0000ff', $type: 'color' },
    };

    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'token-path', exampleKeys: ['red-500', 'blue-500'] }
    ];

    const preview = generatePreview('colors.json', data, levels);

    expect(preview.totalVariables).toBe(2);
    expect(preview.collections[0].modes[0].variableCount).toBe(2);
  });
});
