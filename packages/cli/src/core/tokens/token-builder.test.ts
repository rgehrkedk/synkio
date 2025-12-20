/**
 * Token Builder Tests
 */

import { describe, it, expect } from 'vitest';
import {
  buildTokenObject,
  buildFigmaExtensions,
  getDTCGKeys,
} from './token-builder.js';

describe('token-builder', () => {
  describe('getDTCGKeys', () => {
    it('should return DTCG keys when useDtcg is true', () => {
      const keys = getDTCGKeys(true);

      expect(keys.valueKey).toBe('$value');
      expect(keys.typeKey).toBe('$type');
      expect(keys.extensionsKey).toBe('$extensions');
      expect(keys.descriptionKey).toBe('$description');
    });

    it('should return legacy keys when useDtcg is false', () => {
      const keys = getDTCGKeys(false);

      expect(keys.valueKey).toBe('value');
      expect(keys.typeKey).toBe('type');
      expect(keys.extensionsKey).toBe('extensions');
      expect(keys.descriptionKey).toBe('description');
    });
  });

  describe('buildTokenObject', () => {
    it('should build DTCG format token with $value and $type', () => {
      const result = buildTokenObject({
        value: '#0066cc',
        dtcgType: 'color',
        useDtcg: true,
        includeVariableId: false,
        extensions: {},
        entry: {},
      });

      expect(result).toEqual({
        $value: '#0066cc',
        $type: 'color',
      });
    });

    it('should build legacy format token with value and type', () => {
      const result = buildTokenObject({
        value: '#0066cc',
        dtcgType: 'color',
        useDtcg: false,
        includeVariableId: false,
        extensions: {},
        entry: {},
      });

      expect(result).toEqual({
        value: '#0066cc',
        type: 'color',
      });
    });

    it('should include description when extensions.description is true', () => {
      const result = buildTokenObject({
        value: '#0066cc',
        dtcgType: 'color',
        useDtcg: true,
        includeVariableId: false,
        extensions: { description: true },
        entry: { description: 'Primary brand color' },
      });

      expect(result.$description).toBe('Primary brand color');
    });

    it('should include variableId in $extensions when includeVariableId is true', () => {
      const result = buildTokenObject({
        value: '#0066cc',
        dtcgType: 'color',
        useDtcg: true,
        includeVariableId: true,
        extensions: {},
        entry: { variableId: 'VariableID:1:31' },
      });

      expect(result.$extensions).toEqual({
        'com.figma': { variableId: 'VariableID:1:31' },
      });
    });

    it('should include scopes in $extensions when extensions.scopes is true', () => {
      const result = buildTokenObject({
        value: '#0066cc',
        dtcgType: 'color',
        useDtcg: true,
        includeVariableId: false,
        extensions: { scopes: true },
        entry: { scopes: ['FRAME_FILL', 'TEXT_FILL'] },
      });

      expect(result.$extensions).toEqual({
        'com.figma': { scopes: ['FRAME_FILL', 'TEXT_FILL'] },
      });
    });

    it('should include codeSyntax in $extensions when extensions.codeSyntax is true', () => {
      const result = buildTokenObject({
        value: '#0066cc',
        dtcgType: 'color',
        useDtcg: true,
        includeVariableId: false,
        extensions: { codeSyntax: true },
        entry: { codeSyntax: { WEB: 'var(--colors-primary)' } },
      });

      expect(result.$extensions).toEqual({
        'com.figma': { codeSyntax: { WEB: 'var(--colors-primary)' } },
      });
    });

    it('should include all extensions when all options are enabled', () => {
      const result = buildTokenObject({
        value: '#0066cc',
        dtcgType: 'color',
        useDtcg: true,
        includeVariableId: true,
        extensions: { description: true, scopes: true, codeSyntax: true },
        entry: {
          variableId: 'VariableID:1:31',
          description: 'Primary brand color',
          scopes: ['FRAME_FILL'],
          codeSyntax: { WEB: 'var(--colors-primary)' },
        },
      });

      expect(result).toEqual({
        $value: '#0066cc',
        $type: 'color',
        $description: 'Primary brand color',
        $extensions: {
          'com.figma': {
            variableId: 'VariableID:1:31',
            scopes: ['FRAME_FILL'],
            codeSyntax: { WEB: 'var(--colors-primary)' },
          },
        },
      });
    });

    it('should not include $extensions when no extensions data is present', () => {
      const result = buildTokenObject({
        value: '#0066cc',
        dtcgType: 'color',
        useDtcg: true,
        includeVariableId: true,
        extensions: { scopes: true },
        entry: { variableId: '', scopes: [] },
      });

      expect(result).not.toHaveProperty('$extensions');
    });
  });

  describe('buildFigmaExtensions', () => {
    it('should build empty object when no extensions enabled', () => {
      const result = buildFigmaExtensions({
        includeVariableId: false,
        extensions: {},
        entry: { variableId: 'VariableID:1:31', scopes: ['FRAME_FILL'] },
      });

      expect(result).toEqual({});
    });

    it('should not include empty scopes array', () => {
      const result = buildFigmaExtensions({
        includeVariableId: false,
        extensions: { scopes: true },
        entry: { scopes: [] },
      });

      expect(result).toEqual({});
    });

    it('should not include empty codeSyntax object', () => {
      const result = buildFigmaExtensions({
        includeVariableId: false,
        extensions: { codeSyntax: true },
        entry: { codeSyntax: {} },
      });

      expect(result).toEqual({});
    });
  });
});
