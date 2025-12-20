/**
 * Token Builder
 *
 * Handles the construction of DTCG or legacy format token objects.
 */

import type { BaselineEntry } from '../../types/index.js';

/**
 * Options for building a token object
 */
export interface TokenBuildOptions {
  value: unknown;
  dtcgType: string;
  useDtcg: boolean;
  includeVariableId: boolean;
  extensions: {
    description?: boolean;
    scopes?: boolean;
    codeSyntax?: boolean;
  };
  entry: Pick<BaselineEntry, 'description' | 'scopes' | 'codeSyntax' | 'variableId'>;
}

/**
 * Keys used for DTCG format output
 */
export interface DTCGKeys {
  valueKey: '$value' | 'value';
  typeKey: '$type' | 'type';
  extensionsKey: '$extensions' | 'extensions';
  descriptionKey: '$description' | 'description';
}

/**
 * Gets the appropriate keys for DTCG or legacy format.
 *
 * @param useDtcg - Whether to use DTCG format
 * @returns The keys to use for token properties
 */
export function getDTCGKeys(useDtcg: boolean): DTCGKeys {
  return {
    valueKey: useDtcg ? '$value' : 'value',
    typeKey: useDtcg ? '$type' : 'type',
    extensionsKey: useDtcg ? '$extensions' : 'extensions',
    descriptionKey: useDtcg ? '$description' : 'description',
  };
}

/**
 * Builds a token object in DTCG or legacy format with optional extensions.
 *
 * @param options - The options for building the token
 * @returns The token object ready for output
 *
 * @example
 * // DTCG format with extensions
 * buildTokenObject({
 *   value: '#0066cc',
 *   dtcgType: 'color',
 *   useDtcg: true,
 *   includeVariableId: true,
 *   extensions: { description: true, scopes: true },
 *   entry: {
 *     variableId: 'VariableID:1:31',
 *     description: 'Primary brand color',
 *     scopes: ['FRAME_FILL'],
 *   },
 * })
 * // Returns: {
 * //   $value: '#0066cc',
 * //   $type: 'color',
 * //   $description: 'Primary brand color',
 * //   $extensions: { 'com.figma': { variableId: 'VariableID:1:31', scopes: ['FRAME_FILL'] } }
 * // }
 */
export function buildTokenObject(options: TokenBuildOptions): Record<string, any> {
  const {
    value,
    dtcgType,
    useDtcg,
    includeVariableId,
    extensions,
    entry,
  } = options;

  const keys = getDTCGKeys(useDtcg);
  const tokenObj: Record<string, any> = {
    [keys.valueKey]: value,
    [keys.typeKey]: dtcgType,
  };

  // Optionally include description
  if (extensions.description && entry.description) {
    tokenObj[keys.descriptionKey] = entry.description;
  }

  // Build extensions object for variableId, scopes, codeSyntax
  const figmaExtensions = buildFigmaExtensions(options);

  // Only add extensions if there's something to include
  if (Object.keys(figmaExtensions).length > 0) {
    tokenObj[keys.extensionsKey] = { 'com.figma': figmaExtensions };
  }

  return tokenObj;
}

/**
 * Builds the com.figma extensions object based on configuration.
 *
 * @param options - The token build options
 * @returns The figma extensions object (may be empty)
 */
export function buildFigmaExtensions(
  options: Pick<TokenBuildOptions, 'includeVariableId' | 'extensions' | 'entry'>
): Record<string, any> {
  const { includeVariableId, extensions, entry } = options;
  const figmaExtensions: Record<string, any> = {};

  if (includeVariableId && entry.variableId) {
    figmaExtensions.variableId = entry.variableId;
  }

  if (extensions.scopes && entry.scopes && entry.scopes.length > 0) {
    figmaExtensions.scopes = entry.scopes;
  }

  if (extensions.codeSyntax && entry.codeSyntax && Object.keys(entry.codeSyntax).length > 0) {
    figmaExtensions.codeSyntax = entry.codeSyntax;
  }

  return figmaExtensions;
}
