import { mkdir, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { BaselineData } from '../types/index.js';
import { Config } from './config.js';
import { parseTokens } from './docs/index.js';
import { generateTokensCSS, generateUtilitiesCSS } from './docs/css-generator.js';
import { generateDocs } from './docs/index.js';
import { CSSTransformOptions } from './transforms/index.js';
import { generateSCSS } from './generators/scss-generator.js';
import { generateJS, generateTSTypes } from './generators/js-generator.js';
import { generateTailwindConfig } from './generators/tailwind-generator.js';

/**
 * Generate CSS files from baseline data
 */
export async function generateCssFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<{ files: string[]; outputDir: string }> {
  const cssConfig = config.css;
  
  if (!cssConfig?.enabled) {
    return { files: [], outputDir: '' };
  }
  
  // Use css.dir if specified, otherwise fall back to output.dir
  const outputDir = resolve(process.cwd(), cssConfig.dir || config.output.dir);
  await mkdir(outputDir, { recursive: true });
  
  const tokens = parseTokens(baseline);
  const modeNames = Array.from(tokens.modes.keys());
  const files: string[] = [];
  
  // Build transform options from config
  const transformOptions: CSSTransformOptions = {
    useRem: cssConfig.transforms?.useRem ?? false,
    basePxFontSize: cssConfig.transforms?.basePxFontSize ?? 16,
  };
  
  // Generate tokens.css
  const tokensCSS = generateTokensCSS(tokens.all, modeNames, transformOptions);
  const tokensCssFile = cssConfig.file || 'tokens.css';
  await writeFile(join(outputDir, tokensCssFile), tokensCSS, 'utf-8');
  files.push(tokensCssFile);
  
  // Generate utilities.css if enabled
  if (cssConfig.utilities) {
    const utilitiesCSS = generateUtilitiesCSS(tokens.all);
    const utilitiesFile = cssConfig.utilitiesFile || 'utilities.css';
    await writeFile(join(outputDir, utilitiesFile), utilitiesCSS, 'utf-8');
    files.push(utilitiesFile);
  }
  
  return { files, outputDir };
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
): Promise<{ files: string[]; outputDir: string }> {
  const scssConfig = config.scss;
  
  if (!scssConfig?.enabled) {
    return { files: [], outputDir: '' };
  }
  
  // Use scss.dir if specified, otherwise fall back to output.dir
  const outputDir = resolve(process.cwd(), scssConfig.dir || config.output.dir);
  await mkdir(outputDir, { recursive: true });
  
  const tokens = parseTokens(baseline);
  const modeNames = Array.from(tokens.modes.keys());
  const files: string[] = [];
  
  const transformOptions: CSSTransformOptions = {
    useRem: scssConfig.transforms?.useRem ?? false,
    basePxFontSize: scssConfig.transforms?.basePxFontSize ?? 16,
  };
  
  // Generate SCSS
  const scss = generateSCSS(tokens.all, modeNames, {
    ...transformOptions,
    maps: scssConfig.maps ?? false,
    prefix: scssConfig.prefix ?? '',
  });
  
  const scssFile = scssConfig.file || '_tokens.scss';
  await writeFile(join(outputDir, scssFile), scss, 'utf-8');
  files.push(scssFile);
  
  return { files, outputDir };
}

/**
 * Generate JavaScript/TypeScript files from baseline data
 */
export async function generateJsFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<{ files: string[]; outputDir: string }> {
  const jsConfig = config.js;
  
  if (!jsConfig?.enabled) {
    return { files: [], outputDir: '' };
  }
  
  // Use js.dir if specified, otherwise fall back to output.dir
  const outputDir = resolve(process.cwd(), jsConfig.dir || config.output.dir);
  await mkdir(outputDir, { recursive: true });
  
  const tokens = parseTokens(baseline);
  const modeNames = Array.from(tokens.modes.keys());
  const files: string[] = [];
  
  // Generate JS/TS
  const js = generateJS(tokens.all, modeNames, {
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
  
  await writeFile(join(outputDir, jsFile), js, 'utf-8');
  files.push(jsFile);
  
  // Generate TypeScript type definitions if needed
  if (jsConfig.typescript) {
    const types = generateTSTypes(tokens.all, modeNames);
    const typesFile = jsFile.replace(/\.(js|ts)$/, '.d.ts');
    // Only write separate .d.ts if the main file is .js
    if (!jsFile.endsWith('.ts')) {
      await writeFile(join(outputDir, typesFile), types, 'utf-8');
      files.push(typesFile);
    }
  }
  
  return { files, outputDir };
}

/**
 * Generate Tailwind config from baseline data
 */
export async function generateTailwindFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<{ files: string[]; outputDir: string }> {
  const tailwindConfig = config.tailwind;
  
  if (!tailwindConfig?.enabled) {
    return { files: [], outputDir: '' };
  }
  
  // Use tailwind.dir if specified, otherwise fall back to output.dir
  const outputDir = resolve(process.cwd(), tailwindConfig.dir || config.output.dir);
  await mkdir(outputDir, { recursive: true });
  
  const tokens = parseTokens(baseline);
  const modeNames = Array.from(tokens.modes.keys());
  const files: string[] = [];
  
  const transformOptions: CSSTransformOptions = {
    useRem: tailwindConfig.transforms?.useRem ?? true,
    basePxFontSize: tailwindConfig.transforms?.basePxFontSize ?? 16,
  };
  
  // Generate Tailwind config
  const tailwind = generateTailwindConfig(tokens.all, modeNames, {
    ...transformOptions,
    extend: tailwindConfig.extend ?? true,
    esm: tailwindConfig.esm ?? true,
    cssVariables: tailwindConfig.cssVariables ?? false,
  });
  
  const tailwindFile = tailwindConfig.file || 'tailwind.tokens.js';
  await writeFile(join(outputDir, tailwindFile), tailwind, 'utf-8');
  files.push(tailwindFile);
  
  return { files, outputDir };
}

/**
 * Generate all enabled output formats from baseline
 */
export async function generateAllFromBaseline(
  baseline: BaselineData,
  config: Config
): Promise<{
  css: { files: string[]; outputDir: string };
  scss: { files: string[]; outputDir: string };
  js: { files: string[]; outputDir: string };
  tailwind: { files: string[]; outputDir: string };
  docs: { files: string[]; outputDir: string };
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
