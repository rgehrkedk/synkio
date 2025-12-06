/**
 * Style Dictionary Detection and Parsing
 *
 * Parses Style Dictionary configuration and extracts platform settings.
 * Detection logic is delegated to detect/index.ts for consistency.
 */

import fs from 'fs';
import path from 'path';

import { detectStyleDictionary as detectSD } from '../detect/index.js';

export interface SDPlatformConfig {
  name: string;
  transforms: string[];
  buildPath: string;
  files: Array<{
    destination: string;
    format: string;
    options?: Record<string, unknown>;
  }>;
}

export interface SDDetectionResult {
  found: boolean;
  configPath: string | null;
  platforms: SDPlatformConfig[];
}

/**
 * Re-export detection from detect module for backwards compatibility
 * @deprecated Use detectStyleDictionary from '../detect' instead
 */
export function detectStyleDictionary(): { found: boolean; path: string | null } {
  const result = detectSD();
  return { found: result.found, path: result.configPath };
}

/**
 * Parse Style Dictionary config to extract platform configurations
 * Note: This is a best-effort parser for common patterns
 */
export function parseStyleDictionaryConfig(configPath: string): SDPlatformConfig[] {
  const fullPath = path.join(process.cwd(), configPath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const platforms: SDPlatformConfig[] = [];

  // Detect CSS platform
  if (content.includes('css:') || content.includes("'css'") || content.includes('"css"')) {
    // Look for transforms
    const cssTransforms: string[] = [];
    const transformsMatch = content.match(/transforms:\s*\[([\s\S]*?)\]/);
    if (transformsMatch) {
      const transformsStr = transformsMatch[1];
      const transformMatches = transformsStr.match(/['"]([^'"]+)['"]/g);
      if (transformMatches) {
        cssTransforms.push(...transformMatches.map(m => m.replace(/['"]/g, '')));
      }
    }

    // Look for build path
    let buildPath = 'styles/tokens/';
    const buildPathMatch = content.match(/buildPath:\s*['"]([^'"]+)['"]/);
    if (buildPathMatch) {
      buildPath = buildPathMatch[1];
    }

    platforms.push({
      name: 'css',
      transforms: cssTransforms.length > 0 ? cssTransforms : ['name/kebab'],
      buildPath,
      files: [],
    });
  }

  // Detect TypeScript platform
  if (content.includes('ts:') || content.includes("'ts'") || content.includes('"ts"') ||
      content.includes('typescript') || content.includes('declarations')) {
    platforms.push({
      name: 'typescript',
      transforms: ['name/kebab'],
      buildPath: 'types/',
      files: [],
    });
  }

  // Detect SCSS platform
  if (content.includes('scss:') || content.includes("'scss'") || content.includes('"scss"') ||
      content.includes('.scss')) {
    platforms.push({
      name: 'scss',
      transforms: ['name/kebab'],
      buildPath: 'styles/',
      files: [],
    });
  }

  // Detect JS/ES modules platform
  if (content.includes('js:') || content.includes("'js'") || content.includes('"js"') ||
      content.includes('javascript') || content.includes('.mjs') || content.includes('.cjs')) {
    platforms.push({
      name: 'javascript',
      transforms: ['name/camel'],
      buildPath: 'dist/',
      files: [],
    });
  }

  return platforms;
}

/**
 * Full detection and parsing
 */
export function detectAndParseStyleDictionary(): SDDetectionResult {
  const detection = detectStyleDictionary();

  if (!detection.found || !detection.path) {
    return {
      found: false,
      configPath: null,
      platforms: [],
    };
  }

  try {
    const platforms = parseStyleDictionaryConfig(detection.path);
    return {
      found: true,
      configPath: detection.path,
      platforms,
    };
  } catch {
    // If parsing fails, still return that we found a config
    return {
      found: true,
      configPath: detection.path,
      platforms: [],
    };
  }
}

/**
 * Map SD platform to adapter platform name
 */
export function mapSDPlatformToAdapter(sdPlatform: string): string {
  const mapping: Record<string, string> = {
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    ts: 'typescript',
    typescript: 'typescript',
    js: 'javascript',
    javascript: 'javascript',
    ios: 'swift',
    'ios-swift': 'swift',
    android: 'kotlin',
  };

  return mapping[sdPlatform.toLowerCase()] || sdPlatform;
}
