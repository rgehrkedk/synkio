import { readFile } from 'fs/promises';
import { join } from 'path';
import { BaselineData, BaselineEntry } from '../../types/index.js';
import { Config } from '../config.js';
import { generateTokensCSS, generateUtilitiesCSS } from '../css/index.js';
import { generateDocsCSS } from './css-generator.js';
import { generateIndexHTML, generateCollectionPage, generateAllTokensPage } from './html-generator.js';
import { generatePreviewJS } from './js-generator.js';
import { mapToDTCGType } from '../tokens.js';
import { applySDNameTransform } from '../sd-hooks.js';
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

/** Platform info from intermediate format metadata */
type PlatformInfo = NonNullable<IntermediateTokenFormat['$metadata']['output']['styleDictionary']>['platforms'];

/**
 * Generate platform-specific variable names using SD's actual transform functions.
 *
 * When SD is configured: Uses SD's native name/* transforms
 * When SD is not configured: Only shows JSON nested path and CSS variable (if CSS enabled)
 */
async function generatePlatformVariableNames(
  tokenPath: string,
  platforms?: PlatformInfo,
  cssEnabled?: boolean
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const parts = tokenPath.split('.');

  // Always include JSON nested path format
  const formattedParts = parts.map(part => {
    if (/^\d/.test(part) || /[^a-zA-Z0-9_]/.test(part)) {
      return `["${part}"]`;
    }
    return part;
  });
  result['json'] = formattedParts.join('.').replace(/\.\[/g, '[');

  // Include CSS variable if CSS output is enabled
  if (cssEnabled) {
    result['css'] = `--${parts.join('-').toLowerCase()}`;
  }

  // If no SD platforms configured, return just JSON (and optionally CSS)
  if (!platforms) {
    return result;
  }

  // Generate variable names for each SD platform using SD's actual transforms
  // Skip 'json' since we always want to show the nested path format for JSON access
  for (const [platformName, platformConfig] of Object.entries(platforms)) {
    if (platformName === 'json') {
      continue; // Don't override our JSON nested path format
    }
    if (platformConfig.nameTransform) {
      const transformed = await applySDNameTransform(tokenPath, platformConfig.nameTransform);
      if (transformed) {
        result[platformName] = transformed;
      }
    }
  }

  return result;
}

/**
 * Parse baseline data into categorized tokens
 */
export async function parseTokens(
  baseline: BaselineData,
  variableNaming?: { prefix: string; separator: string },
  platforms?: PlatformInfo,
  cssEnabled?: boolean
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

  for (const [key, entry] of Object.entries(baseline.baseline)) {
    const parsed = await parseToken(entry, variableIdLookup, variableNaming, platforms, cssEnabled);
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
  variableNaming?: { prefix: string; separator: string },
  platforms?: PlatformInfo,
  cssEnabled?: boolean
): Promise<ParsedToken> {
  // Generate CSS variable name from path using metadata or defaults
  const prefix = variableNaming?.prefix || '--';
  const separator = variableNaming?.separator || '-';
  const cssVariable = `${prefix}${entry.path.replace(/\./g, separator).toLowerCase()}`;

  // Generate platform-specific variable names
  const platformVariables = await generatePlatformVariableNames(entry.path, platforms, cssEnabled);

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

  // Determine if CSS output is enabled
  const cssEnabled = intermediateFormat?.$metadata?.output?.css?.enabled || options.config.css?.enabled;

  const tokens = await parseTokens(
    baseline,
    intermediateFormat?.$metadata?.variableNaming,
    intermediateFormat?.$metadata?.output?.styleDictionary?.platforms,
    cssEnabled
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
