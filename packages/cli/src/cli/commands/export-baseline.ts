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
import { discoverTokenFiles, extractModeFromFile, extractGroupFromFile } from '../../core/export/file-discoverer.js';
import { parseTokenFile, parseMultiModeFile, ParsedToken } from '../../core/export/token-parser.js';
import { buildExportBaseline, type BuildExportBaselineOptions, type StylesConfig } from '../../core/export/baseline-builder.js';
import { readBaseline } from '../../core/baseline.js';
import { createLogger } from '../../utils/logger.js';
import type { BaselineEntry, StyleBaselineEntry } from '../../types/index.js';

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
 * Build a lookup map from baseline.json styles for styleId enrichment.
 * Maps path:type -> StyleBaselineEntry
 */
function buildStyleLookupMap(
  styles: Record<string, StyleBaselineEntry> | undefined
): Map<string, StyleBaselineEntry> {
  const map = new Map<string, StyleBaselineEntry>();

  if (!styles) return map;

  for (const entry of Object.values(styles)) {
    if (entry.styleId) {
      const key = `${entry.path}:${entry.type}`;
      map.set(key, entry);
    }
  }

  return map;
}

/**
 * Create lookup functions for baseline enrichment
 */
function createLookupFunctions(
  variableLookupMap: Map<string, BaselineEntry>,
  styleLookupMap: Map<string, StyleBaselineEntry>
): {
  getStyleId: (path: string, figmaType: 'paint' | 'text' | 'effect') => string | undefined;
  getVariableMetadata: (path: string, collection: string, mode: string) => {
    variableId?: string;
    collectionId?: string;
    modeId?: string;
    scopes?: string[];
    codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
  } | undefined;
} {
  return {
    getStyleId: (path: string, figmaType: 'paint' | 'text' | 'effect') => {
      const key = `${path}:${figmaType}`;
      const entry = styleLookupMap.get(key);
      return entry?.styleId;
    },
    getVariableMetadata: (path: string, collection: string, mode: string) => {
      const key = buildPathLookupKey(path, collection, mode);
      const entry = variableLookupMap.get(key);
      if (!entry) return undefined;
      return {
        variableId: entry.variableId,
        collectionId: entry.collectionId,
        modeId: entry.modeId,
        scopes: entry.scopes,
        codeSyntax: entry.codeSyntax,
      };
    },
  };
}

/**
 * Enrich parsed tokens with variableId from baseline.json lookup.
 * This enables ID-based comparison even when token files don't include variableId.
 *
 * Uses a two-pass approach:
 * 1. First, try exact path match
 * 2. If no match, try value-based matching for tokens with the same value in the same collection/mode
 *    This helps handle renamed tokens where the path changed but value stayed the same
 */
function enrichTokensWithVariableIds(
  tokens: ParsedToken[],
  collection: string,
  mode: string,
  lookupMap: Map<string, BaselineEntry>,
  allBaselineEntries: BaselineEntry[]
): { enrichedCount: number; fuzzyMatchCount: number } {
  let enrichedCount = 0;
  let fuzzyMatchCount = 0;

  // Track which variableIds have been used to avoid duplicates
  const usedVariableIds = new Set<string>();

  // First pass: exact path matches
  for (const token of tokens) {
    if (!token.variableId) {
      const key = buildPathLookupKey(token.path, collection, mode);
      const baselineEntry = lookupMap.get(key);

      if (baselineEntry?.variableId) {
        token.variableId = baselineEntry.variableId;
        usedVariableIds.add(baselineEntry.variableId);
        enrichedCount++;
      }
    }
  }

  // Second pass: value-based fuzzy matching for unmatched tokens
  // This helps with renamed tokens where path changed but value is the same
  for (const token of tokens) {
    if (!token.variableId) {
      // Find baseline entries in same collection/mode with matching value
      const candidates = allBaselineEntries.filter(entry =>
        entry.collection === collection &&
        entry.mode === mode &&
        entry.variableId &&
        !usedVariableIds.has(entry.variableId) &&
        valuesMatch(token.value, entry.value)
      );

      // If exactly one candidate, use it (unambiguous match)
      if (candidates.length === 1) {
        token.variableId = candidates[0].variableId;
        usedVariableIds.add(candidates[0].variableId!);
        enrichedCount++;
        fuzzyMatchCount++;
      }
    }
  }

  return { enrichedCount, fuzzyMatchCount };
}

/**
 * Check if two token values match (for fuzzy matching)
 * Handles primitives and reference objects
 */
function valuesMatch(a: unknown, b: unknown): boolean {
  // Handle null/undefined
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }

  // Handle primitives
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  // Handle reference objects (e.g., { $ref: "VariableID:..." })
  if ('$ref' in (a as object) && '$ref' in (b as object)) {
    return (a as { $ref: string }).$ref === (b as { $ref: string }).$ref;
  }

  // For other objects, use JSON comparison
  return JSON.stringify(a) === JSON.stringify(b);
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
 * Add group prefix to token paths when splitBy is "group".
 *
 * When syncing Figma → code with splitBy: "group", a token like `colors.yellow.50`
 * gets written to file `colors.json` with path `yellow.50` (the group becomes the filename).
 * When exporting code → Figma, we need to add the group back as a prefix.
 *
 * @param tokens - Parsed tokens to modify (mutates in place)
 * @param groupPrefix - The group prefix to add (e.g., "colors")
 */
function addGroupPrefixToTokens(tokens: ParsedToken[], groupPrefix: string): void {
  for (const token of tokens) {
    token.path = `${groupPrefix}.${token.path}`;
  }
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
            // Add group prefix for splitBy: "group" collections
            const groupPrefix = extractGroupFromFile(file);
            if (groupPrefix) {
              addGroupPrefixToTokens(modeTokens, groupPrefix);
            }
            parsedFiles.push({ file, tokens: modeTokens, mode });
          }
          continue;
        }
      }

      // Add group prefix for splitBy: "group" collections
      // When splitBy: "group", the filename contains the group (e.g., "colors.json")
      // and we need to prepend it to token paths so they match Figma's structure
      const groupPrefix = extractGroupFromFile(file);
      if (groupPrefix) {
        addGroupPrefixToTokens(tokens, groupPrefix);
      }

      const mode = extractModeFromFile(file, 'value');
      parsedFiles.push({ file, tokens, mode });

      if (options.verbose) {
        logger.info(`  ${file.filename}: ${tokens.length} tokens (mode: ${mode})`);
      }
    }

    // 4. Load existing baseline for enrichment
    spinner.text = 'Loading existing baseline for enrichment...';
    const existingBaseline = await readBaseline();

    // Build lookup maps from existing baseline
    const variableLookupMap = existingBaseline?.baseline
      ? buildBaselineLookupMap(existingBaseline.baseline)
      : new Map<string, BaselineEntry>();
    const styleLookupMap = buildStyleLookupMap(existingBaseline?.styles);

    // Create lookup functions
    const lookupFunctions = createLookupFunctions(variableLookupMap, styleLookupMap);

    // 5. Enrich tokens with variableIds from baseline.json if needed
    //    This enables ID-based comparison even when token files don't include variableId
    let totalEnriched = 0;
    let totalFuzzyMatched = 0;
    if (!hasAnyVariableIds(parsedFiles) && variableLookupMap.size > 0) {
      spinner.text = 'Enriching tokens with variableIds from baseline.json...';
      const allBaselineEntries = Object.values(existingBaseline?.baseline || {});

      for (const { file, tokens, mode } of parsedFiles) {
        const { enrichedCount, fuzzyMatchCount } = enrichTokensWithVariableIds(
          tokens,
          file.collection,
          mode,
          variableLookupMap,
          allBaselineEntries
        );
        totalEnriched += enrichedCount;
        totalFuzzyMatched += fuzzyMatchCount;
      }

      if (options.verbose && totalEnriched > 0) {
        logger.info(`  Enriched ${totalEnriched} tokens with variableIds from baseline.json`);
        if (totalFuzzyMatched > 0) {
          logger.info(`  (${totalFuzzyMatched} matched by value - possible renames)`);
        }
      }
    }

    // 6. Build baseline with styles config and lookup functions
    spinner.text = 'Building baseline...';

    // Extract styles config from config
    const stylesConfig: StylesConfig | undefined = config.tokens?.styles ? {
      paint: config.tokens.styles.paint,
      text: config.tokens.styles.text,
      effect: config.tokens.styles.effect,
    } : undefined;

    const buildOptions: BuildExportBaselineOptions = {
      stylesConfig,
      getStyleId: lookupFunctions.getStyleId,
      getVariableMetadata: lookupFunctions.getVariableMetadata,
    };

    const exportData = buildExportBaseline(parsedFiles, buildOptions);

    const tokenCount = Object.keys(exportData.baseline).length;
    const styleCount = Object.keys(exportData.styles).length;
    const collections = new Set(
      Object.values(exportData.baseline).map(t => t.collection)
    );

    // 7. Output
    if (options.preview) {
      spinner.stop();
      console.log(JSON.stringify(exportData, null, 2));
      console.log('');
      console.log(chalk.cyan(`Preview: ${tokenCount} tokens, ${styleCount} styles from ${collections.size} collection(s)`));
    } else {
      spinner.text = 'Writing baseline...';
      await mkdir(dirname(resolve(outputPath)), { recursive: true });
      await writeFile(resolve(outputPath), JSON.stringify(exportData, null, 2));

      spinner.succeed(chalk.green('Export baseline created!'));
      console.log('');
      console.log(chalk.dim('  Output:'), outputPath);
      console.log(chalk.dim('  Tokens:'), tokenCount);
      console.log(chalk.dim('  Styles:'), styleCount);
      console.log(chalk.dim('  Collections:'), Array.from(collections).join(', '));
      if (totalEnriched > 0) {
        let enrichMsg = `${totalEnriched} tokens with variableIds from baseline.json`;
        if (totalFuzzyMatched > 0) {
          enrichMsg += ` (${totalFuzzyMatched} matched by value)`;
        }
        console.log(chalk.dim('  Enriched:'), enrichMsg);
      }
      console.log('');
      console.log(chalk.yellow('  Important:'));
      console.log(chalk.dim('    Commit and push this file to your repository'));
      console.log(chalk.dim('    so the Figma plugin can fetch it.'));
      console.log('');
      console.log(chalk.cyan('  Next steps:'));
      console.log(chalk.dim('    1. git add .synkio/export-baseline.json'));
      console.log(chalk.dim('    2. git commit -m "Update export baseline"'));
      console.log(chalk.dim('    3. git push'));
      console.log(chalk.dim('    4. In Figma: Synkio plugin → "Apply from Code" → "Fetch from GitHub"'));
      console.log('');
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Export failed'));
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
    logger.debug('Full error:', error);
    process.exit(1);
  }
}
