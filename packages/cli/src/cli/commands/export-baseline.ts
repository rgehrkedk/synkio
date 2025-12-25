/**
 * Export Baseline Command
 *
 * Exports token files to baseline format for Figma plugin import.
 * Supports both code-first (no IDs) and roundtrip (with IDs) workflows.
 *
 * When token files don't contain variableId (tokens.includeVariableId: false),
 * this command will automatically enrich tokens with IDs from baseline.json
 * if it exists, enabling proper ID-based comparison in the Figma plugin.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../../core/config.js';
import { discoverTokenFiles, extractModeFromFile } from '../../core/export/file-discoverer.js';
import { parseTokenFile, parseMultiModeFile, ParsedToken } from '../../core/export/token-parser.js';
import { buildExportBaseline } from '../../core/export/baseline-builder.js';
import { readBaseline } from '../../core/baseline.js';
import { createLogger } from '../../utils/logger.js';
import type { BaselineEntry } from '../../types/index.js';

export interface ExportBaselineOptions {
  output?: string;
  config?: string;
  preview?: boolean;
  verbose?: boolean;
}

const DEFAULT_OUTPUT = '.synkio/export-baseline.json';

/**
 * Build a lookup key for matching tokens by path, collection, and mode.
 * Format: "path:collection.mode"
 */
function buildPathLookupKey(path: string, collection: string, mode: string): string {
  return `${path}:${collection}.${mode}`;
}

/**
 * Build a lookup map from baseline.json entries for variableId enrichment.
 * Maps path:collection.mode -> BaselineEntry (which contains variableId, collectionId, modeId)
 */
function buildBaselineLookupMap(
  baseline: Record<string, BaselineEntry>
): Map<string, BaselineEntry> {
  const map = new Map<string, BaselineEntry>();

  for (const entry of Object.values(baseline)) {
    // Only include entries that have variableId
    if (entry.variableId) {
      const key = buildPathLookupKey(entry.path, entry.collection, entry.mode);
      map.set(key, entry);
    }
  }

  return map;
}

/**
 * Enrich parsed tokens with variableId from baseline.json lookup.
 * This enables ID-based comparison even when token files don't include variableId.
 */
function enrichTokensWithVariableIds(
  tokens: ParsedToken[],
  collection: string,
  mode: string,
  lookupMap: Map<string, BaselineEntry>
): { enrichedCount: number } {
  let enrichedCount = 0;

  for (const token of tokens) {
    if (!token.variableId) {
      const key = buildPathLookupKey(token.path, collection, mode);
      const baselineEntry = lookupMap.get(key);

      if (baselineEntry?.variableId) {
        token.variableId = baselineEntry.variableId;
        enrichedCount++;
      }
    }
  }

  return { enrichedCount };
}

/**
 * Check if any tokens in the parsed files have variableId
 */
function hasAnyVariableIds(
  parsedFiles: Array<{ tokens: ParsedToken[] }>
): boolean {
  for (const { tokens } of parsedFiles) {
    for (const token of tokens) {
      if (token.variableId) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Export baseline command - exports token files to baseline format
 */
export async function exportBaselineCommand(options: ExportBaselineOptions = {}): Promise<void> {
  const logger = createLogger();
  const spinner = ora('Exporting baseline...').start();
  const outputPath = options.output || DEFAULT_OUTPUT;

  try {
    // 1. Load config
    spinner.text = 'Loading configuration...';
    const config = loadConfig(options.config);

    if (!config.tokens?.collections || Object.keys(config.tokens.collections).length === 0) {
      spinner.fail(chalk.red('No collections configured'));
      console.error(chalk.dim('\nAdd collections to tokens.collections in synkio.config.json\n'));
      process.exit(1);
    }

    // 2. Discover token files
    spinner.text = 'Discovering token files...';
    const baseDir = process.cwd();
    const { files, errors: discoveryErrors } = await discoverTokenFiles(
      config.tokens.collections,
      baseDir
    );

    if (discoveryErrors.length > 0) {
      for (const err of discoveryErrors) {
        logger.warn(err);
      }
    }

    if (files.length === 0) {
      spinner.fail(chalk.red('No token files found'));
      console.error(chalk.dim('\nCheck that your token files exist in the configured directories\n'));
      process.exit(1);
    }

    if (options.verbose) {
      spinner.info(`Found ${files.length} token files`);
      spinner.start('Parsing token files...');
    } else {
      spinner.text = 'Parsing token files...';
    }

    // 3. Parse all files
    const parsedFiles: Array<{
      file: typeof files[0];
      tokens: Awaited<ReturnType<typeof parseTokenFile>>['tokens'];
      mode: string;
    }> = [];

    for (const file of files) {
      const { tokens, errors: parseErrors } = await parseTokenFile(file.path);

      if (parseErrors.length > 0) {
        for (const err of parseErrors) {
          logger.warn(`${file.filename}: ${err}`);
        }
      }

      // Check for multi-mode structure (includeMode: true)
      if (tokens.length === 0) {
        const content = JSON.parse(await readFile(file.path, 'utf-8'));
        const multiMode = parseMultiModeFile(content);

        if (multiMode.size > 0) {
          for (const [mode, modeTokens] of multiMode) {
            parsedFiles.push({ file, tokens: modeTokens, mode });
          }
          continue;
        }
      }

      const mode = extractModeFromFile(file, 'value');
      parsedFiles.push({ file, tokens, mode });

      if (options.verbose) {
        logger.info(`  ${file.filename}: ${tokens.length} tokens (mode: ${mode})`);
      }
    }

    // 4. Enrich tokens with variableIds from baseline.json if needed
    //    This enables ID-based comparison even when token files don't include variableId
    let totalEnriched = 0;
    if (!hasAnyVariableIds(parsedFiles)) {
      spinner.text = 'Checking for variableIds in baseline.json...';

      const existingBaseline = await readBaseline();
      if (existingBaseline?.baseline) {
        const lookupMap = buildBaselineLookupMap(existingBaseline.baseline);

        if (lookupMap.size > 0) {
          spinner.text = 'Enriching tokens with variableIds from baseline.json...';

          for (const { file, tokens, mode } of parsedFiles) {
            const { enrichedCount } = enrichTokensWithVariableIds(
              tokens,
              file.collection,
              mode,
              lookupMap
            );
            totalEnriched += enrichedCount;
          }

          if (options.verbose && totalEnriched > 0) {
            logger.info(`  Enriched ${totalEnriched} tokens with variableIds from baseline.json`);
          }
        }
      }
    }

    // 5. Build baseline
    spinner.text = 'Building baseline...';
    const exportData = buildExportBaseline(parsedFiles);

    const tokenCount = Object.keys(exportData.baseline).length;
    const collections = new Set(
      Object.values(exportData.baseline).map(t => t.collection)
    );

    // 5. Output
    if (options.preview) {
      spinner.stop();
      console.log(JSON.stringify(exportData, null, 2));
      console.log('');
      console.log(chalk.cyan(`Preview: ${tokenCount} tokens from ${collections.size} collection(s)`));
    } else {
      spinner.text = 'Writing baseline...';
      await mkdir(dirname(resolve(outputPath)), { recursive: true });
      await writeFile(resolve(outputPath), JSON.stringify(exportData, null, 2));
      
      spinner.succeed(chalk.green('Baseline exported successfully!'));
      console.log('');
      console.log(chalk.dim('  Output:'), outputPath);
      console.log(chalk.dim('  Tokens:'), tokenCount);
      console.log(chalk.dim('  Collections:'), Array.from(collections).join(', '));
      if (totalEnriched > 0) {
        console.log(chalk.dim('  Enriched:'), `${totalEnriched} tokens with variableIds from baseline.json`);
      }
      console.log('');
      console.log(chalk.cyan('  Next steps:'));
      console.log(chalk.dim('    1. Open the Synkio plugin in Figma'));
      console.log(chalk.dim('    2. Import this baseline file'));
      console.log(chalk.dim('    3. Review the diff and click "Apply to Figma"'));
      console.log('');
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Export failed'));
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
    logger.debug('Full error:', error);
    process.exit(1);
  }
}
