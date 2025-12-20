import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BaselineData, BaselineEntry } from '../../types/index.js';
import { Config, DocsPlatform } from '../config.js';
import { generateTokensCSS, generateUtilitiesCSS } from '../css/index.js';
import { generateDocsCSS } from './css-generator.js';
import { generateIndexHTML, generateCollectionPage, generateAllTokensPage } from './html-generator.js';
import { generatePreviewJS } from './js-generator.js';
import { mapToDTCGType } from '../tokens.js';
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
 * Format a token path for a custom platform definition
 */
function formatForCustomPlatform(parts: string[], platform: DocsPlatform): string {
  const prefix = platform.prefix ?? '';
  const suffix = platform.suffix ?? '';

  // Apply case transformation
  let formattedParts: string[];
  const caseType = platform.case ?? 'kebab';

  switch (caseType) {
    case 'camel':
      formattedParts = parts.map((part, i) =>
        i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      );
      break;
    case 'pascal':
      formattedParts = parts.map(part =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      );
      break;
    case 'snake':
      formattedParts = parts.map(part => part.toLowerCase());
      break;
    case 'constant':
      formattedParts = parts.map(part => part.toUpperCase());
      break;
    case 'kebab':
    default:
      formattedParts = parts.map(part => part.toLowerCase());
  }

  // Determine separator based on case or custom separator
  let separator: string;
  if (platform.separator === undefined) {
    switch (caseType) {
      case 'camel':
      case 'pascal':
        separator = '';
        break;
      case 'snake':
      case 'constant':
        separator = '_';
        break;
      case 'kebab':
      default:
        separator = '-';
    }
  } else {
    separator = platform.separator;
  }

  return `${prefix}${formattedParts.join(separator)}${suffix}`;
}

/**
 * Generate platform-specific variable names.
 *
 * Priority:
 * 1. Custom platforms from config.docsPages.platforms (if provided)
 * 2. Defaults: JSON path + CSS variable (if CSS enabled)
 */
function generatePlatformVariableNames(
  tokenPath: string,
  customPlatforms?: DocsPlatform[],
  cssEnabled?: boolean
): Record<string, string> {
  const result: Record<string, string> = {};
  const parts = tokenPath.split('.');

  // Always include JSON nested path format
  const formattedParts = parts.map(part => {
    if (/^\d/.test(part) || /\W/.test(part)) {
      return `["${part}"]`;
    }
    return part;
  });
  result['json'] = formattedParts.join('.').replaceAll('.[', '[');

  // If custom platforms are defined, use them
  if (customPlatforms && customPlatforms.length > 0) {
    for (const platform of customPlatforms) {
      const key = platform.name.toLowerCase();
      result[key] = formatForCustomPlatform(parts, platform);
    }
    return result;
  }

  // Include CSS variable if CSS output is enabled
  if (cssEnabled) {
    result['css'] = `--${parts.join('-').toLowerCase()}`;
  }

  return result;
}

/**
 * Options for parsing tokens
 */
interface ParseTokensOptions {
  variableNaming?: { prefix: string; separator: string };
  customPlatforms?: DocsPlatform[];
  cssEnabled?: boolean;
}

/**
 * Parse baseline data into categorized tokens
 */
export async function parseTokens(
  baseline: BaselineData,
  options: ParseTokensOptions = {}
): Promise<ParsedTokens> {
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

  for (const entry of Object.values(baseline.baseline)) {
    const parsed = await parseToken(entry, variableIdLookup, options);
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
async function parseToken(
  entry: BaselineEntry,
  variableIdLookup: Map<string, { path: string; value: any }>,
  options: ParseTokensOptions = {}
): Promise<ParsedToken> {
  // Generate CSS variable name from path using metadata or defaults
  const prefix = options.variableNaming?.prefix || '--';
  const separator = options.variableNaming?.separator || '-';
  const cssVariable = `${prefix}${entry.path.replaceAll('.', separator).toLowerCase()}`;

  // Generate platform-specific variable names
  const platformVariables = generatePlatformVariableNames(
    entry.path,
    options.customPlatforms,
    options.cssEnabled
  );

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

  // Convert Figma type to DTCG type using shared mapping
  const dtcgType = mapToDTCGType(entry.type, entry.path);

  return {
    path: entry.path,
    value: entry.value,
    type: dtcgType,
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

  // Determine if CSS output is enabled using new config structure: build.css
  const cssEnabled = intermediateFormat?.$metadata?.output?.css?.enabled || options.config.build?.css?.enabled;

  // Get custom platforms from config
  const customPlatforms = options.config.docsPages?.platforms;

  const tokens = await parseTokens(baseline, {
    variableNaming: intermediateFormat?.$metadata?.variableNaming,
    customPlatforms,
    cssEnabled,
  });
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

  files['all-tokens.html'] = generateAllTokensPage(tokens.all, templateOptions, tokens.collections);

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
 * Uses new config structure: tokens.dir
 */
async function tryLoadIntermediateFormat(config: Config): Promise<IntermediateTokenFormat | null> {
  try {
    const tokensPath = join(process.cwd(), config.tokens.dir, '.tokens-source.json');
    const content = await readFile(tokensPath, 'utf-8');
    const data = JSON.parse(content);

    // Check if it has the new metadata structure
    if (data.$metadata) {
      return data as IntermediateTokenFormat;
    }

    return null;
  } catch {
    // File doesn't exist or couldn't be read - that's fine, use baseline
    return null;
  }
}
