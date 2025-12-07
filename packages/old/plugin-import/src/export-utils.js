// Export utility functions extracted for testing
// These are pure functions that don't depend on the Figma API

/**
 * Parse collection name to determine type
 * Note: Brands are represented as MODES in the "brand" collection, not separate collections
 * @param {string} name - Collection name
 * @returns {'brand' | 'theme' | 'globals' | 'unknown'}
 */
function parseCollectionType(name) {
  if (name === 'brand') return 'brand';
  if (name === 'theme') return 'theme';
  if (name === 'globals') return 'globals';

  // Check slash-based naming (legacy/alternative format)
  const parts = name.split('/');
  if (parts[0] === 'brand') return 'brand';
  if (parts[0] === 'theme') return 'theme';

  return 'unknown';
}

/**
 * Convert RGB color object to hex string
 * @param {{ r: number, g: number, b: number, a?: number }} color - RGB(A) color object with values 0-1
 * @returns {string} Hex color string (e.g., "#ff0000" or "#ff0000cc" with alpha)
 */
function rgbToHex(color) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');

  if ('a' in color && color.a < 1) {
    const a = Math.round(color.a * 255);
    return '#' + hex + a.toString(16).padStart(2, '0');
  }

  return '#' + hex;
}

/**
 * Convert Figma variable type to Design Token type
 * @param {string} resolvedType - Figma variable resolved type
 * @returns {string}
 */
function getTokenType(resolvedType) {
  switch (resolvedType) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      return 'number';
    case 'STRING':
      return 'string';
    case 'BOOLEAN':
      return 'boolean';
    default:
      return 'unknown';
  }
}

/**
 * Format value based on type
 * @param {any} value - The value to format
 * @param {string} type - Figma variable resolved type
 * @returns {any}
 */
function formatValue(value, type) {
  // If it's a reference string, return as-is
  if (typeof value === 'string' && value.startsWith('{')) {
    return value;
  }

  if (type === 'COLOR' && typeof value === 'object' && 'r' in value) {
    return rgbToHex(value);
  }

  return value;
}

/**
 * Build nested token structure from path
 * @param {object} obj - Target object to set value in
 * @param {string[]} path - Path segments
 * @param {object} value - Token value object
 */
function setNestedToken(obj, path, value) {
  let current = obj;

  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) {
      current[path[i]] = {};
    }
    current = current[path[i]];
  }

  current[path[path.length - 1]] = value;
}

/**
 * Create a valid export output structure
 * @param {object} options - Options for creating the output
 * @returns {object} Valid ExportOutput structure
 */
function createExportOutput(options = {}) {
  return {
    $metadata: {
      version: options.version || '2.0.0',
      exportedAt: options.exportedAt || new Date().toISOString(),
      pluginVersion: options.pluginVersion || '1.0.0',
      fileKey: options.fileKey || '',
      fileName: options.fileName || ''
    },
    brand: options.brand || {},
    theme: options.theme || {},
    globals: options.globals || {},
    baseline: options.baseline || {},
    migrations: options.migrations || []
  };
}

/**
 * Validate export output structure
 * @param {object} output - Output to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateExportOutput(output) {
  const errors = [];

  if (!output.$metadata) {
    errors.push('Missing $metadata section');
  } else {
    if (!output.$metadata.version) errors.push('Missing $metadata.version');
    if (!output.$metadata.exportedAt) errors.push('Missing $metadata.exportedAt');
  }

  if (!('brand' in output)) errors.push('Missing brand section');
  if (!('theme' in output)) errors.push('Missing theme section');
  if (!('globals' in output)) errors.push('Missing globals section');
  if (!('baseline' in output)) errors.push('Missing baseline section');
  if (!Array.isArray(output.migrations)) errors.push('migrations must be an array');

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  parseCollectionType,
  rgbToHex,
  getTokenType,
  formatValue,
  setNestedToken,
  createExportOutput,
  validateExportOutput
};
