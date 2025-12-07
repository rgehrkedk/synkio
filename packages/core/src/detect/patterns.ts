/**
 * Token Usage Pattern Detection
 *
 * Scans codebase for actual token usage patterns.
 * Detects how tokens are referenced in CSS, SCSS, TypeScript, Swift, Kotlin.
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// ============================================================================
// Types
// ============================================================================

export interface DetectedPattern {
  /** Platform identifier */
  platform: 'css' | 'scss' | 'typescript' | 'swift' | 'kotlin';
  /** Human-readable pattern description */
  format: string;
  /** Regex pattern for matching */
  pattern: string;
  /** Example from actual code */
  example: string;
  /** Number of matches found */
  matchCount: number;
  /** Files where pattern was found */
  files: string[];
  /** File glob patterns that cover the matches */
  includePaths: string[];
}

export interface PatternMatch {
  file: string;
  line: number;
  content: string;
  token: string;
  platform: 'css' | 'scss' | 'typescript' | 'swift' | 'kotlin';
  format: string;
}

export interface PatternScanResult {
  /** All detected patterns grouped by platform */
  patterns: DetectedPattern[];
  /** Total files scanned */
  filesScanned: number;
  /** Total matches found */
  totalMatches: number;
  /** Sample matches for preview */
  sampleMatches: PatternMatch[];
}

// ============================================================================
// Pattern Definitions
// ============================================================================

/**
 * Known token usage patterns per platform
 * Each pattern has a regex and a format description
 */
const KNOWN_PATTERNS: Array<{
  platform: DetectedPattern['platform'];
  format: string;
  /** Regex with named group 'token' */
  regex: RegExp;
  /** File extensions to scan */
  extensions: string[];
}> = [
  // CSS patterns
  {
    platform: 'css',
    format: 'var(--{token})',
    regex: /var\(\s*--(?<token>[\w-]+)\s*\)/g,
    extensions: ['.css', '.module.css'],
  },
  {
    platform: 'css',
    format: '--{token}:',
    regex: /--(?<token>[\w-]+)\s*:/g,
    extensions: ['.css', '.module.css'],
  },
  // SCSS patterns
  {
    platform: 'scss',
    format: '${token}',
    regex: /\$(?<token>[\w-]+)(?![:\w-])/g,
    extensions: ['.scss', '.sass'],
  },
  {
    platform: 'scss',
    format: '#{${token}}',
    regex: /#\{\s*\$(?<token>[\w-]+)\s*\}/g,
    extensions: ['.scss', '.sass'],
  },
  // TypeScript/JavaScript patterns
  {
    platform: 'typescript',
    format: 'tokens.{token}',
    regex: /tokens\.(?<token>[\w.]+)(?![:\w])/g,
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  {
    platform: 'typescript',
    format: "tokens['{token}']",
    regex: /tokens\[\s*['"](?<token>[\w.-]+)['"]\s*\]/g,
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  {
    platform: 'typescript',
    format: 'theme.{token}',
    regex: /theme\.(?<token>[\w.]+)(?![:\w])/g,
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  // Swift patterns
  {
    platform: 'swift',
    format: 'DesignTokens.{token}',
    regex: /DesignTokens\.(?<token>[\w.]+)/g,
    extensions: ['.swift'],
  },
  {
    platform: 'swift',
    format: 'Color.{token}',
    regex: /Color\.(?<token>[\w.]+)/g,
    extensions: ['.swift'],
  },
  {
    platform: 'swift',
    format: 'Tokens.{token}',
    regex: /Tokens\.(?<token>[\w.]+)/g,
    extensions: ['.swift'],
  },
  // Kotlin patterns
  {
    platform: 'kotlin',
    format: 'AppTheme.{token}',
    regex: /AppTheme\.(?<token>[\w.]+)/g,
    extensions: ['.kt', '.kts'],
  },
  {
    platform: 'kotlin',
    format: 'R.color.{token}',
    regex: /R\.color\.(?<token>[\w_]+)/g,
    extensions: ['.kt', '.kts'],
  },
  {
    platform: 'kotlin',
    format: 'R.dimen.{token}',
    regex: /R\.dimen\.(?<token>[\w_]+)/g,
    extensions: ['.kt', '.kts'],
  },
];

// ============================================================================
// Scanning Functions
// ============================================================================

/**
 * Scan a directory for token usage patterns
 * 
 * @param rootDir - Directory to scan
 * @param knownTokens - Optional list of known token names to validate matches
 * @param exclude - Glob patterns to exclude
 */
export async function scanForPatterns(
  rootDir: string,
  knownTokens?: string[],
  exclude: string[] = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
): Promise<PatternScanResult> {
  const patternMap = new Map<string, DetectedPattern>();
  const allMatches: PatternMatch[] = [];
  let filesScanned = 0;

  // Group patterns by extension for efficient scanning
  const extensionPatterns = new Map<string, typeof KNOWN_PATTERNS>();
  for (const pattern of KNOWN_PATTERNS) {
    for (const ext of pattern.extensions) {
      if (!extensionPatterns.has(ext)) {
        extensionPatterns.set(ext, []);
      }
      extensionPatterns.get(ext)!.push(pattern);
    }
  }

  // Build glob pattern for all extensions
  const extensions = Array.from(extensionPatterns.keys());
  const globPattern = `**/*{${extensions.join(',')}}`;

  // Find all files
  const files = await glob(globPattern, {
    cwd: rootDir,
    ignore: exclude,
    nodir: true,
    absolute: false,
  });

  // Scan each file
  for (const relativeFile of files) {
    const filePath = path.join(rootDir, relativeFile);
    const ext = path.extname(relativeFile);
    const patterns = extensionPatterns.get(ext);

    if (!patterns || !fs.existsSync(filePath)) continue;

    filesScanned++;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check each pattern
      for (const patternDef of patterns) {
        // Reset regex state
        patternDef.regex.lastIndex = 0;

        let match;
        while ((match = patternDef.regex.exec(content)) !== null) {
          const token = match.groups?.token;
          if (!token) continue;

          // Optional: validate against known tokens
          if (knownTokens && knownTokens.length > 0) {
            const normalizedToken = normalizeToken(token);
            const isKnown = knownTokens.some(kt => 
              normalizeToken(kt) === normalizedToken ||
              normalizedToken.includes(normalizeToken(kt)) ||
              normalizeToken(kt).includes(normalizedToken)
            );
            if (!isKnown) continue;
          }

          // Find line number
          const beforeMatch = content.substring(0, match.index);
          const lineNumber = beforeMatch.split('\n').length;
          const lineContent = lines[lineNumber - 1]?.trim() || '';

          // Create pattern key for grouping
          const patternKey = `${patternDef.platform}:${patternDef.format}`;

          // Update or create detected pattern
          if (!patternMap.has(patternKey)) {
            patternMap.set(patternKey, {
              platform: patternDef.platform,
              format: patternDef.format,
              pattern: regexToPatternString(patternDef.regex),
              example: match[0],
              matchCount: 0,
              files: [],
              includePaths: [],
            });
          }

          const detected = patternMap.get(patternKey)!;
          detected.matchCount++;
          if (!detected.files.includes(relativeFile)) {
            detected.files.push(relativeFile);
          }

          // Record match
          allMatches.push({
            file: relativeFile,
            line: lineNumber,
            content: lineContent,
            token,
            platform: patternDef.platform,
            format: patternDef.format,
          });
        }
      }
    } catch (error) {
      // Skip files we can't read
      continue;
    }
  }

  // Generate include paths from matched files
  for (const detected of patternMap.values()) {
    detected.includePaths = generateIncludePaths(detected.files);
  }

  // Sort patterns by match count (most used first)
  const patterns = Array.from(patternMap.values())
    .sort((a, b) => b.matchCount - a.matchCount);

  // Sample matches (first 5 per pattern)
  const sampleMatches: PatternMatch[] = [];
  for (const pattern of patterns) {
    const matchesForPattern = allMatches
      .filter(m => m.platform === pattern.platform && m.format === pattern.format)
      .slice(0, 5);
    sampleMatches.push(...matchesForPattern);
  }

  return {
    patterns,
    filesScanned,
    totalMatches: allMatches.length,
    sampleMatches,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize token name for comparison
 */
function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[-_.]/g, '')
    .replace(/\./g, '');
}

/**
 * Convert regex to pattern string for config
 */
function regexToPatternString(regex: RegExp): string {
  return regex.source
    .replace('(?<token>', '{token}')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/[+*?]/g, '');
}

/**
 * Generate glob include paths from list of files
 */
function generateIncludePaths(files: string[]): string[] {
  if (files.length === 0) return [];

  // Group files by directory
  const dirCounts = new Map<string, number>();
  for (const file of files) {
    const dir = path.dirname(file);
    dirCounts.set(dir, (dirCounts.get(dir) || 0) + 1);
  }

  // Find common patterns
  const paths: string[] = [];
  const processedDirs = new Set<string>();

  for (const [dir, count] of dirCounts) {
    if (processedDirs.has(dir)) continue;

    // Check if parent directory covers multiple subdirs
    const parts = dir.split(path.sep);
    let bestPath = dir;

    for (let i = parts.length - 1; i >= 0; i--) {
      const parentDir = parts.slice(0, i + 1).join(path.sep);
      const childDirs = Array.from(dirCounts.keys())
        .filter(d => d.startsWith(parentDir + path.sep) || d === parentDir);
      
      if (childDirs.length >= 2) {
        bestPath = parentDir;
        childDirs.forEach(d => processedDirs.add(d));
        break;
      }
    }

    if (!processedDirs.has(dir)) {
      processedDirs.add(dir);
    }

    // Determine extension pattern
    const filesInDir = files.filter(f => f.startsWith(bestPath));
    const extensions = new Set(filesInDir.map(f => path.extname(f)));
    
    let extPattern: string;
    if (extensions.size === 1) {
      extPattern = `*${Array.from(extensions)[0]}`;
    } else {
      extPattern = `*{${Array.from(extensions).join(',')}}`;
    }

    const globPath = `${bestPath}/**/${extPattern}`;
    if (!paths.includes(globPath)) {
      paths.push(globPath);
    }
  }

  return paths;
}

/**
 * Format detected patterns for display
 */
export function formatPatternsForDisplay(result: PatternScanResult): string {
  const lines: string[] = [];

  lines.push(`Scanned ${result.filesScanned} files, found ${result.totalMatches} token usages\n`);

  if (result.patterns.length === 0) {
    lines.push('No token usage patterns detected.');
    return lines.join('\n');
  }

  // Group by platform
  const byPlatform = new Map<string, DetectedPattern[]>();
  for (const pattern of result.patterns) {
    if (!byPlatform.has(pattern.platform)) {
      byPlatform.set(pattern.platform, []);
    }
    byPlatform.get(pattern.platform)!.push(pattern);
  }

  for (const [platform, patterns] of byPlatform) {
    const totalMatches = patterns.reduce((sum, p) => sum + p.matchCount, 0);
    const totalFiles = new Set(patterns.flatMap(p => p.files)).size;

    lines.push(`┌─────────────────────────────────────────────────────────`);
    lines.push(`│ ${platform.toUpperCase()} (${totalFiles} files, ${totalMatches} matches)`);
    lines.push(`└─────────────────────────────────────────────────────────`);

    for (const pattern of patterns) {
      lines.push(`  Pattern: ${pattern.format}`);
      lines.push(`  Example: ${pattern.example}`);
      lines.push(`  Files:   ${pattern.includePaths.join(', ')}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================================================
// Exports
// ============================================================================

export { KNOWN_PATTERNS };
