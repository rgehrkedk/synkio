import { mkdir, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { BaselineData } from '../types/index.js';
import { Config } from './config.js';
import { parseTokens, ParsedTokens } from './docs/index.js';
import { generateTokensCSS, generateUtilitiesCSS } from './docs/css-generator.js';
import { generateDocs } from './docs/index.js';
import { CSSTransformOptions } from './transforms/index.js';
import { generateSCSS } from './generators/scss-generator.js';
import { generateJS, generateTSTypes } from './generators/js-generator.js';
import { generateTailwindConfig } from './generators/tailwind-generator.js';

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
  
  const tokens = parseTokens(baseline);
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
 */
export async function generateCssFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<TransformResult> {
  const cssConfig = config.css;
  if (!cssConfig?.enabled) return EMPTY_RESULT;
  
  const ctx = await prepareTransformContext(baseline, cssConfig.dir, config.output.dir);
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
 */
export async function generateDocsFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<{ files: string[]; outputDir: string }> {
  const docsConfig = config.docs;
  
  if (!docsConfig?.enabled) {
    return { files: [], outputDir: '' };
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
 * Generate SCSS files from baseline data
 */
export async function generateScssFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<TransformResult> {
  const scssConfig = config.scss;
  if (!scssConfig?.enabled) return EMPTY_RESULT;
  
  const ctx = await prepareTransformContext(baseline, scssConfig.dir, config.output.dir);
  const files: string[] = [];
  const transformOptions = buildTransformOptions(scssConfig.transforms);
  
  // Generate SCSS
  const scss = generateSCSS(ctx.tokens.all, ctx.modeNames, {
    ...transformOptions,
    maps: scssConfig.maps ?? false,
    prefix: scssConfig.prefix ?? '',
  });
  
  await writeTransformFile(ctx.outputDir, scssConfig.file || '_tokens.scss', scss, files);
  
  return { files, outputDir: ctx.outputDir };
}

/**
 * Generate JavaScript/TypeScript files from baseline data
 */
export async function generateJsFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<TransformResult> {
  const jsConfig = config.js;
  if (!jsConfig?.enabled) return EMPTY_RESULT;
  
  const ctx = await prepareTransformContext(baseline, jsConfig.dir, config.output.dir);
  const files: string[] = [];
  
  // Generate JS/TS
  const js = generateJS(ctx.tokens.all, ctx.modeNames, {
    format: jsConfig.format ?? 'nested',
    typescript: jsConfig.typescript ?? false,
    reactNative: jsConfig.reactNative ?? false,
    moduleFormat: jsConfig.moduleFormat ?? 'esm',
  });
  
  // Determine file extension
  let jsFile = jsConfig.file || 'tokens.js';
  if (jsConfig.typescript && !jsFile.endsWith('.ts')) {
    jsFile = jsFile.replace(/\.js$/, '.ts');
  }
  
  await writeTransformFile(ctx.outputDir, jsFile, js, files);
  
  // Generate TypeScript type definitions if needed (only for .js files)
  if (jsConfig.typescript && !jsFile.endsWith('.ts')) {
    const types = generateTSTypes(ctx.tokens.all, ctx.modeNames);
    const typesFile = jsFile.replace(/\.(js|ts)$/, '.d.ts');
    await writeTransformFile(ctx.outputDir, typesFile, types, files);
  }
  
  return { files, outputDir: ctx.outputDir };
}

/**
 * Generate Tailwind config from baseline data
 */
export async function generateTailwindFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<TransformResult> {
  const tailwindConfig = config.tailwind;
  if (!tailwindConfig?.enabled) return EMPTY_RESULT;
  
  const ctx = await prepareTransformContext(baseline, tailwindConfig.dir, config.output.dir);
  const files: string[] = [];
  const transformOptions = buildTransformOptions(tailwindConfig.transforms, { useRem: true });
  
  // Generate Tailwind config
  const tailwind = generateTailwindConfig(ctx.tokens.all, ctx.modeNames, {
    ...transformOptions,
    extend: tailwindConfig.extend ?? true,
    esm: tailwindConfig.esm ?? true,
    cssVariables: tailwindConfig.cssVariables ?? false,
  });
  
  await writeTransformFile(ctx.outputDir, tailwindConfig.file || 'tailwind.tokens.js', tailwind, files);
  
  return { files, outputDir: ctx.outputDir };
}

/**
 * Generate all enabled output formats from baseline
 */
export async function generateAllFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<{
  css: TransformResult;
  scss: TransformResult;
  js: TransformResult;
  tailwind: TransformResult;
  docs: TransformResult;
}> {
  const [css, scss, js, tailwind, docs] = await Promise.all([
    generateCssFromBaseline(baseline, config),
    generateScssFromBaseline(baseline, config),
    generateJsFromBaseline(baseline, config),
    generateTailwindFromBaseline(baseline, config),
    generateDocsFromBaseline(baseline, config),
  ]);
  
  return { css, scss, js, tailwind, docs };
}
