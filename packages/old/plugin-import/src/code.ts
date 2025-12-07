// E-Boks Design Token Sync Plugin
// Bidirectional sync between Figma Variables and Design Tokens

// =============================================================================
// TYPES
// =============================================================================

interface TokenValue {
  $value: string | number;
  $type: string;
  $variableId: string;
}

interface BaselineEntry {
  path: string;
  value: string | number;
  type: string;
  brand?: string;
  mode?: string;
  collection: string;
}

interface ExportOutput {
  $metadata: {
    version: string;
    exportedAt: string;
    pluginVersion: string;
    fileKey: string;
    fileName: string;
  };
  brand: Record<string, unknown>;
  theme: Record<string, unknown>;
  globals: Record<string, unknown>;
  baseline: Record<string, BaselineEntry>;
  migrations: never[];
}

interface ImportAnalysis {
  toUpdate: TokenToImport[];
  toCreate: TokenToImport[];
  unmatched: UnmatchedVariable[];
  missingCollections: string[];
  missingModes: Array<{ collection: string; mode: string }>;
}

interface TokenToImport {
  path: string;
  value: string | number;
  type: string;
  collection: string;
  mode: string;
  variableId: string;
}

interface UnmatchedVariable {
  id: string;
  name: string;
  collection: string;
  type: string;
}

interface ImportResult {
  successes: number;
  failures: Array<{ variableId: string; error: string }>;
  newVariablesCreated: number;
}

// =============================================================================
// UTILITIES
// =============================================================================

function parseCollectionType(name: string): 'brand' | 'theme' | 'globals' | 'unknown' {
  const lower = name.toLowerCase();
  if (lower === 'brand' || lower.startsWith('brand/')) return 'brand';
  if (lower === 'theme' || lower.startsWith('theme/')) return 'theme';
  if (lower === 'globals') return 'globals';
  return 'unknown';
}

function rgbToHex(color: RGB | RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  if ('a' in color && color.a < 1) {
    return '#' + hex + Math.round(color.a * 255).toString(16).padStart(2, '0');
  }
  return '#' + hex;
}

function hexToRgb(hex: string): RGB | RGBA | null {
  const clean = hex.replace('#', '').toLowerCase();
  if (!/^[0-9a-f]+$/.test(clean)) return null;

  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16) / 255,
      g: parseInt(clean.slice(2, 4), 16) / 255,
      b: parseInt(clean.slice(4, 6), 16) / 255
    };
  }
  if (clean.length === 8) {
    return {
      r: parseInt(clean.slice(0, 2), 16) / 255,
      g: parseInt(clean.slice(2, 4), 16) / 255,
      b: parseInt(clean.slice(4, 6), 16) / 255,
      a: parseInt(clean.slice(6, 8), 16) / 255
    };
  }
  return null;
}

function getTokenType(resolvedType: VariableResolvedDataType): string {
  const map: Record<string, string> = { COLOR: 'color', FLOAT: 'number', STRING: 'string', BOOLEAN: 'boolean' };
  return map[resolvedType] || 'unknown';
}

function tokenTypeToFigmaType(type: string): VariableResolvedDataType {
  const map: Record<string, VariableResolvedDataType> = { color: 'COLOR', number: 'FLOAT', string: 'STRING', boolean: 'BOOLEAN' };
  return map[type] || 'STRING';
}

function setNestedToken(obj: Record<string, unknown>, path: string[], value: TokenValue): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) current[path[i]] = {};
    current = current[path[i]] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

function parseVariableId(id: string): { collection: string; mode: string; figmaId: string; valid: boolean } {
  const invalid = { collection: '', mode: '', figmaId: '', valid: false };
  if (!id) return invalid;

  const parts = id.split(':');
  if (parts.length < 5 || parts[2] !== 'VariableID') return invalid;
  if (!['brand', 'theme', 'globals'].includes(parts[0])) return invalid;

  return { collection: parts[0], mode: parts[1], figmaId: parts.slice(2).join(':'), valid: true };
}

function isAlias(value: string | number): boolean {
  return typeof value === 'string' && value.startsWith('{') && value.endsWith('}');
}

function parseAlias(alias: string): string {
  return alias.slice(1, -1).trim();
}

// =============================================================================
// EXPORT
// =============================================================================

async function resolveValue(variable: Variable, modeId: string): Promise<unknown> {
  const value = variable.valuesByMode[modeId];
  if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    const aliased = await figma.variables.getVariableByIdAsync(value.id);
    if (aliased) return '{' + aliased.name.replace(/\//g, '.') + '}';
  }
  return value;
}

function formatValue(value: unknown, type: VariableResolvedDataType): unknown {
  if (typeof value === 'string' && value.startsWith('{')) return value;
  if (type === 'COLOR' && typeof value === 'object' && value !== null && 'r' in value) {
    return rgbToHex(value as RGB | RGBA);
  }
  return value;
}

async function exportTokens(selectedIds: Set<string>): Promise<ExportOutput> {
  const output: ExportOutput = {
    $metadata: {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      pluginVersion: '1.0.0',
      fileKey: figma.fileKey || '',
      fileName: figma.root.name
    },
    brand: {},
    theme: {},
    globals: {},
    baseline: {},
    migrations: []
  };

  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const allVariables = await figma.variables.getLocalVariablesAsync();
  const filtered = selectedIds.size > 0 ? collections.filter(c => selectedIds.has(c.id)) : collections;

  for (const coll of filtered) {
    const type = parseCollectionType(coll.name);
    const collName = coll.name.toLowerCase();
    const vars = allVariables.filter(v => v.variableCollectionId === coll.id);

    postProgress(`Processing: ${coll.name} (${vars.length} vars)`);

    for (const mode of coll.modes) {
      const modeName = mode.name.toLowerCase();

      // Skip non-matching modes for theme collection
      if (type === 'theme' && modeName !== 'light' && modeName !== 'dark') continue;

      for (const variable of vars) {
        const pathParts = variable.name.split('/').map(p => p.trim());
        const raw = await resolveValue(variable, mode.modeId);
        const formatted = formatValue(raw, variable.resolvedType);
        const prefixedId = `${collName}:${modeName}:${variable.id}`;

        const token: TokenValue = {
          $value: formatted as string | number,
          $type: getTokenType(variable.resolvedType),
          $variableId: prefixedId
        };

        // Add to appropriate section
        if (type === 'brand') {
          if (!output.brand[modeName]) output.brand[modeName] = {};
          setNestedToken(output.brand[modeName] as Record<string, unknown>, pathParts, token);
        } else if (type === 'theme') {
          if (!output.theme[modeName]) output.theme[modeName] = {};
          setNestedToken(output.theme[modeName] as Record<string, unknown>, pathParts, token);
        } else if (type === 'globals') {
          setNestedToken(output.globals as Record<string, unknown>, pathParts, token);
        }

        // Add to baseline
        const entry: BaselineEntry = {
          path: pathParts.join('.'),
          value: formatted as string | number,
          type: getTokenType(variable.resolvedType),
          collection: type === 'unknown' ? collName : type
        };
        if (type === 'brand') entry.brand = modeName;
        if (type === 'theme' || type === 'globals') entry.mode = modeName;
        output.baseline[prefixedId] = entry;
      }
    }
  }

  postProgress('Export complete!');
  return output;
}

// =============================================================================
// IMPORT
// =============================================================================

function validateBaseline(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return { valid: false, errors: ['Not a valid JSON object'] };

  const d = data as Record<string, unknown>;
  if (!d.$metadata) errors.push('Missing $metadata');
  if (!('brand' in d)) errors.push('Missing brand');
  if (!('theme' in d)) errors.push('Missing theme');
  if (!('globals' in d)) errors.push('Missing globals');
  if (!('baseline' in d)) errors.push('Missing baseline');

  return { valid: errors.length === 0, errors };
}

async function analyzeImport(data: ExportOutput): Promise<ImportAnalysis> {
  const toUpdate: TokenToImport[] = [];
  const toCreate: TokenToImport[] = [];
  const unmatched: UnmatchedVariable[] = [];
  const missingCollections: string[] = [];
  const missingModes: Array<{ collection: string; mode: string }> = [];

  const allVars = await figma.variables.getLocalVariablesAsync();
  const allColls = await figma.variables.getLocalVariableCollectionsAsync();

  const varById = new Map(allVars.map(v => [v.id, v]));
  const collByName = new Map(allColls.map(c => [c.name.toLowerCase(), c]));
  const modesByCol = new Map(allColls.map(c => [
    c.name.toLowerCase(),
    new Map(c.modes.map(m => [m.name.toLowerCase(), m.modeId]))
  ]));
  const collIdToName = new Map(allColls.map(c => [c.id, c.name]));

  const seenFigmaIds = new Set<string>();
  const requiredColls = new Set<string>();
  const requiredModes = new Map<string, Set<string>>();

  for (const [variableId, entry] of Object.entries(data.baseline)) {
    const parsed = parseVariableId(variableId);
    if (!parsed.valid) continue;

    requiredColls.add(parsed.collection);
    if (!requiredModes.has(parsed.collection)) requiredModes.set(parsed.collection, new Set());
    requiredModes.get(parsed.collection)!.add(parsed.mode);

    const token: TokenToImport = {
      path: entry.path,
      value: entry.value,
      type: entry.type,
      collection: parsed.collection,
      mode: parsed.mode,
      variableId
    };

    if (varById.has(parsed.figmaId)) {
      seenFigmaIds.add(parsed.figmaId);
      toUpdate.push(token);
    } else {
      toCreate.push(token);
    }
  }

  // Find unmatched Figma variables
  for (const v of allVars) {
    if (!seenFigmaIds.has(v.id)) {
      unmatched.push({
        id: v.id,
        name: v.name,
        collection: collIdToName.get(v.variableCollectionId) || 'Unknown',
        type: v.resolvedType
      });
    }
  }

  // Find missing collections/modes
  for (const c of requiredColls) {
    if (!collByName.has(c)) missingCollections.push(c);
  }
  for (const [col, modes] of requiredModes) {
    const existing = modesByCol.get(col);
    if (existing) {
      for (const m of modes) {
        if (!existing.has(m)) missingModes.push({ collection: col, mode: m });
      }
    }
  }

  postImportProgress(`Analysis: ${toUpdate.length} update, ${toCreate.length} create, ${unmatched.length} unmatched`);
  return { toUpdate, toCreate, unmatched, missingCollections, missingModes };
}

async function applyImport(
  analysis: ImportAnalysis,
  _data: ExportOutput,
  opts: { createMissingCollections: boolean; createMissingModes: boolean }
): Promise<ImportResult> {
  let successes = 0;
  const failures: Array<{ variableId: string; error: string }> = [];
  let newVars = 0;

  const allColls = await figma.variables.getLocalVariableCollectionsAsync();
  const collByName = new Map(allColls.map(c => [c.name.toLowerCase(), c]));
  const modesByCol = new Map<string, Map<string, string>>();

  for (const c of allColls) {
    modesByCol.set(c.name.toLowerCase(), new Map(c.modes.map(m => [m.name.toLowerCase(), m.modeId])));
  }

  // Create missing collections
  if (opts.createMissingCollections) {
    for (const name of analysis.missingCollections) {
      try {
        const newCol = figma.variables.createVariableCollection(name);
        collByName.set(name, newCol);
        modesByCol.set(name, new Map(newCol.modes.map(m => [m.name.toLowerCase(), m.modeId])));
        postImportProgress(`Created collection: ${name}`);
      } catch (e) {
        postImportProgress(`Failed to create collection: ${name}`);
      }
    }
  }

  // Create missing modes
  if (opts.createMissingModes) {
    for (const { collection, mode } of analysis.missingModes) {
      const col = collByName.get(collection);
      if (col) {
        try {
          const newMode = col.addMode(mode);
          const colModes = modesByCol.get(collection);
          if (colModes) colModes.set(mode.toLowerCase(), newMode);
          postImportProgress(`Created mode: ${mode} in ${collection}`);
        } catch (e) {
          postImportProgress(`Failed to create mode: ${mode}`);
        }
      }
    }
  }

  // Helper to convert value
  async function toFigmaValue(token: TokenToImport): Promise<{ value: VariableValue | null; error?: string }> {
    const tokenValue = token.value;

    if (typeof tokenValue === 'string' && tokenValue.startsWith('{') && tokenValue.endsWith('}')) {
      const path = tokenValue.slice(1, -1).trim();
      const allVars = await figma.variables.getLocalVariablesAsync();
      const target = allVars.find(v => v.name === path.replace(/\./g, '/'));
      if (target) return { value: figma.variables.createVariableAlias(target) };
      return { value: null, error: `Alias not found: ${path}` };
    }

    if (token.type === 'color' && typeof tokenValue === 'string') {
      if (tokenValue.startsWith('#')) {
        const rgb = hexToRgb(tokenValue);
        if (rgb) return { value: rgb };
        return { value: null, error: 'Invalid hex color' };
      }
      const match = tokenValue.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
      if (match) {
        return { value: { r: +match[1]/255, g: +match[2]/255, b: +match[3]/255, a: +match[4] } };
      }
      return { value: null, error: 'Unknown color format' };
    }

    return { value: tokenValue as VariableValue };
  }

  // Process updates
  for (const token of analysis.toUpdate) {
    try {
      const parsed = parseVariableId(token.variableId);
      if (!parsed.valid) { failures.push({ variableId: token.variableId, error: 'Invalid ID' }); continue; }

      const variable = await figma.variables.getVariableByIdAsync(parsed.figmaId);
      if (!variable) { failures.push({ variableId: token.variableId, error: 'Not found' }); continue; }

      const modeId = modesByCol.get(parsed.collection)?.get(parsed.mode);
      if (!modeId) { failures.push({ variableId: token.variableId, error: `Mode not found: ${parsed.mode}` }); continue; }

      const { value, error } = await toFigmaValue(token);
      if (error || value === null) { failures.push({ variableId: token.variableId, error: error || 'Null value' }); continue; }

      variable.setValueForMode(modeId, value);
      successes++;
    } catch (e) {
      failures.push({ variableId: token.variableId, error: e instanceof Error ? e.message : 'Unknown' });
    }
  }

  // Process creates
  for (const token of analysis.toCreate) {
    try {
      const parsed = parseVariableId(token.variableId);
      const col = collByName.get(parsed.collection);
      if (!col) { if (!opts.createMissingCollections) failures.push({ variableId: token.variableId, error: 'Collection missing' }); continue; }

      const modeId = modesByCol.get(parsed.collection)?.get(parsed.mode);
      if (!modeId) { if (!opts.createMissingModes) failures.push({ variableId: token.variableId, error: 'Mode missing' }); continue; }

      const figmaName = token.path.replace(/\./g, '/');
      const newVar = figma.variables.createVariable(figmaName, col, tokenTypeToFigmaType(token.type));

      const { value, error } = await toFigmaValue(token);
      if (!error && value !== null) newVar.setValueForMode(modeId, value);

      successes++;
      newVars++;
    } catch (e) {
      failures.push({ variableId: token.variableId, error: e instanceof Error ? e.message : 'Unknown' });
    }
  }

  return { successes, failures, newVariablesCreated: newVars };
}

// =============================================================================
// VARIABLE REGISTRY FRAME
// =============================================================================

const REGISTRY_FRAME_NAME = '_variable_registry';
const REGISTRY_NODE_NAME = '_token_registry';
const PLUGIN_NAMESPACE = 'eboks_tokens';

interface VariableRegistryEntry {
  path: string;
  type: string;
  collection: string;
}

/**
 * Sync token registry to a node's sharedPluginData.
 * This allows the data to be read via Figma REST API without MCP.
 *
 * The data is stored in the same format as exportTokens() output,
 * so it can be directly compared with .baseline-snapshot.json
 * 
 * Uses chunked storage to bypass the 100KB per entry limit.
 */
async function syncRegistryToNode(selectedCollectionIds: Set<string>): Promise<{ nodeId: string; variableCount: number }> {
  console.log('[Registry] Syncing to node...');
  postProgress('Exporting tokens for registry...');

  // Use the same export function to get consistent data (with selected collections)
  const exportData = await exportTokens(selectedCollectionIds);
  const variableCount = Object.keys(exportData.baseline).length;

  console.log(`[Registry] Exported ${variableCount} variables`);
  postProgress(`Exported ${variableCount} variables`);

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
  postProgress(`Saving ${chunks.length} chunks...`);

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
  postProgress(`Registry synced to node: ${frame.id}`);

  return {
    nodeId: frame.id,
    variableCount
  };
}

/**
 * Generate registry frames with bound variables (legacy visual approach).
 * - COLOR variables → rectangles with bound fill
 * - FLOAT variables → rectangles with bound width
 * - STRING/BOOLEAN → text nodes (for reference, may not bind)
 *
 * Each node is named with the variableId (numeric part).
 * MCP can then read: get_design_context → node names (variableIds) + bound variable paths
 */
async function generateVariableRegistryFrame(): Promise<{ frameId: string; variableCount: number }> {
  console.log('[Registry] Starting...');
  postProgress('Loading variables...');

  const allVariables = await figma.variables.getLocalVariablesAsync();
  console.log(`[Registry] Found ${allVariables.length} variables`);
  postProgress(`Found ${allVariables.length} variables`);

  const allCollections = await figma.variables.getLocalVariableCollectionsAsync();
  console.log(`[Registry] Found ${allCollections.length} collections`);
  postProgress(`Found ${allCollections.length} collections`);

  // Categorize variables by type
  const colorVars = allVariables.filter(v => v.resolvedType === 'COLOR');
  const floatVars = allVariables.filter(v => v.resolvedType === 'FLOAT');
  const stringVars = allVariables.filter(v => v.resolvedType === 'STRING');
  const boolVars = allVariables.filter(v => v.resolvedType === 'BOOLEAN');

  console.log(`[Registry] Types: ${colorVars.length} color, ${floatVars.length} float, ${stringVars.length} string, ${boolVars.length} boolean`);
  postProgress(`Processing ${allVariables.length} variables (${colorVars.length} color, ${floatVars.length} float, ${stringVars.length} string)...`);

  // Find or create the registry frame
  let frame: FrameNode | null = null;
  for (const node of figma.currentPage.children) {
    if (node.type === 'FRAME' && node.name === REGISTRY_FRAME_NAME) {
      frame = node;
      break;
    }
  }

  if (!frame) {
    console.log('[Registry] Creating new frame...');
    frame = figma.createFrame();
    frame.name = REGISTRY_FRAME_NAME;
    frame.x = 0;
    frame.y = 0;
  }

  // Clear existing children
  for (const child of [...frame.children]) {
    child.remove();
  }

  // Layout settings
  const RECT_SIZE = 1;
  const SPACING = 2;
  const COLS = 50;

  let processed = 0;
  let currentY = 0;

  // === Section 1: COLOR variables (bind to fill) ===
  if (colorVars.length > 0) {
    const colorSection = figma.createFrame();
    colorSection.name = '_colors';
    colorSection.y = currentY;
    colorSection.fills = [];

    for (const variable of colorVars) {
      const numericId = variable.id.replace('VariableID:', '');
      const col = processed % COLS;
      const row = Math.floor(processed / COLS);

      const rect = figma.createRectangle();
      rect.name = numericId;
      rect.resize(RECT_SIZE, RECT_SIZE);
      rect.x = col * (RECT_SIZE + SPACING);
      rect.y = row * (RECT_SIZE + SPACING);

      const boundPaint = figma.variables.setBoundVariableForPaint(
        { type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } },
        'color',
        variable
      );
      rect.fills = [boundPaint];

      colorSection.appendChild(rect);
      processed++;

      if (processed % 100 === 0) {
        postProgress(`Colors: ${processed}/${colorVars.length}...`);
      }
    }

    const colorRows = Math.ceil(colorVars.length / COLS);
    colorSection.resize(COLS * (RECT_SIZE + SPACING), Math.max(10, colorRows * (RECT_SIZE + SPACING)));
    frame.appendChild(colorSection);
    currentY += colorSection.height + 10;
  }

  // === Section 2: FLOAT variables (bind to width) ===
  if (floatVars.length > 0) {
    const floatSection = figma.createFrame();
    floatSection.name = '_numbers';
    floatSection.y = currentY;
    floatSection.fills = [];

    let floatProcessed = 0;
    for (const variable of floatVars) {
      const numericId = variable.id.replace('VariableID:', '');
      const col = floatProcessed % COLS;
      const row = Math.floor(floatProcessed / COLS);

      const rect = figma.createRectangle();
      rect.name = numericId;
      rect.resize(10, 10); // Base size
      rect.x = col * 15;
      rect.y = row * 15;
      rect.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];

      // Bind variable to width
      try {
        rect.setBoundVariable('width', variable);
      } catch (e) {
        // Some FLOAT vars may not be bindable to width
        console.log(`[Registry] Could not bind ${variable.name} to width`);
      }

      floatSection.appendChild(rect);
      floatProcessed++;
      processed++;
    }

    const floatRows = Math.ceil(floatVars.length / COLS);
    floatSection.resize(COLS * 15, Math.max(10, floatRows * 15));
    frame.appendChild(floatSection);
    currentY += floatSection.height + 10;

    postProgress(`Floats: ${floatProcessed} processed`);
  }

  // === Section 3: STRING variables (store in node name with prefix) ===
  // STRING vars can't be bound to visual properties easily,
  // so we create a text reference with variableId in name
  if (stringVars.length > 0) {
    const stringSection = figma.createFrame();
    stringSection.name = '_strings';
    stringSection.y = currentY;
    stringSection.fills = [];

    let stringProcessed = 0;
    for (const variable of stringVars) {
      const numericId = variable.id.replace('VariableID:', '');

      // Create a tiny frame with the variableId as name
      // We'll embed the variable name in a nested frame for MCP to discover
      const holder = figma.createFrame();
      holder.name = numericId;
      holder.resize(1, 1);
      holder.x = stringProcessed % COLS;
      holder.y = Math.floor(stringProcessed / COLS);
      holder.fills = [];

      // Add inner frame named with the variable path for reference
      const inner = figma.createFrame();
      inner.name = `path:${variable.name}`;
      inner.resize(1, 1);
      inner.fills = [];
      holder.appendChild(inner);

      stringSection.appendChild(holder);
      stringProcessed++;
      processed++;
    }

    const stringRows = Math.ceil(stringVars.length / COLS);
    stringSection.resize(COLS, Math.max(10, stringRows));
    frame.appendChild(stringSection);
    currentY += stringSection.height + 10;

    postProgress(`Strings: ${stringProcessed} processed`);
  }

  // Resize main frame to fit all sections
  frame.resize(COLS * 15, Math.max(10, currentY));

  // Select and zoom
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);

  console.log(`[Registry] Done! Created ${processed} entries`);
  postProgress(`Done! Created ${processed} variable entries (${colorVars.length} colors, ${floatVars.length} numbers, ${stringVars.length} strings)`);

  return {
    frameId: frame.id,
    variableCount: processed
  };
}

// =============================================================================
// MESSAGE HELPERS
// =============================================================================

function postProgress(message: string) {
  figma.ui.postMessage({ type: 'progress', message });
}

function postImportProgress(message: string) {
  figma.ui.postMessage({ type: 'import-progress', message });
}

// =============================================================================
// PLUGIN INIT
// =============================================================================

figma.showUI(__html__, { width: 450, height: 600 });

figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case 'get-collections': {
        const colls = await figma.variables.getLocalVariableCollectionsAsync();
        const vars = await figma.variables.getLocalVariablesAsync();
        figma.ui.postMessage({
          type: 'collections-loaded',
          collections: colls.map(c => ({
            id: c.id,
            name: c.name,
            parsed: { type: parseCollectionType(c.name), brand: null },
            modeCount: c.modes.length,
            modeNames: c.modes.map(m => m.name).join(', '),
            variableCount: vars.filter(v => v.variableCollectionId === c.id).length
          }))
        });
        break;
      }

      case 'export-tokens': {
        postProgress('Starting export...');
        const output = await exportTokens(new Set(msg.selectedCollectionIds || []));
        figma.ui.postMessage({ type: 'export-complete', data: output });
        break;
      }

      case 'validate-file': {
        const result = validateBaseline(msg.data);
        if (result.valid) {
          figma.ui.postMessage({ type: 'file-validated', metadata: msg.data.$metadata });
        } else {
          figma.ui.postMessage({ type: 'file-error', errors: result.errors });
        }
        break;
      }

      case 'analyze-import': {
        postImportProgress('Analyzing...');
        const analysis = await analyzeImport(msg.data);
        figma.ui.postMessage({ type: 'analysis-complete', analysis });
        break;
      }

      case 'apply-import': {
        postImportProgress('Applying...');
        const result = await applyImport(msg.analysis, msg.data, {
          createMissingCollections: msg.createMissingCollections || false,
          createMissingModes: msg.createMissingModes || false
        });
        figma.ui.postMessage({ type: 'import-complete', result });
        break;
      }

      case 'save-github-config': {
        await figma.clientStorage.setAsync('github_config', msg.config);
        figma.ui.postMessage({ type: 'github-config-saved', success: true });
        break;
      }

      case 'load-github-config': {
        const config = await figma.clientStorage.getAsync('github_config');
        figma.ui.postMessage({ type: 'github-config-loaded', config: config || null });
        break;
      }

      case 'generate-registry': {
        postProgress('Generating variable registry frame...');
        const result = await generateVariableRegistryFrame();
        figma.ui.postMessage({
          type: 'registry-generated',
          frameId: result.frameId,
          variableCount: result.variableCount
        });
        postProgress(`Registry frame created with ${result.variableCount} variables`);
        break;
      }

      case 'sync-registry': {
        try {
          const selectedIds = new Set<string>(msg.selectedCollectionIds || []);
          postProgress('Syncing registry to node...');
          const syncResult = await syncRegistryToNode(selectedIds);
          console.log('[Registry] Sending success message:', syncResult);
          figma.ui.postMessage({
            type: 'registry-synced',
            nodeId: syncResult.nodeId,
            variableCount: syncResult.variableCount
          });
          postProgress(`Registry synced! Node ID: ${syncResult.nodeId}`);
        } catch (syncError) {
          console.error('[Registry] Sync error:', syncError);
          figma.ui.postMessage({
            type: 'sync-registry-error',
            message: syncError instanceof Error ? syncError.message : 'Unknown sync error'
          });
        }
        break;
      }

      case 'close':
        figma.closePlugin();
        break;
    }
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
