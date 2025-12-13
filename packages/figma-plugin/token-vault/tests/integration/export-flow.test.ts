/**
 * Integration tests for export baseline flow
 * Tests end-to-end export: collections → variables → baseline snapshot
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportBaseline } from '../../src/backend/export/index.js';

// Mock Figma collections and variables
const mockCollections: any[] = [];
const mockVariables: any[] = [];

const mockGetVariableByIdAsync = vi.fn(async (id: string) => {
  return mockVariables.find(v => v.id === id);
});

global.figma = {
  fileKey: 'test-file-key',
  root: {
    name: 'Test File',
    getPluginData: vi.fn(() => ''),
    getSharedPluginData: vi.fn(() => '')
  },
  variables: {
    getLocalVariableCollectionsAsync: vi.fn(async () => mockCollections),
    getLocalVariablesAsync: vi.fn(async () => mockVariables),
    getVariableByIdAsync: mockGetVariableByIdAsync
  }
} as any;

describe('Export Flow Integration', () => {
  beforeEach(() => {
    mockCollections.length = 0;
    mockVariables.length = 0;
    vi.clearAllMocks();
  });

  it('should export all collections to baseline snapshot', async () => {
    // Setup collections
    const collection1 = createMockCollection('Colors', 'col-1', ['Light', 'Dark']);
    const collection2 = createMockCollection('Spacing', 'col-2', ['Mode 1']); // Figma default mode name
    mockCollections.push(collection1, collection2);

    // Setup variables
    mockVariables.push(
      createMockVariable('primary', collection1.id, 'COLOR', collection1.modes[0].modeId, {
        r: 0, g: 0.4, b: 0.8, a: 1
      }),
      createMockVariable('spacing-base', collection2.id, 'FLOAT', collection2.modes[0].modeId, 16)
    );

    const snapshot = await exportBaseline(null);

    // Verify snapshot structure
    expect(snapshot).toHaveProperty('$metadata');
    expect(snapshot).toHaveProperty('baseline');

    // Verify metadata
    expect(snapshot.$metadata.version).toBe('2.0.0');
    expect(snapshot.$metadata.exportedAt).toBeTruthy();
    expect(snapshot.$metadata.fileKey).toBe('test-file-key');

    // Verify baseline has both collections
    expect(snapshot).toHaveProperty('Colors');
    expect(snapshot).toHaveProperty('Spacing');

    // Verify nested structure: collection → mode → tokens
    expect(snapshot.Colors).toHaveProperty('Light');
    expect(snapshot.Spacing).toHaveProperty('value'); // Mode 1 → value

    // Verify token values in nested structure
    expect(snapshot.Colors.Light.primary).toMatchObject({
      $type: 'color',
      $value: '#0066cc'
    });
    expect(snapshot.Spacing.value['spacing-base']).toMatchObject({
      $type: 'number',
      $value: 16
    });

    // Verify baseline lookup
    expect(snapshot.baseline).toBeTruthy();
    expect(Object.keys(snapshot.baseline).length).toBeGreaterThan(0);
  });

  it('should export filtered collections only', async () => {
    // Setup collections
    const collection1 = createMockCollection('Colors', 'col-1', ['Light']);
    const collection2 = createMockCollection('Spacing', 'col-2', ['Default']);
    const collection3 = createMockCollection('Typography', 'col-3', ['Default']);
    mockCollections.push(collection1, collection2, collection3);

    // Setup variables for all collections
    mockVariables.push(
      createMockVariable('primary', collection1.id, 'COLOR', collection1.modes[0].modeId, {
        r: 1, g: 0, b: 0, a: 1
      }),
      createMockVariable('base', collection2.id, 'FLOAT', collection2.modes[0].modeId, 16),
      createMockVariable('body', collection3.id, 'FLOAT', collection3.modes[0].modeId, 14)
    );

    // Export only Colors and Typography
    const snapshot = await exportBaseline(['col-1', 'col-3']);

    // Count exported collections (excluding $metadata and baseline)
    const exportedCollections = Object.keys(snapshot).filter(
      key => key !== '$metadata' && key !== 'baseline'
    );

    expect(exportedCollections).toHaveLength(2);
    expect(snapshot).toHaveProperty('Colors');
    expect(snapshot).toHaveProperty('Typography');
    expect(snapshot).not.toHaveProperty('Spacing');
  });

  it('should export tokens with alias references in correct format', async () => {
    // Setup collection
    const collection = createMockCollection('Semantic', 'col-1', ['Light']);
    mockCollections.push(collection);

    // Setup variables with alias
    const primaryVar = createMockVariable(
      'colors/primary',
      collection.id,
      'COLOR',
      collection.modes[0].modeId,
      { r: 0, g: 0.4, b: 0.8, a: 1 }
    );

    const accentVar = createMockVariable(
      'colors/accent',
      collection.id,
      'COLOR',
      collection.modes[0].modeId,
      { type: 'VARIABLE_ALIAS', id: primaryVar.id }
    );

    mockVariables.push(primaryVar, accentVar);

    const snapshot = await exportBaseline(null);

    // Verify primary has actual color value
    expect(snapshot.Semantic.Light.colors.primary).toMatchObject({
      $type: 'color',
      $value: '#0066cc'
    });

    // Verify accent has alias reference format
    const accentToken = snapshot.Semantic.Light.colors.accent;
    expect(accentToken.$value).toBe('{colors.primary}');
    expect(accentToken.$type).toBe('color');
  });

  it('should generate baseline lookup for all variables', async () => {
    // Setup collection
    const collection = createMockCollection('Test', 'col-1', ['Light']);
    mockCollections.push(collection);

    // Setup variables
    const var1 = createMockVariable('primary', collection.id, 'COLOR', collection.modes[0].modeId, {
      r: 1, g: 0, b: 0, a: 1
    });
    const var2 = createMockVariable('secondary', collection.id, 'COLOR', collection.modes[0].modeId, {
      r: 0, g: 1, b: 0, a: 1
    });

    mockVariables.push(var1, var2);

    const snapshot = await exportBaseline(null);

    // Verify baseline lookup exists
    expect(snapshot.baseline).toBeTruthy();
    expect(typeof snapshot.baseline).toBe('object');

    // Verify lookup contains entries
    const baselineKeys = Object.keys(snapshot.baseline);
    expect(baselineKeys.length).toBeGreaterThan(0);

    // Verify prefixed IDs are present
    const expectedId1 = `Test:Light:${var1.id}`;
    const expectedId2 = `Test:Light:${var2.id}`;
    expect(snapshot.baseline[expectedId1]).toBeTruthy();
    expect(snapshot.baseline[expectedId2]).toBeTruthy();
  });

  it('should handle multi-mode collections correctly', async () => {
    // Setup multi-mode collection
    const collection = createMockCollection('Theme', 'col-1', ['Light', 'Dark']);
    mockCollections.push(collection);

    // Setup variable with different values per mode
    const bgVar = createMockVariable(
      'background',
      collection.id,
      'COLOR',
      collection.modes[0].modeId,
      { r: 1, g: 1, b: 1, a: 1 } // White for light mode
    );
    bgVar.valuesByMode[collection.modes[1].modeId] = { r: 0, g: 0, b: 0, a: 1 }; // Black for dark mode

    mockVariables.push(bgVar);

    const snapshot = await exportBaseline(null);

    // Verify both modes exist in snapshot
    expect(snapshot.Theme).toHaveProperty('Light');
    expect(snapshot.Theme).toHaveProperty('Dark');

    // Verify different values per mode
    expect(snapshot.Theme.Light.background.$value).toBe('#ffffff');
    expect(snapshot.Theme.Dark.background.$value).toBe('#000000');
  });
});

/**
 * Helper to create mock collection
 */
function createMockCollection(name: string, id: string, modeNames: string[]): any {
  return {
    id,
    name,
    modes: modeNames.map((modeName, index) => ({
      modeId: `mode-${id}-${index}`,
      name: modeName
    })),
    variableIds: []
  };
}

/**
 * Helper to create mock variable
 */
function createMockVariable(
  name: string,
  collectionId: string,
  type: VariableResolvedDataType,
  modeId: string,
  value: any
): any {
  const id = `var_${Math.random().toString(36).substring(7)}`;
  return {
    id,
    name,
    variableCollectionId: collectionId,
    resolvedType: type,
    valuesByMode: {
      [modeId]: value
    },
    description: ''
  };
}
