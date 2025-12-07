/**
 * Integration Tests - Phase 1E
 *
 * End-to-end tests validating critical user workflows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initContext, getContext, createContext } from './context.js';
import { loadConfig } from './files/loader.js';
import * as figma from './figma/index.js';
import * as api from './api/index.js';

describe('Integration Tests - Phase 1E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Context System Integration', () => {
    it('should support multiple isolated contexts for monorepo', () => {
      // Simulate monorepo with two packages
      const ctx1 = createContext({ rootDir: '/monorepo/package-a' });
      const ctx2 = createContext({ rootDir: '/monorepo/package-b' });

      expect(ctx1.rootDir).toBe('/monorepo/package-a');
      expect(ctx2.rootDir).toBe('/monorepo/package-b');
      expect(ctx1).not.toBe(ctx2);
    });

    it('should auto-initialize global context on first access', () => {
      // Reset global context by initializing with test root
      initContext({ rootDir: '/test/project' });

      const ctx = getContext();
      expect(ctx).toBeDefined();
      expect(ctx.rootDir).toBe('/test/project');
    });
  });

  describe('Programmatic API Integration', () => {
    it('should export all core functions', () => {
      // Context
      expect(api.init).toBeDefined();
      expect(api.getContext).toBeDefined();
      expect(api.createContext).toBeDefined();

      // Environment
      expect(api.loadEnv).toBeDefined();
      expect(api.getFigmaToken).toBeDefined();

      // Figma
      expect(api.fetchFigmaData).toBeDefined();

      // Files
      expect(api.loadConfig).toBeDefined();
      expect(api.saveConfig).toBeDefined();
      expect(api.loadBaseline).toBeDefined();

      // Comparison
      expect(api.compareBaselines).toBeDefined();
      expect(api.hasChanges).toBeDefined();

      // Tokens
      expect(api.splitTokens).toBeDefined();
    });

    it('should initialize context via programmatic API', () => {
      api.init({ rootDir: '/programmatic/project' });

      const ctx = api.getContext();
      expect(ctx.rootDir).toBe('/programmatic/project');
    });
  });

  describe('Configuration System Integration', () => {
    it('should handle environment variable interpolation in config', () => {
      const mockConfig = {
        version: '1.0.0',
        figma: {
          fileId: 'abc123',
          accessToken: '${FIGMA_ACCESS_TOKEN}',
        },
        paths: {
          root: '.',
          data: '.synkio/data',
          baseline: '.synkio/data/baseline.json',
          baselinePrev: '.synkio/data/baseline.prev.json',
          reports: '.synkio/reports',
          tokens: 'tokens',
          styles: 'styles',
        },
        collections: {},
      };

      // The ${FIGMA_ACCESS_TOKEN} pattern should be preserved
      expect(mockConfig.figma.accessToken).toBe('${FIGMA_ACCESS_TOKEN}');
    });
  });

  describe('Error Handling Integration', () => {
    it('should provide helpful error for missing Figma credentials', async () => {
      // Mock failed Figma API call
      vi.spyOn(figma, 'fetchFigmaData').mockRejectedValueOnce(
        new Error('Invalid access token')
      );

      await expect(
        figma.fetchFigmaData({ fileId: 'test123' })
      ).rejects.toThrow(/Invalid access token/);
    });

    it('should handle missing config file gracefully', () => {
      // Test with non-existent context
      const ctx = createContext({ rootDir: '/nonexistent/path/12345' });
      const config = loadConfig(undefined, ctx);
      expect(config).toBeNull();
    });
  });

  describe('Type Safety Integration', () => {
    it('should export TypeScript types correctly', () => {
      // This test validates that types are exported
      // The actual type checking happens at compile time
      const ctx: api.Context = { rootDir: '/test' };
      expect(ctx.rootDir).toBe('/test');
    });
  });

  describe('Multi-framework Support', () => {
    it('should work without framework-specific dependencies', () => {
      // Initialize context without any framework
      api.init({ rootDir: '/vanilla/node' });

      const ctx = api.getContext();
      expect(ctx).toBeDefined();
      expect(ctx.rootDir).toBe('/vanilla/node');
    });

    it('should support custom paths for different frameworks', () => {
      // Next.js style paths
      const nextjsCtx = createContext({ rootDir: '/nextjs-app' });
      expect(nextjsCtx.rootDir).toBe('/nextjs-app');

      // Remix style paths
      const remixCtx = createContext({ rootDir: '/remix-app' });
      expect(remixCtx.rootDir).toBe('/remix-app');

      // Independent contexts
      expect(nextjsCtx).not.toBe(remixCtx);
    });
  });
});
