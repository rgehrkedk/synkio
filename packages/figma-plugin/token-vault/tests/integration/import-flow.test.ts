/**
 * Integration tests for complete import flow
 * Tests end-to-end import: collection creation → variable creation → alias resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { importTokens } from '../../src/backend/import/index.js';
import type { CollectionConfig } from '../../src/types/collection.types.js';

// Mock Figma API
const mockCollections = new Map<string, any>();
const mockVariables = new Map<string, any>();

const mockCreateVariableCollection = vi.fn((name: string) => {
  const id = `col_${Math.random().toString(36).substring(7)}`;
  const collection = {
    id,
    name,
    modes: [{ modeId: 'default', name: 'Mode 1' }],
    variableIds: [] as string[],
    addMode: vi.fn((modeName: string) => {
      const modeId = `mode_${Math.random().toString(36).substring(7)}`;
      collection.modes.push({ modeId, name: modeName });
      return modeId;
    }),
    renameMode: vi.fn()
  };
  mockCollections.set(id, collection);
  return collection;
});

const mockCreateVariable = vi.fn((name: string, collection: any, type: VariableResolvedDataType) => {
  const id = `var_${Math.random().toString(36).substring(7)}`;
  const variable = {
    id,
    name,
    variableCollectionId: collection.id,
    resolvedType: type,
    valuesByMode: {},
    description: '',
    setValueForMode: vi.fn((modeId: string, value: any) => {
      variable.valuesByMode[modeId] = value;
    }),
    setVariableCodeSyntax: vi.fn()
  };
  mockVariables.set(name, variable);
  collection.variableIds.push(id);
  return variable;
});

global.figma = {
  variables: {
    createVariableCollection: mockCreateVariableCollection,
    createVariable: mockCreateVariable,
    getLocalVariableCollectionsAsync: vi.fn(async () => Array.from(mockCollections.values())),
    getLocalVariablesAsync: vi.fn(async () => Array.from(mockVariables.values()))
  },
  notify: vi.fn()
} as any;

describe('Import Flow Integration', () => {
  beforeEach(() => {
    mockCollections.clear();
    mockVariables.clear();
    vi.clearAllMocks();
  });

  it('should import single-mode collection with basic tokens', async () => {
    const config: CollectionConfig = {
      name: 'Test Colors',
      isModeCollection: false,
      files: [
        {
          name: 'colors.json',
          content: {
            primary: { value: '#0066cc', type: 'color' },
            secondary: { value: '#ff6600', type: 'color' },
            spacing: {
              small: { value: '8px', type: 'dimension' }
            }
          }
        }
      ]
    };

    await importTokens([config]);

    // Verify collection created
    expect(mockCreateVariableCollection).toHaveBeenCalledWith('Test Colors');
    expect(mockCollections.size).toBe(1);

    // Verify variables created
    expect(mockCreateVariable).toHaveBeenCalledTimes(3);
    expect(mockVariables.has('primary')).toBe(true);
    expect(mockVariables.has('secondary')).toBe(true);
    expect(mockVariables.has('spacing/small')).toBe(true);

    // Verify values set
    const primaryVar = mockVariables.get('primary');
    expect(primaryVar.setValueForMode).toHaveBeenCalled();
  });

  it('should import multi-mode collection with separate files per mode', async () => {
    const config: CollectionConfig = {
      name: 'Theme Colors',
      isModeCollection: true,
      files: [
        {
          name: 'light',
          content: {
            background: { value: '#ffffff', type: 'color' },
            text: { value: '#000000', type: 'color' }
          }
        },
        {
          name: 'dark',
          content: {
            background: { value: '#000000', type: 'color' },
            text: { value: '#ffffff', type: 'color' }
          }
        }
      ]
    };

    await importTokens([config]);

    // Verify collection created with multiple modes
    const collections = Array.from(mockCollections.values());
    expect(collections).toHaveLength(1);
    const collection = collections[0];
    expect(collection.modes).toHaveLength(2); // light + dark
    expect(collection.addMode).toHaveBeenCalledTimes(1); // One mode added (first is default)

    // Verify variables created (background and text)
    expect(mockCreateVariable).toHaveBeenCalledTimes(2);
    expect(mockVariables.has('background')).toBe(true);
    expect(mockVariables.has('text')).toBe(true);

    // Verify both modes have values
    const bgVar = mockVariables.get('background');
    expect(bgVar.setValueForMode).toHaveBeenCalledTimes(2); // light + dark
  });

  it('should import tokens with alias references and resolve in second pass', async () => {
    const config: CollectionConfig = {
      name: 'Aliased Colors',
      isModeCollection: false,
      files: [
        {
          name: 'colors.json',
          content: {
            brand: {
              primary: { value: '#0066cc', type: 'color' },
              secondary: { value: '{brand.primary}', type: 'color' }
            },
            ui: {
              accent: { value: '{brand.primary}', type: 'color' }
            }
          }
        }
      ]
    };

    await importTokens([config]);

    // Verify all variables created
    expect(mockCreateVariable).toHaveBeenCalledTimes(3);
    expect(mockVariables.has('brand/primary')).toBe(true);
    expect(mockVariables.has('brand/secondary')).toBe(true);
    expect(mockVariables.has('ui/accent')).toBe(true);

    // Verify primary has actual color value
    const primaryVar = mockVariables.get('brand/primary');
    expect(primaryVar.setValueForMode).toHaveBeenCalled();

    // Verify aliases resolved to VARIABLE_ALIAS
    const secondaryVar = mockVariables.get('brand/secondary');
    const accentVar = mockVariables.get('ui/accent');

    // Both aliases should have been set to VARIABLE_ALIAS pointing to primary
    expect(secondaryVar.setValueForMode).toHaveBeenCalled();
    expect(accentVar.setValueForMode).toHaveBeenCalled();

    // Verify alias format
    const secondaryCalls = secondaryVar.setValueForMode.mock.calls;
    const aliasValue = secondaryCalls[secondaryCalls.length - 1][1];
    expect(aliasValue).toEqual({
      type: 'VARIABLE_ALIAS',
      id: primaryVar.id
    });
  });

  it('should import tokens with type inference from path', async () => {
    const config: CollectionConfig = {
      name: 'Inferred Types',
      isModeCollection: false,
      files: [
        {
          name: 'tokens.json',
          content: {
            colors: {
              primary: { value: '#ff0000' } // Type inferred from 'colors' prefix
            },
            spacing: {
              base: { value: '16px' } // Type inferred from 'spacing' prefix
            },
            fontSize: {
              body: { value: '14px' } // Type inferred from 'fontSize' prefix
            }
          }
        }
      ]
    };

    await importTokens([config]);

    // Verify variables created with correct types
    expect(mockCreateVariable).toHaveBeenCalledTimes(3);

    // Check types passed to createVariable
    const calls = mockCreateVariable.mock.calls;
    const colorCall = calls.find(call => call[0] === 'colors/primary');
    const spacingCall = calls.find(call => call[0] === 'spacing/base');
    const fontSizeCall = calls.find(call => call[0] === 'fontSize/body');

    expect(colorCall[2]).toBe('COLOR');
    expect(spacingCall[2]).toBe('FLOAT');
    expect(fontSizeCall[2]).toBe('FLOAT');
  });

  it('should import W3C Design Token format', async () => {
    const config: CollectionConfig = {
      name: 'W3C Tokens',
      isModeCollection: false,
      files: [
        {
          name: 'tokens.json',
          content: {
            primary: {
              $value: '#0066cc',
              $type: 'color',
              $description: 'Primary brand color'
            },
            spacing: {
              small: {
                $value: '8px',
                $type: 'dimension'
              }
            }
          }
        }
      ]
    };

    await importTokens([config]);

    // Verify variables created
    expect(mockCreateVariable).toHaveBeenCalledTimes(2);
    expect(mockVariables.has('primary')).toBe(true);
    expect(mockVariables.has('spacing/small')).toBe(true);

    // Verify description was set
    const primaryVar = mockVariables.get('primary');
    expect(primaryVar.description).toBe('Primary brand color');
  });
});
