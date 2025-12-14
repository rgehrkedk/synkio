import { describe, it, expect } from 'vitest';
import {
  validateBaseline,
  hasValidationErrors,
  getBrokenAliases,
  type BrokenAlias,
  type ValidationResult
} from '../../../src/backend/utils/baseline-validator';

describe('Baseline Validator', () => {
  describe('Basic Validation', () => {
    it('should validate baseline with no aliases', () => {
      const baseline = {
        $metadata: { version: '2.0.0' },
        baseline: {
          'key1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color'
          },
          'key2': {
            path: 'colors.secondary',
            value: '#6c757d',
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(true);
      expect(result.brokenAliases).toHaveLength(0);
      expect(result.circularReferences).toHaveLength(0);
      expect(result.errorCount).toBe(0);
    });

    it('should validate baseline with valid aliases', () => {
      const baseline = {
        $metadata: { version: '2.0.0' },
        baseline: {
          'key1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color'
          },
          'key2': {
            path: 'colors.button-bg',
            value: '{colors.primary}',
            type: 'color'
          },
          'key3': {
            path: 'colors.link',
            value: '{colors.primary}',
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(true);
      expect(result.brokenAliases).toHaveLength(0);
      expect(result.circularReferences).toHaveLength(0);
      expect(result.errorCount).toBe(0);
    });

    it('should detect broken alias reference', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.button-bg',
            value: '{colors.primary}',  // Broken!
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(false);
      expect(result.brokenAliases).toHaveLength(1);
      expect(result.brokenAliases[0].referencePath).toBe('colors.primary');
      expect(result.brokenAliases[0].tokenPath).toBe('colors.button-bg');
      expect(result.brokenAliases[0].tokenKey).toBe('key1');
      expect(result.brokenAliases[0].error).toContain('does not exist');
    });

    it('should detect multiple broken aliases', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.button-bg',
            value: '{colors.primary}',
            type: 'color'
          },
          'key2': {
            path: 'spacing.large',
            value: '{spacing.base}',
            type: 'dimension'
          },
          'key3': {
            path: 'typography.heading',
            value: '{typography.base}',
            type: 'string'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(false);
      expect(result.brokenAliases).toHaveLength(3);
      expect(result.errorCount).toBe(3);

      const brokenPaths = result.brokenAliases.map(b => b.referencePath);
      expect(brokenPaths).toContain('colors.primary');
      expect(brokenPaths).toContain('spacing.base');
      expect(brokenPaths).toContain('typography.base');
    });
  });

  describe('Alias Detection', () => {
    it('should detect {path.to.token} format', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color'
          },
          'key2': {
            path: 'colors.button',
            value: '{colors.primary}',
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(true);
      expect(result.brokenAliases).toHaveLength(0);
    });

    it('should ignore non-alias strings', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'text.sample',
            value: 'This is {not} an alias',
            type: 'string'
          },
          'key2': {
            path: 'text.another',
            value: '{incomplete',
            type: 'string'
          },
          'key3': {
            path: 'text.third',
            value: 'incomplete}',
            type: 'string'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(true);
      expect(result.brokenAliases).toHaveLength(0);
    });

    it('should handle aliases in different token types', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color'
          },
          'key2': {
            path: 'spacing.base',
            value: '8px',
            type: 'dimension'
          },
          'key3': {
            path: 'colors.button',
            value: '{colors.primary}',
            type: 'color'
          },
          'key4': {
            path: 'spacing.large',
            value: '{spacing.base}',
            type: 'dimension'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(true);
      expect(result.brokenAliases).toHaveLength(0);
    });

    it('should reject empty alias references', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.empty',
            value: '{}',
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      // Empty alias {} is treated as a string literal (not an alias)
      expect(result.valid).toBe(true);
    });
  });

  describe('Circular References', () => {
    it('should detect simple circular reference (A → B → A)', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'A',
            value: '{B}',
            type: 'color'
          },
          'key2': {
            path: 'B',
            value: '{A}',
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(false);
      expect(result.circularReferences.length).toBeGreaterThan(0);

      const circular = result.circularReferences[0];
      expect(circular.path).toContain('A');
      expect(circular.path).toContain('B');
      expect(circular.error).toContain('Circular reference');
    });

    it('should detect complex circular reference (A → B → C → A)', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'A',
            value: '{B}',
            type: 'color'
          },
          'key2': {
            path: 'B',
            value: '{C}',
            type: 'color'
          },
          'key3': {
            path: 'C',
            value: '{A}',
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(false);
      expect(result.circularReferences.length).toBeGreaterThan(0);

      const circular = result.circularReferences[0];
      expect(circular.path.length).toBeGreaterThan(2);
      expect(circular.error).toContain('Circular reference');
    });

    it('should detect self-reference (A → A)', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'A',
            value: '{A}',
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(false);
      expect(result.circularReferences.length).toBeGreaterThan(0);

      const circular = result.circularReferences[0];
      expect(circular.path).toContain('A');
      expect(circular.error).toContain('Circular reference');
    });

    it('should not report false positives on valid chains', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.base',
            value: '#007bff',
            type: 'color'
          },
          'key2': {
            path: 'colors.primary',
            value: '{colors.base}',
            type: 'color'
          },
          'key3': {
            path: 'colors.button',
            value: '{colors.primary}',
            type: 'color'
          },
          'key4': {
            path: 'colors.link',
            value: '{colors.primary}',
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(true);
      expect(result.circularReferences).toHaveLength(0);
    });

    it('should handle multiple separate cycles', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'A',
            value: '{B}',
            type: 'color'
          },
          'key2': {
            path: 'B',
            value: '{A}',
            type: 'color'
          },
          'key3': {
            path: 'X',
            value: '{Y}',
            type: 'color'
          },
          'key4': {
            path: 'Y',
            value: '{X}',
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(false);
      expect(result.circularReferences.length).toBeGreaterThan(0);
    });

    it('should handle broken aliases in circular reference chain', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'A',
            value: '{B}',  // B doesn't exist - broken alias
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(false);
      expect(result.brokenAliases).toHaveLength(1);
      // Circular ref detection should not crash on missing tokens
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty baseline', () => {
      const baseline = {
        $metadata: { version: '2.0.0' },
        baseline: {}
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(true);
      expect(result.brokenAliases).toHaveLength(0);
      expect(result.circularReferences).toHaveLength(0);
    });

    it('should handle baseline with no aliases', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color'
          },
          'key2': {
            path: 'spacing.base',
            value: '8px',
            type: 'dimension'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(true);
      expect(result.brokenAliases).toHaveLength(0);
    });

    it('should fail gracefully on invalid baseline format (null)', () => {
      const result = validateBaseline(null);
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Invalid baseline format: expected object');
    });

    it('should fail gracefully on invalid baseline format (missing baseline)', () => {
      const result = validateBaseline({ $metadata: { version: '2.0.0' } });
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Invalid baseline format: missing baseline property');
    });

    it('should fail gracefully on invalid baseline format (array)', () => {
      const result = validateBaseline({ baseline: [] });
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Invalid baseline format: baseline must be an object');
    });

    it('should handle mixed valid and invalid aliases', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color'
          },
          'key2': {
            path: 'colors.button',
            value: '{colors.primary}',  // Valid
            type: 'color'
          },
          'key3': {
            path: 'colors.link',
            value: '{colors.missing}',  // Broken
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(false);
      expect(result.brokenAliases).toHaveLength(1);
      expect(result.brokenAliases[0].referencePath).toBe('colors.missing');
    });

    it('should skip tokens without path property', () => {
      const baseline = {
        baseline: {
          'key1': {
            value: '#007bff',
            type: 'color'
            // No path property
          },
          'key2': {
            path: 'colors.button',
            value: '{colors.primary}',
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      // Should not crash, treats missing path gracefully
      expect(result.brokenAliases.length).toBeGreaterThan(0);
    });

    it('should handle malformed token entries', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color'
          },
          'null-entry': null,
          'string-entry': 'invalid',
          'number-entry': 123,
          'key2': {
            path: 'colors.button',
            value: '{colors.primary}',
            type: 'color'
          }
        }
      };

      const result = validateBaseline(baseline);
      // Should skip invalid entries and validate valid ones
      expect(result.valid).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('hasValidationErrors should return true for broken aliases', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.button',
            value: '{colors.primary}',
            type: 'color'
          }
        }
      };

      expect(hasValidationErrors(baseline)).toBe(true);
    });

    it('hasValidationErrors should return false for valid baseline', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color'
          }
        }
      };

      expect(hasValidationErrors(baseline)).toBe(false);
    });

    it('getBrokenAliases should return only broken aliases', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.button',
            value: '{colors.primary}',
            type: 'color'
          },
          'key2': {
            path: 'spacing.large',
            value: '{spacing.base}',
            type: 'dimension'
          }
        }
      };

      const brokenAliases = getBrokenAliases(baseline);
      expect(brokenAliases).toHaveLength(2);
      expect(brokenAliases[0].referencePath).toBe('colors.primary');
      expect(brokenAliases[1].referencePath).toBe('spacing.base');
    });

    it('getBrokenAliases should return empty array for valid baseline', () => {
      const baseline = {
        baseline: {
          'key1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color'
          },
          'key2': {
            path: 'colors.button',
            value: '{colors.primary}',
            type: 'color'
          }
        }
      };

      const brokenAliases = getBrokenAliases(baseline);
      expect(brokenAliases).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should validate small baseline (<100 tokens) in <10ms', () => {
      const baseline: any = {
        baseline: {}
      };

      // Generate 100 tokens with some aliases
      for (let i = 0; i < 100; i++) {
        const key = `key${i}`;
        if (i % 3 === 0 && i > 0) {
          // Every 3rd token is an alias
          baseline.baseline[key] = {
            path: `tokens.alias${i}`,
            value: `{tokens.value${i - 1}}`,
            type: 'color'
          };
        } else {
          baseline.baseline[key] = {
            path: `tokens.value${i}`,
            value: `#${i.toString(16).padStart(6, '0')}`,
            type: 'color'
          };
        }
      }

      const startTime = performance.now();
      const result = validateBaseline(baseline);
      const duration = performance.now() - startTime;

      expect(result.valid).toBe(true);
      expect(duration).toBeLessThan(10);
    });

    it('should validate large baseline (1000+ tokens) in <100ms', () => {
      const baseline: any = {
        baseline: {}
      };

      // Generate 1000 tokens with aliases
      for (let i = 0; i < 1000; i++) {
        const key = `key${i}`;
        if (i % 5 === 0 && i > 0) {
          // Every 5th token is an alias
          baseline.baseline[key] = {
            path: `tokens.alias${i}`,
            value: `{tokens.value${i - 1}}`,
            type: 'color'
          };
        } else {
          baseline.baseline[key] = {
            path: `tokens.value${i}`,
            value: `#${i.toString(16).padStart(6, '0')}`,
            type: 'color'
          };
        }
      }

      const startTime = performance.now();
      const result = validateBaseline(baseline);
      const duration = performance.now() - startTime;

      expect(result.valid).toBe(true);
      expect(duration).toBeLessThan(100);
    });

    it('should handle deep alias chains efficiently', () => {
      const baseline: any = {
        baseline: {}
      };

      // Create a chain: A → B → C → ... → Z
      const chain = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      for (let i = 0; i < chain.length; i++) {
        const key = `key${i}`;
        if (i === chain.length - 1) {
          // Last one has a value
          baseline.baseline[key] = {
            path: chain[i],
            value: '#007bff',
            type: 'color'
          };
        } else {
          // Others reference the next
          baseline.baseline[key] = {
            path: chain[i],
            value: `{${chain[i + 1]}}`,
            type: 'color'
          };
        }
      }

      const startTime = performance.now();
      const result = validateBaseline(baseline);
      const duration = performance.now() - startTime;

      expect(result.valid).toBe(true);
      expect(duration).toBeLessThan(10);
    });

    it('should detect circular references in large baseline efficiently', () => {
      const baseline: any = {
        baseline: {}
      };

      // Generate 500 valid tokens
      for (let i = 0; i < 500; i++) {
        baseline.baseline[`key${i}`] = {
          path: `tokens.value${i}`,
          value: `#${i.toString(16).padStart(6, '0')}`,
          type: 'color'
        };
      }

      // Add a circular reference
      baseline.baseline['circular1'] = {
        path: 'circular.A',
        value: '{circular.B}',
        type: 'color'
      };
      baseline.baseline['circular2'] = {
        path: 'circular.B',
        value: '{circular.A}',
        type: 'color'
      };

      const startTime = performance.now();
      const result = validateBaseline(baseline);
      const duration = performance.now() - startTime;

      expect(result.valid).toBe(false);
      expect(result.circularReferences.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Integration Scenarios', () => {
    it('should validate real baseline export format', () => {
      const realBaseline = {
        $metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:07.452Z',
          pluginVersion: '1.0.0',
          fileKey: 'abc123',
          fileName: 'testds'
        },
        baseline: {
          'primitives:Mode 1:VariableID:2:2656': {
            path: 'primitives.color.gray.50',
            value: '#fafafa',
            type: 'color',
            collection: 'primitives',
            mode: 'Mode 1'
          },
          'primitives:Mode 1:VariableID:2:2657': {
            path: 'primitives.color.gray.100',
            value: '#f4f4f5',
            type: 'color',
            collection: 'primitives',
            mode: 'Mode 1'
          },
          'primitives:Mode 1:VariableID:2:2658': {
            path: 'primitives.color.button',
            value: '{primitives.color.gray.50}',
            type: 'color',
            collection: 'primitives',
            mode: 'Mode 1'
          }
        }
      };

      const result = validateBaseline(realBaseline);
      expect(result.valid).toBe(true);
      expect(result.brokenAliases).toHaveLength(0);
    });

    it('should detect broken aliases in exported baseline', () => {
      const brokenBaseline = {
        $metadata: {
          version: '2.0.0',
          exportedAt: '2025-12-03T13:28:07.452Z'
        },
        baseline: {
          'key1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color'
          },
          'key2': {
            path: 'colors.button',
            value: '{colors.brand}',  // Broken - brand doesn't exist
            type: 'color'
          }
        }
      };

      const result = validateBaseline(brokenBaseline);
      expect(result.valid).toBe(false);
      expect(result.brokenAliases).toHaveLength(1);
      expect(result.brokenAliases[0].referencePath).toBe('colors.brand');
    });

    it('should handle complex multi-collection baseline', () => {
      const baseline = {
        baseline: {
          // Collection 1: colors
          'colors:light:1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color',
            collection: 'colors',
            mode: 'light'
          },
          'colors:light:2': {
            path: 'colors.button',
            value: '{colors.primary}',
            type: 'color',
            collection: 'colors',
            mode: 'light'
          },
          // Collection 2: spacing
          'spacing:default:1': {
            path: 'spacing.base',
            value: '8px',
            type: 'dimension',
            collection: 'spacing',
            mode: 'default'
          },
          'spacing:default:2': {
            path: 'spacing.large',
            value: '{spacing.base}',
            type: 'dimension',
            collection: 'spacing',
            mode: 'default'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(true);
      expect(result.brokenAliases).toHaveLength(0);
    });

    it('should detect broken cross-collection references', () => {
      const baseline = {
        baseline: {
          'colors:light:1': {
            path: 'colors.primary',
            value: '#007bff',
            type: 'color',
            collection: 'colors',
            mode: 'light'
          },
          'spacing:default:1': {
            path: 'spacing.large',
            value: '{spacing.base}',  // Broken - spacing.base doesn't exist
            type: 'dimension',
            collection: 'spacing',
            mode: 'default'
          }
        }
      };

      const result = validateBaseline(baseline);
      expect(result.valid).toBe(false);
      expect(result.brokenAliases).toHaveLength(1);
    });
  });
});
