/**
 * Shared utility functions for transforms
 */

/**
 * Check if a string value already has a CSS unit
 */
export function hasUnit(value: string): boolean {
  const units = ['px', 'rem', 'em', '%', 'vh', 'vw', 'vmin', 'vmax', 'ch', 'ex', 'pt', 'pc', 'in', 'cm', 'mm', 's', 'ms', 'deg', 'rad', 'turn'];
  const lowerValue = value.toLowerCase().trim();
  return units.some(unit => lowerValue.endsWith(unit));
}

/**
 * Wrap font name in quotes if it contains whitespace
 */
export function quoteWrapWhitespacedFont(fontName: string): string {
  const trimmed = fontName.trim();
  
  // Check if already quoted
  const isQuoted = 
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'));
  
  if (isQuoted) {
    return trimmed;
  }
  
  // Check if it has whitespace
  const hasWhitespace = /\s/.test(trimmed);
  
  if (hasWhitespace) {
    // Escape any existing quotes and wrap
    return `'${trimmed.replace(/'/g, "\\'")}'`;
  }
  
  return trimmed;
}

/**
 * Convert RGB values to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, n)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Round number to avoid floating point precision issues
 */
export function roundNumber(value: number, precision: number = 3): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Convert path to camelCase (for JS output)
 */
export function pathToCamelCase(path: string): string {
  return path
    .split(/[./]/)
    .map((part, index) => {
      if (index === 0) return part.toLowerCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Convert path to kebab-case (for CSS variables)
 */
export function pathToKebabCase(path: string): string {
  return path
    .split(/[./]/)
    .join('-')
    .toLowerCase();
}
