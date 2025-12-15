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

// Type definitions for Style Dictionary (to avoid requiring the package at parse time)
interface SDFile {
  destination: string;
  format: string;
  options?: Record<string, unknown>;
}

interface SDPlatformConfig {
  transformGroup: string;
  buildPath: string;
  files: SDFile[];
  options?: Record<string, unknown>;
}

interface SDConfig {
  source: string[];
  platforms: Record<string, SDPlatformConfig>;
  log?: { verbosity: string };
}

/**
 * Platform presets that map Synkio's simple platform names to Style Dictionary configs
 */
export const PLATFORM_PRESETS: Record<string, Omit<SDPlatformConfig, 'buildPath'>> = {
  css: {
    transformGroup: 'css',
    files: [
      { 
        destination: 'tokens.css', 
        format: 'css/variables',
        options: { outputReferences: true }
      }
    ]
  },
  scss: {
    transformGroup: 'scss',
    files: [
      { 
        destination: '_tokens.scss', 
        format: 'scss/variables' 
      }
    ]
  },
  'scss-map': {
    transformGroup: 'scss',
    files: [
      { 
        destination: '_tokens-map.scss', 
        format: 'scss/map-deep' 
      }
    ]
  },
  js: {
    transformGroup: 'js',
    files: [
      { 
        destination: 'tokens.js', 
        format: 'javascript/es6' 
      }
    ]
  },
  ts: {
    transformGroup: 'js',
    files: [
      { 
        destination: 'tokens.ts', 
        format: 'javascript/es6' 
      },
      { 
        destination: 'tokens.d.ts', 
        format: 'typescript/es6-declarations' 
      }
    ]
  },
  json: {
    transformGroup: 'js',
    files: [
      { 
        destination: 'tokens.json', 
        format: 'json/nested' 
      }
    ]
  },
  'json-flat': {
    transformGroup: 'js',
    files: [
      { 
        destination: 'tokens-flat.json', 
        format: 'json/flat' 
      }
    ]
  },
  android: {
    transformGroup: 'android',
    files: [
      { destination: 'colors.xml', format: 'android/colors' },
      { destination: 'dimens.xml', format: 'android/dimens' },
      { destination: 'font_dimens.xml', format: 'android/fontDimens' }
    ]
  },
  ios: {
    transformGroup: 'ios',
    files: [
      { destination: 'StyleDictionaryColor.h', format: 'ios/colors.h' },
      { destination: 'StyleDictionaryColor.m', format: 'ios/colors.m' }
    ]
  },
  'ios-swift': {
    transformGroup: 'ios-swift',
    files: [
      { destination: 'StyleDictionary.swift', format: 'ios-swift/class.swift' }
    ]
  },
  compose: {
    transformGroup: 'compose',
    files: [
      { destination: 'StyleDictionaryColor.kt', format: 'compose/object' }
    ]
  }
};

export type PlatformPreset = keyof typeof PLATFORM_PRESETS;

export interface StyleDictionaryBuildOptions {
  /** Output directory for generated files */
  outputDir: string;
  /** Platform presets to use (e.g., ['css', 'scss', 'js']) */
  platforms: PlatformPreset[];
  /** Path to custom Style Dictionary config file (overrides platforms) */
  configFile?: string;
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
    current[tokenName] = {
      $value: normalizeValue(entry.value, entry.type),
      $type: mapToDTCGType(entry.type),
      ...(entry.description && { $description: entry.description }),
    };
  }
  
  return result;
}

/**
 * Normalize token values for DTCG format
 */
function normalizeValue(value: unknown, type: string): unknown {
  // Handle Figma color objects { r, g, b, a }
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
  
  return value;
}

/**
 * Map Synkio/Figma types to DTCG canonical types
 */
function mapToDTCGType(type: string): string {
  const typeMap: Record<string, string> = {
    'color': 'color',
    'float': 'number',
    'number': 'number',
    'boolean': 'boolean',
    'string': 'string',
    'dimension': 'dimension',
    'fontfamily': 'fontFamily',
    'fontweight': 'fontWeight',
    'fontsize': 'dimension',
    'lineheight': 'number',
    'letterspacing': 'dimension',
    'shadow': 'shadow',
    'border': 'border',
    'duration': 'duration',
    'cubicbezier': 'cubicBezier',
    'gradient': 'gradient',
    'typography': 'typography',
  };
  
  return typeMap[type.toLowerCase()] || type.toLowerCase();
}

/**
 * Build Style Dictionary config from platform presets
 */
function buildSDConfig(
  tokensPath: string,
  outputDir: string,
  platforms: PlatformPreset[],
  options?: StyleDictionaryBuildOptions['options']
): SDConfig {
  const sdPlatforms: Record<string, SDPlatformConfig> = {};
  
  for (const platform of platforms) {
    const preset = PLATFORM_PRESETS[platform];
    if (!preset) {
      console.warn(`Unknown platform preset: ${platform}`);
      continue;
    }
    
    sdPlatforms[platform] = {
      transformGroup: preset.transformGroup,
      buildPath: outputDir.endsWith('/') ? outputDir : `${outputDir}/`,
      files: preset.files.map(f => ({
        ...f,
        options: {
          ...f.options,
          ...(options?.outputReferences !== undefined && { outputReferences: options.outputReferences }),
        }
      })),
      ...(options?.prefix && { prefix: options.prefix })
    };
  }
  
  return {
    source: [tokensPath],
    platforms: sdPlatforms,
    log: { verbosity: 'silent' }
  };
}

/**
 * Build tokens using Style Dictionary
 * 
 * @param baseline - Synkio baseline data
 * @param options - Build options
 * @returns Build result with list of generated files
 */
export async function buildWithStyleDictionary(
  baseline: BaselineData,
  options: StyleDictionaryBuildOptions
): Promise<StyleDictionaryBuildResult> {
  const { outputDir, platforms, configFile } = options;
  
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
  
  // Build config (from custom file or presets)
  let sdConfig: SDConfig;
  
  if (configFile) {
    // Load user's custom config
    try {
      const customConfig = await import(configFile);
      sdConfig = customConfig.default || customConfig;
      // Override source to use our generated tokens file
      sdConfig.source = [tokensPath];
    } catch (error) {
      throw new Error(`Failed to load Style Dictionary config from ${configFile}: ${error}`);
    }
  } else {
    sdConfig = buildSDConfig(tokensPath, outputDir, platforms, options.options);
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
