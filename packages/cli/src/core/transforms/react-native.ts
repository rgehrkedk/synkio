/**
 * React Native-specific transforms
 * 
 * Converts token values to React Native StyleSheet format.
 * Key difference: dimensions are UNITLESS numbers.
 */

import { quoteWrapWhitespacedFont, rgbToHex, roundNumber } from './utils.js';
import { inferTypeFromPath } from './infer.js';

export interface RNTransformOptions {
  // React Native doesn't need rem/px options since it's always unitless
}

export interface TokenValue {
  value: any;
  type: string;
  path?: string;
}

/**
 * Transform a token value to React Native format
 */
export function transformForReactNative(token: TokenValue, options: RNTransformOptions = {}): string | number {
  const { value, type, path } = token;
  
  // Infer type from path if type is generic (number/float)
  const resolvedType = inferTypeFromPath(type, path);
  const tokenType = resolvedType.toLowerCase();
  
  // Route to appropriate transform based on type
  switch (tokenType) {
    case 'color':
      return transformColor(value);
    case 'dimension':
    case 'spacing':
    case 'size':
    case 'borderradius':
    case 'radius':
    case 'fontsize':
      return transformDimension(value);
    case 'fontfamily':
      return transformFontFamily(value);
    case 'fontweight':
      return transformFontWeight(value);
    case 'lineheight':
      return transformLineHeight(value);
    case 'letterspacing':
      return transformLetterSpacing(value);
    case 'duration':
    case 'time':
      return transformDuration(value);
    case 'opacity':
    case 'number':
    case 'float':
      return transformNumber(value);
    default:
      return typeof value === 'number' ? value : String(value);
  }
}

/**
 * Transform color values
 */
export function transformColor(value: any): string {
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'object' && value !== null) {
    if ('r' in value && 'g' in value && 'b' in value) {
      const r = Math.round(value.r * 255);
      const g = Math.round(value.g * 255);
      const b = Math.round(value.b * 255);
      const a = value.a !== undefined ? value.a : 1;
      
      if (a === 1) {
        return rgbToHex(r, g, b);
      } else {
        return `rgba(${r}, ${g}, ${b}, ${roundNumber(a)})`;
      }
    }
  }
  
  return String(value);
}

/**
 * Transform dimension values - UNITLESS for React Native
 */
export function transformDimension(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Strip units if present
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return num;
    }
  }
  
  return 0;
}

/**
 * Transform font family - no quotes needed in RN
 */
export function transformFontFamily(value: any): string {
  if (Array.isArray(value)) {
    // RN only supports single font family
    return value[0]?.trim() || '';
  }
  
  if (typeof value === 'string') {
    // Take first font if comma-separated
    const first = value.split(',')[0];
    return first?.trim().replace(/['"]/g, '') || '';
  }
  
  return String(value);
}

/**
 * Transform font weight - RN uses string or number
 */
export function transformFontWeight(value: any): string {
  const weightMap: Record<string, string> = {
    thin: '100',
    hairline: '100',
    extralight: '200',
    ultralight: '200',
    light: '300',
    regular: '400',
    normal: '400',
    medium: '500',
    semibold: '600',
    demibold: '600',
    bold: '700',
    extrabold: '800',
    ultrabold: '800',
    black: '900',
    heavy: '900',
  };
  
  if (typeof value === 'number') {
    return String(value);
  }
  
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().replace(/[\s-_]/g, '');
    if (weightMap[normalized]) {
      return weightMap[normalized];
    }
  }
  
  return String(value);
}

/**
 * Transform line height - unitless number in RN
 */
export function transformLineHeight(value: any): number {
  if (typeof value === 'number') {
    return roundNumber(value);
  }
  
  if (typeof value === 'string') {
    if (value.endsWith('%')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return roundNumber(num / 100);
      }
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return roundNumber(num);
    }
  }
  
  return 1;
}

/**
 * Transform letter spacing - unitless in RN
 */
export function transformLetterSpacing(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return num;
    }
  }
  
  return 0;
}

/**
 * Transform duration - milliseconds as number
 */
export function transformDuration(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    if (value.endsWith('s') && !value.endsWith('ms')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return num * 1000;
      }
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return num;
    }
  }
  
  return 0;
}

/**
 * Transform number values
 */
export function transformNumber(value: any): number {
  if (typeof value === 'number') {
    return roundNumber(value);
  }
  const num = parseFloat(value);
  return isNaN(num) ? 0 : roundNumber(num);
}
