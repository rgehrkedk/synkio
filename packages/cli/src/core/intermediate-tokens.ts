/**
 * Intermediate Token Format
 *
 * This module generates a unified intermediate token format (.tokens-source.json)
 * that is used by both the documentation generator and Style Dictionary.
 *
 * The intermediate format provides:
 * - DTCG-compliant token structure ($value, $type, $description)
 * - Clean, human-readable token paths
 * - Resolved references in {path} format
 * - Metadata from tokensrc.json configuration
 * - Output format information for docs display
 * - Platform-specific naming conventions (derived from Style Dictionary when available)
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { BaselineData, BaselineEntry } from '../types/index.js';
import { Config } from './config.js';
import { mapToDTCGType } from './tokens.js';
import { getSDPlatformsInfo } from './sd-hooks.js';

/**
 * Extended intermediate format with metadata
 */
export interface IntermediateTokenFormat {
  /** DTCG tokens in nested structure */
  tokens: Record<string, unknown>;

  /** Metadata about the token source and output configuration */
  $metadata: {
    /** When the tokens were synced from Figma */
    syncedAt: string;

    /** Source information */
    source: {
      figmaFileId: string;
      figmaNodeId?: string;
    };

    /** Output configuration from tokensrc.json */
    output: {
      /** Output mode: json, style-dictionary */
      mode: string;

      /** Whether DTCG format is used */
      dtcg: boolean;

      /** Directory where tokens are output */
      dir: string;

      /** CSS configuration if enabled */
      css?: {
        enabled: boolean;
        file?: string;
        transforms?: {
          useRem?: boolean;
          basePxFontSize?: number;
        };
      };

      /** Style Dictionary configuration if in SD mode */
      styleDictionary?: {
        buildPath?: string;
        /** Platform info with name transforms (derived from SD hooks when available) */
        platforms?: Record<string, {
          transformGroup: string;
          /** The SD name transform (e.g., 'name/camel', 'name/snake') - used by SD's actual transform function */
          nameTransform?: string;
          buildPath?: string;
          files?: Array<{ destination: string; format: string }>;
        }>;
        outputReferences?: boolean;
      };
    };

    /** Variable naming conventions based on output format */
    variableNaming: {
      /** CSS variable prefix (e.g., "--" or custom prefix) */
      prefix: string;

      /** Separator used in variable names (e.g., "-") */
      separator: string;

      /** Example variable name for reference */
      example: string;
    };

    /** Collection information */
    collections: string[];

    /** Mode information */
    modes: string[];
  };
}

/**
 * Convert Synkio baseline data to DTCG-compliant intermediate format
 * This is used by both Style Dictionary and the docs generator
 */
export function convertToIntermediateFormat(
  baseline: BaselineData,
  config: Config
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Build lookup map from VariableID to path for resolving references
  const variableIdToPath = new Map<string, string>();
  for (const entry of Object.values(baseline.baseline)) {
    if (entry.variableId && entry.path) {
      variableIdToPath.set(entry.variableId, entry.path);
    }
  }

  for (const [key, entry] of Object.entries(baseline.baseline)) {
    const pathParts = entry.path.split('.');
    let current = result;

    // Navigate/create nested structure
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    // Set the token value using DTCG format
    const tokenName = pathParts[pathParts.length - 1];

    // Resolve references to DTCG format: { "$ref": "VariableID:1:38" } → "{path.to.token}"
    let resolvedValue: unknown;
    if (entry.value && typeof entry.value === 'object' && '$ref' in entry.value) {
      const refVariableId = (entry.value as { $ref: string }).$ref;
      const refPath = variableIdToPath.get(refVariableId);
      if (refPath) {
        // DTCG reference format: string wrapped in curly braces
        resolvedValue = `{${refPath}}`;
      } else {
        console.warn(`Warning: Could not resolve reference ${refVariableId} for token ${entry.path}`);
        resolvedValue = entry.value;
      }
    } else {
      // Pass raw values - normalize colors to hex/rgba format
      resolvedValue = normalizeColorValue(entry.value, entry.type);
    }

    current[tokenName] = {
      $value: resolvedValue,
      // Use shared mapping logic to infer correct DTCG type
      $type: mapToDTCGType(entry.type, entry.path),
      ...(entry.description && { $description: entry.description }),
    };
  }

  return result;
}

/**
 * Only normalize Figma color objects to hex/rgba format
 * All other values are passed through as-is
 */
function normalizeColorValue(value: unknown, type: string): unknown {
  // Handle Figma color objects { r, g, b, a } - must convert to string format
  if (type.toLowerCase() === 'color' && typeof value === 'object' && value !== null) {
    const v = value as { r?: number; g?: number; b?: number; a?: number };
    if ('r' in v && 'g' in v && 'b' in v) {
      const r = Math.round((v.r ?? 0) * 255);
      const g = Math.round((v.g ?? 0) * 255);
      const b = Math.round((v.b ?? 0) * 255);
      const a = v.a ?? 1;

      if (a === 1) {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  // Return raw value - no transforms
  return value;
}

/**
 * Generate variable naming conventions based on config
 */
function generateVariableNaming(config: Config): {
  prefix: string;
  separator: string;
  example: string;
} {
  // Determine prefix
  let prefix = '--';
  if (config.output.mode === 'style-dictionary' && config.output.styleDictionary?.prefix) {
    prefix = `--${config.output.styleDictionary.prefix}-`;
  }

  // CSS uses dashes, JS uses camelCase, but we'll default to dashes for CSS variables
  const separator = '-';

  // Generate example
  const example = `${prefix}color-primary-500`;

  return { prefix, separator, example };
}

/**
 * Extract collection names from baseline
 */
function extractCollections(baseline: BaselineData): string[] {
  const collections = new Set<string>();
  for (const entry of Object.values(baseline.baseline)) {
    if (entry.collection) {
      collections.add(entry.collection);
    }
  }
  return Array.from(collections).sort();
}

/**
 * Extract mode names from baseline
 */
function extractModes(baseline: BaselineData): string[] {
  const modes = new Set<string>();
  for (const entry of Object.values(baseline.baseline)) {
    if (entry.mode) {
      modes.add(entry.mode);
    }
  }
  return Array.from(modes).sort();
}

/**
 * Generate the complete intermediate token format with metadata
 */
export async function generateIntermediateFormat(
  baseline: BaselineData,
  config: Config
): Promise<IntermediateTokenFormat> {
  const tokens = convertToIntermediateFormat(baseline, config);
  const variableNaming = generateVariableNaming(config);
  const collections = extractCollections(baseline);
  const modes = extractModes(baseline);

  // Build Style Dictionary platform info if in SD mode
  let sdPlatformsInfo: IntermediateTokenFormat['$metadata']['output']['styleDictionary'] | undefined;

  if (config.output.mode === 'style-dictionary' && config.output.styleDictionary?.platforms) {
    const configPlatforms = config.output.styleDictionary.platforms;

    // Try to get naming conventions from Style Dictionary hooks
    const sdHooksInfo = await getSDPlatformsInfo(configPlatforms);

    // Build enriched platform info
    const platforms: NonNullable<typeof sdPlatformsInfo>['platforms'] = {};

    for (const [platformName, platformConfig] of Object.entries(configPlatforms)) {
      const transformGroup = platformConfig.transformGroup || platformName;
      const sdInfo = sdHooksInfo[platformName];

      platforms[platformName] = {
        transformGroup,
        nameTransform: sdInfo?.nameTransform,
        buildPath: platformConfig.buildPath,
        files: platformConfig.files?.map(f => ({
          destination: f.destination,
          format: f.format,
        })),
      };
    }

    sdPlatformsInfo = {
      buildPath: config.output.styleDictionary.buildPath,
      platforms,
      outputReferences: config.output.styleDictionary.outputReferences,
    };
  }

  return {
    tokens,
    $metadata: {
      syncedAt: baseline.metadata.syncedAt,
      source: {
        figmaFileId: config.figma.fileId,
        figmaNodeId: config.figma.nodeId,
      },
      output: {
        mode: config.output.mode || 'json',
        dtcg: config.output.dtcg !== false,
        dir: config.output.dir,
        ...(config.css?.enabled && {
          css: {
            enabled: true,
            file: config.css.file,
            transforms: config.css.transforms,
          },
        }),
        ...(sdPlatformsInfo && {
          styleDictionary: sdPlatformsInfo,
        }),
      },
      variableNaming,
      collections,
      modes,
    },
  };
}

/**
 * Write the intermediate token format to disk
 * This file is used by both Style Dictionary and the docs generator
 */
export async function writeIntermediateFormat(
  baseline: BaselineData,
  config: Config,
  outputDir: string
): Promise<string> {
  await mkdir(outputDir, { recursive: true });

  const intermediate = await generateIntermediateFormat(baseline, config);
  const tokensPath = join(outputDir, '.tokens-source.json');

  await writeFile(tokensPath, JSON.stringify(intermediate, null, 2), 'utf-8');

  return tokensPath;
}
