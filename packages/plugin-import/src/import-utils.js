// Import utility functions extracted for testing
// These are pure functions that don't depend on the Figma API

/**
 * @typedef {Object} ParsedVariableId
 * @property {string} collection - Collection name (brand, theme, globals)
 * @property {string} mode - Mode name (eboks, nykredit, light, dark, value, etc.)
 * @property {string} figmaId - Figma variable ID portion (e.g., "VariableID:8407:177359")
 * @property {boolean} valid - Whether the parsing was successful
 */

/**
 * @typedef {Object} RGB
 * @property {number} r - Red component (0-1)
 * @property {number} g - Green component (0-1)
 * @property {number} b - Blue component (0-1)
 */

/**
 * @typedef {Object} RGBA
 * @property {number} r - Red component (0-1)
 * @property {number} g - Green component (0-1)
 * @property {number} b - Blue component (0-1)
 * @property {number} a - Alpha component (0-1)
 */

/**
 * @typedef {Object} TokenToImport
 * @property {string} path - Token path (e.g., "colors.neutral.50")
 * @property {string|number} value - Token value
 * @property {string} type - Token type (color, number, string, boolean)
 * @property {string} collection - Collection name
 * @property {string} mode - Mode name
 * @property {string} variableId - Full variable ID string
 */

/**
 * @typedef {Object} ImportAnalysis
 * @property {TokenToImport[]} toUpdate - Tokens that match existing Figma variables
 * @property {TokenToImport[]} toCreate - Tokens that need new Figma variables
 * @property {string[]} unmatched - Figma variable IDs not in baseline
 * @property {string[]} missingCollections - Collections that don't exist in Figma
 * @property {Array<{collection: string, mode: string}>} missingModes - Modes that don't exist in Figma
 */

/**
 * @typedef {Object} ImportResult
 * @property {number} successes - Count of successfully imported tokens
 * @property {Array<{variableId: string, error: string}>} failures - Failed imports with reasons
 * @property {number} newVariablesCreated - Count of new variables created
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the file is valid
 * @property {string[]} errors - List of validation errors
 */

/**
 * Parse a variable ID string to extract collection, mode, and Figma ID
 * Format: "{collection}:{mode}:VariableID:xxx:xxx"
 * Examples:
 *   - "brand:eboks:VariableID:8407:177359"
 *   - "theme:light:VariableID:9932:33"
 *   - "globals:value:VariableID:13607:16081"
 *
 * @param {string} variableIdString - The full variable ID string
 * @returns {ParsedVariableId} Parsed components
 */
function parseVariableId(variableIdString) {
  // Default invalid result
  const invalidResult = {
    collection: '',
    mode: '',
    figmaId: '',
    valid: false
  };

  if (!variableIdString || typeof variableIdString !== 'string') {
    return invalidResult;
  }

  // Expected format: {collection}:{mode}:VariableID:xxx:xxx
  // Split by colon, expecting at least 5 parts
  const parts = variableIdString.split(':');

  if (parts.length < 5) {
    return invalidResult;
  }

  const collection = parts[0];
  const mode = parts[1];

  // Validate collection is one of expected values
  const validCollections = ['brand', 'theme', 'globals'];
  if (!validCollections.includes(collection)) {
    return invalidResult;
  }

  // The Figma ID is everything from "VariableID" onwards
  // Format: VariableID:xxx:xxx
  const figmaIdParts = parts.slice(2);
  if (figmaIdParts[0] !== 'VariableID') {
    return invalidResult;
  }

  const figmaId = figmaIdParts.join(':');

  return {
    collection,
    mode,
    figmaId,
    valid: true
  };
}

/**
 * Convert a hex color string to RGB/RGBA object
 * Inverse of rgbToHex in export-utils.js
 *
 * @param {string} hex - Hex color string (#RRGGBB or #RRGGBBAA)
 * @returns {RGB|RGBA|null} RGB(A) object with values normalized to 0-1, or null if invalid
 */
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') {
    return null;
  }

  // Remove # if present
  let cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;

  // Handle lowercase
  cleanHex = cleanHex.toLowerCase();

  // Validate hex characters
  if (!/^[0-9a-f]+$/.test(cleanHex)) {
    return null;
  }

  // Handle 6-digit hex (RGB)
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

    return { r, g, b };
  }

  // Handle 8-digit hex (RGBA)
  if (cleanHex.length === 8) {
    const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
    const a = parseInt(cleanHex.slice(6, 8), 16) / 255;

    return { r, g, b, a };
  }

  return null;
}

/**
 * Parse an alias reference string to extract the variable path
 * Format: "{path.to.variable}"
 *
 * @param {string} aliasString - The alias reference string
 * @returns {{ path: string, valid: boolean }} Parsed path or invalid result
 */
function parseAliasReference(aliasString) {
  if (!aliasString || typeof aliasString !== 'string') {
    return { path: '', valid: false };
  }

  // Check for curly brace format
  if (!aliasString.startsWith('{') || !aliasString.endsWith('}')) {
    return { path: '', valid: false };
  }

  // Extract path between braces
  const path = aliasString.slice(1, -1).trim();

  if (!path) {
    return { path: '', valid: false };
  }

  return { path, valid: true };
}

/**
 * Check if a value is an alias reference
 *
 * @param {any} value - The value to check
 * @returns {boolean} True if the value is an alias reference
 */
function isAliasReference(value) {
  return typeof value === 'string' &&
         value.startsWith('{') &&
         value.endsWith('}');
}

/**
 * Validate a baseline snapshot file structure
 *
 * @param {object} data - The parsed JSON data
 * @returns {ValidationResult} Validation result with errors
 */
function validateBaselineFile(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['File is not a valid JSON object'] };
  }

  // Check for required sections
  if (!data.$metadata) {
    errors.push('Missing required section: $metadata');
  } else {
    // Validate $metadata fields
    if (!data.$metadata.version) {
      errors.push('Missing $metadata.version');
    }
    if (!data.$metadata.exportedAt) {
      errors.push('Missing $metadata.exportedAt');
    }
  }

  if (!('brand' in data)) {
    errors.push('Missing required section: brand');
  }

  if (!('theme' in data)) {
    errors.push('Missing required section: theme');
  }

  if (!('globals' in data)) {
    errors.push('Missing required section: globals');
  }

  if (!('baseline' in data)) {
    errors.push('Missing required section: baseline');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Categorize tokens from baseline into to-update, to-create, and unmatched
 * This is a pure function for testing - actual Figma variable lookup is done separately
 *
 * @param {Object<string, object>} baselineTokens - Baseline tokens keyed by variableId
 * @param {Set<string>} existingFigmaIds - Set of Figma variable IDs that exist
 * @param {Set<string>} allFigmaVariableIds - Set of all Figma variable IDs for unmatched detection
 * @returns {ImportAnalysis} Categorized tokens
 */
function categorizeTokens(baselineTokens, existingFigmaIds, allFigmaVariableIds) {
  /** @type {TokenToImport[]} */
  const toUpdate = [];
  /** @type {TokenToImport[]} */
  const toCreate = [];
  /** @type {string[]} */
  const unmatched = [];
  /** @type {Set<string>} */
  const missingCollectionsSet = new Set();
  /** @type {Map<string, Set<string>>} */
  const collectionModes = new Map();

  // Process each baseline token
  for (const [variableId, entry] of Object.entries(baselineTokens)) {
    const parsed = parseVariableId(variableId);

    if (!parsed.valid) {
      // Skip invalid variable IDs
      continue;
    }

    // Track collection/mode combinations
    if (!collectionModes.has(parsed.collection)) {
      collectionModes.set(parsed.collection, new Set());
    }
    collectionModes.get(parsed.collection).add(parsed.mode);

    const tokenToImport = {
      path: entry.path,
      value: entry.value,
      type: entry.type,
      collection: parsed.collection,
      mode: parsed.mode,
      variableId: variableId
    };

    // Check if the Figma ID exists
    if (existingFigmaIds.has(parsed.figmaId)) {
      toUpdate.push(tokenToImport);
    } else {
      toCreate.push(tokenToImport);
    }
  }

  // Find unmatched Figma variables (exist in Figma but not in baseline)
  const baselineVariableIds = new Set(Object.keys(baselineTokens));
  for (const figmaVarId of allFigmaVariableIds) {
    // Check if this Figma variable ID appears in any baseline entry
    let found = false;
    for (const baselineId of baselineVariableIds) {
      const parsed = parseVariableId(baselineId);
      if (parsed.valid && parsed.figmaId === figmaVarId) {
        found = true;
        break;
      }
    }
    if (!found) {
      unmatched.push(figmaVarId);
    }
  }

  // For now, we don't detect missing collections/modes here
  // That would require knowledge of what exists in Figma which is done in the async function

  return {
    toUpdate,
    toCreate,
    unmatched,
    missingCollections: [],
    missingModes: []
  };
}

/**
 * Convert token type to Figma variable type
 *
 * @param {string} tokenType - Token type (color, number, string, boolean)
 * @returns {string} Figma variable type
 */
function tokenTypeToFigmaType(tokenType) {
  switch (tokenType) {
    case 'color':
      return 'COLOR';
    case 'number':
      return 'FLOAT';
    case 'string':
      return 'STRING';
    case 'boolean':
      return 'BOOLEAN';
    default:
      return 'STRING';
  }
}

/**
 * Convert a token value to the appropriate Figma value format
 *
 * @param {any} value - The token value
 * @param {string} type - The token type
 * @returns {any} Value formatted for Figma
 */
function convertValueForFigma(value, type) {
  // Handle alias references - these need special handling by caller
  if (isAliasReference(value)) {
    return { isAlias: true, path: parseAliasReference(value).path };
  }

  // Handle colors
  if (type === 'color' && typeof value === 'string') {
    // Check if it's a hex color
    if (value.startsWith('#')) {
      return hexToRgb(value);
    }
    // Handle rgba() format (seen in some baseline entries)
    if (value.startsWith('rgba(')) {
      const match = value.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
      if (match) {
        return {
          r: parseInt(match[1]) / 255,
          g: parseInt(match[2]) / 255,
          b: parseInt(match[3]) / 255,
          a: parseFloat(match[4])
        };
      }
    }
  }

  // Return other types as-is
  return value;
}

module.exports = {
  parseVariableId,
  hexToRgb,
  parseAliasReference,
  isAliasReference,
  validateBaselineFile,
  categorizeTokens,
  tokenTypeToFigmaType,
  convertValueForFigma
};
