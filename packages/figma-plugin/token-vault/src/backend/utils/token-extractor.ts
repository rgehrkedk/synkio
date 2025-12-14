/**
 * Token extractor utility
 *
 * Extracts tokens from JSON data based on level configuration.
 * Walks the JSON tree according to level roles and assembles token paths.
 */

import type { LevelConfiguration } from '../../types/level-config.types.js';

/**
 * Extracted token with collection, mode, and path information
 */
export interface ExtractedToken {
  collection: string;
  mode: string;
  path: string;
  value: any;
  type: string;
}

/**
 * Grouped tokens organized by collection and mode
 */
export interface ExtractedTokens {
  tokens: ExtractedToken[];
  collections: Map<string, CollectionTokens>;
}

/**
 * Tokens organized by collection
 */
export interface CollectionTokens {
  name: string;
  modes: Map<string, ModeTokens>;
}

/**
 * Tokens organized by mode
 */
export interface ModeTokens {
  name: string;
  tokens: Map<string, any>; // path → value
}

/**
 * Extract tokens from JSON data based on level configuration
 *
 * Walks the JSON tree according to the level roles:
 * - Collection levels: Create separate collections
 * - Mode levels: Create separate modes within collections
 * - Token Path levels: Build token path hierarchy
 *
 * @param data - JSON data to extract from
 * @param levels - Level configuration defining roles
 * @returns Extracted tokens grouped by collection and mode
 */
export function extractTokensByLevels(
  data: unknown,
  levels: LevelConfiguration[]
): ExtractedTokens {
  const tokens: ExtractedToken[] = [];
  const collections = new Map<string, CollectionTokens>();

  // Sort levels by depth to ensure correct traversal order
  const sortedLevels = [...levels].sort((a, b) => a.depth - b.depth);

  // Walk the JSON tree
  walkTree(data, sortedLevels, 1, {}, (token) => {
    const collection = token.collection || 'Tokens';
    const mode = token.mode || 'Mode 1';
    const path = token.path || token.name || 'value';

    // Add to tokens array
    tokens.push({
      collection,
      mode,
      path,
      value: token.value,
      type: inferTokenType(token.value)
    });

    // Organize by collection and mode
    if (!collections.has(collection)) {
      collections.set(collection, {
        name: collection,
        modes: new Map()
      });
    }

    const collectionData = collections.get(collection)!;

    if (!collectionData.modes.has(mode)) {
      collectionData.modes.set(mode, {
        name: mode,
        tokens: new Map()
      });
    }

    const modeData = collectionData.modes.get(mode)!;
    modeData.tokens.set(path, token.value);
  });

  return { tokens, collections };
}

/**
 * Context accumulated while walking the tree
 */
interface WalkContext {
  collection?: string;
  mode?: string;
  path?: string;
  name?: string;
  pathSegments?: string[];
}

/**
 * Token with value
 */
interface TokenResult extends WalkContext {
  value: any;
}

/**
 * Walk the JSON tree according to level configuration
 */
function walkTree(
  obj: any,
  levels: LevelConfiguration[],
  currentDepth: number,
  context: WalkContext,
  onToken: (token: TokenResult) => void
): void {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return;
  }

  // Find current level configuration
  const currentLevel = levels.find(l => l.depth === currentDepth);

  // If no level config for this depth, we might have reached token values
  if (!currentLevel) {
    // If this is a token value, emit it
    if (isTokenValue(obj)) {
      onToken({
        ...context,
        value: obj
      });
    }
    return;
  }

  // Handle token values (leaf nodes) - emit immediately
  if (isTokenValue(obj)) {
    onToken({
      ...context,
      value: obj
    });
    return;
  }

  // Handle objects - recurse based on level role
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const newContext = { ...context };

      switch (currentLevel.role) {
        case 'collection':
          newContext.collection = key;
          newContext.pathSegments = [];
          break;

        case 'mode':
          newContext.mode = key;
          newContext.pathSegments = context.pathSegments || [];
          break;

        case 'token-path':
          const segments = context.pathSegments || [];
          newContext.pathSegments = [...segments, key];
          newContext.path = newContext.pathSegments.join('/');
          newContext.name = key;
          break;
      }

      // Recurse to next level
      walkTree(value, levels, currentDepth + 1, newContext, onToken);
    }
  }
}

/**
 * Check if value is a token (leaf node)
 *
 * A value is considered a token if it's:
 * - A primitive (string, number, boolean)
 * - An object with $value or value property (Design Tokens format)
 */
function isTokenValue(obj: any): boolean {
  // Primitives are tokens
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return true;
  }

  // Objects with $value or value are tokens (Design Tokens format)
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return '$value' in obj || 'value' in obj;
  }

  return false;
}

/**
 * Infer token type from value
 *
 * Attempts to determine the token type based on the value format.
 * Used for Figma variable type mapping.
 */
function inferTokenType(value: any): string {
  // Handle Design Tokens format with explicit type
  if (value && typeof value === 'object') {
    if ('$type' in value) {
      return value.$type;
    }
    if ('type' in value) {
      return value.type;
    }
    // Extract value from DTCG format
    if ('$value' in value) {
      value = value.$value;
    } else if ('value' in value) {
      value = value.value;
    }
  }

  // Infer from value format
  if (typeof value === 'string') {
    // Hex color
    if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value)) {
      return 'color';
    }
    // RGB/RGBA
    if (/^rgba?\(/.test(value)) {
      return 'color';
    }
    // Dimension with units
    if (/^\d+(\.\d+)?(px|rem|em|pt)$/.test(value)) {
      return 'dimension';
    }
    // Default to string
    return 'string';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  return 'string';
}
