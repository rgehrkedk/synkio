/**
 * Tests for alias resolution system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AliasResolver } from '../../../src/backend/import/alias-resolver';

// Mock Figma API
const mockVariables = new Map<string, any>();

global.figma = {
  variables: {
    getLocalVariablesAsync: vi.fn(async () => Array.from(mockVariables.values())),
  }
} as any;

describe('AliasResolver', () => {
  let resolver: AliasResolver;

  beforeEach(() => {
    resolver = new AliasResolver();
    mockVariables.clear();
  });

  describe('registerAlias', () => {
    it('should register alias reference', () => {
      const mockVariable = createMockVariable('colors/accent', 'COLOR');

      resolver.registerAlias(mockVariable, 'mode1', '{colors.primary}');

      expect(resolver.getPendingCount()).toBe(1);
    });

    it('should register multiple aliases', () => {
      const var1 = createMockVariable('colors/accent', 'COLOR');
      const var2 = createMockVariable('colors/surface', 'COLOR');

      resolver.registerAlias(var1, 'mode1', '{colors.primary}');
      resolver.registerAlias(var2, 'mode1', '{colors.background}');

      expect(resolver.getPendingCount()).toBe(2);
    });
  });

  describe('resolveAll', () => {
    it('should resolve single alias successfully', async () => {
      // Create target variable
      const targetVar = createMockVariable('colors/primary', 'COLOR');
      mockVariables.set('colors/primary', targetVar);

      // Create alias variable
      const aliasVar = createMockVariable('colors/accent', 'COLOR');
      resolver.registerAlias(aliasVar, 'mode1', '{colors.primary}');

      const result = await resolver.resolveAll();

      expect(result.resolved).toBe(1);
      expect(result.failed).toBe(0);
      expect(aliasVar.setValueForMode).toHaveBeenCalledWith('mode1', {
        type: 'VARIABLE_ALIAS',
        id: targetVar.id
      });
    });

    it('should handle alias path format conversion', async () => {
      // Target uses slash notation in name
      const targetVar = createMockVariable('spacing/small', 'FLOAT');
      mockVariables.set('spacing/small', targetVar);

      // Alias uses dot notation in reference
      const aliasVar = createMockVariable('spacing/button-padding', 'FLOAT');
      resolver.registerAlias(aliasVar, 'mode1', '{spacing.small}');

      const result = await resolver.resolveAll();

      expect(result.resolved).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle missing alias target gracefully', async () => {
      const aliasVar = createMockVariable('colors/accent', 'COLOR');
      resolver.registerAlias(aliasVar, 'mode1', '{colors.nonexistent}');

      const result = await resolver.resolveAll();

      expect(result.resolved).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('not found');
    });

    it('should resolve multiple aliases', async () => {
      // Create targets
      const primary = createMockVariable('colors/primary', 'COLOR');
      const secondary = createMockVariable('colors/secondary', 'COLOR');
      mockVariables.set('colors/primary', primary);
      mockVariables.set('colors/secondary', secondary);

      // Create aliases
      const accent = createMockVariable('colors/accent', 'COLOR');
      const surface = createMockVariable('colors/surface', 'COLOR');
      resolver.registerAlias(accent, 'mode1', '{colors.primary}');
      resolver.registerAlias(surface, 'mode1', '{colors.secondary}');

      const result = await resolver.resolveAll();

      expect(result.resolved).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial resolution (some succeed, some fail)', async () => {
      // Create one target
      const primary = createMockVariable('colors/primary', 'COLOR');
      mockVariables.set('colors/primary', primary);

      // Create two aliases (one will fail)
      const accent = createMockVariable('colors/accent', 'COLOR');
      const surface = createMockVariable('colors/surface', 'COLOR');
      resolver.registerAlias(accent, 'mode1', '{colors.primary}');
      resolver.registerAlias(surface, 'mode1', '{colors.nonexistent}');

      const result = await resolver.resolveAll();

      expect(result.resolved).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should clear all registered aliases', () => {
      const var1 = createMockVariable('colors/accent', 'COLOR');
      resolver.registerAlias(var1, 'mode1', '{colors.primary}');

      expect(resolver.getPendingCount()).toBe(1);

      resolver.clear();

      expect(resolver.getPendingCount()).toBe(0);
    });
  });
});

/**
 * Helper to create mock Figma variable
 */
function createMockVariable(name: string, type: VariableResolvedDataType): any {
  return {
    id: `var_${Math.random().toString(36).substring(7)}`,
    name,
    resolvedType: type,
    setValueForMode: vi.fn(),
    valuesByMode: {}
  };
}
