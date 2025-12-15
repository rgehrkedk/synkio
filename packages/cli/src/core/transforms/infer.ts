/**
 * Type inference from token paths
 * 
 * Figma returns generic types (number, float) for many tokens.
 * This module infers the semantic type based on the token path.
 */

// Path patterns for each type
const dimensionPatterns = [
  'spacing',
  'space',
  'gap',
  'padding',
  'margin',
  'width',
  'height',
  'min',
  'max',
  'inset',
  'offset',
  'blur',
];

const radiusPatterns = [
  'radius',
  'rounded',
  'corner',
  'borderradius',
];

const fontSizePatterns = [
  'fontsize',
  'font-size',
  'text-size',
  'size', // when under typography/font parent
];

const fontWeightPatterns = [
  'fontweight',
  'font-weight',
  'weight',
];

const lineHeightPatterns = [
  'lineheight',
  'line-height',
  'leading',
];

const letterSpacingPatterns = [
  'letterspacing',
  'letter-spacing',
  'tracking',
];

const durationPatterns = [
  'duration',
  'delay',
  'timing',
  'animation',
  'transition',
];

const opacityPatterns = [
  'opacity',
  'alpha',
];

/**
 * Infer the semantic type from a token path when the raw type is generic
 */
export function inferTypeFromPath(rawType: string, path?: string): string {
  const lowerType = rawType.toLowerCase();
  
  // If it's already a specific type, use it
  if (lowerType !== 'number' && lowerType !== 'float') {
    return rawType;
  }
  
  // No path to infer from
  if (!path) {
    return rawType;
  }
  
  const lowerPath = path.toLowerCase();
  const parts = lowerPath.split(/[./]/);
  
  // Check if any part matches known patterns
  for (const part of parts) {
    // Check radius first (more specific)
    if (radiusPatterns.some(p => part.includes(p))) {
      return 'borderRadius';
    }
    
    // Check font-related patterns
    if (fontSizePatterns.some(p => part.includes(p))) {
      return 'fontSize';
    }
    
    if (fontWeightPatterns.some(p => part.includes(p))) {
      return 'fontWeight';
    }
    
    if (lineHeightPatterns.some(p => part.includes(p))) {
      return 'lineHeight';
    }
    
    if (letterSpacingPatterns.some(p => part.includes(p))) {
      return 'letterSpacing';
    }
    
    // Check duration patterns
    if (durationPatterns.some(p => part.includes(p))) {
      return 'duration';
    }
    
    // Check opacity patterns
    if (opacityPatterns.some(p => part.includes(p))) {
      return 'opacity';
    }
    
    // Check dimension patterns last (less specific)
    if (dimensionPatterns.some(p => part.includes(p))) {
      return 'dimension';
    }
  }
  
  // Fallback to original type
  return rawType;
}

/**
 * Check if a type represents a dimension (needs px/rem units)
 */
export function isDimensionType(type: string): boolean {
  const dimensionTypes = [
    'dimension',
    'spacing',
    'size',
    'borderradius',
    'radius',
    'fontsize',
  ];
  return dimensionTypes.includes(type.toLowerCase());
}

/**
 * Check if a type represents a color
 */
export function isColorType(type: string): boolean {
  return type.toLowerCase() === 'color';
}
