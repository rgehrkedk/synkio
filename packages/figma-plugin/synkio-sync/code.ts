/**
 * Synkio Sync - Simple Figma Plugin
 * 
 * Reads all local variables and stores them on figma.root
 * so the CLI can sync them without needing a nodeId.
 */

const NAMESPACE = 'synkio';
const MAX_CHUNK_SIZE = 90000; // Figma has 100KB limit per key

interface TokenEntry {
  variableId: string;
  collection: string;
  mode: string;
  path: string;
  value: any;
  type: string;
  // Optional metadata (captured but only included in output if config enables it)
  description?: string;
  scopes?: string[];
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
}

interface SyncData {
  version: string;
  timestamp: string;
  tokens: TokenEntry[];
}

/**
 * Convert a Figma variable value to a simple value
 */
function resolveValue(value: VariableValue, type: string): any {
  // Handle variable aliases
  if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    return { $ref: value.id };
  }

  // Handle colors
  if (type === 'COLOR' && typeof value === 'object' && 'r' in value) {
    const { r, g, b, a } = value as RGBA;
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    if (a !== undefined && a < 1) {
      return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a.toFixed(2)})`;
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  return value;
}

/**
 * Read all variables and format them for export
 */
async function collectTokens(): Promise<TokenEntry[]> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const tokens: TokenEntry[] = [];

  for (const collection of collections) {
    // Get mode names - normalize "Mode 1" to "value" for single-mode collections
    const isSingleMode = collection.modes.length === 1;
    const modeMap = new Map(collection.modes.map(m => {
      // If single mode with default Figma name, use "value" instead
      const normalizedName = (isSingleMode && m.name === 'Mode 1') ? 'value' : m.name;
      return [m.modeId, normalizedName];
    }));

    for (const variableId of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(variableId);
      if (!variable) continue;

      // Capture optional metadata (always capture, CLI decides what to include)
      const description = variable.description || undefined;
      const scopes = variable.scopes && variable.scopes.length > 0 ? variable.scopes : undefined;
      const codeSyntax = variable.codeSyntax && Object.keys(variable.codeSyntax).length > 0 
        ? variable.codeSyntax as { WEB?: string; ANDROID?: string; iOS?: string }
        : undefined;

      // Get value for each mode
      for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
        const modeName = modeMap.get(modeId) || modeId;
        
        const entry: TokenEntry = {
          variableId: variable.id,
          collection: collection.name,
          mode: modeName,
          path: variable.name.replace(/\//g, '.'), // Convert Figma path separators
          value: resolveValue(value, variable.resolvedType),
          type: variable.resolvedType.toLowerCase(),
        };

        // Only add metadata if it exists (keeps baseline smaller)
        if (description) entry.description = description;
        if (scopes) entry.scopes = scopes;
        if (codeSyntax) entry.codeSyntax = codeSyntax;

        tokens.push(entry);
      }
    }
  }

  return tokens;
}

/**
 * Store data on figma.root, chunked if necessary
 */
function storeData(data: SyncData): void {
  const json = JSON.stringify(data);
  
  // Clear any existing chunks
  const existingCount = figma.root.getSharedPluginData(NAMESPACE, 'chunkCount');
  if (existingCount) {
    const count = parseInt(existingCount, 10);
    for (let i = 0; i < count; i++) {
      figma.root.setSharedPluginData(NAMESPACE, `chunk_${i}`, '');
    }
  }

  // Split into chunks if needed
  const chunks: string[] = [];
  for (let i = 0; i < json.length; i += MAX_CHUNK_SIZE) {
    chunks.push(json.slice(i, i + MAX_CHUNK_SIZE));
  }

  // Store chunks
  figma.root.setSharedPluginData(NAMESPACE, 'chunkCount', String(chunks.length));
  chunks.forEach((chunk, i) => {
    figma.root.setSharedPluginData(NAMESPACE, `chunk_${i}`, chunk);
  });

  // Store metadata
  figma.root.setSharedPluginData(NAMESPACE, 'version', data.version);
  figma.root.setSharedPluginData(NAMESPACE, 'timestamp', data.timestamp);
  figma.root.setSharedPluginData(NAMESPACE, 'tokenCount', String(data.tokens.length));
}

/**
 * Main sync function
 */
async function sync(): Promise<void> {
  try {
    figma.notify('Syncing variables...', { timeout: 1000 });

    const tokens = await collectTokens();

    if (tokens.length === 0) {
      figma.notify('No variables found', { error: true });
      figma.closePlugin();
      return;
    }

    const data: SyncData = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      tokens,
    };

    storeData(data);

    figma.notify(`✓ Synced ${tokens.length} tokens`, { timeout: 2000 });
    figma.closePlugin();
  } catch (error) {
    figma.notify(`Error: ${error}`, { error: true });
    figma.closePlugin();
  }
}

// Run immediately
sync();
