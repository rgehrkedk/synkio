/**
 * Tests for baseline importer
 *
 * Comprehensive test suite covering basic import, variable creation,
 * error handling, collection/mode management, and edge cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importBaseline, type ImportResult } from '../../../src/backend/import/baseline-importer';

// Mock Figma API
const mockCollections = new Map<string, any>();
let mockVariables: any[] = [];
let variableIdCounter = 0;

const createMockCollection = (name: string) => {
  const collection = {
    id: `collection-${mockCollections.size}`,
    name,
    modes: [{ modeId: 'mode-default', name: 'Default' }],
    renameMode: vi.fn((modeId: string, newName: string) => {
      const mode = collection.modes.find(m => m.modeId === modeId);
      if (mode) mode.name = newName;
    }),
    addMode: vi.fn((name: string) => {
      const modeId = `mode-${collection.modes.length}`;
      collection.modes.push({ modeId, name });
      return modeId;
    })
  };
  mockCollections.set(name, collection);
  return collection;
};

const createMockVariable = (name: string, collectionId: string, type: string) => {
  const variable = {
    id: `var-${variableIdCounter++}`,
    name,
    variableCollectionId: collectionId,
    resolvedType: type,
    description: '',
    valuesByMode: {},
    setValueForMode: vi.fn((modeId: string, value: any) => {
      variable.valuesByMode[modeId] = value;
    })
  };
  mockVariables.push(variable);
  return variable;
};

globalThis.figma = {
  variables: {
    createVariableCollection: vi.fn((name: string) => createMockCollection(name)),
    createVariable: vi.fn((name: string, collectionId: string, type: string) =>
      createMockVariable(name, collectionId, type)
    ),
    getLocalVariablesAsync: vi.fn(async () => mockVariables)
  }
} as any;

describe('Baseline Importer', () => {
  beforeEach(() => {
    mockCollections.clear();
    mockVariables = [];
    variableIdCounter = 0;
    vi.clearAllMocks();
  });

  describe('Basic Import', () => {
    it('should import single collection with one mode', async () => {
      const baseline = {
        $metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:07.452Z'
        },
        baseline: {
          'colors:light:1': {
            path: 'colors.light.primary',
            value: '#ff0000',
            type: 'color',
            collection: 'colors',
            mode: 'light'
          },
          'colors:light:2': {
            path: 'colors.light.secondary',
            value: '#00ff00',
            type: 'color',
            collection: 'colors',
            mode: 'light'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.collectionsCreated).toBe(1);
      expect(result.modesCreated).toBe(1);
      expect(result.variablesCreated).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should import single collection with multiple modes', async () => {
      const baseline = {
        $metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:07.452Z'
        },
        baseline: {
          'colors:light:1': {
            path: 'colors.light.primary',
            value: '#ffffff',
            type: 'color',
            collection: 'colors',
            mode: 'light'
          },
          'colors:dark:2': {
            path: 'colors.dark.primary',
            value: '#000000',
            type: 'color',
            collection: 'colors',
            mode: 'dark'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.collectionsCreated).toBe(1);
      expect(result.modesCreated).toBe(2);
      expect(result.variablesCreated).toBe(1); // Same variable across modes
      expect(result.errors).toHaveLength(0);

      // Verify mode creation
      const collection = mockCollections.get('colors');
      expect(collection.modes).toHaveLength(2);
      expect(collection.modes[0].name).toBe('light');
      expect(collection.modes[1].name).toBe('dark');
    });

    it('should import multiple collections', async () => {
      const baseline = {
        $metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:07.452Z'
        },
        baseline: {
          'colors:light:1': {
            path: 'colors.light.primary',
            value: '#ff0000',
            type: 'color',
            collection: 'colors',
            mode: 'light'
          },
          'spacing:default:2': {
            path: 'spacing.default.small',
            value: '8',
            type: 'dimension',
            collection: 'spacing',
            mode: 'default'
          },
          'typography:default:3': {
            path: 'typography.default.fontSize',
            value: '16',
            type: 'fontSize',
            collection: 'typography',
            mode: 'default'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.collectionsCreated).toBe(3);
      expect(result.variablesCreated).toBe(3);
      expect(mockCollections.size).toBe(3);
      expect(mockCollections.has('colors')).toBe(true);
      expect(mockCollections.has('spacing')).toBe(true);
      expect(mockCollections.has('typography')).toBe(true);
    });

    it('should parse baseline structure correctly', async () => {
      const baseline = {
        $metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:07.452Z'
        },
        baseline: {
          'primitives:Mode 1:VariableID:2:2656': {
            path: 'primitives.Mode 1.color.gray.50',
            value: '#fafafa',
            type: 'color',
            collection: 'primitives',
            mode: 'Mode 1'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.collectionsCreated).toBe(1);

      // Verify variable name extraction (removes collection and mode)
      const variable = mockVariables[0];
      expect(variable.name).toBe('color/gray/50');
    });

    it('should map token types to Figma types', async () => {
      const baseline = {
        $metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:07.452Z'
        },
        baseline: {
          'test:default:1': {
            path: 'test.default.color',
            value: '#ff0000',
            type: 'color',
            collection: 'test',
            mode: 'default'
          },
          'test:default:2': {
            path: 'test.default.spacing',
            value: '8',
            type: 'dimension',
            collection: 'test',
            mode: 'default'
          },
          'test:default:3': {
            path: 'test.default.label',
            value: 'Hello',
            type: 'string',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(mockVariables[0].resolvedType).toBe('COLOR');
      expect(mockVariables[1].resolvedType).toBe('FLOAT');
      expect(mockVariables[2].resolvedType).toBe('STRING');
    });
  });

  describe('Variable Creation', () => {
    it('should create color variables', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'colors:default:1': {
            path: 'colors.default.primary',
            value: '#ff5733',
            type: 'color',
            collection: 'colors',
            mode: 'default'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.variablesCreated).toBe(1);

      const variable = mockVariables[0];
      expect(variable.resolvedType).toBe('COLOR');
      expect(variable.valuesByMode['mode-default']).toEqual({
        r: 1,
        g: 87/255,
        b: 51/255,
        a: 1
      });
    });

    it('should create number variables', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'spacing:default:1': {
            path: 'spacing.default.small',
            value: '16',
            type: 'dimension',
            collection: 'spacing',
            mode: 'default'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.variablesCreated).toBe(1);

      const variable = mockVariables[0];
      expect(variable.resolvedType).toBe('FLOAT');
      expect(variable.valuesByMode['mode-default']).toBe(16);
    });

    it('should create string variables', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'fonts:default:1': {
            path: 'fonts.default.family',
            value: 'Inter',
            type: 'fontFamily',
            collection: 'fonts',
            mode: 'default'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.variablesCreated).toBe(1);

      const variable = mockVariables[0];
      expect(variable.resolvedType).toBe('STRING');
      expect(variable.valuesByMode['mode-default']).toBe('Inter');
    });

    it('should handle variable names with special characters', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'test:default:1': {
            path: 'test.default.color-with-dash.nested_underscore',
            value: '#000000',
            type: 'color',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.variablesCreated).toBe(1);

      const variable = mockVariables[0];
      expect(variable.name).toBe('color-with-dash/nested_underscore');
    });

    it('should group variables across modes correctly', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'colors:light:1': {
            path: 'colors.light.background',
            value: '#ffffff',
            type: 'color',
            collection: 'colors',
            mode: 'light'
          },
          'colors:dark:2': {
            path: 'colors.dark.background',
            value: '#000000',
            type: 'color',
            collection: 'colors',
            mode: 'dark'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.variablesCreated).toBe(1); // Same variable name

      const variable = mockVariables[0];
      expect(variable.name).toBe('background');
      expect(variable.valuesByMode['mode-default']).toBeDefined(); // light mode
      expect(variable.valuesByMode['mode-1']).toBeDefined(); // dark mode
    });
  });

  describe('Error Handling', () => {
    it('should handle missing collection name', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'invalid:default:1': {
            path: 'test.default.color',
            value: '#ff0000',
            type: 'color',
            mode: 'default'
            // Missing collection
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.variablesCreated).toBe(0); // Token skipped
    });

    it('should handle missing mode name', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'invalid:default:1': {
            path: 'test.default.color',
            value: '#ff0000',
            type: 'color',
            collection: 'test'
            // Missing mode
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.variablesCreated).toBe(0); // Token skipped
    });

    it('should handle invalid token type', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'test:default:1': {
            path: 'test.default.unknown',
            value: 'some-value',
            type: 'unknownType',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.variablesCreated).toBe(1);

      // Unknown types default to STRING
      const variable = mockVariables[0];
      expect(variable.resolvedType).toBe('STRING');
    });

    it('should handle malformed baseline', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' }
        // Missing baseline property
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid baseline format');
    });

    it('should return detailed error messages', async () => {
      // Mock variable creation to throw error
      (figma.variables.createVariable as any).mockImplementationOnce(() => {
        throw new Error('Variable creation failed');
      });

      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'test:default:1': {
            path: 'test.default.color',
            value: '#ff0000',
            type: 'color',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to create variable');
    });
  });

  describe('Collection/Mode Management', () => {
    it('should create modes correctly', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'colors:light:1': {
            path: 'colors.light.bg',
            value: '#ffffff',
            type: 'color',
            collection: 'colors',
            mode: 'light'
          },
          'colors:dark:2': {
            path: 'colors.dark.bg',
            value: '#000000',
            type: 'color',
            collection: 'colors',
            mode: 'dark'
          },
          'colors:contrast:3': {
            path: 'colors.contrast.bg',
            value: '#ffff00',
            type: 'color',
            collection: 'colors',
            mode: 'contrast'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.modesCreated).toBe(3);

      const collection = mockCollections.get('colors');
      expect(collection.modes).toHaveLength(3);
      expect(collection.modes.map((m: any) => m.name)).toEqual(['light', 'dark', 'contrast']);
    });

    it('should rename first mode', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'colors:custom:1': {
            path: 'colors.custom.primary',
            value: '#ff0000',
            type: 'color',
            collection: 'colors',
            mode: 'custom'
          }
        }
      };

      await importBaseline(baseline);

      const collection = mockCollections.get('colors');
      expect(collection.renameMode).toHaveBeenCalledWith('mode-default', 'custom');
      expect(collection.modes[0].name).toBe('custom');
    });

    it('should handle duplicate mode names', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'colors:light:1': {
            path: 'colors.light.primary',
            value: '#ff0000',
            type: 'color',
            collection: 'colors',
            mode: 'light'
          },
          'colors:light:2': {
            path: 'colors.light.secondary',
            value: '#00ff00',
            type: 'color',
            collection: 'colors',
            mode: 'light'
          }
        }
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.modesCreated).toBe(1);

      const collection = mockCollections.get('colors');
      expect(collection.modes).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should import empty baseline', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {}
      };

      const result = await importBaseline(baseline);

      expect(result.success).toBe(true);
      expect(result.collectionsCreated).toBe(0);
      expect(result.variablesCreated).toBe(0);
    });

    it('should import large baseline (100+ tokens)', async () => {
      const baseline: any = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {}
      };

      // Generate 100 tokens
      for (let i = 0; i < 100; i++) {
        const collection = `collection-${Math.floor(i / 20)}`;
        const mode = `mode-${i % 5}`;
        baseline.baseline[`${collection}:${mode}:${i}`] = {
          path: `${collection}.${mode}.token-${i}`,
          value: `#${i.toString(16).padStart(6, '0')}`,
          type: 'color',
          collection,
          mode
        };
      }

      const startTime = performance.now();
      const result = await importBaseline(baseline);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.variablesCreated).toBe(100);
      expect(duration).toBeLessThan(500); // Performance target: <500ms
    });
  });

  describe('Color Parsing', () => {
    it('should parse 6-digit hex colors', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'test:default:1': {
            path: 'test.default.red',
            value: '#ff0000',
            type: 'color',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      await importBaseline(baseline);

      const variable = mockVariables[0];
      expect(variable.valuesByMode['mode-default']).toEqual({
        r: 1,
        g: 0,
        b: 0,
        a: 1
      });
    });

    it('should parse 8-digit hex colors with alpha', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'test:default:1': {
            path: 'test.default.semitransparent',
            value: '#ff000080',
            type: 'color',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      await importBaseline(baseline);

      const variable = mockVariables[0];
      const color = variable.valuesByMode['mode-default'];
      expect(color.r).toBe(1);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
      expect(color.a).toBeCloseTo(0.5, 2);
    });

    it('should handle invalid color values', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'test:default:1': {
            path: 'test.default.invalid',
            value: 'not-a-color',
            type: 'color',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      await importBaseline(baseline);

      const variable = mockVariables[0];
      // Should default to black
      expect(variable.valuesByMode['mode-default']).toEqual({
        r: 0,
        g: 0,
        b: 0,
        a: 1
      });
    });
  });

  describe('Path Extraction', () => {
    it('should extract variable name from full path', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'primitives:Mode 1:id': {
            path: 'primitives.Mode 1.color.gray.50',
            value: '#fafafa',
            type: 'color',
            collection: 'primitives',
            mode: 'Mode 1'
          }
        }
      };

      await importBaseline(baseline);

      const variable = mockVariables[0];
      expect(variable.name).toBe('color/gray/50');
    });

    it('should handle deeply nested paths', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'test:default:1': {
            path: 'test.default.semantic.button.primary.background.hover',
            value: '#ff0000',
            type: 'color',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      await importBaseline(baseline);

      const variable = mockVariables[0];
      expect(variable.name).toBe('semantic/button/primary/background/hover');
    });

    it('should handle paths with single segment after collection/mode', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'test:default:1': {
            path: 'test.default.primary',
            value: '#ff0000',
            type: 'color',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      await importBaseline(baseline);

      const variable = mockVariables[0];
      expect(variable.name).toBe('primary');
    });
  });

  describe('Type Mapping', () => {
    it('should map spacing to FLOAT', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'test:default:1': {
            path: 'test.default.space',
            value: '16',
            type: 'spacing',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      await importBaseline(baseline);

      const variable = mockVariables[0];
      expect(variable.resolvedType).toBe('FLOAT');
    });

    it('should map fontSize to FLOAT', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'test:default:1': {
            path: 'test.default.size',
            value: '14',
            type: 'fontSize',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      await importBaseline(baseline);

      const variable = mockVariables[0];
      expect(variable.resolvedType).toBe('FLOAT');
    });

    it('should map boolean to BOOLEAN', async () => {
      const baseline = {
        $metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:07.452Z' },
        baseline: {
          'test:default:1': {
            path: 'test.default.flag',
            value: 'true',
            type: 'boolean',
            collection: 'test',
            mode: 'default'
          }
        }
      };

      await importBaseline(baseline);

      const variable = mockVariables[0];
      expect(variable.resolvedType).toBe('BOOLEAN');
    });
  });

  describe('Integration with Real Baseline', () => {
    it('should match real baseline export format', async () => {
      const realBaseline = {
        $metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:07.452Z',
          pluginVersion: '1.0.0',
          fileKey: '',
          fileName: 'testds'
        },
        baseline: {
          'primitives:Mode 1:VariableID:2:2656': {
            path: 'primitives.Mode 1.color.gray.50',
            value: '#fafafa',
            type: 'color',
            collection: 'primitives',
            mode: 'Mode 1'
          },
          'primitives:Mode 1:VariableID:2:2657': {
            path: 'primitives.Mode 1.color.gray.100',
            value: '#f4f4f5',
            type: 'color',
            collection: 'primitives',
            mode: 'Mode 1'
          }
        }
      };

      const result = await importBaseline(realBaseline);

      expect(result.success).toBe(true);
      expect(result.collectionsCreated).toBe(1);
      expect(result.modesCreated).toBe(1);
      expect(result.variablesCreated).toBe(2);

      const collection = mockCollections.get('primitives');
      expect(collection).toBeDefined();
      expect(collection.modes[0].name).toBe('Mode 1');

      expect(mockVariables[0].name).toBe('color/gray/50');
      expect(mockVariables[1].name).toBe('color/gray/100');
    });
  });
});
