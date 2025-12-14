/**
 * Tests for UI state management with flexible import
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getState,
  setState,
  resetState,
  setImportStep,
  setFileGroups,
  setStructureConfig,
  updateLevelConfiguration,
} from '../../src/ui/state.js';
import type { FileGroup, LevelConfiguration } from '../../src/types/level-config.types.js';

describe('State Management - Flexible Import', () => {
  beforeEach(() => {
    resetState();
  });

  it('should update import step', () => {
    setImportStep('group');
    expect(getState().currentImportStep).toBe('group');

    setImportStep('configure');
    expect(getState().currentImportStep).toBe('configure');
  });

  it('should update file groups', () => {
    const groups: FileGroup[] = [
      {
        id: 'group-1',
        collectionName: 'semantic',
        fileNames: ['semantic-light.json', 'semantic-dark.json'],
        modeStrategy: 'per-file',
        modeNames: new Map([
          ['semantic-light.json', 'light'],
          ['semantic-dark.json', 'dark'],
        ]),
      },
    ];

    setFileGroups(groups);
    expect(getState().fileGroups).toEqual(groups);
    expect(getState().fileGroups?.[0].collectionName).toBe('semantic');
    expect(getState().fileGroups?.[0].modeStrategy).toBe('per-file');
  });

  it('should update structure configuration', () => {
    const config = {
      fileName: 'tokens.json',
      levels: [
        { depth: 1, role: 'collection' as const, exampleKeys: ['semantic'] },
        { depth: 2, role: 'mode' as const, exampleKeys: ['light', 'dark'] },
        { depth: 3, role: 'token-path' as const, exampleKeys: ['bg', 'text'] },
      ],
    };

    setStructureConfig(config);
    expect(getState().structureConfig?.fileName).toBe('tokens.json');
    expect(getState().structureConfig?.levels).toHaveLength(3);
    expect(getState().structureConfig?.levels[0].role).toBe('collection');
    expect(getState().structureConfig?.levels[1].role).toBe('mode');
  });

  it('should update level configuration within existing structure config', () => {
    // First set initial config
    setStructureConfig({
      fileName: 'tokens.json',
      levels: [
        { depth: 1, role: 'collection' as const },
        { depth: 2, role: 'token-path' as const },
      ],
    });

    // Update levels
    const newLevels: LevelConfiguration[] = [
      { depth: 1, role: 'collection' as const },
      { depth: 2, role: 'mode' as const },
      { depth: 3, role: 'token-path' as const },
    ];

    updateLevelConfiguration(newLevels);

    expect(getState().structureConfig?.levels).toHaveLength(3);
    expect(getState().structureConfig?.levels[1].role).toBe('mode');
    expect(getState().structureConfig?.fileName).toBe('tokens.json'); // Preserved
  });

  it('should maintain backward compatibility with deprecated fields', () => {
    // Ensure old fields can still be set (for migration period)
    setState({
      selectedFileName: 'old-file.json',
      nestedStructure: {
        isNested: true,
        depth: 3,
        confidence: 0.9,
        suggestedStrategy: 'separate-collections' as const,
        structure: {},
      },
    });

    expect(getState().selectedFileName).toBe('old-file.json');
    expect(getState().nestedStructure?.isNested).toBe(true);
  });
});
