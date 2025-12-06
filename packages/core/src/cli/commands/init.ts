/**
 * Init Command
 *
 * Interactive setup wizard for configuring Synkio.
 * Creates tokensrc.json with user's choices.
 */

import fs from 'fs';
import path from 'path';
import { initContext } from '../../context.js';
import { fetchFigmaData } from '../../figma/index.js';
import { extractCollections, analyzeCollections } from '../../tokens/index.js';
import { saveConfig, findConfigFile } from '../../files/loader.js';
import type { TokensConfig } from '../../types/index.js';
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
// Figma URL Parsing
// ============================================================================

/**
 * Extract file ID from Figma URL
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
// Default Config Generation
// ============================================================================

/**
 * Create default configuration
 */
function createDefaultConfig(): TokensConfig {
  return {
    version: '1.0.0',
    figma: {
      fileId: '',
      accessToken: '${FIGMA_ACCESS_TOKEN}',
    },
    paths: {
      root: '.',
      data: 'figma-sync/.figma/data',
      baseline: 'figma-sync/.figma/data/baseline.json',
      baselinePrev: 'figma-sync/.figma/data/baseline.prev.json',
      reports: 'figma-sync/.figma/reports',
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
 */
async function runInteractiveSetup(rl: any): Promise<TokensConfig> {
  console.log(formatInfo('Welcome to Synkio! Let\'s set up your project.\n\nYou\'ll need:\n- Figma file URL\n- Figma access token (from figma.com/settings)'));

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

  // Validate connection
  const spinner = createSpinner('Connecting to Figma...');
  spinner.start();

  let fetchedData;
  try {
    fetchedData = await fetchFigmaData({
      fileId,
      nodeId: nodeId || undefined,
      accessToken: accessToken || undefined,
    });
    spinner.succeed('Connected to Figma successfully!');
  } catch (error) {
    spinner.fail('Failed to connect to Figma');
    throw new Error(
      `Could not fetch from Figma: ${error instanceof Error ? error.message : String(error)}\n\nPlease check:\n- Your access token is valid\n- The file ID is correct\n- You have access to the file`
    );
  }

  // Close and reopen readline interface after spinner
  // This fixes the conflict between ora and readline
  rl.close();
  rl = createPrompt();

  // Show found collections
  const collections = extractCollections(fetchedData);
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

  // Ask about output paths
  const useDefaults = await askYesNo(rl, 'Use default output paths? (figma-sync/.figma/data, tokens/)', true);

  if (!useDefaults) {
    const dataPath = await askText(rl, 'Data directory:', 'figma-sync/.figma/data');
    const tokensPath = await askText(rl, 'Tokens directory:', 'tokens');

    config.paths.data = dataPath;
    config.paths.baseline = path.join(dataPath, 'baseline.json');
    config.paths.baselinePrev = path.join(dataPath, 'baseline.prev.json');
    config.paths.tokens = tokensPath;
  }

  // Ask about build command
  const hasBuildCommand = await askYesNo(rl, 'Add a build command to run after sync? (e.g., "npm run tokens:build")', false);

  if (hasBuildCommand) {
    const buildCommand = await askText(rl, 'Build command:', 'npm run tokens:build');
    config.build = {
      command: buildCommand,
    };
  }

  return config;
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

  if (options.yes) {
    // Non-interactive mode
    config = runNonInteractiveSetup();
    console.log(formatInfo('Running in non-interactive mode...'));
  } else {
    // Interactive mode
    const rl = createPrompt();
    try {
      config = await runInteractiveSetup(rl);
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

  // Show success message
  console.log(formatSuccess(`Configuration saved to: ${configPath}\n\nNext steps:\n1. Set FIGMA_ACCESS_TOKEN in your .env file\n2. Run 'synkio sync' to fetch tokens from Figma`));
}
