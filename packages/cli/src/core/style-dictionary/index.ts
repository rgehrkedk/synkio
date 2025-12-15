/**
 * Style Dictionary Integration
 * 
 * This module provides optional integration with Style Dictionary for
 * generating platform-specific token outputs (CSS, SCSS, JS, etc.).
 * 
 * Style Dictionary is an optional peer dependency - users only need to
 * install it if they want to use this output mode.
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { BaselineData, BaselineEntry } from '../../types/index.js';
import { mapToDTCGType } from '../tokens.js';

// Type definitions for Style Dictionary (to avoid requiring the package at parse time)
interface SDFile {
  destination: string;
  format: string;
  filter?: unknown;
  options?: Record<string, unknown>;
}

interface SDPlatformConfig {
  transformGroup?: string;
  transforms?: string[];
  buildPath: string;
  prefix?: string;
  files: SDFile[];
  options?: Record<string, unknown>;
}

interface SDConfig {
  source: string[];
  platforms: Record<string, SDPlatformConfig>;
  log?: { verbosity: string };
}

/** Inline Style Dictionary file config */
export interface SDFileConfig {
  destination: string;
  format: string;
  filter?: unknown;
  options?: Record<string, unknown>;
}

/** Inline Style Dictionary platform config */
export interface SDInlinePlatformConfig {
  transformGroup?: string;
  transforms?: string[];
  buildPath?: string;
  prefix?: string;
  files: SDFileConfig[];
}

export interface StyleDictionaryBuildOptions {
  /** Output directory for generated files */
  outputDir: string;
  /** Path to external Style Dictionary config file */
  configFile?: string;
  /** Inline Style Dictionary config - passed directly to SD */
  inlineConfig?: {
    transformGroup?: string;
    transforms?: string[];
    buildPath?: string;
    files?: SDFileConfig[];
    platforms?: Record<string, SDInlinePlatformConfig>;
  };
  /** Additional Style Dictionary options */
  options?: {
    /** Whether to output references (var(--token)) instead of resolved values */
    outputReferences?: boolean;
    /** Prefix for all token names */
    prefix?: string;
  };
}

export interface StyleDictionaryBuildResult {
  /** List of generated files */
  files: string[];
  /** Output directory */
  outputDir: string;
  /** Whether Style Dictionary was used (vs fallback) */
  usedStyleDictionary: boolean;
}

/**
 * Dynamically import Style Dictionary
 * Returns null if not installed (optional peer dependency)
 */
async function loadStyleDictionary(): Promise<any | null> {
  try {
    const sd = await import('style-dictionary');
    return sd.default || sd;
  } catch (error) {
    return null;
  }
}

/**
 * Convert Synkio baseline data to DTCG-compliant token format
 * This is the format Style Dictionary expects
 */
export function convertToDTCG(baseline: BaselineData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  // Build lookup map from VariableID to path for resolving references
  const variableIdToPath = new Map<string, string>();
  for (const entry of Object.values(baseline.baseline)) {
    if (entry.variableId && entry.path) {
      variableIdToPath.set(entry.variableId, entry.path);
    }
  }
  
  for (const [key, entry] of Object.entries(baseline.baseline)) {
    const pathParts = entry.path.split('.');
    let current = result;
    
    // Navigate/create nested structure
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    
    // Set the token value using DTCG format
    const tokenName = pathParts[pathParts.length - 1];
    
    // Resolve references to DTCG format: { "$ref": "VariableID:1:38" } → "{path.to.token}"
    let resolvedValue: unknown;
    if (entry.value && typeof entry.value === 'object' && '$ref' in entry.value) {
      const refVariableId = (entry.value as { $ref: string }).$ref;
      const refPath = variableIdToPath.get(refVariableId);
      if (refPath) {
        // DTCG reference format: string wrapped in curly braces
        resolvedValue = `{${refPath}}`;
      } else {
        console.warn(`Warning: Could not resolve reference ${refVariableId} for token ${entry.path}`);
        resolvedValue = entry.value;
      }
    } else {
      // Pass raw values - let Style Dictionary handle transforms
      resolvedValue = normalizeColorValue(entry.value, entry.type);
    }
    
    current[tokenName] = {
      $value: resolvedValue,
      // Use shared mapping logic to infer correct DTCG type (e.g. float -> dimension)
      $type: mapToDTCGType(entry.type, entry.path),
      ...(entry.description && { $description: entry.description }),
    };
  }
  
  return result;
}

/**
 * Only normalize Figma color objects to hex/rgba format
 * All other transforms are left to Style Dictionary
 */
function normalizeColorValue(value: unknown, type: string): unknown {
  // Handle Figma color objects { r, g, b, a } - must convert to string format
  if (type.toLowerCase() === 'color' && typeof value === 'object' && value !== null) {
    const v = value as { r?: number; g?: number; b?: number; a?: number };
    if ('r' in v && 'g' in v && 'b' in v) {
      const r = Math.round((v.r ?? 0) * 255);
      const g = Math.round((v.g ?? 0) * 255);
      const b = Math.round((v.b ?? 0) * 255);
      const a = v.a ?? 1;
      
      if (a === 1) {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }
  
  // Return raw value - no transforms
  return value;
}

/**
 * Build tokens using Style Dictionary
 * 
 * Priority for config:
 * 1. configFile (external SD config file)
 * 2. inlineConfig.platforms (full inline SD config)
 * 3. inlineConfig with single platform (transformGroup, files, etc.)
 * 
 * @param baseline - Synkio baseline data
 * @param options - Build options
 * @returns Build result with list of generated files
 */
export async function buildWithStyleDictionary(
  baseline: BaselineData,
  options: StyleDictionaryBuildOptions
): Promise<StyleDictionaryBuildResult> {
  const { outputDir, configFile, inlineConfig } = options;
  
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });
  
  // Write DTCG tokens as Style Dictionary source
  const tokensPath = join(outputDir, '.tokens-source.json');
  const dtcgTokens = convertToDTCG(baseline);
  await writeFile(tokensPath, JSON.stringify(dtcgTokens, null, 2), 'utf-8');
  
  // Try to load Style Dictionary
  const StyleDictionary = await loadStyleDictionary();
  
  if (!StyleDictionary) {
    // Style Dictionary not installed - return error with instructions
    throw new StyleDictionaryNotInstalledError();
  }
  
  // Build config - priority: configFile > inlineConfig > presets
  let sdConfig: SDConfig;
  
  if (configFile) {
    // 1. Load user's external config file
    try {
      const customConfig = await import(configFile);
      sdConfig = customConfig.default || customConfig;
      // Override source to use our generated tokens file
      sdConfig.source = [tokensPath];
    } catch (error) {
      throw new Error(`Failed to load Style Dictionary config from ${configFile}: ${error}`);
    }
  } else if (inlineConfig?.platforms) {
    // 2. User provided full inline platforms config
    const buildPath = inlineConfig.buildPath || (outputDir.endsWith('/') ? outputDir : `${outputDir}/`);
    sdConfig = {
      source: [tokensPath],
      platforms: Object.fromEntries(
        Object.entries(inlineConfig.platforms).map(([name, platform]) => [
          name,
          {
            transformGroup: platform.transformGroup,
            transforms: platform.transforms,
            buildPath: platform.buildPath || buildPath,
            prefix: platform.prefix || options.options?.prefix,
            files: platform.files.map(f => ({
              ...f,
              options: {
                ...f.options,
                ...(options.options?.outputReferences !== undefined && { outputReferences: options.options.outputReferences }),
              }
            })),
          }
        ])
      ),
      log: { verbosity: 'silent' }
    };
  } else if (inlineConfig?.files) {
    // 3. User provided simple inline config (single platform)
    const buildPath = inlineConfig.buildPath || (outputDir.endsWith('/') ? outputDir : `${outputDir}/`);
    sdConfig = {
      source: [tokensPath],
      platforms: {
        custom: {
          transformGroup: inlineConfig.transformGroup || 'css',
          transforms: inlineConfig.transforms,
          buildPath,
          prefix: options.options?.prefix,
          files: inlineConfig.files.map(f => ({
            ...f,
            options: {
              ...f.options,
              ...(options.options?.outputReferences !== undefined && { outputReferences: options.options.outputReferences }),
            }
          })),
        }
      },
      log: { verbosity: 'silent' }
    };
  } else {
    throw new Error('Invalid Style Dictionary configuration. You must provide either a configFile or inlineConfig.');
  }
  
  // Run Style Dictionary build
  const sd = new StyleDictionary(sdConfig);
  await sd.buildAllPlatforms();
  
  // Collect generated files
  const files: string[] = [];
  for (const [, platformConfig] of Object.entries(sdConfig.platforms)) {
    for (const file of platformConfig.files) {
      files.push(file.destination);
    }
  }
  
  return {
    files,
    outputDir,
    usedStyleDictionary: true
  };
}

/**
 * Error thrown when Style Dictionary is not installed
 */
export class StyleDictionaryNotInstalledError extends Error {
  constructor() {
    super(
      'Style Dictionary is required for this output mode but is not installed.\n' +
      'Install it with: npm install -D style-dictionary\n' +
      'Or use output.mode: "json" for raw JSON output without Style Dictionary.'
    );
    this.name = 'StyleDictionaryNotInstalledError';
  }
}

/**
 * Check if Style Dictionary is available
 */
export async function isStyleDictionaryAvailable(): Promise<boolean> {
  const sd = await loadStyleDictionary();
  return sd !== null;
}
