#!/usr/bin/env node
import 'dotenv/config';
import { createRequire } from 'module';

import { initCommand } from './commands/init.js';
import { syncCommand, watchCommand } from './commands/sync.js';
import { rollbackCommand } from './commands/rollback.js';
import { validateCommand } from './commands/validate.js';
import { tokensCommand } from './commands/tokens.js';
import { docsCommand } from './commands/docs.js';
import { importCommand } from './commands/import.js';

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
            const camelCaseKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());

            if (value !== undefined) {
                // --key=value format
                options[camelCaseKey] = value;
            } else {
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
            console.log('Environment:');
            console.log('  FIGMA_TOKEN         Figma access token (required for validation)');
            console.log('\nNon-interactive usage:');
            console.log('  FIGMA_TOKEN=figd_xxx synkio init --figma-url=https://figma.com/design/ABC123/File');
            break;
        case 'sync':
            console.log('Usage: synkio sync [options]\n');
            console.log('Sync tokens from Figma to your local project.\n');
            console.log('Breaking changes (path changes, deleted variables/modes) are blocked by default.\n');
            console.log('Options:');
            console.log('  --preview           Show what would change without syncing');
            console.log('  --force             Apply changes even if breaking');
            console.log('  --build             Run build pipeline without prompting');
            console.log('  --no-build          Skip build pipeline entirely');
            console.log('  --report            Force generate markdown report');
            console.log('  --no-report         Skip report generation');
            console.log('  --watch             Watch for changes (poll Figma)');
            console.log('  --interval=<s>      Watch interval in seconds (default: 30)');
            console.log('  --collection=<name> Sync only specific collection(s), comma-separated');
            console.log('  --regenerate        Regenerate files from existing baseline (no Figma fetch)');
            console.log('  --timeout=<s>       Figma API timeout in seconds (default: 60)');
            console.log('  --config=<file>     Path to config file (default: synkio.config.json)');
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
            console.log('Shows the contents of .synkio/baseline.json for debugging.');
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
            console.log('  --output=<dir>   Output directory (default: .synkio/docs)');
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
        default:
            console.log(`synkio v${pkg.version}\n`);
            console.log('Usage: synkio <command> [options]\n');
            console.log('Commands:');
            console.log('  init       Initialize a new project');
            console.log('  sync       Sync tokens from Figma');
            console.log('  import     Import tokens from Figma native JSON export');
            console.log('  docs       Generate token documentation site');
            console.log('  rollback   Revert to previous token version');
            console.log('  validate   Check configuration and connection');
            console.log('  tokens     Show current token baseline');
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
  case 'init':
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
  case 'sync':
    const syncOptions = parseArgs(args);
    if (syncOptions.watch) {
        watchCommand({
            force: syncOptions.force as boolean,
            interval: syncOptions.interval ? parseInt(syncOptions.interval as string) : 30,
            collection: syncOptions.collection as string,
            config: syncOptions.config as string,
            timeout: syncOptions.timeout ? parseInt(syncOptions.timeout as string) : undefined,
            build: syncOptions.build as boolean,
            noBuild: syncOptions.noBuild as boolean,
        });
    } else {
        syncCommand({
            force: syncOptions.force as boolean,
            preview: syncOptions.preview as boolean,
            report: syncOptions.report as boolean,
            noReport: syncOptions.noReport as boolean,
            collection: syncOptions.collection as string,
            regenerate: syncOptions.regenerate as boolean,
            config: syncOptions.config as string,
            timeout: syncOptions.timeout ? parseInt(syncOptions.timeout as string) : undefined,
            build: syncOptions.build as boolean,
            noBuild: syncOptions.noBuild as boolean,
        });
    }
    break;
  case 'rollback':
    const rollbackOptions = parseArgs(args);
    rollbackCommand({
        preview: rollbackOptions.preview as boolean,
    });
    break;
  case 'validate':
    validateCommand();
    break;
  case 'tokens':
    tokensCommand();
    break;
  case 'docs':
    const docsOptions = parseArgs(args);
    docsCommand({
        output: docsOptions.output as string,
        title: docsOptions.title as string,
        open: docsOptions.open as boolean,
        config: docsOptions.config as string,
    });
    break;
  case 'import':
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
  default:
    if (command) {
        console.log('Unknown command:', command);
    }
    showHelp();
    process.exit(1);
}
