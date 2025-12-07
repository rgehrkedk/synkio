/**
 * Init Command
 *
 * Interactive setup wizard for configuring Synkio.
 * Creates tokensrc.json with user's choices.
 */

import fs from 'fs';
import path from 'path';
import * as readline from 'readline';
import { initContext } from '../../context.js';
import { fetchFigmaData } from '../../figma/index.js';
import { extractCollections, analyzeCollections } from '../../tokens/index.js';
import { saveConfig, findConfigFile } from '../../files/loader.js';
import { detectProject } from '../../detect/index.js';
import { PLATFORM_CHOICES, createPlatformsConfig } from '../../adapters/defaults.js';
import type { TokensConfig } from '../../types/index.js';
import type { ProjectDetection } from '../../detect/index.js';
import type { PlatformType } from '../../adapters/defaults.js';
import {
  askText,
  askYesNo,
  askMultipleChoice,
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
  const templatesDir = path.join(process.cwd(), 'packages', 'core', 'templates');
  const templatePath = path.join(templatesDir, `tokensrc.${templateName}.json`);

  if (!fs.existsSync(templatePath)) {
    console.warn(formatWarning(`Template "${templateName}" not found. Using defaults.`));
    return null;
  }

  try {
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    return JSON.parse(templateContent);
  } catch (error) {
    console.warn(formatWarning(`Failed to load template "${templateName}". Using defaults.`));
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
  console.log('\n' + '─'.repeat(60));
  console.log(`Collection: ${info.name}`);
  console.log('─'.repeat(60));
  
  // Show summary
  const firstMode = info.modes[0];
  const groups = Object.keys(info.groups[firstMode] || {});
  const totalTokens = Object.values(info.groups[firstMode] || {}).reduce((sum: number, count) => sum + (count as number), 0);
  
  console.log(`\n  Modes: ${info.modes.join(', ')} (${info.modes.length})`);
  console.log(`  Groups: ${groups.slice(0, 5).join(', ')}${groups.length > 5 ? ` (+${groups.length - 5} more)` : ''}`);
  console.log(`  Total tokens: ${totalTokens}`);
  
  // Step 1: Choose split strategy
  const strategies = getSplitStrategyChoices();
  console.log('\n1. How should this collection be split?');
  for (let i = 0; i < strategies.length; i++) {
    console.log(`   ${i + 1}. ${strategies[i].label} - ${strategies[i].description}`);
  }
  
  const choiceStr = await askText(rl, 'Choose (1-4)', '1');
  const choiceIndex = parseInt(choiceStr) - 1;
  
  let selectedStrategy: string;
  if (choiceIndex < 0 || choiceIndex >= strategies.length) {
    selectedStrategy = strategies[0].value;
  } else {
    selectedStrategy = strategies[choiceIndex].value;
  }
  
  // Handle skip
  if (selectedStrategy === 'skip') {
    console.log('  → Skipped');
    return null;
  }
  
  // Step 2: User specifies output directory
  const defaultDir = `tokens/${sanitizeForFilename(info.name)}`;
  console.log('\n2. Where should the files be saved?');
  const outputDir = await askText(rl, 'Output directory', defaultDir);
  
  // Step 3: Generate file mapping based on strategy
  const files: Record<string, string> = {};
  const keys = selectedStrategy === 'byMode' ? info.modes : groups;
  
  if (selectedStrategy === 'flat') {
    // All keys map to single file - user chooses filename
    const defaultFile = `${outputDir}/tokens.json`;
    console.log('\n3. What should the file be named?');
    const filename = await askText(rl, 'Filename', defaultFile);
    for (const key of keys) {
      files[key] = filename;
    }
  } else {
    // Each key gets its own file
    console.log(`\n3. Files will be created in: ${outputDir}/`);
    console.log('   File naming: Each ' + (selectedStrategy === 'byMode' ? 'mode' : 'group') + ' becomes a file');
    
    for (const key of keys) {
      const sanitizedKey = sanitizeForFilename(key);
      files[key] = `${outputDir}/${sanitizedKey}.json`;
    }
    
    // Show preview
    const uniqueFiles = Array.from(new Set(Object.values(files)));
    console.log('\n   Files to be created:');
    for (const file of uniqueFiles.slice(0, 5)) {
      console.log(`   - ${file}`);
    }
    if (uniqueFiles.length > 5) {
      console.log(`   ... and ${uniqueFiles.length - 5} more`);
    }
    
    // Confirm or let user rename
    const confirmFiles = await askYesNo(rl, 'Accept these file names?', true);
    if (!confirmFiles) {
      console.log('\n   Enter custom filenames (or press Enter to keep default):');
      for (const key of keys) {
        const defaultName = files[key];
        const customName = await askText(rl, `   ${key}`, defaultName);
        files[key] = customName;
      }
    }
  }
  
  console.log(`  → Configured: ${selectedStrategy} → ${outputDir}`);
  
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
  // Opening welcome message with realistic expectations
  console.log(formatInfo(
    'Welcome to Synkio! Let\'s set up your project.\n\n' +
    'This will take about 5-10 minutes with 12-20 questions.\n\n' +
    'You\'ll need:\n' +
    '- Figma file URL\n' +
    '- Figma access token (from figma.com/settings)\n' +
    '- Details about how you want tokens organized'
  ));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 1: Project Detection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n' + '━'.repeat(60));
  console.log('Step 1: Project Detection');
  console.log('━'.repeat(60) + '\n');

  const detection = detectProject();

  // Display detection results
  if (detection.styleDictionary.found) {
    console.log(`✓ Style Dictionary ${detection.styleDictionary.version || ''} detected`);
    if (detection.styleDictionary.configPath) {
      console.log(`  Config: ${detection.styleDictionary.configPath}`);
    }
    if (detection.build.command) {
      console.log(`  Build: ${detection.build.command}`);
    }
  } else {
    console.log('○ No Style Dictionary setup detected');
  }

  if (detection.paths.tokens) {
    console.log(`✓ Token directory found: ${detection.paths.tokens}`);
  } else {
    console.log('○ No token directory detected (defaults to tokens/)');
  }

  if (detection.paths.styles) {
    console.log(`✓ Styles directory found: ${detection.paths.styles}`);
  } else {
    console.log('○ No styles directory detected (defaults to styles/tokens)');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 2: Figma Connection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n' + '━'.repeat(60));
  console.log('Step 2: Figma Connection');
  console.log('━'.repeat(60) + '\n');

  // Get Figma file URL
  let figmaUrl = '';
  let fileId = '';
  while (!fileId) {
    figmaUrl = await askText(rl, 'Figma file URL or file ID:');

    if (!validateFigmaUrl(figmaUrl)) {
      console.log(formatWarning('Invalid Figma URL. Please provide a valid URL like:\nhttps://www.figma.com/file/ABC123/...'));
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
      console.log(formatWarning(`\\n${helpfulMessage}`));

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
  console.log('\n' + '━'.repeat(60));
  console.log('Step 3: Collection Analysis');
  console.log('━'.repeat(60) + '\n');

  // Show found collections (fetchedData is guaranteed to be defined after successful fetch)
  const collections = extractCollections(fetchedData!);
  const collectionsInfo = analyzeCollections(collections);

  if (collectionsInfo.length > 0) {
    console.log(formatInfo(`Found ${collectionsInfo.length} collection(s):\n${collectionsInfo.map(info => {
      return `- ${info.name} (${info.modes.length} mode${info.modes.length !== 1 ? 's' : ''})`;
    }).join('\n')}`));
  } else {
    console.log(formatWarning('No collections found in this file.'));
  }

  // Create config
  const config = createDefaultConfig();
  config.figma.fileId = fileId;
  config.figma.accessToken = '${FIGMA_ACCESS_TOKEN}'; // Use env var placeholder
  if (nodeId) {
    config.figma.nodeId = nodeId;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 4: Collection Configuration
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (collectionsInfo.length > 0) {
    console.log('\n' + '━'.repeat(60));
    console.log('Step 4: Collection Configuration');
    console.log('━'.repeat(60));
    console.log(formatInfo(`\nYou'll configure how each collection should be organized.`));

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
      console.log(formatWarning('\nNo collections configured. At least one collection is required.'));
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
      console.log(formatWarning(`\n⚠ Warning: Path conflicts detected:\n${conflicts.map(p => `  - ${p}`).join('\n')}`));
      console.log(formatInfo('Multiple collections will write to the same file. This may cause data loss.'));
    }

    console.log(formatSuccess(`\n✓ Configured ${Object.keys(config.split).length} collection(s)`));
  }

  // Ask about output paths
  const defaultDataPath = config.paths.data || '.figma/data';
  const useDefaults = await askYesNo(rl, `\nUse default output paths? (${defaultDataPath})`, true);

  if (useDefaults) {
    config.paths.data = defaultDataPath;
    config.paths.baseline = path.join(defaultDataPath, 'baseline.json');
    config.paths.baselinePrev = path.join(defaultDataPath, 'baseline.prev.json');
    config.paths.tokenMap = path.join(defaultDataPath, 'token-map.json');
    console.log(formatSuccess(`\n✓ Using default data directory: ${defaultDataPath}`));
  } else {
    const dataPath = await askText(rl, 'Data directory:', defaultDataPath);
    config.paths.data = dataPath;
    config.paths.baseline = path.join(dataPath, 'baseline.json');
    config.paths.baselinePrev = path.join(dataPath, 'baseline.prev.json');
    config.paths.tokenMap = path.join(dataPath, 'token-map.json');
    console.log(formatSuccess(`\n✓ Using custom data directory: ${dataPath}`));
  }

  // Use detection results for build configuration
  if (detection.styleDictionary.found) {
    // Auto-configure Style Dictionary integration
    config.build = {
      command: detection.build.command || 'npm run tokens:build',
      styleDictionary: {
        enabled: true,
        config: detection.styleDictionary.configPath || 'style-dictionary.config.js',
        version: detection.styleDictionary.version || 'v4',
      }
    };
    console.log(formatSuccess('\n✓ Style Dictionary integration configured automatically'));
  } else {
    // Ask about build command
    const hasBuildCommand = await askYesNo(rl, '\nAdd a build command to run after sync? (e.g., "npm run tokens:build")', false);

    if (hasBuildCommand) {
      const buildCommand = await askText(rl, 'Build command:', 'npm run tokens:build');
      config.build = {
        command: buildCommand,
      };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 5: Optional Migration Configuration
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const wantsMigration = await askYesNo(rl, '\n\nOptional: Configure automatic migration for breaking token changes?', false);

  if (wantsMigration) {
    console.log('\n' + '━'.repeat(60));
    console.log('Step 5: Migration Configuration');
    console.log('━'.repeat(60));
    console.log(formatInfo('\nMigration helps update your codebase when token names change.\nThis is useful for refactoring and maintaining consistency.\n'));

    // Ask which platforms to configure
    const platformLabels = PLATFORM_CHOICES.map(p => `${p.label} - ${p.description}`);
    const selected = await askMultipleChoice(
      rl,
      'Which platforms would you like to configure?',
      platformLabels,
      ['CSS - CSS custom properties (--token-name)']
    );

    // Map selections back to platform types
    const selectedPlatforms: PlatformType[] = [];
    for (const selection of selected) {
      const index = platformLabels.indexOf(selection);
      if (index >= 0) {
        selectedPlatforms.push(PLATFORM_CHOICES[index].value);
      }
    }

    // Generate strip segments from collections
    const stripSegments = collectionsInfo.length > 0 ? generateStripSegments(collectionsInfo) : ['value'];

    // Create platform configs
    const platforms = createPlatformsConfig(selectedPlatforms);

    // Add migration config with stripSegments at root level
    config.migration = {
      autoApply: false,
      stripSegments,
      platforms
    };

    console.log(formatSuccess(`\n✓ Migration configured for ${selectedPlatforms.length} platform(s)`));
    console.log(formatInfo('Note: autoApply is set to false for safety. Review migrations before applying.'));
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

  // Check if config already exists
  const existingConfig = findConfigFile(process.cwd());
  if (existingConfig) {
    console.log(formatWarning(`Configuration already exists at: ${existingConfig}\n\nTo reconfigure, delete this file and run 'synkio init' again.`));
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
    console.log(formatInfo('Running in non-interactive mode...'));
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
      console.log(formatInfo('Updated FIGMA_ACCESS_TOKEN in existing .env file'));
    } else {
      // Create new .env file
      fs.writeFileSync(envPath, `FIGMA_ACCESS_TOKEN=${rawAccessToken}\n`, 'utf-8');
      console.log(formatSuccess('Created .env file with FIGMA_ACCESS_TOKEN'));
    }
  }

  // Show success message
  const nextSteps = rawAccessToken 
    ? 'Next step:\n  Run \'synkio sync\' to fetch tokens from Figma'
    : 'Next steps:\n  1. Set FIGMA_ACCESS_TOKEN in your .env file\n  2. Run \'synkio sync\' to fetch tokens from Figma';
  
  console.log(formatSuccess(`Configuration saved to: ${configPath}\n\n${nextSteps}`));
}
