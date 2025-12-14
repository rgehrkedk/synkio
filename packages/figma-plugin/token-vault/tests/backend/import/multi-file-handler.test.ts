/**
 * Tests for multi-file import handler
 */

import { describe, it, expect } from 'vitest';
import { handleMultiFileImport } from '../../../src/backend/import/multi-file-handler.js';
import type { FileGroup, LevelConfiguration } from '../../../src/types/level-config.types.js';

describe('handleMultiFileImport', () => {
  it('should handle 2 files as modes in 1 collection', async () => {
    // Setup: Two files with same structure but different values
    const filesData = new Map([
      [
        'semantic-light.json',
        {
          colors: {
            bg: { primary: '#FFFFFF' },
            text: { primary: '#000000' },
          },
        },
      ],
      [
        'semantic-dark.json',
        {
          colors: {
            bg: { primary: '#000000' },
            text: { primary: '#FFFFFF' },
          },
        },
      ],
    ]);

    const groups: FileGroup[] = [
      {
        id: 'group-1',
        collectionName: 'semantic',
        fileNames: ['semantic-light.json', 'semantic-dark.json'],
        modeStrategy: 'per-file',
      },
    ];

    const levelsByGroup = new Map<string, LevelConfiguration[]>([
      [
        'group-1',
        [
          { depth: 1, role: 'token-path' },
          { depth: 2, role: 'token-path' },
        ],
      ],
    ]);

    const result = await handleMultiFileImport(groups, levelsByGroup, filesData);

    expect(result.success).toBe(true);
    expect(result.collectionsCreated).toBe(1);
    expect(result.modesCreated).toBe(2); // light and dark modes
    expect(result.errors).toHaveLength(0);
  });

  it('should handle 3 separate files as 3 collections', async () => {
    const filesData = new Map([
      ['colors.json', { red: '#FF0000', blue: '#0000FF' }],
      ['spacing.json', { sm: 8, md: 16 }],
      ['typography.json', { body: '16px', heading: '24px' }],
    ]);

    const groups: FileGroup[] = [
      {
        id: 'group-1',
        collectionName: 'colors',
        fileNames: ['colors.json'],
        modeStrategy: 'merged',
      },
      {
        id: 'group-2',
        collectionName: 'spacing',
        fileNames: ['spacing.json'],
        modeStrategy: 'merged',
      },
      {
        id: 'group-3',
        collectionName: 'typography',
        fileNames: ['typography.json'],
        modeStrategy: 'merged',
      },
    ];

    const levelsByGroup = new Map<string, LevelConfiguration[]>([
      ['group-1', [{ depth: 1, role: 'token-path' }]],
      ['group-2', [{ depth: 1, role: 'token-path' }]],
      ['group-3', [{ depth: 1, role: 'token-path' }]],
    ]);

    const result = await handleMultiFileImport(groups, levelsByGroup, filesData);

    expect(result.success).toBe(true);
    expect(result.collectionsCreated).toBe(3);
    expect(result.modesCreated).toBe(3); // Each collection has 1 mode
    expect(result.errors).toHaveLength(0);
  });

  it('should handle mixed grouping: some grouped, some separate', async () => {
    const filesData = new Map([
      ['semantic-light.json', { bg: '#FFFFFF', text: '#000000' }],
      ['semantic-dark.json', { bg: '#000000', text: '#FFFFFF' }],
      ['primitives.json', { red: '#FF0000', blue: '#0000FF' }],
    ]);

    const groups: FileGroup[] = [
      {
        id: 'group-1',
        collectionName: 'semantic',
        fileNames: ['semantic-light.json', 'semantic-dark.json'],
        modeStrategy: 'per-file',
      },
      {
        id: 'group-2',
        collectionName: 'primitives',
        fileNames: ['primitives.json'],
        modeStrategy: 'merged',
      },
    ];

    const levelsByGroup = new Map<string, LevelConfiguration[]>([
      ['group-1', [{ depth: 1, role: 'token-path' }]],
      ['group-2', [{ depth: 1, role: 'token-path' }]],
    ]);

    const result = await handleMultiFileImport(groups, levelsByGroup, filesData);

    expect(result.success).toBe(true);
    expect(result.collectionsCreated).toBe(2);
    expect(result.modesCreated).toBe(3); // 2 modes (light, dark) + 1 mode (primitives)
    expect(result.errors).toHaveLength(0);
  });

  it('should detect validation failures for incompatible structures', async () => {
    const filesData = new Map([
      ['file1.json', { bg: '#FFFFFF', text: '#000000' }],
      ['file2.json', { bg: '#000000' }], // Missing 'text' key
    ]);

    const groups: FileGroup[] = [
      {
        id: 'group-1',
        collectionName: 'tokens',
        fileNames: ['file1.json', 'file2.json'],
        modeStrategy: 'per-file',
      },
    ];

    const levelsByGroup = new Map<string, LevelConfiguration[]>([
      ['group-1', [{ depth: 1, role: 'token-path' }]],
    ]);

    const result = await handleMultiFileImport(groups, levelsByGroup, filesData);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('incompatible'))).toBe(true);
  });

  it('should handle missing file data gracefully', async () => {
    const filesData = new Map([
      ['file1.json', { red: '#FF0000' }],
      // file2.json is missing
    ]);

    const groups: FileGroup[] = [
      {
        id: 'group-1',
        collectionName: 'colors',
        fileNames: ['file1.json', 'file2.json'],
        modeStrategy: 'per-file',
      },
    ];

    const levelsByGroup = new Map<string, LevelConfiguration[]>([
      ['group-1', [{ depth: 1, role: 'token-path' }]],
    ]);

    const result = await handleMultiFileImport(groups, levelsByGroup, filesData);

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('File data not found'))).toBe(true);
  });

  it('should handle missing level configuration', async () => {
    const filesData = new Map([['file1.json', { red: '#FF0000' }]]);

    const groups: FileGroup[] = [
      {
        id: 'group-1',
        collectionName: 'colors',
        fileNames: ['file1.json'],
        modeStrategy: 'merged',
      },
    ];

    const levelsByGroup = new Map<string, LevelConfiguration[]>([
      // Missing group-1 configuration
    ]);

    const result = await handleMultiFileImport(groups, levelsByGroup, filesData);

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('No level configuration found'))).toBe(true);
  });

  it('should merge files into single mode when strategy is merged', async () => {
    const filesData = new Map([
      ['colors.json', { red: '#FF0000', blue: '#0000FF' }],
      ['spacing.json', { sm: 8, md: 16 }],
    ]);

    const groups: FileGroup[] = [
      {
        id: 'group-1',
        collectionName: 'tokens',
        fileNames: ['colors.json', 'spacing.json'],
        modeStrategy: 'merged',
      },
    ];

    const levelsByGroup = new Map<string, LevelConfiguration[]>([
      ['group-1', [{ depth: 1, role: 'token-path' }]],
    ]);

    const result = await handleMultiFileImport(groups, levelsByGroup, filesData);

    expect(result.success).toBe(true);
    expect(result.collectionsCreated).toBe(1);
    expect(result.modesCreated).toBe(1); // Single merged mode
    expect(result.variablesCreated).toBeGreaterThan(0);
  });
});
