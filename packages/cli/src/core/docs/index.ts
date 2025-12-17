import { readFile } from 'fs/promises';
import { join } from 'path';
import { BaselineData, BaselineEntry } from '../../types/index.js';
import { Config } from '../config.js';
import { generateTokensCSS, generateUtilitiesCSS } from '../css/index.js';
import { generateDocsCSS } from './css-generator.js';
import { generateIndexHTML, generateCollectionPage, generateAllTokensPage } from './html-generator.js';
import { generatePreviewJS } from './js-generator.js';
import type { IntermediateTokenFormat } from '../intermediate-tokens.js';

export interface DocsGeneratorOptions {
  outputDir: string;
  title: string;
  config: Config;
}

export interface DocsResult {
  files: Record<string, string>;
}

export interface TokenCategory {
  name: string;
  tokens: ParsedToken[];
}

export interface ParsedToken {
  path: string;
  value: any;
  type: string;
  collection: string;
  mode: string;
  cssVariable: string;
  description?: string;
  /** If this token is a reference, this is the path it references */
  referencePath?: string;
  /** If this token is a reference, this is the resolved value */
  resolvedValue?: any;
  /** Platform-specific variable names (generated per Style Dictionary conventions) */
  platformVariables?: Record<string, string>;
}

/**
 * Result of parsing tokens from baseline
 */
export interface ParsedTokens {
  colors: ParsedToken[];
  typography: ParsedToken[];
  spacing: ParsedToken[];
  other: ParsedToken[];
  all: ParsedToken[];
  collections: Map<string, ParsedToken[]>;
  modes: Map<string, ParsedToken[]>;
}

/**
 * Generate platform-specific variable names based on Style Dictionary's transform conventions
 * See: https://amzn.github.io/style-dictionary/#/transforms?id=pre-defined-transforms
 */
function generatePlatformVariableNames(tokenPath: string, platforms?: string[]): Record<string, string> {
  if (!platforms || platforms.length === 0) {
    return {};
  }

  const result: Record<string, string> = {};
  const parts = tokenPath.split('.');

  for (const platform of platforms) {
    switch (platform.toLowerCase()) {
      // iOS Swift uses camelCase (name/camel transform)
      case 'ios-swift':
      case 'ios':
      case 'swift':
        result[platform] = parts.map((part, i) =>
          i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('');
        break;

      // Android uses snake_case (name/snake transform)
      case 'android':
        result[platform] = parts.join('_').toLowerCase();
        break;

      // Compose uses camelCase (name/camel transform)
      case 'compose':
        result[platform] = parts.map((part, i) =>
          i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('');
        break;

      // Flutter/Dart uses camelCase (name/camel transform)
      case 'flutter':
      case 'dart':
        result[platform] = parts.map((part, i) =>
          i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('');
        break;

      // CSS/SCSS/JS use kebab-case with prefix (name/kebab transform)
      case 'css':
      case 'scss':
      case 'sass':
        result[platform] = `--${parts.join('-').toLowerCase()}`;
        break;

      // JavaScript uses PascalCase (name/pascal transform in SD)
      case 'js':
      case 'javascript':
        result[platform] = parts.map(part =>
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('');
        break;

      // TypeScript uses PascalCase (same as JS)
      case 'ts':
      case 'typescript':
        result[platform] = parts.map(part =>
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('');
        break;

      // JSON uses nested path with dot notation
      // e.g., color.primary["50"] or color.primary.50
      case 'json':
        // Use bracket notation for parts that start with numbers or have special chars
        const formattedParts = parts.map(part => {
          // If part starts with a number or contains special chars, use bracket notation
          if (/^\d/.test(part) || /[^a-zA-Z0-9_]/.test(part)) {
            return `["${part}"]`;
          }
          return part;
        });
        // Join with dots, but brackets are already included where needed
        result[platform] = formattedParts.join('.').replace(/\.\[/g, '[');
        break;

      default:
        // Default to kebab-case
        result[platform] = `--${parts.join('-').toLowerCase()}`;
    }
  }

  return result;
}

/**
 * Parse baseline data into categorized tokens
 */
export function parseTokens(
  baseline: BaselineData,
  variableNaming?: { prefix: string; separator: string },
  platforms?: string[]
): ParsedTokens {
  const colors: ParsedToken[] = [];
  const typography: ParsedToken[] = [];
  const spacing: ParsedToken[] = [];
  const other: ParsedToken[] = [];
  const all: ParsedToken[] = [];
  const collections = new Map<string, ParsedToken[]>();
  const modes = new Map<string, ParsedToken[]>();

  // Build lookup map from VariableID to path and value for resolving references
  const variableIdLookup = new Map<string, { path: string; value: any }>();
  for (const entry of Object.values(baseline.baseline)) {
    if (entry.variableId && entry.path) {
      variableIdLookup.set(entry.variableId, { path: entry.path, value: entry.value });
    }
  }

  for (const [key, entry] of Object.entries(baseline.baseline)) {
    const parsed = parseToken(entry, variableIdLookup, variableNaming, platforms);
    all.push(parsed);

    // Group by collection
    if (!collections.has(parsed.collection)) {
      collections.set(parsed.collection, []);
    }
    collections.get(parsed.collection)!.push(parsed);

    // Group by mode
    if (!modes.has(parsed.mode)) {
      modes.set(parsed.mode, []);
    }
    modes.get(parsed.mode)!.push(parsed);

    // Categorize by type
    switch (parsed.type.toLowerCase()) {
      case 'color':
        colors.push(parsed);
        break;
      case 'fontfamily':
      case 'fontweight':
      case 'fontsize':
      case 'lineheight':
      case 'letterspacing':
      case 'typography':
        typography.push(parsed);
        break;
      case 'dimension':
      case 'spacing':
      case 'size':
      case 'number':
        // Check if path suggests spacing
        if (parsed.path.toLowerCase().includes('spacing') || 
            parsed.path.toLowerCase().includes('space') ||
            parsed.path.toLowerCase().includes('gap') ||
            parsed.path.toLowerCase().includes('padding') ||
            parsed.path.toLowerCase().includes('margin')) {
          spacing.push(parsed);
        } else {
          other.push(parsed);
        }
        break;
      default:
        other.push(parsed);
    }
  }

  return { colors, typography, spacing, other, all, collections, modes };
}

/**
 * Parse a single token entry
 */
function parseToken(
  entry: BaselineEntry,
  variableIdLookup: Map<string, { path: string; value: any }>,
  variableNaming?: { prefix: string; separator: string },
  platforms?: string[]
): ParsedToken {
  // Generate CSS variable name from path using metadata or defaults
  const prefix = variableNaming?.prefix || '--';
  const separator = variableNaming?.separator || '-';
  const cssVariable = `${prefix}${entry.path.replace(/\./g, separator).toLowerCase()}`;

  // Generate platform-specific variable names
  const platformVariables = generatePlatformVariableNames(entry.path, platforms);

  // Check if value is a reference
  let referencePath: string | undefined;
  let resolvedValue: any;

  if (entry.value && typeof entry.value === 'object' && '$ref' in entry.value) {
    const refVariableId = entry.value.$ref;
    const refData = variableIdLookup.get(refVariableId);
    if (refData) {
      referencePath = refData.path;
      // Recursively resolve nested references to get the final value
      resolvedValue = resolveValue(refData.value, variableIdLookup);
    }
  }

  return {
    path: entry.path,
    value: entry.value,
    type: entry.type,
    collection: entry.collection || entry.path.split('.')[0],
    mode: entry.mode || 'default',
    cssVariable,
    description: entry.description,
    referencePath,
    resolvedValue,
    platformVariables,
  };
}

/**
 * Recursively resolve a value that may contain references
 */
function resolveValue(
  value: any,
  variableIdLookup: Map<string, { path: string; value: any }>
): any {
  if (value && typeof value === 'object' && '$ref' in value) {
    const refData = variableIdLookup.get(value.$ref);
    if (refData) {
      return resolveValue(refData.value, variableIdLookup);
    }
  }
  return value;
}

/**
 * Main documentation generator
 */
export async function generateDocs(
  baseline: BaselineData,
  options: DocsGeneratorOptions
): Promise<DocsResult> {
  // Try to load intermediate format for enhanced metadata
  const intermediateFormat = await tryLoadIntermediateFormat(options.config);

  const tokens = parseTokens(
    baseline,
    intermediateFormat?.$metadata?.variableNaming,
    intermediateFormat?.$metadata?.output?.styleDictionary?.platforms
  );
  const files: Record<string, string> = {};

  // Get unique modes for mode switcher
  const modeNames = Array.from(tokens.modes.keys());
  const defaultMode = modeNames[0] || 'default';
  
  // Generate CSS files
  files['assets/tokens.css'] = generateTokensCSS(tokens.all, modeNames);
  files['assets/utilities.css'] = generateUtilitiesCSS(tokens.all);
  files['assets/docs.css'] = generateDocsCSS();
  
  // Generate JS
  files['assets/preview.js'] = generatePreviewJS();
  
  // Build navigation items from collections
  const navItems = Array.from(tokens.collections.entries()).map(([name, collTokens]) => ({
    id: name.toLowerCase(),
    label: capitalizeFirst(name),
    href: `${name.toLowerCase()}.html`,
    count: collTokens.length,
  }));
  
  // Generate HTML pages
  const templateOptions = {
    title: options.title,
    modes: modeNames,
    defaultMode,
    syncedAt: baseline.metadata.syncedAt,
    navItems,
    metadata: intermediateFormat?.$metadata, // Pass metadata if available
  };
  
  files['index.html'] = generateIndexHTML(tokens, templateOptions);
  
  // Generate a page for each collection
  for (const [collectionName, collectionTokens] of tokens.collections) {
    const fileName = `${collectionName.toLowerCase()}.html`;
    files[fileName] = generateCollectionPage(collectionName, collectionTokens, templateOptions);
  }
  
  files['all-tokens.html'] = generateAllTokensPage(tokens.all, templateOptions);
  
  // Copy of tokens.json for reference
  files['tokens.json'] = JSON.stringify(baseline, null, 2);
  
  return { files };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Try to load intermediate token format if it exists
 * Returns null if not found (falls back to baseline-only mode)
 */
async function tryLoadIntermediateFormat(config: Config): Promise<IntermediateTokenFormat | null> {
  try {
    const tokensPath = join(process.cwd(), config.output.dir, '.tokens-source.json');
    const content = await readFile(tokensPath, 'utf-8');
    const data = JSON.parse(content);

    // Check if it has the new metadata structure
    if (data.$metadata) {
      return data as IntermediateTokenFormat;
    }

    return null;
  } catch (error) {
    // File doesn't exist or couldn't be read - that's fine, use baseline
    return null;
  }
}
