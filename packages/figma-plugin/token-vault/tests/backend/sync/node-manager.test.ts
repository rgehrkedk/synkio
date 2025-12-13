import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findRegistryNode,
  createRegistryNode,
  getOrCreateRegistryNode,
  clearNodeChunks,
  saveChunksToNode,
  loadChunksFromNode
} from '../../../src/backend/sync/node-manager';
import { REGISTRY_NODE_NAME } from '../../../src/backend/utils/constants';

// Mock Figma API
const mockFrameNode = () => ({
  type: 'FRAME',
  name: '',
  id: `node-${Math.random()}`,
  x: 0,
  y: 0,
  visible: true,
  locked: false,
  resize: vi.fn(),
  setSharedPluginData: vi.fn(),
  getSharedPluginData: vi.fn()
});

describe('findRegistryNode', () => {
  beforeEach(() => {
    // Reset global figma mock
    (global as any).figma = {
      root: {
        children: []
      }
    };
  });

  it('should find registry node on first page', async () => {
    const registryNode = mockFrameNode();
    registryNode.name = REGISTRY_NODE_NAME;

    const otherNode = mockFrameNode();
    otherNode.name = 'Other Frame';

    (global as any).figma.root.children = [
      {
        children: [otherNode, registryNode],
        loadAsync: vi.fn().mockResolvedValue(undefined)
      }
    ];

    const result = await findRegistryNode();

    expect(result).toBe(registryNode);
  });

  it('should find registry node on second page', async () => {
    const registryNode = mockFrameNode();
    registryNode.name = REGISTRY_NODE_NAME;

    (global as any).figma.root.children = [
      { children: [], loadAsync: vi.fn().mockResolvedValue(undefined) },
      { children: [registryNode], loadAsync: vi.fn().mockResolvedValue(undefined) }
    ];

    const result = await findRegistryNode();

    expect(result).toBe(registryNode);
  });

  it('should return null if no registry node exists', async () => {
    const otherNode = mockFrameNode();
    otherNode.name = 'Other Frame';

    (global as any).figma.root.children = [
      { children: [otherNode], loadAsync: vi.fn().mockResolvedValue(undefined) }
    ];

    const result = await findRegistryNode();

    expect(result).toBeNull();
  });

  it('should return null if pages are empty', async () => {
    (global as any).figma.root.children = [
      { children: [], loadAsync: vi.fn().mockResolvedValue(undefined) },
      { children: [], loadAsync: vi.fn().mockResolvedValue(undefined) }
    ];

    const result = await findRegistryNode();

    expect(result).toBeNull();
  });

  it('should ignore non-frame nodes', async () => {
    const textNode = {
      type: 'TEXT',
      name: REGISTRY_NODE_NAME
    };

    (global as any).figma.root.children = [
      { children: [textNode], loadAsync: vi.fn().mockResolvedValue(undefined) }
    ];

    const result = await findRegistryNode();

    expect(result).toBeNull();
  });

  it('should find first registry node if multiple exist', async () => {
    const firstRegistry = mockFrameNode();
    firstRegistry.name = REGISTRY_NODE_NAME;
    firstRegistry.id = 'first';

    const secondRegistry = mockFrameNode();
    secondRegistry.name = REGISTRY_NODE_NAME;
    secondRegistry.id = 'second';

    (global as any).figma.root.children = [
      { children: [firstRegistry, secondRegistry], loadAsync: vi.fn().mockResolvedValue(undefined) }
    ];

    const result = await findRegistryNode();

    expect(result).toBe(firstRegistry);
  });
});

describe('createRegistryNode', () => {
  beforeEach(() => {
    const mockFrame = mockFrameNode();
    (global as any).figma = {
      createFrame: vi.fn(() => mockFrame)
    };
  });

  it('should create frame with correct name', async () => {
    const result = await createRegistryNode();

    expect(result.name).toBe(REGISTRY_NODE_NAME);
  });

  it('should position frame off-canvas', async () => {
    const result = await createRegistryNode();

    expect(result.x).toBe(-1000);
    expect(result.y).toBe(-1000);
  });

  it('should set frame to hidden', async () => {
    const result = await createRegistryNode();

    expect(result.visible).toBe(false);
  });

  it('should lock the frame', async () => {
    const result = await createRegistryNode();

    expect(result.locked).toBe(true);
  });

  it('should resize frame to 100x100', async () => {
    const result = await createRegistryNode();

    expect(result.resize).toHaveBeenCalledWith(100, 100);
  });
});

describe('getOrCreateRegistryNode', () => {
  it('should return existing node if found', async () => {
    const existingNode = mockFrameNode();
    existingNode.name = REGISTRY_NODE_NAME;

    (global as any).figma = {
      root: {
        children: [
          { children: [existingNode], loadAsync: vi.fn().mockResolvedValue(undefined) }
        ]
      }
    };

    const result = await getOrCreateRegistryNode();

    expect(result).toBe(existingNode);
  });

  it('should create new node if none exists', async () => {
    const newNode = mockFrameNode();

    (global as any).figma = {
      root: {
        children: [
          { children: [], loadAsync: vi.fn().mockResolvedValue(undefined) }
        ]
      },
      createFrame: vi.fn(() => newNode)
    };

    const result = await getOrCreateRegistryNode();

    expect(result.name).toBe(REGISTRY_NODE_NAME);
    expect(result.locked).toBe(true);
    expect(result.visible).toBe(false);
  });
});

describe('clearNodeChunks', () => {
  it('should clear all chunk entries', () => {
    const node = mockFrameNode();
    const namespace = 'token_vault';

    clearNodeChunks(node as any, namespace);

    // Should clear 20 chunks (indices 0-19)
    expect(node.setSharedPluginData).toHaveBeenCalledTimes(20);

    // Verify each chunk is cleared
    for (let i = 0; i < 20; i++) {
      expect(node.setSharedPluginData).toHaveBeenCalledWith(
        namespace,
        `registry_${i}`,
        ''
      );
    }
  });
});

describe('saveChunksToNode', () => {
  it('should save single chunk', () => {
    const node = mockFrameNode();
    const namespace = 'token_vault';
    const chunks = ['chunk0'];

    saveChunksToNode(node as any, namespace, chunks);

    expect(node.setSharedPluginData).toHaveBeenCalledTimes(1);
    expect(node.setSharedPluginData).toHaveBeenCalledWith(
      namespace,
      'registry_0',
      'chunk0'
    );
  });

  it('should save multiple chunks', () => {
    const node = mockFrameNode();
    const namespace = 'token_vault';
    const chunks = ['chunk0', 'chunk1', 'chunk2'];

    saveChunksToNode(node as any, namespace, chunks);

    expect(node.setSharedPluginData).toHaveBeenCalledTimes(3);
    expect(node.setSharedPluginData).toHaveBeenCalledWith(namespace, 'registry_0', 'chunk0');
    expect(node.setSharedPluginData).toHaveBeenCalledWith(namespace, 'registry_1', 'chunk1');
    expect(node.setSharedPluginData).toHaveBeenCalledWith(namespace, 'registry_2', 'chunk2');
  });

  it('should handle empty chunks array', () => {
    const node = mockFrameNode();
    const namespace = 'token_vault';
    const chunks: string[] = [];

    saveChunksToNode(node as any, namespace, chunks);

    expect(node.setSharedPluginData).not.toHaveBeenCalled();
  });
});

describe('loadChunksFromNode', () => {
  it('should load single chunk', () => {
    const node = mockFrameNode();
    node.getSharedPluginData = vi.fn((ns, key) => {
      if (key === 'registry_0') return 'chunk0';
      return '';
    });

    const namespace = 'token_vault';
    const result = loadChunksFromNode(node as any, namespace, 1);

    expect(result).toEqual(['chunk0']);
    expect(node.getSharedPluginData).toHaveBeenCalledWith(namespace, 'registry_0');
  });

  it('should load multiple chunks', () => {
    const node = mockFrameNode();
    node.getSharedPluginData = vi.fn((ns, key) => {
      if (key === 'registry_0') return 'chunk0';
      if (key === 'registry_1') return 'chunk1';
      if (key === 'registry_2') return 'chunk2';
      return '';
    });

    const namespace = 'token_vault';
    const result = loadChunksFromNode(node as any, namespace, 3);

    expect(result).toEqual(['chunk0', 'chunk1', 'chunk2']);
    expect(node.getSharedPluginData).toHaveBeenCalledTimes(3);
  });

  it('should return empty array for zero chunks', () => {
    const node = mockFrameNode();
    const namespace = 'token_vault';

    const result = loadChunksFromNode(node as any, namespace, 0);

    expect(result).toEqual([]);
    expect(node.getSharedPluginData).not.toHaveBeenCalled();
  });

  it('should load chunks in correct order', () => {
    const node = mockFrameNode();
    const expectedChunks = ['first', 'second', 'third', 'fourth'];

    node.getSharedPluginData = vi.fn((ns, key) => {
      const index = parseInt(key.replace('registry_', ''));
      return expectedChunks[index] || '';
    });

    const namespace = 'token_vault';
    const result = loadChunksFromNode(node as any, namespace, 4);

    expect(result).toEqual(expectedChunks);
  });
});
