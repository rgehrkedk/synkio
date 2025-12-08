/**
 * Token Map Generation
 *
 * Generates a mapping from Figma Variable ID to platform-specific output names.
 * Used for precise migration when tokens are renamed.
 */

import type {
  BaselineData,
  TokensConfig,
  TokenMap,
  TokenMapEntry,
  TokenOutputs,
  PlatformConfig,
} from '../types/index.js';

// ============================================================================
// Platform Name Transformers
// ============================================================================

/**
 * Transform case of a string segment
 */
function transformSegmentCase(str: string, caseType: 'kebab' | 'camel' | 'snake' | 'pascal'): string {
  // Normalize to lowercase words
  const normalized = str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase();

  const words = normalized.split(/\s+/).filter(Boolean);

  switch (caseType) {
    case 'kebab':
      return words.join('-');
    case 'snake':
      return words.join('_');
    case 'camel':
      return words.map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('');
    case 'pascal':
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    default:
      return words.join('-');
  }
}

/**
 * Build a token name from path parts, applying strip segments and case transformation
 */
function buildTokenName(
  pathParts: string[],
  prefix: string,
  separator: string,
  caseType: 'kebab' | 'camel' | 'snake' | 'pascal',
  stripSegments: string[]
): string {
  // Filter out segments that should be stripped (case-insensitive)
  const stripLower = stripSegments.map(s => s.toLowerCase());
  const filteredParts = pathParts.filter(p => !stripLower.includes(p.toLowerCase()));

  // Transform each part according to case
  const transformedParts = filteredParts.map(p => transformSegmentCase(p, caseType));

  // Join with separator
  const tokenName = transformedParts.join(separator);

  return prefix + tokenName;
}

/**
 * Get CSS variable name from token path
 * @example "color.brand.primary" → "--color-brand-primary"
 */
export function getCssVariableName(path: string, stripSegments: string[] = []): string {
  const parts = path.split('.');
  return buildTokenName(parts, '--', '-', 'kebab', stripSegments);
}

/**
 * Get SCSS variable name from token path
 * @example "color.brand.primary" → "$color-brand-primary"
 */
export function getScssVariableName(path: string, stripSegments: string[] = []): string {
  const parts = path.split('.');
  return buildTokenName(parts, '$', '-', 'kebab', stripSegments);
}

/**
 * Get JavaScript property name from token path
 * @example "color.brand.primary" → "colorBrandPrimary"
 */
export function getJsPropertyName(path: string, stripSegments: string[] = []): string {
  const parts = path.split('.');
  return buildTokenName(parts, '', '', 'camel', stripSegments);
}

/**
 * Get Swift property name from token path
 * @example "color.brand.primary" → "ColorBrandPrimary"
 */
export function getSwiftPropertyName(path: string, stripSegments: string[] = []): string {
  const parts = path.split('.');
  return buildTokenName(parts, '', '', 'pascal', stripSegments);
}

/**
 * Get Kotlin property name from token path
 * @example "color.brand.primary" → "colorBrandPrimary"
 */
export function getKotlinPropertyName(path: string, stripSegments: string[] = []): string {
  const parts = path.split('.');
  return buildTokenName(parts, '', '', 'camel', stripSegments);
}

// ============================================================================
// Token Map Generation
// ============================================================================

/**
 * Generate platform outputs for a single token
 */
function generateTokenOutputs(
  path: string,
  enabledPlatforms: string[],
  stripSegments: string[]
): TokenOutputs {
  const outputs: TokenOutputs = {};

  for (const platform of enabledPlatforms) {
    switch (platform) {
      case 'css':
        outputs.css = getCssVariableName(path, stripSegments);
        break;
      case 'scss':
        outputs.scss = getScssVariableName(path, stripSegments);
        break;
      case 'typescript':
      case 'ts':
      case 'js':
        outputs.js = getJsPropertyName(path, stripSegments);
        break;
      case 'swift':
        outputs.swift = getSwiftPropertyName(path, stripSegments);
        break;
      case 'kotlin':
        outputs.kotlin = getKotlinPropertyName(path, stripSegments);
        break;
    }
  }

  return outputs;
}

/**
 * Extract enabled platform names from config
 */
function getEnabledPlatforms(config: TokensConfig): string[] {
  const platforms = config.migration?.platforms;
  if (!platforms || typeof platforms !== 'object') {
    return ['css']; // Default to CSS if no platforms configured
  }

  return Object.entries(platforms)
    .filter(([_, cfg]) => (cfg as PlatformConfig).enabled)
    .map(([name]) => name);
}

/**
 * Generate token map from baseline data
 *
 * @param baseline - The baseline data containing all tokens
 * @param config - The tokens configuration
 * @returns TokenMap with all tokens mapped to their platform outputs
 */
export function generateTokenMap(
  baseline: BaselineData,
  config: TokensConfig
): TokenMap {
  const enabledPlatforms = getEnabledPlatforms(config);
  const stripSegments = config.migration?.stripSegments || [];

  const tokens: Record<string, TokenMapEntry> = {};

  // Iterate over baseline entries
  const baselineEntries = baseline.baseline || {};

  for (const [variableId, entry] of Object.entries(baselineEntries)) {
    // Generate outputs for each enabled platform
    const outputs = generateTokenOutputs(entry.path, enabledPlatforms, stripSegments);

    tokens[variableId] = {
      path: entry.path,
      outputs,
    };
  }

  return {
    $metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      fileName: baseline.$metadata?.fileName,
    },
    tokens,
  };
}

/**
 * Get the default token map path from config
 */
export function getTokenMapPath(config: TokensConfig): string {
  if (config.paths.tokenMap) {
    return config.paths.tokenMap;
  }
  // Default: same directory as baseline, named token-map.json
  const dataDir = config.paths.data;
  return `${dataDir}/token-map.json`;
}
