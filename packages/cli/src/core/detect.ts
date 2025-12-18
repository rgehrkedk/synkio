import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname, relative } from 'path';

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

// Package.json search result
export interface PackageJsonResult {
  path: string;           // Full path to package.json
  dir: string;            // Directory containing package.json
  relativePath: string;   // Relative path from cwd (e.g., './theme')
  isRoot: boolean;        // Whether it's in the root directory
}

// Directories to skip when searching
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', '.synkio', '.next', 'coverage'];

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

/**
 * Get all directories in a path (non-recursive, single level)
 */
function getDirectories(dirPath: string): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  try {
    const entries = readdirSync(dirPath);
    return entries.filter(entry => {
      if (SKIP_DIRS.includes(entry)) return false;
      const fullPath = join(dirPath, entry);
      try {
        return statSync(fullPath).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

/**
 * Search for package.json files up to 2 levels deep
 * Returns all found package.json locations, sorted by depth (root first)
 */
export function findPackageJsonFiles(cwd: string = process.cwd()): PackageJsonResult[] {
  const results: PackageJsonResult[] = [];

  // Level 0: Check root
  const rootPkgPath = join(cwd, 'package.json');
  if (existsSync(rootPkgPath)) {
    results.push({
      path: rootPkgPath,
      dir: cwd,
      relativePath: '.',
      isRoot: true,
    });
  }

  // Level 1: Check immediate subdirectories
  const level1Dirs = getDirectories(cwd);
  for (const dir of level1Dirs) {
    const dirPath = join(cwd, dir);
    const pkgPath = join(dirPath, 'package.json');
    if (existsSync(pkgPath)) {
      results.push({
        path: pkgPath,
        dir: dirPath,
        relativePath: `./${dir}`,
        isRoot: false,
      });
    }

    // Level 2: Check subdirectories of level 1
    const level2Dirs = getDirectories(dirPath);
    for (const subDir of level2Dirs) {
      const subDirPath = join(dirPath, subDir);
      const subPkgPath = join(subDirPath, 'package.json');
      if (existsSync(subPkgPath)) {
        results.push({
          path: subPkgPath,
          dir: subDirPath,
          relativePath: `./${dir}/${subDir}`,
          isRoot: false,
        });
      }
    }
  }

  return results;
}

/**
 * Check if a package.json has style-dictionary as a dependency
 */
export function packageHasStyleDictionary(pkgPath: string): boolean {
  const pkg = readJsonFile<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(pkgPath);
  if (!pkg) return false;

  const dependencies = pkg.dependencies || {};
  const devDependencies = pkg.devDependencies || {};

  return 'style-dictionary' in dependencies || 'style-dictionary' in devDependencies;
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
 * Search for Style Dictionary config files in a directory
 * Checks files with valid extensions for SD config signature
 */
function searchDirForSDConfig(dirPath: string, basePath: string, fileExtensions: string[]): StyleDictionaryConfigResult | null {
  if (!existsSync(dirPath)) {
    return null;
  }

  let files: string[];
  try {
    files = readdirSync(dirPath);
  } catch {
    return null;
  }

  for (const file of files) {
    // Skip directories and special files
    if (SKIP_DIRS.includes(file)) continue;

    const filePath = join(dirPath, file);

    // Check if it's a file with valid extension
    try {
      if (!statSync(filePath).isFile()) continue;
    } catch {
      continue;
    }

    const hasValidExtension = fileExtensions.some(ext => file.endsWith(ext));
    if (!hasValidExtension) continue;

    // Read file content
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    // Check if it's a Style Dictionary config
    if (isStyleDictionaryConfig(content)) {
      const sourcePatterns = extractSourcePatterns(content);
      const tokensDir = sourcePatterns ? findCommonParent(sourcePatterns) : undefined;

      // Calculate relative path from basePath
      const relativePath = relative(basePath, filePath);

      return {
        configFile: relativePath,
        tokensDir,
      };
    }
  }

  return null;
}

/**
 * Search for Style Dictionary config files in the project
 * Uses content-based search: files must contain both 'source' and 'platforms'
 *
 * Searches up to 2 levels deep from the given base directory
 * File types: *.js, *.mjs, *.cjs, *.json, *.ts
 * Excludes: node_modules/, .git/, dist/, build/, etc.
 */
export function findStyleDictionaryConfig(baseDir: string = process.cwd()): StyleDictionaryConfigResult | null {
  // Only search if style-dictionary is installed
  if (!hasStyleDictionary()) {
    return null;
  }

  const fileExtensions = ['.js', '.mjs', '.cjs', '.json', '.ts'];

  // Level 0: Search root directory
  const rootResult = searchDirForSDConfig(baseDir, baseDir, fileExtensions);
  if (rootResult) return rootResult;

  // Level 1: Search immediate subdirectories
  const level1Dirs = getDirectories(baseDir);
  for (const dir of level1Dirs) {
    const dirPath = join(baseDir, dir);
    const result = searchDirForSDConfig(dirPath, baseDir, fileExtensions);
    if (result) return result;

    // Level 2: Search subdirectories of level 1
    const level2Dirs = getDirectories(dirPath);
    for (const subDir of level2Dirs) {
      const subDirPath = join(dirPath, subDir);
      const subResult = searchDirForSDConfig(subDirPath, baseDir, fileExtensions);
      if (subResult) return subResult;
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
