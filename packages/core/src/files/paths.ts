/**
 * File Paths
 *
 * Standard file path constants used across scripts.
 * All Figma-related files are stored in figma-sync/.figma/ directory.
 */

// Main directories
export const FIGMA_SYNC_DIR = 'figma-sync';
export const FIGMA_DIR = 'figma-sync/.figma';
export const FIGMA_CONFIG_DIR = 'figma-sync/.figma/config';
export const FIGMA_DATA_DIR = 'figma-sync/.figma/data';
export const FIGMA_REPORTS_DIR = 'figma-sync/.figma/reports';

// Output directories (outside figma-sync - configurable in tokensrc.json)
export const TOKENS_DIR = 'tokens';
export const STYLES_DIR = 'styles/tokens';
export const TYPES_DIR = 'types';

// Config file
export const CONFIG_FILE = 'figma-sync/.figma/config/tokensrc.json';

// Baseline files
export const BASELINE_FILE = 'figma-sync/.figma/data/baseline.json';
export const BASELINE_PREV_FILE = 'figma-sync/.figma/data/baseline.prev.json';

// Report files
export const DIFF_REPORT_FILE = 'figma-sync/.figma/reports/diff-report.md';
export const MIGRATION_REPORT_FILE = 'figma-sync/.figma/reports/migration-report.md';

// Legacy paths (for migration compatibility - can be removed later)
export const LEGACY_BASELINE_FILE = '.baseline-export.json';
export const LEGACY_BASELINE_PREV_FILE = '.baseline-export.prev.json';
export const LEGACY_SNAPSHOT_FILE = '.figma-snapshot.json';
export const LEGACY_MIGRATION_FILE = '.figma-migration.json';
export const LEGACY_DIFF_REPORT_FILE = '.figma-diff-report.md';
export const LEGACY_MIGRATION_REPORT_FILE = '.figma-migration-report.md';
export const LEGACY_MIGRATION_CONFIG_FILE = '.migrationrc.json';
export const LEGACY_TOKEN_SPLIT_CONFIG_FILE = '.tokensplitrc.json';

// Deprecated - use new names
/** @deprecated Use FIGMA_REPORTS_DIR instead */
export const REPORTS_DIR = FIGMA_REPORTS_DIR;
