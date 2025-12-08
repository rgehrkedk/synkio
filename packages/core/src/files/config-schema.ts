import { z } from 'zod';

/**
 * Zod schema for validating tokensrc.json configuration
 * Serves as single source of truth for config validation
 */
export const tokensConfigSchema = z.object({
  $schema: z.string().optional(),

  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version must be in semver format (e.g., 2.0.0)'),

  figma: z.object({
    fileId: z.string().min(1, { message: 'figma.fileId is required' }),
    accessToken: z.string().min(1, { message: 'figma.accessToken is required - set FIGMA_ACCESS_TOKEN environment variable' }),
    nodeId: z.string().optional(),
  }),

  paths: z.object({
    root: z.string().default('.'),
    data: z.string().min(1, { message: 'paths.data is required' }),
    baseline: z.string().min(1, { message: 'paths.baseline is required' }),
    baselinePrev: z.string().min(1, { message: 'paths.baselinePrev is required' }),
    reports: z.string().min(1, { message: 'paths.reports is required' }),
    tokens: z.string().min(1, { message: 'paths.tokens is required' }),
    styles: z.string().min(1, { message: 'paths.styles is required' }),
    tokenMap: z.string().optional(),
  }),

  collections: z.record(z.string(), z.any()).optional(),

  split: z.record(z.string(), z.object({
    collection: z.string(),
    strategy: z.enum(['byMode', 'byGroup']),
    output: z.string(),
    files: z.record(z.string(), z.string()),
  })).optional(),

  migration: z.object({
    enabled: z.boolean().optional(),
    platforms: z.union([
      z.array(z.string()),
      z.record(z.string(), z.any())
    ]).optional(),
    exclude: z.array(z.string()).optional(),
    autoApply: z.boolean().optional(),
    stripSegments: z.array(z.string()).optional(),
  }).optional(),

  build: z.object({
    command: z.string().optional(),
    styleDictionary: z.object({
      enabled: z.boolean().optional(),
      config: z.string().optional(),
      version: z.enum(['v3', 'v4']).optional(),
    }).optional(),
  }).optional(),
});

/**
 * Type representing a validated configuration
 * Inferred from Zod schema to ensure runtime validation matches compile-time types
 */
export type ResolvedConfig = z.infer<typeof tokensConfigSchema>;

/**
 * Transform Zod validation errors into user-friendly, actionable messages
 */
export function transformZodError(error: z.ZodError<any>): string[] {
  return error.issues.map((err) => {
    const path = err.path.join('.');

    // Provide contextual guidance for common errors
    if (path === 'figma.fileId') {
      return 'Missing required field: figma.fileId - Run \'synkio init\' to configure';
    }
    if (path === 'figma.accessToken') {
      return 'Missing required field: figma.accessToken - Set FIGMA_ACCESS_TOKEN environment variable';
    }
    if (path === 'version') {
      return 'Missing required field: version - Run \'synkio init\' to create a valid config';
    }
    if (path.startsWith('paths.')) {
      return `Missing required path: ${path} - Run 'synkio init' to configure`;
    }

    // Default error message with path context
    return `${path}: ${err.message}`;
  });
}
