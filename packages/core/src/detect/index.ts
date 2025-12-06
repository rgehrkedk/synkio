/**
 * Project Detection Utilities
 *
 * Functions for detecting existing project structure, build scripts,
 * and Style Dictionary configuration.
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface ProjectDetection {
  paths: DetectedPaths;
  build: DetectedBuild;
  styleDictionary: DetectedStyleDictionary;
}

export interface DetectedPaths {
  tokens: string | null;
  styles: string | null;
  suggestions: {
    tokens: string[];
    styles: string[];
  };
}

export interface DetectedBuild {
  command: string | null;
  scripts: string[];
  hasStyleDictionary: boolean;
}

export interface DetectedStyleDictionary {
  found: boolean;
  configPath: string | null;
  version: 'v3' | 'v4' | null;
  platforms: string[];
}

// ============================================================================
// Path Detection
// ============================================================================

const TOKEN_PATH_CANDIDATES = [
  'tokens',
  'src/tokens',
  'design-tokens',
  'src/design-tokens',
  'lib/tokens',
  'packages/tokens',
];

const STYLE_PATH_CANDIDATES = [
  'styles/tokens',
  'src/styles/tokens',
  'css/tokens',
  'src/css/tokens',
  'styles/variables',
  'src/styles/variables',
  'dist/tokens',
  'build/tokens',
];

/**
 * Detect existing token and style output paths
 */
export function detectPaths(): DetectedPaths {
  let tokensPath: string | null = null;
  let stylesPath: string | null = null;
  const tokenSuggestions: string[] = [];
  const styleSuggestions: string[] = [];

  // Check for existing token directories
  for (const candidate of TOKEN_PATH_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      // Check if it contains JSON files
      const files = fs.readdirSync(candidate);
      const hasJsonFiles = files.some(f => f.endsWith('.json'));

      if (hasJsonFiles) {
        tokensPath = candidate;
        break;
      }
      tokenSuggestions.push(candidate);
    }
  }

  // Check for existing style directories
  for (const candidate of STYLE_PATH_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      // Check if it contains CSS files
      const files = fs.readdirSync(candidate);
      const hasCssFiles = files.some(f => f.endsWith('.css') || f.endsWith('.scss'));

      if (hasCssFiles) {
        stylesPath = candidate;
        break;
      }
      styleSuggestions.push(candidate);
    }
  }

  // Add default suggestions if nothing found
  if (tokenSuggestions.length === 0 && !tokensPath) {
    tokenSuggestions.push('tokens', 'src/tokens');
  }
  if (styleSuggestions.length === 0 && !stylesPath) {
    styleSuggestions.push('styles/tokens', 'src/styles/tokens');
  }

  return {
    tokens: tokensPath,
    styles: stylesPath,
    suggestions: {
      tokens: tokenSuggestions,
      styles: styleSuggestions,
    },
  };
}

// ============================================================================
// Build Script Detection
// ============================================================================

/**
 * Priority patterns for build script names
 * Higher index = higher priority
 */
const BUILD_SCRIPT_NAME_PATTERNS = [
  // Exact name patterns (highest priority)
  { pattern: /^tokens[:\-_]build$/i, priority: 100 },
  { pattern: /^build[:\-_]tokens$/i, priority: 100 },
  { pattern: /^sd[:\-_]build$/i, priority: 100 },
  { pattern: /^style-dictionary[:\-_]build$/i, priority: 100 },
  // Partial name patterns
  { pattern: /tokens[:\-_](build|compile|generate)/i, priority: 80 },
  { pattern: /(build|compile|generate)[:\-_]tokens/i, priority: 80 },
  { pattern: /^sd[:\-_]/i, priority: 70 },
  { pattern: /style-dictionary/i, priority: 70 },
  // Generic token-related
  { pattern: /tokens/i, priority: 30 },
];

/**
 * Keywords that disqualify a script from being a token build command
 */
const DISQUALIFIED_KEYWORDS = [
  'dev', 'start', 'serve', 'watch', 'test', 'lint', 'format', 'clean',
  'deploy', 'publish', 'release', 'preview', 'storybook', 'docs'
];

/**
 * Detect existing build scripts in package.json
 */
export function detectBuildScripts(): DetectedBuild {
  let command: string | null = null;
  const scripts: string[] = [];
  let hasStyleDictionary = false;

  // Read package.json
  const packageJsonPath = 'package.json';
  if (!fs.existsSync(packageJsonPath)) {
    return { command: null, scripts: [], hasStyleDictionary: false };
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Check dependencies for Style Dictionary
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    hasStyleDictionary = 'style-dictionary' in deps;

    // Find matching scripts with priority scoring
    if (packageJson.scripts) {
      const scoredScripts: Array<{ name: string; priority: number }> = [];

      for (const [name, value] of Object.entries(packageJson.scripts)) {
        const nameLower = name.toLowerCase();
        const valueStr = String(value).toLowerCase();

        // Skip scripts with disqualifying keywords in the name
        if (DISQUALIFIED_KEYWORDS.some(kw => nameLower.includes(kw))) {
          continue;
        }

        // Calculate priority based on name patterns
        let priority = 0;
        for (const { pattern, priority: p } of BUILD_SCRIPT_NAME_PATTERNS) {
          if (pattern.test(name)) {
            priority = Math.max(priority, p);
          }
        }

        // Boost priority if script value contains Style Dictionary references
        if (valueStr.includes('style-dictionary') || valueStr.includes(' sd ')) {
          priority = Math.max(priority, 60);
        }

        // Only include scripts with some relevance (priority > 0)
        if (priority > 0) {
          scoredScripts.push({ name, priority });
        }
      }

      // Sort by priority descending
      scoredScripts.sort((a, b) => b.priority - a.priority);

      // Collect script names
      for (const { name } of scoredScripts) {
        scripts.push(name);
      }

      // Use highest priority script as command
      if (scoredScripts.length > 0) {
        command = `npm run ${scoredScripts[0].name}`;
      }
    }
  } catch {
    // Ignore parse errors
  }

  return { command, scripts, hasStyleDictionary };
}

// ============================================================================
// Style Dictionary Detection
// ============================================================================

/**
 * Common Style Dictionary config filename patterns
 * Used as a starting point, but we also scan for any file containing SD patterns
 */
const SD_CONFIG_FILENAME_PATTERNS = [
  /^style-dictionary\.config\.(js|mjs|cjs|json|ts)$/,
  /^sd\.config\.(js|mjs|cjs|json|ts)$/,
  /^tokens\.config\.(js|mjs|cjs|ts)$/,
  /^build-tokens\.(js|mjs|cjs|ts)$/,
];

/**
 * Directories to search for SD configs
 */
const SD_SEARCH_DIRS = [
  '.',           // root
  'scripts',     // common script location
  'tokens',      // token directory
  'config',      // config directory
  'src',         // src directory
  'build',       // build directory
];

/**
 * Content patterns that indicate a Style Dictionary config file
 */
const SD_CONTENT_PATTERNS = [
  /StyleDictionary/,
  /style-dictionary/,
  /platforms:\s*\{/,
  /transformGroup:/,
  /buildPath:/,
];

/**
 * Check if a file looks like a Style Dictionary config by its content
 */
function isStyleDictionaryConfig(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Must match at least 2 patterns to be considered an SD config
    const matches = SD_CONTENT_PATTERNS.filter(pattern => pattern.test(content));
    return matches.length >= 2;
  } catch {
    return false;
  }
}

/**
 * Detect Style Dictionary configuration by scanning the codebase
 * Returns the first valid SD config found, prioritizing common locations
 */
export function detectStyleDictionary(): DetectedStyleDictionary {
  const candidates: Array<{ path: string; priority: number }> = [];

  // Scan each search directory
  for (const searchDir of SD_SEARCH_DIRS) {
    if (!fs.existsSync(searchDir)) continue;

    try {
      const entries = fs.readdirSync(searchDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const fileName = entry.name;
        const filePath = searchDir === '.' ? fileName : path.join(searchDir, fileName);

        // Skip non-config-like files
        if (!fileName.match(/\.(js|mjs|cjs|json|ts)$/)) continue;

        // Check if filename matches known SD patterns (high priority)
        const matchesPattern = SD_CONFIG_FILENAME_PATTERNS.some(p => p.test(fileName));

        if (matchesPattern) {
          // Verify by content
          if (isStyleDictionaryConfig(filePath)) {
            candidates.push({ path: filePath, priority: 100 });
          }
        } else if (fileName.includes('token') || fileName.includes('style')) {
          // Check files with token/style in name (medium priority)
          if (isStyleDictionaryConfig(filePath)) {
            candidates.push({ path: filePath, priority: 50 });
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  // Sort by priority and pick the best
  candidates.sort((a, b) => b.priority - a.priority);

  if (candidates.length === 0) {
    return { found: false, configPath: null, version: null, platforms: [] };
  }

  const configPath = candidates[0].path;

  // Parse the config for version and platforms
  let version: 'v3' | 'v4' | null = null;
  const platforms: string[] = [];

  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // Detect version by syntax patterns
    if (content.includes('StyleDictionary.extend') || content.includes('module.exports')) {
      version = 'v3';
    } else if (content.includes('export default') || content.includes('defineConfig')) {
      version = 'v4';
    }

    // Extract platform names (rough regex, won't catch everything)
    // Using [\s\S] instead of . with 's' flag for cross-line matching
    const platformMatches = content.match(/platforms:\s*\{([\s\S]*?)\}/);
    if (platformMatches) {
      const platformBlock = platformMatches[1];
      const nameMatches = platformBlock.match(/(\w+):/g);
      if (nameMatches) {
        for (const match of nameMatches) {
          const name = match.replace(':', '');
          if (!['transformGroup', 'buildPath', 'files', 'transforms', 'options'].includes(name)) {
            platforms.push(name);
          }
        }
      }
    }
  } catch {
    // Ignore read/parse errors
  }

  return {
    found: true,
    configPath,
    version,
    platforms,
  };
}

// ============================================================================
// Token File Detection (for matching collections)
// ============================================================================

export interface TokenFileMatch {
  collectionName: string;
  matchedPath: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
  candidates: string[];
}

export interface DetectedTokenFile {
  path: string;
  type: 'file' | 'directory';
  hasTokenStructure: boolean;
  name: string;
}

/**
 * Check if a JSON file looks like a token file
 */
function isTokenFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);

    // Check for token-like structure
    // Could have: value, $value, type, $type at any level
    const contentStr = JSON.stringify(json);
    return (
      contentStr.includes('"value"') ||
      contentStr.includes('"$value"') ||
      contentStr.includes('"type"') ||
      contentStr.includes('"$type"')
    );
  } catch {
    return false;
  }
}

/**
 * Recursively find all potential token directories and files
 */
function findTokenDirectories(basePath: string = '.', maxDepth: number = 5): DetectedTokenFile[] {
  const results: DetectedTokenFile[] = [];
  // Exact matches to ignore (common non-token directories)
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.figma', 'coverage', '.cache', '.turbo'];
  // Patterns to ignore - only truly irrelevant directories
  const ignorePatterns = ['backup', '.backup', 'deprecated'];

  function scan(currentPath: string, depth: number) {
    if (depth > maxDepth) return;

    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Skip exact matches
          if (ignoreDirs.includes(entry.name)) continue;
          // Skip directories matching ignore patterns (e.g., .backups, old-tokens)
          const nameLower = entry.name.toLowerCase();
          if (ignorePatterns.some(pattern => nameLower.includes(pattern))) continue;

          // Check if directory contains token files
          const dirFiles = fs.readdirSync(fullPath);
          const jsonFiles = dirFiles.filter(f => f.endsWith('.json'));

          if (jsonFiles.length > 0) {
            // Check if at least one JSON file looks like tokens
            const hasTokens = jsonFiles.some(f => isTokenFile(path.join(fullPath, f)));

            if (hasTokens) {
              results.push({
                path: fullPath,
                type: 'directory',
                hasTokenStructure: true,
                name: entry.name,
              });
            }
          }

          // Continue scanning subdirectories
          scan(fullPath, depth + 1);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          // Also detect individual token JSON files
          const nameLower = entry.name.toLowerCase();
          if (ignorePatterns.some(pattern => nameLower.includes(pattern))) continue;

          if (isTokenFile(fullPath)) {
            // Use filename without extension as name
            const nameWithoutExt = entry.name.replace(/\.json$/, '');
            results.push({
              path: fullPath,
              type: 'file',
              hasTokenStructure: true,
              name: nameWithoutExt,
            });
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  scan(basePath, 0);
  return results;
}

/**
 * Calculate similarity between two strings
 * Handles exact matches, contains, dotted segments, and common variations
 */
function stringSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  // Exact match
  if (aLower === bLower) return 1;

  // Direct contains (e.g., "brands" contains "brand")
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;

  // Check dotted segments (e.g., "brand.eboks.tokens" should match "eboks")
  // Split by dots, dashes, underscores
  const aSegments = aLower.split(/[.\-_]/);
  const bSegments = bLower.split(/[.\-_]/);

  // Check if b is a segment in a (or vice versa)
  if (aSegments.includes(bLower) || bSegments.includes(aLower)) {
    return 0.85; // High score for segment match
  }

  // Check if any segment matches
  for (const aSeg of aSegments) {
    for (const bSeg of bSegments) {
      if (aSeg === bSeg && aSeg.length > 2) { // Avoid matching tiny segments
        return 0.8;
      }
    }
  }

  // Check for common abbreviations/variations (bidirectional - any in group matches any other)
  const variationGroups: string[][] = [
    ['primitives', 'primitive', 'base', 'core', 'foundation', 'global', 'globals'],
    ['themes', 'theme', 'modes', 'mode', 'schemes', 'scheme'],
    ['brands', 'brand', 'branding', 'products', 'product'],
    ['colors', 'color', 'colour', 'colours', 'palette'],
    ['spacing', 'space', 'spaces', 'sizes', 'size'],
    ['typography', 'type', 'font', 'fonts', 'text'],
    ['semantic', 'semantics', 'tokens', 'token'],
    ['components', 'component', 'comp', 'comps'],
    ['shared', 'common', 'base'],
  ];

  for (const group of variationGroups) {
    if (group.includes(aLower) && group.includes(bLower)) {
      return 0.7;
    }
  }

  return 0;
}

/**
 * Collection info with mode names for matching
 */
export interface CollectionMatchInfo {
  name: string;
  modes: string[];
}

/**
 * Match a single Figma collection to existing token directories
 * Returns all potential matches for user selection
 */
export function findCollectionMatches(
  collection: CollectionMatchInfo
): TokenFileMatch {
  const existingDirs = findTokenDirectories();
  const candidates: Array<{ path: string; score: number; reason: string }> = [];

  for (const dir of existingDirs) {
    // 1. Check collection name against directory/file name
    const nameSimilarity = stringSimilarity(collection.name, dir.name);
    if (nameSimilarity >= 0.7) {
      // For directories, use as-is. For files, use parent directory.
      const targetPath = dir.type === 'file' ? path.dirname(dir.path) : dir.path;
      const existing = candidates.find(c => c.path === targetPath);
      if (!existing || nameSimilarity > existing.score) {
        if (existing) {
          existing.score = nameSimilarity;
          existing.reason = `Name matches "${dir.name}"`;
        } else {
          candidates.push({
            path: targetPath,
            score: nameSimilarity,
            reason: `Name matches "${dir.name}"`,
          });
        }
      }
    }

    // 2. Check mode names (e.g., brand collection with modes ["acme", "beta"])
    // If a mode matches a file/dir, the PARENT directory is likely the output location
    for (const mode of collection.modes) {
      const modeSimilarity = stringSimilarity(mode, dir.name);
      if (modeSimilarity >= 0.7) { // Lowered threshold to catch more variations
        // Mode match found - use parent directory as the target
        const targetPath = dir.type === 'file' ? path.dirname(dir.path) : path.dirname(dir.path);
        const existing = candidates.find(c => c.path === targetPath);
        // Score mode matches slightly lower than direct name matches
        const score = modeSimilarity * 0.95;
        if (!existing || score > existing.score) {
          if (existing) {
            existing.score = score;
            existing.reason = `Contains mode "${mode}" (${dir.name})`;
          } else {
            candidates.push({
              path: targetPath,
              score,
              reason: `Contains mode "${mode}" (${dir.name})`,
            });
          }
        }
      }
    }

    // 4. Check if any mode name appears as a segment in the file/dir name
    // This catches patterns like "brand.eboks.tokens" where "eboks" is a mode
    for (const mode of collection.modes) {
      const dirSegments = dir.name.toLowerCase().split(/[.\-_]/);
      if (dirSegments.includes(mode.toLowerCase())) {
        const targetPath = dir.type === 'file' ? path.dirname(dir.path) : path.dirname(dir.path);
        const existing = candidates.find(c => c.path === targetPath);
        if (!existing) {
          candidates.push({
            path: targetPath,
            score: 0.85,
            reason: `Contains mode "${mode}" in name`,
          });
        }
      }
    }

    // 3. Check if collection name appears anywhere in path
    const pathLower = dir.path.toLowerCase();
    const nameLower = collection.name.toLowerCase();
    if (pathLower.includes(nameLower)) {
      const targetPath = dir.type === 'file' ? path.dirname(dir.path) : dir.path;
      const existing = candidates.find(c => c.path === targetPath);
      if (!existing) {
        candidates.push({
          path: targetPath,
          score: 0.6,
          reason: `Path contains "${collection.name}"`,
        });
      }
    }
  }

  // Sort by score descending and dedupe
  const uniqueCandidates = candidates
    .sort((a, b) => b.score - a.score)
    .filter((c, i, arr) => arr.findIndex(x => x.path === c.path) === i);

  // Determine best match and confidence
  const bestMatch = uniqueCandidates[0] || null;
  let confidence: 'high' | 'medium' | 'low' | 'none';
  if (!bestMatch) {
    confidence = 'none';
  } else if (bestMatch.score >= 0.8) {
    confidence = 'high';
  } else if (bestMatch.score >= 0.6) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Filter out child directories that are mode names (avoid showing eboks, postnl when raw is the answer)
  const modeNamesLower = collection.modes.map(m => m.toLowerCase());
  const filteredCandidates = uniqueCandidates.filter(c => {
    // If this candidate is a child of the best match and named like a mode, skip it
    if (bestMatch && c.path !== bestMatch.path && c.path.startsWith(bestMatch.path + '/')) {
      const childName = path.basename(c.path).toLowerCase();
      if (modeNamesLower.includes(childName)) {
        return false; // Skip mode-named subdirectories
      }
    }
    return true;
  });

  return {
    collectionName: collection.name,
    matchedPath: bestMatch?.path || null,
    confidence,
    reason: bestMatch?.reason || 'No matching directory found',
    candidates: filteredCandidates.map(c => c.path),
  };
}

/**
 * Match Figma collections to existing token directories (batch version)
 * @deprecated Use findCollectionMatches for per-collection matching with user selection
 */
export function matchCollectionsToExisting(
  collections: string[] | CollectionMatchInfo[]
): TokenFileMatch[] {
  // Normalize input to CollectionMatchInfo
  const collectionsInfo: CollectionMatchInfo[] = typeof collections[0] === 'string'
    ? (collections as string[]).map(name => ({ name, modes: [] }))
    : collections as CollectionMatchInfo[];

  return collectionsInfo.map(c => findCollectionMatches(c));
}

/**
 * Print collection matching results
 */
export function printCollectionMatches(matches: TokenFileMatch[]): void {
  console.log('Collection → Directory Matching:');
  console.log('─'.repeat(50));

  for (const match of matches) {
    const icon =
      match.confidence === 'high' ? '✓' :
      match.confidence === 'medium' ? '◐' :
      match.confidence === 'low' ? '○' : '✗';

    if (match.matchedPath) {
      console.log(`  ${icon} ${match.collectionName} → ${match.matchedPath}`);
      if (match.confidence !== 'high') {
        console.log(`    (${match.reason})`);
      }
      // Show other candidates if multiple were found
      const otherCandidates = match.candidates.filter(c => c !== match.matchedPath);
      if (otherCandidates.length > 0) {
        console.log(`    Also found: ${otherCandidates.join(', ')}`);
      }
    } else {
      console.log(`  ${icon} ${match.collectionName} → (no match found)`);
    }
  }

  console.log();
}

// ============================================================================
// File Path Detection (for explicit file mapping)
// ============================================================================

export interface DetectedFileMapping {
  key: string;           // mode name or group name
  filePath: string;      // full path to the file
  exists: boolean;       // whether the file currently exists
}

export interface CollectionFileDetection {
  collectionName: string;
  strategy: 'byMode' | 'byGroup';
  baseDir: string;       // detected base directory
  files: DetectedFileMapping[];
}

/**
 * Represents an existing JSON file found in a directory
 */
export interface DiscoveredFile {
  filePath: string;      // Full path to the file
  fileName: string;      // Just the filename (e.g., "clarity.json")
  nameWithoutExt: string; // Filename without extension (e.g., "clarity")
  isTokenFile: boolean;  // Whether it has token structure
}

/**
 * Result of scanning a directory for existing files
 */
export interface DirectoryScanResult {
  directory: string;
  files: DiscoveredFile[];
  subdirectories: string[];
}

/**
 * Mapping suggestion for a mode/group to an existing file
 */
export interface FileMappingSuggestion {
  key: string;              // mode or group name from Figma
  suggestedFile: string | null;  // suggested existing file path (null if no match)
  confidence: 'high' | 'medium' | 'low' | 'none';
  alternatives: string[];   // other possible matches
  isNew: boolean;          // true if no existing file found
}

/**
 * Result of the file mapping process
 */
export interface FileMappingResult {
  collectionName: string;
  strategy: 'byMode' | 'byGroup';
  baseDir: string;
  availableFiles: DiscoveredFile[];  // All JSON files found in baseDir
  suggestions: FileMappingSuggestion[];  // Suggested mappings for each mode/group
}

/**
 * Scan a specific directory for JSON files
 * Returns all JSON files found (not recursive by default)
 */
export function scanDirectoryForFiles(
  directory: string,
  options: { recursive?: boolean; maxDepth?: number } = {}
): DirectoryScanResult {
  const { recursive = false, maxDepth = 1 } = options;
  const files: DiscoveredFile[] = [];
  const subdirectories: string[] = [];

  function scan(dir: string, depth: number) {
    if (depth > maxDepth) return;

    try {
      if (!fs.existsSync(dir)) {
        return;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip common non-token directories
          const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.figma', 'coverage'];
          if (ignoreDirs.includes(entry.name)) continue;

          subdirectories.push(fullPath);

          if (recursive && depth < maxDepth) {
            scan(fullPath, depth + 1);
          }
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          const nameWithoutExt = entry.name.replace(/\.json$/, '');
          files.push({
            filePath: fullPath,
            fileName: entry.name,
            nameWithoutExt,
            isTokenFile: isTokenFile(fullPath),
          });
        }
      }
    } catch {
      // Directory doesn't exist or permission error
    }
  }

  scan(directory, 0);

  return {
    directory,
    files,
    subdirectories,
  };
}

/**
 * Score how well a filename matches a key (mode or group name)
 * Handles patterns like "brand.nykredit.tokens" matching "nykredit"
 */
function scoreFileMatch(key: string, fileName: string): number {
  const keyLower = key.toLowerCase();
  const fileNameLower = fileName.toLowerCase();

  // Exact match
  if (keyLower === fileNameLower) return 1.0;

  // Split filename into segments (by dots, dashes, underscores)
  const fileSegments = fileNameLower.split(/[.\-_]/);

  // Check if key is one of the segments (e.g., "nykredit" in "brand.nykredit.tokens")
  if (fileSegments.includes(keyLower)) {
    return 0.95; // Very high confidence for segment match
  }

  // Check if any segment contains the key or vice versa
  for (const segment of fileSegments) {
    if (segment.includes(keyLower) || keyLower.includes(segment)) {
      // Longer match = better score
      const overlap = Math.min(segment.length, keyLower.length);
      const maxLen = Math.max(segment.length, keyLower.length);
      if (overlap >= 3) { // Minimum 3 chars to avoid false positives
        return 0.85 * (overlap / maxLen);
      }
    }
  }

  // Fall back to general string similarity
  return stringSimilarity(key, fileName);
}

/**
 * Find the best matching file for a given key (mode or group name)
 * Uses fuzzy matching to find files that might correspond to the key
 * Handles segmented filenames like "brand.nykredit.tokens.json"
 */
export function findBestFileMatch(
  key: string,
  availableFiles: DiscoveredFile[]
): { file: DiscoveredFile | null; confidence: 'high' | 'medium' | 'low' | 'none'; alternatives: DiscoveredFile[] } {
  if (availableFiles.length === 0) {
    return { file: null, confidence: 'none', alternatives: [] };
  }

  // Score each file against the key using enhanced matching
  const scored = availableFiles.map(file => {
    const score = scoreFileMatch(key, file.nameWithoutExt);
    return { file, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const alternatives = scored.slice(1, 4).filter(s => s.score >= 0.5).map(s => s.file);

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' | 'none';
  if (best.score >= 0.85) {
    confidence = 'high';
  } else if (best.score >= 0.7) {
    confidence = 'medium';
  } else if (best.score >= 0.5) {
    confidence = 'low';
  } else {
    confidence = 'none';
  }

  // Only return the match if it has some confidence
  if (confidence === 'none') {
    return { file: null, confidence: 'none', alternatives: scored.slice(0, 3).map(s => s.file) };
  }

  return { file: best.file, confidence, alternatives };
}

/**
 * Generate file mapping suggestions for a collection
 * Scans the target directory and suggests mappings for each mode/group
 */
export function generateFileMappingSuggestions(
  collectionName: string,
  keys: string[],  // mode names or group names
  strategy: 'byMode' | 'byGroup',
  targetDirectory?: string  // Optional: specific directory to scan
): FileMappingResult {
  let baseDir: string;
  let availableFiles: DiscoveredFile[] = [];

  if (targetDirectory) {
    // User specified a directory - scan it
    baseDir = targetDirectory;
    const scanResult = scanDirectoryForFiles(baseDir, { recursive: true, maxDepth: 10 });
    availableFiles = scanResult.files.filter(f => f.isTokenFile);
  } else {
    // No directory specified - search the entire codebase for matching files
    const allTokenFiles = findTokenDirectories('.', 10);

    // First pass: find files that match our keys (collection name or mode/group names)
    const matchingFiles: DiscoveredFile[] = [];
    const searchTerms = [collectionName, ...keys];

    for (const tokenItem of allTokenFiles) {
      if (tokenItem.type === 'file' && tokenItem.hasTokenStructure) {
        // Check if this file matches collection name or any key
        for (const term of searchTerms) {
          const score = scoreFileMatch(term, tokenItem.name);
          if (score >= 0.7) {
            matchingFiles.push({
              filePath: tokenItem.path,
              fileName: path.basename(tokenItem.path),
              nameWithoutExt: tokenItem.name,
              isTokenFile: true,
            });
            break; // Don't add same file multiple times
          }
        }
      }
    }

    if (matchingFiles.length > 0) {
      // Found matching files - use the directory of the first match as baseDir
      // Group files by directory and pick the one with most matches
      const dirCounts = new Map<string, number>();
      for (const file of matchingFiles) {
        const dir = path.dirname(file.filePath);
        dirCounts.set(dir, (dirCounts.get(dir) || 0) + 1);
      }

      // Find directory with most matching files
      let bestDir = '';
      let bestCount = 0;
      for (const [dir, count] of dirCounts) {
        if (count > bestCount) {
          bestCount = count;
          bestDir = dir;
        }
      }

      baseDir = bestDir;

      // Scan that directory to get all files (not just matching ones)
      const scanResult = scanDirectoryForFiles(baseDir, { recursive: false });
      availableFiles = scanResult.files.filter(f => f.isTokenFile);
    } else {
      // No matching files found - try findCollectionMatches as fallback
      const match = findCollectionMatches({ name: collectionName, modes: keys });
      baseDir = match.matchedPath || `tokens/${collectionName}`;

      const scanResult = scanDirectoryForFiles(baseDir, { recursive: true, maxDepth: 10 });
      availableFiles = scanResult.files.filter(f => f.isTokenFile);
    }
  }

  // Track which files have been assigned
  const assignedFiles = new Set<string>();

  // Generate suggestions for each key
  const suggestions: FileMappingSuggestion[] = [];

  for (const key of keys) {
    // Find best match among unassigned files
    const unassignedFiles = availableFiles.filter(f => !assignedFiles.has(f.filePath));
    const { file, confidence, alternatives } = findBestFileMatch(key, unassignedFiles);

    if (file && confidence !== 'none') {
      assignedFiles.add(file.filePath);
      suggestions.push({
        key,
        suggestedFile: file.filePath,
        confidence,
        alternatives: alternatives.map(a => a.filePath),
        isNew: false,
      });
    } else {
      // No match found - suggest creating new file
      suggestions.push({
        key,
        suggestedFile: null,
        confidence: 'none',
        alternatives: alternatives.map(a => a.filePath),
        isNew: true,
      });
    }
  }

  return {
    collectionName,
    strategy,
    baseDir,
    availableFiles,
    suggestions,
  };
}

/**
 * Create file mappings from suggestions
 * Maps each key to either its suggested file or a new file path
 */
export function createFileMappingsFromSuggestions(
  result: FileMappingResult,
  overrides?: { [key: string]: string }  // Manual overrides for specific keys
): DetectedFileMapping[] {
  const mappings: DetectedFileMapping[] = [];

  for (const suggestion of result.suggestions) {
    let filePath: string;

    // Check for manual override first
    if (overrides && overrides[suggestion.key]) {
      filePath = overrides[suggestion.key];
    } else if (suggestion.suggestedFile) {
      // Use suggested existing file (preserves original filename)
      filePath = suggestion.suggestedFile;
    } else {
      // Create new file path using key name
      filePath = path.join(result.baseDir, `${suggestion.key}.json`);
    }

    mappings.push({
      key: suggestion.key,
      filePath,
      exists: fs.existsSync(filePath),
    });
  }

  return mappings;
}

/**
 * Detect existing files for a collection's modes or groups
 * Searches for files matching mode/group names in the detected directory
 *
 * @deprecated Use generateFileMappingSuggestions for more control
 */
export function detectCollectionFiles(
  collectionName: string,
  modes: string[],
  groups: string[],
  strategy: 'byMode' | 'byGroup'
): CollectionFileDetection {
  const keys = strategy === 'byMode' ? modes : groups;
  const result = generateFileMappingSuggestions(collectionName, keys, strategy);
  const mappings = createFileMappingsFromSuggestions(result);

  return {
    collectionName,
    strategy,
    baseDir: result.baseDir,
    files: mappings,
  };
}

// ============================================================================
// Combined Detection
// ============================================================================

/**
 * Run all project detection
 */
export function detectProject(): ProjectDetection {
  return {
    paths: detectPaths(),
    build: detectBuildScripts(),
    styleDictionary: detectStyleDictionary(),
  };
}

/**
 * Print detection results
 */
export function printDetectionResults(detection: ProjectDetection): void {
  console.log('Project Analysis:');
  console.log('─'.repeat(40));

  // Paths
  if (detection.paths.tokens) {
    console.log(`  ✓ Token directory: ${detection.paths.tokens}`);
  } else {
    console.log('  ○ No token directory found');
  }

  if (detection.paths.styles) {
    console.log(`  ✓ Styles directory: ${detection.paths.styles}`);
  } else {
    console.log('  ○ No styles directory found');
  }

  // Build
  if (detection.build.command) {
    console.log(`  ✓ Build command: ${detection.build.command}`);
  } else if (detection.build.scripts.length > 0) {
    console.log(`  ○ Possible build scripts: ${detection.build.scripts.join(', ')}`);
  } else {
    console.log('  ○ No build script found');
  }

  // Style Dictionary
  if (detection.styleDictionary.found) {
    console.log(`  ✓ Style Dictionary: ${detection.styleDictionary.configPath}`);
    if (detection.styleDictionary.version) {
      console.log(`    Version: ${detection.styleDictionary.version}`);
    }
    if (detection.styleDictionary.platforms.length > 0) {
      console.log(`    Platforms: ${detection.styleDictionary.platforms.join(', ')}`);
    }
  } else if (detection.build.hasStyleDictionary) {
    console.log('  ○ Style Dictionary installed but no config found');
  } else {
    console.log('  ○ No Style Dictionary setup');
  }

  console.log();
}
