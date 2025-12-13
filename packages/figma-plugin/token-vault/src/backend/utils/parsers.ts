/**
 * Value parsing utilities for different token types
 */

/**
 * Parse hex color string to RGB object
 * Supports #RRGGBB format
 */
export function parseColor(value: string): RGB | null {
  if (!value || typeof value !== 'string') return null;

  // Handle hex colors
  if (value.startsWith('#')) {
    const hex = value.replace('#', '');

    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      return { r, g, b };
    }
  }

  // Handle rgba
  if (value.startsWith('rgba')) {
    const match = value.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]) / 255,
        g: parseInt(match[2]) / 255,
        b: parseInt(match[3]) / 255
      };
    }
  }

  return null;
}

/**
 * Parse number value, stripping units
 * Supports numeric values and strings with units (px, rem, em, etc.)
 */
export function parseNumber(value: any): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove units (px, rem, em, etc.)
    const num = parseFloat(value.replace(/[a-z%]+$/i, ''));
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Parse font weight value
 * Maps numeric weights to names
 */
export function parseFontWeight(value: any): string {
  const weightMap: Record<number, string> = {
    100: 'Thin',
    200: 'Extra Light',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'Semi Bold',
    700: 'Bold',
    800: 'Extra Bold',
    900: 'Black'
  };

  if (typeof value === 'number') {
    return weightMap[value] || value.toString();
  }

  return value.toString();
}

/**
 * Convert RGB to hex color string
 */
export function rgbToHex(color: RGB | RGBA): string {
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}
