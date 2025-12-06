/**
 * CLI Utilities
 *
 * Shared utilities for CLI commands providing consistent formatting,
 * spinners, and colored output.
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import boxen from 'boxen';
import Table from 'cli-table3';

// ============================================================================
// Formatted Messages
// ============================================================================

/**
 * Format a success message with green boxen border
 *
 * @param message - Success message to display
 * @returns Formatted string with boxen
 *
 * @example
 * ```typescript
 * console.log(formatSuccess('Configuration saved!'));
 * ```
 */
export function formatSuccess(message: string): string {
  return boxen(chalk.green(message), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'green',
  });
}

/**
 * Format an error message with red boxen border
 *
 * @param message - Error message to display
 * @returns Formatted string with boxen
 *
 * @example
 * ```typescript
 * console.log(formatError('Configuration not found!'));
 * ```
 */
export function formatError(message: string): string {
  return boxen(chalk.red(message), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'red',
  });
}

/**
 * Format an info message with cyan boxen border
 *
 * @param message - Info message to display
 * @returns Formatted string with boxen
 *
 * @example
 * ```typescript
 * console.log(formatInfo('Found 3 collections'));
 * ```
 */
export function formatInfo(message: string): string {
  return boxen(chalk.cyan(message), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
  });
}

/**
 * Format a warning message with yellow boxen border
 *
 * @param message - Warning message to display
 * @returns Formatted string with boxen
 *
 * @example
 * ```typescript
 * console.log(formatWarning('Build command not configured'));
 * ```
 */
export function formatWarning(message: string): string {
  return boxen(chalk.yellow(message), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'yellow',
  });
}

// ============================================================================
// Progress Spinners
// ============================================================================

/**
 * Create a spinner for long-running operations
 *
 * @param text - Initial spinner text
 * @returns Ora spinner instance
 *
 * @example
 * ```typescript
 * const spinner = createSpinner('Fetching from Figma...');
 * spinner.start();
 * // ... do work ...
 * spinner.succeed('Fetched successfully!');
 * ```
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
  });
}

// ============================================================================
// Tables
// ============================================================================

/**
 * Create a formatted table for displaying data
 *
 * @param headers - Table column headers
 * @param rows - Table rows (array of arrays)
 * @returns cli-table3 instance
 *
 * @example
 * ```typescript
 * const table = createTable(
 *   ['Token', 'Old Value', 'New Value'],
 *   [
 *     ['color.primary', '#FF0000', '#00FF00'],
 *     ['color.secondary', '#0000FF', '#FFFF00']
 *   ]
 * );
 * console.log(table.toString());
 * ```
 */
export function createTable(headers: string[], rows: string[][]): Table.Table {
  const table = new Table({
    head: headers.map(h => chalk.cyan.bold(h)),
    style: {
      head: [],
      border: ['grey'],
    },
  });

  rows.forEach(row => table.push(row));

  return table;
}

// ============================================================================
// Colored Console Output
// ============================================================================

/**
 * Log a success message in green
 *
 * @param message - Success message
 */
export function logSuccess(message: string): void {
  console.log(chalk.green(message));
}

/**
 * Log an error message in red
 *
 * @param message - Error message
 */
export function logError(message: string): void {
  console.log(chalk.red(message));
}

/**
 * Log an info message in cyan
 *
 * @param message - Info message
 */
export function logInfo(message: string): void {
  console.log(chalk.cyan(message));
}

/**
 * Log a warning message in yellow
 *
 * @param message - Warning message
 */
export function logWarning(message: string): void {
  console.log(chalk.yellow(message));
}
