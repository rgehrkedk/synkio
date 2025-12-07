#!/usr/bin/env node
/**
 * Synkio CLI Entry Point
 *
 * Modern CLI for syncing Figma design tokens to code.
 * Built with commander, inquirer, chalk, ora, and boxen.
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { formatError } from './utils.js';

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

// ============================================================================
// Commander Program Setup
// ============================================================================

const program = new Command();

program
  .name('synkio')
  .description('Sync Figma design tokens to code')
  .version(packageJson.version);

// ============================================================================
// Commands
// ============================================================================

/**
 * synkio init
 * Interactive setup wizard
 */
program
  .command('init')
  .description('Interactive setup wizard (5-10 min, 12-20 questions) to configure Synkio')
  .option('--template <name>', 'Use a template (nextjs, tailwind, css)')
  .option('--yes, -y', 'Skip prompts and use defaults (requires env vars)')
  .addHelpText('after', `
Examples:
  $ synkio init                           # Interactive setup
  $ synkio init --template nextjs         # Use Next.js template
  $ synkio init --yes                     # Non-interactive (needs env vars)

Requirements:
  - Figma file URL or file ID
  - Figma access token (get from figma.com/settings)

The wizard will:
  1. Detect existing project setup (Style Dictionary, etc.)
  2. Connect to your Figma file
  3. Configure collection organization
  4. Set up build integration
  5. Optionally configure migration
  `)
  .action(async (options) => {
    try {
      const { initCommand } = await import('./commands/init.js');
      await initCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

/**
 * synkio sync
 * Fetch and apply tokens from Figma
 */
program
  .command('sync')
  .description('Fetch and apply tokens from Figma')
  .option('--dry-run', 'Preview changes without applying them')
  .option('--no-backup', 'Skip creating a backup of current baseline')
  .option('--no-build', 'Skip running the build command')
  .action(async (options) => {
    try {
      const { syncCommand } = await import('./commands/sync-cmd.js');
      await syncCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

/**
 * synkio diff
 * Compare Figma tokens with local baseline
 */
program
  .command('diff')
  .description('Compare Figma tokens with local baseline')
  .option('--format <type>', 'Output format: table, json, markdown', 'table')
  .option('--local', 'Compare local files instead of fetching from Figma')
  .action(async (options) => {
    try {
      const { diffCommand } = await import('./commands/diff-cmd.js');
      await diffCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

/**
 * synkio rollback
 * Restore previous baseline
 */
program
  .command('rollback')
  .description('Restore previous baseline')
  .option('--force, -f', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const { rollbackCommand } = await import('./commands/rollback-cmd.js');
      await rollbackCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

// ============================================================================
// Global Error Handling
// ============================================================================

/**
 * Handle command errors
 * In production mode: show friendly error messages without stack traces
 * In development mode: show full stack traces
 */
function handleError(error: unknown): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (error instanceof Error) {
    // User-friendly error message
    console.error(formatError(error.message));

    // Stack trace only in development
    if (isDevelopment && error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
  } else {
    // Unknown error type
    console.error(formatError(`An unexpected error occurred: ${String(error)}`));
  }

  process.exit(1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error(formatError('Unhandled promise rejection'));
  if (process.env.NODE_ENV === 'development') {
    console.error(chalk.gray(String(reason)));
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(formatError('Uncaught exception'));
  if (process.env.NODE_ENV === 'development') {
    console.error(chalk.gray(error.stack || String(error)));
  }
  process.exit(1);
});

// ============================================================================
// Parse and Execute
// ============================================================================

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
