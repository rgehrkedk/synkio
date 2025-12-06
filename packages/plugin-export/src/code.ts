// Token Vault - Figma Plugin
// Import, export, and sync design tokens as Figma Variables

interface TokenFile {
  name: string;
  content: any;
}

interface CollectionConfig {
  name: string;
  files: TokenFile[];
  isModeCollection: boolean; // If true, each file becomes a mode
}

interface TokenValue {
  value: any;
  type: string;
  description?: string;
}

interface ExportToken {
  $type: string;
  $value: any;
  $variableId: string;
}

interface BaselineEntry {
  path: string;
  value: any;
  type: string;
  collection: string;
  mode: string;
}

interface BaselineSnapshot {
  $metadata: {
    version: string;
    exportedAt: string;
    pluginVersion: string;
    fileKey: string;
    fileName: string;
  };
  baseline: Record<string, BaselineEntry>;
  [collectionName: string]: any;
}

// Show UI for file upload and configuration
figma.showUI(__html__, {
  width: 600,
  height: 700,
  themeColors: true
});

// Message handlers from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-last-sync') {
    try {
      const syncInfo = await getLastSyncInfo();
      figma.ui.postMessage({
        type: 'last-sync-loaded',
        ...syncInfo
      });
    } catch (error) {
      console.error('Error loading last sync info:', error);
      figma.ui.postMessage({
        type: 'last-sync-loaded',
        exists: false
      });
    }
  }

  if (msg.type === 'get-collections') {
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const allVariables = await figma.variables.getLocalVariablesAsync();

      const collectionData = collections.map(col => ({
        id: col.id,
        name: col.name,
        modeCount: col.modes.length,
        variableCount: allVariables.filter(v => v.variableCollectionId === col.id).length
      }));

      figma.ui.postMessage({
        type: 'collections-loaded',
        collections: collectionData
      });
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  }

  if (msg.type === 'import-tokens') {
    try {
      const { collections } = msg.data;
      await importTokens(collections);
      figma.ui.postMessage({
        type: 'import-complete',
        message: 'Tokens imported successfully!'
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'import-error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (msg.type === 'export-baseline') {
    try {
      console.log('Export baseline requested');
      figma.notify('Exporting baseline snapshot...');
      const collectionIds = msg.collectionIds || null;
      const baseline = await exportBaselineSnapshot(collectionIds);
      const jsonString = JSON.stringify(baseline);
      console.log('Export complete, data size:', jsonString.length, 'bytes');
      figma.ui.postMessage({
        type: 'export-complete',
        data: baseline
      });
      figma.notify('Export complete!');
    } catch (error) {
      console.error('Export error:', error);
      figma.ui.postMessage({
        type: 'export-error',
        message: error instanceof Error ? error.message : String(error)
      });
      figma.notify('Export failed: ' + (error instanceof Error ? error.message : String(error)), { error: true });
    }
  }

  if (msg.type === 'sync-to-node') {
    try {
      console.log('Sync to Node requested');
      figma.notify('Syncing registry to node...');
      const collectionIds = msg.collectionIds || null;
      const result = await syncRegistryToNode(collectionIds);
      figma.ui.postMessage({
        type: 'sync-complete',
        nodeId: result.nodeId,
        variableCount: result.variableCount
      });
      figma.notify(`✓ Synced ${result.variableCount} variables to node!`);
    } catch (error) {
      console.error('Sync error:', error);
      figma.ui.postMessage({
        type: 'sync-error',
        message: error instanceof Error ? error.message : String(error)
      });
      figma.notify('Sync failed: ' + (error instanceof Error ? error.message : String(error)), { error: true });
    }
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

async function importTokens(collectionConfigs: CollectionConfig[]) {
  figma.notify('Starting token import...');

  // First pass: Create all variables
  for (const config of collectionConfigs) {
    await createVariableCollection(config);
  }

  figma.notify('Resolving aliases...');

  // Second pass: Resolve aliases
  await resolveAliases();

  figma.notify('✓ Import complete!');
}

async function createVariableCollection(config: CollectionConfig) {
  // Find or create collection
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find(c => c.name === config.name);

  if (!collection) {
    collection = figma.variables.createVariableCollection(config.name);
  }

  if (config.isModeCollection) {
    // Each file is a separate mode
    const defaultMode = collection.modes[0];

    for (let i = 0; i < config.files.length; i++) {
      const file = config.files[i];
      let modeId: string;

      if (i === 0) {
        // Rename default mode to first file name
        modeId = defaultMode.modeId;
        collection.renameMode(modeId, file.name);
      } else {
        // Add new mode for each additional file
        modeId = collection.addMode(file.name);
      }

      // Import tokens for this mode
      await importTokensForMode(collection, modeId, file.content);
    }
  } else {
    // Single mode, merge all files
    const defaultMode = collection.modes[0];
    const mergedTokens = {};

    for (const file of config.files) {
      Object.assign(mergedTokens, file.content);
    }

    await importTokensForMode(collection, defaultMode.modeId, mergedTokens);
  }
}

async function importTokensForMode(
  collection: VariableCollection,
  modeId: string,
  tokens: any,
  prefix: string = ''
) {
  for (const [key, value] of Object.entries(tokens)) {
    // Skip internal properties
    if (key === 'value' || key === 'type' || key === 'description') {
      continue;
    }

    const path = prefix ? `${prefix}/${key}` : key;

    if (isTokenValue(value)) {
      // This is a leaf token
      await createVariable(collection, modeId, path, value as TokenValue);
    } else if (typeof value === 'object' && value !== null) {
      // Recurse into nested object
      await importTokensForMode(collection, modeId, value, path);
    }
  }
}

function isTokenValue(obj: any): boolean {
  return obj && typeof obj === 'object' && 'value' in obj && 'type' in obj;
}

async function createVariable(
  collection: VariableCollection,
  modeId: string,
  path: string,
  token: TokenValue
) {
  const variableName = path;

  // Find existing variable or create new
  const variables = await figma.variables.getLocalVariablesAsync();
  let variable = variables.find(
    v => v.name === variableName && v.variableCollectionId === collection.id
  );

  if (!variable) {
    const resolvedType = mapTokenTypeToFigmaType(token.type);
    variable = figma.variables.createVariable(variableName, collection, resolvedType);
  }

  if (token.description) {
    variable.description = token.description;
  }

  // Set value (handle aliases in second pass)
  const resolvedValue = parseTokenValue(token.value, token.type, variable, modeId);

  if (resolvedValue !== null) {
    try {
      variable.setValueForMode(modeId, resolvedValue);
    } catch (error) {
      console.error(`Failed to set value for ${path}:`, error instanceof Error ? error.message : String(error));
      console.error(`Type: ${token.type}, Value: ${token.value}, Resolved: ${JSON.stringify(resolvedValue)}`);
      // Set a default value based on type
      const defaultValue = getDefaultValueForType(variable.resolvedType);
      if (defaultValue !== null) {
        variable.setValueForMode(modeId, defaultValue);
      }
    }
  } else {
    // For aliases, set a temporary default value
    const defaultValue = getDefaultValueForType(variable.resolvedType);
    if (defaultValue !== null) {
      variable.setValueForMode(modeId, defaultValue);
    }
  }
}

function getDefaultValueForType(type: VariableResolvedDataType): any {
  switch (type) {
    case 'COLOR':
      return { r: 0, g: 0, b: 0 }; // Black
    case 'FLOAT':
      return 0;
    case 'STRING':
      return '';
    case 'BOOLEAN':
      return false;
    default:
      return null;
  }
}

function mapTokenTypeToFigmaType(tokenType: string): VariableResolvedDataType {
  const typeMap: Record<string, VariableResolvedDataType> = {
    'color': 'COLOR',
    'dimension': 'FLOAT',
    'spacing': 'FLOAT',
    'fontFamily': 'STRING',
    'fontWeight': 'STRING',
    'fontSize': 'FLOAT',
    'duration': 'STRING',
    'string': 'STRING',
    'number': 'FLOAT',
    'boolean': 'BOOLEAN',
    'shadow': 'STRING',
    'gradient': 'STRING'
  };

  return typeMap[tokenType] || 'STRING';
}

function parseTokenValue(value: any, type: string, variable?: Variable, modeId?: string): any {
  // Check if value contains alias references
  if (typeof value === 'string' && value.includes('{')) {
    // Check if it's a single alias: "{path.to.token}"
    if (value.startsWith('{') && value.endsWith('}') && value.indexOf('}') === value.length - 1) {
      // Single alias - store for resolution
      if (variable && modeId) {
        aliasReferences.push({
          variable,
          modeId,
          aliasPath: value
        });
      }
      return null;
    } else {
      // Multiple aliases or mixed content (e.g., "{space.1} {space.3}")
      // Figma doesn't support multi-alias, so keep as string
      return String(value);
    }
  }

  // Parse based on type
  switch (type) {
    case 'color':
      return parseColor(value);

    case 'dimension':
    case 'spacing':
    case 'fontSize':
    case 'number':
      return parseNumber(value);

    case 'fontWeight':
      return parseFontWeight(value);

    case 'fontFamily':
    case 'string':
    case 'shadow':
    case 'gradient':
    case 'duration':
      return String(value);

    case 'boolean':
      return Boolean(value);

    default:
      // Return string for unknown types
      return String(value);
  }
}

function parseColor(value: string): RGB | null {
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

function parseNumber(value: any): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove units (px, rem, em, etc.)
    const num = parseFloat(value.replace(/[a-z%]+$/i, ''));
    return isNaN(num) ? null : num;
  }
  return null;
}

function parseFontWeight(value: any): string {
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

// Store alias references during first pass
const aliasReferences: Array<{
  variable: Variable;
  modeId: string;
  aliasPath: string;
}> = [];

async function resolveAliases() {
  const allVariables = await figma.variables.getLocalVariablesAsync();

  // Build a lookup map: path -> variable
  const variableMap = new Map<string, Variable>();
  for (const variable of allVariables) {
    variableMap.set(variable.name, variable);
  }

  // Resolve each alias
  for (const ref of aliasReferences) {
    const aliasPath = ref.aliasPath
      .replace(/^{/, '')
      .replace(/}$/, '')
      .replace(/\./g, '/');

    const targetVariable = variableMap.get(aliasPath);

    if (targetVariable) {
      try {
        // Create alias reference
        ref.variable.setValueForMode(ref.modeId, {
          type: 'VARIABLE_ALIAS',
          id: targetVariable.id
        });
      } catch (error) {
        console.error(`Failed to create alias ${ref.variable.name} -> ${aliasPath}:`, error instanceof Error ? error.message : String(error));
      }
    } else {
      console.warn(`Alias target not found: ${aliasPath} (referenced by ${ref.variable.name})`);
    }
  }

  // Clear references
  aliasReferences.length = 0;
}

// =============================================================================
// EXPORT
// =============================================================================

function mapFigmaTypeToTokenType(figmaType: VariableResolvedDataType): string {
  const typeMap: Record<VariableResolvedDataType, string> = {
    'COLOR': 'color',
    'FLOAT': 'number',
    'STRING': 'string',
    'BOOLEAN': 'boolean'
  };
  return typeMap[figmaType] || 'unknown';
}

function rgbToHex(color: RGB | RGBA): string {
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

async function resolveVariableValue(variable: Variable, modeId: string): Promise<any> {
  const value = variable.valuesByMode[modeId];

  // Check if it's an alias reference
  if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    const aliasedVariable = await figma.variables.getVariableByIdAsync(value.id);
    if (aliasedVariable) {
      // Return alias in {path.to.token} format
      return '{' + aliasedVariable.name.replace(/\//g, '.') + '}';
    }
  }

  // Handle color values
  if (variable.resolvedType === 'COLOR' && typeof value === 'object' && value !== null && 'r' in value) {
    return rgbToHex(value as RGB | RGBA);
  }

  return value;
}

function setNestedValue(obj: any, pathParts: string[], value: any): void {
  let current = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }
  current[pathParts[pathParts.length - 1]] = value;
}

async function exportBaselineSnapshot(filterCollectionIds: string[] | null = null): Promise<BaselineSnapshot> {
  let collections = await figma.variables.getLocalVariableCollectionsAsync();
  const allVariables = await figma.variables.getLocalVariablesAsync();

  // Filter collections if specific IDs provided
  if (filterCollectionIds && filterCollectionIds.length > 0) {
    collections = collections.filter(c => filterCollectionIds.includes(c.id));
  }

  const output: BaselineSnapshot = {
    $metadata: {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      pluginVersion: '1.0.0',
      fileKey: figma.fileKey || '',
      fileName: figma.root.name
    },
    baseline: {}
  };

  // Process each collection
  for (const collection of collections) {
    const collectionName = collection.name;
    const variables = allVariables.filter(v => v.variableCollectionId === collection.id);

    // Initialize collection in output
    if (!output[collectionName]) {
      output[collectionName] = {};
    }

    // Process each mode
    for (const mode of collection.modes) {
      // Use "value" as default mode name if Figma's default "Mode 1" is detected
      const modeName = mode.name === 'Mode 1' ? 'value' : mode.name;

      // Initialize mode in collection
      if (!output[collectionName][modeName]) {
        output[collectionName][modeName] = {};
      }

      // Process each variable in this mode
      for (const variable of variables) {
        const pathParts = variable.name.split('/').map(p => p.trim());
        const value = await resolveVariableValue(variable, mode.modeId);
        const tokenType = mapFigmaTypeToTokenType(variable.resolvedType);

        // Create prefixed variable ID: collectionName:modeName:VariableID
        const prefixedId = `${collectionName}:${modeName}:${variable.id}`;

        // Create token for nested structure
        const token: ExportToken = {
          $type: tokenType,
          $value: value,
          $variableId: prefixedId
        };

        // Add to nested structure
        setNestedValue(output[collectionName][modeName], pathParts, token);

        // Add to baseline (flat structure)
        const fullPath = `${collectionName}.${modeName}.${pathParts.join('.')}`;
        output.baseline[prefixedId] = {
          path: fullPath,
          value: value,
          type: tokenType,
          collection: collectionName,
          mode: modeName
        };
      }
    }
  }

  return output;
}

// =============================================================================
// SYNC TO NODE
// =============================================================================

const PLUGIN_NAMESPACE = 'token_vault';
const LEGACY_NAMESPACE = 'design_token_importer'; // For backwards compatibility
const REGISTRY_NODE_NAME = '_token_registry';

/**
 * Get info about the last sync from the registry node.
 */
async function getLastSyncInfo(): Promise<{
  exists: boolean;
  nodeId?: string;
  updatedAt?: string;
  variableCount?: number;
}> {
  // Search all pages for the registry node
  for (const page of figma.root.children) {
    for (const node of page.children) {
      if (node.type === 'FRAME' && node.name === REGISTRY_NODE_NAME) {
        // Try current namespace first, then legacy
        let updatedAt = node.getSharedPluginData(PLUGIN_NAMESPACE, 'updatedAt');
        let variableCount = node.getSharedPluginData(PLUGIN_NAMESPACE, 'variableCount');

        // Fallback to legacy namespace
        if (!updatedAt) {
          updatedAt = node.getSharedPluginData(LEGACY_NAMESPACE, 'updatedAt');
          variableCount = node.getSharedPluginData(LEGACY_NAMESPACE, 'variableCount');
        }

        if (updatedAt) {
          return {
            exists: true,
            nodeId: node.id,
            updatedAt,
            variableCount: variableCount ? parseInt(variableCount, 10) : undefined
          };
        }
      }
    }
  }

  return { exists: false };
}

/**
 * Sync token registry to a node's sharedPluginData.
 * This allows the data to be read via Figma REST API.
 * Uses chunked storage to bypass the 100KB per entry limit.
 */
async function syncRegistryToNode(filterCollectionIds: string[] | null = null): Promise<{ nodeId: string; variableCount: number }> {
  console.log('[Registry] Syncing to node...');

  // Use the same export function to get consistent data
  const exportData = await exportBaselineSnapshot(filterCollectionIds);
  const variableCount = Object.keys(exportData.baseline).length;

  console.log(`[Registry] Exported ${variableCount} variables`);

  // Find or create the registry node
  let frame: FrameNode | null = null;
  for (const node of figma.currentPage.children) {
    if (node.type === 'FRAME' && node.name === REGISTRY_NODE_NAME) {
      frame = node;
      break;
    }
  }

  if (!frame) {
    console.log('[Registry] Creating new registry node...');
    frame = figma.createFrame();
    frame.name = REGISTRY_NODE_NAME;
    frame.resize(100, 100);
    frame.x = -1000; // Off-canvas
    frame.y = -1000;
    frame.visible = false;
    frame.locked = true;
  }

  // Store data as sharedPluginData in chunks (100KB limit per entry)
  const jsonData = JSON.stringify(exportData);
  const CHUNK_SIZE = 90000; // 90KB to be safe (under 100KB limit)
  const chunks: string[] = [];

  for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
    chunks.push(jsonData.slice(i, i + CHUNK_SIZE));
  }

  console.log(`[Registry] Splitting ${jsonData.length} bytes into ${chunks.length} chunks`);

  // Clear old chunks first (in case there were more before)
  for (let i = 0; i < 20; i++) {
    frame.setSharedPluginData(PLUGIN_NAMESPACE, `registry_${i}`, '');
  }

  // Save new chunks
  for (let i = 0; i < chunks.length; i++) {
    frame.setSharedPluginData(PLUGIN_NAMESPACE, `registry_${i}`, chunks[i]);
  }

  // Save metadata
  frame.setSharedPluginData(PLUGIN_NAMESPACE, 'chunkCount', String(chunks.length));
  frame.setSharedPluginData(PLUGIN_NAMESPACE, 'updatedAt', new Date().toISOString());
  frame.setSharedPluginData(PLUGIN_NAMESPACE, 'variableCount', String(variableCount));

  console.log(`[Registry] Saved ${jsonData.length} bytes in ${chunks.length} chunks to node ${frame.id}`);

  return {
    nodeId: frame.id,
    variableCount
  };
}
