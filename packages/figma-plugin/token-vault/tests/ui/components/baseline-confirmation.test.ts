/**
 * Baseline Confirmation Component Tests
 *
 * Tests for baseline detection confirmation UI with all three states:
 * - Valid baseline (ready to import)
 * - Broken references (blocks import)
 * - Version warning (allows import with warning)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  renderBaselineConfirmation,
  hideBaselineConfirmation,
  type BaselineConfirmationOptions
} from '../../../src/ui/components/baseline-confirmation.js';
import type { BaselineDetectionResult } from '../../../src/backend/utils/baseline-detector.js';
import type { ValidationResult } from '../../../src/backend/utils/baseline-validator.js';
import { setState, resetState } from '../../../src/ui/state.js';
import { importBaseline } from '../../../src/backend/import/baseline-importer.js';

// Mock dependencies
vi.mock('../../../src/backend/import/baseline-importer.js', () => ({
  importBaseline: vi.fn()
}));

// Mock Figma API
const mockFigma = {
  notify: vi.fn(),
  variables: {
    createVariableCollection: vi.fn(),
    createVariable: vi.fn()
  }
};
global.figma = mockFigma as any;

describe('Baseline Confirmation Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Reset state
    resetState();

    // Create container element
    container = document.createElement('div');
    container.id = 'baselineConfirmationSection';
    document.body.appendChild(container);

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup DOM
    document.body.removeChild(container);
  });

  describe('Valid Baseline UI', () => {
    it('should render valid baseline UI correctly', () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:00.000Z',
          pluginVersion: '2.0.0'
        },
        collections: [
          {
            name: 'primitives',
            modeCount: 2,
            tokenCount: 89,
            modes: ['light', 'dark']
          },
          {
            name: 'semantic',
            modeCount: 1,
            tokenCount: 56,
            modes: ['default']
          }
        ],
        totalTokens: 145,
        totalCollections: 2,
        totalModes: 2
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation });

      expect(container.style.display).toBe('block');
      expect(container.innerHTML).toContain('Baseline export file detected');
      expect(container.innerHTML).toContain('v2.0.0');
      expect(container.innerHTML).toContain('primitives');
      expect(container.innerHTML).toContain('2 modes, 89 tokens');
      expect(container.innerHTML).toContain('semantic');
      expect(container.innerHTML).toContain('1 mode, 56 tokens');
      expect(container.innerHTML).toContain('✓ No broken references');
      expect(container.innerHTML).toContain('✓ All aliases valid');
      expect(container.innerHTML).toContain('Import as originally exported?');
    });

    it('should display formatted date correctly', () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:00.000Z',
          pluginVersion: '2.0.0'
        },
        collections: [],
        totalTokens: 0,
        totalCollections: 0,
        totalModes: 0
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation });

      // Date formatting depends on locale, just check it's present
      expect(container.innerHTML).toContain('Exported:');
      expect(container.innerHTML).toMatch(/Dec|December/);
    });

    it('should show correct mode pluralization', () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:00.000Z',
          pluginVersion: '2.0.0'
        },
        collections: [
          {
            name: 'single-mode',
            modeCount: 1,
            tokenCount: 10,
            modes: ['default']
          },
          {
            name: 'multi-mode',
            modeCount: 3,
            tokenCount: 30,
            modes: ['light', 'dark', 'contrast']
          }
        ]
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation });

      expect(container.innerHTML).toContain('1 mode, 10 tokens');
      expect(container.innerHTML).toContain('3 modes, 30 tokens');
    });

    it('should render import and configure buttons', () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:00.000Z',
          pluginVersion: '2.0.0'
        },
        collections: []
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation });

      const importBtn = document.getElementById('importBaselineBtn');
      const configureBtn = document.getElementById('configureManuallyBtn');

      expect(importBtn).toBeTruthy();
      expect(importBtn?.textContent).toContain('Yes, Import as-is');
      expect(configureBtn).toBeTruthy();
      expect(configureBtn?.textContent).toContain('Configure Manually');
    });
  });

  describe('Broken References UI', () => {
    it('should render broken references UI correctly', () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:00.000Z',
          pluginVersion: '2.0.0'
        },
        collections: []
      };

      const validation: ValidationResult = {
        valid: false,
        brokenAliases: [
          {
            tokenPath: 'colors.button-bg',
            tokenKey: 'key1',
            aliasReference: '{colors.primary}',
            referencePath: 'colors.primary',
            error: 'Referenced token "colors.primary" does not exist'
          },
          {
            tokenPath: 'colors.text',
            tokenKey: 'key2',
            aliasReference: '{colors.secondary}',
            referencePath: 'colors.secondary',
            error: 'Referenced token "colors.secondary" does not exist'
          }
        ],
        circularReferences: [],
        errorCount: 2,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation });

      expect(container.innerHTML).toContain('Cannot Import - Broken References');
      expect(container.innerHTML).toContain('Found 2 broken alias references');
      expect(container.innerHTML).toContain('colors.button-bg');
      expect(container.innerHTML).toContain('{colors.primary}');
      expect(container.innerHTML).toContain('colors.text');
      expect(container.innerHTML).toContain('Fix required:');
    });

    it('should truncate long error lists to 5 items', () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:00.000Z',
          pluginVersion: '2.0.0'
        },
        collections: []
      };

      const brokenAliases = Array.from({ length: 10 }, (_, i) => ({
        tokenPath: `token${i}`,
        tokenKey: `key${i}`,
        aliasReference: `{ref${i}}`,
        referencePath: `ref${i}`,
        error: `Error ${i}`
      }));

      const validation: ValidationResult = {
        valid: false,
        brokenAliases,
        circularReferences: [],
        errorCount: 10,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation });

      expect(container.innerHTML).toContain('... and 5 more');
      expect(container.innerHTML).toContain('token0');
      expect(container.innerHTML).toContain('token4');
      expect(container.innerHTML).not.toContain('token5');
    });

    it('should show singular form for single broken alias', () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:00.000Z',
          pluginVersion: '2.0.0'
        },
        collections: []
      };

      const validation: ValidationResult = {
        valid: false,
        brokenAliases: [
          {
            tokenPath: 'colors.button-bg',
            tokenKey: 'key1',
            aliasReference: '{colors.primary}',
            referencePath: 'colors.primary',
            error: 'Referenced token does not exist'
          }
        ],
        circularReferences: [],
        errorCount: 1,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation });

      expect(container.innerHTML).toContain('Found 1 broken alias reference:');
      expect(container.innerHTML).not.toContain('references:');
    });

    it('should render close button only', () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:00.000Z', pluginVersion: '2.0.0' },
        collections: []
      };

      const validation: ValidationResult = {
        valid: false,
        brokenAliases: [
          {
            tokenPath: 'colors.button-bg',
            tokenKey: 'key1',
            aliasReference: '{colors.primary}',
            referencePath: 'colors.primary',
            error: 'Error'
          }
        ],
        circularReferences: [],
        errorCount: 1,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation });

      const closeBtn = document.getElementById('closeBaselineBtn');
      const importBtn = document.getElementById('importBaselineBtn');

      expect(closeBtn).toBeTruthy();
      expect(importBtn).toBeFalsy();
    });
  });

  describe('Version Warning UI', () => {
    it('should render version warning UI correctly', () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: {
          version: '3.0.0', // Newer major version
          exportedAt: '2025-12-03T13:28:00.000Z',
          pluginVersion: '3.0.0'
        },
        collections: [
          {
            name: 'colors',
            modeCount: 2,
            tokenCount: 50,
            modes: ['light', 'dark']
          }
        ]
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation });

      expect(container.innerHTML).toContain('Version Mismatch Warning');
      expect(container.innerHTML).toContain('Baseline: v3.0.0');
      expect(container.innerHTML).toContain('Plugin: v2.0.0');
      expect(container.innerHTML).toContain('Continue with import?');
    });

    it('should show collections in warning UI', () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: {
          version: '3.0.0',
          exportedAt: '2025-12-03T13:28:00.000Z',
          pluginVersion: '3.0.0'
        },
        collections: [
          {
            name: 'primitives',
            modeCount: 1,
            tokenCount: 20,
            modes: ['default']
          }
        ]
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation });

      expect(container.innerHTML).toContain('📊 Contains:');
      expect(container.innerHTML).toContain('primitives');
      expect(container.innerHTML).toContain('1 mode, 20 tokens');
    });

    it('should render cancel and import anyway buttons', () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: {
          version: '3.0.0',
          exportedAt: '2025-12-03T13:28:00.000Z',
          pluginVersion: '3.0.0'
        },
        collections: []
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation });

      const cancelBtn = document.getElementById('cancelBaselineBtn');
      const importAnywayBtn = document.getElementById('importAnywayBtn');

      expect(cancelBtn).toBeTruthy();
      expect(importAnywayBtn).toBeTruthy();
      expect(importAnywayBtn?.textContent).toContain('Import Anyway');
    });
  });

  describe('Event Handlers', () => {
    it('should handle import click successfully', async () => {
      const mockImportResult = {
        success: true,
        collectionsCreated: 2,
        modesCreated: 3,
        variablesCreated: 145,
        errors: [],
        warnings: []
      };

      vi.mocked(importBaseline).mockResolvedValue(mockImportResult);

      const onImport = vi.fn();

      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:00.000Z', pluginVersion: '2.0.0' },
        collections: []
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      // Add a file to state
      setState({
        files: new Map([
          ['baseline.json', { name: 'baseline.json', content: { baseline: {} }, size: 1024 }]
        ])
      });

      renderBaselineConfirmation({ detection, validation, onImport });

      const importBtn = document.getElementById('importBaselineBtn') as HTMLButtonElement;
      importBtn.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(importBaseline).toHaveBeenCalledWith({ baseline: {} });
      expect(mockFigma.notify).toHaveBeenCalledWith('Importing baseline...');
      expect(mockFigma.notify).toHaveBeenCalledWith('✓ Imported 2 collections, 145 tokens');
      expect(onImport).toHaveBeenCalled();
      expect(container.style.display).toBe('none');
    });

    it('should handle import error gracefully', async () => {
      const mockImportResult = {
        success: false,
        collectionsCreated: 0,
        modesCreated: 0,
        variablesCreated: 0,
        errors: ['Collection validation failed'],
        warnings: []
      };

      vi.mocked(importBaseline).mockResolvedValue(mockImportResult);

      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:00.000Z', pluginVersion: '2.0.0' },
        collections: []
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      setState({
        files: new Map([
          ['baseline.json', { name: 'baseline.json', content: { baseline: {} }, size: 1024 }]
        ])
      });

      renderBaselineConfirmation({ detection, validation });

      const importBtn = document.getElementById('importBaselineBtn') as HTMLButtonElement;
      importBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFigma.notify).toHaveBeenCalledWith(
        expect.stringContaining('❌ Import failed'),
        { error: true }
      );
    });

    it('should handle configure manually click', () => {
      const onConfigureManually = vi.fn();

      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:00.000Z', pluginVersion: '2.0.0' },
        collections: []
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation, onConfigureManually });

      const configureBtn = document.getElementById('configureManuallyBtn') as HTMLButtonElement;
      configureBtn.click();

      expect(onConfigureManually).toHaveBeenCalled();
      expect(container.style.display).toBe('none');
    });

    it('should handle cancel click in warning state', () => {
      const onConfigureManually = vi.fn();

      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: { version: '3.0.0', exportedAt: '2025-12-03T13:28:00.000Z', pluginVersion: '3.0.0' },
        collections: []
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation, onConfigureManually });

      const cancelBtn = document.getElementById('cancelBaselineBtn') as HTMLButtonElement;
      cancelBtn.click();

      expect(onConfigureManually).toHaveBeenCalled();
      expect(container.style.display).toBe('none');
    });

    it('should handle close click in error state', () => {
      const onConfigureManually = vi.fn();

      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:00.000Z', pluginVersion: '2.0.0' },
        collections: []
      };

      const validation: ValidationResult = {
        valid: false,
        brokenAliases: [
          {
            tokenPath: 'colors.bg',
            tokenKey: 'key1',
            aliasReference: '{colors.primary}',
            referencePath: 'colors.primary',
            error: 'Error'
          }
        ],
        circularReferences: [],
        errorCount: 1,
        warnings: []
      };

      renderBaselineConfirmation({ detection, validation, onConfigureManually });

      const closeBtn = document.getElementById('closeBaselineBtn') as HTMLButtonElement;
      closeBtn.click();

      expect(onConfigureManually).toHaveBeenCalled();
      expect(container.style.display).toBe('none');
    });
  });

  describe('Utility Functions', () => {
    it('should hide baseline confirmation UI', () => {
      container.style.display = 'block';
      hideBaselineConfirmation();
      expect(container.style.display).toBe('none');
    });

    it('should handle missing file gracefully', async () => {
      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:00.000Z', pluginVersion: '2.0.0' },
        collections: []
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      // No files in state
      setState({ files: new Map() });

      renderBaselineConfirmation({ detection, validation });

      const importBtn = document.getElementById('importBaselineBtn') as HTMLButtonElement;
      importBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFigma.notify).toHaveBeenCalledWith('❌ File not found', { error: true });
    });

    it('should handle import exception', async () => {
      vi.mocked(importBaseline).mockRejectedValue(new Error('Network error'));

      const detection: BaselineDetectionResult = {
        isBaseline: true,
        metadata: { version: '2.0.0', exportedAt: '2025-12-03T13:28:00.000Z', pluginVersion: '2.0.0' },
        collections: []
      };

      const validation: ValidationResult = {
        valid: true,
        brokenAliases: [],
        circularReferences: [],
        errorCount: 0,
        warnings: []
      };

      setState({
        files: new Map([
          ['baseline.json', { name: 'baseline.json', content: { baseline: {} }, size: 1024 }]
        ])
      });

      renderBaselineConfirmation({ detection, validation });

      const importBtn = document.getElementById('importBaselineBtn') as HTMLButtonElement;
      importBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFigma.notify).toHaveBeenCalledWith(
        '❌ Import error: Network error',
        { error: true }
      );
    });
  });
});
