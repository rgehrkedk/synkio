/**
 * File Grouping Helper Utilities
 * Auto-suggest file groups based on filename patterns
 */

import type { FileGroup } from '../../types/level-config.types.js';
import type { UploadedFile } from '../state.js';
import { suggestCollectionName, extractModeNameFromFilename } from '../../types/level-config.types.js';

/**
 * Suggest initial file groups based on filename patterns
 * Groups files with common prefixes (e.g., "semantic-light" and "semantic-dark")
 */
export function suggestFileGroups(files: Map<string, UploadedFile>): FileGroup[] {
  const fileNames = Array.from(files.keys());

  if (fileNames.length === 0) {
    return [];
  }

  // If only one file, create one group
  if (fileNames.length === 1) {
    const fileName = fileNames[0];
    return [
      {
        id: generateGroupId(),
        collectionName: extractCollectionNameFromFilename(fileName),
        fileNames: [fileName],
        modeStrategy: 'merged',
        modeNames: {},
      },
    ];
  }

  // Analyze filename patterns to find groups
  const prefixMap = new Map<string, string[]>();

  for (const fileName of fileNames) {
    const prefix = extractFilePrefix(fileName);

    if (!prefixMap.has(prefix)) {
      prefixMap.set(prefix, []);
    }
    prefixMap.get(prefix)!.push(fileName);
  }

  // Create groups from prefix map
  const groups: FileGroup[] = [];

  for (const [prefix, groupFileNames] of prefixMap) {
    const collectionName = suggestCollectionName(groupFileNames);

    // If multiple files with same prefix, suggest per-file mode strategy
    const modeStrategy = groupFileNames.length > 1 ? 'per-file' : 'merged';

    // Extract mode names for per-file strategy
    const modeNames: Record<string, string> = {};
    if (modeStrategy === 'per-file') {
      for (const fileName of groupFileNames) {
        const modeName = extractModeNameFromFilename(fileName + '.json');
        modeNames[fileName] = modeName;
      }
    }

    groups.push({
      id: generateGroupId(),
      collectionName,
      fileNames: groupFileNames,
      modeStrategy,
      modeNames,
    });
  }

  return groups;
}

/**
 * Extract common prefix from filename for grouping
 * Supports separators: hyphen (-), underscore (_), dot (.)
 *
 * Examples:
 * - "semantic-light" -> "semantic"
 * - "semantic-dark" -> "semantic"
 * - "theme.light" -> "theme"
 * - "primitives" -> "primitives"
 */
function extractFilePrefix(fileName: string): string {
  // Try hyphen separator
  if (fileName.includes('-')) {
    const parts = fileName.split('-');
    if (parts.length >= 2) {
      return parts.slice(0, -1).join('-');
    }
  }

  // Try dot separator
  if (fileName.includes('.')) {
    const parts = fileName.split('.');
    if (parts.length >= 2) {
      return parts.slice(0, -1).join('.');
    }
  }

  // Try underscore separator
  if (fileName.includes('_')) {
    const parts = fileName.split('_');
    if (parts.length >= 2) {
      return parts.slice(0, -1).join('_');
    }
  }

  // No separator found, return full name as prefix
  return fileName;
}

/**
 * Extract collection name from a single filename
 */
function extractCollectionNameFromFilename(fileName: string): string {
  // Remove common mode suffixes
  return fileName
    .replace(/[-._](light|dark|mobile|desktop|default)$/i, '')
    || 'Tokens';
}

/**
 * Generate unique group ID
 */
let groupIdCounter = 0;
export function generateGroupId(): string {
  return `group-${Date.now()}-${groupIdCounter++}`;
}

/**
 * Find group containing a specific file
 */
export function findGroupByFile(groups: FileGroup[], fileName: string): FileGroup | undefined {
  return groups.find((group) => group.fileNames.includes(fileName));
}

/**
 * Move file from one group to another
 */
export function moveFileToGroup(
  groups: FileGroup[],
  fileName: string,
  targetGroupId: string
): FileGroup[] {
  // Remove file from current group
  const updatedGroups = groups.map((group) => ({
    ...group,
    fileNames: group.fileNames.filter((name) => name !== fileName),
  }));

  // Add file to target group
  return updatedGroups.map((group) => {
    if (group.id === targetGroupId) {
      return {
        ...group,
        fileNames: [...group.fileNames, fileName],
      };
    }
    return group;
  });
}

/**
 * Remove empty groups (no files)
 */
export function removeEmptyGroups(groups: FileGroup[]): FileGroup[] {
  return groups.filter((group) => group.fileNames.length > 0);
}

/**
 * Create a new empty group
 */
export function createNewGroup(): FileGroup {
  return {
    id: generateGroupId(),
    collectionName: 'New Collection',
    fileNames: [],
    modeStrategy: 'merged',
    modeNames: {},
  };
}

/**
 * Update group collection name
 */
export function updateGroupName(
  groups: FileGroup[],
  groupId: string,
  newName: string
): FileGroup[] {
  return groups.map((group) => {
    if (group.id === groupId) {
      return {
        ...group,
        collectionName: newName,
      };
    }
    return group;
  });
}

/**
 * Update group mode strategy
 */
export function updateGroupModeStrategy(
  groups: FileGroup[],
  groupId: string,
  modeStrategy: 'per-file' | 'merged'
): FileGroup[] {
  return groups.map((group) => {
    if (group.id === groupId) {
      // If switching to per-file, extract mode names
      const modeNames: Record<string, string> = {};
      if (modeStrategy === 'per-file') {
        for (const fileName of group.fileNames) {
          const modeName = extractModeNameFromFilename(fileName + '.json');
          modeNames[fileName] = modeName;
        }
      }

      return {
        ...group,
        modeStrategy,
        modeNames,
      };
    }
    return group;
  });
}

/**
 * Update mode name for a specific file in a group
 */
export function updateModeName(
  groups: FileGroup[],
  groupId: string,
  fileName: string,
  modeName: string
): FileGroup[] {
  return groups.map((group) => {
    if (group.id === groupId && group.modeNames) {
      const updatedModeNames = { ...group.modeNames, [fileName]: modeName };

      return {
        ...group,
        modeNames: updatedModeNames,
      };
    }
    return group;
  });
}
