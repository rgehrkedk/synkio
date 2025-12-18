import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';

// Define the structure of the detected project settings
export interface DetectedProject {
  framework?: 'nextjs' | 'vite' | 'remix' | 'cra';
  tokensDir?: string;
  styleDictionary?: { config: string; version: 'v3' | 'v4' };
  buildCommand?: string;
  hasStyleDictionaryPackage?: boolean;
  sdConfigFile?: string;
  sdTokensDir?: string;
}

// Style Dictionary config detection result
export interface StyleDictionaryConfigResult {
  configFile: string;
  tokensDir?: string;
}

// Function to safely read and parse a JSON file
function readJsonFile<T>(filePath: string): T | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    // Silently ignore errors (e.g., malformed JSON)
    return undefined;
  }
}

// Detects the project framework from package.json
function detectFramework(pkg: any): DetectedProject['framework'] {
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    if (dependencies.next) return 'nextjs';
    if (dependencies.vite) return 'vite';
    if (dependencies['@remix-run/dev']) return 'remix';
    if (dependencies['react-scripts']) return 'cra';
    return undefined;
}

// Detects the most likely tokens directory
function detectTokensDir(): string | undefined {
    const commonDirs = ['tokens', 'src/tokens', 'styles/tokens'];
    for (const dir of commonDirs) {
        if (existsSync(resolve(process.cwd(), dir))) {
            return dir;
        }
    }
    return undefined;
}

// Detects Style Dictionary config (legacy filename-based detection)
function detectStyleDictionary(): DetectedProject['styleDictionary'] {
    const commonConfigs = [
        'style-dictionary.config.js',
        'style-dictionary.config.json',
        'sd.config.js',
        'sd.config.json',
    ];
    for (const config of commonConfigs) {
        if (existsSync(resolve(process.cwd(), config))) {
            // A simple version detection could be added here by reading the file
            // but for now we'll just return v4 as a default guess.
            return { config, version: 'v4' };
        }
    }
    return undefined;
}

// Detects a token build script in package.json
function detectBuildCommand(pkg: any): string | undefined {
    const scripts = pkg.scripts || {};
    const buildScripts = ['tokens:build', 'build:tokens', 'style-dictionary:build'];
    for (const script of buildScripts) {
        if (scripts[script]) {
            return `npm run ${script}`;
        }
    }
    return undefined;
}

/**
 * Check if style-dictionary is installed in the project
 * Checks both dependencies and devDependencies in package.json
 */
export function hasStyleDictionary(): boolean {
  const pkgPath = resolve(process.cwd(), 'package.json');
  const pkg = readJsonFile<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(pkgPath);

  if (!pkg) {
    return false;
  }

  const dependencies = pkg.dependencies || {};
  const devDependencies = pkg.devDependencies || {};

  return 'style-dictionary' in dependencies || 'style-dictionary' in devDependencies;
}

/**
 * Parse a source glob pattern to extract the tokens directory
 * Examples:
 * - 'src/tokens/**\/*.json' -> 'src/tokens'
 * - 'tokens/**\/*.json' -> 'tokens'
 * - 'tokens/*.json' -> 'tokens'
 * - './src/design-tokens/**\/*.json' -> 'src/design-tokens'
 */
export function parseSourceGlob(glob: string): string {
  // Remove leading ./
  let path = glob.replace(/^\.\//, '');

  // Remove glob patterns: **/*.json, *.json, etc.
  // Match patterns like: /**/*.json, **/*.json, /*.json, *.json
  path = path.replace(/\/?(\*\*\/?)?\*\.[a-zA-Z]+$/, '');

  // Remove trailing slash if present
  path = path.replace(/\/$/, '');

  // If empty after processing, return 'tokens' as default
  return path || 'tokens';
}

/**
 * Find common parent directory from multiple glob patterns
 * Examples:
 * - ['src/primitives/**\/*.json', 'src/themes/**\/*.json'] -> 'src'
 * - ['tokens/**\/*.json'] -> 'tokens'
 */
function findCommonParent(globs: string[]): string {
  if (globs.length === 0) return 'tokens';
  if (globs.length === 1) return parseSourceGlob(globs[0]);

  const paths = globs.map(g => parseSourceGlob(g).split('/'));

  // Find common prefix
  const commonParts: string[] = [];
  const minLength = Math.min(...paths.map(p => p.length));

  for (let i = 0; i < minLength; i++) {
    const part = paths[0][i];
    if (paths.every(p => p[i] === part)) {
      commonParts.push(part);
    } else {
      break;
    }
  }

  return commonParts.length > 0 ? commonParts.join('/') : 'tokens';
}

/**
 * Check if file content contains Style Dictionary config signature
 * SD configs must contain both 'source' and 'platforms' properties
 */
function isStyleDictionaryConfig(content: string): boolean {
  // Check for both source and platforms patterns
  // Support both JS object notation (source:) and JSON ("source":)
  const hasSource = /["']?source["']?\s*:/.test(content);
  const hasPlatforms = /["']?platforms["']?\s*:/.test(content);

  return hasSource && hasPlatforms;
}

/**
 * Extract source array from Style Dictionary config content
 * Returns array of source patterns or null if not found
 */
function extractSourcePatterns(content: string): string[] | null {
  // Try to match source array patterns
  // Match: source: ['...', '...'] or source: ["...", "..."]
  // Also match: "source": ['...'] or "source": ["..."]
  const sourceMatch = content.match(/["']?source["']?\s*:\s*\[([^\]]+)\]/);

  if (!sourceMatch) {
    return null;
  }

  const arrayContent = sourceMatch[1];

  // Extract string values from the array
  const patterns: string[] = [];
  const stringMatches = arrayContent.matchAll(/["']([^"']+)["']/g);

  for (const match of stringMatches) {
    patterns.push(match[1]);
  }

  return patterns.length > 0 ? patterns : null;
}

/**
 * Search for Style Dictionary config files in the project
 * Uses content-based search: files must contain both 'source' and 'platforms'
 *
 * Search paths (in order, stop at first match):
 * - ./
 * - ./config/
 * - ./src/
 *
 * File types: *.js, *.mjs, *.cjs, *.json, *.ts
 * Excludes: node_modules/
 */
export function findStyleDictionaryConfig(): StyleDictionaryConfigResult | null {
  // Only search if style-dictionary is installed
  if (!hasStyleDictionary()) {
    return null;
  }

  const searchPaths = ['./', './config/', './src/'];
  const fileExtensions = ['.js', '.mjs', '.cjs', '.json', '.ts'];
  const cwd = process.cwd();

  for (const searchPath of searchPaths) {
    const fullSearchPath = resolve(cwd, searchPath);

    if (!existsSync(fullSearchPath)) {
      continue;
    }

    let files: string[];
    try {
      files = readdirSync(fullSearchPath);
    } catch {
      continue;
    }

    for (const file of files) {
      // Skip node_modules
      if (file === 'node_modules') {
        continue;
      }

      // Check if file has valid extension
      const hasValidExtension = fileExtensions.some(ext => file.endsWith(ext));
      if (!hasValidExtension) {
        continue;
      }

      const filePath = join(fullSearchPath, file);

      // Read file content
      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      // Check if it's a Style Dictionary config
      if (isStyleDictionaryConfig(content)) {
        // Extract source patterns to determine tokens directory
        const sourcePatterns = extractSourcePatterns(content);
        const tokensDir = sourcePatterns ? findCommonParent(sourcePatterns) : undefined;

        // Return relative path from cwd
        const relativePath = searchPath === './' ? file : join(searchPath.replace('./', ''), file);

        return {
          configFile: relativePath,
          tokensDir,
        };
      }
    }
  }

  return null;
}


/**
 * Analyzes the project structure to detect framework, token paths, and build tools.
 * This is a lightweight detection mechanism focusing on convention over configuration.
 */
export function detectProject(): DetectedProject {
  const project: DetectedProject = {};
  const pkgPath = resolve(process.cwd(), 'package.json');
  const pkg = readJsonFile<{ dependencies?: any; devDependencies?: any; scripts?: any }>(pkgPath);

  if (pkg) {
    project.framework = detectFramework(pkg);
    project.buildCommand = detectBuildCommand(pkg);
  }

  project.tokensDir = detectTokensDir();
  project.styleDictionary = detectStyleDictionary();

  // New enhanced detection
  project.hasStyleDictionaryPackage = hasStyleDictionary();

  // Try content-based SD config detection
  const sdConfig = findStyleDictionaryConfig();
  if (sdConfig) {
    project.sdConfigFile = sdConfig.configFile;
    project.sdTokensDir = sdConfig.tokensDir;
  }

  return project;
}
