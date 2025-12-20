import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { CollectionRename } from '../types/index.js';

/** Config file names in priority order (first found wins) */
export const CONFIG_FILES = ['synkio.config.json', 'tokensrc.json'] as const;

/** Default config file name for new projects */
export const DEFAULT_CONFIG_FILE = 'synkio.config.json';

// Figma configuration
const FigmaConfigSchema = z.object({
  fileId: z.string(),
  nodeId: z.string().optional(), // Optional - defaults to document root (0:0)
  accessToken: z.string(),
  baseUrl: z.string().optional(),
});

// Shared transform options schema (useRem, basePxFontSize)
const TransformOptionsSchema = z.object({
  useRem: z.boolean().optional(),                      // Use rem instead of px for dimensions
  basePxFontSize: z.number().optional().default(16),   // Base font size for rem calculations
}).optional();

// Split strategy for collections
const SplitBySchema = z.enum(['mode', 'group', 'none']);

// Collection-specific configuration
const CollectionConfigSchema = z.object({
  dir: z.string().optional(),                         // Output directory for this collection (defaults to tokens.dir)
  file: z.string().optional(),                        // Custom filename pattern (e.g., "colors" -> "colors.json", or with modes: "theme" -> "theme.light.json")
  splitBy: SplitBySchema.optional(),                  // How to split output: "mode" (per mode), "group" (per top-level group), "none" (single file)
  includeMode: z.boolean().optional(),                // Whether to include mode as first-level key (default: false at tokens level)
  names: z.record(z.string(), z.string()).optional(), // Rename modes or groups in output files (e.g., { "light": "day", "dark": "night" } or { "colors": "palette" })
});

const CollectionsConfigSchema = z.record(z.string(), CollectionConfigSchema).optional();

// Merge target for styles - specifies which collection/group to merge styles into
const MergeIntoSchema = z.object({
  collection: z.string(),                            // Target collection name (e.g., "globals")
  group: z.string().optional(),                      // Target group within collection (e.g., "font") - required if collection uses splitBy: "group"
});

// Style type configuration (parallel to CollectionConfig but for styles)
const StyleTypeConfigSchema = z.object({
  enabled: z.boolean().optional().default(true),     // Whether this style type is enabled (default: true)
  dir: z.string().optional(),                        // Output directory for this style type (defaults to tokens.dir)
  file: z.string().optional(),                       // Custom filename (e.g., "colors" -> "colors.json")
  mergeInto: MergeIntoSchema.optional(),             // Merge styles into a variable collection file instead of separate file
});

// Styles configuration (for Figma styles: paint, text, effect)
const StylesConfigSchema = z.object({
  enabled: z.boolean().optional().default(true),     // Master toggle for styles sync (default: true)
  paint: StyleTypeConfigSchema.optional(),           // Paint styles (colors, gradients)
  text: StyleTypeConfigSchema.optional(),            // Text styles (typography)
  effect: StyleTypeConfigSchema.optional(),          // Effect styles (shadows, blurs)
}).optional();

// Token extensions configuration
const TokenExtensionsConfigSchema = z.object({
  description: z.boolean().optional().default(false),    // Include variable descriptions from Figma
  scopes: z.boolean().optional().default(false),         // Include usage scopes (e.g., FRAME_FILL, TEXT_FILL)
  codeSyntax: z.boolean().optional().default(false),     // Include platform code syntax (WEB, ANDROID, iOS)
}).optional();

// Tokens configuration (replaces output.dir and collections)
const TokensConfigSchema = z.object({
  dir: z.string(),                                    // Output directory for token files
  dtcg: z.boolean().optional().default(true),         // Use DTCG format ($value, $type) vs legacy (value, type)
  includeVariableId: z.boolean().optional().default(false), // Include Figma variableId in $extensions
  splitBy: SplitBySchema.optional().default('mode'),  // Default split strategy: "mode" (per mode), "group" (per top-level group), "none" (single file)
  includeMode: z.boolean().optional().default(false), // Default for includeMode across all collections (false = no mode wrapper)
  extensions: TokenExtensionsConfigSchema,            // Optional metadata extensions
  collections: CollectionsConfigSchema,               // Per-collection configuration
  styles: StylesConfigSchema,                         // Figma styles configuration (paint, text, effect)
});

// CSS output configuration for build.css
const CssConfigSchema = z.object({
  enabled: z.boolean().optional().default(false),
  dir: z.string().optional(),                          // Output directory (defaults to tokens.dir)
  file: z.string().optional().default('tokens.css'),   // Output filename
  utilities: z.boolean().optional().default(false),    // Generate utility classes
  utilitiesFile: z.string().optional().default('utilities.css'), // Utilities filename
  transforms: TransformOptionsSchema,
}).optional();

// Build configuration
const BuildConfigSchema = z.object({
  autoRun: z.boolean().optional().default(false),      // If true, run build without prompting after sync
  script: z.string().optional(),                       // Custom build command to run after sync (e.g., "npm run build:tokens")
  css: CssConfigSchema,                                // CSS build options
}).optional();

// Platform definition for docs output (independent of Style Dictionary)
const DocsPlatformSchema = z.object({
  name: z.string(),                                    // Display name: "CSS", "JavaScript", "Swift"
  prefix: z.string().optional(),                       // Variable prefix: "--", "", "k"
  case: z.enum(['kebab', 'camel', 'snake', 'pascal', 'constant']).optional(), // Name casing
  separator: z.string().optional(),                    // Custom separator (overrides case default)
  suffix: z.string().optional(),                       // Optional suffix
});

// Documentation/Dashboard configuration (renamed from docs to docsPages)
const DocsPagesConfigSchema = z.object({
  enabled: z.boolean().optional().default(false),      // Generate documentation site
  dir: z.string().optional().default('.synkio/docs'),   // Output directory
  title: z.string().optional().default('Design Tokens'), // Documentation title
  platforms: z.array(DocsPlatformSchema).optional(),   // Custom platform definitions for variable names
}).optional();

// Sync behavior configuration
const SyncConfigSchema = z.object({
  report: z.boolean().optional().default(true),        // Auto-generate report on sync
  reportHistory: z.boolean().optional().default(false), // Keep timestamped reports as changelog
}).optional();

// Import source configuration - maps Figma export files to collections
// Used with `synkio import` command for importing from Figma native JSON exports
const ImportSourceSchema = z.object({
  dir: z.string().optional(),                         // Directory containing Figma export files (defaults to import.dir)
  files: z.array(z.string()).optional(),              // List of JSON files to import for this collection
});

const ImportConfigSchema = z.object({
  dir: z.string().optional().default('figma-exports'), // Default directory for Figma export files
  sources: z.record(z.string(), ImportSourceSchema).optional(), // Collection name -> source mapping
}).optional();

// Main config schema with new structure
// Uses strict() to reject unknown keys (old schema structure)
export const ConfigSchema = z.object({
  version: z.literal('1.0.0'),
  figma: FigmaConfigSchema,
  tokens: TokensConfigSchema,                          // NEW: replaces output.dir and collections
  build: BuildConfigSchema,                            // Build configuration (script, css)
  docsPages: DocsPagesConfigSchema,                    // NEW: renamed from docs
  sync: SyncConfigSchema,
  import: ImportConfigSchema,
}).strict(); // Reject unknown keys like output, css, docs

export type Config = z.infer<typeof ConfigSchema>;
export type DocsPlatform = z.infer<typeof DocsPlatformSchema>;

/**
 * Find config file in current directory
 * Returns the path and whether it's using a deprecated filename
 */
export function findConfigFile(explicitPath?: string): { path: string; isDeprecated: boolean } | null {
  if (explicitPath) {
    const fullPath = resolve(process.cwd(), explicitPath);
    if (existsSync(fullPath)) {
      return { path: fullPath, isDeprecated: false };
    }
    return null;
  }

  // Auto-discover config file
  for (const filename of CONFIG_FILES) {
    const fullPath = resolve(process.cwd(), filename);
    if (existsSync(fullPath)) {
      const isDeprecated = filename === 'tokensrc.json';
      return { path: fullPath, isDeprecated };
    }
  }

  return null;
}

/**
 * Load and validate config from file
 * @param explicitPath - Optional explicit path to config file
 * @returns Parsed and validated config
 */
export function loadConfig(explicitPath?: string): Config {
  const found = findConfigFile(explicitPath);

  if (!found) {
    if (explicitPath) {
      throw new Error(`Config file not found at ${resolve(process.cwd(), explicitPath)}`);
    }
    throw new Error(
      `No config file found. Looked for:\n` +
      CONFIG_FILES.map(f => `  - ${f}`).join('\n') +
      `\n\nRun 'synkio init' to create a config file.`
    );
  }

  const { path: fullPath, isDeprecated } = found;

  // Warn about deprecated filename
  if (isDeprecated) {
    console.warn(
      `\n⚠️  Warning: 'tokensrc.json' is deprecated.\n` +
      `   Rename to 'synkio.config.json' for future compatibility.\n`
    );
  }

  let content: string;
  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch (error) {
    throw new Error(`Could not read config file at ${fullPath}`);
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
      throw new Error(
        `FIGMA_TOKEN environment variable is not set.\n` +
        `Set it in your .env file or environment, or replace \${FIGMA_TOKEN} in ${fullPath}.`
      );
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
 * Update config file with collection renames
 * This preserves comments and formatting as much as possible by doing targeted replacements
 */
export function updateConfigWithCollectionRenames(
  collectionRenames: CollectionRename[],
  explicitPath?: string
): { updated: boolean; renames: { old: string; new: string }[]; configPath?: string } {
  if (collectionRenames.length === 0) {
    return { updated: false, renames: [] };
  }

  const found = findConfigFile(explicitPath);
  if (!found) {
    return { updated: false, renames: [] };
  }

  const fullPath = found.path;
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

  // Check if there's a collections section (now under tokens.collections)
  const collections = json.tokens?.collections;
  if (!collections) {
    return { updated: false, renames: [] };
  }

  const appliedRenames: { old: string; new: string }[] = [];

  // Apply collection renames
  for (const rename of collectionRenames) {
    const { oldCollection, newCollection } = rename;

    // Check if old collection exists in config
    if (collections[oldCollection]) {
      // Get the old config
      const oldConfig = collections[oldCollection];

      // Delete old key and add new one
      delete collections[oldCollection];
      collections[newCollection] = oldConfig;

      // Update the file name if it matches the old collection name
      if (oldConfig.file === oldCollection) {
        oldConfig.file = newCollection;
      }

      // Update the dir if it contains the old collection name
      if (oldConfig.dir?.includes(oldCollection)) {
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
    return { updated: true, renames: appliedRenames, configPath: fullPath };
  } catch {
    return { updated: false, renames: appliedRenames };
  }
}

/** Split strategy type */
export type SplitBy = z.infer<typeof SplitBySchema>;

/**
 * Collection config with optional dir/file patterns
 */
export interface CollectionConfigInput {
  name: string;
  modes: string[];
  splitBy: SplitBy;
  dir?: string;   // Output directory (supports {mode} placeholder)
  file?: string;  // Output filename pattern (supports {mode} placeholder)
}

/**
 * Update config file with discovered collections
 * Used during first sync to auto-populate tokens.collections
 */
export function updateConfigWithCollections(
  collections: CollectionConfigInput[],
  explicitPath?: string
): { updated: boolean; configPath?: string } {
  if (collections.length === 0) {
    return { updated: false };
  }

  const found = findConfigFile(explicitPath);
  if (!found) {
    return { updated: false };
  }

  const fullPath = found.path;
  let content: string;

  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch {
    return { updated: false };
  }

  let json: any;
  try {
    json = JSON.parse(content);
  } catch {
    return { updated: false };
  }

  // Ensure tokens section exists
  if (!json.tokens) {
    json.tokens = { dir: 'tokens' };
  }

  // Build collections config
  const collectionsConfig: Record<string, { splitBy: SplitBy; dir?: string; file?: string }> = {};
  for (const collection of collections) {
    const config: { splitBy: SplitBy; dir?: string; file?: string } = {
      splitBy: collection.splitBy,
    };
    // Only add dir/file if they differ from defaults
    if (collection.dir) {
      config.dir = collection.dir;
    }
    if (collection.file) {
      config.file = collection.file;
    }
    collectionsConfig[collection.name] = config;
  }

  // Set collections (merge with existing if present)
  json.tokens.collections = {
    ...json.tokens.collections,
    ...collectionsConfig,
  };

  // Write updated config back
  try {
    writeFileSync(fullPath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
    return { updated: true, configPath: fullPath };
  } catch {
    return { updated: false };
  }
}

/**
 * Update config file with build script
 * Used during init when a token build script is detected
 */
export function updateConfigWithBuildScript(
  buildScript: string,
  explicitPath?: string
): { updated: boolean; configPath?: string } {
  const found = findConfigFile(explicitPath);
  if (!found) {
    return { updated: false };
  }

  const fullPath = found.path;
  let content: string;

  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch {
    return { updated: false };
  }

  let json: any;
  try {
    json = JSON.parse(content);
  } catch {
    return { updated: false };
  }

  // Ensure build section exists
  if (!json.build) {
    json.build = {};
  }

  // Set the build script
  json.build.script = buildScript;

  // Write updated config back
  try {
    writeFileSync(fullPath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
    return { updated: true, configPath: fullPath };
  } catch {
    return { updated: false };
  }
}
