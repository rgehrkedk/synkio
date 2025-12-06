/**
 * File Paths
 *
 * Context-based path resolution functions for framework-agnostic usage.
 * All paths are resolved relative to the context rootDir.
 *
 * All functions accept an optional Context parameter.
 * If no context is provided, the global context is used.
 *
 * @example
 * ```typescript
 * // Using global context
 * const baselinePath = getBaselinePath();
 *
 * // Using explicit context (monorepo)
 * const ctx = createContext({ rootDir: './apps/web' });
 * const baselinePath = getBaselinePath(ctx);
 * ```
 */

import path from 'path';
import { getContext, type Context } from '../context';

// ============================================================================
// Main Directories
// ============================================================================

/**
 * Get the data directory where baselines and internal files are stored.
 * Default: {rootDir}/.figma/data
 */
export function getDataDir(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(context.rootDir, '.figma', 'data');
}

/**
 * Get the config directory where configuration files are stored.
 * Default: {rootDir}/.figma/config
 */
export function getConfigDir(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(context.rootDir, '.figma', 'config');
}

/**
 * Get the reports directory where diff and migration reports are stored.
 * Default: {rootDir}/.figma/reports
 */
export function getReportsDir(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(context.rootDir, '.figma', 'reports');
}

/**
 * Get the main .figma directory.
 * Default: {rootDir}/.figma
 */
export function getFigmaDir(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(context.rootDir, '.figma');
}

// ============================================================================
// Output Directories (Configurable)
// ============================================================================

/**
 * Get the tokens output directory.
 * Default: {rootDir}/tokens
 *
 * TODO: Read from config file when config system is implemented
 */
export function getTokensDir(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(context.rootDir, 'tokens');
}

/**
 * Get the styles output directory.
 * Default: {rootDir}/styles/tokens
 *
 * TODO: Read from config file when config system is implemented
 */
export function getStylesDir(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(context.rootDir, 'styles', 'tokens');
}

/**
 * Get the types output directory.
 * Default: {rootDir}/types
 *
 * TODO: Read from config file when config system is implemented
 */
export function getTypesDir(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(context.rootDir, 'types');
}

// ============================================================================
// Config Files
// ============================================================================

/**
 * Get the path to the main config file (tokensrc.json).
 * Default: {rootDir}/.figma/config/tokensrc.json
 */
export function getConfigPath(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(getConfigDir(context), 'tokensrc.json');
}

// ============================================================================
// Baseline Files
// ============================================================================

/**
 * Get the path to the current baseline file.
 * Default: {rootDir}/.figma/data/baseline.json
 */
export function getBaselinePath(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(getDataDir(context), 'baseline.json');
}

/**
 * Get the path to the previous baseline file (for rollback).
 * Default: {rootDir}/.figma/data/baseline.prev.json
 */
export function getBaselinePrevPath(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(getDataDir(context), 'baseline.prev.json');
}

// ============================================================================
// Report Files
// ============================================================================

/**
 * Get the path to the diff report file.
 * Default: {rootDir}/.figma/reports/diff-report.md
 */
export function getDiffReportPath(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(getReportsDir(context), 'diff-report.md');
}

/**
 * Get the path to the migration report file.
 * Default: {rootDir}/.figma/reports/migration-report.md
 */
export function getMigrationReportPath(ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(getReportsDir(context), 'migration-report.md');
}

// ============================================================================
// Legacy Path Constants (DEPRECATED - for backwards compatibility)
// ============================================================================

/**
 * @deprecated Use getBaselinePath() instead
 */
export const LEGACY_BASELINE_FILE = '.baseline-export.json';

/**
 * @deprecated Use getBaselinePrevPath() instead
 */
export const LEGACY_BASELINE_PREV_FILE = '.baseline-export.prev.json';

/**
 * @deprecated Legacy snapshot file path
 */
export const LEGACY_SNAPSHOT_FILE = '.figma-snapshot.json';

/**
 * @deprecated Legacy migration file path
 */
export const LEGACY_MIGRATION_FILE = '.figma-migration.json';

/**
 * @deprecated Use getDiffReportPath() instead
 */
export const LEGACY_DIFF_REPORT_FILE = '.figma-diff-report.md';

/**
 * @deprecated Use getMigrationReportPath() instead
 */
export const LEGACY_MIGRATION_REPORT_FILE = '.figma-migration-report.md';

/**
 * @deprecated Legacy migration config file path
 */
export const LEGACY_MIGRATION_CONFIG_FILE = '.migrationrc.json';

/**
 * @deprecated Legacy token split config file path
 */
export const LEGACY_TOKEN_SPLIT_CONFIG_FILE = '.tokensplitrc.json';
