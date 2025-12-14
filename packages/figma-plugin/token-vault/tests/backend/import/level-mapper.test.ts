/**
 * Tests for level-based importer
 *
 * Validates the level mapping engine that converts JSON structures
 * to Figma collections based on user-defined level roles.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { importWithLevelMapping } from '../../../src/backend/import/level-mapper.js';
import type { ManualImportConfig } from '../../../src/types/message.types.js';
import type { LevelConfiguration } from '../../../src/types/level-config.types.js';

// Mock Figma API
const mockCollection = {
  id: 'col-1',
  name: 'Test Collection',
  modes: [{ modeId: 'mode-1', name: 'Mode 1' }],
  renameMode: vi.fn(),
  addMode: vi.fn((name: string) => `mode-${name}`)
};

const mockVariable = {
  id: 'var-1',
  name: 'test',
  setValueForMode: vi.fn()
};

global.figma = {
  variables: {
    createVariableCollection: vi.fn(() => mockCollection),
    createVariable: vi.fn(() => mockVariable)
  }
} as any;

describe('Level Mapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Single file - 1 collection, 1 default mode', () => {
    it('should reject flat tokens without collection level', async () => {
      const data = {
        'color-primary': '#3B82F6',
        'color-secondary': '#8B5CF6',
        'spacing-sm': 8,
        'spacing-md': 16
      };

      const levels: LevelConfiguration[] = [
        { depth: 1, role: 'token-path' }
      ];

      const config: ManualImportConfig = {
        singleFile: {
          fileName: 'tokens.json',
          data,
          levels
        }
      };

      const result = await importWithLevelMapping(config);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('At least one level must be mapped as Collection');
    });

    it('should create collection from filename when only token-path levels', async () => {
      const data = {
        'bg': {
          'primary': '#FFFFFF',
          'secondary': '#F3F4F6'
        },
        'text': {
          'primary': '#111827'
        }
      };

      const levels: LevelConfiguration[] = [
        { depth: 1, role: 'collection' },
        { depth: 2, role: 'token-path' }
      ];

      const config: ManualImportConfig = {
        singleFile: {
          fileName: 'tokens.json',
          data,
          levels
        }
      };

      const result = await importWithLevelMapping(config);

      expect(result.success).toBe(true);
      expect(result.collectionsCreated).toBe(2); // bg and text
      expect(result.modesCreated).toBe(2); // default mode for each
      expect(result.variablesCreated).toBeGreaterThan(0);
    });
  });

  describe('Single file - 1 collection, 2 modes', () => {
    it('should create collection with multiple modes', async () => {
      const data = {
        'theme': {
          'light': {
            'bg': '#FFFFFF',
            'text': '#111827'
          },
          'dark': {
            'bg': '#111827',
            'text': '#F9FAFB'
          }
        }
      };

      const levels: LevelConfiguration[] = [
        { depth: 1, role: 'collection' },
        { depth: 2, role: 'mode' },
        { depth: 3, role: 'token-path' }
      ];

      const config: ManualImportConfig = {
        singleFile: {
          fileName: 'theme.json',
          data,
          levels
        }
      };

      const result = await importWithLevelMapping(config);

      expect(result.success).toBe(true);
      expect(result.collectionsCreated).toBe(1);
      expect(result.modesCreated).toBe(2); // light and dark
      expect(result.variablesCreated).toBe(2); // bg and text
      expect(mockCollection.renameMode).toHaveBeenCalledWith('mode-1', 'light');
      expect(mockCollection.addMode).toHaveBeenCalledWith('dark');
    });
  });

  describe('Single file - 3 collections, 2 modes each', () => {
    it('should create multiple collections with multiple modes', async () => {
      const data = {
        'semantic': {
          'light': {
            'bg': '#FFFFFF',
            'text': '#111827'
          },
          'dark': {
            'bg': '#111827',
            'text': '#F9FAFB'
          }
        },
        'primitives': {
          'light': {
            'gray-50': '#F9FAFB',
            'gray-900': '#111827'
          },
          'dark': {
            'gray-50': '#111827',
            'gray-900': '#F9FAFB'
          }
        },
        'spacing': {
          'compact': {
            'sm': 4,
            'md': 8
          },
          'comfortable': {
            'sm': 8,
            'md': 16
          }
        }
      };

      const levels: LevelConfiguration[] = [
        { depth: 1, role: 'collection' },
        { depth: 2, role: 'mode' },
        { depth: 3, role: 'token-path' }
      ];

      const config: ManualImportConfig = {
        singleFile: {
          fileName: 'design-tokens.json',
          data,
          levels
        }
      };

      const result = await importWithLevelMapping(config);

      expect(result.success).toBe(true);
      expect(result.collectionsCreated).toBe(3); // semantic, primitives, spacing
      expect(result.modesCreated).toBe(6); // 2 modes × 3 collections
      expect(result.variablesCreated).toBe(6); // 2 variables per collection
    });
  });

  describe('Multi-file imports', () => {
    it('should return error for multi-file imports (not yet implemented)', async () => {
      const config: ManualImportConfig = {
        multiFile: {
          groups: [],
          levelsByGroup: new Map()
        }
      };

      const result = await importWithLevelMapping(config);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Multi-file import not yet implemented');
    });
  });

  describe('Validation errors', () => {
    it('should reject configuration without collection level', async () => {
      const data = {
        'light': {
          'bg': '#FFFFFF'
        },
        'dark': {
          'bg': '#111827'
        }
      };

      const levels: LevelConfiguration[] = [
        { depth: 1, role: 'mode' },
        { depth: 2, role: 'token-path' }
      ];

      const config: ManualImportConfig = {
        singleFile: {
          fileName: 'colors.json',
          data,
          levels
        }
      };

      const result = await importWithLevelMapping(config);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('At least one level must be mapped as Collection');
    });

    it('should warn when no mode level defined', async () => {
      const data = {
        'colors': {
          'primary': '#3B82F6',
          'secondary': '#8B5CF6'
        }
      };

      const levels: LevelConfiguration[] = [
        { depth: 1, role: 'collection' },
        { depth: 2, role: 'token-path' }
      ];

      const config: ManualImportConfig = {
        singleFile: {
          fileName: 'colors.json',
          data,
          levels
        }
      };

      const result = await importWithLevelMapping(config);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('No Mode level defined - a default mode will be created');
      expect(result.modesCreated).toBe(1); // default mode
    });
  });

  describe('Token path assembly', () => {
    it('should concatenate multiple token-path levels', async () => {
      const data = {
        'theme': {
          'colors': {
            'bg': {
              'primary': '#FFFFFF',
              'secondary': '#F3F4F6'
            }
          }
        }
      };

      const levels: LevelConfiguration[] = [
        { depth: 1, role: 'collection' },
        { depth: 2, role: 'token-path' },
        { depth: 3, role: 'token-path' },
        { depth: 4, role: 'token-path' }
      ];

      const config: ManualImportConfig = {
        singleFile: {
          fileName: 'theme.json',
          data,
          levels
        }
      };

      const result = await importWithLevelMapping(config);

      expect(result.success).toBe(true);
      expect(result.collectionsCreated).toBe(1);

      // Variables should be created with path: colors/bg/primary, colors/bg/secondary
      expect(global.figma.variables.createVariable).toHaveBeenCalledWith(
        'colors/bg/primary',
        expect.anything(),
        'COLOR'
      );
      expect(global.figma.variables.createVariable).toHaveBeenCalledWith(
        'colors/bg/secondary',
        expect.anything(),
        'COLOR'
      );
    });
  });

  describe('Type inference and parsing', () => {
    it('should correctly infer and parse different token types', async () => {
      const data = {
        'tokens': {
          'color': '#3B82F6',
          'spacing': 16,
          'fontFamily': 'Inter',
          'enabled': true
        }
      };

      const levels: LevelConfiguration[] = [
        { depth: 1, role: 'collection' },
        { depth: 2, role: 'token-path' }
      ];

      const config: ManualImportConfig = {
        singleFile: {
          fileName: 'mixed.json',
          data,
          levels
        }
      };

      const result = await importWithLevelMapping(config);

      expect(result.success).toBe(true);

      // Check that different types were created
      expect(global.figma.variables.createVariable).toHaveBeenCalledWith(
        'color',
        expect.anything(),
        'COLOR'
      );
      expect(global.figma.variables.createVariable).toHaveBeenCalledWith(
        'spacing',
        expect.anything(),
        'FLOAT'
      );
      expect(global.figma.variables.createVariable).toHaveBeenCalledWith(
        'fontFamily',
        expect.anything(),
        'STRING'
      );
      expect(global.figma.variables.createVariable).toHaveBeenCalledWith(
        'enabled',
        expect.anything(),
        'BOOLEAN'
      );
    });
  });

  describe('No configuration provided', () => {
    it('should return error when config is empty', async () => {
      const config: ManualImportConfig = {};

      const result = await importWithLevelMapping(config);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('No import configuration provided');
    });
  });
});
