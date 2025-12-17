import { z } from 'zod';

/**
 * Zod schema for a single token entry from the Synkio Figma plugin
 */
export const SynkioTokenEntrySchema = z.object({
  variableId: z.string(),
  collection: z.string(),
  mode: z.string(),
  path: z.string(),
  value: z.unknown(),
  type: z.string(),
  description: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  codeSyntax: z.object({
    WEB: z.string().optional(),
    ANDROID: z.string().optional(),
    iOS: z.string().optional(),
  }).optional(),
});

/**
 * Zod schema for the complete plugin data format from Synkio
 */
export const SynkioPluginDataSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  tokens: z.array(SynkioTokenEntrySchema),
});
