/**
 * Tests for level configuration types and validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateLevelConfiguration,
  extractModeNameFromFilename,
  suggestCollectionName,
} from '../../src/types/level-config.types.js';
import type { LevelConfiguration } from '../../src/types/level-config.types.js';

describe('Level Configuration Validation', () => {
  it('should validate valid configuration with collection and mode', () => {
    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'collection' },
      { depth: 2, role: 'mode' },
      { depth: 3, role: 'token-path' },
    ];

    const result = validateLevelConfiguration(levels);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject configuration without collection', () => {
    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'mode' },
      { depth: 2, role: 'token-path' },
    ];

    const result = validateLevelConfiguration(levels);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Collection');
  });

  it('should warn when no mode is defined', () => {
    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'collection' },
      { depth: 2, role: 'token-path' },
    ];

    const result = validateLevelConfiguration(levels);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.[0]).toContain('default mode');
  });

  it('should reject empty configuration', () => {
    const levels: LevelConfiguration[] = [];

    const result = validateLevelConfiguration(levels);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No level configurations');
  });

  it('should reject non-sequential depths', () => {
    const levels: LevelConfiguration[] = [
      { depth: 1, role: 'collection' },
      { depth: 3, role: 'token-path' }, // Missing depth 2
    ];

    const result = validateLevelConfiguration(levels);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('sequential');
  });
});

describe('Mode Name Extraction', () => {
  it('should extract mode from hyphen separator', () => {
    expect(extractModeNameFromFilename('semantic-light.json')).toBe('light');
    expect(extractModeNameFromFilename('tokens-dark.json')).toBe('dark');
  });

  it('should extract mode from dot separator', () => {
    expect(extractModeNameFromFilename('theme.light.json')).toBe('light');
    expect(extractModeNameFromFilename('colors.dark.json')).toBe('dark');
  });

  it('should extract mode from underscore separator', () => {
    expect(extractModeNameFromFilename('mobile_theme.json')).toBe('theme');
    expect(extractModeNameFromFilename('desktop_light.json')).toBe('light');
  });

  it('should fallback to full name without extension if no separator', () => {
    expect(extractModeNameFromFilename('tokens.json')).toBe('tokens');
    expect(extractModeNameFromFilename('primitives.json')).toBe('primitives');
  });
});

describe('Collection Name Suggestion', () => {
  it('should suggest name from common prefix', () => {
    const fileNames = ['semantic-light.json', 'semantic-dark.json'];
    expect(suggestCollectionName(fileNames)).toBe('semantic');
  });

  it('should handle single file by removing mode suffix', () => {
    expect(suggestCollectionName(['semantic-light.json'])).toBe('semantic');
    expect(suggestCollectionName(['colors-dark.json'])).toBe('colors');
  });

  it('should fallback to "Tokens" for empty array', () => {
    expect(suggestCollectionName([])).toBe('Tokens');
  });

  it('should fallback to "Tokens" when no common prefix', () => {
    const fileNames = ['colors.json', 'spacing.json', 'typography.json'];
    expect(suggestCollectionName(fileNames)).toBe('Tokens');
  });
});
