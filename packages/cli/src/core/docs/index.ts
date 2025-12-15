import { BaselineData, BaselineEntry } from '../../types/index.js';
import { Config } from '../config.js';
import { generateTokensCSS, generateUtilitiesCSS } from '../css/index.js';
import { generateDocsCSS } from './css-generator.js';
import { generateIndexHTML, generateCollectionPage, generateAllTokensPage } from './html-generator.js';
import { generatePreviewJS } from './js-generator.js';

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
 * Parse baseline data into categorized tokens
 */
export function parseTokens(baseline: BaselineData): ParsedTokens {
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
    const parsed = parseToken(entry, variableIdLookup);
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
  variableIdLookup: Map<string, { path: string; value: any }>
): ParsedToken {
  // Generate CSS variable name from path
  const cssVariable = `--${entry.path.replace(/\./g, '-').toLowerCase()}`;
  
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
  const tokens = parseTokens(baseline);
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
