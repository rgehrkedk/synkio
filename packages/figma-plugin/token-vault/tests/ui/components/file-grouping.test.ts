/**
 * File Grouping Component Tests
 * Tests for auto-suggestion, drag-drop, group management, and mode extraction
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { UploadedFile } from '../../../src/ui/state.js';
import type { FileGroup } from '../../../src/types/level-config.types.js';
import {
  suggestFileGroups,
  moveFileToGroup,
  removeEmptyGroups,
  createNewGroup,
  updateGroupName,
  updateGroupModeStrategy,
  updateModeName,
  findGroupByFile,
} from '../../../src/ui/utils/file-grouping-helpers.js';

describe('File Grouping Helpers', () => {
  describe('suggestFileGroups', () => {
    it('should create single group for one file', () => {
      const files = new Map<string, UploadedFile>([
        [
          'primitives',
          {
            name: 'primitives',
            content: { red: '#f00' },
            size: 100,
          },
        ],
      ]);

      const groups = suggestFileGroups(files);

      expect(groups).toHaveLength(1);
      expect(groups[0].collectionName).toBe('primitives');
      expect(groups[0].fileNames).toEqual(['primitives']);
      expect(groups[0].modeStrategy).toBe('merged');
    });

    it('should auto-group files with common hyphen prefix', () => {
      const files = new Map<string, UploadedFile>([
        ['semantic-light', { name: 'semantic-light', content: {}, size: 100 }],
        ['semantic-dark', { name: 'semantic-dark', content: {}, size: 100 }],
        ['primitives', { name: 'primitives', content: {}, size: 100 }],
      ]);

      const groups = suggestFileGroups(files);

      expect(groups).toHaveLength(2);

      // Find semantic group
      const semanticGroup = groups.find((g) => g.collectionName === 'semantic');
      expect(semanticGroup).toBeDefined();
      expect(semanticGroup?.fileNames).toContain('semantic-light');
      expect(semanticGroup?.fileNames).toContain('semantic-dark');
      expect(semanticGroup?.modeStrategy).toBe('per-file');

      // Find primitives group
      const primitivesGroup = groups.find((g) => g.collectionName === 'primitives');
      expect(primitivesGroup).toBeDefined();
      expect(primitivesGroup?.fileNames).toEqual(['primitives']);
      expect(primitivesGroup?.modeStrategy).toBe('merged');
    });

    it('should extract mode names for per-file strategy', () => {
      const files = new Map<string, UploadedFile>([
        ['semantic-light', { name: 'semantic-light', content: {}, size: 100 }],
        ['semantic-dark', { name: 'semantic-dark', content: {}, size: 100 }],
      ]);

      const groups = suggestFileGroups(files);

      expect(groups).toHaveLength(1);
      expect(groups[0].modeNames?.get('semantic-light')).toBe('light');
      expect(groups[0].modeNames?.get('semantic-dark')).toBe('dark');
    });

    it('should handle dot separator in filenames', () => {
      const files = new Map<string, UploadedFile>([
        ['theme.light', { name: 'theme.light', content: {}, size: 100 }],
        ['theme.dark', { name: 'theme.dark', content: {}, size: 100 }],
      ]);

      const groups = suggestFileGroups(files);

      expect(groups).toHaveLength(1);
      expect(groups[0].collectionName).toBe('theme');
      expect(groups[0].modeNames?.get('theme.light')).toBe('light');
      expect(groups[0].modeNames?.get('theme.dark')).toBe('dark');
    });

    it('should handle underscore separator in filenames', () => {
      const files = new Map<string, UploadedFile>([
        ['responsive_mobile', { name: 'responsive_mobile', content: {}, size: 100 }],
        ['responsive_desktop', { name: 'responsive_desktop', content: {}, size: 100 }],
      ]);

      const groups = suggestFileGroups(files);

      expect(groups).toHaveLength(1);
      expect(groups[0].collectionName).toBe('responsive');
      expect(groups[0].modeNames?.get('responsive_mobile')).toBe('mobile');
      expect(groups[0].modeNames?.get('responsive_desktop')).toBe('desktop');
    });

    it('should return empty array for no files', () => {
      const files = new Map<string, UploadedFile>();
      const groups = suggestFileGroups(files);

      expect(groups).toEqual([]);
    });
  });

  describe('moveFileToGroup', () => {
    it('should move file from one group to another', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: ['semantic-light', 'semantic-dark'],
          modeStrategy: 'per-file',
          modeNames: new Map(),
        },
        {
          id: 'group-2',
          collectionName: 'primitives',
          fileNames: ['primitives'],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
      ];

      const updated = moveFileToGroup(groups, 'semantic-light', 'group-2');

      const group1 = updated.find((g) => g.id === 'group-1');
      const group2 = updated.find((g) => g.id === 'group-2');

      expect(group1?.fileNames).toEqual(['semantic-dark']);
      expect(group2?.fileNames).toContain('primitives');
      expect(group2?.fileNames).toContain('semantic-light');
    });

    it('should not modify original groups', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: ['semantic-light'],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
      ];

      const original = groups[0].fileNames.length;
      moveFileToGroup(groups, 'semantic-light', 'group-2');

      expect(groups[0].fileNames).toHaveLength(original);
    });
  });

  describe('removeEmptyGroups', () => {
    it('should remove groups with no files', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: [],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
        {
          id: 'group-2',
          collectionName: 'primitives',
          fileNames: ['primitives'],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
      ];

      const filtered = removeEmptyGroups(groups);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('group-2');
    });

    it('should keep all groups if none are empty', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: ['semantic-light'],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
        {
          id: 'group-2',
          collectionName: 'primitives',
          fileNames: ['primitives'],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
      ];

      const filtered = removeEmptyGroups(groups);

      expect(filtered).toHaveLength(2);
    });
  });

  describe('createNewGroup', () => {
    it('should create new group with default values', () => {
      const group = createNewGroup();

      expect(group.id).toBeDefined();
      expect(group.collectionName).toBe('New Collection');
      expect(group.fileNames).toEqual([]);
      expect(group.modeStrategy).toBe('merged');
      expect(group.modeNames).toBeInstanceOf(Map);
    });

    it('should generate unique IDs for multiple groups', () => {
      const group1 = createNewGroup();
      const group2 = createNewGroup();

      expect(group1.id).not.toBe(group2.id);
    });
  });

  describe('updateGroupName', () => {
    it('should update collection name for specified group', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: ['semantic-light'],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
      ];

      const updated = updateGroupName(groups, 'group-1', 'Design Tokens');

      expect(updated[0].collectionName).toBe('Design Tokens');
    });

    it('should not modify other groups', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: [],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
        {
          id: 'group-2',
          collectionName: 'primitives',
          fileNames: [],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
      ];

      const updated = updateGroupName(groups, 'group-1', 'New Name');

      expect(updated[0].collectionName).toBe('New Name');
      expect(updated[1].collectionName).toBe('primitives');
    });
  });

  describe('updateGroupModeStrategy', () => {
    it('should update mode strategy from merged to per-file', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: ['semantic-light', 'semantic-dark'],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
      ];

      const updated = updateGroupModeStrategy(groups, 'group-1', 'per-file');

      expect(updated[0].modeStrategy).toBe('per-file');
      expect(updated[0].modeNames?.size).toBe(2);
      expect(updated[0].modeNames?.get('semantic-light')).toBe('light');
      expect(updated[0].modeNames?.get('semantic-dark')).toBe('dark');
    });

    it('should clear mode names when switching to merged', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: ['semantic-light', 'semantic-dark'],
          modeStrategy: 'per-file',
          modeNames: new Map([
            ['semantic-light', 'light'],
            ['semantic-dark', 'dark'],
          ]),
        },
      ];

      const updated = updateGroupModeStrategy(groups, 'group-1', 'merged');

      expect(updated[0].modeStrategy).toBe('merged');
      expect(updated[0].modeNames?.size).toBe(0);
    });
  });

  describe('updateModeName', () => {
    it('should update mode name for specific file', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: ['semantic-light', 'semantic-dark'],
          modeStrategy: 'per-file',
          modeNames: new Map([
            ['semantic-light', 'light'],
            ['semantic-dark', 'dark'],
          ]),
        },
      ];

      const updated = updateModeName(groups, 'group-1', 'semantic-light', 'Day Mode');

      expect(updated[0].modeNames?.get('semantic-light')).toBe('Day Mode');
      expect(updated[0].modeNames?.get('semantic-dark')).toBe('dark');
    });

    it('should not modify groups without mode names', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: ['semantic-light'],
          modeStrategy: 'merged',
          modeNames: undefined,
        },
      ];

      const updated = updateModeName(groups, 'group-1', 'semantic-light', 'New Mode');

      expect(updated[0].modeNames).toBeUndefined();
    });
  });

  describe('findGroupByFile', () => {
    it('should find group containing specific file', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: ['semantic-light', 'semantic-dark'],
          modeStrategy: 'per-file',
          modeNames: new Map(),
        },
        {
          id: 'group-2',
          collectionName: 'primitives',
          fileNames: ['primitives'],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
      ];

      const found = findGroupByFile(groups, 'semantic-light');

      expect(found).toBeDefined();
      expect(found?.id).toBe('group-1');
    });

    it('should return undefined if file not found', () => {
      const groups: FileGroup[] = [
        {
          id: 'group-1',
          collectionName: 'semantic',
          fileNames: ['semantic-light'],
          modeStrategy: 'merged',
          modeNames: new Map(),
        },
      ];

      const found = findGroupByFile(groups, 'nonexistent');

      expect(found).toBeUndefined();
    });
  });
});
