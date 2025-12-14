#!/usr/bin/env node
import 'dotenv/config';
import { createRequire } from 'module';

import { initCommand } from './commands/init.js';
import { syncCommand, watchCommand } from './commands/sync.js';
import { rollbackCommand } from './commands/rollback.js';
import { validateCommand } from './commands/validate.js';
import { tokensCommand } from './commands/tokens.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

const args = process.argv.slice(2);
const command = args[0];

function parseArgs(args: string[]) {
    const options: { [key: string]: string | boolean } = {};
    const commandArgs = args.slice(1);
    
    for (const arg of commandArgs) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            const camelCaseKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
            
            if (value !== undefined) {
                options[camelCaseKey] = value;
            } else {
                options[camelCaseKey] = true;
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
            console.log('  --figma-url=<url>   Figma file URL');
            console.log('  --token=<token>     Figma access token');
            console.log('  --output-dir=<dir>  Output directory for tokens');
            console.log('  --base-url=<url>    Custom Figma API base URL (enterprise)');
            break;
        case 'sync':
            console.log('Usage: synkio sync [options]\n');
            console.log('Sync tokens from Figma to your local project.\n');
            console.log('Breaking changes (path changes, deleted variables/modes) are blocked by default.\n');
            console.log('Options:');
            console.log('  --preview           Show what would change without syncing');
            console.log('  --force             Apply changes even if breaking');
            console.log('  --report            Force generate markdown report');
            console.log('  --no-report         Skip report generation');
            console.log('  --watch             Watch for changes (poll Figma)');
            console.log('  --interval=<s>      Watch interval in seconds (default: 30)');
            console.log('  --collection=<name> Sync only specific collection(s), comma-separated');
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
            console.log('  - tokensrc.json exists and is valid');
            console.log('  - Figma access token is set');
            console.log('  - Connection to Figma API works');
            break;
        case 'tokens':
            console.log('Usage: synkio tokens\n');
            console.log('Display the current token baseline.\n');
            console.log('Shows the contents of .synkio/baseline.json for debugging.');
            break;
        default:
            console.log(`synkio v${pkg.version}\n`);
            console.log('Usage: synkio <command> [options]\n');
            console.log('Commands:');
            console.log('  init       Initialize a new project');
            console.log('  sync       Sync tokens from Figma');
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
    initCommand({
        figmaUrl: options.figmaUrl as string,
        token: options.token as string,
        outputDir: options.outputDir as string,
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
        });
    } else {
        syncCommand({
            force: syncOptions.force as boolean,
            preview: syncOptions.preview as boolean,
            report: syncOptions.report as boolean,
            noReport: syncOptions.noReport as boolean,
            collection: syncOptions.collection as string,
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
  default:
    if (command) {
        console.log('Unknown command:', command);
    }
    showHelp();
    process.exit(1);
}
