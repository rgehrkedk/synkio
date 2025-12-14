/**
 * Tests for mode name extraction from filenames
 */

import { describe, it, expect } from 'vitest';
import {
  extractModeNameFromFilename,
  suggestCollectionNameFromFiles,
} from '../../../src/backend/utils/mode-extractor.js';

describe('extractModeNameFromFilename', () => {
  it('should extract mode from hyphen separator', () => {
    expect(extractModeNameFromFilename('semantic-light.json')).toBe('light');
    expect(extractModeNameFromFilename('semantic-dark.json')).toBe('dark');
    expect(extractModeNameFromFilename('tokens-mobile.json')).toBe('mobile');
  });

  it('should extract mode from dot separator', () => {
    expect(extractModeNameFromFilename('theme.light.json')).toBe('light');
    expect(extractModeNameFromFilename('tokens.dark.json')).toBe('dark');
  });

  it('should extract mode from underscore separator', () => {
    expect(extractModeNameFromFilename('mobile_theme.json')).toBe('theme');
    expect(extractModeNameFromFilename('desktop_compact.json')).toBe('compact');
  });

  it('should return full name when no separator found', () => {
    expect(extractModeNameFromFilename('tokens.json')).toBe('tokens');
    expect(extractModeNameFromFilename('colors.json')).toBe('colors');
  });
});

describe('suggestCollectionNameFromFiles', () => {
  it('should return "Tokens" for empty array', () => {
    expect(suggestCollectionNameFromFiles([])).toBe('Tokens');
  });

  it('should extract base name for single file', () => {
    expect(suggestCollectionNameFromFiles(['semantic-light.json'])).toBe('semantic');
    expect(suggestCollectionNameFromFiles(['theme.dark.json'])).toBe('theme');
  });

  it('should find common prefix for multiple files', () => {
    expect(
      suggestCollectionNameFromFiles(['semantic-light.json', 'semantic-dark.json'])
    ).toBe('semantic');
    expect(
      suggestCollectionNameFromFiles(['theme.light.json', 'theme.dark.json'])
    ).toBe('theme');
  });

  it('should return "Tokens" when no common prefix', () => {
    expect(
      suggestCollectionNameFromFiles(['colors.json', 'spacing.json'])
    ).toBe('Tokens');
  });
});
