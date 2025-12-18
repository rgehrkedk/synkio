import { mkdir, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { BaselineData } from '../types/index.js';
import { Config } from './config.js';
import { parseTokens, ParsedTokens } from './docs/index.js';
import { generateTokensCSS, generateUtilitiesCSS } from './css/index.js';
import type { CSSTransformOptions } from './css/index.js';
import { generateDocs } from './docs/index.js';
import {
  buildWithStyleDictionary,
  StyleDictionaryNotInstalledError,
  isStyleDictionaryAvailable
} from './style-dictionary/index.js';
import { writeIntermediateFormat } from './intermediate-tokens.js';

/**
 * Result of a transform generation
 */
interface TransformResult {
  files: string[];
  outputDir: string;
}

/**
 * Empty result for disabled transforms
 */
const EMPTY_RESULT: TransformResult = { files: [], outputDir: '' };

/**
 * Common options for transform generation
 */
interface TransformContext {
  outputDir: string;
  tokens: ParsedTokens;
  modeNames: string[];
}

/**
 * Prepare common context for transform generation
 * Handles directory creation and token parsing
 */
async function prepareTransformContext(
  baseline: BaselineData,
  dir: string | undefined,
  defaultDir: string
): Promise<TransformContext> {
  const outputDir = resolve(process.cwd(), dir || defaultDir);
  await mkdir(outputDir, { recursive: true });

  const tokens = await parseTokens(baseline);
  const modeNames = Array.from(tokens.modes.keys());

  return { outputDir, tokens, modeNames };
}

/**
 * Build CSS transform options from config
 */
function buildTransformOptions(
  transforms?: { useRem?: boolean; basePxFontSize?: number },
  defaults: { useRem: boolean } = { useRem: false }
): CSSTransformOptions {
  return {
    useRem: transforms?.useRem ?? defaults.useRem,
    basePxFontSize: transforms?.basePxFontSize ?? 16,
  };
}

/**
 * Write a file and track it in the files array
 */
async function writeTransformFile(
  outputDir: string,
  fileName: string,
  content: string,
  files: string[]
): Promise<void> {
  await writeFile(join(outputDir, fileName), content, 'utf-8');
  files.push(fileName);
}

/**
 * Generate CSS files from baseline data
 * Zero-dependency CSS output for simple use cases
 * Uses new config structure: build.css
 */
export async function generateCssFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<TransformResult> {
  // Use new config structure: build.css
  const cssConfig = config.build?.css;
  if (!cssConfig?.enabled) return EMPTY_RESULT;

  // Use css.dir if specified, otherwise fall back to tokens.dir
  const ctx = await prepareTransformContext(baseline, cssConfig.dir, config.tokens.dir);
  const files: string[] = [];
  const transformOptions = buildTransformOptions(cssConfig.transforms);

  // Generate tokens.css
  const tokensCSS = generateTokensCSS(ctx.tokens.all, ctx.modeNames, transformOptions);
  await writeTransformFile(ctx.outputDir, cssConfig.file || 'tokens.css', tokensCSS, files);

  // Generate utilities.css if enabled
  if (cssConfig.utilities) {
    const utilitiesCSS = generateUtilitiesCSS(ctx.tokens.all);
    await writeTransformFile(ctx.outputDir, cssConfig.utilitiesFile || 'utilities.css', utilitiesCSS, files);
  }

  return { files, outputDir: ctx.outputDir };
}

/**
 * Generate documentation site from baseline data
 * Uses new config structure: docsPages
 */
export async function generateDocsFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<TransformResult> {
  // Use new config structure: docsPages
  const docsConfig = config.docsPages;

  if (!docsConfig?.enabled) {
    return EMPTY_RESULT;
  }

  const outputDir = resolve(process.cwd(), docsConfig.dir || '.synkio/docs');

  const result = await generateDocs(baseline, {
    outputDir,
    title: docsConfig.title || 'Design Tokens',
    config,
  });

  // Write files
  await mkdir(outputDir, { recursive: true });
  await mkdir(join(outputDir, 'assets'), { recursive: true });

  const files: string[] = [];
  for (const [filename, content] of Object.entries(result.files)) {
    const filePath = join(outputDir, filename);
    // Ensure directory exists for nested files
    const dir = filename.split('/').slice(0, -1).join('/');
    if (dir) {
      await mkdir(join(outputDir, dir), { recursive: true }).catch(() => {});
    }
    await writeFile(filePath, content, 'utf-8');
    files.push(filename);
  }

  return { files, outputDir };
}

/**
 * Generate all enabled output formats from baseline
 *
 * For simple use cases, use build.css (zero-dependency)
 * For advanced needs (SCSS, JS, TS, etc.), use build.styleDictionary
 *
 * IMPORTANT: Always generates .tokens-source.json in the output directory
 * for use by the docs generator and other tools.
 */
export async function generateAllFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<{
  css: TransformResult;
  docs: TransformResult;
  styleDictionary?: TransformResult;
  intermediateFormat?: string;
}> {
  // Generate intermediate format for ALL modes (not just SD)
  // This provides clean DTCG tokens with metadata for docs
  const outputDir = resolve(process.cwd(), config.tokens.dir);
  const intermediateFormatPath = await writeIntermediateFormat(baseline, config, outputDir);

  const [css, docs] = await Promise.all([
    generateCssFromBaseline(baseline, config),
    generateDocsFromBaseline(baseline, config),
  ]);

  return { css, docs, intermediateFormat: intermediateFormatPath };
}

/**
 * Generate outputs using Style Dictionary
 * This provides full platform support: CSS, SCSS, JS, TS, iOS, Android, etc.
 * Uses new config structure: build.styleDictionary
 */
export async function generateWithStyleDictionary(
  baseline: BaselineData,
  config: Config
): Promise<TransformResult> {
  // Use new config structure: build.styleDictionary
  const sdConfig = config.build?.styleDictionary;

  // Check if Style Dictionary mode is enabled via configFile
  if (!sdConfig?.configFile) {
    return EMPTY_RESULT;
  }

  const outputDir = resolve(process.cwd(), config.tokens.dir);

  try {
    const result = await buildWithStyleDictionary(baseline, {
      outputDir,
      configFile: sdConfig.configFile,
      // Pass inline Style Dictionary config
      inlineConfig: sdConfig ? {
        transformGroup: sdConfig.transformGroup,
        transforms: sdConfig.transforms,
        buildPath: sdConfig.buildPath,
        files: sdConfig.files as { destination: string; format: string; filter?: unknown; options?: Record<string, unknown> }[] | undefined,
        platforms: sdConfig.platforms as Record<string, { transformGroup?: string; transforms?: string[]; buildPath?: string; prefix?: string; files: { destination: string; format: string; filter?: unknown; options?: Record<string, unknown> }[] }> | undefined,
      } : undefined,
      options: {
        outputReferences: sdConfig.outputReferences ?? true,
        prefix: sdConfig.prefix,
      },
      config, // Pass config for intermediate format generation
    });

    return {
      files: result.files,
      outputDir: result.outputDir
    };
  } catch (error) {
    if (error instanceof StyleDictionaryNotInstalledError) {
      throw error;
    }
    throw new Error(`Style Dictionary build failed: ${error}`);
  }
}

/**
 * Check if Style Dictionary is available as a peer dependency
 */
export { isStyleDictionaryAvailable };
