/**
 * Build Runner Module Tests
 *
 * Tests for build script execution and build pipeline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runBuildScript,
  shouldRunBuild,
  runBuildPipeline,
} from './build-runner.js';

// Mock child_process
const mockExecSync = vi.fn();
vi.mock('node:child_process', () => ({
  execSync: (...args: any[]) => mockExecSync(...args),
}));

// Mock output module
vi.mock('../output.js', () => ({
  hasBuildConfig: vi.fn(),
  getBuildStepsSummary: vi.fn(() => ['CSS generation']),
  generateCssFromBaseline: vi.fn().mockResolvedValue({ files: ['tokens.css'] }),
}));

// Mock chalk
vi.mock('chalk', () => ({
  default: {
    cyan: (s: string) => s,
    red: (s: string) => s,
    dim: (s: string) => s,
  },
}));

describe('build-runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runBuildScript', () => {
    it('should return ran:false when no script configured', async () => {
      const config = { build: {} };
      const mockSpinner = { text: '' };

      const result = await runBuildScript(config as any, mockSpinner as any);

      expect(result.ran).toBe(false);
      expect(result.success).toBe(true);
    });

    it('should execute script when configured', async () => {
      const config = { build: { script: 'npm run build' } };
      const mockSpinner = { text: '' };

      const result = await runBuildScript(config as any, mockSpinner as any);

      expect(mockExecSync).toHaveBeenCalledWith('npm run build', expect.any(Object));
      expect(result.ran).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should return success:false when script fails', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Build failed');
      });

      const config = { build: { script: 'npm run build' } };
      const mockSpinner = { text: '', fail: vi.fn() };

      const result = await runBuildScript(config as any, mockSpinner as any);

      expect(result.ran).toBe(true);
      expect(result.success).toBe(false);
    });
  });

  describe('shouldRunBuild', () => {
    it('should return false when noBuild flag is set', async () => {
      const config = { build: { script: 'npm run build' } };
      const options = { noBuild: true };

      const result = await shouldRunBuild(config as any, options as any);

      expect(result).toBe(false);
    });

    it('should return false when no build config', async () => {
      const { hasBuildConfig } = await import('../output.js');
      (hasBuildConfig as any).mockReturnValue(false);

      const config = { build: {} };
      const options = {};

      const result = await shouldRunBuild(config as any, options as any);

      expect(result).toBe(false);
    });

    it('should return true when build flag is set', async () => {
      const { hasBuildConfig } = await import('../output.js');
      (hasBuildConfig as any).mockReturnValue(true);

      const config = { build: { script: 'npm run build' } };
      const options = { build: true };

      const result = await shouldRunBuild(config as any, options as any);

      expect(result).toBe(true);
    });

    it('should return true when autoRun is configured', async () => {
      const { hasBuildConfig } = await import('../output.js');
      (hasBuildConfig as any).mockReturnValue(true);

      const config = { build: { script: 'npm run build', autoRun: true } };
      const options = {};

      const result = await shouldRunBuild(config as any, options as any);

      expect(result).toBe(true);
    });
  });

  describe('runBuildPipeline', () => {
    it('should run script and CSS generation', async () => {
      const { generateCssFromBaseline } = await import('../output.js');
      (generateCssFromBaseline as any).mockResolvedValue({ files: ['a.css', 'b.css'] });

      const baseline = { baseline: {}, metadata: { syncedAt: '' } };
      const config = {
        build: {
          script: 'npm run build',
          css: { enabled: true },
        },
      };
      const mockSpinner = {
        text: '',
        stop: vi.fn(),
        start: vi.fn(),
      };

      const result = await runBuildPipeline(baseline as any, config as any, mockSpinner as any);

      expect(result.scriptRan).toBe(true);
      expect(result.cssFilesWritten).toBe(2);
    });

    it('should skip CSS when not enabled', async () => {
      const baseline = { baseline: {}, metadata: { syncedAt: '' } };
      const config = {
        build: {
          script: 'npm run build',
          css: { enabled: false },
        },
      };
      const mockSpinner = {
        text: '',
        stop: vi.fn(),
        start: vi.fn(),
      };

      const result = await runBuildPipeline(baseline as any, config as any, mockSpinner as any);

      expect(result.cssFilesWritten).toBe(0);
    });
  });
});
