/**
 * Shared utility functions for docs components
 */

/**
 * Escape HTML entities
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Capitalize first letter of a string
 */
export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get page title from page ID
 */
export function getPageTitle(page: string): string {
  switch (page) {
    case 'index': return 'Overview';
    case 'colors': return 'Colors';
    case 'typography': return 'Typography';
    case 'spacing': return 'Spacing';
    case 'all': return 'All Tokens';
    default: return 'Design Tokens';
  }
}

/**
 * Determine the smart default platform to display based on output configuration
 */
export function getDefaultPlatform(platforms: string[], outputMode: string): string {
  if (!platforms || platforms.length === 0) return 'css';

  // CSS-in-JS mode - prefer OBJECT (nested) notation as most common for theme providers
  if (platforms.includes('json')) return 'json';

  // Mobile platforms - prefer iOS first (most common)
  if (platforms.includes('ios-swift') || platforms.includes('ios') || platforms.includes('swift')) {
    return platforms.find(p => ['ios-swift', 'ios', 'swift'].includes(p.toLowerCase())) || platforms[0];
  }
  if (platforms.includes('android')) return 'android';
  if (platforms.includes('compose')) return 'compose';
  if (platforms.includes('flutter')) return 'flutter';

  // Web platforms - prefer CSS
  if (platforms.includes('css')) return 'css';
  if (platforms.includes('scss')) return 'scss';
  if (platforms.includes('js') || platforms.includes('javascript')) return 'js';
  if (platforms.includes('ts') || platforms.includes('typescript')) return 'ts';

  // Default to first platform
  return platforms[0];
}

/**
 * Get platform label for display
 */
export function getPlatformLabel(platform: string): string {
  const label = platform.toUpperCase();
  if (platform.toLowerCase() === 'json') {
    return 'OBJECT'; // More accurate for nested object access in JS/TS
  }
  return label;
}

/**
 * Format display value - for resolved values (colors, numbers, etc.)
 */
export function formatDisplayValue(value: any, type: string): string {
  if (value === null || value === undefined) return '–';

  if (typeof value === 'object') {
    if ('r' in value && 'g' in value && 'b' in value) {
      const r = Math.round(value.r * 255);
      const g = Math.round(value.g * 255);
      const b = Math.round(value.b * 255);
      const a = value.a ?? 1;
      if (a === 1) {
        // Convert to hex
        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        return hex.toUpperCase();
      }
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    }
    // Skip $ref objects - these should be handled by referencePath
    if ('$ref' in value) {
      return '→ reference';
    }
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    switch (type.toLowerCase()) {
      case 'fontsize':
      case 'dimension':
      case 'spacing':
      case 'size':
        return `${value}px`;
      default:
        return String(value);
    }
  }

  return String(value);
}

/**
 * Format reference path for display - wrap in curly braces like DTCG format
 */
export function formatReferencePath(path: string): string {
  return `{${path}}`;
}

/**
 * Get CSS background value for color preview
 */
export function getColorBackground(value: any): string {
  if (typeof value === 'object' && 'r' in value) {
    const r = Math.round(value.r * 255);
    const g = Math.round(value.g * 255);
    const b = Math.round(value.b * 255);
    const a = value.a ?? 1;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  if (typeof value === 'string') {
    return value;
  }
  return '#888888';
}

/**
 * Format typography type name
 */
export function formatTypeName(type: string): string {
  const names: Record<string, string> = {
    'fontsize': 'Font Sizes',
    'fontfamily': 'Font Families',
    'fontweight': 'Font Weights',
    'lineheight': 'Line Heights',
    'letterspacing': 'Letter Spacing',
    'typography': 'Typography',
  };
  return names[type.toLowerCase()] || capitalizeFirst(type);
}
