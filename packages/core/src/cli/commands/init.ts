/**
 * Init Command
 *
 * Interactive setup wizard for configuring Synkio.
 * Creates tokensrc.json with user's choices.
 */

import fs from 'fs';
import path from 'path';
import * as readline from 'readline';
import { initContext, getContext } from '../../context.js';
import { fetchFigmaData } from '../../figma/index.js';
import { extractCollections, analyzeCollections } from '../../tokens/index.js';
import { saveConfig, findConfigFile } from '../../files/loader.js';
import { detectProject } from '../../detect/index.js';
import type { TokensConfig } from '../../types/index.js';
import type { ProjectDetection } from '../../detect/index.js';
import {
  askText,
  askYesNo,
  createPrompt,
} from '../prompt.js';
import {
  formatSuccess,
  formatInfo,
  formatWarning,
  createSpinner,
} from '../utils.js';

// ============================================================================
// Types
// ============================================================================

interface InitOptions {
  template?: string;
  yes?: boolean;
}

// ============================================================================
// Template Loading
// ============================================================================

/**
 * Load a template configuration
 */
function loadTemplate(templateName: string): Partial<TokensConfig> | null {
  const ctx = getContext();
  const templatesDir = path.join(process.cwd(), 'packages', 'core', 'templates');
  const templatePath = path.join(templatesDir, `tokensrc.${templateName}.json`);

  if (!fs.existsSync(templatePath)) {
    ctx.logger.warn(formatWarning(`Template "${templateName}" not found. Using defaults.`));
    return null;
  }

  try {
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    return JSON.parse(templateContent);
  } catch (error) {
    ctx.logger.warn(formatWarning(`Failed to load template "${templateName}". Using defaults.`));
    return null;
  }
}

// ============================================================================
// Filename Sanitization
// ============================================================================

/**
 * Sanitize mode/group name for use in filename
 *
 * Handles special characters, spaces, path traversal, and Windows reserved names.
 *
 * @param name - The name to sanitize
 * @returns A safe filename string
 *
 * @example
 * sanitizeForFilename('Dark / High Contrast') // => 'dark-high-contrast'
 * sanitizeForFilename('con') // => '_con' (Windows reserved)
 * sanitizeForFilename('../secrets') // => 'secrets' (path traversal)
 * sanitizeForFilename('   ') // => 'default' (empty fallback)
 */
function sanitizeForFilename(name: string): string {
  // Remove leading/trailing spaces
  let sanitized = name.trim();

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');

  // Replace path separators and special chars unsafe for filenames
  sanitized = sanitized.replace(/[\/\\:*?"<>|]/g, '-');

  // Replace spaces with hyphens
  sanitized = sanitized.replace(/\s+/g, '-');

  // Remove parentheses and brackets
  sanitized = sanitized.replace(/[\(\)\[\]]/g, '');

  // Convert to lowercase for consistency
  sanitized = sanitized.toLowerCase();

  // Remove consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Check for Windows reserved names
  const reserved = [
    'con', 'prn', 'aux', 'nul',
    'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
    'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
  ];
  if (reserved.includes(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  // Fallback to 'default' if empty after sanitization
  return sanitized || 'default';
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Get user-friendly error message with actionable steps
 *
 * Maps common Figma API errors to helpful messages that guide users
 * toward resolving the issue.
 *
 * @param error - Error object from Figma API or network request
 * @returns User-friendly error message with actionable steps
 */
function getHelpfulErrorMessage(error: any): string {
  const message = error?.message || String(error);
  const messageLower = message.toLowerCase();

  // 403 Forbidden / Unauthorized
  if (messageLower.includes('403') || messageLower.includes('forbidden') || messageLower.includes('unauthorized')) {
    return 'Access denied. Please check:\n  - Your access token is valid and not expired\n  - The token has permission to access this file\n  - You have at least "can view" access to the file';
  }

  // 404 Not Found
  if (messageLower.includes('404') || messageLower.includes('not found')) {
    return 'File not found. Please check:\n  - The file ID is correct\n  - The file hasn\'t been deleted\n  - The file URL is from figma.com (not figjam.com)';
  }

  // Network errors
  if (messageLower.includes('network') || messageLower.includes('econnrefused') || messageLower.includes('timeout')) {
    return 'Network connection failed. Please check:\n  - Your internet connection\n  - Firewall or proxy settings\n  - Try again in a few moments';
  }

  // Rate limiting
  if (messageLower.includes('rate limit') || messageLower.includes('429')) {
    return 'Rate limit exceeded. Please wait a moment and try again.';
  }

  // Generic fallback
  return `${message}\n\nPlease verify your Figma file ID and access token.`;
}

// ============================================================================
// Figma URL Parsing
// ============================================================================

/**
 * Extract file ID from Figma URL
 *
 * Supports multiple URL formats:
 * - https://www.figma.com/file/ABC123/...
 * - https://figma.com/design/ABC123/...
 * - ABC123 (just the ID)
 *
 * @param url - Figma URL or file ID
 * @returns File ID string or null if invalid
 *
 * @example
 * extractFileIdFromUrl('https://figma.com/file/abc123/My-Design')
 * // => 'abc123'
 */
function extractFileIdFromUrl(url: string): string | null {
  // Support formats:
  // - https://www.figma.com/file/ABC123/...
  // - https://figma.com/file/ABC123/...
  // - ABC123 (just the ID)
  const match = url.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/);
  if (match) {
    return match[1];
  }

  // Check if it's just an ID (alphanumeric)
  if (/^[a-zA-Z0-9]+$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Validate Figma URL format
 */
function validateFigmaUrl(url: string): boolean {
  return extractFileIdFromUrl(url) !== null;
}

// ============================================================================
// Migration Utilities
// ============================================================================

/**
 * Generate strip segments from collection information
 *
 * Extracts sanitized collection names, mode names, and common segments
 * to be used in migration configuration for removing path segments
 * from token names.
 *
 * @param collectionsInfo - Array of collection information
 * @returns Array of unique strip segment strings
 */
function generateStripSegments(collectionsInfo: any[]): string[] {
  const segments = new Set<string>();

  // Add collection names
  for (const info of collectionsInfo) {
    segments.add(sanitizeForFilename(info.name));

    // Add mode names
    for (const mode of info.modes) {
      segments.add(sanitizeForFilename(mode));
    }
  }

  // Add common segments that should be stripped
  segments.add('value');

  return Array.from(segments);
}

// ============================================================================
// Collection Configuration Utilities
// ============================================================================

/**
 * Get split strategy choices for a collection
 */
function getSplitStrategyChoices(): Array<{value: string; label: string; description: string}> {
  return [
    {
      value: 'byMode',
      label: 'Split by mode',
      description: 'One file per mode (e.g., light.json, dark.json)'
    },
    {
      value: 'byGroup',
      label: 'Split by group',
      description: 'One file per token group (e.g., color.json, spacing.json)'
    },
    {
      value: 'flat',
      label: 'Single file',
      description: 'All tokens in one file'
    },
    {
      value: 'skip',
      label: 'Skip this collection',
      description: 'Don\'t include in output'
    }
  ];
}

/**
 * Configure a single collection interactively (simplified)
 *
 * User explicitly chooses:
 * 1. Output directory path
 * 2. Split strategy (byMode, byGroup, flat, skip)
 *
 * No auto-detection or guessing - user is in full control.
 *
 * @param rl - Readline interface
 * @param info - Collection information with modes and groups
 * @returns Collection split configuration or null if skipped
 */
async function configureCollection(rl: readline.Interface, info: any): Promise<any | null> {
  const ctx = getContext();

  ctx.logger.info('\n' + '─'.repeat(60));
  ctx.logger.info(`📦  ${info.name}`);
  ctx.logger.info('─'.repeat(60));

  // Show summary
  const firstMode = info.modes[0];
  const groups = Object.keys(info.groups[firstMode] || {});
  const totalTokens = Object.values(info.groups[firstMode] || {}).reduce((sum: number, count) => sum + (count as number), 0);

  ctx.logger.info(`\n    Found in Figma:`);
  ctx.logger.info(`    • ${info.modes.length} mode${info.modes.length !== 1 ? 's' : ''}: ${info.modes.join(', ')}`);
  ctx.logger.info(`    • ${groups.length} group${groups.length !== 1 ? 's' : ''}: ${groups.slice(0, 4).join(', ')}${groups.length > 4 ? '...' : ''}`);
  ctx.logger.info(`    • ${totalTokens} tokens`);

  // Step 1: Choose split strategy
  const strategies = getSplitStrategyChoices();
  ctx.logger.info('\n    How do you want to organize the output files?\n');
  for (let i = 0; i < strategies.length; i++) {
    ctx.logger.info(`    ${i + 1}) ${strategies[i].label}`);
    ctx.logger.info(`       ${strategies[i].description}\n`);
  }

  const choiceStr = await askText(rl, '    Choose [1-4]', '1');
  const choiceIndex = parseInt(choiceStr) - 1;

  let selectedStrategy: string;
  if (choiceIndex < 0 || choiceIndex >= strategies.length) {
    selectedStrategy = strategies[0].value;
  } else {
    selectedStrategy = strategies[choiceIndex].value;
  }

  // Handle skip
  if (selectedStrategy === 'skip') {
    ctx.logger.info('\n    → Skipped (will not be exported)');
    return null;
  }

  // Step 2: User specifies output directory
  const defaultDir = `tokens/${sanitizeForFilename(info.name)}`;
  ctx.logger.info(`\n    Where should the files go?`);
  const outputDir = await askText(rl, `    Directory [${defaultDir}]`, defaultDir);

  // Step 3: Generate file mapping based on strategy
  const files: Record<string, string> = {};
  const keys = selectedStrategy === 'byMode' ? info.modes : groups;

  if (selectedStrategy === 'flat') {
    // All keys map to single file - user chooses filename
    const defaultFile = `${outputDir}/tokens.json`;
    const filename = await askText(rl, `    Filename [${defaultFile}]`, defaultFile);
    for (const key of keys) {
      files[key] = filename;
    }
  } else {
    // Each key gets its own file
    for (const key of keys) {
      const sanitizedKey = sanitizeForFilename(key);
      files[key] = `${outputDir}/${sanitizedKey}.json`;
    }

    // Show preview
    const uniqueFiles = Array.from(new Set(Object.values(files)));
    ctx.logger.info(`\n    Files that will be created:`);
    for (const file of uniqueFiles.slice(0, 6)) {
      ctx.logger.info(`    • ${file}`);
    }
    if (uniqueFiles.length > 6) {
      ctx.logger.info(`    • ... and ${uniqueFiles.length - 6} more`);
    }

    // Confirm or let user rename
    const confirmFiles = await askYesNo(rl, '\n    OK?', true);
    if (!confirmFiles) {
      ctx.logger.info('\n    Enter path for each:');
      for (const key of keys) {
        const defaultName = files[key];
        const customName = await askText(rl, `    ${key} [${defaultName}]`, defaultName);
        files[key] = customName;
      }
    }
  }

  // Brief confirmation
  const uniqueFiles = Array.from(new Set(Object.values(files)));
  ctx.logger.info(`\n    ✓ ${info.name}: ${selectedStrategy} → ${uniqueFiles.length} file${uniqueFiles.length !== 1 ? 's' : ''} in ${outputDir}/`);

  return {
    collection: info.name,
    strategy: selectedStrategy,
    output: outputDir,
    files
  };
}

// ============================================================================
// Default Config Generation
// ============================================================================

/**
 * Create default configuration
 */
function createDefaultConfig(): TokensConfig {
  return {
    $schema: 'https://unpkg.com/@synkio/core/schemas/tokensrc.schema.json',
    version: '1.0.0',
    figma: {
      fileId: '',
      accessToken: '${FIGMA_ACCESS_TOKEN}',
    },
    paths: {
      root: '.',
      data: '.figma/data',
      baseline: '.figma/data/baseline.json',
      baselinePrev: '.figma/data/baseline.prev.json',
      tokenMap: '.figma/data/token-map.json',
      reports: '.figma/reports',
      tokens: 'tokens',
      styles: 'styles/tokens',
    },
    collections: {},
  };
}

// ============================================================================
// Interactive Setup
// ============================================================================

/**
 * Run interactive setup
 * Returns config and raw access token for .env creation
 */
async function runInteractiveSetup(rl: any): Promise<{ config: TokensConfig; accessToken: string }> {
  const ctx = getContext();

  // Opening welcome message with realistic expectations
  ctx.logger.info(formatInfo(
    'Welcome to Synkio!\n\n' +
    'You\'ll need:\n' +
    '  • Figma file URL\n' +
    '  • Figma access token (figma.com/developers/api#access-tokens)\n'
  ));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 1: Project Detection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ctx.logger.info('━'.repeat(60));
  ctx.logger.info('Scanning project...');
  ctx.logger.info('━'.repeat(60));

  const detection = detectProject();

  // Display detection results clearly
  if (detection.styleDictionary.found) {
    ctx.logger.info(`\n✓ Found Style Dictionary (${detection.styleDictionary.version || '?'})`);
    if (detection.build.command) {
      ctx.logger.info(`  Build script: ${detection.build.command}`);
    }
  }

  if (detection.paths.tokens) {
    ctx.logger.info(`✓ Found token directory: ${detection.paths.tokens}`);
  }

  if (!detection.styleDictionary.found && !detection.paths.tokens) {
    ctx.logger.info('\n  No existing token setup detected. Starting fresh.');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 2: Figma Connection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ctx.logger.info('\n' + '━'.repeat(60));
  ctx.logger.info('Figma Connection');
  ctx.logger.info('━'.repeat(60) + '\n');

  // Get Figma file URL
  let figmaUrl = '';
  let fileId = '';
  while (!fileId) {
    figmaUrl = await askText(rl, 'Figma file URL or file ID:');

    if (!validateFigmaUrl(figmaUrl)) {
      ctx.logger.info(formatWarning('Invalid Figma URL. Please provide a valid URL like:\nhttps://www.figma.com/file/ABC123/...'));
      continue;
    }

    fileId = extractFileIdFromUrl(figmaUrl) as string;
  }

  // Get access token (no password masking in prompt module)
  const accessToken = await askText(rl, 'Figma access token:');

  // Get optional node ID
  const nodeId = await askText(rl, 'Figma node ID (optional, press Enter to skip):');

  // Validate connection - Retry loop for connection failures
  let fetchedData;
  let attempt = 0;
  const maxAttempts = 3;
  let success = false;

  while (!success && attempt < maxAttempts) {
    attempt++;
    const spinner = createSpinner(`Connecting to Figma... (attempt ${attempt}/${maxAttempts})`);
    spinner.start();

    try {
      fetchedData = await fetchFigmaData({
        fileId,
        nodeId: nodeId || undefined,
        accessToken: accessToken || undefined,
      });
      spinner.succeed('Connected to Figma successfully!');
      success = true;
    } catch (error) {
      spinner.fail('Connection failed');

      const helpfulMessage = getHelpfulErrorMessage(error);
      ctx.logger.info(formatWarning(`\\n${helpfulMessage}`));

      if (attempt < maxAttempts) {
        // Close and recreate readline after spinner to avoid ora/readline conflict
        rl.close();
        rl = createPrompt();

        const retry = await askYesNo(rl, 'Would you like to retry?', true);
        if (!retry) {
          throw new Error('Setup cancelled by user');
        }
      } else {
        throw new Error(`Failed to connect after ${maxAttempts} attempts. Setup cancelled.`);
      }
    }
  }

  // Close and reopen readline interface after spinner
  // This fixes the conflict between ora and readline
  rl.close();
  rl = createPrompt();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 3: Collection Analysis
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ctx.logger.info('\n' + '━'.repeat(60));
  ctx.logger.info('Analyzing Figma data...');
  ctx.logger.info('━'.repeat(60) + '\n');

  // Show found collections (fetchedData is guaranteed to be defined after successful fetch)
  const collections = extractCollections(fetchedData!);
  const collectionsInfo = analyzeCollections(collections);

  if (collectionsInfo.length > 0) {
    ctx.logger.info(`Found ${collectionsInfo.length} collection(s):`);
    for (const info of collectionsInfo) {
      // Get unique group names across all modes
      const allGroups = new Set<string>();
      for (const modeGroups of Object.values(info.groups)) {
        for (const groupName of Object.keys(modeGroups)) {
          allGroups.add(groupName);
        }
      }
      const groupList = Array.from(allGroups);

      ctx.logger.info(`  • ${info.name}`);
      ctx.logger.info(`    ${info.modes.length} mode${info.modes.length !== 1 ? 's' : ''}: ${info.modes.join(', ')}`);
      ctx.logger.info(`    ${groupList.length} group${groupList.length !== 1 ? 's' : ''}: ${groupList.slice(0, 5).join(', ')}${groupList.length > 5 ? '...' : ''}`);
    }
  } else {
    ctx.logger.warn(formatWarning('No collections found in this file.'));
  }

  // Create config
  const config = createDefaultConfig();
  config.figma.fileId = fileId;
  config.figma.accessToken = '${FIGMA_ACCESS_TOKEN}'; // Use env var placeholder
  if (nodeId) {
    config.figma.nodeId = nodeId;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 4: Configure Output
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (collectionsInfo.length > 0) {
    ctx.logger.info('\n' + '━'.repeat(60));
    ctx.logger.info('Configure output for each collection');
    ctx.logger.info('━'.repeat(60));

    // Initialize split config
    config.split = {};

    // Configure each collection
    for (const info of collectionsInfo) {
      const splitConfig = await configureCollection(rl, info);
      if (splitConfig) {
        config.split[info.name] = splitConfig;
      }
    }

    // Validate at least one collection configured
    if (Object.keys(config.split).length === 0) {
      ctx.logger.warn(formatWarning('\nNo collections configured. At least one collection is required.'));
      const restart = await askYesNo(rl, 'Would you like to restart configuration?', true);
      if (restart) {
        throw new Error('Restart requested - please run synkio init again');
      } else {
        throw new Error('Setup cancelled - no collections configured');
      }
    }

    // Check for path conflicts
    const allPaths = new Set<string>();
    const conflicts: string[] = [];
    for (const [collName, splitCfg] of Object.entries(config.split)) {
      const uniqueFiles = Array.from(new Set(Object.values(splitCfg.files)));
      for (const file of uniqueFiles) {
        if (allPaths.has(file)) {
          conflicts.push(file);
        }
        allPaths.add(file);
      }
    }

    if (conflicts.length > 0) {
      ctx.logger.warn(formatWarning(`\n⚠ Warning: Path conflicts detected:\n${conflicts.map(p => `  - ${p}`).join('\n')}`));
      ctx.logger.info(formatInfo('Multiple collections will write to the same file. This may cause data loss.'));
    }

    ctx.logger.info(formatSuccess(`\n✓ Configured ${Object.keys(config.split).length} collection(s)`));
  }

  // Ask about output paths
  ctx.logger.info('\n  ┌─────────────────────────────────────────────────────────');
  ctx.logger.info('  │ DATA STORAGE');
  ctx.logger.info('  └─────────────────────────────────────────────────────────');
  ctx.logger.info('     Synkio stores baseline and migration data locally.\n');

  const defaultDataPath = config.paths.data || '.figma/data';
  const useDefaults = await askYesNo(rl, `  Use ${defaultDataPath}?`, true);

  if (useDefaults) {
    config.paths.data = defaultDataPath;
    config.paths.baseline = path.join(defaultDataPath, 'baseline.json');
    config.paths.baselinePrev = path.join(defaultDataPath, 'baseline.prev.json');
    config.paths.tokenMap = path.join(defaultDataPath, 'token-map.json');
  } else {
    const dataPath = await askText(rl, '  Directory', defaultDataPath);
    config.paths.data = dataPath;
    config.paths.baseline = path.join(dataPath, 'baseline.json');
    config.paths.baselinePrev = path.join(dataPath, 'baseline.prev.json');
    config.paths.tokenMap = path.join(dataPath, 'token-map.json');
  }

  ctx.logger.info(`\n  ✓ ${config.paths.data}`);
  ctx.logger.info(`    Will create: baseline.json, token-map.json`);

  // Ask about build command
  ctx.logger.info('\n  ┌─────────────────────────────────────────────────────────');
  ctx.logger.info('  │ BUILD COMMAND (optional)');
  ctx.logger.info('  └─────────────────────────────────────────────────────────');
  ctx.logger.info('     Run after each sync (e.g., Style Dictionary).\n');

  let wantsBuild = false;

  if (detection.styleDictionary.found) {
    ctx.logger.info(`     Detected: Style Dictionary ${detection.styleDictionary.version || ''}`);
    if (detection.build.command) {
      ctx.logger.info(`     Build script: ${detection.build.command}`);
    }
    wantsBuild = await askYesNo(rl, '\n  Configure build?', true);
  } else {
    wantsBuild = await askYesNo(rl, '  Add build command?', false);
  }

  if (wantsBuild) {
    const defaultCommand = detection.build.command || 'npm run tokens:build';
    const buildCommand = await askText(rl, '  Command', defaultCommand);

    config.build = {
      command: buildCommand,
    };

    if (detection.styleDictionary.found) {
      const defaultConfig = detection.styleDictionary.configPath || 'style-dictionary.config.js';
      const sdConfig = await askText(rl, '  Config path', defaultConfig);

      config.build.styleDictionary = {
        enabled: true,
        config: sdConfig,
        version: detection.styleDictionary.version || 'v4',
      };
    }

    ctx.logger.info(`\n  ✓ Build: ${config.build.command}`);
  } else {
    ctx.logger.info('\n  ○ No build command');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Migration (optional)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const wantsMigration = await askYesNo(rl, '\n\n  Configure migration for breaking token changes?', false);

  if (wantsMigration) {
    ctx.logger.info('\n  ┌─────────────────────────────────────────────────────────');
    ctx.logger.info('  │ MIGRATION');
    ctx.logger.info('  └─────────────────────────────────────────────────────────');
    ctx.logger.info('     Auto-update code when token names change.');
    ctx.logger.info('     Synkio will scan your code to detect actual usage patterns.\n');

    // Ask for scan directory
    const scanDir = await askText(rl, '     Directory to scan', 'src');

    ctx.logger.info(`\n     Scanning ${scanDir}/ for token patterns...`);

    // Import and run pattern scanner
    const { scanForPatterns, formatPatternsForDisplay } = await import('../../detect/patterns.js');
    const scanResult = await scanForPatterns(scanDir);

    if (scanResult.patterns.length === 0) {
      ctx.logger.info('     No token usage patterns detected.');
      ctx.logger.info('     You can run `synkio migrate --scan` later.\n');
    } else {
      ctx.logger.info(`\n     Found ${scanResult.patterns.length} pattern(s):\n`);

      // Group by platform
      const byPlatform = new Map<string, typeof scanResult.patterns>();
      for (const pattern of scanResult.patterns) {
        if (!byPlatform.has(pattern.platform)) {
          byPlatform.set(pattern.platform, []);
        }
        byPlatform.get(pattern.platform)!.push(pattern);
      }

      // Show patterns and let user confirm each platform
      const enabledPlatforms: Record<string, any> = {};

      for (const [platform, patterns] of byPlatform) {
        const totalMatches = patterns.reduce((sum, p) => sum + p.matchCount, 0);
        const totalFiles = new Set(patterns.flatMap(p => p.files)).size;

        ctx.logger.info(`     ${platform.toUpperCase()}: ${totalMatches} matches in ${totalFiles} files`);
        for (const pattern of patterns.slice(0, 2)) {
          ctx.logger.info(`       Example: ${pattern.example}`);
        }

        const include = await askYesNo(rl, `     Include ${platform}?`, true);

        if (include) {
          // Build platform config from detected patterns
          enabledPlatforms[platform] = {
            enabled: true,
            include: patterns[0]?.includePaths || [`${scanDir}/**/*`],
            patterns: patterns.map(p => p.pattern),
          };
        }
        ctx.logger.info('');
      }

      if (Object.keys(enabledPlatforms).length > 0) {
        // Generate strip segments from collections
        const stripSegments = collectionsInfo.length > 0 ? generateStripSegments(collectionsInfo) : ['value'];

        config.migration = {
          autoApply: false,
          stripSegments,
          platforms: enabledPlatforms
        };

        ctx.logger.info(formatSuccess(`     ✓ Migration configured for ${Object.keys(enabledPlatforms).length} platform(s)`));
        ctx.logger.info('     Patterns detected from actual code usage.\n');
      } else {
        ctx.logger.info('     No platforms selected for migration.\n');
      }
    }
  }

  return { config, accessToken };
}

// ============================================================================
// Non-Interactive Setup
// ============================================================================

/**
 * Run non-interactive setup using environment variables
 */
function runNonInteractiveSetup(): TokensConfig {
  const figmaUrl = process.env.FIGMA_FILE_URL;
  const accessToken = process.env.FIGMA_ACCESS_TOKEN;

  if (!figmaUrl) {
    throw new Error('FIGMA_FILE_URL environment variable is required with --yes flag');
  }

  if (!accessToken) {
    throw new Error('FIGMA_ACCESS_TOKEN environment variable is required with --yes flag');
  }

  const fileId = extractFileIdFromUrl(figmaUrl);
  if (!fileId) {
    throw new Error(`Invalid Figma URL: ${figmaUrl}`);
  }

  const config = createDefaultConfig();
  config.figma.fileId = fileId;
  config.figma.accessToken = '${FIGMA_ACCESS_TOKEN}';

  if (process.env.FIGMA_NODE_ID) {
    config.figma.nodeId = process.env.FIGMA_NODE_ID;
  }

  return config;
}

// ============================================================================
// Main Command
// ============================================================================

/**
 * Init command handler
 */
export async function initCommand(options: InitOptions = {}): Promise<void> {
  // Initialize context
  initContext({ rootDir: process.cwd() });
  const ctx = getContext();

  // Check if config already exists
  const existingConfig = findConfigFile(process.cwd());
  if (existingConfig) {
    ctx.logger.warn(formatWarning(`Configuration already exists at: ${existingConfig}\n\nTo reconfigure, delete this file and run 'synkio init' again.`));
    return;
  }

  // Load template if provided
  let templateConfig: Partial<TokensConfig> | null = null;
  if (options.template) {
    templateConfig = loadTemplate(options.template);
  }

  // Run setup
  let config: TokensConfig;
  let rawAccessToken: string | undefined;

  if (options.yes) {
    // Non-interactive mode
    config = runNonInteractiveSetup();
    ctx.logger.info(formatInfo('Running in non-interactive mode...'));
  } else {
    // Interactive mode
    const rl = createPrompt();
    try {
      const result = await runInteractiveSetup(rl);
      config = result.config;
      rawAccessToken = result.accessToken;
    } finally {
      rl.close();
    }
  }

  // Merge with template if provided
  if (templateConfig) {
    config = {
      ...config,
      ...templateConfig,
      // Don't override figma config with template
      figma: config.figma,
      // Merge paths
      paths: {
        ...config.paths,
        ...templateConfig.paths,
      },
    };
  }

  // Save configuration
  const configPath = path.join(process.cwd(), 'tokensrc.json');
  await saveConfig(config, configPath);

  // Create or update .env file with access token (if provided)
  if (rawAccessToken) {
    const envPath = path.join(process.cwd(), '.env');
    const envExists = fs.existsSync(envPath);

    if (envExists) {
      // Read existing .env and update/add FIGMA_ACCESS_TOKEN
      let envContent = fs.readFileSync(envPath, 'utf-8');
      const tokenLine = `FIGMA_ACCESS_TOKEN=${rawAccessToken}`;

      if (envContent.includes('FIGMA_ACCESS_TOKEN=')) {
        // Replace existing token
        envContent = envContent.replace(/FIGMA_ACCESS_TOKEN=.*/g, tokenLine);
      } else {
        // Append new token
        envContent += `\n${tokenLine}\n`;
      }

      fs.writeFileSync(envPath, envContent, 'utf-8');
      ctx.logger.info(formatInfo('Updated FIGMA_ACCESS_TOKEN in existing .env file'));
    } else {
      // Create new .env file
      fs.writeFileSync(envPath, `FIGMA_ACCESS_TOKEN=${rawAccessToken}\n`, 'utf-8');
      ctx.logger.info(formatSuccess('Created .env file with FIGMA_ACCESS_TOKEN'));
    }
  }

  // Show success message
  ctx.logger.info('\n' + '━'.repeat(60));
  ctx.logger.info('Setup complete!');
  ctx.logger.info('━'.repeat(60));
  ctx.logger.info(`\nSaved: ${configPath}`);

  const nextSteps = rawAccessToken
    ? '\nRun \'synkio sync\' to fetch tokens.'
    : '\nNext:\n  1. Add FIGMA_ACCESS_TOKEN to .env\n  2. Run \'synkio sync\'';

  ctx.logger.info(nextSteps);
}
