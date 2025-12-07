/**
 * Default Platform Adapters
 *
 * Pre-configured adapters for common platforms.
 * Used during setup when Style Dictionary is not available or user wants manual config.
 */

import type { PlatformConfig } from '../types/index.js';

export type PlatformType = 'css' | 'scss' | 'typescript' | 'swift' | 'kotlin';

export interface PlatformChoice {
  value: PlatformType;
  label: string;
  description: string;
}

/**
 * Available platform choices for the setup wizard
 */
export const PLATFORM_CHOICES: PlatformChoice[] = [
  {
    value: 'css',
    label: 'CSS',
    description: 'CSS custom properties (--token-name)',
  },
  {
    value: 'scss',
    label: 'SCSS',
    description: 'SCSS variables ($token-name)',
  },
  {
    value: 'typescript',
    label: 'TypeScript',
    description: 'TypeScript imports (tokens.tokenName)',
  },
  {
    value: 'swift',
    label: 'Swift',
    description: 'Swift tokens (DesignTokens.tokenName)',
  },
  {
    value: 'kotlin',
    label: 'Kotlin',
    description: 'Kotlin resources (AppTheme.tokenName)',
  },
];

/**
 * Default adapter configurations for each platform
 */
export const DEFAULT_ADAPTERS: Record<PlatformType, PlatformConfig> = {
  css: {
    enabled: true,
    include: ['**/*.css', '**/*.module.css'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/styles/tokens/**'],
    transform: {
      prefix: '--',
      separator: '-',
      case: 'kebab',
    },
    patterns: [
      'var\\(--{token}\\)',
      'var\\(--{token},',
      '--{token}\\s*:',
    ],
  },
  scss: {
    enabled: false,
    include: ['**/*.scss', '**/*.sass'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    transform: {
      prefix: '$',
      separator: '-',
      case: 'kebab',
    },
    patterns: [
      '\\${token}',
      '#{\\$}{token}',
    ],
  },
  typescript: {
    enabled: false,
    include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts'],
    transform: {
      prefix: 'tokens.',
      separator: '.',
      case: 'camel',
    },
    patterns: [
      'tokens\\.{token}',
      "tokens\\['{token}'\\]",
      'tokens\\["{token}"\\]',
    ],
  },
  swift: {
    enabled: false,
    include: ['**/*.swift'],
    exclude: ['**/Pods/**', '**/build/**'],
    transform: {
      prefix: 'DesignTokens.',
      separator: '.',
      case: 'camel',
    },
    patterns: [
      'DesignTokens\\.{token}',
      'Color\\.{token}',
      'Spacing\\.{token}',
    ],
  },
  kotlin: {
    enabled: false,
    include: ['**/*.kt', '**/*.kts'],
    exclude: ['**/build/**', '**/.gradle/**'],
    transform: {
      prefix: 'AppTheme.',
      separator: '.',
      case: 'camel',
    },
    patterns: [
      'AppTheme\\.{token}',
      'R\\.color\\.{token}',
      'R\\.dimen\\.{token}',
    ],
  },
};

/**
 * Get enabled adapter for a platform
 */
export function getEnabledAdapter(platform: PlatformType): PlatformConfig {
  return {
    ...DEFAULT_ADAPTERS[platform],
    enabled: true,
  };
}

/**
 * Create platforms config from selected platform types
 */
export function createPlatformsConfig(selectedPlatforms: PlatformType[]): Record<string, PlatformConfig> {
  const config: Record<string, PlatformConfig> = {};

  for (const platform of selectedPlatforms) {
    config[platform] = getEnabledAdapter(platform);
  }

  return config;
}
