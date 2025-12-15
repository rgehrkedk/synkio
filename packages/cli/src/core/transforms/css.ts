/**
 * CSS-specific transforms
 * 
 * Converts token values to CSS-ready format with proper units.
 */

import { hasUnit, quoteWrapWhitespacedFont, rgbToHex, roundNumber } from './utils.js';
import { inferTypeFromPath } from './infer.js';

export interface CSSTransformOptions {
  basePxFontSize?: number;  // Base font size for rem calculations (default: 16)
  useRem?: boolean;         // Use rem instead of px for dimensions (default: false)
}

export interface TokenValue {
  value: any;
  type: string;
  path?: string;
}

/**
 * Transform a token value to CSS-ready format
 */
export function transformForCSS(token: TokenValue, options: CSSTransformOptions = {}): string {
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
      return transformDimension(value, options);
    case 'fontsize':
      return transformFontSize(value, options);
    case 'fontfamily':
      return transformFontFamily(value);
    case 'fontweight':
      return transformFontWeight(value);
    case 'lineheight':
      return transformLineHeight(value);
    case 'letterspacing':
      return transformLetterSpacing(value, options);
    case 'duration':
    case 'time':
      return transformDuration(value);
    case 'shadow':
      return transformShadow(value, options);
    case 'border':
      return transformBorder(value, options);
    case 'opacity':
      return transformOpacity(value);
    case 'number':
    case 'float':
      return transformNumber(value);
    default:
      // Return as-is for unknown types
      return String(value);
  }
}

/**
 * Transform color values
 * Handles hex, rgb, rgba, hsl, and Figma color objects
 */
export function transformColor(value: any): string {
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'object' && value !== null) {
    // Figma color object: { r, g, b, a }
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
 * Transform dimension values (spacing, sizing)
 * Adds 'px' unit if value is a unitless number
 */
export function transformDimension(value: any, options: CSSTransformOptions = {}): string {
  const { basePxFontSize = 16, useRem = false } = options;
  
  if (typeof value === 'number') {
    if (value === 0) return '0';
    
    if (useRem) {
      return `${roundNumber(value / basePxFontSize)}rem`;
    }
    return `${value}px`;
  }
  
  if (typeof value === 'string') {
    if (hasUnit(value)) {
      return value;
    }
    
    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (num === 0) return '0';
      if (useRem) {
        return `${roundNumber(num / basePxFontSize)}rem`;
      }
      return `${num}px`;
    }
  }
  
  return String(value);
}

/**
 * Transform font size values
 */
export function transformFontSize(value: any, options: CSSTransformOptions = {}): string {
  return transformDimension(value, options);
}

/**
 * Transform font family values
 * Wraps font names with spaces in quotes
 */
export function transformFontFamily(value: any): string {
  if (Array.isArray(value)) {
    return value.map(quoteWrapWhitespacedFont).join(', ');
  }
  
  if (typeof value === 'string') {
    const fonts = value.split(',').map(f => f.trim());
    return fonts.map(quoteWrapWhitespacedFont).join(', ');
  }
  
  return String(value);
}

/**
 * Transform font weight values
 * Handles both numeric and string weights
 */
export function transformFontWeight(value: any): string {
  const weightMap: Record<string, number> = {
    thin: 100,
    hairline: 100,
    extralight: 200,
    ultralight: 200,
    light: 300,
    regular: 400,
    normal: 400,
    medium: 500,
    semibold: 600,
    demibold: 600,
    bold: 700,
    extrabold: 800,
    ultrabold: 800,
    black: 900,
    heavy: 900,
  };
  
  if (typeof value === 'number') {
    return String(value);
  }
  
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().replace(/[\s-_]/g, '');
    if (weightMap[normalized]) {
      return String(weightMap[normalized]);
    }
  }
  
  return String(value);
}

/**
 * Transform line height values
 * Handles numeric (unitless) and string values
 */
export function transformLineHeight(value: any): string {
  if (typeof value === 'number') {
    return String(roundNumber(value));
  }
  
  if (typeof value === 'string') {
    if (value.endsWith('%')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return String(roundNumber(num / 100));
      }
    }
    return value;
  }
  
  return String(value);
}

/**
 * Transform letter spacing values
 */
export function transformLetterSpacing(value: any, options: CSSTransformOptions = {}): string {
  if (typeof value === 'number') {
    if (value === 0) return '0';
    return `${value}px`;
  }
  
  if (typeof value === 'string') {
    if (value.endsWith('%')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `${roundNumber(num / 100)}em`;
      }
    }
    
    if (hasUnit(value)) {
      return value;
    }
    
    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (num === 0) return '0';
      return `${num}px`;
    }
  }
  
  return String(value);
}

/**
 * Transform duration/time values
 */
export function transformDuration(value: any): string {
  if (typeof value === 'number') {
    if (value >= 1000) {
      return `${roundNumber(value / 1000)}s`;
    }
    return `${value}ms`;
  }
  
  if (typeof value === 'string') {
    if (hasUnit(value)) {
      return value;
    }
    
    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (num >= 1000) {
        return `${roundNumber(num / 1000)}s`;
      }
      return `${num}ms`;
    }
  }
  
  return String(value);
}

/**
 * Transform shadow values
 */
export function transformShadow(value: any, options: CSSTransformOptions = {}): string {
  if (typeof value === 'string') {
    return value;
  }
  
  if (Array.isArray(value)) {
    return value.map(s => transformSingleShadow(s, options)).join(', ');
  }
  
  if (typeof value === 'object' && value !== null) {
    return transformSingleShadow(value, options);
  }
  
  return String(value);
}

function transformSingleShadow(shadow: any, options: CSSTransformOptions = {}): string {
  if (typeof shadow === 'string') return shadow;
  
  const {
    type,
    color,
    offsetX = 0,
    offsetY = 0,
    blur = 0,
    spread = 0,
    x = offsetX,
    y = offsetY,
    radius = blur,
  } = shadow;
  
  const colorValue = color ? transformColor(color) : '#000000';
  const inset = type === 'innerShadow' || type === 'inset' ? 'inset ' : '';
  
  return `${inset}${transformDimension(x, options)} ${transformDimension(y, options)} ${transformDimension(radius, options)} ${spread ? transformDimension(spread, options) + ' ' : ''}${colorValue}`;
}

/**
 * Transform border values
 */
export function transformBorder(value: any, options: CSSTransformOptions = {}): string {
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'object' && value !== null) {
    const { width = 1, style = 'solid', color = '#000000' } = value;
    const widthValue = transformDimension(width, options);
    const colorValue = transformColor(color);
    return `${widthValue} ${style} ${colorValue}`;
  }
  
  return String(value);
}

/**
 * Transform opacity values (0-1 range)
 */
export function transformOpacity(value: any): string {
  if (typeof value === 'number') {
    return String(roundNumber(value));
  }
  return String(value);
}

/**
 * Transform number/float values (unitless)
 */
export function transformNumber(value: any): string {
  if (typeof value === 'number') {
    return String(roundNumber(value));
  }
  return String(value);
}
