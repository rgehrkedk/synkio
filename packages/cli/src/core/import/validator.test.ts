/**
 * Validator Module Tests
 *
 * Tests for validating import file formats.
 */

import { describe, it, expect } from 'vitest';
import {
  validateImportFiles,
  isFigmaNativeFormat,
  formatInvalidFormatError,
} from './validator.js';
import type { ImportFile } from './source-resolver.js';

// Valid Figma native format content
const validFigmaContent = {
  colors: {
    primary: {
      $type: 'color',
      $value: { hex: '#007bff' },
      $extensions: {
        'com.figma.variableId': 'VariableID:1:1',
        'com.figma.scopes': ['ALL_SCOPES'],
      },
    },
  },
  $extensions: {
    'com.figma.modeName': 'light',
  },
};

// Invalid format (missing Figma-specific extensions)
const invalidContent = {
  colors: {
    primary: {
      $type: 'color',
      $value: '#007bff',
      // Missing $extensions.com.figma.variableId
    },
  },
};

// Plain object (not DTCG format)
const plainObjectContent = {
  colors: {
    primary: '#007bff',
  },
};

describe('validator', () => {
  describe('isFigmaNativeFormat', () => {
    it('should return true for valid Figma native format', () => {
      expect(isFigmaNativeFormat(validFigmaContent)).toBe(true);
    });

    it('should return true for content with root modeName extension', () => {
      const contentWithModeName = {
        $extensions: {
          'com.figma.modeName': 'light',
        },
      };
      expect(isFigmaNativeFormat(contentWithModeName)).toBe(true);
    });

    it('should return false for DTCG without Figma extensions', () => {
      expect(isFigmaNativeFormat(invalidContent)).toBe(false);
    });

    it('should return false for plain object content', () => {
      expect(isFigmaNativeFormat(plainObjectContent)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isFigmaNativeFormat(null)).toBe(false);
      expect(isFigmaNativeFormat(undefined)).toBe(false);
      expect(isFigmaNativeFormat('string')).toBe(false);
      expect(isFigmaNativeFormat(123)).toBe(false);
    });
  });

  describe('formatInvalidFormatError', () => {
    it('should include filename in error message', () => {
      const error = formatInvalidFormatError('theme.json');

      expect(error).toContain('theme.json');
      expect(error).toContain('not in Figma native export format');
    });

    it('should include export instructions', () => {
      const error = formatInvalidFormatError('test.json');

      expect(error).toContain('Export from Figma');
      expect(error).toContain('Variables -> JSON');
    });
  });

  describe('validateImportFiles', () => {
    it('should return valid for all valid files', () => {
      const files: ImportFile[] = [
        { content: validFigmaContent, filename: 'light.json', collection: 'theme' },
        { content: validFigmaContent, filename: 'dark.json', collection: 'theme' },
      ];

      const result = validateImportFiles(files);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid with errors for invalid files', () => {
      const files: ImportFile[] = [
        { content: validFigmaContent, filename: 'valid.json', collection: 'theme' },
        { content: invalidContent, filename: 'invalid.json', collection: 'theme' },
      ];

      const result = validateImportFiles(files);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('invalid.json');
    });

    it('should collect errors from multiple invalid files', () => {
      const files: ImportFile[] = [
        { content: invalidContent, filename: 'bad1.json', collection: 'theme' },
        { content: plainObjectContent, filename: 'bad2.json', collection: 'theme' },
      ];

      const result = validateImportFiles(files);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('bad1.json');
      expect(result.errors[1]).toContain('bad2.json');
    });

    it('should return valid for empty file array', () => {
      const result = validateImportFiles([]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
