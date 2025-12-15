import { readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

const FigmaConfigSchema = z.object({
  fileId: z.string(),
  nodeId: z.string().optional(), // Optional - defaults to document root (0:0)
  accessToken: z.string(),
  baseUrl: z.string().optional(),
});

// Extensions configuration - optional metadata to include in output
const ExtensionsConfigSchema = z.object({
  description: z.boolean().optional().default(false),  // Include variable descriptions
  scopes: z.boolean().optional().default(false),       // Include usage scopes (ALL_FILLS, STROKE_COLOR, etc.)
  codeSyntax: z.boolean().optional().default(false),   // Include code syntax (WEB, ANDROID, iOS)
}).optional();

// Style Dictionary configuration for advanced users
const StyleDictionaryConfigSchema = z.object({
  configFile: z.string().optional(),                   // Path to custom Style Dictionary config
  outputReferences: z.boolean().optional().default(true), // Use CSS var references in output
  prefix: z.string().optional(),                       // Prefix for all token names
}).optional();

// Available platform presets for Style Dictionary
const PlatformPresetSchema = z.enum([
  'css', 'scss', 'scss-map', 'js', 'ts', 'json', 'json-flat',
  'android', 'ios', 'ios-swift', 'compose'
]);

const OutputConfigSchema = z.object({
  dir: z.string(),
  format: z.literal('json'),
  mode: z.enum(['json', 'style-dictionary']).optional().default('json'), // Output mode
  platforms: z.array(PlatformPresetSchema).optional(), // Platform presets for style-dictionary mode
  styleDictionary: StyleDictionaryConfigSchema,        // Style Dictionary options
  dtcg: z.boolean().optional().default(true),          // Use DTCG format ($value, $type) - default true
  includeVariableId: z.boolean().optional().default(false), // Include Figma variableId in output
  extensions: ExtensionsConfigSchema,                  // Optional metadata extensions
});

// Sync behavior configuration
const SyncConfigSchema = z.object({
  report: z.boolean().optional().default(true),        // Auto-generate report on sync
  reportHistory: z.boolean().optional().default(false), // Keep timestamped reports as changelog
}).optional();

// Shared transform options schema (useRem, basePxFontSize)
const TransformOptionsSchema = z.object({
  useRem: z.boolean().optional(),                      // Use rem instead of px for dimensions
  basePxFontSize: z.number().optional().default(16),   // Base font size for rem calculations
}).optional();

// Base schema for transform outputs (enabled, dir, file)
const BaseTransformSchema = z.object({
  enabled: z.boolean().optional().default(false),
  dir: z.string().optional(),                          // Output directory (defaults to output.dir)
});

// CSS output configuration
const CssConfigSchema = BaseTransformSchema.extend({
  file: z.string().optional().default('tokens.css'),   // Output filename
  utilities: z.boolean().optional().default(false),    // Generate utility classes
  utilitiesFile: z.string().optional().default('utilities.css'), // Utilities filename
  transforms: TransformOptionsSchema,
}).optional();

// Documentation/Dashboard configuration
const DocsConfigSchema = z.object({
  enabled: z.boolean().optional().default(false),      // Generate documentation site
  dir: z.string().optional().default('.synkio/docs'),   // Output directory
  title: z.string().optional().default('Design Tokens'), // Documentation title
}).optional();

// SCSS output configuration
const ScssConfigSchema = BaseTransformSchema.extend({
  file: z.string().optional().default('_tokens.scss'), // Output filename
  maps: z.boolean().optional().default(false),         // Generate SCSS maps
  prefix: z.string().optional().default(''),           // Variable name prefix
  transforms: TransformOptionsSchema,
}).optional();

// JavaScript/TypeScript output configuration
const JsConfigSchema = BaseTransformSchema.extend({
  file: z.string().optional().default('tokens.js'),    // Output filename
  format: z.enum(['nested', 'flat']).optional().default('nested'), // Object structure
  typescript: z.boolean().optional().default(false),   // Generate TypeScript with types
  reactNative: z.boolean().optional().default(false),  // Use React Native transforms (unitless)
  moduleFormat: z.enum(['esm', 'cjs']).optional().default('esm'), // Module format
}).optional();

// Tailwind CSS configuration
const TailwindConfigSchema = BaseTransformSchema.extend({
  file: z.string().optional().default('tailwind.tokens.js'), // Output filename
  extend: z.boolean().optional().default(true),        // Use theme.extend
  esm: z.boolean().optional().default(true),           // ES module format
  cssVariables: z.boolean().optional().default(false), // Use CSS variable references
  transforms: TransformOptionsSchema,
}).optional();

// Collection-specific configuration
const CollectionConfigSchema = z.object({
  dir: z.string().optional(),                         // Output directory for this collection (defaults to output.dir)
  file: z.string().optional(),                        // Custom filename pattern (e.g., "colors" → "colors.json", or with modes: "theme" → "theme.light.json")
  splitModes: z.boolean().optional().default(true),   // Whether to split multi-mode collections into separate files per mode
  includeMode: z.boolean().optional().default(true),  // Whether to include mode as first-level key even when splitting
});

const CollectionsConfigSchema = z.record(z.string(), CollectionConfigSchema).optional();

export const ConfigSchema = z.object({
  version: z.literal('1.0.0'),
  figma: FigmaConfigSchema,
  output: OutputConfigSchema,
  sync: SyncConfigSchema,
  css: CssConfigSchema,
  scss: ScssConfigSchema,
  js: JsConfigSchema,
  tailwind: TailwindConfigSchema,
  docs: DocsConfigSchema,
  collections: CollectionsConfigSchema,
});

export type Config = z.infer<typeof ConfigSchema>;

// A simple config loader
export function loadConfig(filePath: string = 'tokensrc.json'): Config {
  const fullPath = resolve(process.cwd(), filePath);
  let content: string;
  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch (error) {
    throw new Error(`Config file not found at ${fullPath}`);
  }

  let json: any;
  try {
    json = JSON.parse(content);
  } catch (error) {
    throw new Error(`Could not parse JSON in ${fullPath}`);
  }
  
  // Replace env var placeholder
  if (json.figma?.accessToken === '${FIGMA_TOKEN}') {
    if (process.env.FIGMA_TOKEN) {
      json.figma.accessToken = process.env.FIGMA_TOKEN;
    } else {
      throw new Error('FIGMA_TOKEN environment variable is not set, but is required by tokensrc.json.');
    }
  }

  const result = ConfigSchema.safeParse(json);

  if (!result.success) {
    const issues = result.error.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid configuration in ${fullPath}:\n${issues}`);
  }

  return result.data;
}
