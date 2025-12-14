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

const OutputConfigSchema = z.object({
  dir: z.string(),
  format: z.literal('json'),
  dtcg: z.boolean().optional().default(true),            // Use DTCG format ($value, $type) - default true
  includeVariableId: z.boolean().optional().default(false), // Include Figma variableId in output - default false
  extensions: ExtensionsConfigSchema,                    // Optional metadata extensions
});

// Sync behavior configuration
const SyncConfigSchema = z.object({
  report: z.boolean().optional().default(true),        // Auto-generate report on sync
  reportHistory: z.boolean().optional().default(false), // Keep timestamped reports as changelog
}).optional();

// Collection-specific configuration
const CollectionConfigSchema = z.object({
  splitModes: z.boolean().optional().default(true),   // Whether to split multi-mode collections into separate files per mode
  includeMode: z.boolean().optional().default(true),  // Whether to include mode as first-level key even when splitting
});

const CollectionsConfigSchema = z.record(z.string(), CollectionConfigSchema).optional();

export const ConfigSchema = z.object({
  version: z.literal('1.0.0'),
  figma: FigmaConfigSchema,
  output: OutputConfigSchema,
  sync: SyncConfigSchema,
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
