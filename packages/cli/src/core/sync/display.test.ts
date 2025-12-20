/**
 * Sync Display Module Tests
 *
 * Tests for sync output formatting and display.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  displaySyncSummary,
  displayValueChanges,
  displayNewVariables,
  displayStyleChanges,
  displayCompletionMessage,
  formatExtrasString,
} from './display.js';
import type { ComparisonResult, StyleComparisonResult } from '../../types/index.js';

// Mock chalk to simplify output testing
vi.mock('chalk', () => ({
  default: {
    cyan: (s: string) => s,
    green: (s: string) => s,
    dim: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
  },
}));

describe('display', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('formatExtrasString', () => {
    it('should return empty string for no extras', () => {
      expect(formatExtrasString({})).toBe('');
    });

    it('should format single extra', () => {
      expect(formatExtrasString({ styleFilesWritten: 2 })).toBe(' (+ 2 style)');
    });

    it('should format multiple extras', () => {
      const result = formatExtrasString({
        styleFilesWritten: 2,
        cssFilesWritten: 3,
        buildScriptRan: true,
      });
      expect(result).toBe(' (+ 2 style, build script, 3 CSS)');
    });

    it('should include docs when provided', () => {
      const result = formatExtrasString({ docsFilesWritten: 5 });
      expect(result).toBe(' (+ 5 docs)');
    });
  });

  describe('displaySyncSummary', () => {
    it('should display total changes count', () => {
      const counts = { total: 10 };
      const styleCounts = { total: 5 };

      displaySyncSummary(counts as any, styleCounts as any);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('15'));
    });
  });

  describe('displayValueChanges', () => {
    it('should display value changes with limit', () => {
      const changes = [
        { variableId: 'v1', path: 'colors.primary', oldValue: '#fff', newValue: '#eee', type: 'COLOR' },
        { variableId: 'v2', path: 'colors.secondary', oldValue: '#000', newValue: '#111', type: 'COLOR' },
      ];

      displayValueChanges(changes, 5);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Value changes (2)'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('colors.primary'));
    });

    it('should truncate when exceeding limit', () => {
      const changes = Array.from({ length: 10 }, (_, i) => ({
        variableId: `v${i}`,
        path: `path.${i}`,
        oldValue: 'old',
        newValue: 'new',
        type: 'COLOR',
      }));

      displayValueChanges(changes, 5);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('and 5 more'));
    });
  });

  describe('displayNewVariables', () => {
    it('should display new variables with plus sign', () => {
      const variables = [
        { variableId: 'v1', path: 'colors.new', value: '#ff0000', type: 'COLOR', collection: 'c', mode: 'm' },
      ];

      displayNewVariables(variables, 5);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('+ colors.new'));
    });

    it('should truncate when exceeding limit', () => {
      const variables = Array.from({ length: 10 }, (_, i) => ({
        variableId: `v${i}`,
        path: `path.${i}`,
        value: 'val',
        type: 'COLOR',
        collection: 'c',
        mode: 'm',
      }));

      displayNewVariables(variables, 5);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('and 5 more'));
    });
  });

  describe('displayStyleChanges', () => {
    it('should display style value changes', () => {
      const styleResult: StyleComparisonResult = {
        valueChanges: [
          { styleId: 's1', path: 'colors.brand', oldValue: {}, newValue: {}, styleType: 'paint' },
        ],
        pathChanges: [],
        newStyles: [],
        deletedStyles: [],
      };

      displayStyleChanges(styleResult);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Style value changes'));
    });

    it('should display new styles', () => {
      const styleResult: StyleComparisonResult = {
        valueChanges: [],
        pathChanges: [],
        newStyles: [
          { styleId: 's1', path: 'typography.heading', value: {}, styleType: 'text' },
        ],
        deletedStyles: [],
      };

      displayStyleChanges(styleResult);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('New styles'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('typography.heading'));
    });
  });

  describe('displayCompletionMessage', () => {
    it('should display files written count', () => {
      displayCompletionMessage(10, {});

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('10 token files'));
    });

    it('should include extras in message', () => {
      displayCompletionMessage(10, { styleFilesWritten: 3, cssFilesWritten: 2 });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('3 style'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2 CSS'));
    });
  });
});
