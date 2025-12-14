/**
 * Baseline importer module
 *
 * Imports validated baseline files back into Figma. The baseline format contains
 * all collection/mode/token data and must be recreated exactly in Figma.
 * 
 * Supports "handshake" mode where existing variables are matched by their
 * original IDs and updated rather than recreated.
 */

import type { BaselineDetectionResult } from '../utils/baseline-detector.js';

export interface ImportResult {
  success: boolean;
  collectionsCreated: number;
  collectionsUpdated: number;
  modesCreated: number;
  variablesCreated: number;
  variablesUpdated: number;
  errors: string[];
  warnings: string[];
  /** Version from the imported baseline */
  importedVersion?: string;
  /** Current version before import (from stored baseline) */
  previousVersion?: string;
}

export interface CollectionData {
  name: string;
  originalId?: string; // Original Figma collection ID for matching
  modes: Map<string, ModeData>;
}

export interface ModeData {
  name: string;
  originalId?: string; // Original Figma mode ID for matching
  variables: Map<string, Variable>;
}

export interface Variable {
  name: string;
  value: any;
  type: string;
  resolvedType: string;
  description?: string;
  originalVariableId?: string; // Original Figma variable ID for matching
  originalCollectionId?: string;
  originalModeId?: string;
}

/**
 * Import options for baseline import
 */
export interface ImportOptions {
  /** 
   * If true, attempt to match existing variables by ID and update them.
   * If false, always create new collections/variables.
   */
  updateExisting?: boolean;
  /**
   * If true, check if the file key matches the current file.
   * Prevents accidentally importing baseline from a different file.
   */
  validateFileKey?: boolean;
}

/**
 * Import baseline into Figma
 *
 * Parses the baseline structure and recreates all collections, modes, and variables
 * in Figma. Supports "handshake" mode where existing variables are matched by their
 * original IDs and updated rather than recreated.
 *
 * @param baseline - Validated baseline object with $metadata and baseline properties
 * @param options - Import options (updateExisting, validateFileKey)
 * @returns Import result with counts and any errors/warnings
 */
export async function importBaseline(
  baseline: any,
  options: ImportOptions = { updateExisting: true }
): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate baseline format
    if (!baseline || !baseline.baseline || typeof baseline.baseline !== 'object') {
      return {
        success: false,
        collectionsCreated: 0,
        collectionsUpdated: 0,
        modesCreated: 0,
        variablesCreated: 0,
        variablesUpdated: 0,
        errors: ['Invalid baseline format: missing baseline property'],
        warnings
      };
    }

    // Extract version information from the imported baseline
    const metadata = baseline.$metadata || {};
    const importedVersion = metadata.version || '1.0.0';
    
    // Try to get the current stored version for comparison
    let previousVersion: string | undefined;
    try {
      const { findRegistryNode, loadChunksFromNode, unchunkData } = await import('../sync/index.js');
      const { PLUGIN_NAMESPACE } = await import('../utils/constants.js');
      
      const node = await findRegistryNode();
      if (node) {
        const chunkCountStr = node.getSharedPluginData(PLUGIN_NAMESPACE, 'chunkCount');
        if (chunkCountStr) {
          const chunkCount = parseInt(chunkCountStr, 10);
          const chunks = loadChunksFromNode(node, PLUGIN_NAMESPACE, chunkCount);
          const storedBaseline = unchunkData(chunks) as any;
          previousVersion = storedBaseline?.$metadata?.version;
        }
      }
    } catch (e) {
      // Silently ignore - version comparison is optional
    }

    // Add version info to warnings if versions differ
    if (previousVersion && importedVersion !== previousVersion) {
      const importedParts = importedVersion.split('.').map(Number);
      const previousParts = previousVersion.split('.').map(Number);
      
      // Compare versions
      const isOlder = importedParts[0] < previousParts[0] ||
        (importedParts[0] === previousParts[0] && importedParts[1] < previousParts[1]) ||
        (importedParts[0] === previousParts[0] && importedParts[1] === previousParts[1] && importedParts[2] < previousParts[2]);
      
      if (isOlder) {
        warnings.push(`Importing older version (${importedVersion}) over newer version (${previousVersion}). This may overwrite recent changes.`);
      } else {
        warnings.push(`Importing version ${importedVersion} (current: ${previousVersion})`);
      }
    }

    // Check file key if validation is enabled
    if (options.validateFileKey && metadata.fileKey && figma.fileKey) {
      if (metadata.fileKey !== figma.fileKey) {
        warnings.push(
          `Baseline was exported from a different file (${metadata.fileName || 'unknown'}). ` +
          `Variables will be created as new instead of updating existing ones.`
        );
        // Disable update mode if file doesn't match
        options = { ...options, updateExisting: false };
      }
    }

    // Get existing collections and variables for matching
    const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
    const existingVariables = await figma.variables.getLocalVariablesAsync();
    
    // Build lookup maps for existing items
    const collectionById = new Map(existingCollections.map(c => [c.id, c]));
    const collectionByName = new Map(existingCollections.map(c => [c.name, c]));
    const variableById = new Map(existingVariables.map(v => [v.id, v]));
    const variableByKey = new Map<string, typeof existingVariables[0]>();
    
    // Build variable lookup by collection+name key
    for (const v of existingVariables) {
      const collection = collectionById.get(v.variableCollectionId);
      if (collection) {
        const key = `${collection.name}:${v.name}`;
        variableByKey.set(key, v);
      }
    }

    // 1. Parse baseline into collections (with original IDs)
    const collections = parseBaselineToCollections(baseline);

    // 2. Create/update collections in Figma
    let collectionsCreated = 0;
    let collectionsUpdated = 0;
    let modesCreated = 0;
    let variablesCreated = 0;
    let variablesUpdated = 0;

    for (const [collectionName, collectionData] of collections) {
      const result = await createOrUpdateCollectionInFigma(
        collectionName,
        collectionData,
        {
          updateExisting: options.updateExisting ?? true,
          collectionById,
          collectionByName,
          variableById,
          variableByKey
        }
      );

      collectionsCreated += result.collectionsCreated;
      collectionsUpdated += result.collectionsUpdated;
      modesCreated += result.modesCreated;
      variablesCreated += result.variablesCreated;
      variablesUpdated += result.variablesUpdated;
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return {
      success: errors.length === 0,
      collectionsCreated,
      collectionsUpdated,
      modesCreated,
      variablesCreated,
      variablesUpdated,
      errors,
      warnings,
      importedVersion,
      previousVersion
    };
  } catch (error) {
    return {
      success: false,
      collectionsCreated: 0,
      collectionsUpdated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      variablesUpdated: 0,
      errors: [`Import failed: ${(error as Error).message}`],
      warnings
    };
  }
}

/**
 * Parse baseline JSON into collection structure
 *
 * Groups tokens by collection and mode, extracting variable names and values
 * from the baseline flat structure. Includes original IDs for handshake matching.
 *
 * @param baseline - Baseline object with tokens keyed by prefixed IDs
 * @returns Map of collection names to their data structures
 */
function parseBaselineToCollections(baseline: any): Map<string, CollectionData> {
  const collections = new Map<string, CollectionData>();
  const tokens = baseline.baseline || {};
  const metadata = baseline.$metadata || {};
  
  // Build collection metadata lookup
  const collectionMetaById = new Map<string, any>();
  if (metadata.collections) {
    for (const col of metadata.collections) {
      collectionMetaById.set(col.id, col);
    }
  }

  for (const [key, token] of Object.entries(tokens)) {
    const t = token as any;
    const collectionName = t.collection;
    const modeName = t.mode;

    // Skip tokens without required fields
    if (!collectionName || !modeName) {
      continue;
    }

    // Get or create collection with original ID
    if (!collections.has(collectionName)) {
      // Find original collection ID from metadata
      const colMeta = Array.from(collectionMetaById.values()).find(c => c.name === collectionName);
      
      collections.set(collectionName, {
        name: collectionName,
        originalId: colMeta?.id || t.collectionId,
        modes: new Map()
      });
    }

    const collection = collections.get(collectionName)!;

    // Get or create mode with original ID
    if (!collection.modes.has(modeName)) {
      // Find original mode ID from metadata
      const colMeta = Array.from(collectionMetaById.values()).find(c => c.name === collectionName);
      const modeMeta = colMeta?.modes?.find((m: any) => m.name === modeName);
      
      collection.modes.set(modeName, {
        name: modeName,
        originalId: modeMeta?.id || t.modeId,
        variables: new Map()
      });
    }

    const mode = collection.modes.get(modeName)!;

    // Extract variable name from path
    // "primitives.Mode 1.color.gray.50" → "color/gray/50"
    const variableName = extractVariableName(t.path, collectionName, modeName);

    // Group variables across modes (same variable name in different modes)
    // Include original IDs for handshake matching
    mode.variables.set(variableName, {
      name: variableName,
      value: t.value,
      type: t.type,
      resolvedType: mapToFigmaType(t.type),
      description: t.description,
      originalVariableId: t.variableId,
      originalCollectionId: t.collectionId,
      originalModeId: t.modeId
    });
  }

  return collections;
}

/**
 * Extract variable name from path
 *
 * Removes collection and mode prefixes from the full path, then converts
 * dot notation to slash notation for Figma variable naming.
 *
 * @param path - Full token path (e.g., "primitives.Mode 1.color.gray.50")
 * @param collection - Collection name to remove
 * @param mode - Mode name to remove
 * @returns Variable name in slash notation (e.g., "color/gray/50")
 */
function extractVariableName(path: string, collection: string, mode: string): string {
  // Remove collection and mode from path
  let name = path;

  // Remove collection prefix
  if (name.startsWith(collection + '.')) {
    name = name.slice(collection.length + 1);
  }

  // Remove mode prefix
  if (name.startsWith(mode + '.')) {
    name = name.slice(mode.length + 1);
  }

  // Convert dots to slashes for Figma variable naming
  return name.replace(/\./g, '/');
}

/**
 * Map token type to Figma variable type
 *
 * Converts DTCG/baseline token types to Figma's VariableResolvedDataType.
 *
 * @param tokenType - Token type from baseline (e.g., "color", "dimension")
 * @returns Figma variable type (e.g., "COLOR", "FLOAT", "STRING")
 */
function mapToFigmaType(tokenType: string): string {
  const typeMap: Record<string, string> = {
    'color': 'COLOR',
    'number': 'FLOAT',
    'dimension': 'FLOAT',
    'spacing': 'FLOAT',
    'fontSize': 'FLOAT',
    'fontFamily': 'STRING',
    'fontWeight': 'STRING',
    'string': 'STRING',
    'boolean': 'BOOLEAN'
  };

  return typeMap[tokenType] || 'STRING';
}

/**
 * Context for matching existing Figma items
 */
interface MatchContext {
  updateExisting: boolean;
  collectionById: Map<string, VariableCollection>;
  collectionByName: Map<string, VariableCollection>;
  variableById: Map<string, Variable>;
  variableByKey: Map<string, Variable>; // "CollectionName:varName" → Variable
}

/**
 * Create or update collection in Figma with all modes and variables
 *
 * If updateExisting is true, attempts to match existing collections and variables
 * by their original IDs or names and updates them. Otherwise, creates new.
 *
 * @param name - Collection name
 * @param data - Collection data with modes and variables
 * @param ctx - Context with existing items for matching
 * @returns Import result for this collection
 */
async function createOrUpdateCollectionInFigma(
  name: string,
  data: CollectionData,
  ctx: MatchContext
): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let collectionsCreated = 0;
  let collectionsUpdated = 0;
  let modesCreated = 0;
  let variablesCreated = 0;
  let variablesUpdated = 0;

  try {
    let collection: VariableCollection;
    let isNewCollection = false;

    // Try to find existing collection
    if (ctx.updateExisting) {
      // First try by original ID
      if (data.originalId && ctx.collectionById.has(data.originalId)) {
        collection = ctx.collectionById.get(data.originalId)!;
        collectionsUpdated = 1;
        console.log(`[BaselineImporter] Matched collection by ID: ${name}`);
      }
      // Then try by name
      else if (ctx.collectionByName.has(name)) {
        collection = ctx.collectionByName.get(name)!;
        collectionsUpdated = 1;
        console.log(`[BaselineImporter] Matched collection by name: ${name}`);
      }
      // Create new
      else {
        collection = figma.variables.createVariableCollection(name);
        isNewCollection = true;
        collectionsCreated = 1;
        console.log(`[BaselineImporter] Created new collection: ${name}`);
      }
    } else {
      // Always create new
      collection = figma.variables.createVariableCollection(name);
      isNewCollection = true;
      collectionsCreated = 1;
    }

    // Handle modes
    const modeNames = Array.from(data.modes.keys());
    const modeIdMap = new Map<string, string>(); // modeName → modeId

    if (isNewCollection) {
      // For new collections, rename first mode and add additional ones
      if (modeNames.length > 0) {
        collection.renameMode(collection.modes[0].modeId, modeNames[0]);
        modeIdMap.set(modeNames[0], collection.modes[0].modeId);
        modesCreated++;
      }

      for (let i = 1; i < modeNames.length; i++) {
        const modeId = collection.addMode(modeNames[i]);
        modeIdMap.set(modeNames[i], modeId);
        modesCreated++;
      }
    } else {
      // For existing collections, match modes by name or original ID
      const existingModes = new Map(collection.modes.map(m => [m.name, m.modeId]));
      
      for (const modeName of modeNames) {
        const modeData = data.modes.get(modeName)!;
        
        // Try to find existing mode by name
        if (existingModes.has(modeName)) {
          modeIdMap.set(modeName, existingModes.get(modeName)!);
        }
        // Try by original ID
        else if (modeData.originalId) {
          const existingModeById = collection.modes.find(m => m.modeId === modeData.originalId);
          if (existingModeById) {
            modeIdMap.set(modeName, existingModeById.modeId);
            // Rename if name changed
            if (existingModeById.name !== modeName) {
              collection.renameMode(existingModeById.modeId, modeName);
            }
          } else {
            // Create new mode
            const modeId = collection.addMode(modeName);
            modeIdMap.set(modeName, modeId);
            modesCreated++;
          }
        }
        // Create new mode
        else {
          const modeId = collection.addMode(modeName);
          modeIdMap.set(modeName, modeId);
          modesCreated++;
        }
      }
    }

    // Group variables by name across modes
    const variableMap = new Map<string, Map<string, Variable>>(); // varName → modeName → Variable
    for (const [modeName, modeData] of data.modes) {
      for (const [varName, variable] of modeData.variables) {
        if (!variableMap.has(varName)) {
          variableMap.set(varName, new Map());
        }
        variableMap.get(varName)!.set(modeName, variable);
      }
    }

    // Process each variable
    for (const [varName, modeVariables] of variableMap) {
      try {
        const firstVar = Array.from(modeVariables.values())[0];
        let figmaVar: typeof ctx.variableById extends Map<string, infer V> ? V : never;
        let isNewVariable = false;

        // Try to find existing variable
        if (ctx.updateExisting) {
          // First try by original variable ID
          if (firstVar.originalVariableId && ctx.variableById.has(firstVar.originalVariableId)) {
            figmaVar = ctx.variableById.get(firstVar.originalVariableId)!;
            variablesUpdated++;
          }
          // Then try by collection+name key
          else {
            const key = `${name}:${varName}`;
            if (ctx.variableByKey.has(key)) {
              figmaVar = ctx.variableByKey.get(key)!;
              variablesUpdated++;
            }
          }
        }

        // Create new variable if not found
        if (!figmaVar) {
          figmaVar = figma.variables.createVariable(
            varName,
            collection,
            firstVar.resolvedType as VariableResolvedDataType
          );
          isNewVariable = true;
          variablesCreated++;
        }

        // Update description if provided
        if (firstVar.description) {
          figmaVar.description = firstVar.description;
        }

        // Set value for each mode
        for (const [modeName, modeVar] of modeVariables) {
          const modeId = modeIdMap.get(modeName);
          if (modeId) {
            const value = parseValue(modeVar.value, modeVar.resolvedType);
            try {
              figmaVar.setValueForMode(modeId, value);
            } catch (error) {
              errors.push(
                `Failed to set value for "${varName}" in mode "${modeName}": ${(error as Error).message}`
              );
            }
          }
        }
      } catch (error) {
        errors.push(`Failed to process variable "${varName}": ${(error as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
      collectionsCreated,
      collectionsUpdated,
      modesCreated,
      variablesCreated,
      variablesUpdated,
      errors,
      warnings
    };
  } catch (error) {
    return {
      success: false,
      collectionsCreated: 0,
      collectionsUpdated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      variablesUpdated: 0,
      errors: [`Failed to process collection "${name}": ${(error as Error).message}`],
      warnings
    };
  }
}

/**
 * Create collection in Figma with all modes and variables
 *
 * Creates the collection, sets up modes, and creates all variables with their
 * values for each mode. Variables are created once and values are set for all modes.
 *
 * @param name - Collection name
 * @param data - Collection data with modes and variables
 * @returns Import result for this collection
 * @deprecated Use createOrUpdateCollectionInFigma instead
 */
async function createCollectionInFigma(
  name: string,
  data: CollectionData
): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Create variable collection
    const collection = figma.variables.createVariableCollection(name);

    // Create modes
    const modeNames = Array.from(data.modes.keys());
    const modeIds: string[] = [];

    // First mode is already created, rename it
    if (modeNames.length > 0) {
      collection.renameMode(collection.modes[0].modeId, modeNames[0]);
      modeIds.push(collection.modes[0].modeId);
    }

    // Add remaining modes
    for (let i = 1; i < modeNames.length; i++) {
      const modeId = collection.addMode(modeNames[i]);
      modeIds.push(modeId);
    }

    // Create variables for each mode
    let variablesCreated = 0;
    const variableMap = new Map<string, Map<string, Variable>>(); // varName → modeName → Variable

    // Group variables by name across modes
    for (const [modeName, modeData] of data.modes) {
      for (const [varName, variable] of modeData.variables) {
        if (!variableMap.has(varName)) {
          variableMap.set(varName, new Map());
        }
        variableMap.get(varName)!.set(modeName, variable);
      }
    }

    // Create each variable once with values for all modes
    for (const [varName, modeVariables] of variableMap) {
      try {
        // Get the first variable to determine type
        const firstVar = Array.from(modeVariables.values())[0];
        const variable = figma.variables.createVariable(
          varName,
          collection,
          firstVar.resolvedType as VariableResolvedDataType
        );

        // Set description if available
        if (firstVar.description) {
          variable.description = firstVar.description;
        }

        // Set value for each mode
        for (let i = 0; i < modeNames.length; i++) {
          const modeName = modeNames[i];
          const modeId = modeIds[i];
          const modeVar = modeVariables.get(modeName);

          if (modeVar) {
            const value = parseValue(modeVar.value, modeVar.resolvedType);
            try {
              variable.setValueForMode(modeId, value);
            } catch (error) {
              errors.push(
                `Failed to set value for "${varName}" in mode "${modeName}": ${(error as Error).message}`
              );
            }
          }
        }

        variablesCreated++;
      } catch (error) {
        errors.push(`Failed to create variable "${varName}": ${(error as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
      collectionsCreated: 1,
      modesCreated: modeIds.length,
      variablesCreated,
      errors,
      warnings
    };
  } catch (error) {
    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: [`Failed to create collection "${name}": ${(error as Error).message}`],
      warnings
    };
  }
}

/**
 * Parse value string to appropriate Figma type
 *
 * Converts string representations of values to their proper Figma types.
 * Handles colors (hex), numbers, and strings.
 *
 * @param value - Value to parse (can be any type)
 * @param type - Figma variable type (COLOR, FLOAT, STRING, etc.)
 * @returns Parsed value in the appropriate format for Figma
 */
function parseValue(value: any, type: string): any {
  if (type === 'COLOR') {
    return parseColor(value);
  } else if (type === 'FLOAT') {
    return parseFloat(value);
  } else if (type === 'BOOLEAN') {
    return Boolean(value);
  } else {
    return String(value);
  }
}

/**
 * Parse color string to RGBA
 *
 * Converts hex color strings to Figma's RGBA object format.
 * Supports both 6-digit (#RRGGBB) and 8-digit (#RRGGBBAA) hex formats.
 *
 * @param colorString - Color value (hex string)
 * @returns RGBA object with values from 0-1
 */
function parseColor(colorString: string): { r: number; g: number; b: number; a: number } {
  // Handle hex colors
  if (typeof colorString === 'string' && colorString.startsWith('#')) {
    const hex = colorString.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  // Default fallback
  return { r: 0, g: 0, b: 0, a: 1 };
}
