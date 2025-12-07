/**
 * Unit Tests for Init Command
 * 
 * Tests sanitization, path generation, and other utility functions
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// Sanitization Tests
// ============================================================================

/**
 * Sanitize mode/group name for use in filename
 * (Extracted from init.ts for testing)
 */
function sanitizeForFilename(name: string): string {
  // Remove leading/trailing spaces
  let sanitized = name.trim();

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');

  // Replace path separators and special chars unsafe for filenames
  sanitized = sanitized.replace(/[\/\\:*?"<>|]/g, '-');

  // Replace spaces with hyphens
  sanitized = sanitized.replace(/\s+/g, '-');

  // Remove parentheses and brackets
  sanitized = sanitized.replace(/[\(\)\[\]]/g, '');

  // Convert to lowercase for consistency
  sanitized = sanitized.toLowerCase();

  // Remove consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Check for Windows reserved names
  const reserved = [
    'con', 'prn', 'aux', 'nul',
    'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
    'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
  ];
  if (reserved.includes(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  // Fallback to 'default' if empty after sanitization
  return sanitized || 'default';
}

describe('sanitizeForFilename', () => {
  it('should handle special characters', () => {
    expect(sanitizeForFilename('Dark / High Contrast')).toBe('dark-high-contrast');
    expect(sanitizeForFilename('Light:Blue')).toBe('light-blue');
    expect(sanitizeForFilename('Test*Name?')).toBe('test-name');
  });

  it('should handle Windows reserved names', () => {
    expect(sanitizeForFilename('con')).toBe('_con');
    expect(sanitizeForFilename('prn')).toBe('_prn');
    expect(sanitizeForFilename('aux')).toBe('_aux');
    expect(sanitizeForFilename('com1')).toBe('_com1');
    expect(sanitizeForFilename('lpt1')).toBe('_lpt1');
  });

  it('should handle path traversal attempts', () => {
    expect(sanitizeForFilename('../secrets')).toBe('secrets');
    expect(sanitizeForFilename('..\\secrets')).toBe('secrets');
    expect(sanitizeForFilename('/etc/passwd')).toBe('etc-passwd');
  });

  it('should handle empty or whitespace-only strings', () => {
    expect(sanitizeForFilename('   ')).toBe('default');
    expect(sanitizeForFilename('')).toBe('default');
    expect(sanitizeForFilename('  \t  ')).toBe('default');
  });

  it('should handle consecutive hyphens', () => {
    expect(sanitizeForFilename('foo---bar')).toBe('foo-bar');
    expect(sanitizeForFilename('a--b--c')).toBe('a-b-c');
  });

  it('should remove parentheses and brackets', () => {
    expect(sanitizeForFilename('theme (dark)')).toBe('theme-dark');
    expect(sanitizeForFilename('color [primary]')).toBe('color-primary');
  });

  it('should convert to lowercase', () => {
    expect(sanitizeForFilename('MyTheme')).toBe('mytheme');
    expect(sanitizeForFilename('DARK MODE')).toBe('dark-mode');
  });
});

// ============================================================================
// Path Generation Tests
// ============================================================================

/**
 * Generate file paths for a collection using conventions
 * (Extracted from init.ts for testing)
 */
function generateFilePaths(
  collectionName: string,
  strategy: 'byMode' | 'byGroup' | 'flat',
  keys: string[]
): { output: string; files: Record<string, string> } {
  const sanitizedCollection = sanitizeForFilename(collectionName);
  const baseDir = `tokens/${sanitizedCollection}`;
  const files: Record<string, string> = {};

  if (strategy === 'flat') {
    // All keys map to a single file
    for (const key of keys) {
      files[key] = `${baseDir}/tokens.json`;
    }
  } else {
    // Each key gets its own file
    for (const key of keys) {
      const sanitizedKey = sanitizeForFilename(key);
      files[key] = `${baseDir}/${sanitizedKey}.json`;
    }
  }

  return {
    output: baseDir,
    files
  };
}

describe('generateFilePaths', () => {
  it('should generate byMode paths for multiple modes', () => {
    const result = generateFilePaths('Core', 'byMode', ['light', 'dark']);
    
    expect(result.output).toBe('tokens/core');
    expect(result.files).toEqual({
      light: 'tokens/core/light.json',
      dark: 'tokens/core/dark.json'
    });
  });

  it('should generate byGroup paths for multiple groups', () => {
    const result = generateFilePaths('Primitives', 'byGroup', ['color', 'spacing', 'typography']);
    
    expect(result.output).toBe('tokens/primitives');
    expect(result.files).toEqual({
      color: 'tokens/primitives/color.json',
      spacing: 'tokens/primitives/spacing.json',
      typography: 'tokens/primitives/typography.json'
    });
  });

  it('should generate flat path for single file', () => {
    const result = generateFilePaths('Semantic', 'flat', ['light', 'dark']);
    
    expect(result.output).toBe('tokens/semantic');
    expect(result.files).toEqual({
      light: 'tokens/semantic/tokens.json',
      dark: 'tokens/semantic/tokens.json'
    });
  });

  it('should sanitize collection and key names in paths', () => {
    const result = generateFilePaths('Dark / Light', 'byMode', ['Mode: Dark', 'Mode: Light']);
    
    expect(result.output).toBe('tokens/dark-light');
    expect(result.files).toEqual({
      'Mode: Dark': 'tokens/dark-light/mode-dark.json',
      'Mode: Light': 'tokens/dark-light/mode-light.json'
    });
  });

  it('should handle Windows reserved names in paths', () => {
    const result = generateFilePaths('con', 'byGroup', ['aux', 'prn']);
    
    expect(result.output).toBe('tokens/_con');
    expect(result.files).toEqual({
      aux: 'tokens/_con/_aux.json',
      prn: 'tokens/_con/_prn.json'
    });
  });
});

// ============================================================================
// Strip Segments Generation Tests
// ============================================================================

/**
 * Generate strip segments from collection information
 * (Extracted from init.ts for testing)
 */
function generateStripSegments(collectionsInfo: any[]): string[] {
  const segments = new Set<string>();

  // Add collection names
  for (const info of collectionsInfo) {
    segments.add(sanitizeForFilename(info.name));

    // Add mode names
    for (const mode of info.modes) {
      segments.add(sanitizeForFilename(mode));
    }
  }

  // Add common segments that should be stripped
  segments.add('value');

  return Array.from(segments);
}

describe('generateStripSegments', () => {
  it('should generate segments from single collection', () => {
    const collectionsInfo = [
      {
        name: 'Theme',
        modes: ['light', 'dark'],
        groups: {}
      }
    ];
    
    const segments = generateStripSegments(collectionsInfo);
    
    expect(segments).toContain('theme');
    expect(segments).toContain('light');
    expect(segments).toContain('dark');
    expect(segments).toContain('value');
  });

  it('should generate segments from multiple collections', () => {
    const collectionsInfo = [
      {
        name: 'Base',
        modes: ['default'],
        groups: {}
      },
      {
        name: 'Theme',
        modes: ['light', 'dark'],
        groups: {}
      }
    ];
    
    const segments = generateStripSegments(collectionsInfo);
    
    expect(segments).toContain('base');
    expect(segments).toContain('theme');
    expect(segments).toContain('default');
    expect(segments).toContain('light');
    expect(segments).toContain('dark');
    expect(segments).toContain('value');
  });

  it('should sanitize collection and mode names', () => {
    const collectionsInfo = [
      {
        name: 'Dark / Light',
        modes: ['Mode: Dark', 'Mode: Light'],
        groups: {}
      }
    ];
    
    const segments = generateStripSegments(collectionsInfo);
    
    expect(segments).toContain('dark-light');
    expect(segments).toContain('mode-dark');
    expect(segments).toContain('mode-light');
  });

  it('should always include value segment', () => {
    const collectionsInfo: any[] = [];
    
    const segments = generateStripSegments(collectionsInfo);
    
    expect(segments).toContain('value');
  });
});
