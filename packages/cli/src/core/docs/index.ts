import { BaselineData, BaselineEntry } from '../../types/index.js';
import { Config } from '../config.js';
import { generateTokensCSS, generateUtilitiesCSS, generateDocsCSS } from './css-generator.js';
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
}

/**
 * Parse baseline data into categorized tokens
 */
export function parseTokens(baseline: BaselineData): {
  colors: ParsedToken[];
  typography: ParsedToken[];
  spacing: ParsedToken[];
  other: ParsedToken[];
  all: ParsedToken[];
  collections: Map<string, ParsedToken[]>;
  modes: Map<string, ParsedToken[]>;
} {
  const colors: ParsedToken[] = [];
  const typography: ParsedToken[] = [];
  const spacing: ParsedToken[] = [];
  const other: ParsedToken[] = [];
  const all: ParsedToken[] = [];
  const collections = new Map<string, ParsedToken[]>();
  const modes = new Map<string, ParsedToken[]>();

  for (const [key, entry] of Object.entries(baseline.baseline)) {
    const parsed = parseToken(entry);
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
function parseToken(entry: BaselineEntry): ParsedToken {
  // Generate CSS variable name from path
  const cssVariable = `--${entry.path.replace(/\./g, '-').toLowerCase()}`;
  
  return {
    path: entry.path,
    value: entry.value,
    type: entry.type,
    collection: entry.collection || entry.path.split('.')[0],
    mode: entry.mode || 'default',
    cssVariable,
    description: entry.description,
  };
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
