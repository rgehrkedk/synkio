import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { BaselineData } from '../types/index.js';
import { Config } from './config.js';
import { parseTokens, ParsedTokens, generateDocs } from './docs/index.js';
import { generateTokensCSS, generateUtilitiesCSS } from './css/index.js';
import type { CSSTransformOptions } from './css/index.js';
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
const DEFAULT_TRANSFORM_OPTIONS = { useRem: false } as const;

function buildTransformOptions(
  transforms?: { useRem?: boolean; basePxFontSize?: number },
  defaults: { useRem: boolean } = DEFAULT_TRANSFORM_OPTIONS
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
 * Generate intermediate format (.tokens-source.json)
 * This is ALWAYS generated during sync - not a "build" step.
 * Used by docs generator and downstream tooling (like Style Dictionary).
 */
export async function generateIntermediateFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<string> {
  const outputDir = resolve(process.cwd(), config.tokens.dir);
  return await writeIntermediateFormat(baseline, config, outputDir);
}

/**
 * Check if any build configuration is present
 */
export function hasBuildConfig(config: Config): boolean {
  return !!(
    config.build?.script ||
    config.build?.css?.enabled
  );
}

/**
 * Get a summary of configured build steps
 */
export function getBuildStepsSummary(config: Config): string[] {
  const steps: string[] = [];
  if (config.build?.script) {
    steps.push(`Script: ${config.build.script}`);
  }
  if (config.build?.css?.enabled) {
    steps.push(`CSS output: ${config.build.css.file || 'tokens.css'}`);
  }
  return steps;
}
