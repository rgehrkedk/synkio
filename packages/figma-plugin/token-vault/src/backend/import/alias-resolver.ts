/**
 * Alias resolution system for token imports
 * Manages two-pass import: create variables first, then resolve alias references
 */

/**
 * Alias reference to resolve in pass 2
 */
export interface AliasReference {
  variable: Variable;
  modeId: string;
  aliasPath: string; // Format: "{path.to.token}"
}

/**
 * Alias resolver manages alias references and resolves them after all variables are created
 */
export class AliasResolver {
  private references: AliasReference[] = [];

  /**
   * Register an alias reference for later resolution
   */
  registerAlias(variable: Variable, modeId: string, aliasPath: string): void {
    this.references.push({
      variable,
      modeId,
      aliasPath
    });
  }

  /**
   * Resolve all registered aliases
   * @returns Summary of resolution results
   */
  async resolveAll(): Promise<{ resolved: number; failed: number; warnings: string[] }> {
    const warnings: string[] = [];
    let resolved = 0;
    let failed = 0;

    // Build variable lookup map
    const allVariables = await figma.variables.getLocalVariablesAsync();
    const variableMap = new Map<string, Variable>();
    for (const variable of allVariables) {
      variableMap.set(variable.name, variable);
    }

    // Resolve each alias
    for (const ref of this.references) {
      // Parse alias path: "{path.to.token}" -> "path/to/token"
      const aliasPath = ref.aliasPath
        .replace(/^{/, '')
        .replace(/}$/, '')
        .replace(/\./g, '/');

      const targetVariable = variableMap.get(aliasPath);

      if (targetVariable) {
        try {
          // Create alias reference
          ref.variable.setValueForMode(ref.modeId, {
            type: 'VARIABLE_ALIAS',
            id: targetVariable.id
          });
          resolved++;
        } catch (error) {
          const message = `Failed to create alias ${ref.variable.name} -> ${aliasPath}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(message);
          warnings.push(message);
          failed++;
        }
      } else {
        const message = `Alias target not found: ${aliasPath} (referenced by ${ref.variable.name})`;
        console.warn(message);
        warnings.push(message);
        failed++;
      }
    }

    return { resolved, failed, warnings };
  }

  /**
   * Clear all stored alias references
   */
  clear(): void {
    this.references.length = 0;
  }

  /**
   * Get count of pending alias references
   */
  getPendingCount(): number {
    return this.references.length;
  }
}
