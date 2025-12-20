/**
 * Collection Matcher Tests
 *
 * Tests for ID-based and heuristic collection/mode matching.
 */

import { describe, it, expect } from 'vitest';
import {
  matchCollectionsById,
  matchCollectionsByHeuristic,
  buildCollectionMaps,
  buildModesByCollection,
} from './collection-matcher.js';
import type { BaselineEntry } from '../../types/index.js';

describe('collection-matcher', () => {
  describe('buildCollectionMaps', () => {
    it('should build collection map from entries with IDs', () => {
      const entries: Record<string, BaselineEntry> = {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        'VariableID:1:2:base.dark': {
          variableId: 'VariableID:1:2',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:1',
          path: 'colors.secondary',
          value: '#000',
          type: 'COLOR',
          collection: 'base',
          mode: 'dark',
        },
      };

      const result = buildCollectionMaps(entries);

      expect(result.size).toBe(1);
      expect(result.has('VariableCollectionId:1:2')).toBe(true);

      const collection = result.get('VariableCollectionId:1:2')!;
      expect(collection.name).toBe('base');
      expect(collection.modes.size).toBe(2);
      expect(collection.modes.get('1:0')).toBe('light');
      expect(collection.modes.get('1:1')).toBe('dark');
    });

    it('should skip entries without collectionId or modeId', () => {
      const entries: Record<string, BaselineEntry> = {
        'var1:light': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
      };

      const result = buildCollectionMaps(entries);
      expect(result.size).toBe(0);
    });
  });

  describe('buildModesByCollection', () => {
    it('should build modes by collection name', () => {
      const entries: Record<string, BaselineEntry> = {
        'var1:light': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        'var2:dark': {
          path: 'colors.primary',
          value: '#000',
          type: 'COLOR',
          collection: 'base',
          mode: 'dark',
        },
        'var3:default': {
          path: 'spacing.small',
          value: '8px',
          type: 'DIMENSION',
          collection: 'globals',
          mode: 'default',
        },
      };

      const result = buildModesByCollection(entries);

      expect(result.size).toBe(2);
      expect(result.get('base')?.size).toBe(2);
      expect(result.get('base')?.has('light')).toBe(true);
      expect(result.get('base')?.has('dark')).toBe(true);
      expect(result.get('globals')?.size).toBe(1);
      expect(result.get('globals')?.has('default')).toBe(true);
    });
  });

  describe('matchCollectionsById', () => {
    it('should detect collection rename using collectionId', () => {
      const baseline: Record<string, BaselineEntry> = {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
      };

      const fetched: Record<string, BaselineEntry> = {
        'VariableID:1:1:tokens.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'tokens',
          mode: 'light',
        },
      };

      const result = matchCollectionsById(baseline, fetched);

      expect(result.collectionRenames.length).toBe(1);
      expect(result.collectionRenames[0].oldCollection).toBe('base');
      expect(result.collectionRenames[0].newCollection).toBe('tokens');
    });

    it('should detect mode rename using modeId', () => {
      const baseline: Record<string, BaselineEntry> = {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
      };

      const fetched: Record<string, BaselineEntry> = {
        'VariableID:1:1:base.default': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'default',
        },
      };

      const result = matchCollectionsById(baseline, fetched);

      expect(result.modeRenames.length).toBe(1);
      expect(result.modeRenames[0].oldMode).toBe('light');
      expect(result.modeRenames[0].newMode).toBe('default');
    });

    it('should detect new and deleted modes', () => {
      const baseline: Record<string, BaselineEntry> = {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
      };

      const fetched: Record<string, BaselineEntry> = {
        'VariableID:1:1:base.light': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:0',
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
        'VariableID:1:1:base.dark': {
          variableId: 'VariableID:1:1',
          collectionId: 'VariableCollectionId:1:2',
          modeId: '1:1',
          path: 'colors.primary',
          value: '#000',
          type: 'COLOR',
          collection: 'base',
          mode: 'dark',
        },
      };

      const result = matchCollectionsById(baseline, fetched);

      expect(result.newModes.length).toBe(1);
      expect(result.newModes[0].mode).toBe('dark');
    });
  });

  describe('matchCollectionsByHeuristic', () => {
    it('should detect collection rename by mode count heuristic', () => {
      const baseline: Record<string, BaselineEntry> = {
        'var1:light': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'base',
          mode: 'light',
        },
      };

      const fetched: Record<string, BaselineEntry> = {
        'var1:default': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'tokens',
          mode: 'default',
        },
      };

      const result = matchCollectionsByHeuristic(baseline, fetched);

      expect(result.collectionRenames.length).toBe(1);
      expect(result.collectionRenames[0].oldCollection).toBe('base');
      expect(result.collectionRenames[0].newCollection).toBe('tokens');
    });

    it('should detect mode renames within shared collections', () => {
      const baseline: Record<string, BaselineEntry> = {
        'var1:light': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      };

      const fetched: Record<string, BaselineEntry> = {
        'var1:day': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'day',
        },
      };

      const result = matchCollectionsByHeuristic(baseline, fetched);

      expect(result.modeRenames.length).toBe(1);
      expect(result.modeRenames[0].oldMode).toBe('light');
      expect(result.modeRenames[0].newMode).toBe('day');
    });

    it('should handle deleted modes when counts do not match', () => {
      const baseline: Record<string, BaselineEntry> = {
        'var1:light': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
        'var2:dark': {
          path: 'colors.primary',
          value: '#000',
          type: 'COLOR',
          collection: 'theme',
          mode: 'dark',
        },
      };

      const fetched: Record<string, BaselineEntry> = {
        'var1:light': {
          path: 'colors.primary',
          value: '#fff',
          type: 'COLOR',
          collection: 'theme',
          mode: 'light',
        },
      };

      const result = matchCollectionsByHeuristic(baseline, fetched);

      expect(result.deletedModes.length).toBe(1);
      expect(result.deletedModes[0].mode).toBe('dark');
    });
  });
});
