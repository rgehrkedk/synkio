/**
 * Tests for message router
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMessage } from '../../../src/backend/handlers/message-router.js';
import type { UIMessage } from '../../../src/types/message.types.js';

// Mock Figma API
const mockPostMessage = vi.fn();
const mockNotify = vi.fn();
const mockClosePlugin = vi.fn();
const mockGetLocalVariableCollectionsAsync = vi.fn();
const mockGetLocalVariablesAsync = vi.fn();

global.figma = {
  ui: {
    postMessage: mockPostMessage
  },
  notify: mockNotify,
  closePlugin: mockClosePlugin,
  variables: {
    getLocalVariableCollectionsAsync: mockGetLocalVariableCollectionsAsync,
    getLocalVariablesAsync: mockGetLocalVariablesAsync
  },
  currentPage: {
    children: []
  },
  root: {
    children: []
  }
} as any;

// Mock modules
vi.mock('../../../src/backend/import/index.js', () => ({
  importTokens: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/backend/export/index.js', () => ({
  exportBaseline: vi.fn().mockResolvedValue({
    $metadata: {
      version: '2.0.0',
      exportedAt: '2024-01-01T00:00:00Z',
      pluginVersion: '1.0.0',
      fileKey: 'test-file',
      fileName: 'Test File'
    },
    baseline: {}
  })
}));

vi.mock('../../../src/backend/sync/index.js', () => ({
  syncToNode: vi.fn().mockResolvedValue({
    nodeId: 'test-node-id',
    variableCount: 42
  }),
  getLastSyncInfo: vi.fn().mockResolvedValue({
    exists: true,
    nodeId: 'test-node-id',
    updatedAt: '2024-01-01T00:00:00Z',
    variableCount: 42
  })
}));

describe('handleMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get-last-sync', () => {
    it('should handle get-last-sync message', async () => {
      const msg: UIMessage = { type: 'get-last-sync' };

      await handleMessage(msg);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'last-sync-loaded',
        exists: true,
        nodeId: 'test-node-id',
        updatedAt: '2024-01-01T00:00:00Z',
        variableCount: 42
      });
    });

    it('should handle get-last-sync error gracefully', async () => {
      const { getLastSyncInfo } = await import('../../../src/backend/sync/index.js');
      vi.mocked(getLastSyncInfo).mockRejectedValueOnce(new Error('Test error'));

      const msg: UIMessage = { type: 'get-last-sync' };

      await handleMessage(msg);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'last-sync-loaded',
        exists: false
      });
    });
  });

  describe('get-collections', () => {
    it('should handle get-collections message', async () => {
      mockGetLocalVariableCollectionsAsync.mockResolvedValue([
        {
          id: 'col-1',
          name: 'Colors',
          modes: [{ modeId: 'mode-1', name: 'Light' }]
        },
        {
          id: 'col-2',
          name: 'Spacing',
          modes: [{ modeId: 'mode-2', name: 'Default' }]
        }
      ]);

      mockGetLocalVariablesAsync.mockResolvedValue([
        { variableCollectionId: 'col-1', name: 'primary' },
        { variableCollectionId: 'col-1', name: 'secondary' },
        { variableCollectionId: 'col-2', name: 'xs' }
      ]);

      const msg: UIMessage = { type: 'get-collections' };

      await handleMessage(msg);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'collections-loaded',
        collections: [
          { id: 'col-1', name: 'Colors', modeCount: 1, variableCount: 2 },
          { id: 'col-2', name: 'Spacing', modeCount: 1, variableCount: 1 }
        ]
      });
    });
  });

  describe('import-tokens', () => {
    it('should handle import-tokens message', async () => {
      const msg: UIMessage = {
        type: 'import-tokens',
        data: {
          collections: [
            {
              name: 'Test Collection',
              files: [{ name: 'test.json', content: {} }],
              isModeCollection: false
            }
          ]
        }
      };

      await handleMessage(msg);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'import-complete',
        message: 'Tokens imported successfully!'
      });
    });

    it('should handle import-tokens error', async () => {
      const { importTokens } = await import('../../../src/backend/import/index.js');
      vi.mocked(importTokens).mockRejectedValueOnce(new Error('Import failed'));

      const msg: UIMessage = {
        type: 'import-tokens',
        data: {
          collections: []
        }
      };

      await handleMessage(msg);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'import-error',
        message: 'Import failed'
      });
    });
  });

  describe('export-baseline', () => {
    it('should handle export-baseline message', async () => {
      const msg: UIMessage = {
        type: 'export-baseline',
        collectionIds: ['col-1', 'col-2']
      };

      await handleMessage(msg);

      expect(mockNotify).toHaveBeenCalledWith('Exporting baseline snapshot...');
      expect(mockNotify).toHaveBeenCalledWith('Export complete!');
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'export-complete',
        data: expect.objectContaining({
          $metadata: expect.any(Object),
          baseline: expect.any(Object)
        })
      });
    });

    it('should handle export-baseline with empty collection IDs', async () => {
      const msg: UIMessage = {
        type: 'export-baseline',
        collectionIds: []
      };

      await handleMessage(msg);

      // Should export all collections (pass null)
      const { exportBaseline } = await import('../../../src/backend/export/index.js');
      expect(exportBaseline).toHaveBeenCalledWith(null);
    });

    it('should handle export-baseline error', async () => {
      const { exportBaseline } = await import('../../../src/backend/export/index.js');
      vi.mocked(exportBaseline).mockRejectedValueOnce(new Error('Export failed'));

      const msg: UIMessage = {
        type: 'export-baseline',
        collectionIds: []
      };

      await handleMessage(msg);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'export-error',
        message: 'Export failed'
      });
      expect(mockNotify).toHaveBeenCalledWith('Export failed: Export failed', { error: true });
    });
  });

  describe('sync-to-node', () => {
    it('should handle sync-to-node message', async () => {
      const msg: UIMessage = {
        type: 'sync-to-node',
        collectionIds: ['col-1']
      };

      await handleMessage(msg);

      expect(mockNotify).toHaveBeenCalledWith('Syncing registry to node...');
      expect(mockNotify).toHaveBeenCalledWith('✓ Synced 42 variables to node!');
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'sync-complete',
        nodeId: 'test-node-id',
        variableCount: 42
      });
    });

    it('should handle sync-to-node error', async () => {
      const { syncToNode } = await import('../../../src/backend/sync/index.js');
      vi.mocked(syncToNode).mockRejectedValueOnce(new Error('Sync failed'));

      const msg: UIMessage = {
        type: 'sync-to-node',
        collectionIds: []
      };

      await handleMessage(msg);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'sync-error',
        message: 'Sync failed'
      });
      expect(mockNotify).toHaveBeenCalledWith('Sync failed: Sync failed', { error: true });
    });
  });

  describe('cancel', () => {
    it('should handle cancel message', async () => {
      const msg: UIMessage = { type: 'cancel' };

      await handleMessage(msg);

      expect(mockClosePlugin).toHaveBeenCalled();
    });
  });
});
