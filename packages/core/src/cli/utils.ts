/**
 * CLI Utilities
 *
 * Shared utilities for CLI commands providing consistent formatting,
 * spinners, and colored output.
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';

// ============================================================================
// Formatted Messages
// ============================================================================

/**
 * Format a success message with simple border
 *
 * @param message - Success message to display
 * @returns Formatted string with chalk
 *
 * @example
 * ```typescript
 * console.log(formatSuccess('Configuration saved!'));
 * ```
 */
export function formatSuccess(message: string): string {
  const lines = message.split('\n');
  const maxLength = Math.max(...lines.map(l => l.length));
  const width = Math.min(maxLength + 4, 80);
  const border = '═'.repeat(width);
  
  const paddedLines = lines.map(line => {
    const padding = ' '.repeat(Math.max(0, width - line.length - 2));
    return `  ${line}${padding}`;
  });
  
  return chalk.green(`╭${border}╮\n${paddedLines.map(l => `│${l}│`).join('\n')}\n╰${border}╯`);
}

/**
 * Format an error message with simple border
 *
 * @param message - Error message to display
 * @returns Formatted string with chalk
 *
 * @example
 * ```typescript
 * console.log(formatError('Configuration not found!'));
 * ```
 */
export function formatError(message: string): string {
  const lines = message.split('\n');
  const maxLength = Math.max(...lines.map(l => l.length));
  const width = Math.min(maxLength + 4, 80);
  const border = '═'.repeat(width);
  
  const paddedLines = lines.map(line => {
    const padding = ' '.repeat(Math.max(0, width - line.length - 2));
    return `  ${line}${padding}`;
  });
  
  return chalk.red(`╭${border}╮\n${paddedLines.map(l => `│${l}│`).join('\n')}\n╰${border}╯`);
}

/**
 * Format an info message with simple border
 *
 * @param message - Info message to display
 * @returns Formatted string with chalk
 *
 * @example
 * ```typescript
 * console.log(formatInfo('Found 3 collections'));
 * ```
 */
export function formatInfo(message: string): string {
  const lines = message.split('\n');
  const maxLength = Math.max(...lines.map(l => l.length));
  const width = Math.min(maxLength + 4, 80);
  const border = '═'.repeat(width);
  
  const paddedLines = lines.map(line => {
    const padding = ' '.repeat(Math.max(0, width - line.length - 2));
    return `  ${line}${padding}`;
  });
  
  return chalk.cyan(`╭${border}╮\n${paddedLines.map(l => `│${l}│`).join('\n')}\n╰${border}╯`);
}

/**
 * Format a warning message with simple border
 *
 * @param message - Warning message to display
 * @returns Formatted string with chalk
 *
 * @example
 * ```typescript
 * console.log(formatWarning('Build command not configured'));
 * ```
 */
export function formatWarning(message: string): string {
  const lines = message.split('\n');
  const maxLength = Math.max(...lines.map(l => l.length));
  const width = Math.min(maxLength + 4, 80);
  const border = '═'.repeat(width);
  
  const paddedLines = lines.map(line => {
    const padding = ' '.repeat(Math.max(0, width - line.length - 2));
    return `  ${line}${padding}`;
  });
  
  return chalk.yellow(`╭${border}╮\n${paddedLines.map(l => `│${l}│`).join('\n')}\n╰${border}╯`);
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
 * console.log(table);
 * ```
 */
export function createTable(headers: string[], rows: string[][]): string {
  // Calculate column widths
  const colWidths = headers.map((header, i) => {
    const cellWidths = rows.map(row => (row[i] || '').length);
    return Math.max(header.length, ...cellWidths) + 2; // +2 for padding
  });

  // Format header
  const headerRow = headers.map((h, i) => {
    return chalk.cyan.bold(h.padEnd(colWidths[i]));
  }).join(' │ ');
  
  const separator = colWidths.map(w => '─'.repeat(w)).join('─┼─');

  // Format rows
  const dataRows = rows.map(row => {
    return row.map((cell, i) => {
      return (cell || '').padEnd(colWidths[i]);
    }).join(' │ ');
  });

  return [
    `┌─${colWidths.map(w => '─'.repeat(w)).join('─┬─')}─┐`,
    `│ ${headerRow} │`,
    `├─${separator}─┤`,
    ...dataRows.map(r => `│ ${r} │`),
    `└─${colWidths.map(w => '─'.repeat(w)).join('─┴─')}─┘`
  ].join('\n');
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
