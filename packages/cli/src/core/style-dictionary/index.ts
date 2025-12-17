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
import { join } from 'path';
import { BaselineData } from '../../types/index.js';
import { convertToIntermediateFormat } from '../intermediate-tokens.js';

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
  /** Config object (optional, for intermediate format metadata) */
  config?: any;
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
  // Always use the shared intermediate format conversion
  if (!options.config) {
    throw new Error('Config object is required for Style Dictionary build');
  }
  const dtcgTokens = convertToIntermediateFormat(baseline, options.config);
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
