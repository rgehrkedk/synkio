#!/usr/bin/env node
import 'dotenv/config';
import { createRequire } from 'node:module';

import { initCommand } from './commands/init.js';
import { pullCommand, pullWatchCommand } from './commands/pull.js';
import { buildCommand } from './commands/build.js';
import { diffCommand } from './commands/diff.js';
import { rollbackCommand } from './commands/rollback.js';
import { validateCommand } from './commands/validate.js';
import { tokensCommand } from './commands/tokens.js';
import { docsCommand } from './commands/docs.js';
import { importCommand } from './commands/import.js';
import { exportBaselineCommand } from './commands/export-baseline.js';
import { serveCommand } from './commands/serve.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

const args = process.argv.slice(2);
const command = args[0];

function parseArgs(args: string[]) {
    const options: { [key: string]: string | boolean } = {};
    const commandArgs = args.slice(1);

    for (let i = 0; i < commandArgs.length; i++) {
        const arg = commandArgs[i];

        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            const camelCaseKey = key.replaceAll(/-([a-z])/g, g => g[1].toUpperCase());

            if (value === undefined) {
                // Check if next arg is a value (doesn't start with --)
                const nextArg = commandArgs[i + 1];
                if (nextArg && !nextArg.startsWith('--')) {
                    // --key value format
                    options[camelCaseKey] = nextArg;
                    i++; // Skip the next arg since we consumed it
                } else {
                    // Boolean flag
                    options[camelCaseKey] = true;
                }
            } else {
                // --key=value format
                options[camelCaseKey] = value;
            }
        }
    }
    return options;
}

function showVersion() {
    console.log(`synkio v${pkg.version}`);
}

function showHelp(command?: string) {
    switch (command) {
        case 'init':
            console.log('Usage: synkio init [options]\n');
            console.log('Initialize a new Synkio project.\n');
            console.log('Options:');
            console.log('  --figma-url=<url>   Figma file URL (skip prompt)');
            console.log('  --base-url=<url>    Custom Figma API base URL (enterprise)\n');
            console.log('Examples:');
            console.log('  synkio init');
            console.log('  synkio init --figma-url=https://figma.com/design/ABC123/File');
            break;
        case 'pull':
            console.log('Usage: synkio pull [options]\n');
            console.log('Fetch tokens from Figma and update baseline.json.\n');
            console.log('Does not write token files - run `synkio build` after pulling.\n');
            console.log('Options:');
            console.log('  --preview           Show what would change without updating baseline');
            console.log('  --collection=<name> Pull only specific collection(s), comma-separated');
            console.log('  --timeout=<s>       Figma API timeout in seconds (default: 120)');
            console.log('  --watch             Poll Figma for changes continuously');
            console.log('  --interval=<s>      Poll interval in seconds (default: 30)');
            console.log('  --config=<file>     Path to config file (default: synkio.config.json)\n');
            console.log('Exit codes:');
            console.log('  0  Success (no breaking changes)');
            console.log('  1  Breaking changes detected');
            console.log('  2  Error (config, network, etc.)\n');
            console.log('Examples:');
            console.log('  synkio pull                    # Fetch from Figma, update baseline');
            console.log('  synkio pull --preview          # See changes without updating');
            console.log('  synkio pull --watch            # Poll every 30 seconds');
            break;
        case 'diff':
            console.log('Usage: synkio diff [options]\n');
            console.log('Compare baseline with current token files (read-only).\n');
            console.log('Shows what would change if you ran `synkio build`.\n');
            console.log('Options:');
            console.log('  --config=<file>     Path to config file (default: synkio.config.json)\n');
            console.log('Exit codes:');
            console.log('  0  No differences (baseline and files are in sync)');
            console.log('  1  Differences detected');
            console.log('  2  Error (config, missing files, etc.)\n');
            console.log('Examples:');
            console.log('  synkio diff                    # Compare baseline with token files');
            break;
        case 'build':
            console.log('Usage: synkio build [options]\n');
            console.log('Generate token files from baseline.json.\n');
            console.log('Options:');
            console.log('  --force             Bypass breaking change confirmation');
            console.log('  --rebuild           Regenerate all files (skip comparison)');
            console.log('  --backup            Backup existing files before overwriting');
            console.log('  --report            Generate markdown diff report');
            console.log('  --no-report         Skip report generation');
            console.log('  --open              Open docs folder after build');
            console.log('  --config=<file>     Path to config file (default: synkio.config.json)\n');
            console.log('Examples:');
            console.log('  synkio build                    # Build token files from baseline');
            console.log('  synkio build --rebuild          # Regenerate all files');
            console.log('  synkio build --force            # Skip breaking change prompts');
            console.log('  synkio build --backup           # Backup before writing');
            break;
        case 'rollback':
            console.log('Usage: synkio rollback [options]\n');
            console.log('Revert to the previous token state.\n');
            console.log('Restores tokens from the backup created during the last sync.\n');
            console.log('Options:');
            console.log('  --preview   Show what would be restored without applying');
            break;
        case 'validate':
            console.log('Usage: synkio validate\n');
            console.log('Validate your configuration and Figma connection.\n');
            console.log('Checks:');
            console.log('  - synkio.config.json exists and is valid');
            console.log('  - Figma access token is set');
            console.log('  - Connection to Figma API works');
            break;
        case 'tokens':
            console.log('Usage: synkio tokens\n');
            console.log('Display the current token baseline.\n');
            console.log('Shows the contents of synkio/baseline.json for debugging.');
            break;
        case 'docs':
            console.log('Usage: synkio docs [options]\n');
            console.log('Generate a static documentation site for your design tokens.\n');
            console.log('Creates a self-hosted styleguide with:');
            console.log('  - Color palettes with visual swatches');
            console.log('  - Typography scales with previews');
            console.log('  - Spacing visualization');
            console.log('  - CSS custom properties (tokens.css)');
            console.log('  - Utility classes (utilities.css)\n');
            console.log('Options:');
            console.log('  --output=<dir>   Output directory (default: synkio/docs)');
            console.log('  --title=<name>   Documentation title');
            console.log('  --open           Open in browser after generating');
            break;
        case 'import':
            console.log('Usage: synkio import <path> [options]\n');
            console.log('Import tokens from Figma native JSON export files.\n');
            console.log('Supports importing directly from Figma\'s built-in variable export');
            console.log('without needing the Synkio Figma plugin.\n');
            console.log('Arguments:');
            console.log('  <path>              Path to JSON file or directory\n');
            console.log('Options:');
            console.log('  --collection=<name> Collection name (required if not in file)');
            console.log('  --mode=<name>       Override mode name from file');
            console.log('  --preview           Show what would change without importing');
            console.log('  --force             Import even with breaking changes');
            console.log('  --config=<file>     Path to config file\n');
            console.log('Examples:');
            console.log('  synkio import ./light.tokens.json --collection=theme');
            console.log('  synkio import ./figma-exports/ --collection=theme');
            console.log('  synkio import ./tokens/ --collection=theme --preview');
            break;
        case 'export-baseline':
            console.log('Usage: synkio export-baseline [options]\n');
            console.log('Export token files to baseline format for Figma plugin import.\n');
            console.log('Enables code-first workflows by converting local token files to a');
            console.log('baseline that can be imported and applied to Figma via the plugin.\n');
            console.log('Options:');
            console.log('  --output=<path>     Output file path (default: synkio/export-baseline.json)');
            console.log('  --config=<path>     Config file path (default: synkio.config.json)');
            console.log('  --preview           Print output to console without writing file');
            console.log('  --verbose           Show detailed processing information\n');
            console.log('Examples:');
            console.log('  synkio export-baseline');
            console.log('  synkio export-baseline --output ./for-figma.json');
            console.log('  synkio export-baseline --preview');
            break;
        case 'serve':
            console.log('Usage: synkio serve [options]\n');
            console.log('Start a local HTTP server to serve the baseline file for the Figma plugin.\n');
            console.log('The server provides endpoints for the plugin to fetch the export baseline,');
            console.log('enabling local development workflows without manual file imports.\n');
            console.log('Options:');
            console.log('  --port=<number>     Port to listen on (default: 3847)\n');
            console.log('Endpoints:');
            console.log('  GET /               Serves synkio/export-baseline.json');
            console.log('  GET /baseline       Serves synkio/export-baseline.json');
            console.log('  GET /health         Health check endpoint\n');
            console.log('Examples:');
            console.log('  synkio serve');
            console.log('  synkio serve --port=8080');
            break;
        default:
            console.log(`synkio v${pkg.version}\n`);
            console.log('Usage: synkio <command> [options]\n');
            console.log('Commands:');
            console.log('  init            Initialize a new project');
            console.log('  pull            Fetch tokens from Figma');
            console.log('  build           Generate token files from baseline');
            console.log('  diff            Compare baseline with token files');
            console.log('  import          Import tokens from Figma native JSON export');
            console.log('  export-baseline Export token files to baseline format');
            console.log('  serve           Start HTTP server for Figma plugin');
            console.log('  docs            Generate token documentation site');
            console.log('  rollback        Revert to previous token version');
            console.log('  validate        Check configuration and connection');
            console.log('  tokens          Show current token baseline');
            console.log('\nRun "synkio help <command>" for detailed help on a specific command.');
    }
}

// Handle --version and -v flags
if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
}

// Handle help command
if (command === 'help') {
    showHelp(args[1]);
    process.exit(0);
}

// Handle --help and -h flags
if (args.includes('--help') || args.includes('-h')) {
    showHelp(command !== '--help' && command !== '-h' ? command : undefined);
    process.exit(0);
}

switch (command) {
  case 'init': {
    const options = parseArgs(args);

    // Check for removed --token flag and show error
    if (options.token) {
        console.error('\nError: The --token flag has been removed for security reasons.');
        console.error('CLI arguments are visible in shell history.\n');
        console.error('Use the FIGMA_TOKEN environment variable instead:');
        console.error('  export FIGMA_TOKEN=your-token-here');
        console.error('  synkio init --figma-url=...\n');
        console.error('Or in one line:');
        console.error('  FIGMA_TOKEN=your-token-here synkio init --figma-url=...\n');
        process.exit(1);
    }

    // Check for removed --output-dir flag
    if (options.outputDir) {
        console.error('\nError: The --output-dir flag has been removed.');
        console.error('Output directory is now auto-detected from your project structure.\n');
        console.error('After init, you can customize it in synkio.config.json under tokens.dir\n');
        process.exit(1);
    }

    initCommand({
        figmaUrl: options.figmaUrl as string,
        baseUrl: options.baseUrl as string,
    });
    break;
  }
  case 'pull': {
    const pullOptions = parseArgs(args);
    if (pullOptions.watch) {
        pullWatchCommand({
            preview: pullOptions.preview as boolean,
            collection: pullOptions.collection as string,
            timeout: pullOptions.timeout ? Number.parseInt(pullOptions.timeout as string) : undefined,
            interval: pullOptions.interval ? Number.parseInt(pullOptions.interval as string) : 30,
            config: pullOptions.config as string,
        });
    } else {
        pullCommand({
            preview: pullOptions.preview as boolean,
            collection: pullOptions.collection as string,
            timeout: pullOptions.timeout ? Number.parseInt(pullOptions.timeout as string) : undefined,
            config: pullOptions.config as string,
        });
    }
    break;
  }
  case 'diff': {
    const diffOptions = parseArgs(args);
    diffCommand({
        config: diffOptions.config as string,
    });
    break;
  }
  case 'build': {
    const buildOptions = parseArgs(args);
    buildCommand({
        force: buildOptions.force as boolean,
        rebuild: buildOptions.rebuild as boolean,
        backup: buildOptions.backup as boolean,
        report: buildOptions.report as boolean,
        noReport: buildOptions.noReport as boolean,
        open: buildOptions.open as boolean,
        config: buildOptions.config as string,
    });
    break;
  }
  case 'rollback': {
    const rollbackOptions = parseArgs(args);
    rollbackCommand({
        preview: rollbackOptions.preview as boolean,
    });
    break;
  }
  case 'validate':
    validateCommand();
    break;
  case 'tokens':
    tokensCommand();
    break;
  case 'docs': {
    const docsOptions = parseArgs(args);
    docsCommand({
        output: docsOptions.output as string,
        title: docsOptions.title as string,
        open: docsOptions.open as boolean,
        config: docsOptions.config as string,
    });
    break;
  }
  case 'import': {
    const importOptions = parseArgs(args);
    // First non-flag argument after 'import' is the path
    const importPath = args.slice(1).find(arg => !arg.startsWith('--'));
    importCommand({
        path: importPath || importOptions.path as string,
        collection: importOptions.collection as string,
        mode: importOptions.mode as string,
        preview: importOptions.preview as boolean,
        force: importOptions.force as boolean,
        config: importOptions.config as string,
    });
    break;
  }
  case 'export-baseline': {
    const exportOptions = parseArgs(args);
    exportBaselineCommand({
        output: exportOptions.output as string,
        config: exportOptions.config as string,
        preview: exportOptions.preview as boolean,
        verbose: exportOptions.verbose as boolean,
    });
    break;
  }
  case 'serve': {
    const serveOptions = parseArgs(args);
    serveCommand({
        port: serveOptions.port as string | number,
    });
    break;
  }
  default:
    if (command) {
        console.log('Unknown command:', command);
    }
    showHelp();
    process.exit(1);
}
