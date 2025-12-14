import { describe, it, expect } from 'vitest';
import {
  calculateVersionBump,
  parseVersion,
  compareVersions,
  type TokenChange,
  type VersionBump
} from '../../../src/backend/utils/version-manager';

describe('Version Manager', () => {
  describe('Change Detection - Token Level', () => {
    it('should detect token deletion as breaking change', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };
      const next = { baseline: {} };

      const result = calculateVersionBump('1.0.0', prev, next);

      expect(result.changeType).toBe('major');
      expect(result.suggested).toBe('2.0.0');
      expect(result.breakingCount).toBeGreaterThanOrEqual(1); // Token + potentially collection/mode
      const tokenDeleted = result.changes.find(c => c.category === 'token-deleted');
      expect(tokenDeleted).toBeDefined();
      expect(tokenDeleted?.path).toBe('colors.primary');
      expect(tokenDeleted?.severity).toBe('critical');
    });

    it('should detect token addition as minor change', () => {
      const prev = { baseline: {} };
      const next = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);

      expect(result.changeType).toBe('minor');
      expect(result.suggested).toBe('1.1.0');
      expect(result.additionCount).toBeGreaterThanOrEqual(1); // Token + potentially collection/mode
      const tokenAdded = result.changes.find(c => c.category === 'token-added');
      expect(tokenAdded).toBeDefined();
      expect(tokenAdded?.path).toBe('colors.primary');
      expect(tokenAdded?.severity).toBe('info');
    });

    it('should detect token rename as breaking change', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.brand', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.5.3', prev, next);

      expect(result.changeType).toBe('major');
      expect(result.suggested).toBe('2.0.0');
      expect(result.breakingCount).toBeGreaterThanOrEqual(1);
      const tokenRenamed = result.changes.find(c => c.category === 'token-renamed');
      expect(tokenRenamed).toBeDefined();
      expect(tokenRenamed?.description).toContain('colors.primary → colors.brand');
    });

    it('should detect type change as breaking change', () => {
      const prev = {
        baseline: {
          'key1': { path: 'spacing.base', value: '16', type: 'string', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'spacing.base', value: 16, type: 'number', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);

      expect(result.changeType).toBe('major');
      expect(result.suggested).toBe('2.0.0');
      expect(result.breakingCount).toBeGreaterThanOrEqual(1);
      const typeChanged = result.changes.find(c => c.category === 'type-changed');
      expect(typeChanged).toBeDefined();
      expect(typeChanged?.description).toContain('string → number');
    });

    it('should detect value change as patch', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#0056b3', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('2.1.4', prev, next);

      expect(result.changeType).toBe('patch');
      expect(result.suggested).toBe('2.1.5');
      expect(result.patchCount).toBe(1);
      const valueChanged = result.changes.find(c => c.category === 'value-changed');
      expect(valueChanged).toBeDefined();
      expect(valueChanged?.description).toContain('#007bff → #0056b3');
    });

    it('should detect alias change as patch', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.accent', value: '{colors.primary}', type: 'color', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.accent', value: '{colors.secondary}', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);

      expect(result.changeType).toBe('patch');
      expect(result.suggested).toBe('1.0.1');
      expect(result.patchCount).toBe(1);
      const aliasChanged = result.changes.find(c => c.category === 'alias-changed');
      expect(aliasChanged).toBeDefined();
      expect(aliasChanged?.description).toContain('{colors.primary} → {colors.secondary}');
    });

    it('should detect description change as patch', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', description: 'Old description', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', description: 'New description', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);

      expect(result.changeType).toBe('patch');
      expect(result.suggested).toBe('1.0.1');
      expect(result.patchCount).toBe(1);
      const descChanged = result.changes.find(c => c.category === 'description-changed');
      expect(descChanged).toBeDefined();
    });
  });

  describe('Change Detection - Collection Level', () => {
    it('should detect collection deletion as breaking change', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key2': { path: 'spacing.base', value: '16px', type: 'spacing', collection: 'layout', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);

      expect(result.breakingCount).toBeGreaterThan(0);
      const collectionDeleted = result.changes.find(c => c.category === 'collection-deleted');
      expect(collectionDeleted).toBeDefined();
      expect(collectionDeleted?.path).toBe('core');
    });

    it('should detect collection addition as minor change', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' },
          'key2': { path: 'spacing.base', value: '16px', type: 'spacing', collection: 'layout', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);

      const collectionAdded = result.changes.find(c => c.category === 'collection-added');
      expect(collectionAdded).toBeDefined();
      expect(collectionAdded?.path).toBe('layout');
    });

    it('should detect mode deletion as breaking change', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'light' },
          'key2': { path: 'colors.primary', value: '#ffffff', type: 'color', collection: 'core', mode: 'dark' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'light' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);

      expect(result.breakingCount).toBeGreaterThan(0);
      const modeDeleted = result.changes.find(c => c.category === 'mode-deleted');
      expect(modeDeleted).toBeDefined();
      expect(modeDeleted?.description).toContain('dark');
    });

    it('should detect mode addition as minor change', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'light' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'light' },
          'key2': { path: 'colors.primary', value: '#ffffff', type: 'color', collection: 'core', mode: 'dark' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);

      const modeAdded = result.changes.find(c => c.category === 'mode-added');
      expect(modeAdded).toBeDefined();
      expect(modeAdded?.description).toContain('dark');
    });
  });

  describe('Version Bumping', () => {
    it('should bump major version correctly', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' },
          'key2': { path: 'colors.secondary', value: '#6c757d', type: 'color', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key2': { path: 'colors.secondary', value: '#6c757d', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);
      expect(result.current).toBe('1.0.0');
      expect(result.suggested).toBe('2.0.0');
      expect(result.changeType).toBe('major');
    });

    it('should bump minor version correctly', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' },
          'key2': { path: 'colors.secondary', value: '#6c757d', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.5.3', prev, next);
      expect(result.current).toBe('1.5.3');
      expect(result.suggested).toBe('1.6.0');
      expect(result.changeType).toBe('minor');
    });

    it('should bump patch version correctly', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#0056b3', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('2.1.4', prev, next);
      expect(result.current).toBe('2.1.4');
      expect(result.suggested).toBe('2.1.5');
      expect(result.changeType).toBe('patch');
    });

    it('should return same version when no changes', () => {
      const baseline = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', baseline, baseline);
      expect(result.current).toBe('1.0.0');
      expect(result.suggested).toBe('1.0.0');
      expect(result.changeType).toBe('none');
      expect(result.summary).toBe('No changes detected');
    });

    it('should prioritize breaking changes over additions', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key2': { path: 'colors.secondary', value: '#6c757d', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);
      expect(result.changeType).toBe('major'); // Deletion is breaking, not minor
      expect(result.suggested).toBe('2.0.0');
    });
  });

  describe('Multiple Changes', () => {
    it('should handle mixed changes and use highest severity', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' },
          'key2': { path: 'spacing.base', value: '16px', type: 'spacing', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#0056b3', type: 'color', collection: 'core', mode: 'default' }, // patch
          'key3': { path: 'colors.secondary', value: '#6c757d', type: 'color', collection: 'core', mode: 'default' } // addition
          // key2 deleted = breaking
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);
      expect(result.changeType).toBe('major'); // Breaking overrides all
      expect(result.suggested).toBe('2.0.0');
      expect(result.breakingCount).toBeGreaterThanOrEqual(1);
      expect(result.additionCount).toBeGreaterThanOrEqual(1);
      expect(result.patchCount).toBe(1);
    });

    it('should count multiple breaking changes correctly', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' },
          'key2': { path: 'spacing.base', value: '16px', type: 'spacing', collection: 'core', mode: 'default' },
          'key3': { path: 'font.size', value: '14px', type: 'dimension', collection: 'core', mode: 'default' },
          'key4': { path: 'colors.secondary', value: '#6c757d', type: 'color', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key4': { path: 'colors.secondary', value: '#6c757d', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);
      expect(result.breakingCount).toBe(3); // 3 token deletions (collection/mode still exist)
      expect(result.summary).toContain('3 breaking changes');
    });

    it('should generate summary for multiple change types', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' },
          'key2': { path: 'spacing.base', value: '16px', type: 'spacing', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#0056b3', type: 'color', collection: 'core', mode: 'default' },
          'key3': { path: 'colors.secondary', value: '#6c757d', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);
      expect(result.summary).toBe('1 breaking change, 1 addition, 1 update');
    });

    it('should categorize all changes correctly', () => {
      const prev = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' },
          'key2': { path: 'spacing.base', value: '16px', type: 'spacing', collection: 'core', mode: 'default' }
        }
      };
      const next = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#0056b3', type: 'color', collection: 'core', mode: 'default' },
          'key3': { path: 'colors.secondary', value: '#6c757d', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('1.0.0', prev, next);

      const breakingChanges = result.changes.filter(c => c.type === 'breaking');
      const additions = result.changes.filter(c => c.type === 'addition');
      const patches = result.changes.filter(c => c.type === 'patch');

      expect(breakingChanges.length).toBe(result.breakingCount);
      expect(additions.length).toBe(result.additionCount);
      expect(patches.length).toBe(result.patchCount);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty baselines', () => {
      const result = calculateVersionBump('1.0.0', { baseline: {} }, { baseline: {} });
      expect(result.changeType).toBe('none');
      expect(result.suggested).toBe('1.0.0');
      expect(result.changes).toHaveLength(0);
      expect(result.summary).toBe('No changes detected');
    });

    it('should handle identical baselines', () => {
      const baseline = {
        baseline: {
          'key1': { path: 'colors.primary', value: '#007bff', type: 'color', collection: 'core', mode: 'default' }
        }
      };

      const result = calculateVersionBump('2.3.1', baseline, baseline);
      expect(result.changeType).toBe('none');
      expect(result.suggested).toBe('2.3.1');
      expect(result.changes).toHaveLength(0);
    });

    it('should handle large number of changes efficiently', () => {
      const prev: any = { baseline: {} };
      const next: any = { baseline: {} };

      // Create 100 token deletions (all in same collection/mode to avoid extra changes)
      for (let i = 0; i < 100; i++) {
        prev.baseline[`key${i}`] = {
          path: `token.${i}`,
          value: `value${i}`,
          type: 'string',
          collection: 'test',
          mode: 'default'
        };
      }

      // Keep one token to prevent collection deletion
      next.baseline['keyKeep'] = {
        path: 'token.keep',
        value: 'keep',
        type: 'string',
        collection: 'test',
        mode: 'default'
      };

      const startTime = performance.now();
      const result = calculateVersionBump('1.0.0', prev, next);
      const endTime = performance.now();

      expect(result.breakingCount).toBe(100); // Only token deletions
      expect(result.changeType).toBe('major');
      expect(endTime - startTime).toBeLessThan(20); // Should complete in <20ms
    });

    it('should handle missing baseline property gracefully', () => {
      const result = calculateVersionBump('1.0.0', {}, {});
      expect(result.changeType).toBe('none');
      expect(result.changes).toHaveLength(0);
    });

    it('should handle null/undefined baselines gracefully', () => {
      const result1 = calculateVersionBump('1.0.0', null, { baseline: {} });
      expect(result1.changeType).toBe('none');

      const result2 = calculateVersionBump('1.0.0', { baseline: {} }, null);
      expect(result2.changeType).toBe('none');

      const result3 = calculateVersionBump('1.0.0', undefined, undefined);
      expect(result3.changeType).toBe('none');
    });
  });

  describe('Version Parsing and Comparison', () => {
    it('should parse version string correctly', () => {
      const v1 = parseVersion('1.2.3');
      expect(v1).toEqual({ major: 1, minor: 2, patch: 3 });

      const v2 = parseVersion('10.20.30');
      expect(v2).toEqual({ major: 10, minor: 20, patch: 30 });

      const v3 = parseVersion('0.0.1');
      expect(v3).toEqual({ major: 0, minor: 0, patch: 1 });
    });

    it('should compare versions correctly', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);

      expect(compareVersions('1.5.0', '1.6.0')).toBeLessThan(0);
      expect(compareVersions('1.6.0', '1.5.0')).toBeGreaterThan(0);

      expect(compareVersions('1.0.5', '1.0.10')).toBeLessThan(0);
      expect(compareVersions('1.0.10', '1.0.5')).toBeGreaterThan(0);
    });

    it('should compare major versions with priority', () => {
      // Major version difference should override minor/patch
      expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
      expect(compareVersions('1.9.9', '2.0.0')).toBeLessThan(0);
    });

    it('should compare minor versions when major is equal', () => {
      expect(compareVersions('1.5.0', '1.4.9')).toBeGreaterThan(0);
      expect(compareVersions('1.4.9', '1.5.0')).toBeLessThan(0);
    });
  });

  describe('Performance Requirements', () => {
    it('should detect 100 token changes in <20ms', () => {
      const prev: any = { baseline: {} };
      const next: any = { baseline: {} };

      // Create 50 token deletions + 50 additions (all in same collection/mode)
      for (let i = 0; i < 50; i++) {
        prev.baseline[`key${i}`] = {
          path: `token.deleted.${i}`,
          value: `value${i}`,
          type: 'string',
          collection: 'test',
          mode: 'default'
        };
      }

      // Keep collection/mode alive
      prev.baseline['keyKeep'] = {
        path: 'token.keep',
        value: 'keep',
        type: 'string',
        collection: 'test',
        mode: 'default'
      };
      next.baseline['keyKeep'] = {
        path: 'token.keep',
        value: 'keep',
        type: 'string',
        collection: 'test',
        mode: 'default'
      };

      for (let i = 50; i < 100; i++) {
        next.baseline[`key${i}`] = {
          path: `token.added.${i}`,
          value: `value${i}`,
          type: 'string',
          collection: 'test',
          mode: 'default'
        };
      }

      const startTime = performance.now();
      const result = calculateVersionBump('1.0.0', prev, next);
      const endTime = performance.now();

      expect(result.breakingCount).toBe(50);
      expect(result.additionCount).toBe(50);
      expect(endTime - startTime).toBeLessThan(20);
    });

    it('should handle 1000+ changes in <200ms', () => {
      const prev: any = { baseline: {} };
      const next: any = { baseline: {} };

      // Create 1000 deletions (keep collections/modes alive with one token each)
      for (let i = 0; i < 1000; i++) {
        prev.baseline[`key${i}`] = {
          path: `token.${i}`,
          value: `value${i}`,
          type: 'string',
          collection: `collection${i % 10}`, // 10 different collections
          mode: `mode${i % 5}` // 5 different modes
        };
      }

      // Keep collections/modes alive
      for (let i = 0; i < 10; i++) {
        next.baseline[`keepCol${i}`] = {
          path: `keep.col.${i}`,
          value: 'keep',
          type: 'string',
          collection: `collection${i}`,
          mode: 'mode0'
        };
      }

      const startTime = performance.now();
      const result = calculateVersionBump('1.0.0', prev, next);
      const endTime = performance.now();

      expect(result.breakingCount).toBeGreaterThanOrEqual(1000); // Token deletions
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});
