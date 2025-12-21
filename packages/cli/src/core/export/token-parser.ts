/**
 * Token Parser Module
 *
 * Parses DTCG-format token files into flat token entries.
 * Handles both single-mode and multi-mode file structures.
 */

import { readFile } from 'node:fs/promises';

/**
 * Represents a parsed token with metadata
 */
export interface ParsedToken {
  /** Token path (dot-separated) */
  path: string;
  /** Token value (any type) */
  value: unknown;
  /** DTCG token type (color, dimension, etc.) */
  type: string;
  /** Figma variable ID (if preserved from sync) */
  variableId?: string;
  /** Token description */
  description?: string;
  /** Figma scopes (if preserved from sync) */
  scopes?: string[];
}

/**
 * Result of parsing a token file
 */
export interface ParseResult {
  /** Extracted tokens */
  tokens: ParsedToken[];
  /** Parse errors (non-fatal) */
  errors: string[];
}

/**
 * Parse a DTCG token file into flat token entries
 *
 * @param filePath - Absolute path to token file
 * @returns Parsed tokens and errors
 *
 * @example
 * ```typescript
 * const result = await parseTokenFile('/path/to/theme.light.json');
 * // result.tokens: [
 * //   { path: 'colors.primary', value: '#0066cc', type: 'color', ... },
 * //   { path: 'spacing.base', value: '8px', type: 'dimension', ... }
 * // ]
 * ```
 */
export async function parseTokenFile(filePath: string): Promise<ParseResult> {
  const content = await readFile(filePath, 'utf-8');
  const json = JSON.parse(content);

  const tokens: ParsedToken[] = [];
  const errors: string[] = [];

  traverseTokens(json, [], tokens, errors);

  return { tokens, errors };
}

/**
 * Recursively traverse token tree and extract tokens
 *
 * @param node - Current node in token tree
 * @param path - Current path segments
 * @param tokens - Accumulator for tokens
 * @param errors - Accumulator for errors
 */
function traverseTokens(
  node: unknown,
  path: string[],
  tokens: ParsedToken[],
  errors: string[]
): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  const obj = node as Record<string, unknown>;

  // Check if this is a token (has $value and $type)
  if ('$value' in obj && '$type' in obj) {
    const token: ParsedToken = {
      path: path.join('.'),
      value: obj.$value,
      type: obj.$type as string,
    };

    // Extract optional fields from $extensions
    if (obj.$extensions && typeof obj.$extensions === 'object') {
      const ext = obj.$extensions as Record<string, unknown>;

      if (ext['com.figma'] && typeof ext['com.figma'] === 'object') {
        const figma = ext['com.figma'] as Record<string, unknown>;

        if (figma.variableId) {
          token.variableId = figma.variableId as string;
        }
        if (figma.scopes && Array.isArray(figma.scopes)) {
          token.scopes = figma.scopes as string[];
        }
      }
    }

    if (obj.$description && typeof obj.$description === 'string') {
      token.description = obj.$description;
    }

    tokens.push(token);
    return;
  }

  // Not a token - recurse into children
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) {
      continue;
    }

    traverseTokens(value, [...path, key], tokens, errors);
  }
}

/**
 * Handle includeMode: true structure where modes are top-level keys
 *
 * @param json - Parsed JSON content
 * @returns Map of mode name to tokens
 *
 * @example
 * ```typescript
 * const json = {
 *   light: { colors: { primary: { $value: '#fff', $type: 'color' } } },
 *   dark: { colors: { primary: { $value: '#000', $type: 'color' } } }
 * };
 *
 * const modes = parseMultiModeFile(json);
 * // modes.get('light'): [{ path: 'colors.primary', value: '#fff', ... }]
 * // modes.get('dark'): [{ path: 'colors.primary', value: '#000', ... }]
 * ```
 */
export function parseMultiModeFile(
  json: Record<string, unknown>
): Map<string, ParsedToken[]> {
  const result = new Map<string, ParsedToken[]>();

  for (const [key, value] of Object.entries(json)) {
    if (key.startsWith('$') || (typeof value === 'object' && value && '$value' in value)) {
      continue;
    }

    const tokens: ParsedToken[] = [];
    const errors: string[] = [];
    traverseTokens(value, [], tokens, errors);

    if (tokens.length > 0) {
      result.set(key, tokens);
    }
  }

  return result;
}
