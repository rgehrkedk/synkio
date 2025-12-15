/**
 * Transforms module
 * 
 * Re-exports all transform functions and utilities.
 * Platform-specific transforms are in separate files.
 */

// Shared utilities
export * from './utils.js';

// Type inference
export * from './infer.js';

// Platform-specific transforms
export { 
  transformForCSS,
  CSSTransformOptions,
  TokenValue,
  transformColor,
  transformDimension,
  transformFontSize,
  transformFontFamily,
  transformFontWeight,
  transformLineHeight,
  transformLetterSpacing,
  transformDuration,
  transformShadow,
  transformBorder,
  transformOpacity,
  transformNumber,
} from './css.js';

export { 
  transformForReactNative,
  RNTransformOptions,
} from './react-native.js';

// Legacy alias for backwards compatibility
export { CSSTransformOptions as TransformOptions } from './css.js';

// Transform groups for different platforms
export const transformGroups = {
  css: {
    name: 'css',
    description: 'CSS with px units',
    options: { useRem: false, basePxFontSize: 16 },
  },
  cssRem: {
    name: 'css/rem',
    description: 'CSS with rem units',
    options: { useRem: true, basePxFontSize: 16 },
  },
  scss: {
    name: 'scss',
    description: 'SCSS with $variables',
    options: { useRem: false, basePxFontSize: 16 },
  },
  scssRem: {
    name: 'scss/rem',
    description: 'SCSS with rem units',
    options: { useRem: true, basePxFontSize: 16 },
  },
  js: {
    name: 'js',
    description: 'JavaScript object export',
    options: {},
  },
  reactNative: {
    name: 'react-native',
    description: 'React Native StyleSheet (unitless)',
    options: {},
  },
  tailwind: {
    name: 'tailwind',
    description: 'Tailwind CSS config',
    options: { useRem: true, basePxFontSize: 16 },
  },
} as const;

export type TransformGroupName = keyof typeof transformGroups;
