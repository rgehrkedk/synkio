// =============================================================================
// Baseline Building Operations
// =============================================================================

import { TokenEntry, StyleEntry, BaselineData, BaselineEntry, StyleBaselineEntry } from '../lib/types';

/**
 * Builds a baseline data structure from tokens and styles.
 *
 * @param tokens - Array of token entries from Figma variables
 * @param styles - Array of style entries from Figma styles
 * @returns BaselineData structure with tokens, styles, and metadata
 */
export function buildBaseline(tokens: TokenEntry[], styles: StyleEntry[]): BaselineData {
  const baseline: Record<string, BaselineEntry> = {};

  for (const token of tokens) {
    // Key format: variableId:collection.mode
    const key = token.variableId
      ? `${token.variableId}:${token.collection}.${token.mode}`
      : `${token.path}:${token.collection}.${token.mode}`;

    baseline[key] = {
      path: token.path,
      value: token.value,
      type: token.type,
      collection: token.collection,
      mode: token.mode,
      variableId: token.variableId,
      collectionId: token.collectionId,
      modeId: token.modeId,
      description: token.description,
      scopes: token.scopes,
      codeSyntax: token.codeSyntax,
    };
  }

  // Build styles baseline
  const stylesBaseline: Record<string, StyleBaselineEntry> = {};

  for (const style of styles) {
    // Key format: styleId
    const key = style.styleId;

    stylesBaseline[key] = {
      styleId: style.styleId,
      type: style.type,
      path: style.path,
      value: style.value,
      description: style.description,
    };
  }

  return {
    baseline,
    styles: Object.keys(stylesBaseline).length > 0 ? stylesBaseline : undefined,
    metadata: {
      syncedAt: new Date().toISOString(),
    },
  };
}
