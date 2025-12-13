/**
 * Tests for export transformer module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveVariableValue, setNestedValue } from '../../../src/backend/export/transformer';

// Mock Figma API
global.figma = {
  variables: {
    getVariableByIdAsync: vi.fn()
  }
} as any;

describe('resolveVariableValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve color values to hex format', async () => {
    const mockVariable: Variable = {
      id: 'var-1',
      name: 'colors/primary',
      resolvedType: 'COLOR',
      valuesByMode: {
        'mode-1': { r: 1, g: 0, b: 0 } // Red
      }
    } as any;

    const result = await resolveVariableValue(mockVariable, 'mode-1');
    expect(result).toBe('#ff0000');
  });

  it('should resolve VARIABLE_ALIAS to alias string format', async () => {
    const mockAliasedVariable: Variable = {
      id: 'var-target',
      name: 'colors/primary',
      resolvedType: 'COLOR'
    } as any;

    (global.figma.variables.getVariableByIdAsync as any).mockResolvedValue(mockAliasedVariable);

    const mockVariable: Variable = {
      id: 'var-2',
      name: 'colors/accent',
      resolvedType: 'COLOR',
      valuesByMode: {
        'mode-1': { type: 'VARIABLE_ALIAS', id: 'var-target' }
      }
    } as any;

    const result = await resolveVariableValue(mockVariable, 'mode-1');
    expect(result).toBe('{colors.primary}');
  });

  it('should convert path separators in alias references', async () => {
    const mockAliasedVariable: Variable = {
      id: 'var-target',
      name: 'semantic/colors/background',
      resolvedType: 'COLOR'
    } as any;

    (global.figma.variables.getVariableByIdAsync as any).mockResolvedValue(mockAliasedVariable);

    const mockVariable: Variable = {
      id: 'var-3',
      name: 'colors/surface',
      resolvedType: 'COLOR',
      valuesByMode: {
        'mode-1': { type: 'VARIABLE_ALIAS', id: 'var-target' }
      }
    } as any;

    const result = await resolveVariableValue(mockVariable, 'mode-1');
    expect(result).toBe('{semantic.colors.background}');
  });

  it('should return raw value for non-color types', async () => {
    const mockVariable: Variable = {
      id: 'var-4',
      name: 'spacing/small',
      resolvedType: 'FLOAT',
      valuesByMode: {
        'mode-1': 8
      }
    } as any;

    const result = await resolveVariableValue(mockVariable, 'mode-1');
    expect(result).toBe(8);
  });

  it('should handle string values', async () => {
    const mockVariable: Variable = {
      id: 'var-5',
      name: 'fonts/family',
      resolvedType: 'STRING',
      valuesByMode: {
        'mode-1': 'Inter'
      }
    } as any;

    const result = await resolveVariableValue(mockVariable, 'mode-1');
    expect(result).toBe('Inter');
  });
});

describe('setNestedValue', () => {
  it('should set value in nested object structure', () => {
    const obj = {};
    setNestedValue(obj, ['colors', 'primary'], '#ff0000');

    expect(obj).toEqual({
      colors: {
        primary: '#ff0000'
      }
    });
  });

  it('should create multiple levels of nesting', () => {
    const obj = {};
    setNestedValue(obj, ['semantic', 'colors', 'background', 'primary'], '#ffffff');

    expect(obj).toEqual({
      semantic: {
        colors: {
          background: {
            primary: '#ffffff'
          }
        }
      }
    });
  });

  it('should not overwrite existing nested values', () => {
    const obj = {
      colors: {
        primary: '#ff0000'
      }
    };

    setNestedValue(obj, ['colors', 'secondary'], '#00ff00');

    expect(obj).toEqual({
      colors: {
        primary: '#ff0000',
        secondary: '#00ff00'
      }
    });
  });

  it('should handle single-level paths', () => {
    const obj = {};
    setNestedValue(obj, ['simple'], 'value');

    expect(obj).toEqual({
      simple: 'value'
    });
  });

  it('should set complex token objects', () => {
    const obj = {};
    const token = {
      $type: 'color',
      $value: '#ff0000',
      $variableId: 'test-id'
    };

    setNestedValue(obj, ['colors', 'primary'], token);

    expect(obj).toEqual({
      colors: {
        primary: token
      }
    });
  });
});
