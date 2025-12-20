import { z } from 'zod';

// =============================================================================
// Variable Token Schemas
// =============================================================================

/**
 * Zod schema for a single token entry from the Synkio Figma plugin
 */
export const SynkioTokenEntrySchema = z.object({
  variableId: z.string(),
  collectionId: z.string().optional(),
  modeId: z.string().optional(),
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

// =============================================================================
// Style Schemas (v3.0.0+)
// =============================================================================

export const StyleTypeSchema = z.enum(['paint', 'text', 'effect']);

/** Solid color value */
const SolidColorValueSchema = z.object({
  $type: z.literal('color'),
  $value: z.string(),
});

/** Gradient stop */
const GradientStopSchema = z.object({
  color: z.string(),
  position: z.number(),
});

/** Gradient value */
const GradientValueSchema = z.object({
  $type: z.literal('gradient'),
  $value: z.object({
    gradientType: z.enum(['linear', 'radial', 'angular', 'diamond']),
    stops: z.array(GradientStopSchema),
    angle: z.number().optional(),
  }),
});

/** Paint style value (color or gradient) */
const PaintStyleValueSchema = z.union([SolidColorValueSchema, GradientValueSchema]);

/** Typography value (DTCG composite) */
const TypographyValueSchema = z.object({
  $type: z.literal('typography'),
  $value: z.object({
    fontFamily: z.string(),
    fontSize: z.string(),
    fontWeight: z.union([z.number(), z.string()]),
    lineHeight: z.union([z.string(), z.number()]),
    letterSpacing: z.string(),
    textTransform: z.string().optional(),
    textDecoration: z.string().optional(),
  }),
});

/** Shadow object */
const ShadowObjectSchema = z.object({
  offsetX: z.string(),
  offsetY: z.string(),
  blur: z.string(),
  spread: z.string(),
  color: z.string(),
  inset: z.boolean().optional(),
});

/** Shadow value (single or multiple) */
const ShadowValueSchema = z.object({
  $type: z.literal('shadow'),
  $value: z.union([ShadowObjectSchema, z.array(ShadowObjectSchema)]),
});

/** Blur value */
const BlurValueSchema = z.object({
  $type: z.literal('blur'),
  $value: z.object({
    radius: z.string(),
  }),
});

/** Effect style value (shadow or blur) */
const EffectStyleValueSchema = z.union([ShadowValueSchema, BlurValueSchema]);

/** Base style entry (shared fields) */
const StyleEntryBaseSchema = z.object({
  styleId: z.string(),
  type: StyleTypeSchema,
  path: z.string(),
  description: z.string().optional(),
});

/** Paint style entry */
export const PaintStyleEntrySchema = StyleEntryBaseSchema.extend({
  type: z.literal('paint'),
  value: PaintStyleValueSchema,
});

/** Text style entry */
export const TextStyleEntrySchema = StyleEntryBaseSchema.extend({
  type: z.literal('text'),
  value: TypographyValueSchema,
});

/** Effect style entry */
export const EffectStyleEntrySchema = StyleEntryBaseSchema.extend({
  type: z.literal('effect'),
  value: EffectStyleValueSchema,
});

/** Union of all style entry types */
export const StyleEntrySchema = z.discriminatedUnion('type', [
  PaintStyleEntrySchema,
  TextStyleEntrySchema,
  EffectStyleEntrySchema,
]);

// =============================================================================
// Plugin Data Schema
// =============================================================================

/**
 * Zod schema for the complete plugin data format from Synkio (v2 - tokens only)
 */
export const SynkioPluginDataSchemaV2 = z.object({
  version: z.string(),
  timestamp: z.string(),
  tokens: z.array(SynkioTokenEntrySchema),
});

/**
 * Zod schema for the complete plugin data format from Synkio (v3 - tokens + styles)
 */
export const SynkioPluginDataSchemaV3 = z.object({
  version: z.string(),
  timestamp: z.string(),
  tokens: z.array(SynkioTokenEntrySchema),
  styles: z.array(StyleEntrySchema).optional(),
});

/**
 * Combined schema that accepts both v2 and v3 formats
 */
export const SynkioPluginDataSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  tokens: z.array(SynkioTokenEntrySchema),
  styles: z.array(StyleEntrySchema).optional(),
});

// Export inferred types
export type StyleType = z.infer<typeof StyleTypeSchema>;
export type StyleEntry = z.infer<typeof StyleEntrySchema>;
export type PaintStyleEntry = z.infer<typeof PaintStyleEntrySchema>;
export type TextStyleEntry = z.infer<typeof TextStyleEntrySchema>;
export type EffectStyleEntry = z.infer<typeof EffectStyleEntrySchema>;
