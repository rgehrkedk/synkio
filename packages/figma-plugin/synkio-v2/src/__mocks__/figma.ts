// =============================================================================
// Figma API Mock for Testing
// =============================================================================

import { vi } from 'vitest';

// Mock client storage
const clientStorage = new Map<string, unknown>();

// Mock document plugin data
const pluginData = new Map<string, string>();
const sharedPluginData = new Map<string, string>();

// Mock variable collections
const variableCollections: Record<string, VariableCollection> = {};
const variables: Record<string, Variable> = {};

// Mock Figma global
const mockFigma = {
  // Current user
  currentUser: {
    id: 'user-123',
    name: 'Test User',
    photoUrl: null,
  },

  // Client storage
  clientStorage: {
    getAsync: vi.fn((key: string) => Promise.resolve(clientStorage.get(key))),
    setAsync: vi.fn((key: string, value: unknown) => {
      clientStorage.set(key, value);
      return Promise.resolve();
    }),
    deleteAsync: vi.fn((key: string) => {
      clientStorage.delete(key);
      return Promise.resolve();
    }),
    keysAsync: vi.fn(() => Promise.resolve(Array.from(clientStorage.keys()))),
  },

  // Root document
  root: {
    getPluginData: vi.fn((key: string) => pluginData.get(key) || ''),
    setPluginData: vi.fn((key: string, value: string) => {
      pluginData.set(key, value);
    }),
    getSharedPluginData: vi.fn((namespace: string, key: string) => {
      return sharedPluginData.get(`${namespace}:${key}`) || '';
    }),
    setSharedPluginData: vi.fn((namespace: string, key: string, value: string) => {
      sharedPluginData.set(`${namespace}:${key}`, value);
    }),
    getSharedPluginDataKeys: vi.fn((namespace: string) => {
      const prefix = `${namespace}:`;
      return Array.from(sharedPluginData.keys())
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length));
    }),
  },

  // UI
  ui: {
    postMessage: vi.fn(),
    onmessage: null as ((pluginMessage: unknown) => void) | null,
  },

  // Plugin lifecycle
  closePlugin: vi.fn(),
  notify: vi.fn(),

  // Variables API
  variables: {
    getLocalVariableCollectionsAsync: vi.fn(() =>
      Promise.resolve(Object.values(variableCollections))
    ),
    getLocalVariablesAsync: vi.fn(() => Promise.resolve(Object.values(variables))),
    getVariableCollectionByIdAsync: vi.fn((id: string) =>
      Promise.resolve(variableCollections[id] || null)
    ),
    getVariableByIdAsync: vi.fn((id: string) => Promise.resolve(variables[id] || null)),
    createVariableCollection: vi.fn((name: string) => {
      const id = `VariableCollectionId:${Date.now()}`;
      const collection: VariableCollection = {
        id,
        name,
        modes: [{ modeId: `${id}:mode1`, name: 'Mode 1' }],
        defaultModeId: `${id}:mode1`,
        remote: false,
        hiddenFromPublishing: false,
        variableIds: [],
        remove: vi.fn(),
        addMode: vi.fn((modeName: string) => `${id}:mode-${modeName}`),
        renameMode: vi.fn(),
        removeMode: vi.fn(),
      };
      variableCollections[id] = collection;
      return collection;
    }),
    createVariable: vi.fn(
      (name: string, collection: VariableCollection, resolvedType: VariableResolvedDataType) => {
        const id = `VariableID:${Date.now()}`;
        const variable: Variable = {
          id,
          name,
          key: `key-${id}`,
          variableCollectionId: collection.id,
          resolvedType,
          valuesByMode: {},
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: [],
          codeSyntax: {},
          remove: vi.fn(),
          setValueForMode: vi.fn((modeId: string, value: VariableValue) => {
            variable.valuesByMode[modeId] = value;
          }),
        };
        variables[id] = variable;
        collection.variableIds.push(id);
        return variable;
      }
    ),
  },

  // Styles API
  getLocalPaintStylesAsync: vi.fn(() => Promise.resolve([])),
  getLocalTextStylesAsync: vi.fn(() => Promise.resolve([])),
  getLocalEffectStylesAsync: vi.fn(() => Promise.resolve([])),
};

// Assign to global
(globalThis as unknown as { figma: typeof mockFigma }).figma = mockFigma;

// Helper to reset mocks between tests
export function resetFigmaMock() {
  clientStorage.clear();
  pluginData.clear();
  sharedPluginData.clear();
  Object.keys(variableCollections).forEach((key) => delete variableCollections[key]);
  Object.keys(variables).forEach((key) => delete variables[key]);
  vi.clearAllMocks();
}

// Helper to set up test data
export function setClientStorage(key: string, value: unknown) {
  clientStorage.set(key, value);
}

export function setPluginData(key: string, value: string) {
  pluginData.set(key, value);
}

export function setSharedPluginData(namespace: string, key: string, value: string) {
  sharedPluginData.set(`${namespace}:${key}`, value);
}

// Type definitions for the mock (simplified)
interface VariableCollection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  defaultModeId: string;
  remote: boolean;
  hiddenFromPublishing: boolean;
  variableIds: string[];
  remove: () => void;
  addMode: (name: string) => string;
  renameMode: (modeId: string, newName: string) => void;
  removeMode: (modeId: string) => void;
}

type VariableResolvedDataType = 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING';
type VariableValue = boolean | string | number | RGB | RGBA | VariableAlias;
interface RGB {
  r: number;
  g: number;
  b: number;
}
interface RGBA extends RGB {
  a: number;
}
interface VariableAlias {
  type: 'VARIABLE_ALIAS';
  id: string;
}

interface Variable {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: VariableResolvedDataType;
  valuesByMode: Record<string, VariableValue>;
  remote: boolean;
  description: string;
  hiddenFromPublishing: boolean;
  scopes: string[];
  codeSyntax: Record<string, string>;
  remove: () => void;
  setValueForMode: (modeId: string, value: VariableValue) => void;
}

export { mockFigma };
