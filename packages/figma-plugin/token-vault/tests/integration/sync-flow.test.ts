/**
 * Integration tests for sync to node flow
 * Tests end-to-end sync: export → chunking → node storage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncToNode, getLastSyncInfo } from '../../src/backend/sync/index.js';
import { PLUGIN_NAMESPACE } from '../../src/backend/utils/constants.js';

// Mock registry node
let mockRegistryNode: any = null;
const mockPages: any[] = [];

// Create mock frame function
const createMockFrame = () => {
  mockRegistryNode = {
    id: `registry-node-${Math.random().toString(36).substring(7)}`,
    name: '_token_registry',
    type: 'FRAME',
    locked: false,
    visible: true,
    x: 0,
    y: 0,
    resize: vi.fn(),
    getSharedPluginData: vi.fn((namespace: string, key: string) => ''),
    setSharedPluginData: vi.fn(),
    getSharedPluginDataKeys: vi.fn((namespace: string) => [])
  };
  return mockRegistryNode;
};

// Create mock page
const createMockPage = () => ({
  children: [],
  loadAsync: vi.fn().mockResolvedValue(undefined)
});

global.figma = {
  currentPage: {
    appendChild: vi.fn(),
    children: [],
    loadAsync: vi.fn().mockResolvedValue(undefined)
  },
  root: {
    children: mockPages
  },
  createFrame: vi.fn(createMockFrame)
} as any;

describe('Sync Flow Integration', () => {
  beforeEach(() => {
    mockRegistryNode = null;
    mockPages.length = 0;
    mockPages.push(createMockPage());
    global.figma.currentPage.children = [];
    vi.clearAllMocks();
  });

  it('should sync baseline snapshot to new registry node', async () => {
    const exportData = {
      $metadata: {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        pluginVersion: '1.0.0',
        fileKey: 'test-file',
        fileName: 'Test File'
      },
      baseline: {
        'Test:Light:var-1': {
          value: '#0066cc',
          type: 'color',
          name: 'primary',
          collection: 'Test',
          mode: 'Light'
        }
      }
    };

    const result = await syncToNode(exportData);

    // Verify registry node created
    expect(global.figma.createFrame).toHaveBeenCalled();
    expect(mockRegistryNode).toBeTruthy();

    // Verify node configured correctly
    expect(mockRegistryNode.name).toBe('_token_registry');
    expect(mockRegistryNode.locked).toBe(true);
    expect(mockRegistryNode.visible).toBe(false);
    expect(mockRegistryNode.resize).toHaveBeenCalledWith(100, 100);

    // Verify data was chunked and saved
    expect(mockRegistryNode.setSharedPluginData).toHaveBeenCalled();

    // Get all calls to setSharedPluginData
    const setCalls = mockRegistryNode.setSharedPluginData.mock.calls;

    // Verify at least one chunk was saved (registry_0, registry_1, etc.)
    const chunkCalls = setCalls.filter((call: any[]) =>
      call[0] === PLUGIN_NAMESPACE && call[1].startsWith('registry_') && call[2] !== ''
    );
    expect(chunkCalls.length).toBeGreaterThan(0);

    // Verify result
    expect(result).toMatchObject({
      nodeId: mockRegistryNode.id,
      variableCount: 1
    });
  });

  it('should sync to existing registry node and update data', async () => {
    // Create existing registry node with old data
    mockRegistryNode = {
      id: 'existing-node-456',
      name: '_token_registry',
      type: 'FRAME',
      locked: true,
      visible: false,
      x: -10000,
      y: -10000,
      resize: vi.fn(),
      getSharedPluginData: vi.fn((namespace: string, key: string) => {
        if (namespace === PLUGIN_NAMESPACE) {
          if (key === 'updatedAt') return '2024-01-01T00:00:00Z';
          if (key === 'variableCount') return '5';
          if (key === 'chunkCount') return '2';
        }
        return '';
      }),
      setSharedPluginData: vi.fn(),
      getSharedPluginDataKeys: vi.fn((namespace: string) => {
        if (namespace === PLUGIN_NAMESPACE) {
          return ['registry_0', 'registry_1', 'updatedAt', 'variableCount', 'chunkCount'];
        }
        return [];
      })
    };

    // Add to a page so findRegistryNode can find it
    mockPages.push({
      name: 'Page 1',
      children: [mockRegistryNode],
      loadAsync: vi.fn().mockResolvedValue(undefined)
    });

    const exportData = {
      $metadata: { version: '2.0.0' },
      baseline: {
        'Test:Default:var-1': { value: '#fff', type: 'color', name: 'color' }
      }
    };

    const result = await syncToNode(exportData);

    // Verify existing node was found
    expect(result.nodeId).toBe('existing-node-456');

    // Verify old chunks were cleared
    const setCalls = mockRegistryNode.setSharedPluginData.mock.calls;
    const clearCalls = setCalls.filter((call: any[]) => call[2] === '');
    expect(clearCalls.length).toBeGreaterThan(0); // Old chunks cleared
  });

  it('should handle large datasets with chunking', async () => {
    // Create large baseline that exceeds chunk size
    const largeBaseline: any = {};
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 50; j++) {
        const key = `Collection${i}:Default:var-${i}-${j}`;
        largeBaseline[key] = {
          value: `#${Math.random().toString(16).substring(2, 8)}`,
          type: 'color',
          name: `token${j}`,
          collection: `Collection${i}`,
          mode: 'Default'
        };
      }
    }

    const exportData = {
      $metadata: { version: '2.0.0' },
      baseline: largeBaseline
    };

    const result = await syncToNode(exportData);

    // Verify node created
    expect(mockRegistryNode).toBeTruthy();

    // Verify multiple chunks created
    const setDataCalls = mockRegistryNode.setSharedPluginData.mock.calls;
    const chunkCalls = setDataCalls.filter((call: any[]) =>
      call[0] === PLUGIN_NAMESPACE && call[1].startsWith('registry_') && call[2] !== ''
    );

    expect(chunkCalls.length).toBeGreaterThan(1); // Should be multiple chunks

    // Verify each chunk is within size limit (90KB)
    chunkCalls.forEach((call: any[]) => {
      const chunkSize = new TextEncoder().encode(call[2]).length;
      expect(chunkSize).toBeLessThanOrEqual(90000);
    });

    // Verify result
    expect(result.nodeId).toBeTruthy();
    expect(result.variableCount).toBe(5000); // 100 collections x 50 variables
  });

  it('should retrieve last sync info from existing node', async () => {
    // Create registry node with sync metadata
    const mockNode = {
      id: 'sync-node-789',
      name: '_token_registry',
      type: 'FRAME',
      locked: true,
      visible: false,
      x: -10000,
      y: -10000,
      resize: vi.fn(),
      getSharedPluginData: vi.fn((namespace: string, key: string) => {
        if (namespace === PLUGIN_NAMESPACE) {
          if (key === 'updatedAt') return '2024-01-15T10:30:00Z';
          if (key === 'variableCount') return '42';
          if (key === 'chunkCount') return '3';
        }
        return '';
      }),
      setSharedPluginData: vi.fn(),
      getSharedPluginDataKeys: vi.fn((namespace: string) => {
        if (namespace === PLUGIN_NAMESPACE) {
          return ['registry_0', 'registry_1', 'registry_2', 'updatedAt', 'variableCount', 'chunkCount'];
        }
        return [];
      })
    };

    // Add to a page so findRegistryNode can find it
    mockPages.push({
      name: 'Page 1',
      children: [mockNode],
      loadAsync: vi.fn().mockResolvedValue(undefined)
    });

    const syncInfo = await getLastSyncInfo();

    // Verify sync info retrieved correctly
    expect(syncInfo).toMatchObject({
      exists: true,
      nodeId: 'sync-node-789',
      updatedAt: '2024-01-15T10:30:00Z',
      variableCount: 42
    });
  });

  it('should return exists: false when no registry node found', async () => {
    // Empty pages and current page
    mockPages.length = 0;
    global.figma.currentPage.children = [];

    const syncInfo = await getLastSyncInfo();

    expect(syncInfo).toEqual({
      exists: false
    });
  });
});
