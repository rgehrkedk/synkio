import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';
import type { CollectionRename } from '../types/index.js';

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
  configFile: z.string().optional(),                   // Path to external Style Dictionary config file
  outputReferences: z.boolean().optional().default(true), // Use CSS var references in output
  prefix: z.string().optional(),                       // Prefix for all token names
  // Inline Style Dictionary config - passed directly to SD
  // See: https://styledictionary.com/reference/config/
  transformGroup: z.string().optional(),               // e.g., "css", "scss", "js"
  transforms: z.array(z.string()).optional(),          // Custom transform names
  buildPath: z.string().optional(),                    // Output path for SD files
  files: z.array(z.object({
    destination: z.string(),
    format: z.string(),
    filter: z.any().optional(),
    options: z.record(z.string(), z.any()).optional(),
  })).optional(),
  // Full platforms config for multi-platform builds
  platforms: z.record(z.string(), z.object({
    transformGroup: z.string().optional(),
    transforms: z.array(z.string()).optional(),
    buildPath: z.string().optional(),
    prefix: z.string().optional(),
    files: z.array(z.object({
      destination: z.string(),
      format: z.string(),
      filter: z.any().optional(),
      options: z.record(z.string(), z.any()).optional(),
    })),
  })).optional(),
}).optional();

const OutputConfigSchema = z.object({
  dir: z.string(),
  format: z.literal('json'),
  mode: z.enum(['json', 'style-dictionary']).optional().default('json'), // Output mode
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

/**
 * Update tokensrc.json with collection renames
 * This preserves comments and formatting as much as possible by doing targeted replacements
 */
export function updateConfigWithCollectionRenames(
  collectionRenames: CollectionRename[],
  filePath: string = 'tokensrc.json'
): { updated: boolean; renames: { old: string; new: string }[] } {
  if (collectionRenames.length === 0) {
    return { updated: false, renames: [] };
  }

  const fullPath = resolve(process.cwd(), filePath);
  let content: string;

  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch {
    return { updated: false, renames: [] };
  }

  let json: any;
  try {
    json = JSON.parse(content);
  } catch {
    return { updated: false, renames: [] };
  }

  // Check if there's a collections section
  if (!json.collections) {
    return { updated: false, renames: [] };
  }

  const appliedRenames: { old: string; new: string }[] = [];

  // Apply collection renames
  for (const rename of collectionRenames) {
    const { oldCollection, newCollection } = rename;

    // Check if old collection exists in config
    if (json.collections[oldCollection]) {
      // Get the old config
      const oldConfig = json.collections[oldCollection];

      // Delete old key and add new one
      delete json.collections[oldCollection];
      json.collections[newCollection] = oldConfig;

      // Update the file name if it matches the old collection name
      if (oldConfig.file === oldCollection) {
        oldConfig.file = newCollection;
      }

      // Update the dir if it contains the old collection name
      if (oldConfig.dir && oldConfig.dir.includes(oldCollection)) {
        oldConfig.dir = oldConfig.dir.replace(oldCollection, newCollection);
      }

      appliedRenames.push({ old: oldCollection, new: newCollection });
    }
  }

  if (appliedRenames.length === 0) {
    return { updated: false, renames: [] };
  }

  // Write updated config back
  try {
    writeFileSync(fullPath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
    return { updated: true, renames: appliedRenames };
  } catch {
    return { updated: false, renames: appliedRenames };
  }
}
