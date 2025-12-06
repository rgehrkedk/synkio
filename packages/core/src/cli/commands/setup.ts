/**
 * Figma Setup
 *
 * One-time setup script for configuring Figma token sync.
 * Creates tokensrc.json and performs initial sync.
 *
 * Usage:
 *   npm run figma:setup
 */

import fs from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';

// Load environment variables in priority order
// Package .env > .env.local > .env
loadEnv();
loadEnv({ path: '.env.local' });
const packageEnvPath = 'figma-sync/.figma/.env';
if (fs.existsSync(packageEnvPath)) {
  loadEnv({ path: packageEnvPath, override: true });
}

import { initContext } from '../../context.js';
import type { TokensConfig, CollectionInfo, CollectionSplitConfig, PlatformConfig } from '../../types/index.js';

import {
  loadConfig,
  saveConfig,
  saveJsonFile,
  ensureFigmaDir,
  getConfigPath,
  getBaselinePath,
} from '../../files/index.js';

import { fetchFigmaData } from '../../figma/index.js';
import { extractCollections, analyzeCollections, splitTokens } from '../../tokens/index.js';
import {
  createPrompt,
  askYesNo,
  askText,
  askChoice,
  askMultipleChoiceToggle,
} from '../prompt.js';
import { detectAndParseStyleDictionary, mapSDPlatformToAdapter } from '../../style-dictionary/index.js';
import { PLATFORM_CHOICES, createPlatformsConfig, type PlatformType } from '../../adapters/index.js';
import {
  detectProject,
  printDetectionResults,
  generateFileMappingSuggestions,
  findCollectionMatches,
  type ProjectDetection,
  type FileMappingResult,
  type DiscoveredFile,
} from '../../detect/index.js';
import {
  scaffoldStyleDictionary,
  detectModuleType,
  addBuildScript,
} from '../../detect/scaffold.js';

// ============================================================================
// Config Templates
// ============================================================================

/**
 * Default config template (with detected values)
 */
function createDefaultConfig(detection: ProjectDetection): TokensConfig {
  return {
    $schema: './schemas/tokensrc.schema.json',
    version: '1.0.0',
    figma: {
      fileId: '',
      nodeId: '',
      accessToken: '${FIGMA_ACCESS_TOKEN}',
    },
    paths: {
      data: 'figma-sync/.figma/data',
      baseline: 'figma-sync/.figma/data/baseline.json',
      baselinePrev: 'figma-sync/.figma/data/baseline.prev.json',
      reports: 'figma-sync/.figma/reports',
      tokens: detection.paths.tokens || 'tokens',
      styles: detection.paths.styles || 'styles/tokens',
    },
    split: {},
    migration: {
      autoApply: false,
      platforms: {},
    },
  };
}

/**
 * Save access token to package .env file
 */
function saveAccessToken(token: string): void {
  const envPath = 'figma-sync/.figma/.env';
  const envDir = path.dirname(envPath);

  // Ensure directory exists
  if (!fs.existsSync(envDir)) {
    fs.mkdirSync(envDir, { recursive: true });
  }

  const content = `# Figma API credentials
# This file is gitignored - safe for secrets
FIGMA_ACCESS_TOKEN=${token}
`;

  fs.writeFileSync(envPath, content);
  console.log(`Token saved to ${envPath}\n`);
  process.env.FIGMA_ACCESS_TOKEN = token;
}

/**
 * Generate stripSegments dynamically from collections
 */
function generateStripSegments(collectionsInfo: CollectionInfo[]): string[] {
  const segments = new Set<string>();

  // Add collection names
  for (const info of collectionsInfo) {
    segments.add(info.name);

    // Add mode names
    for (const mode of info.modes) {
      segments.add(mode);
    }
  }

  // Add common segments that should be stripped
  segments.add('value');

  return Array.from(segments);
}

// ============================================================================
// Interactive Configuration
// ============================================================================

/**
 * Configure output paths
 */
async function configureOutputPaths(
  rl: ReturnType<typeof createPrompt>,
  detection: ProjectDetection
): Promise<{ tokens: string; styles: string }> {
  console.log('\n' + '━'.repeat(60));
  console.log('Output Paths');
  console.log('━'.repeat(60));

  let tokensPath = detection.paths.tokens;
  let stylesPath = detection.paths.styles;

  if (tokensPath) {
    console.log(`\nDetected token directory: ${tokensPath}`);
    const useDetected = await askYesNo(rl, 'Use this directory for token JSON files?', true);
    if (!useDetected) {
      tokensPath = null;
    }
  }

  if (!tokensPath) {
    const suggestions = detection.paths.suggestions.tokens;
    const defaultPath = suggestions[0] || 'tokens';
    tokensPath = await askText(rl, 'Token JSON output directory', defaultPath);
  }

  if (stylesPath) {
    console.log(`\nDetected styles directory: ${stylesPath}`);
    const useDetected = await askYesNo(rl, 'Use this directory for generated CSS?', true);
    if (!useDetected) {
      stylesPath = null;
    }
  }

  if (!stylesPath) {
    const suggestions = detection.paths.suggestions.styles;
    const defaultPath = suggestions[0] || 'styles/tokens';
    stylesPath = await askText(rl, 'Generated CSS output directory', defaultPath);
  }

  return { tokens: tokensPath, styles: stylesPath };
}

/** Build setup result */
interface BuildSetupResult {
  command: string | null;
  needsOutputPath: boolean;
  outputPath?: string;
  styleDictionary?: {
    configPath: string;
    version?: 'v3' | 'v4';
  };
}

/**
 * Configure build setup
 * Returns command, output path, and SD config info if detected
 */
async function configureBuildSetup(
  rl: ReturnType<typeof createPrompt>,
  detection: ProjectDetection,
  tokensPath: string
): Promise<BuildSetupResult> {
  console.log('\n' + '━'.repeat(60));
  console.log('Build Setup');
  console.log('━'.repeat(60));

  // If existing build command found
  if (detection.build.command) {
    console.log(`\nDetected build command: ${detection.build.command}`);
    const useDetected = await askYesNo(rl, 'Use this command after sync?', true);
    if (useDetected) {
      // Existing build - include SD config info if detected
      const result: BuildSetupResult = { command: detection.build.command, needsOutputPath: false };
      if (detection.styleDictionary.found && detection.styleDictionary.configPath) {
        result.styleDictionary = {
          configPath: detection.styleDictionary.configPath,
          version: detection.styleDictionary.version || undefined,
        };
      }
      return result;
    }
  }

  // If Style Dictionary found but no build command
  if (detection.styleDictionary.found && !detection.build.command) {
    console.log(`\nStyle Dictionary config found: ${detection.styleDictionary.configPath}`);
    console.log('But no build script detected in package.json.');

    const addScript = await askYesNo(rl, 'Add "tokens:build" script to package.json?', true);
    if (addScript) {
      const command = 'style-dictionary build';
      const added = addBuildScript('tokens:build', command);
      if (added) {
        console.log('Added script: "tokens:build"');
        // Existing SD config - include SD config info
        return {
          command: 'npm run tokens:build',
          needsOutputPath: false,
          styleDictionary: {
            configPath: detection.styleDictionary.configPath!,
            version: detection.styleDictionary.version || undefined,
          },
        };
      } else {
        console.log('Could not add script (already exists or package.json not found)');
      }
    }
  }

  // No Style Dictionary - offer options
  if (!detection.styleDictionary.found) {
    console.log('\nNo Style Dictionary setup detected.');
    console.log('Style Dictionary transforms token JSON into CSS/SCSS/etc.\n');

    const buildChoice = await askChoice(rl, 'How do you want to handle token transformation?', [
      {
        value: 'skip' as const,
        label: 'Skip build step',
        description: 'Just sync JSON files, no CSS generation',
      },
      {
        value: 'custom' as const,
        label: 'Enter custom build command',
        description: 'Use your own script',
      },
      {
        value: 'scaffold' as const,
        label: 'Set up Style Dictionary (recommended)',
        description: 'Create basic config for CSS output',
      },
    ], 2);

    if (buildChoice === 'skip') {
      return { command: null, needsOutputPath: false };
    }

    if (buildChoice === 'custom') {
      const command = await askText(rl, 'Build command to run after sync', '');
      return { command: command || null, needsOutputPath: false };
    }

    if (buildChoice === 'scaffold') {
      // Scaffolding - we need to ask for output path BEFORE creating the config
      console.log('\n' + '━'.repeat(60));
      console.log('Build Output');
      console.log('━'.repeat(60));

      let stylesPath = detection.paths.styles || '';
      if (stylesPath) {
        console.log(`\nDetected styles directory: ${stylesPath}`);
        const useDetected = await askYesNo(rl, 'Use this for generated CSS?', true);
        if (!useDetected) {
          stylesPath = '';
        }
      }
      if (!stylesPath) {
        const defaultStyles = detection.paths.suggestions.styles[0] || 'styles/tokens';
        stylesPath = await askText(rl, 'Generated CSS output directory', defaultStyles);
      }

      console.log('\nSetting up Style Dictionary...');

      const moduleType = detectModuleType();
      const result = scaffoldStyleDictionary({
        tokensPath,
        outputPath: stylesPath,
        platforms: ['css'],
        useEsm: moduleType === 'esm',
      });

      console.log(`Created: ${result.configPath}`);

      // Add build script
      const scriptName = 'tokens:build';
      const added = addBuildScript(scriptName, result.buildCommand);
      if (added) {
        console.log(`Added script: "${scriptName}"`);
      }

      return {
        command: `npm run ${scriptName}`,
        needsOutputPath: false,
        outputPath: stylesPath,
        styleDictionary: {
          configPath: result.configPath,
          version: 'v4', // Scaffolded configs use v4 format
        },
      };
    }
  }

  // Ask for custom command
  const command = await askText(rl, 'Build command (or Enter to skip)', '');
  return { command: command || null, needsOutputPath: false };
}

/**
 * Configure token format
 */
async function configureTokenFormat(rl: ReturnType<typeof createPrompt>): Promise<{ useDollarPrefix: boolean }> {
  console.log('\n' + '━'.repeat(60));
  console.log('Token Format');
  console.log('━'.repeat(60));

  const format = await askChoice(rl, 'Choose token format:', [
    {
      value: 'legacy' as const,
      label: 'Style Dictionary legacy (type, value)',
      description: 'Recommended for Style Dictionary v3',
    },
    {
      value: 'dtcg' as const,
      label: 'W3C DTCG format ($type, $value)',
      description: 'Standard format with $ prefix (Style Dictionary v4+)',
    },
  ], 0);

  return { useDollarPrefix: format === 'dtcg' };
}

/**
 * Configure Style Dictionary integration
 */
async function configureStyleDictionary(
  rl: ReturnType<typeof createPrompt>
): Promise<{ enabled: boolean; platforms: PlatformType[] }> {
  console.log('\n' + '━'.repeat(60));
  console.log('Style Dictionary Integration');
  console.log('━'.repeat(60));

  const sdResult = detectAndParseStyleDictionary();

  if (sdResult.found && sdResult.configPath) {
    console.log(`\nFound Style Dictionary config at: ${sdResult.configPath}`);

    const useSD = await askYesNo(rl, 'Use Style Dictionary transforms?', true);

    if (useSD && sdResult.platforms.length > 0) {
      const detectedPlatforms = sdResult.platforms.map(p => mapSDPlatformToAdapter(p.name)) as PlatformType[];
      const validPlatforms = detectedPlatforms.filter(p =>
        PLATFORM_CHOICES.some(c => c.value === p)
      );

      if (validPlatforms.length > 0) {
        console.log('\nDetected platforms from SD config:');
        for (const platform of validPlatforms) {
          const choice = PLATFORM_CHOICES.find(c => c.value === platform);
          if (choice) {
            console.log(`  ✓ ${choice.label} (${choice.description})`);
          }
        }
        console.log('\nPlatform adapters configured automatically.\n');

        return { enabled: true, platforms: validPlatforms };
      }
    }

    if (useSD) {
      console.log('\nStyle Dictionary enabled, but no platforms auto-detected.');
      console.log('Proceeding to manual platform selection.\n');
      return { enabled: true, platforms: [] };
    }
  } else {
    console.log('\nNo Style Dictionary config detected.');
  }

  return { enabled: false, platforms: [] };
}

/**
 * Configure platform adapters manually
 */
async function configurePlatformAdapters(
  rl: ReturnType<typeof createPrompt>,
  stripSegments: string[]
): Promise<Record<string, PlatformConfig>> {
  console.log('\n' + '━'.repeat(60));
  console.log('Platform Adapters');
  console.log('━'.repeat(60));

  const selectedPlatforms = await askMultipleChoiceToggle<PlatformType>(
    rl,
    'Which platforms should be scanned for token usage?',
    PLATFORM_CHOICES,
    ['css'] // Default to CSS
  );

  if (selectedPlatforms.length === 0) {
    console.log('\nNo platforms selected. Using CSS as default.\n');
    const configs = createPlatformsConfig(['css']);
    // Apply dynamic stripSegments
    for (const config of Object.values(configs)) {
      config.transform.stripSegments = stripSegments;
    }
    return configs;
  }

  // Get platform configs and apply dynamic stripSegments
  const platformConfigs = createPlatformsConfig(selectedPlatforms);
  for (const config of Object.values(platformConfigs)) {
    config.transform.stripSegments = stripSegments;
  }

  for (const platform of selectedPlatforms) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`${platform.toUpperCase()} Adapter Settings`);
    console.log('─'.repeat(40));

    const customize = await askYesNo(rl, `Customize ${platform} adapter?`, false);

    if (customize) {
      const config = platformConfigs[platform];

      const includePatterns = await askText(
        rl,
        'File patterns to include (comma-separated)',
        config.include.join(', ')
      );
      config.include = includePatterns.split(',').map(s => s.trim()).filter(Boolean);

      const excludePatterns = await askText(
        rl,
        'File patterns to exclude (comma-separated)',
        config.exclude.join(', ')
      );
      config.exclude = excludePatterns.split(',').map(s => s.trim()).filter(Boolean);

      const stripSegs = await askText(
        rl,
        'Path segments to strip from token names (comma-separated)',
        config.transform.stripSegments.join(', ')
      );
      config.transform.stripSegments = stripSegs.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  return platformConfigs;
}

/**
 * Display available files in a directory for mapping
 */
function displayAvailableFiles(files: DiscoveredFile[], baseDir: string): void {
  if (files.length === 0) {
    console.log(`  (no JSON files found in ${baseDir})`);
    return;
  }

  const tokenFiles = files.filter(f => f.isTokenFile);
  const otherFiles = files.filter(f => !f.isTokenFile);

  if (tokenFiles.length > 0) {
    console.log(`  Found ${tokenFiles.length} token file(s) in ${baseDir}:`);
    for (const file of tokenFiles) {
      console.log(`    • ${file.fileName}`);
    }
  }

  if (otherFiles.length > 0 && tokenFiles.length === 0) {
    console.log(`  Found ${otherFiles.length} JSON file(s) in ${baseDir} (not token files)`);
  }
}

/**
 * Display the current file mapping with status
 */
function displayFileMapping(
  mappingResult: FileMappingResult,
  overrides: { [key: string]: string }
): void {
  for (const suggestion of mappingResult.suggestions) {
    const override = overrides[suggestion.key];
    let filePath: string;
    let status: string;
    let icon: string;

    if (override) {
      filePath = override;
      const exists = fs.existsSync(override);
      icon = exists ? '✓' : '+';
      status = exists ? 'mapped manually' : 'new';
    } else if (suggestion.suggestedFile) {
      filePath = suggestion.suggestedFile;
      icon = '✓';
      status = `matched (${suggestion.confidence})`;
    } else {
      filePath = path.join(mappingResult.baseDir, `${suggestion.key}.json`);
      icon = '+';
      status = 'will create';
    }

    // Extract just the filename for display
    const fileName = path.basename(filePath);

    console.log(`  ${icon} ${suggestion.key} → ${fileName} (${status})`);
  }
}

/**
 * Interactive file mapping for a single mode/group
 */
async function mapSingleFile(
  rl: ReturnType<typeof createPrompt>,
  key: string,
  availableFiles: DiscoveredFile[],
  baseDir: string,
  currentPath: string | null
): Promise<string> {
  console.log(`\n  Mapping: ${key}`);

  // Build choices
  const choices: Array<{ value: string; label: string; description?: string }> = [];

  // Option to keep current/suggested
  if (currentPath) {
    const fileName = path.basename(currentPath);
    choices.push({
      value: 'keep',
      label: `Keep current: ${fileName}`,
      description: fs.existsSync(currentPath) ? 'file exists' : 'will create',
    });
  }

  // Add available files as options
  for (const file of availableFiles) {
    if (file.isTokenFile) {
      choices.push({
        value: file.filePath,
        label: file.fileName,
        description: 'existing token file',
      });
    }
  }

  // Option to enter custom path
  choices.push({
    value: 'custom',
    label: 'Enter custom path...',
  });

  // Option to create new with key name
  const defaultNewPath = path.join(baseDir, `${key}.json`);
  if (!currentPath || currentPath !== defaultNewPath) {
    choices.push({
      value: 'new',
      label: `Create new: ${key}.json`,
    });
  }

  const choice = await askChoice(rl, `Select file for "${key}":`, choices, 0);

  if (choice === 'keep' && currentPath) {
    return currentPath;
  } else if (choice === 'custom') {
    const customPath = await askText(rl, 'Enter file path', defaultNewPath);
    return customPath;
  } else if (choice === 'new') {
    return defaultNewPath;
  } else {
    return choice;
  }
}

/**
 * Configure a single collection with explicit file paths
 * Shows each file that will be created/overwritten and asks for confirmation
 */
async function configureCollectionWithFiles(
  rl: ReturnType<typeof createPrompt>,
  info: CollectionInfo
): Promise<CollectionSplitConfig | null> {
  // Get groups from first mode
  const firstMode = info.modes[0];
  const groups = firstMode && info.groups[firstMode]
    ? Object.keys(info.groups[firstMode])
    : [];

  // Calculate total tokens
  const totalTokens = Object.values(info.groups).reduce(
    (sum, modeGroups) => sum + Object.values(modeGroups).reduce((s, c) => s + c, 0),
    0
  );

  let strategy: 'byMode' | 'byGroup' | 'single';

  // For multi-mode collections, strategy is always byMode
  if (info.modes.length > 1) {
    strategy = 'byMode';
    console.log(`\n${info.name} (${info.modes.length} modes, ~${totalTokens} tokens)`);
  } else {
    // Single mode - ask user for strategy
    console.log(`\n${info.name} (1 mode, ${groups.length} groups, ~${totalTokens} tokens)`);

    const strategyChoices = [
      {
        value: 'single' as const,
        label: 'Single file',
        description: `All tokens in one file`,
      },
      {
        value: 'byGroup' as const,
        label: 'Split by group',
        description: `${groups.length} files (${groups.slice(0, 3).join(', ')}${groups.length > 3 ? '...' : ''})`,
      },
      {
        value: 'skip' as const,
        label: 'Skip this collection',
      },
    ];

    const chosen = await askChoice(rl, 'Output format:', strategyChoices, 0);

    if (chosen === 'skip') {
      return null;
    }

    strategy = chosen;
  }

  // Determine keys to map (modes or groups)
  const keys = strategy === 'byMode' ? info.modes : (strategy === 'byGroup' ? groups : [info.name]);
  const detectStrategy = strategy === 'single' ? 'byGroup' : strategy;

  // Find potential base directory
  const collectionMatch = findCollectionMatches({ name: info.name, modes: info.modes });
  let baseDir = collectionMatch.matchedPath || `tokens/${info.name}`;

  // Generate initial mapping suggestions
  let mappingResult = generateFileMappingSuggestions(info.name, keys, detectStrategy, baseDir);

  // Track manual overrides
  let overrides: { [key: string]: string } = {};

  // Main configuration loop
  let configuring = true;
  while (configuring) {
    console.log(`\n${'─'.repeat(50)}`);

    // Show available files
    if (mappingResult.availableFiles.length > 0) {
      displayAvailableFiles(mappingResult.availableFiles, baseDir);
      console.log();
    }

    // Show current mapping
    console.log(`  Current mapping:`);
    displayFileMapping(mappingResult, overrides);

    // Build action choices
    const actionChoices: Array<{ value: string; label: string; description?: string }> = [
      { value: 'accept', label: 'Accept this mapping' },
    ];

    // Only show "Map individual files" if there are files to map
    if (keys.length > 1 || mappingResult.availableFiles.length > 0) {
      actionChoices.push({
        value: 'map',
        label: 'Map individual files',
        description: 'Choose specific files for each mode/group',
      });
    }

    actionChoices.push({
      value: 'directory',
      label: 'Change directory',
      description: `Currently: ${baseDir}`,
    });

    actionChoices.push({
      value: 'skip',
      label: 'Skip this collection',
    });

    const action = await askChoice(rl, 'Action:', actionChoices, 0);

    if (action === 'accept') {
      configuring = false;
    } else if (action === 'skip') {
      return null;
    } else if (action === 'directory') {
      // Change base directory
      const newBaseDir = await askText(rl, 'Enter directory path', baseDir);

      if (newBaseDir !== baseDir) {
        baseDir = newBaseDir;
        // Re-scan the new directory
        mappingResult = generateFileMappingSuggestions(info.name, keys, detectStrategy, baseDir);
        // Clear overrides since directory changed
        overrides = {};
        console.log(`\nScanned ${baseDir}`);
      }
    } else if (action === 'map') {
      // Map individual files
      console.log('\n  Map each mode/group to a file:');

      for (const key of keys) {
        const currentSuggestion = mappingResult.suggestions.find(s => s.key === key);
        const currentPath = overrides[key] || currentSuggestion?.suggestedFile || null;

        const newPath = await mapSingleFile(
          rl,
          key,
          mappingResult.availableFiles,
          baseDir,
          currentPath
        );

        // Only store as override if different from suggestion
        if (newPath !== currentSuggestion?.suggestedFile) {
          overrides[key] = newPath;
        } else {
          delete overrides[key];
        }
      }
    }
  }

  // Build final file mapping
  const files: { [key: string]: string } = {};

  if (strategy === 'single') {
    // For single file, map all groups to the same file
    const singleFilePath = overrides[info.name] ||
      mappingResult.suggestions[0]?.suggestedFile ||
      path.join(baseDir, `${info.name}.json`);

    for (const group of groups) {
      files[group] = singleFilePath;
    }
  } else {
    // Map each key to its file
    for (const suggestion of mappingResult.suggestions) {
      files[suggestion.key] = overrides[suggestion.key] ||
        suggestion.suggestedFile ||
        path.join(baseDir, `${suggestion.key}.json`);
    }
  }

  return {
    collection: info.name,
    strategy: strategy === 'single' ? 'byGroup' : strategy,
    output: baseDir,
    files,
  };
}

/**
 * Configure all collections with explicit file paths
 */
async function configureAllCollections(
  rl: ReturnType<typeof createPrompt>,
  collectionsInfo: CollectionInfo[]
): Promise<Record<string, CollectionSplitConfig>> {
  const configs: Record<string, CollectionSplitConfig> = {};

  console.log('\nScanning codebase for existing token files...');

  for (const info of collectionsInfo) {
    const config = await configureCollectionWithFiles(rl, info);
    if (config) {
      configs[info.name] = config;
    }
  }

  return configs;
}

// ============================================================================
// Main Setup Flow
// ============================================================================

async function main() {
  // Initialize context
  initContext({ rootDir: process.cwd() });

  console.log('\n' + '='.repeat(60));
  console.log('  Figma Token Sync Setup');
  console.log('='.repeat(60) + '\n');

  const rl = createPrompt();

  try {
    // Check for existing config
    const existingConfig = loadConfig();
    if (existingConfig) {
      console.log(`Found existing config: ${getConfigPath()}\n`);
      const overwrite = await askYesNo(rl, 'Overwrite existing configuration?', false);
      if (!overwrite) {
        console.log('\nSetup cancelled. Existing config preserved.');
        rl.close();
        process.exit(0);
      }
      console.log();
    }

    // Detect project setup
    console.log('Analyzing project...\n');
    const detection = detectProject();
    printDetectionResults(detection);

    // Ensure .figma directory exists
    ensureFigmaDir();

    // Create config with detected values
    const config = createDefaultConfig(detection);

    // ========================================
    // Figma Connection Setup
    // ========================================

    console.log('━'.repeat(60));
    console.log('Figma Connection');
    console.log('━'.repeat(60));

    // Check for Figma access token
    const envToken = process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_TOKEN;
    if (envToken) {
      console.log('\n✓ Figma access token found in environment.');
    } else {
      console.log('\nNo Figma access token found.');
      console.log('Get your token from: https://www.figma.com/developers/api#access-tokens\n');

      const token = await askText(rl, 'Enter Figma access token (or press Enter to skip)');
      if (token) {
        saveAccessToken(token);
      }
    }

    // Ask for Figma file ID
    console.log('\nYou can find the file ID in the Figma URL:');
    console.log('https://www.figma.com/file/[FILE_ID]/...\n');

    const fileId = await askText(rl, 'Enter Figma file ID');
    if (!fileId) {
      console.log('\nFile ID is required. Setup cancelled.');
      rl.close();
      process.exit(1);
    }
    config.figma.fileId = fileId;

    // Ask for node ID (from Figma plugin)
    console.log('\nThe node ID comes from the "Token Vault" Figma plugin.');
    console.log('It identifies the registry node where tokens are exported.\n');

    const nodeId = await askText(rl, 'Enter registry node ID');
    if (nodeId) {
      config.figma.nodeId = nodeId;
    }

    // Test connection and fetch initial data
    console.log('\nTesting connection to Figma...');

    // Get the access token (either from env or just entered)
    const accessToken = process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_TOKEN;

    console.log(`[DEBUG] Access token available: ${accessToken ? 'YES' : 'NO'}`);
    console.log(`[DEBUG] File ID: ${config.figma.fileId}`);
    console.log(`[DEBUG] Node ID: ${config.figma.nodeId || '(none)'}`);

    let baseline;
    try {
      baseline = await fetchFigmaData({
        fileId: config.figma.fileId,
        nodeId: config.figma.nodeId || undefined,
        accessToken: accessToken || undefined,
      });
      console.log('✓ Connection successful!\n');
    } catch (error) {
      console.error(`✗ Connection failed: ${error instanceof Error ? error.message : error}`);
      console.log('\nCheck your file ID and access token, then run setup again.');
      rl.close();
      process.exit(1);
    }

    // Save baseline
    saveJsonFile(getBaselinePath(), baseline);
    console.log(`Saved baseline: ${getBaselinePath()}`);

    // Analyze structure
    const collections = extractCollections(baseline);
    const collectionsInfo = analyzeCollections(collections);

    console.log('\nDetected collections:');
    for (const info of collectionsInfo) {
      const totalTokens = Object.values(info.groups).reduce(
        (sum, groups) => sum + Object.values(groups).reduce((s, c) => s + c, 0),
        0
      );
      console.log(`  - ${info.name}: ${info.modes.length} mode(s), ~${totalTokens} tokens`);
    }

    // Generate dynamic stripSegments
    const stripSegments = generateStripSegments(collectionsInfo);

    // ========================================
    // Collection Output Files
    // ========================================

    console.log('\n' + '━'.repeat(60));
    console.log('Collection Output Files');
    console.log('━'.repeat(60));

    // Configure all collections with explicit file paths
    // Strategy is inferred: multiple modes = byMode, single mode = byGroup
    const collectionConfigs = await configureAllCollections(rl, collectionsInfo);
    config.split = collectionConfigs;

    // Use first collection's base path as the general tokens path
    const firstConfig = Object.values(collectionConfigs)[0];
    const tokensBasePath = firstConfig?.output || 'tokens';
    config.paths.tokens = tokensBasePath.split('/').slice(0, -1).join('/') || tokensBasePath;

    // ========================================
    // Build Configuration
    // ========================================

    // Configure build (Style Dictionary or custom) - function prints its own header
    const buildConfig = await configureBuildSetup(rl, detection, config.paths.tokens);

    if (buildConfig.command) {
      config.build = { command: buildConfig.command };

      // Save Style Dictionary config path if detected
      if (buildConfig.styleDictionary) {
        config.build.styleDictionary = buildConfig.styleDictionary;
      }

      // If scaffolding provided an output path, use it
      // Otherwise use detected styles path for migration scanning
      const stylesPath = buildConfig.outputPath || detection.paths.styles || '';
      if (stylesPath) {
        config.paths.styles = stylesPath;
      }
    } else {
      delete config.build;
      // No build tool - tokens will just be JSON files
      console.log('\nNo build tool configured. Token JSON files will be synced directly.');
    }

    // ========================================
    // Platform Adapters
    // ========================================

    // Use default CSS platform with dynamic stripSegments
    const platformConfigs = createPlatformsConfig(['css']);
    for (const platformConfig of Object.values(platformConfigs)) {
      platformConfig.transform.stripSegments = stripSegments;
    }
    if (config.migration) {
      config.migration.platforms = platformConfigs;
    }

    // Save config
    saveConfig(config);
    console.log(`\nSaved config: ${getConfigPath()}`);

    // Split tokens
    console.log('\nSplitting tokens...\n');
    const splitResult = splitTokens(baseline, config);

    console.log(`Tokens split: ${splitResult.filesWritten} files, ${splitResult.tokensProcessed} tokens`);

    // Build if configured
    if (config.build?.command) {
      console.log(`\nRunning build: ${config.build.command}`);
      const { execSync } = await import('child_process');
      try {
        execSync(config.build.command, { stdio: 'inherit' });
      } catch {
        console.log(`\nWarning: Build failed. Run "${config.build.command}" manually.`);
      }
    }

    // Done!
    console.log('\n' + '='.repeat(60));
    console.log('  Setup Complete!');
    console.log('='.repeat(60) + '\n');

    console.log('Files created:');
    console.log(`  - ${getConfigPath()} (configuration)`);
    console.log(`  - ${getBaselinePath()} (Figma data)`);
    console.log(`  - ${config.paths.tokens}/*/*.json (token files)`);
    if (config.build?.command) {
      console.log(`  - ${config.paths.styles}/*.css (CSS variables)`);
    }

    console.log('\nNext steps:');
    console.log('  1. Review figma-sync/.figma/config/tokensrc.json');
    console.log('  2. Run "npm run figma:sync" to sync changes from Figma');
    console.log('  3. Run "npm run figma:diff" to preview changes without syncing');

    rl.close();
  } catch (error) {
    console.error(`\nSetup failed: ${error instanceof Error ? error.message : error}`);
    rl.close();
    process.exit(1);
  }
}

main();
