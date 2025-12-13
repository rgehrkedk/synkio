var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// src/backend/import/collection.ts
async function findOrCreateCollection(name) {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find((c) => c.name === name);
  if (!collection) {
    collection = figma.variables.createVariableCollection(name);
  }
  return collection;
}
function setupModes(collection, config) {
  const fileModeMap = /* @__PURE__ */ new Map();
  if (config.isModeCollection) {
    const defaultMode = collection.modes[0];
    for (let i = 0; i < config.files.length; i++) {
      const file = config.files[i];
      let modeId;
      if (i === 0) {
        modeId = defaultMode.modeId;
        collection.renameMode(modeId, file.name);
      } else {
        modeId = collection.addMode(file.name);
      }
      fileModeMap.set(file.name, modeId);
    }
  } else {
    const defaultMode = collection.modes[0];
    for (const file of config.files) {
      fileModeMap.set(file.name, defaultMode.modeId);
    }
  }
  return fileModeMap;
}
function mergeTokenFiles(files) {
  const merged = {};
  for (const file of files) {
    Object.assign(merged, file.content);
  }
  return merged;
}

// src/backend/utils/type-mappers.ts
function mapTokenTypeToFigmaType(tokenType) {
  const typeMap = {
    "color": "COLOR",
    "dimension": "FLOAT",
    "spacing": "FLOAT",
    "fontFamily": "STRING",
    "fontWeight": "STRING",
    "fontSize": "FLOAT",
    "duration": "STRING",
    "string": "STRING",
    "number": "FLOAT",
    "boolean": "BOOLEAN",
    "shadow": "STRING",
    "gradient": "STRING"
  };
  return typeMap[tokenType] || "STRING";
}
function mapFigmaTypeToTokenType(figmaType) {
  const typeMap = {
    "COLOR": "color",
    "FLOAT": "number",
    "STRING": "string",
    "BOOLEAN": "boolean"
  };
  return typeMap[figmaType] || "string";
}
function getDefaultValueForType(type) {
  switch (type) {
    case "COLOR":
      return { r: 0, g: 0, b: 0 };
    case "FLOAT":
      return 0;
    case "STRING":
      return "";
    case "BOOLEAN":
      return false;
    default:
      return null;
  }
}

// src/backend/utils/parsers.ts
function parseColor(value) {
  if (!value || typeof value !== "string")
    return null;
  if (value.startsWith("#")) {
    const hex = value.replace("#", "");
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      return { r, g, b };
    }
  }
  if (value.startsWith("rgba")) {
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
function parseNumber(value) {
  if (typeof value === "number")
    return value;
  if (typeof value === "string") {
    const num = parseFloat(value.replace(/[a-z%]+$/i, ""));
    return isNaN(num) ? null : num;
  }
  return null;
}
function parseFontWeight(value) {
  const weightMap = {
    100: "Thin",
    200: "Extra Light",
    300: "Light",
    400: "Regular",
    500: "Medium",
    600: "Semi Bold",
    700: "Bold",
    800: "Extra Bold",
    900: "Black"
  };
  if (typeof value === "number") {
    return weightMap[value] || value.toString();
  }
  return value.toString();
}
function rgbToHex(color) {
  const toHex = (value) => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

// src/backend/import/variable.ts
async function createOrUpdateVariable(collection, modeId, path, token, onAlias) {
  const variableName = path;
  const variables = await figma.variables.getLocalVariablesAsync();
  let variable = variables.find(
    (v) => v.name === variableName && v.variableCollectionId === collection.id
  );
  if (!variable) {
    const resolvedType = mapTokenTypeToFigmaType(token.type);
    variable = figma.variables.createVariable(variableName, collection, resolvedType);
  }
  if (token.description) {
    variable.description = token.description;
  }
  const resolvedValue = parseTokenValue(token.value, token.type, variable, modeId, onAlias);
  if (resolvedValue !== null) {
    try {
      variable.setValueForMode(modeId, resolvedValue);
    } catch (error) {
      console.error(`Failed to set value for ${path}:`, error instanceof Error ? error.message : String(error));
      console.error(`Type: ${token.type}, Value: ${token.value}, Resolved: ${JSON.stringify(resolvedValue)}`);
      const defaultValue = getDefaultValueForType(variable.resolvedType);
      if (defaultValue !== null) {
        variable.setValueForMode(modeId, defaultValue);
      }
    }
  } else {
    const defaultValue = getDefaultValueForType(variable.resolvedType);
    if (defaultValue !== null) {
      variable.setValueForMode(modeId, defaultValue);
    }
  }
  return variable;
}
function parseTokenValue(value, type, variable, modeId, onAlias) {
  if (typeof value === "string" && value.includes("{")) {
    if (value.startsWith("{") && value.endsWith("}") && value.indexOf("}") === value.length - 1) {
      if (variable && modeId && onAlias) {
        onAlias(variable, modeId, value);
      }
      return null;
    } else {
      return String(value);
    }
  }
  switch (type) {
    case "color":
      return parseColor(value);
    case "dimension":
    case "spacing":
    case "fontSize":
    case "number":
      return parseNumber(value);
    case "fontWeight":
      return parseFontWeight(value);
    case "fontFamily":
    case "string":
    case "shadow":
    case "gradient":
    case "duration":
      return String(value);
    case "boolean":
      return Boolean(value);
    default:
      return String(value);
  }
}
function isTokenValue(obj) {
  return obj && typeof obj === "object" && ("$value" in obj || "value" in obj && !hasNestedTokens(obj));
}
function hasNestedTokens(obj) {
  for (const key of Object.keys(obj)) {
    if (key === "value" || key === "type" || key === "description" || key === "$value" || key === "$type" || key === "$description") {
      continue;
    }
    const nested = obj[key];
    if (nested && typeof nested === "object") {
      return true;
    }
  }
  return false;
}
function normalizeToken(obj, path, inferType) {
  var _a, _b, _c;
  const explicitType = (_a = obj.$type) != null ? _a : obj.type;
  const inferredType = explicitType || inferType(path);
  return {
    value: (_b = obj.$value) != null ? _b : obj.value,
    type: inferredType,
    description: (_c = obj.$description) != null ? _c : obj.description
  };
}

// src/backend/import/alias-resolver.ts
var AliasResolver = class {
  constructor() {
    this.references = [];
  }
  /**
   * Register an alias reference for later resolution
   */
  registerAlias(variable, modeId, aliasPath) {
    this.references.push({
      variable,
      modeId,
      aliasPath
    });
  }
  /**
   * Resolve all registered aliases
   * @returns Summary of resolution results
   */
  async resolveAll() {
    const warnings = [];
    let resolved = 0;
    let failed = 0;
    const allVariables = await figma.variables.getLocalVariablesAsync();
    const variableMap = /* @__PURE__ */ new Map();
    for (const variable of allVariables) {
      variableMap.set(variable.name, variable);
    }
    for (const ref of this.references) {
      const aliasPath = ref.aliasPath.replace(/^{/, "").replace(/}$/, "").replace(/\./g, "/");
      const targetVariable = variableMap.get(aliasPath);
      if (targetVariable) {
        try {
          ref.variable.setValueForMode(ref.modeId, {
            type: "VARIABLE_ALIAS",
            id: targetVariable.id
          });
          resolved++;
        } catch (error) {
          const message = `Failed to create alias ${ref.variable.name} -> ${aliasPath}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(message);
          warnings.push(message);
          failed++;
        }
      } else {
        const message = `Alias target not found: ${aliasPath} (referenced by ${ref.variable.name})`;
        console.warn(message);
        warnings.push(message);
        failed++;
      }
    }
    return { resolved, failed, warnings };
  }
  /**
   * Clear all stored alias references
   */
  clear() {
    this.references.length = 0;
  }
  /**
   * Get count of pending alias references
   */
  getPendingCount() {
    return this.references.length;
  }
};

// src/backend/type-inference/patterns.ts
var TYPE_PATTERNS = [
  // Font-related patterns (need refinement based on context)
  {
    keywords: ["font", "typography"],
    type: "string",
    priority: 100,
    refine: (path) => {
      const lower = path.toLowerCase();
      if (lower.includes("size"))
        return "dimension";
      if (lower.includes("weight"))
        return "fontWeight";
      if (lower.includes("family"))
        return "fontFamily";
      if (lower.includes("lineheight") || lower.includes("line-height"))
        return "number";
      return "string";
    }
  },
  // Color patterns
  {
    keywords: ["color", "colors", "colours"],
    type: "color",
    priority: 90
  },
  // Dimension patterns
  {
    keywords: ["spacing", "space", "size", "radius", "borderradius", "border-radius"],
    type: "dimension",
    priority: 85
  },
  // Shadow patterns
  {
    keywords: ["shadow", "boxshadow"],
    type: "shadow",
    priority: 80
  },
  // Number patterns
  {
    keywords: ["opacity", "zindex", "z-index"],
    type: "number",
    priority: 75
  },
  // Semantic patterns
  {
    keywords: ["brand", "semantic", "component", "background", "foreground", "border", "fill", "stroke"],
    type: "color",
    priority: 70
  },
  // Layout patterns
  {
    keywords: ["gap", "padding", "margin"],
    type: "dimension",
    priority: 65
  },
  // Animation patterns
  {
    keywords: ["transition", "animation", "breakpoint"],
    type: "string",
    priority: 60
  }
];

// src/backend/type-inference/rules.ts
function inferTypeFromPath(path) {
  const lowerPath = path.toLowerCase();
  const segments = lowerPath.split("/");
  const firstSegment = segments[0];
  for (const pattern of TYPE_PATTERNS) {
    if (pattern.keywords.includes(firstSegment)) {
      if (pattern.refine) {
        return pattern.refine(lowerPath);
      }
      return pattern.type;
    }
    for (const keyword of pattern.keywords) {
      if (lowerPath.includes(keyword)) {
        if (pattern.refine) {
          return pattern.refine(lowerPath);
        }
        return pattern.type;
      }
    }
  }
  return "string";
}

// src/backend/import/index.ts
async function importTokens(collectionConfigs) {
  figma.notify("Starting token import...");
  const aliasResolver = new AliasResolver();
  for (const config of collectionConfigs) {
    await importCollection(config, aliasResolver);
  }
  figma.notify("Resolving aliases...");
  const result = await aliasResolver.resolveAll();
  if (result.resolved > 0) {
    console.log(`Resolved ${result.resolved} alias references`);
  }
  if (result.failed > 0) {
    console.warn(`Failed to resolve ${result.failed} aliases`);
    if (result.warnings.length > 0) {
      figma.notify(`Warning: ${result.failed} aliases could not be resolved`, { timeout: 5e3 });
    }
  }
  aliasResolver.clear();
  figma.notify("\u2713 Import complete!");
}
async function importCollection(config, aliasResolver) {
  const collection = await findOrCreateCollection(config.name);
  const fileModeMap = setupModes(collection, config);
  if (config.isModeCollection) {
    for (const file of config.files) {
      const modeId = fileModeMap.get(file.name);
      if (modeId) {
        await importTokensForMode(collection, modeId, file.content, aliasResolver);
      }
    }
  } else {
    const mergedTokens = mergeTokenFiles(config.files);
    const defaultMode = collection.modes[0];
    await importTokensForMode(collection, defaultMode.modeId, mergedTokens, aliasResolver);
  }
}
async function importTokensForMode(collection, modeId, tokens, aliasResolver, prefix = "") {
  for (const [key, value] of Object.entries(tokens)) {
    if (key === "value" || key === "type" || key === "description" || key === "$value" || key === "$type" || key === "$description") {
      continue;
    }
    const path = prefix ? `${prefix}/${key}` : key;
    if (isTokenValue(value)) {
      const normalizedToken = normalizeToken(value, path, inferTypeFromPath);
      await createOrUpdateVariable(
        collection,
        modeId,
        path,
        normalizedToken,
        (variable, modeId2, aliasPath) => {
          aliasResolver.registerAlias(variable, modeId2, aliasPath);
        }
      );
    } else if (typeof value === "object" && value !== null) {
      await importTokensForMode(collection, modeId, value, aliasResolver, path);
    }
  }
}

// src/backend/export/transformer.ts
async function resolveVariableValue(variable, modeId) {
  const value = variable.valuesByMode[modeId];
  if (typeof value === "object" && value !== null && "type" in value && value.type === "VARIABLE_ALIAS") {
    const aliasedVariable = await figma.variables.getVariableByIdAsync(value.id);
    if (aliasedVariable) {
      return "{" + aliasedVariable.name.replace(/\//g, ".") + "}";
    }
  }
  if (variable.resolvedType === "COLOR" && typeof value === "object" && value !== null && "r" in value) {
    return rgbToHex(value);
  }
  return value;
}
function setNestedValue(obj, pathParts, value) {
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

// src/backend/export/baseline.ts
async function buildBaselineSnapshot(filterCollectionIds = null) {
  let collections = await figma.variables.getLocalVariableCollectionsAsync();
  const allVariables = await figma.variables.getLocalVariablesAsync();
  if (filterCollectionIds && filterCollectionIds.length > 0) {
    collections = collections.filter((c) => filterCollectionIds.includes(c.id));
  }
  const output = {
    $metadata: {
      version: "2.0.0",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      pluginVersion: "1.0.0",
      fileKey: figma.fileKey || "",
      fileName: figma.root.name
    },
    baseline: {}
  };
  for (const collection of collections) {
    const collectionName = collection.name;
    const variables = allVariables.filter((v) => v.variableCollectionId === collection.id);
    if (!output[collectionName]) {
      output[collectionName] = {};
    }
    for (const mode of collection.modes) {
      const modeName = mode.name === "Mode 1" ? "value" : mode.name;
      if (!output[collectionName][modeName]) {
        output[collectionName][modeName] = {};
      }
      for (const variable of variables) {
        const pathParts = variable.name.split("/").map((p) => p.trim());
        const value = await resolveVariableValue(variable, mode.modeId);
        const tokenType = mapFigmaTypeToTokenType(variable.resolvedType);
        const prefixedId = `${collectionName}:${modeName}:${variable.id}`;
        const token = {
          $type: tokenType,
          $value: value,
          $variableId: prefixedId
        };
        setNestedValue(output[collectionName][modeName], pathParts, token);
        const fullPath = `${collectionName}.${modeName}.${pathParts.join(".")}`;
        output.baseline[prefixedId] = {
          path: fullPath,
          value,
          type: tokenType,
          collection: collectionName,
          mode: modeName
        };
      }
    }
  }
  return output;
}

// src/backend/export/index.ts
async function exportBaseline(filterCollectionIds = null) {
  return buildBaselineSnapshot(filterCollectionIds);
}

// src/backend/utils/constants.ts
var PLUGIN_NAMESPACE = "token_vault";
var LEGACY_NAMESPACE = "design_token_importer";
var REGISTRY_NODE_NAME = "_token_registry";
var CHUNK_SIZE = 9e4;

// src/backend/sync/chunker.ts
function chunkData(data) {
  const jsonData = JSON.stringify(data);
  const totalSize = jsonData.length;
  const chunks = [];
  for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
    chunks.push(jsonData.slice(i, i + CHUNK_SIZE));
  }
  return {
    chunks,
    totalSize,
    chunkCount: chunks.length
  };
}

// src/backend/sync/node-manager.ts
async function findRegistryNode() {
  for (const page of figma.root.children) {
    await page.loadAsync();
    for (const node of page.children) {
      if (node.type === "FRAME" && node.name === REGISTRY_NODE_NAME) {
        return node;
      }
    }
  }
  return null;
}
async function createRegistryNode() {
  const frame = figma.createFrame();
  frame.name = REGISTRY_NODE_NAME;
  frame.resize(100, 100);
  frame.x = -1e3;
  frame.y = -1e3;
  frame.visible = false;
  frame.locked = true;
  return frame;
}
async function getOrCreateRegistryNode() {
  const existing = await findRegistryNode();
  if (existing) {
    return existing;
  }
  return await createRegistryNode();
}
function clearNodeChunks(node, namespace) {
  for (let i = 0; i < 20; i++) {
    node.setSharedPluginData(namespace, `registry_${i}`, "");
  }
}
function saveChunksToNode(node, namespace, chunks) {
  for (let i = 0; i < chunks.length; i++) {
    node.setSharedPluginData(namespace, `registry_${i}`, chunks[i]);
  }
}

// src/backend/sync/metadata.ts
function readSyncMetadata(node) {
  let updatedAt = node.getSharedPluginData(PLUGIN_NAMESPACE, "updatedAt");
  let variableCount = node.getSharedPluginData(PLUGIN_NAMESPACE, "variableCount");
  if (!updatedAt) {
    updatedAt = node.getSharedPluginData(LEGACY_NAMESPACE, "updatedAt");
    variableCount = node.getSharedPluginData(LEGACY_NAMESPACE, "variableCount");
  }
  if (!updatedAt) {
    return { exists: false };
  }
  return {
    exists: true,
    nodeId: node.id,
    updatedAt,
    variableCount: variableCount ? parseInt(variableCount, 10) : void 0
  };
}
function writeSyncMetadata(node, metadata) {
  node.setSharedPluginData(PLUGIN_NAMESPACE, "chunkCount", String(metadata.chunkCount));
  node.setSharedPluginData(PLUGIN_NAMESPACE, "updatedAt", metadata.updatedAt);
  node.setSharedPluginData(PLUGIN_NAMESPACE, "variableCount", String(metadata.variableCount));
}

// src/backend/sync/index.ts
async function syncToNode(exportData) {
  console.log("[Sync] Starting sync to node...");
  const variableCount = exportData && typeof exportData === "object" && "baseline" in exportData ? Object.keys(exportData.baseline).length : 0;
  console.log(`[Sync] Syncing ${variableCount} variables`);
  const chunked = chunkData(exportData);
  console.log(`[Sync] Split ${chunked.totalSize} bytes into ${chunked.chunkCount} chunks`);
  const node = await getOrCreateRegistryNode();
  console.log(`[Sync] Using registry node: ${node.id}`);
  clearNodeChunks(node, PLUGIN_NAMESPACE);
  saveChunksToNode(node, PLUGIN_NAMESPACE, chunked.chunks);
  const metadata = {
    chunkCount: chunked.chunkCount,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    variableCount
  };
  writeSyncMetadata(node, metadata);
  console.log(`[Sync] Successfully synced ${chunked.totalSize} bytes in ${chunked.chunkCount} chunks to node ${node.id}`);
  return {
    nodeId: node.id,
    variableCount
  };
}
async function getLastSyncInfo() {
  const node = await findRegistryNode();
  if (!node) {
    return { exists: false };
  }
  return readSyncMetadata(node);
}

// src/backend/handlers/message-router.ts
async function handleMessage(msg) {
  switch (msg.type) {
    case "get-last-sync":
      await handleGetLastSync();
      break;
    case "get-collections":
      await handleGetCollections();
      break;
    case "import-tokens":
      await handleImportTokens(msg.data.collections);
      break;
    case "export-baseline":
      await handleExportBaseline(msg.collectionIds);
      break;
    case "sync-to-node":
      await handleSyncToNode(msg.collectionIds);
      break;
    case "cancel":
      handleCancel();
      break;
    default:
      const _exhaustive = msg;
      console.warn("Unknown message type:", _exhaustive);
  }
}
function postMessage(msg) {
  figma.ui.postMessage(msg);
}
async function handleGetLastSync() {
  try {
    const syncInfo = await getLastSyncInfo();
    postMessage(__spreadValues({
      type: "last-sync-loaded"
    }, syncInfo));
  } catch (error) {
    console.error("Error loading last sync info:", error);
    postMessage({
      type: "last-sync-loaded",
      exists: false
    });
  }
}
async function handleGetCollections() {
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const allVariables = await figma.variables.getLocalVariablesAsync();
    const collectionData = collections.map((col) => ({
      id: col.id,
      name: col.name,
      modeCount: col.modes.length,
      variableCount: allVariables.filter((v) => v.variableCollectionId === col.id).length
    }));
    postMessage({
      type: "collections-loaded",
      collections: collectionData
    });
  } catch (error) {
    console.error("Error loading collections:", error);
  }
}
async function handleImportTokens(collections) {
  try {
    await importTokens(collections);
    postMessage({
      type: "import-complete",
      message: "Tokens imported successfully!"
    });
  } catch (error) {
    postMessage({
      type: "import-error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
async function handleExportBaseline(collectionIds) {
  try {
    console.log("Export baseline requested");
    figma.notify("Exporting baseline snapshot...");
    const filterIds = collectionIds && collectionIds.length > 0 ? collectionIds : null;
    const baseline = await exportBaseline(filterIds);
    const jsonString = JSON.stringify(baseline);
    console.log("Export complete, data size:", jsonString.length, "bytes");
    postMessage({
      type: "export-complete",
      data: baseline
    });
    figma.notify("Export complete!");
  } catch (error) {
    console.error("Export error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    postMessage({
      type: "export-error",
      message: errorMessage
    });
    figma.notify("Export failed: " + errorMessage, { error: true });
  }
}
async function handleSyncToNode(collectionIds) {
  try {
    console.log("Sync to Node requested");
    figma.notify("Syncing registry to node...");
    const filterIds = collectionIds && collectionIds.length > 0 ? collectionIds : null;
    const exportData = await exportBaseline(filterIds);
    const result = await syncToNode(exportData);
    postMessage({
      type: "sync-complete",
      nodeId: result.nodeId,
      variableCount: result.variableCount
    });
    figma.notify(`\u2713 Synced ${result.variableCount} variables to node!`);
  } catch (error) {
    console.error("Sync error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    postMessage({
      type: "sync-error",
      message: errorMessage
    });
    figma.notify("Sync failed: " + errorMessage, { error: true });
  }
}
function handleCancel() {
  figma.closePlugin();
}

// src/code.ts
figma.showUI(__html__, {
  width: 600,
  height: 700,
  themeColors: true
});
figma.ui.onmessage = async (msg) => {
  await handleMessage(msg);
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2JhY2tlbmQvaW1wb3J0L2NvbGxlY3Rpb24udHMiLCAic3JjL2JhY2tlbmQvdXRpbHMvdHlwZS1tYXBwZXJzLnRzIiwgInNyYy9iYWNrZW5kL3V0aWxzL3BhcnNlcnMudHMiLCAic3JjL2JhY2tlbmQvaW1wb3J0L3ZhcmlhYmxlLnRzIiwgInNyYy9iYWNrZW5kL2ltcG9ydC9hbGlhcy1yZXNvbHZlci50cyIsICJzcmMvYmFja2VuZC90eXBlLWluZmVyZW5jZS9wYXR0ZXJucy50cyIsICJzcmMvYmFja2VuZC90eXBlLWluZmVyZW5jZS9ydWxlcy50cyIsICJzcmMvYmFja2VuZC9pbXBvcnQvaW5kZXgudHMiLCAic3JjL2JhY2tlbmQvZXhwb3J0L3RyYW5zZm9ybWVyLnRzIiwgInNyYy9iYWNrZW5kL2V4cG9ydC9iYXNlbGluZS50cyIsICJzcmMvYmFja2VuZC9leHBvcnQvaW5kZXgudHMiLCAic3JjL2JhY2tlbmQvdXRpbHMvY29uc3RhbnRzLnRzIiwgInNyYy9iYWNrZW5kL3N5bmMvY2h1bmtlci50cyIsICJzcmMvYmFja2VuZC9zeW5jL25vZGUtbWFuYWdlci50cyIsICJzcmMvYmFja2VuZC9zeW5jL21ldGFkYXRhLnRzIiwgInNyYy9iYWNrZW5kL3N5bmMvaW5kZXgudHMiLCAic3JjL2JhY2tlbmQvaGFuZGxlcnMvbWVzc2FnZS1yb3V0ZXIudHMiLCAic3JjL2NvZGUudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogQ29sbGVjdGlvbiBtYW5hZ2VtZW50IGZvciB0b2tlbiBpbXBvcnRcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IENvbGxlY3Rpb25Db25maWcgfSBmcm9tICcuLi8uLi90eXBlcy9pbmRleC5qcyc7XG5cbi8qKlxuICogRmluZCBleGlzdGluZyBjb2xsZWN0aW9uIGJ5IG5hbWUgb3IgY3JlYXRlIGEgbmV3IG9uZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZE9yQ3JlYXRlQ29sbGVjdGlvbihuYW1lOiBzdHJpbmcpOiBQcm9taXNlPFZhcmlhYmxlQ29sbGVjdGlvbj4ge1xuICBjb25zdCBjb2xsZWN0aW9ucyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICBsZXQgY29sbGVjdGlvbiA9IGNvbGxlY3Rpb25zLmZpbmQoYyA9PiBjLm5hbWUgPT09IG5hbWUpO1xuXG4gIGlmICghY29sbGVjdGlvbikge1xuICAgIGNvbGxlY3Rpb24gPSBmaWdtYS52YXJpYWJsZXMuY3JlYXRlVmFyaWFibGVDb2xsZWN0aW9uKG5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIGNvbGxlY3Rpb247XG59XG5cbi8qKlxuICogU2V0dXAgbW9kZXMgZm9yIGEgY29sbGVjdGlvbiBiYXNlZCBvbiBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gY29sbGVjdGlvbiAtIFRoZSB2YXJpYWJsZSBjb2xsZWN0aW9uXG4gKiBAcGFyYW0gY29uZmlnIC0gQ29sbGVjdGlvbiBjb25maWd1cmF0aW9uXG4gKiBAcmV0dXJucyBNYXAgb2YgZmlsZSBuYW1lcyB0byBtb2RlIElEc1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBNb2RlcyhcbiAgY29sbGVjdGlvbjogVmFyaWFibGVDb2xsZWN0aW9uLFxuICBjb25maWc6IENvbGxlY3Rpb25Db25maWdcbik6IE1hcDxzdHJpbmcsIHN0cmluZz4ge1xuICBjb25zdCBmaWxlTW9kZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgaWYgKGNvbmZpZy5pc01vZGVDb2xsZWN0aW9uKSB7XG4gICAgLy8gRWFjaCBmaWxlIGlzIGEgc2VwYXJhdGUgbW9kZVxuICAgIGNvbnN0IGRlZmF1bHRNb2RlID0gY29sbGVjdGlvbi5tb2Rlc1swXTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29uZmlnLmZpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBmaWxlID0gY29uZmlnLmZpbGVzW2ldO1xuICAgICAgbGV0IG1vZGVJZDogc3RyaW5nO1xuXG4gICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICAvLyBSZW5hbWUgZGVmYXVsdCBtb2RlIHRvIGZpcnN0IGZpbGUgbmFtZVxuICAgICAgICBtb2RlSWQgPSBkZWZhdWx0TW9kZS5tb2RlSWQ7XG4gICAgICAgIGNvbGxlY3Rpb24ucmVuYW1lTW9kZShtb2RlSWQsIGZpbGUubmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBBZGQgbmV3IG1vZGUgZm9yIGVhY2ggYWRkaXRpb25hbCBmaWxlXG4gICAgICAgIG1vZGVJZCA9IGNvbGxlY3Rpb24uYWRkTW9kZShmaWxlLm5hbWUpO1xuICAgICAgfVxuXG4gICAgICBmaWxlTW9kZU1hcC5zZXQoZmlsZS5uYW1lLCBtb2RlSWQpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBTaW5nbGUgbW9kZSwgYWxsIGZpbGVzIG1lcmdlZFxuICAgIGNvbnN0IGRlZmF1bHRNb2RlID0gY29sbGVjdGlvbi5tb2Rlc1swXTtcbiAgICAvLyBNYXAgYWxsIGZpbGVzIHRvIHRoZSBkZWZhdWx0IG1vZGVcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgY29uZmlnLmZpbGVzKSB7XG4gICAgICBmaWxlTW9kZU1hcC5zZXQoZmlsZS5uYW1lLCBkZWZhdWx0TW9kZS5tb2RlSWQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmaWxlTW9kZU1hcDtcbn1cblxuLyoqXG4gKiBNZXJnZSB0b2tlbiBmaWxlcyBpbnRvIGEgc2luZ2xlIHRva2VuIG9iamVjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VUb2tlbkZpbGVzKGZpbGVzOiBBcnJheTx7IG5hbWU6IHN0cmluZzsgY29udGVudDogYW55IH0+KTogYW55IHtcbiAgY29uc3QgbWVyZ2VkID0ge307XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIE9iamVjdC5hc3NpZ24obWVyZ2VkLCBmaWxlLmNvbnRlbnQpO1xuICB9XG4gIHJldHVybiBtZXJnZWQ7XG59XG4iLCAiLyoqXG4gKiBUeXBlIGNvbnZlcnNpb24gdXRpbGl0aWVzIGJldHdlZW4gdG9rZW4gdHlwZXMgYW5kIEZpZ21hIHR5cGVzXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBUb2tlblR5cGUgfSBmcm9tICcuLi8uLi90eXBlcy9pbmRleC5qcyc7XG5cbi8qKlxuICogTWFwIHRva2VuIHR5cGUgdG8gRmlnbWEgdmFyaWFibGUgdHlwZVxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFwVG9rZW5UeXBlVG9GaWdtYVR5cGUodG9rZW5UeXBlOiBzdHJpbmcpOiBWYXJpYWJsZVJlc29sdmVkRGF0YVR5cGUge1xuICBjb25zdCB0eXBlTWFwOiBSZWNvcmQ8c3RyaW5nLCBWYXJpYWJsZVJlc29sdmVkRGF0YVR5cGU+ID0ge1xuICAgICdjb2xvcic6ICdDT0xPUicsXG4gICAgJ2RpbWVuc2lvbic6ICdGTE9BVCcsXG4gICAgJ3NwYWNpbmcnOiAnRkxPQVQnLFxuICAgICdmb250RmFtaWx5JzogJ1NUUklORycsXG4gICAgJ2ZvbnRXZWlnaHQnOiAnU1RSSU5HJyxcbiAgICAnZm9udFNpemUnOiAnRkxPQVQnLFxuICAgICdkdXJhdGlvbic6ICdTVFJJTkcnLFxuICAgICdzdHJpbmcnOiAnU1RSSU5HJyxcbiAgICAnbnVtYmVyJzogJ0ZMT0FUJyxcbiAgICAnYm9vbGVhbic6ICdCT09MRUFOJyxcbiAgICAnc2hhZG93JzogJ1NUUklORycsXG4gICAgJ2dyYWRpZW50JzogJ1NUUklORydcbiAgfTtcblxuICByZXR1cm4gdHlwZU1hcFt0b2tlblR5cGVdIHx8ICdTVFJJTkcnO1xufVxuXG4vKipcbiAqIE1hcCBGaWdtYSB2YXJpYWJsZSB0eXBlIHRvIHRva2VuIHR5cGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcEZpZ21hVHlwZVRvVG9rZW5UeXBlKGZpZ21hVHlwZTogVmFyaWFibGVSZXNvbHZlZERhdGFUeXBlKTogVG9rZW5UeXBlIHtcbiAgY29uc3QgdHlwZU1hcDogUmVjb3JkPFZhcmlhYmxlUmVzb2x2ZWREYXRhVHlwZSwgVG9rZW5UeXBlPiA9IHtcbiAgICAnQ09MT1InOiAnY29sb3InLFxuICAgICdGTE9BVCc6ICdudW1iZXInLFxuICAgICdTVFJJTkcnOiAnc3RyaW5nJyxcbiAgICAnQk9PTEVBTic6ICdib29sZWFuJ1xuICB9O1xuICByZXR1cm4gdHlwZU1hcFtmaWdtYVR5cGVdIHx8ICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIEdldCBkZWZhdWx0IHZhbHVlIGZvciBhIGdpdmVuIEZpZ21hIHR5cGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRWYWx1ZUZvclR5cGUodHlwZTogVmFyaWFibGVSZXNvbHZlZERhdGFUeXBlKTogYW55IHtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAnQ09MT1InOlxuICAgICAgcmV0dXJuIHsgcjogMCwgZzogMCwgYjogMCB9OyAvLyBCbGFja1xuICAgIGNhc2UgJ0ZMT0FUJzpcbiAgICAgIHJldHVybiAwO1xuICAgIGNhc2UgJ1NUUklORyc6XG4gICAgICByZXR1cm4gJyc7XG4gICAgY2FzZSAnQk9PTEVBTic6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iLCAiLyoqXG4gKiBWYWx1ZSBwYXJzaW5nIHV0aWxpdGllcyBmb3IgZGlmZmVyZW50IHRva2VuIHR5cGVzXG4gKi9cblxuLyoqXG4gKiBQYXJzZSBoZXggY29sb3Igc3RyaW5nIHRvIFJHQiBvYmplY3RcbiAqIFN1cHBvcnRzICNSUkdHQkIgZm9ybWF0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNvbG9yKHZhbHVlOiBzdHJpbmcpOiBSR0IgfCBudWxsIHtcbiAgaWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSByZXR1cm4gbnVsbDtcblxuICAvLyBIYW5kbGUgaGV4IGNvbG9yc1xuICBpZiAodmFsdWUuc3RhcnRzV2l0aCgnIycpKSB7XG4gICAgY29uc3QgaGV4ID0gdmFsdWUucmVwbGFjZSgnIycsICcnKTtcblxuICAgIGlmIChoZXgubGVuZ3RoID09PSA2KSB7XG4gICAgICBjb25zdCByID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygwLCAyKSwgMTYpIC8gMjU1O1xuICAgICAgY29uc3QgZyA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoMiwgNCksIDE2KSAvIDI1NTtcbiAgICAgIGNvbnN0IGIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDQsIDYpLCAxNikgLyAyNTU7XG4gICAgICByZXR1cm4geyByLCBnLCBiIH07XG4gICAgfVxuICB9XG5cbiAgLy8gSGFuZGxlIHJnYmFcbiAgaWYgKHZhbHVlLnN0YXJ0c1dpdGgoJ3JnYmEnKSkge1xuICAgIGNvbnN0IG1hdGNoID0gdmFsdWUubWF0Y2goL3JnYmFcXCgoXFxkKyksXFxzKihcXGQrKSxcXHMqKFxcZCspLFxccyooW1xcZC5dKylcXCkvKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHI6IHBhcnNlSW50KG1hdGNoWzFdKSAvIDI1NSxcbiAgICAgICAgZzogcGFyc2VJbnQobWF0Y2hbMl0pIC8gMjU1LFxuICAgICAgICBiOiBwYXJzZUludChtYXRjaFszXSkgLyAyNTVcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogUGFyc2UgbnVtYmVyIHZhbHVlLCBzdHJpcHBpbmcgdW5pdHNcbiAqIFN1cHBvcnRzIG51bWVyaWMgdmFsdWVzIGFuZCBzdHJpbmdzIHdpdGggdW5pdHMgKHB4LCByZW0sIGVtLCBldGMuKVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VOdW1iZXIodmFsdWU6IGFueSk6IG51bWJlciB8IG51bGwge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykgcmV0dXJuIHZhbHVlO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIC8vIFJlbW92ZSB1bml0cyAocHgsIHJlbSwgZW0sIGV0Yy4pXG4gICAgY29uc3QgbnVtID0gcGFyc2VGbG9hdCh2YWx1ZS5yZXBsYWNlKC9bYS16JV0rJC9pLCAnJykpO1xuICAgIHJldHVybiBpc05hTihudW0pID8gbnVsbCA6IG51bTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBQYXJzZSBmb250IHdlaWdodCB2YWx1ZVxuICogTWFwcyBudW1lcmljIHdlaWdodHMgdG8gbmFtZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRm9udFdlaWdodCh2YWx1ZTogYW55KTogc3RyaW5nIHtcbiAgY29uc3Qgd2VpZ2h0TWFwOiBSZWNvcmQ8bnVtYmVyLCBzdHJpbmc+ID0ge1xuICAgIDEwMDogJ1RoaW4nLFxuICAgIDIwMDogJ0V4dHJhIExpZ2h0JyxcbiAgICAzMDA6ICdMaWdodCcsXG4gICAgNDAwOiAnUmVndWxhcicsXG4gICAgNTAwOiAnTWVkaXVtJyxcbiAgICA2MDA6ICdTZW1pIEJvbGQnLFxuICAgIDcwMDogJ0JvbGQnLFxuICAgIDgwMDogJ0V4dHJhIEJvbGQnLFxuICAgIDkwMDogJ0JsYWNrJ1xuICB9O1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIHdlaWdodE1hcFt2YWx1ZV0gfHwgdmFsdWUudG9TdHJpbmcoKTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xufVxuXG4vKipcbiAqIENvbnZlcnQgUkdCIHRvIGhleCBjb2xvciBzdHJpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJnYlRvSGV4KGNvbG9yOiBSR0IgfCBSR0JBKTogc3RyaW5nIHtcbiAgY29uc3QgdG9IZXggPSAodmFsdWU6IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IGhleCA9IE1hdGgucm91bmQodmFsdWUgKiAyNTUpLnRvU3RyaW5nKDE2KTtcbiAgICByZXR1cm4gaGV4Lmxlbmd0aCA9PT0gMSA/ICcwJyArIGhleCA6IGhleDtcbiAgfTtcbiAgcmV0dXJuIGAjJHt0b0hleChjb2xvci5yKX0ke3RvSGV4KGNvbG9yLmcpfSR7dG9IZXgoY29sb3IuYil9YDtcbn1cbiIsICIvKipcbiAqIFZhcmlhYmxlIG1hbmFnZW1lbnQgZm9yIHRva2VuIGltcG9ydFxuICogQ3JlYXRlcyBhbmQgdXBkYXRlcyBGaWdtYSB2YXJpYWJsZXMgd2l0aCB0b2tlbiB2YWx1ZXNcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IE5vcm1hbGl6ZWRUb2tlbiB9IGZyb20gJy4uLy4uL3R5cGVzL2luZGV4LmpzJztcbmltcG9ydCB7IG1hcFRva2VuVHlwZVRvRmlnbWFUeXBlLCBnZXREZWZhdWx0VmFsdWVGb3JUeXBlIH0gZnJvbSAnLi4vdXRpbHMvdHlwZS1tYXBwZXJzLmpzJztcbmltcG9ydCB7IHBhcnNlQ29sb3IsIHBhcnNlTnVtYmVyLCBwYXJzZUZvbnRXZWlnaHQgfSBmcm9tICcuLi91dGlscy9wYXJzZXJzLmpzJztcblxuLyoqXG4gKiBDYWxsYmFjayB0byByZWdpc3RlciBhbGlhcyByZWZlcmVuY2VzIGR1cmluZyB2YXJpYWJsZSBjcmVhdGlvblxuICovXG5leHBvcnQgdHlwZSBBbGlhc0NhbGxiYWNrID0gKHZhcmlhYmxlOiBWYXJpYWJsZSwgbW9kZUlkOiBzdHJpbmcsIGFsaWFzUGF0aDogc3RyaW5nKSA9PiB2b2lkO1xuXG4vKipcbiAqIENyZWF0ZSBvciB1cGRhdGUgYSBGaWdtYSB2YXJpYWJsZSBmb3IgYSB0b2tlblxuICogQHBhcmFtIGNvbGxlY3Rpb24gLSBUaGUgdmFyaWFibGUgY29sbGVjdGlvblxuICogQHBhcmFtIG1vZGVJZCAtIFRoZSBtb2RlIElEIHRvIHNldCB0aGUgdmFsdWUgZm9yXG4gKiBAcGFyYW0gcGF0aCAtIFRoZSB0b2tlbiBwYXRoIChiZWNvbWVzIHZhcmlhYmxlIG5hbWUpXG4gKiBAcGFyYW0gdG9rZW4gLSBUaGUgbm9ybWFsaXplZCB0b2tlbiBkYXRhXG4gKiBAcGFyYW0gb25BbGlhcyAtIE9wdGlvbmFsIGNhbGxiYWNrIGZvciBhbGlhcyByZWZlcmVuY2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVPclVwZGF0ZVZhcmlhYmxlKFxuICBjb2xsZWN0aW9uOiBWYXJpYWJsZUNvbGxlY3Rpb24sXG4gIG1vZGVJZDogc3RyaW5nLFxuICBwYXRoOiBzdHJpbmcsXG4gIHRva2VuOiBOb3JtYWxpemVkVG9rZW4sXG4gIG9uQWxpYXM/OiBBbGlhc0NhbGxiYWNrXG4pOiBQcm9taXNlPFZhcmlhYmxlPiB7XG4gIGNvbnN0IHZhcmlhYmxlTmFtZSA9IHBhdGg7XG5cbiAgLy8gRmluZCBleGlzdGluZyB2YXJpYWJsZSBvciBjcmVhdGUgbmV3XG4gIGNvbnN0IHZhcmlhYmxlcyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlc0FzeW5jKCk7XG4gIGxldCB2YXJpYWJsZSA9IHZhcmlhYmxlcy5maW5kKFxuICAgIHYgPT4gdi5uYW1lID09PSB2YXJpYWJsZU5hbWUgJiYgdi52YXJpYWJsZUNvbGxlY3Rpb25JZCA9PT0gY29sbGVjdGlvbi5pZFxuICApO1xuXG4gIGlmICghdmFyaWFibGUpIHtcbiAgICBjb25zdCByZXNvbHZlZFR5cGUgPSBtYXBUb2tlblR5cGVUb0ZpZ21hVHlwZSh0b2tlbi50eXBlKTtcbiAgICB2YXJpYWJsZSA9IGZpZ21hLnZhcmlhYmxlcy5jcmVhdGVWYXJpYWJsZSh2YXJpYWJsZU5hbWUsIGNvbGxlY3Rpb24sIHJlc29sdmVkVHlwZSk7XG4gIH1cblxuICAvLyBTZXQgZGVzY3JpcHRpb24gaWYgcHJvdmlkZWRcbiAgaWYgKHRva2VuLmRlc2NyaXB0aW9uKSB7XG4gICAgdmFyaWFibGUuZGVzY3JpcHRpb24gPSB0b2tlbi5kZXNjcmlwdGlvbjtcbiAgfVxuXG4gIC8vIFBhcnNlIGFuZCBzZXQgdmFsdWVcbiAgY29uc3QgcmVzb2x2ZWRWYWx1ZSA9IHBhcnNlVG9rZW5WYWx1ZSh0b2tlbi52YWx1ZSwgdG9rZW4udHlwZSwgdmFyaWFibGUsIG1vZGVJZCwgb25BbGlhcyk7XG5cbiAgaWYgKHJlc29sdmVkVmFsdWUgIT09IG51bGwpIHtcbiAgICB0cnkge1xuICAgICAgdmFyaWFibGUuc2V0VmFsdWVGb3JNb2RlKG1vZGVJZCwgcmVzb2x2ZWRWYWx1ZSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBzZXQgdmFsdWUgZm9yICR7cGF0aH06YCwgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFR5cGU6ICR7dG9rZW4udHlwZX0sIFZhbHVlOiAke3Rva2VuLnZhbHVlfSwgUmVzb2x2ZWQ6ICR7SlNPTi5zdHJpbmdpZnkocmVzb2x2ZWRWYWx1ZSl9YCk7XG5cbiAgICAgIC8vIFNldCBhIGRlZmF1bHQgdmFsdWUgYmFzZWQgb24gdHlwZVxuICAgICAgY29uc3QgZGVmYXVsdFZhbHVlID0gZ2V0RGVmYXVsdFZhbHVlRm9yVHlwZSh2YXJpYWJsZS5yZXNvbHZlZFR5cGUpO1xuICAgICAgaWYgKGRlZmF1bHRWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICB2YXJpYWJsZS5zZXRWYWx1ZUZvck1vZGUobW9kZUlkLCBkZWZhdWx0VmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBGb3IgYWxpYXNlcywgc2V0IGEgdGVtcG9yYXJ5IGRlZmF1bHQgdmFsdWVcbiAgICBjb25zdCBkZWZhdWx0VmFsdWUgPSBnZXREZWZhdWx0VmFsdWVGb3JUeXBlKHZhcmlhYmxlLnJlc29sdmVkVHlwZSk7XG4gICAgaWYgKGRlZmF1bHRWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgdmFyaWFibGUuc2V0VmFsdWVGb3JNb2RlKG1vZGVJZCwgZGVmYXVsdFZhbHVlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFyaWFibGU7XG59XG5cbi8qKlxuICogUGFyc2UgdG9rZW4gdmFsdWUgYmFzZWQgb24gdHlwZVxuICogRGV0ZWN0cyBhbGlhcyByZWZlcmVuY2VzIGFuZCBkZWxlZ2F0ZXMgdG8gdHlwZS1zcGVjaWZpYyBwYXJzZXJzXG4gKiBAcmV0dXJucyBQYXJzZWQgdmFsdWUgb3IgbnVsbCBpZiBhbGlhcyByZWZlcmVuY2VcbiAqL1xuZnVuY3Rpb24gcGFyc2VUb2tlblZhbHVlKFxuICB2YWx1ZTogYW55LFxuICB0eXBlOiBzdHJpbmcsXG4gIHZhcmlhYmxlPzogVmFyaWFibGUsXG4gIG1vZGVJZD86IHN0cmluZyxcbiAgb25BbGlhcz86IEFsaWFzQ2FsbGJhY2tcbik6IGFueSB7XG4gIC8vIENoZWNrIGlmIHZhbHVlIGNvbnRhaW5zIGFsaWFzIHJlZmVyZW5jZXNcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWUuaW5jbHVkZXMoJ3snKSkge1xuICAgIC8vIENoZWNrIGlmIGl0J3MgYSBzaW5nbGUgYWxpYXM6IFwie3BhdGgudG8udG9rZW59XCJcbiAgICBpZiAodmFsdWUuc3RhcnRzV2l0aCgneycpICYmIHZhbHVlLmVuZHNXaXRoKCd9JykgJiYgdmFsdWUuaW5kZXhPZignfScpID09PSB2YWx1ZS5sZW5ndGggLSAxKSB7XG4gICAgICAvLyBTaW5nbGUgYWxpYXMgLSBzdG9yZSBmb3IgcmVzb2x1dGlvblxuICAgICAgaWYgKHZhcmlhYmxlICYmIG1vZGVJZCAmJiBvbkFsaWFzKSB7XG4gICAgICAgIG9uQWxpYXModmFyaWFibGUsIG1vZGVJZCwgdmFsdWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE11bHRpcGxlIGFsaWFzZXMgb3IgbWl4ZWQgY29udGVudCAoZS5nLiwgXCJ7c3BhY2UuMX0ge3NwYWNlLjN9XCIpXG4gICAgICAvLyBGaWdtYSBkb2Vzbid0IHN1cHBvcnQgbXVsdGktYWxpYXMsIHNvIGtlZXAgYXMgc3RyaW5nXG4gICAgICByZXR1cm4gU3RyaW5nKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICAvLyBQYXJzZSBiYXNlZCBvbiB0eXBlXG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgJ2NvbG9yJzpcbiAgICAgIHJldHVybiBwYXJzZUNvbG9yKHZhbHVlKTtcblxuICAgIGNhc2UgJ2RpbWVuc2lvbic6XG4gICAgY2FzZSAnc3BhY2luZyc6XG4gICAgY2FzZSAnZm9udFNpemUnOlxuICAgIGNhc2UgJ251bWJlcic6XG4gICAgICByZXR1cm4gcGFyc2VOdW1iZXIodmFsdWUpO1xuXG4gICAgY2FzZSAnZm9udFdlaWdodCc6XG4gICAgICByZXR1cm4gcGFyc2VGb250V2VpZ2h0KHZhbHVlKTtcblxuICAgIGNhc2UgJ2ZvbnRGYW1pbHknOlxuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgY2FzZSAnc2hhZG93JzpcbiAgICBjYXNlICdncmFkaWVudCc6XG4gICAgY2FzZSAnZHVyYXRpb24nOlxuICAgICAgcmV0dXJuIFN0cmluZyh2YWx1ZSk7XG5cbiAgICBjYXNlICdib29sZWFuJzpcbiAgICAgIHJldHVybiBCb29sZWFuKHZhbHVlKTtcblxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBSZXR1cm4gc3RyaW5nIGZvciB1bmtub3duIHR5cGVzXG4gICAgICByZXR1cm4gU3RyaW5nKHZhbHVlKTtcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrIGlmIGFuIG9iamVjdCBpcyBhIHRva2VuIHZhbHVlIChsZWFmIG5vZGUpXG4gKiBTdXBwb3J0cyBXM0MgZm9ybWF0ICgkdmFsdWUvJHR5cGUpIGFuZCBsZWdhY3kgZm9ybWF0ICh2YWx1ZS90eXBlKVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUb2tlblZhbHVlKG9iajogYW55KTogYm9vbGVhbiB7XG4gIHJldHVybiBvYmogJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiZcbiAgICAoKCckdmFsdWUnIGluIG9iaikgfHwgKCd2YWx1ZScgaW4gb2JqICYmICFoYXNOZXN0ZWRUb2tlbnMob2JqKSkpO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIG9iamVjdCBoYXMgbmVzdGVkIHRva2VuIG9iamVjdHNcbiAqL1xuZnVuY3Rpb24gaGFzTmVzdGVkVG9rZW5zKG9iajogYW55KTogYm9vbGVhbiB7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG9iaikpIHtcbiAgICBpZiAoa2V5ID09PSAndmFsdWUnIHx8IGtleSA9PT0gJ3R5cGUnIHx8IGtleSA9PT0gJ2Rlc2NyaXB0aW9uJyB8fFxuICAgICAgICBrZXkgPT09ICckdmFsdWUnIHx8IGtleSA9PT0gJyR0eXBlJyB8fCBrZXkgPT09ICckZGVzY3JpcHRpb24nKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgLy8gSWYgdGhlcmUncyBhbnkgb3RoZXIga2V5LCB0aGlzIG1pZ2h0IGJlIGEgY29udGFpbmVyXG4gICAgY29uc3QgbmVzdGVkID0gb2JqW2tleV07XG4gICAgaWYgKG5lc3RlZCAmJiB0eXBlb2YgbmVzdGVkID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBOb3JtYWxpemUgdG9rZW4gdG8gaW50ZXJuYWwgZm9ybWF0XG4gKiBDb252ZXJ0cyBXM0MgZm9ybWF0ICgkdmFsdWUvJHR5cGUpIHRvIGludGVybmFsIGZvcm1hdFxuICogQHBhcmFtIG9iaiAtIFJhdyB0b2tlbiBvYmplY3RcbiAqIEBwYXJhbSBwYXRoIC0gVG9rZW4gcGF0aCBmb3IgdHlwZSBpbmZlcmVuY2VcbiAqIEBwYXJhbSBpbmZlclR5cGUgLSBGdW5jdGlvbiB0byBpbmZlciB0eXBlIGZyb20gcGF0aCBpZiBub3Qgc3BlY2lmaWVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVUb2tlbihcbiAgb2JqOiBhbnksXG4gIHBhdGg6IHN0cmluZyxcbiAgaW5mZXJUeXBlOiAocGF0aDogc3RyaW5nKSA9PiBzdHJpbmdcbik6IE5vcm1hbGl6ZWRUb2tlbiB7XG4gIGNvbnN0IGV4cGxpY2l0VHlwZSA9IG9iai4kdHlwZSA/PyBvYmoudHlwZTtcbiAgY29uc3QgaW5mZXJyZWRUeXBlID0gZXhwbGljaXRUeXBlIHx8IGluZmVyVHlwZShwYXRoKTtcblxuICByZXR1cm4ge1xuICAgIHZhbHVlOiBvYmouJHZhbHVlID8/IG9iai52YWx1ZSxcbiAgICB0eXBlOiBpbmZlcnJlZFR5cGUgYXMgYW55LFxuICAgIGRlc2NyaXB0aW9uOiBvYmouJGRlc2NyaXB0aW9uID8/IG9iai5kZXNjcmlwdGlvblxuICB9O1xufVxuIiwgIi8qKlxuICogQWxpYXMgcmVzb2x1dGlvbiBzeXN0ZW0gZm9yIHRva2VuIGltcG9ydHNcbiAqIE1hbmFnZXMgdHdvLXBhc3MgaW1wb3J0OiBjcmVhdGUgdmFyaWFibGVzIGZpcnN0LCB0aGVuIHJlc29sdmUgYWxpYXMgcmVmZXJlbmNlc1xuICovXG5cbi8qKlxuICogQWxpYXMgcmVmZXJlbmNlIHRvIHJlc29sdmUgaW4gcGFzcyAyXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWxpYXNSZWZlcmVuY2Uge1xuICB2YXJpYWJsZTogVmFyaWFibGU7XG4gIG1vZGVJZDogc3RyaW5nO1xuICBhbGlhc1BhdGg6IHN0cmluZzsgLy8gRm9ybWF0OiBcIntwYXRoLnRvLnRva2VufVwiXG59XG5cbi8qKlxuICogQWxpYXMgcmVzb2x2ZXIgbWFuYWdlcyBhbGlhcyByZWZlcmVuY2VzIGFuZCByZXNvbHZlcyB0aGVtIGFmdGVyIGFsbCB2YXJpYWJsZXMgYXJlIGNyZWF0ZWRcbiAqL1xuZXhwb3J0IGNsYXNzIEFsaWFzUmVzb2x2ZXIge1xuICBwcml2YXRlIHJlZmVyZW5jZXM6IEFsaWFzUmVmZXJlbmNlW10gPSBbXTtcblxuICAvKipcbiAgICogUmVnaXN0ZXIgYW4gYWxpYXMgcmVmZXJlbmNlIGZvciBsYXRlciByZXNvbHV0aW9uXG4gICAqL1xuICByZWdpc3RlckFsaWFzKHZhcmlhYmxlOiBWYXJpYWJsZSwgbW9kZUlkOiBzdHJpbmcsIGFsaWFzUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5yZWZlcmVuY2VzLnB1c2goe1xuICAgICAgdmFyaWFibGUsXG4gICAgICBtb2RlSWQsXG4gICAgICBhbGlhc1BhdGhcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGFsbCByZWdpc3RlcmVkIGFsaWFzZXNcbiAgICogQHJldHVybnMgU3VtbWFyeSBvZiByZXNvbHV0aW9uIHJlc3VsdHNcbiAgICovXG4gIGFzeW5jIHJlc29sdmVBbGwoKTogUHJvbWlzZTx7IHJlc29sdmVkOiBudW1iZXI7IGZhaWxlZDogbnVtYmVyOyB3YXJuaW5nczogc3RyaW5nW10gfT4ge1xuICAgIGNvbnN0IHdhcm5pbmdzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCByZXNvbHZlZCA9IDA7XG4gICAgbGV0IGZhaWxlZCA9IDA7XG5cbiAgICAvLyBCdWlsZCB2YXJpYWJsZSBsb29rdXAgbWFwXG4gICAgY29uc3QgYWxsVmFyaWFibGVzID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldExvY2FsVmFyaWFibGVzQXN5bmMoKTtcbiAgICBjb25zdCB2YXJpYWJsZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBWYXJpYWJsZT4oKTtcbiAgICBmb3IgKGNvbnN0IHZhcmlhYmxlIG9mIGFsbFZhcmlhYmxlcykge1xuICAgICAgdmFyaWFibGVNYXAuc2V0KHZhcmlhYmxlLm5hbWUsIHZhcmlhYmxlKTtcbiAgICB9XG5cbiAgICAvLyBSZXNvbHZlIGVhY2ggYWxpYXNcbiAgICBmb3IgKGNvbnN0IHJlZiBvZiB0aGlzLnJlZmVyZW5jZXMpIHtcbiAgICAgIC8vIFBhcnNlIGFsaWFzIHBhdGg6IFwie3BhdGgudG8udG9rZW59XCIgLT4gXCJwYXRoL3RvL3Rva2VuXCJcbiAgICAgIGNvbnN0IGFsaWFzUGF0aCA9IHJlZi5hbGlhc1BhdGhcbiAgICAgICAgLnJlcGxhY2UoL157LywgJycpXG4gICAgICAgIC5yZXBsYWNlKC99JC8sICcnKVxuICAgICAgICAucmVwbGFjZSgvXFwuL2csICcvJyk7XG5cbiAgICAgIGNvbnN0IHRhcmdldFZhcmlhYmxlID0gdmFyaWFibGVNYXAuZ2V0KGFsaWFzUGF0aCk7XG5cbiAgICAgIGlmICh0YXJnZXRWYXJpYWJsZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIENyZWF0ZSBhbGlhcyByZWZlcmVuY2VcbiAgICAgICAgICByZWYudmFyaWFibGUuc2V0VmFsdWVGb3JNb2RlKHJlZi5tb2RlSWQsIHtcbiAgICAgICAgICAgIHR5cGU6ICdWQVJJQUJMRV9BTElBUycsXG4gICAgICAgICAgICBpZDogdGFyZ2V0VmFyaWFibGUuaWRcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlZCsrO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgRmFpbGVkIHRvIGNyZWF0ZSBhbGlhcyAke3JlZi52YXJpYWJsZS5uYW1lfSAtPiAke2FsaWFzUGF0aH06ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWA7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihtZXNzYWdlKTtcbiAgICAgICAgICB3YXJuaW5ncy5wdXNoKG1lc3NhZ2UpO1xuICAgICAgICAgIGZhaWxlZCsrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gYEFsaWFzIHRhcmdldCBub3QgZm91bmQ6ICR7YWxpYXNQYXRofSAocmVmZXJlbmNlZCBieSAke3JlZi52YXJpYWJsZS5uYW1lfSlgO1xuICAgICAgICBjb25zb2xlLndhcm4obWVzc2FnZSk7XG4gICAgICAgIHdhcm5pbmdzLnB1c2gobWVzc2FnZSk7XG4gICAgICAgIGZhaWxlZCsrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7IHJlc29sdmVkLCBmYWlsZWQsIHdhcm5pbmdzIH07XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXIgYWxsIHN0b3JlZCBhbGlhcyByZWZlcmVuY2VzXG4gICAqL1xuICBjbGVhcigpOiB2b2lkIHtcbiAgICB0aGlzLnJlZmVyZW5jZXMubGVuZ3RoID0gMDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY291bnQgb2YgcGVuZGluZyBhbGlhcyByZWZlcmVuY2VzXG4gICAqL1xuICBnZXRQZW5kaW5nQ291bnQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5yZWZlcmVuY2VzLmxlbmd0aDtcbiAgfVxufVxuIiwgIi8qKlxuICogVHlwZSBpbmZlcmVuY2UgcGF0dGVybnMgZm9yIHRva2VuIHBhdGggYW5hbHlzaXNcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFRva2VuVHlwZSB9IGZyb20gJy4uLy4uL3R5cGVzL2luZGV4LmpzJztcblxuLyoqXG4gKiBQYXR0ZXJuIGRlZmluaXRpb24gZm9yIHR5cGUgaW5mZXJlbmNlXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZVBhdHRlcm4ge1xuICAvKiogS2V5d29yZHMgdG8gbWF0Y2ggKGNhc2UtaW5zZW5zaXRpdmUpICovXG4gIGtleXdvcmRzOiBzdHJpbmdbXTtcbiAgLyoqIEJhc2UgdG9rZW4gdHlwZSB0aGlzIHBhdHRlcm4gaW5mZXJzICovXG4gIHR5cGU6IFRva2VuVHlwZTtcbiAgLyoqIFByaW9yaXR5IChoaWdoZXIgPSBjaGVja2VkIGZpcnN0KSAqL1xuICBwcmlvcml0eTogbnVtYmVyO1xuICAvKiogT3B0aW9uYWwgcmVmaW5lbWVudCBmdW5jdGlvbiAqL1xuICByZWZpbmU/OiAocGF0aDogc3RyaW5nKSA9PiBUb2tlblR5cGU7XG59XG5cbi8qKlxuICogVHlwZSBpbmZlcmVuY2UgcGF0dGVybnMgb3JkZXJlZCBieSBwcmlvcml0eVxuICovXG5leHBvcnQgY29uc3QgVFlQRV9QQVRURVJOUzogVHlwZVBhdHRlcm5bXSA9IFtcbiAgLy8gRm9udC1yZWxhdGVkIHBhdHRlcm5zIChuZWVkIHJlZmluZW1lbnQgYmFzZWQgb24gY29udGV4dClcbiAge1xuICAgIGtleXdvcmRzOiBbJ2ZvbnQnLCAndHlwb2dyYXBoeSddLFxuICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgIHByaW9yaXR5OiAxMDAsXG4gICAgcmVmaW5lOiAocGF0aDogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBsb3dlciA9IHBhdGgudG9Mb3dlckNhc2UoKTtcbiAgICAgIGlmIChsb3dlci5pbmNsdWRlcygnc2l6ZScpKSByZXR1cm4gJ2RpbWVuc2lvbic7XG4gICAgICBpZiAobG93ZXIuaW5jbHVkZXMoJ3dlaWdodCcpKSByZXR1cm4gJ2ZvbnRXZWlnaHQnO1xuICAgICAgaWYgKGxvd2VyLmluY2x1ZGVzKCdmYW1pbHknKSkgcmV0dXJuICdmb250RmFtaWx5JztcbiAgICAgIGlmIChsb3dlci5pbmNsdWRlcygnbGluZWhlaWdodCcpIHx8IGxvd2VyLmluY2x1ZGVzKCdsaW5lLWhlaWdodCcpKSByZXR1cm4gJ251bWJlcic7XG4gICAgICByZXR1cm4gJ3N0cmluZyc7XG4gICAgfVxuICB9LFxuXG4gIC8vIENvbG9yIHBhdHRlcm5zXG4gIHtcbiAgICBrZXl3b3JkczogWydjb2xvcicsICdjb2xvcnMnLCAnY29sb3VycyddLFxuICAgIHR5cGU6ICdjb2xvcicsXG4gICAgcHJpb3JpdHk6IDkwXG4gIH0sXG5cbiAgLy8gRGltZW5zaW9uIHBhdHRlcm5zXG4gIHtcbiAgICBrZXl3b3JkczogWydzcGFjaW5nJywgJ3NwYWNlJywgJ3NpemUnLCAncmFkaXVzJywgJ2JvcmRlcnJhZGl1cycsICdib3JkZXItcmFkaXVzJ10sXG4gICAgdHlwZTogJ2RpbWVuc2lvbicsXG4gICAgcHJpb3JpdHk6IDg1XG4gIH0sXG5cbiAgLy8gU2hhZG93IHBhdHRlcm5zXG4gIHtcbiAgICBrZXl3b3JkczogWydzaGFkb3cnLCAnYm94c2hhZG93J10sXG4gICAgdHlwZTogJ3NoYWRvdycsXG4gICAgcHJpb3JpdHk6IDgwXG4gIH0sXG5cbiAgLy8gTnVtYmVyIHBhdHRlcm5zXG4gIHtcbiAgICBrZXl3b3JkczogWydvcGFjaXR5JywgJ3ppbmRleCcsICd6LWluZGV4J10sXG4gICAgdHlwZTogJ251bWJlcicsXG4gICAgcHJpb3JpdHk6IDc1XG4gIH0sXG5cbiAgLy8gU2VtYW50aWMgcGF0dGVybnNcbiAge1xuICAgIGtleXdvcmRzOiBbJ2JyYW5kJywgJ3NlbWFudGljJywgJ2NvbXBvbmVudCcsICdiYWNrZ3JvdW5kJywgJ2ZvcmVncm91bmQnLCAnYm9yZGVyJywgJ2ZpbGwnLCAnc3Ryb2tlJ10sXG4gICAgdHlwZTogJ2NvbG9yJyxcbiAgICBwcmlvcml0eTogNzBcbiAgfSxcblxuICAvLyBMYXlvdXQgcGF0dGVybnNcbiAge1xuICAgIGtleXdvcmRzOiBbJ2dhcCcsICdwYWRkaW5nJywgJ21hcmdpbiddLFxuICAgIHR5cGU6ICdkaW1lbnNpb24nLFxuICAgIHByaW9yaXR5OiA2NVxuICB9LFxuXG4gIC8vIEFuaW1hdGlvbiBwYXR0ZXJuc1xuICB7XG4gICAga2V5d29yZHM6IFsndHJhbnNpdGlvbicsICdhbmltYXRpb24nLCAnYnJlYWtwb2ludCddLFxuICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgIHByaW9yaXR5OiA2MFxuICB9XG5dO1xuIiwgIi8qKlxuICogVHlwZSBpbmZlcmVuY2UgcnVsZSBlbmdpbmVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFRva2VuVHlwZSB9IGZyb20gJy4uLy4uL3R5cGVzL2luZGV4LmpzJztcbmltcG9ydCB7IFRZUEVfUEFUVEVSTlMgfSBmcm9tICcuL3BhdHRlcm5zLmpzJztcblxuLyoqXG4gKiBJbmZlciB0b2tlbiB0eXBlIGZyb20gcGF0aCB1c2luZyBwYXR0ZXJuIG1hdGNoaW5nXG4gKiBAcGFyYW0gcGF0aCAtIFRva2VuIHBhdGggKGUuZy4sICdjb2xvcnMvcHJpbWFyeScsICdzcGFjaW5nL3NtYWxsJylcbiAqIEByZXR1cm5zIEluZmVycmVkIHRva2VuIHR5cGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluZmVyVHlwZUZyb21QYXRoKHBhdGg6IHN0cmluZyk6IFRva2VuVHlwZSB7XG4gIGNvbnN0IGxvd2VyUGF0aCA9IHBhdGgudG9Mb3dlckNhc2UoKTtcbiAgY29uc3Qgc2VnbWVudHMgPSBsb3dlclBhdGguc3BsaXQoJy8nKTtcbiAgY29uc3QgZmlyc3RTZWdtZW50ID0gc2VnbWVudHNbMF07XG5cbiAgLy8gVHJ5IHBhdHRlcm5zIGluIHByaW9yaXR5IG9yZGVyXG4gIGZvciAoY29uc3QgcGF0dGVybiBvZiBUWVBFX1BBVFRFUk5TKSB7XG4gICAgLy8gQ2hlY2sgaWYgYW55IGtleXdvcmQgbWF0Y2hlcyB0aGUgZmlyc3Qgc2VnbWVudFxuICAgIGlmIChwYXR0ZXJuLmtleXdvcmRzLmluY2x1ZGVzKGZpcnN0U2VnbWVudCkpIHtcbiAgICAgIC8vIEFwcGx5IHJlZmluZW1lbnQgaWYgYXZhaWxhYmxlXG4gICAgICBpZiAocGF0dGVybi5yZWZpbmUpIHtcbiAgICAgICAgcmV0dXJuIHBhdHRlcm4ucmVmaW5lKGxvd2VyUGF0aCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcGF0dGVybi50eXBlO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGFueSBrZXl3b3JkIGFwcGVhcnMgYW55d2hlcmUgaW4gcGF0aFxuICAgIGZvciAoY29uc3Qga2V5d29yZCBvZiBwYXR0ZXJuLmtleXdvcmRzKSB7XG4gICAgICBpZiAobG93ZXJQYXRoLmluY2x1ZGVzKGtleXdvcmQpKSB7XG4gICAgICAgIC8vIEFwcGx5IHJlZmluZW1lbnQgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChwYXR0ZXJuLnJlZmluZSkge1xuICAgICAgICAgIHJldHVybiBwYXR0ZXJuLnJlZmluZShsb3dlclBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXR0ZXJuLnR5cGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gRGVmYXVsdCB0byBzdHJpbmcgZm9yIHVua25vd24gdHlwZXNcbiAgcmV0dXJuICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIEluZmVyIHR5cGUgZnJvbSB2YWx1ZSBzdHJ1Y3R1cmVcbiAqIEBwYXJhbSB2YWx1ZSAtIFRva2VuIHZhbHVlXG4gKiBAcmV0dXJucyBJbmZlcnJlZCB0b2tlbiB0eXBlIG9yIG51bGwgaWYgY2Fubm90IGRldGVybWluZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5mZXJUeXBlRnJvbVZhbHVlKHZhbHVlOiB1bmtub3duKTogVG9rZW5UeXBlIHwgbnVsbCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgLy8gQ2hlY2sgZm9yIGNvbG9yIHBhdHRlcm5zXG4gICAgaWYgKHZhbHVlLnN0YXJ0c1dpdGgoJyMnKSB8fCB2YWx1ZS5zdGFydHNXaXRoKCdyZ2InKSkge1xuICAgICAgcmV0dXJuICdjb2xvcic7XG4gICAgfVxuICAgIC8vIENoZWNrIGZvciBudW1iZXIgd2l0aCB1bml0c1xuICAgIGlmICgvXlxcZCsoXFwuXFxkKyk/KHB4fHJlbXxlbXwlKSQvLnRlc3QodmFsdWUpKSB7XG4gICAgICByZXR1cm4gJ2RpbWVuc2lvbic7XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gJ251bWJlcic7XG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpIHtcbiAgICByZXR1cm4gJ2Jvb2xlYW4nO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iLCAiLyoqXG4gKiBJbXBvcnQgb3JjaGVzdHJhdG9yXG4gKiBDb29yZGluYXRlcyB0aGUgdHdvLXBhc3MgaW1wb3J0IHByb2Nlc3M6XG4gKiAtIFBhc3MgMTogQ3JlYXRlIGFsbCB2YXJpYWJsZXMgYW5kIGNvbGxlY3Rpb25zXG4gKiAtIFBhc3MgMjogUmVzb2x2ZSBhbGwgYWxpYXMgcmVmZXJlbmNlc1xuICpcbiAqIEBtb2R1bGUgYmFja2VuZC9pbXBvcnRcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IENvbGxlY3Rpb25Db25maWcgfSBmcm9tICcuLi8uLi90eXBlcy9pbmRleC5qcyc7XG5pbXBvcnQgeyBmaW5kT3JDcmVhdGVDb2xsZWN0aW9uLCBzZXR1cE1vZGVzLCBtZXJnZVRva2VuRmlsZXMgfSBmcm9tICcuL2NvbGxlY3Rpb24uanMnO1xuaW1wb3J0IHsgY3JlYXRlT3JVcGRhdGVWYXJpYWJsZSwgaXNUb2tlblZhbHVlLCBub3JtYWxpemVUb2tlbiB9IGZyb20gJy4vdmFyaWFibGUuanMnO1xuaW1wb3J0IHsgQWxpYXNSZXNvbHZlciB9IGZyb20gJy4vYWxpYXMtcmVzb2x2ZXIuanMnO1xuaW1wb3J0IHsgaW5mZXJUeXBlRnJvbVBhdGggfSBmcm9tICcuLi90eXBlLWluZmVyZW5jZS9pbmRleC5qcyc7XG5cbi8qKlxuICogSW1wb3J0IHRva2VucyBmcm9tIGNvbGxlY3Rpb24gY29uZmlndXJhdGlvbnMgaW50byBGaWdtYS5cbiAqXG4gKiBQZXJmb3JtcyBhIHR3by1wYXNzIGltcG9ydCBwcm9jZXNzOlxuICogLSAqKlBhc3MgMSoqOiBDcmVhdGVzIGFsbCB2YXJpYWJsZSBjb2xsZWN0aW9ucywgbW9kZXMsIGFuZCB2YXJpYWJsZXMgd2l0aCBpbml0aWFsIHZhbHVlc1xuICogLSAqKlBhc3MgMioqOiBSZXNvbHZlcyBhbGwgYWxpYXMgcmVmZXJlbmNlcyBiZXR3ZWVuIHZhcmlhYmxlc1xuICpcbiAqIFRoaXMgdHdvLXBhc3MgYXBwcm9hY2ggaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYWxpYXNlcyBtYXkgcmVmZXJlbmNlIHZhcmlhYmxlcyB0aGF0XG4gKiBoYXZlbid0IGJlZW4gY3JlYXRlZCB5ZXQgZHVyaW5nIHNlcXVlbnRpYWwgcHJvY2Vzc2luZy5cbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvbkNvbmZpZ3MgLSBBcnJheSBvZiBjb2xsZWN0aW9uIGNvbmZpZ3VyYXRpb25zIGNvbnRhaW5pbmcgdG9rZW4gZGF0YVxuICogQHJldHVybnMgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gaW1wb3J0IGlzIGNvbXBsZXRlXG4gKlxuICogQHRocm93cyB7RXJyb3J9IElmIGNvbGxlY3Rpb24gY3JlYXRpb24gZmFpbHNcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiB2YXJpYWJsZSBjcmVhdGlvbiBmYWlsc1xuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogY29uc3QgY29uZmlnczogQ29sbGVjdGlvbkNvbmZpZ1tdID0gW1xuICogICB7XG4gKiAgICAgbmFtZTogJ0Rlc2lnbiBUb2tlbnMnLFxuICogICAgIGlzTW9kZUNvbGxlY3Rpb246IHRydWUsXG4gKiAgICAgZmlsZXM6IFtcbiAqICAgICAgIHsgbmFtZTogJ2xpZ2h0JywgY29udGVudDogeyBjb2xvcnM6IHsgcHJpbWFyeTogJyMwMDAwZmYnIH0gfSwgc2l6ZTogMTAwIH0sXG4gKiAgICAgICB7IG5hbWU6ICdkYXJrJywgY29udGVudDogeyBjb2xvcnM6IHsgcHJpbWFyeTogJyNmZmZmZmYnIH0gfSwgc2l6ZTogMTAwIH1cbiAqICAgICBdXG4gKiAgIH1cbiAqIF07XG4gKlxuICogYXdhaXQgaW1wb3J0VG9rZW5zKGNvbmZpZ3MpO1xuICogLy8gQ3JlYXRlcyBjb2xsZWN0aW9uIHdpdGggdHdvIG1vZGVzOiAnbGlnaHQnIGFuZCAnZGFyaydcbiAqIC8vIEVhY2ggbW9kZSBoYXMgaXRzIG93biBjb2xvciB2YWx1ZXNcbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW1wb3J0VG9rZW5zKGNvbGxlY3Rpb25Db25maWdzOiBDb2xsZWN0aW9uQ29uZmlnW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgZmlnbWEubm90aWZ5KCdTdGFydGluZyB0b2tlbiBpbXBvcnQuLi4nKTtcblxuICAvLyBDcmVhdGUgYWxpYXMgcmVzb2x2ZXIgZm9yIHRoaXMgaW1wb3J0IHNlc3Npb25cbiAgY29uc3QgYWxpYXNSZXNvbHZlciA9IG5ldyBBbGlhc1Jlc29sdmVyKCk7XG5cbiAgLy8gUGFzcyAxOiBDcmVhdGUgYWxsIHZhcmlhYmxlcyBhbmQgY29sbGVjdGlvbnNcbiAgZm9yIChjb25zdCBjb25maWcgb2YgY29sbGVjdGlvbkNvbmZpZ3MpIHtcbiAgICBhd2FpdCBpbXBvcnRDb2xsZWN0aW9uKGNvbmZpZywgYWxpYXNSZXNvbHZlcik7XG4gIH1cblxuICAvLyBQYXNzIDI6IFJlc29sdmUgYWxpYXNlc1xuICBmaWdtYS5ub3RpZnkoJ1Jlc29sdmluZyBhbGlhc2VzLi4uJyk7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGFsaWFzUmVzb2x2ZXIucmVzb2x2ZUFsbCgpO1xuXG4gIGlmIChyZXN1bHQucmVzb2x2ZWQgPiAwKSB7XG4gICAgY29uc29sZS5sb2coYFJlc29sdmVkICR7cmVzdWx0LnJlc29sdmVkfSBhbGlhcyByZWZlcmVuY2VzYCk7XG4gIH1cblxuICBpZiAocmVzdWx0LmZhaWxlZCA+IDApIHtcbiAgICBjb25zb2xlLndhcm4oYEZhaWxlZCB0byByZXNvbHZlICR7cmVzdWx0LmZhaWxlZH0gYWxpYXNlc2ApO1xuICAgIC8vIFNob3cgZmlyc3QgZmV3IHdhcm5pbmdzIGluIG5vdGlmaWNhdGlvblxuICAgIGlmIChyZXN1bHQud2FybmluZ3MubGVuZ3RoID4gMCkge1xuICAgICAgZmlnbWEubm90aWZ5KGBXYXJuaW5nOiAke3Jlc3VsdC5mYWlsZWR9IGFsaWFzZXMgY291bGQgbm90IGJlIHJlc29sdmVkYCwgeyB0aW1lb3V0OiA1MDAwIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIENsZWFyIHJlc29sdmVyXG4gIGFsaWFzUmVzb2x2ZXIuY2xlYXIoKTtcblxuICBmaWdtYS5ub3RpZnkoJ1x1MjcxMyBJbXBvcnQgY29tcGxldGUhJyk7XG59XG5cbi8qKlxuICogSW1wb3J0IGEgc2luZ2xlIGNvbGxlY3Rpb24gY29uZmlndXJhdGlvbi5cbiAqXG4gKiBIYW5kbGVzIGJvdGggbW9kZS1iYXNlZCBjb2xsZWN0aW9ucyAob25lIGZpbGUgcGVyIG1vZGUpIGFuZCBzaW5nbGUtbW9kZVxuICogY29sbGVjdGlvbnMgKG11bHRpcGxlIGZpbGVzIG1lcmdlZCBpbnRvIG9uZSBtb2RlKS5cbiAqXG4gKiBAcGFyYW0gY29uZmlnIC0gQ29sbGVjdGlvbiBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gYWxpYXNSZXNvbHZlciAtIEFsaWFzIHJlc29sdmVyIGluc3RhbmNlIHRvIHJlZ2lzdGVyIGFsaWFzZXMgZHVyaW5nIGltcG9ydFxuICogQHJldHVybnMgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gY29sbGVjdGlvbiBpbXBvcnQgaXMgY29tcGxldGVcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaW1wb3J0Q29sbGVjdGlvbihcbiAgY29uZmlnOiBDb2xsZWN0aW9uQ29uZmlnLFxuICBhbGlhc1Jlc29sdmVyOiBBbGlhc1Jlc29sdmVyXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgLy8gRmluZCBvciBjcmVhdGUgY29sbGVjdGlvblxuICBjb25zdCBjb2xsZWN0aW9uID0gYXdhaXQgZmluZE9yQ3JlYXRlQ29sbGVjdGlvbihjb25maWcubmFtZSk7XG5cbiAgLy8gU2V0dXAgbW9kZXNcbiAgY29uc3QgZmlsZU1vZGVNYXAgPSBzZXR1cE1vZGVzKGNvbGxlY3Rpb24sIGNvbmZpZyk7XG5cbiAgaWYgKGNvbmZpZy5pc01vZGVDb2xsZWN0aW9uKSB7XG4gICAgLy8gRWFjaCBmaWxlIGlzIGEgc2VwYXJhdGUgbW9kZVxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBjb25maWcuZmlsZXMpIHtcbiAgICAgIGNvbnN0IG1vZGVJZCA9IGZpbGVNb2RlTWFwLmdldChmaWxlLm5hbWUpO1xuICAgICAgaWYgKG1vZGVJZCkge1xuICAgICAgICBhd2FpdCBpbXBvcnRUb2tlbnNGb3JNb2RlKGNvbGxlY3Rpb24sIG1vZGVJZCwgZmlsZS5jb250ZW50LCBhbGlhc1Jlc29sdmVyKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gU2luZ2xlIG1vZGUsIG1lcmdlIGFsbCBmaWxlc1xuICAgIGNvbnN0IG1lcmdlZFRva2VucyA9IG1lcmdlVG9rZW5GaWxlcyhjb25maWcuZmlsZXMpO1xuICAgIGNvbnN0IGRlZmF1bHRNb2RlID0gY29sbGVjdGlvbi5tb2Rlc1swXTtcbiAgICBhd2FpdCBpbXBvcnRUb2tlbnNGb3JNb2RlKGNvbGxlY3Rpb24sIGRlZmF1bHRNb2RlLm1vZGVJZCwgbWVyZ2VkVG9rZW5zLCBhbGlhc1Jlc29sdmVyKTtcbiAgfVxufVxuXG4vKipcbiAqIEltcG9ydCB0b2tlbnMgZm9yIGEgc3BlY2lmaWMgbW9kZS5cbiAqXG4gKiBSZWN1cnNpdmVseSBwcm9jZXNzZXMgbmVzdGVkIHRva2VuIHN0cnVjdHVyZXMsIGNyZWF0aW5nIHZhcmlhYmxlcyBmb3IgZWFjaFxuICogbGVhZiB0b2tlbiBmb3VuZC4gU3VwcG9ydHMgYm90aCBXM0MgZm9ybWF0ICgkdmFsdWUsICR0eXBlKSBhbmQgbGVnYWN5IGZvcm1hdFxuICogKHZhbHVlLCB0eXBlKS5cbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvbiAtIFZhcmlhYmxlIGNvbGxlY3Rpb24gdG8gaW1wb3J0IGludG9cbiAqIEBwYXJhbSBtb2RlSWQgLSBNb2RlIElEIHRvIHNldCB2YWx1ZXMgZm9yXG4gKiBAcGFyYW0gdG9rZW5zIC0gVG9rZW4gc3RydWN0dXJlIChuZXN0ZWQgb2JqZWN0cylcbiAqIEBwYXJhbSBhbGlhc1Jlc29sdmVyIC0gQWxpYXMgcmVzb2x2ZXIgdG8gcmVnaXN0ZXIgYWxpYXNlc1xuICogQHBhcmFtIHByZWZpeCAtIEN1cnJlbnQgcGF0aCBwcmVmaXggZm9yIG5lc3RlZCB0b2tlbnNcbiAqIEByZXR1cm5zIFByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIGFsbCB0b2tlbnMgYXJlIGltcG9ydGVkXG4gKlxuICogQGludGVybmFsXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGltcG9ydFRva2Vuc0Zvck1vZGUoXG4gIGNvbGxlY3Rpb246IFZhcmlhYmxlQ29sbGVjdGlvbixcbiAgbW9kZUlkOiBzdHJpbmcsXG4gIHRva2VuczogYW55LFxuICBhbGlhc1Jlc29sdmVyOiBBbGlhc1Jlc29sdmVyLFxuICBwcmVmaXg6IHN0cmluZyA9ICcnXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModG9rZW5zKSkge1xuICAgIC8vIFNraXAgaW50ZXJuYWwgcHJvcGVydGllcyAoYm90aCBXM0MgYW5kIGxlZ2FjeSBmb3JtYXRzKVxuICAgIGlmIChrZXkgPT09ICd2YWx1ZScgfHwga2V5ID09PSAndHlwZScgfHwga2V5ID09PSAnZGVzY3JpcHRpb24nIHx8XG4gICAgICAgIGtleSA9PT0gJyR2YWx1ZScgfHwga2V5ID09PSAnJHR5cGUnIHx8IGtleSA9PT0gJyRkZXNjcmlwdGlvbicpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHBhdGggPSBwcmVmaXggPyBgJHtwcmVmaXh9LyR7a2V5fWAgOiBrZXk7XG5cbiAgICBpZiAoaXNUb2tlblZhbHVlKHZhbHVlKSkge1xuICAgICAgLy8gVGhpcyBpcyBhIGxlYWYgdG9rZW4gLSBub3JtYWxpemUgYW5kIGNyZWF0ZSB2YXJpYWJsZVxuICAgICAgY29uc3Qgbm9ybWFsaXplZFRva2VuID0gbm9ybWFsaXplVG9rZW4odmFsdWUsIHBhdGgsIGluZmVyVHlwZUZyb21QYXRoKTtcblxuICAgICAgYXdhaXQgY3JlYXRlT3JVcGRhdGVWYXJpYWJsZShcbiAgICAgICAgY29sbGVjdGlvbixcbiAgICAgICAgbW9kZUlkLFxuICAgICAgICBwYXRoLFxuICAgICAgICBub3JtYWxpemVkVG9rZW4sXG4gICAgICAgICh2YXJpYWJsZSwgbW9kZUlkLCBhbGlhc1BhdGgpID0+IHtcbiAgICAgICAgICBhbGlhc1Jlc29sdmVyLnJlZ2lzdGVyQWxpYXModmFyaWFibGUsIG1vZGVJZCwgYWxpYXNQYXRoKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgIC8vIFJlY3Vyc2UgaW50byBuZXN0ZWQgb2JqZWN0XG4gICAgICBhd2FpdCBpbXBvcnRUb2tlbnNGb3JNb2RlKGNvbGxlY3Rpb24sIG1vZGVJZCwgdmFsdWUsIGFsaWFzUmVzb2x2ZXIsIHBhdGgpO1xuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogRXhwb3J0IHRyYW5zZm9ybWVyIG1vZHVsZVxuICogSGFuZGxlcyB2YWx1ZSB0cmFuc2Zvcm1hdGlvbiBmcm9tIEZpZ21hIGZvcm1hdCB0byB0b2tlbiBmb3JtYXRcbiAqL1xuXG5pbXBvcnQgeyByZ2JUb0hleCB9IGZyb20gJy4uL3V0aWxzL3BhcnNlcnMuanMnO1xuXG4vKipcbiAqIFJlc29sdmUgYSB2YXJpYWJsZSdzIHZhbHVlIGZvciBhIHNwZWNpZmljIG1vZGVcbiAqIEhhbmRsZXMgVkFSSUFCTEVfQUxJQVMgcmVmZXJlbmNlcyBhbmQgY29sb3IgdHJhbnNmb3JtYXRpb25zXG4gKlxuICogQHBhcmFtIHZhcmlhYmxlIC0gRmlnbWEgdmFyaWFibGUgdG8gcmVzb2x2ZVxuICogQHBhcmFtIG1vZGVJZCAtIE1vZGUgSUQgdG8gZ2V0IHZhbHVlIGZvclxuICogQHJldHVybnMgUmVzb2x2ZWQgdmFsdWUgKGFsaWFzIHN0cmluZywgaGV4IGNvbG9yLCBvciByYXcgdmFsdWUpXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlVmFyaWFibGVWYWx1ZSh2YXJpYWJsZTogVmFyaWFibGUsIG1vZGVJZDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgY29uc3QgdmFsdWUgPSB2YXJpYWJsZS52YWx1ZXNCeU1vZGVbbW9kZUlkXTtcblxuICAvLyBDaGVjayBpZiBpdCdzIGFuIGFsaWFzIHJlZmVyZW5jZVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCAmJiAndHlwZScgaW4gdmFsdWUgJiYgdmFsdWUudHlwZSA9PT0gJ1ZBUklBQkxFX0FMSUFTJykge1xuICAgIGNvbnN0IGFsaWFzZWRWYXJpYWJsZSA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRWYXJpYWJsZUJ5SWRBc3luYyh2YWx1ZS5pZCk7XG4gICAgaWYgKGFsaWFzZWRWYXJpYWJsZSkge1xuICAgICAgLy8gUmV0dXJuIGFsaWFzIGluIHtwYXRoLnRvLnRva2VufSBmb3JtYXRcbiAgICAgIHJldHVybiAneycgKyBhbGlhc2VkVmFyaWFibGUubmFtZS5yZXBsYWNlKC9cXC8vZywgJy4nKSArICd9JztcbiAgICB9XG4gIH1cblxuICAvLyBIYW5kbGUgY29sb3IgdmFsdWVzIC0gY29udmVydCBSR0IgdG8gaGV4XG4gIGlmICh2YXJpYWJsZS5yZXNvbHZlZFR5cGUgPT09ICdDT0xPUicgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCAmJiAncicgaW4gdmFsdWUpIHtcbiAgICByZXR1cm4gcmdiVG9IZXgodmFsdWUgYXMgUkdCIHwgUkdCQSk7XG4gIH1cblxuICAvLyBSZXR1cm4gcmF3IHZhbHVlIGZvciBvdGhlciB0eXBlc1xuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogU2V0IGEgbmVzdGVkIHZhbHVlIGluIGFuIG9iamVjdCB1c2luZyBhIHBhdGhcbiAqIENyZWF0ZXMgaW50ZXJtZWRpYXRlIG9iamVjdHMgYXMgbmVlZGVkXG4gKlxuICogQHBhcmFtIG9iaiAtIFRhcmdldCBvYmplY3QgdG8gbW9kaWZ5XG4gKiBAcGFyYW0gcGF0aFBhcnRzIC0gQXJyYXkgb2YgcGF0aCBzZWdtZW50cyAoZS5nLiwgWydjb2xvcnMnLCAncHJpbWFyeSddKVxuICogQHBhcmFtIHZhbHVlIC0gVmFsdWUgdG8gc2V0IGF0IHRoZSBwYXRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXROZXN0ZWRWYWx1ZShvYmo6IGFueSwgcGF0aFBhcnRzOiBzdHJpbmdbXSwgdmFsdWU6IGFueSk6IHZvaWQge1xuICBsZXQgY3VycmVudCA9IG9iajtcblxuICAvLyBOYXZpZ2F0ZS9jcmVhdGUgbmVzdGVkIHN0cnVjdHVyZSB1cCB0byB0aGUgbGFzdCBzZWdtZW50XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcGF0aFBhcnRzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgIGNvbnN0IHBhcnQgPSBwYXRoUGFydHNbaV07XG4gICAgaWYgKCEocGFydCBpbiBjdXJyZW50KSkge1xuICAgICAgY3VycmVudFtwYXJ0XSA9IHt9O1xuICAgIH1cbiAgICBjdXJyZW50ID0gY3VycmVudFtwYXJ0XTtcbiAgfVxuXG4gIC8vIFNldCB0aGUgZmluYWwgdmFsdWVcbiAgY3VycmVudFtwYXRoUGFydHNbcGF0aFBhcnRzLmxlbmd0aCAtIDFdXSA9IHZhbHVlO1xufVxuIiwgIi8qKlxuICogRXhwb3J0IGJhc2VsaW5lIGJ1aWxkZXIgbW9kdWxlXG4gKiBCdWlsZHMgYmFzZWxpbmUgc25hcHNob3Qgc3RydWN0dXJlIGZyb20gRmlnbWEgdmFyaWFibGVzXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBCYXNlbGluZVNuYXBzaG90LCBCYXNlbGluZUVudHJ5LCBFeHBvcnRUb2tlbiB9IGZyb20gJy4uLy4uL3R5cGVzL2luZGV4LmpzJztcbmltcG9ydCB7IG1hcEZpZ21hVHlwZVRvVG9rZW5UeXBlIH0gZnJvbSAnLi4vdXRpbHMvdHlwZS1tYXBwZXJzLmpzJztcbmltcG9ydCB7IHJlc29sdmVWYXJpYWJsZVZhbHVlLCBzZXROZXN0ZWRWYWx1ZSB9IGZyb20gJy4vdHJhbnNmb3JtZXIuanMnO1xuXG4vKipcbiAqIEJ1aWxkIGEgY29tcGxldGUgYmFzZWxpbmUgc25hcHNob3QgZnJvbSBGaWdtYSB2YXJpYWJsZXNcbiAqIEdlbmVyYXRlcyBib3RoIG5lc3RlZCB0b2tlbiBzdHJ1Y3R1cmUgYW5kIGZsYXQgYmFzZWxpbmUgbG9va3VwXG4gKlxuICogQHBhcmFtIGZpbHRlckNvbGxlY3Rpb25JZHMgLSBPcHRpb25hbCBhcnJheSBvZiBjb2xsZWN0aW9uIElEcyB0byBleHBvcnQgKG51bGwgPSBhbGwpXG4gKiBAcmV0dXJucyBDb21wbGV0ZSBiYXNlbGluZSBzbmFwc2hvdCB3aXRoIG1ldGFkYXRhXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBidWlsZEJhc2VsaW5lU25hcHNob3QoXG4gIGZpbHRlckNvbGxlY3Rpb25JZHM6IHN0cmluZ1tdIHwgbnVsbCA9IG51bGxcbik6IFByb21pc2U8QmFzZWxpbmVTbmFwc2hvdD4ge1xuICBsZXQgY29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgY29uc3QgYWxsVmFyaWFibGVzID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldExvY2FsVmFyaWFibGVzQXN5bmMoKTtcblxuICAvLyBGaWx0ZXIgY29sbGVjdGlvbnMgaWYgc3BlY2lmaWMgSURzIHByb3ZpZGVkXG4gIGlmIChmaWx0ZXJDb2xsZWN0aW9uSWRzICYmIGZpbHRlckNvbGxlY3Rpb25JZHMubGVuZ3RoID4gMCkge1xuICAgIGNvbGxlY3Rpb25zID0gY29sbGVjdGlvbnMuZmlsdGVyKGMgPT4gZmlsdGVyQ29sbGVjdGlvbklkcy5pbmNsdWRlcyhjLmlkKSk7XG4gIH1cblxuICAvLyBJbml0aWFsaXplIG91dHB1dCBzdHJ1Y3R1cmUgd2l0aCBtZXRhZGF0YVxuICBjb25zdCBvdXRwdXQ6IEJhc2VsaW5lU25hcHNob3QgPSB7XG4gICAgJG1ldGFkYXRhOiB7XG4gICAgICB2ZXJzaW9uOiAnMi4wLjAnLFxuICAgICAgZXhwb3J0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgcGx1Z2luVmVyc2lvbjogJzEuMC4wJyxcbiAgICAgIGZpbGVLZXk6IGZpZ21hLmZpbGVLZXkgfHwgJycsXG4gICAgICBmaWxlTmFtZTogZmlnbWEucm9vdC5uYW1lXG4gICAgfSxcbiAgICBiYXNlbGluZToge31cbiAgfTtcblxuICAvLyBQcm9jZXNzIGVhY2ggY29sbGVjdGlvblxuICBmb3IgKGNvbnN0IGNvbGxlY3Rpb24gb2YgY29sbGVjdGlvbnMpIHtcbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IGNvbGxlY3Rpb24ubmFtZTtcbiAgICBjb25zdCB2YXJpYWJsZXMgPSBhbGxWYXJpYWJsZXMuZmlsdGVyKHYgPT4gdi52YXJpYWJsZUNvbGxlY3Rpb25JZCA9PT0gY29sbGVjdGlvbi5pZCk7XG5cbiAgICAvLyBJbml0aWFsaXplIGNvbGxlY3Rpb24gaW4gb3V0cHV0XG4gICAgaWYgKCFvdXRwdXRbY29sbGVjdGlvbk5hbWVdKSB7XG4gICAgICBvdXRwdXRbY29sbGVjdGlvbk5hbWVdID0ge307XG4gICAgfVxuXG4gICAgLy8gUHJvY2VzcyBlYWNoIG1vZGVcbiAgICBmb3IgKGNvbnN0IG1vZGUgb2YgY29sbGVjdGlvbi5tb2Rlcykge1xuICAgICAgLy8gVXNlIFwidmFsdWVcIiBhcyBkZWZhdWx0IG1vZGUgbmFtZSBpZiBGaWdtYSdzIGRlZmF1bHQgXCJNb2RlIDFcIiBpcyBkZXRlY3RlZFxuICAgICAgY29uc3QgbW9kZU5hbWUgPSBtb2RlLm5hbWUgPT09ICdNb2RlIDEnID8gJ3ZhbHVlJyA6IG1vZGUubmFtZTtcblxuICAgICAgLy8gSW5pdGlhbGl6ZSBtb2RlIGluIGNvbGxlY3Rpb25cbiAgICAgIGlmICghb3V0cHV0W2NvbGxlY3Rpb25OYW1lXVttb2RlTmFtZV0pIHtcbiAgICAgICAgb3V0cHV0W2NvbGxlY3Rpb25OYW1lXVttb2RlTmFtZV0gPSB7fTtcbiAgICAgIH1cblxuICAgICAgLy8gUHJvY2VzcyBlYWNoIHZhcmlhYmxlIGluIHRoaXMgbW9kZVxuICAgICAgZm9yIChjb25zdCB2YXJpYWJsZSBvZiB2YXJpYWJsZXMpIHtcbiAgICAgICAgY29uc3QgcGF0aFBhcnRzID0gdmFyaWFibGUubmFtZS5zcGxpdCgnLycpLm1hcChwID0+IHAudHJpbSgpKTtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCByZXNvbHZlVmFyaWFibGVWYWx1ZSh2YXJpYWJsZSwgbW9kZS5tb2RlSWQpO1xuICAgICAgICBjb25zdCB0b2tlblR5cGUgPSBtYXBGaWdtYVR5cGVUb1Rva2VuVHlwZSh2YXJpYWJsZS5yZXNvbHZlZFR5cGUpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBwcmVmaXhlZCB2YXJpYWJsZSBJRDogY29sbGVjdGlvbk5hbWU6bW9kZU5hbWU6VmFyaWFibGVJRFxuICAgICAgICBjb25zdCBwcmVmaXhlZElkID0gYCR7Y29sbGVjdGlvbk5hbWV9OiR7bW9kZU5hbWV9OiR7dmFyaWFibGUuaWR9YDtcblxuICAgICAgICAvLyBDcmVhdGUgdG9rZW4gZm9yIG5lc3RlZCBzdHJ1Y3R1cmVcbiAgICAgICAgY29uc3QgdG9rZW46IEV4cG9ydFRva2VuID0ge1xuICAgICAgICAgICR0eXBlOiB0b2tlblR5cGUsXG4gICAgICAgICAgJHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAkdmFyaWFibGVJZDogcHJlZml4ZWRJZFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFkZCB0byBuZXN0ZWQgc3RydWN0dXJlXG4gICAgICAgIHNldE5lc3RlZFZhbHVlKG91dHB1dFtjb2xsZWN0aW9uTmFtZV1bbW9kZU5hbWVdLCBwYXRoUGFydHMsIHRva2VuKTtcblxuICAgICAgICAvLyBBZGQgdG8gYmFzZWxpbmUgKGZsYXQgc3RydWN0dXJlKVxuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IGAke2NvbGxlY3Rpb25OYW1lfS4ke21vZGVOYW1lfS4ke3BhdGhQYXJ0cy5qb2luKCcuJyl9YDtcbiAgICAgICAgb3V0cHV0LmJhc2VsaW5lW3ByZWZpeGVkSWRdID0ge1xuICAgICAgICAgIHBhdGg6IGZ1bGxQYXRoLFxuICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICB0eXBlOiB0b2tlblR5cGUsXG4gICAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgbW9kZTogbW9kZU5hbWVcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3V0cHV0O1xufVxuIiwgIi8qKlxuICogRXhwb3J0IG9yY2hlc3RyYXRvciBtb2R1bGVcbiAqIE1haW4gZW50cnkgcG9pbnQgZm9yIGV4cG9ydGluZyBiYXNlbGluZSBzbmFwc2hvdHMgZnJvbSBGaWdtYSB2YXJpYWJsZXNcbiAqXG4gKiBAbW9kdWxlIGJhY2tlbmQvZXhwb3J0XG4gKi9cblxuaW1wb3J0IHR5cGUgeyBCYXNlbGluZVNuYXBzaG90IH0gZnJvbSAnLi4vLi4vdHlwZXMvaW5kZXguanMnO1xuaW1wb3J0IHsgYnVpbGRCYXNlbGluZVNuYXBzaG90IH0gZnJvbSAnLi9iYXNlbGluZS5qcyc7XG5cbi8qKlxuICogRXhwb3J0IGJhc2VsaW5lIHNuYXBzaG90IHdpdGggb3B0aW9uYWwgY29sbGVjdGlvbiBmaWx0ZXJpbmcuXG4gKlxuICogQ3JlYXRlcyBhIGNvbXBsZXRlIHNuYXBzaG90IG9mIEZpZ21hIHZhcmlhYmxlcyBpbiBhIHN0YW5kYXJkaXplZCBiYXNlbGluZSBmb3JtYXRcbiAqIHRoYXQgY2FuIGJlIHVzZWQgZm9yOlxuICogLSBTeW5jaW5nIHRvIHRoZSByZWdpc3RyeSBub2RlIGZvciBBUEkgYWNjZXNzXG4gKiAtIEV4cG9ydGluZyB0byBKU09OIGZpbGVzIGZvciB2ZXJzaW9uIGNvbnRyb2xcbiAqIC0gRGlmZmluZyBhZ2FpbnN0IHByZXZpb3VzIGJhc2VsaW5lcyB0byBkZXRlY3QgY2hhbmdlc1xuICpcbiAqIFRoZSBiYXNlbGluZSBzbmFwc2hvdCBpbmNsdWRlczpcbiAqIC0gTmVzdGVkIHRva2VuIHN0cnVjdHVyZSBvcmdhbml6ZWQgYnkgY29sbGVjdGlvbiBcdTIxOTIgbW9kZSBcdTIxOTIgZ3JvdXAgXHUyMTkyIHRva2VuXG4gKiAtIEZsYXQgYmFzZWxpbmUgbG9va3VwIG1hcHBpbmcgdmFyaWFibGUgSURzIHRvIG1ldGFkYXRhXG4gKiAtIE1ldGFkYXRhIGFib3V0IHRoZSBleHBvcnQgKHRpbWVzdGFtcCwgZmlsZSBpbmZvLCBwbHVnaW4gdmVyc2lvbilcbiAqXG4gKiBAcGFyYW0gZmlsdGVyQ29sbGVjdGlvbklkcyAtIE9wdGlvbmFsIGFycmF5IG9mIGNvbGxlY3Rpb24gSURzIHRvIGV4cG9ydC5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSWYgbnVsbCBvciBlbXB0eSwgYWxsIGNvbGxlY3Rpb25zIGFyZSBleHBvcnRlZC5cbiAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGNvbXBsZXRlIGJhc2VsaW5lIHNuYXBzaG90XG4gKlxuICogQHRocm93cyB7RXJyb3J9IElmIEZpZ21hIEFQSSBjYWxscyBmYWlsXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgdmFyaWFibGUgdmFsdWUgcmVzb2x1dGlvbiBmYWlsc1xuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogLy8gRXhwb3J0IGFsbCBjb2xsZWN0aW9uc1xuICogY29uc3QgZnVsbEJhc2VsaW5lID0gYXdhaXQgZXhwb3J0QmFzZWxpbmUoKTtcbiAqXG4gKiAvLyBFeHBvcnQgc3BlY2lmaWMgY29sbGVjdGlvbnNcbiAqIGNvbnN0IGZpbHRlcmVkQmFzZWxpbmUgPSBhd2FpdCBleHBvcnRCYXNlbGluZShbJ2NvbGxlY3Rpb24taWQtMScsICdjb2xsZWN0aW9uLWlkLTInXSk7XG4gKlxuICogLy8gQWNjZXNzIG5lc3RlZCBzdHJ1Y3R1cmVcbiAqIGNvbnN0IHByaW1hcnlDb2xvciA9IGZ1bGxCYXNlbGluZVsnRGVzaWduIFRva2VucyddLmxpZ2h0LmNvbG9ycy5wcmltYXJ5O1xuICpcbiAqIC8vIEFjY2VzcyBmbGF0IGJhc2VsaW5lXG4gKiBjb25zdCB2YXJpYWJsZUluZm8gPSBmdWxsQmFzZWxpbmUuYmFzZWxpbmVbJzEyMzo0NTYnXTtcbiAqIC8vIHsgcGF0aDogJ2NvbG9ycy9wcmltYXJ5JywgdmFsdWU6ICcjMDAwMGZmJywgdHlwZTogJ2NvbG9yJywgLi4uIH1cbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhwb3J0QmFzZWxpbmUoXG4gIGZpbHRlckNvbGxlY3Rpb25JZHM6IHN0cmluZ1tdIHwgbnVsbCA9IG51bGxcbik6IFByb21pc2U8QmFzZWxpbmVTbmFwc2hvdD4ge1xuICByZXR1cm4gYnVpbGRCYXNlbGluZVNuYXBzaG90KGZpbHRlckNvbGxlY3Rpb25JZHMpO1xufVxuXG4vLyBSZS1leHBvcnQgdHJhbnNmb3JtZXIgdXRpbGl0aWVzIGZvciBjb252ZW5pZW5jZVxuZXhwb3J0IHsgcmVzb2x2ZVZhcmlhYmxlVmFsdWUsIHNldE5lc3RlZFZhbHVlIH0gZnJvbSAnLi90cmFuc2Zvcm1lci5qcyc7XG5leHBvcnQgeyBidWlsZEJhc2VsaW5lU25hcHNob3QgfSBmcm9tICcuL2Jhc2VsaW5lLmpzJztcbiIsICIvKipcbiAqIFBsdWdpbiBjb25zdGFudHMgYW5kIGNvbmZpZ3VyYXRpb25cbiAqL1xuXG4vKiogUGx1Z2luIG5hbWVzcGFjZSBmb3Igc2hhcmVkUGx1Z2luRGF0YSBzdG9yYWdlICovXG5leHBvcnQgY29uc3QgUExVR0lOX05BTUVTUEFDRSA9ICd0b2tlbl92YXVsdCc7XG5cbi8qKiBMZWdhY3kgbmFtZXNwYWNlIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSAqL1xuZXhwb3J0IGNvbnN0IExFR0FDWV9OQU1FU1BBQ0UgPSAnZGVzaWduX3Rva2VuX2ltcG9ydGVyJztcblxuLyoqIE5hbWUgb2YgdGhlIHJlZ2lzdHJ5IG5vZGUgKi9cbmV4cG9ydCBjb25zdCBSRUdJU1RSWV9OT0RFX05BTUUgPSAnX3Rva2VuX3JlZ2lzdHJ5JztcblxuLyoqIENodW5rIHNpemUgZm9yIHNwbGl0dGluZyBkYXRhICg5MEtCIHRvIHN0YXkgdW5kZXIgMTAwS0IgbGltaXQpICovXG5leHBvcnQgY29uc3QgQ0hVTktfU0laRSA9IDkwMDAwO1xuXG4vKiogUGx1Z2luIHZlcnNpb24gKi9cbmV4cG9ydCBjb25zdCBQTFVHSU5fVkVSU0lPTiA9ICcyLjAuMCc7XG5cbi8qKiBCYXNlbGluZSB2ZXJzaW9uICovXG5leHBvcnQgY29uc3QgQkFTRUxJTkVfVkVSU0lPTiA9ICcyLjAuMCc7XG4iLCAiLyoqXG4gKiBEYXRhIGNodW5raW5nIHV0aWxpdGllcyBmb3IgaGFuZGxpbmcgRmlnbWEncyAxMDBLQiBzaGFyZWRQbHVnaW5EYXRhIGxpbWl0XG4gKlxuICogQG1vZHVsZSBiYWNrZW5kL3N5bmMvY2h1bmtlclxuICovXG5cbmltcG9ydCB7IENIVU5LX1NJWkUgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMuanMnO1xuXG4vKipcbiAqIFJlc3VsdCBvZiBjaHVua2luZyBvcGVyYXRpb25cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDaHVua2VkRGF0YSB7XG4gIC8qKiBBcnJheSBvZiBjaHVuayBzdHJpbmdzICovXG4gIGNodW5rczogc3RyaW5nW107XG4gIC8qKiBUb3RhbCBzaXplIGluIGJ5dGVzICovXG4gIHRvdGFsU2l6ZTogbnVtYmVyO1xuICAvKiogTnVtYmVyIG9mIGNodW5rcyBjcmVhdGVkICovXG4gIGNodW5rQ291bnQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBTcGxpdCBkYXRhIGludG8gc2FmZS1zaXplZCBjaHVua3MgZm9yIHN0b3JhZ2UgaW4gc2hhcmVkUGx1Z2luRGF0YS5cbiAqIFVzZXMgOTBLQiBjaHVua3MgdG8gc3RheSB1bmRlciBGaWdtYSdzIDEwMEtCIGxpbWl0IHBlciBlbnRyeS5cbiAqXG4gKiBAcGFyYW0gZGF0YSAtIERhdGEgdG8gY2h1bmsgKHdpbGwgYmUgSlNPTiBzdHJpbmdpZmllZClcbiAqIEByZXR1cm5zIENodW5rZWQgZGF0YSB3aXRoIG1ldGFkYXRhXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBjb25zdCBzbmFwc2hvdCA9IHsgdG9rZW5zOiB7Li4ufSB9O1xuICogY29uc3QgY2h1bmtlZCA9IGNodW5rRGF0YShzbmFwc2hvdCk7XG4gKiBjb25zb2xlLmxvZyhgU3BsaXQgaW50byAke2NodW5rZWQuY2h1bmtDb3VudH0gY2h1bmtzYCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNodW5rRGF0YShkYXRhOiB1bmtub3duKTogQ2h1bmtlZERhdGEge1xuICAvLyBTdHJpbmdpZnkgdGhlIGRhdGFcbiAgY29uc3QganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgY29uc3QgdG90YWxTaXplID0ganNvbkRhdGEubGVuZ3RoO1xuICBjb25zdCBjaHVua3M6IHN0cmluZ1tdID0gW107XG5cbiAgLy8gU3BsaXQgaW50byBjaHVua3NcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBqc29uRGF0YS5sZW5ndGg7IGkgKz0gQ0hVTktfU0laRSkge1xuICAgIGNodW5rcy5wdXNoKGpzb25EYXRhLnNsaWNlKGksIGkgKyBDSFVOS19TSVpFKSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGNodW5rcyxcbiAgICB0b3RhbFNpemUsXG4gICAgY2h1bmtDb3VudDogY2h1bmtzLmxlbmd0aFxuICB9O1xufVxuXG4vKipcbiAqIFJlYXNzZW1ibGUgY2h1bmtlZCBkYXRhIGJhY2sgaW50byBvcmlnaW5hbCBvYmplY3QuXG4gKlxuICogQHBhcmFtIGNodW5rcyAtIEFycmF5IG9mIGNodW5rIHN0cmluZ3NcbiAqIEByZXR1cm5zIFBhcnNlZCBkYXRhIG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiBKU09OIHBhcnNpbmcgZmFpbHNcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGNvbnN0IG9yaWdpbmFsID0gdW5jaHVua0RhdGEoY2h1bmtlZC5jaHVua3MpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmNodW5rRGF0YShjaHVua3M6IHN0cmluZ1tdKTogdW5rbm93biB7XG4gIC8vIEpvaW4gYWxsIGNodW5rc1xuICBjb25zdCBqc29uRGF0YSA9IGNodW5rcy5qb2luKCcnKTtcblxuICAvLyBQYXJzZSBhbmQgcmV0dXJuXG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoanNvbkRhdGEpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHBhcnNlIHVuY2h1bmtlZCBkYXRhOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xuICB9XG59XG4iLCAiLyoqXG4gKiBSZWdpc3RyeSBub2RlIG1hbmFnZW1lbnQgZm9yIHRva2VuIHN5bmNocm9uaXphdGlvblxuICpcbiAqIEBtb2R1bGUgYmFja2VuZC9zeW5jL25vZGUtbWFuYWdlclxuICovXG5cbmltcG9ydCB7IFJFR0lTVFJZX05PREVfTkFNRSB9IGZyb20gJy4uL3V0aWxzL2NvbnN0YW50cy5qcyc7XG5cbi8qKlxuICogRmluZCB0aGUgcmVnaXN0cnkgbm9kZSBhY3Jvc3MgYWxsIHBhZ2VzLlxuICogVGhlIHJlZ2lzdHJ5IG5vZGUgaXMgYSBoaWRkZW4sIGxvY2tlZCBmcmFtZSB0aGF0IHN0b3JlcyB0b2tlbiBkYXRhLlxuICpcbiAqIEByZXR1cm5zIFJlZ2lzdHJ5IG5vZGUgaWYgZm91bmQsIG51bGwgb3RoZXJ3aXNlXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBjb25zdCBub2RlID0gYXdhaXQgZmluZFJlZ2lzdHJ5Tm9kZSgpO1xuICogaWYgKG5vZGUpIHtcbiAqICAgY29uc29sZS5sb2coYEZvdW5kIHJlZ2lzdHJ5IG5vZGU6ICR7bm9kZS5pZH1gKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZFJlZ2lzdHJ5Tm9kZSgpOiBQcm9taXNlPEZyYW1lTm9kZSB8IG51bGw+IHtcbiAgLy8gU2VhcmNoIGFsbCBwYWdlcyBmb3IgdGhlIHJlZ2lzdHJ5IG5vZGVcbiAgZm9yIChjb25zdCBwYWdlIG9mIGZpZ21hLnJvb3QuY2hpbGRyZW4pIHtcbiAgICAvLyBMb2FkIHBhZ2UgYmVmb3JlIGFjY2Vzc2luZyBjaGlsZHJlblxuICAgIGF3YWl0IHBhZ2UubG9hZEFzeW5jKCk7XG5cbiAgICBmb3IgKGNvbnN0IG5vZGUgb2YgcGFnZS5jaGlsZHJlbikge1xuICAgICAgaWYgKG5vZGUudHlwZSA9PT0gJ0ZSQU1FJyAmJiBub2RlLm5hbWUgPT09IFJFR0lTVFJZX05PREVfTkFNRSkge1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgcmVnaXN0cnkgbm9kZSBvbiB0aGUgY3VycmVudCBwYWdlLlxuICogVGhlIG5vZGUgaXMgY3JlYXRlZCBvZmYtY2FudmFzLCBoaWRkZW4sIGFuZCBsb2NrZWQgdG8gcHJldmVudCBhY2NpZGVudGFsIGRlbGV0aW9uLlxuICpcbiAqIEByZXR1cm5zIE5ld2x5IGNyZWF0ZWQgcmVnaXN0cnkgbm9kZVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogY29uc3Qgbm9kZSA9IGF3YWl0IGNyZWF0ZVJlZ2lzdHJ5Tm9kZSgpO1xuICogY29uc29sZS5sb2coYENyZWF0ZWQgcmVnaXN0cnkgbm9kZTogJHtub2RlLmlkfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVSZWdpc3RyeU5vZGUoKTogUHJvbWlzZTxGcmFtZU5vZGU+IHtcbiAgY29uc3QgZnJhbWUgPSBmaWdtYS5jcmVhdGVGcmFtZSgpO1xuICBmcmFtZS5uYW1lID0gUkVHSVNUUllfTk9ERV9OQU1FO1xuICBmcmFtZS5yZXNpemUoMTAwLCAxMDApO1xuXG4gIC8vIFBvc2l0aW9uIG9mZi1jYW52YXMgdG8ga2VlcCBpdCBvdXQgb2YgdGhlIHdheVxuICBmcmFtZS54ID0gLTEwMDA7XG4gIGZyYW1lLnkgPSAtMTAwMDtcblxuICAvLyBIaWRlIGFuZCBsb2NrIHRvIHByZXZlbnQgYWNjaWRlbnRhbCBpbnRlcmFjdGlvblxuICBmcmFtZS52aXNpYmxlID0gZmFsc2U7XG4gIGZyYW1lLmxvY2tlZCA9IHRydWU7XG5cbiAgcmV0dXJuIGZyYW1lO1xufVxuXG4vKipcbiAqIEdldCB0aGUgcmVnaXN0cnkgbm9kZSwgY3JlYXRpbmcgaXQgaWYgaXQgZG9lc24ndCBleGlzdC5cbiAqIFRoaXMgaXMgdGhlIHByaW1hcnkgZW50cnkgcG9pbnQgZm9yIGFjY2Vzc2luZyB0aGUgcmVnaXN0cnkgbm9kZS5cbiAqXG4gKiBAcmV0dXJucyBSZWdpc3RyeSBub2RlIChleGlzdGluZyBvciBuZXdseSBjcmVhdGVkKVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogY29uc3Qgbm9kZSA9IGF3YWl0IGdldE9yQ3JlYXRlUmVnaXN0cnlOb2RlKCk7XG4gKiAvLyBOb2RlIGlzIGd1YXJhbnRlZWQgdG8gZXhpc3QgaGVyZVxuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRPckNyZWF0ZVJlZ2lzdHJ5Tm9kZSgpOiBQcm9taXNlPEZyYW1lTm9kZT4ge1xuICBjb25zdCBleGlzdGluZyA9IGF3YWl0IGZpbmRSZWdpc3RyeU5vZGUoKTtcblxuICBpZiAoZXhpc3RpbmcpIHtcbiAgICByZXR1cm4gZXhpc3Rpbmc7XG4gIH1cblxuICByZXR1cm4gYXdhaXQgY3JlYXRlUmVnaXN0cnlOb2RlKCk7XG59XG5cbi8qKlxuICogQ2xlYXIgYWxsIGNodW5rIGRhdGEgZnJvbSB0aGUgcmVnaXN0cnkgbm9kZS5cbiAqIFJlbW92ZXMgdXAgdG8gMjAgY2h1bmtzIHRvIGVuc3VyZSBjbGVhbiBzbGF0ZSBmb3IgbmV3IGRhdGEuXG4gKlxuICogQHBhcmFtIG5vZGUgLSBSZWdpc3RyeSBub2RlIHRvIGNsZWFyXG4gKiBAcGFyYW0gbmFtZXNwYWNlIC0gUGx1Z2luIG5hbWVzcGFjZSB0byBjbGVhciBkYXRhIGZyb21cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGNvbnN0IG5vZGUgPSBhd2FpdCBnZXRPckNyZWF0ZVJlZ2lzdHJ5Tm9kZSgpO1xuICogY2xlYXJOb2RlQ2h1bmtzKG5vZGUsICd0b2tlbl92YXVsdCcpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhck5vZGVDaHVua3Mobm9kZTogRnJhbWVOb2RlLCBuYW1lc3BhY2U6IHN0cmluZyk6IHZvaWQge1xuICAvLyBDbGVhciB1cCB0byAyMCBjaHVua3MgKHNob3VsZCBiZSBtb3JlIHRoYW4gZW5vdWdoKVxuICBmb3IgKGxldCBpID0gMDsgaSA8IDIwOyBpKyspIHtcbiAgICBub2RlLnNldFNoYXJlZFBsdWdpbkRhdGEobmFtZXNwYWNlLCBgcmVnaXN0cnlfJHtpfWAsICcnKTtcbiAgfVxufVxuXG4vKipcbiAqIFNhdmUgY2h1bmsgZGF0YSB0byB0aGUgcmVnaXN0cnkgbm9kZS5cbiAqXG4gKiBAcGFyYW0gbm9kZSAtIFJlZ2lzdHJ5IG5vZGUgdG8gc2F2ZSB0b1xuICogQHBhcmFtIG5hbWVzcGFjZSAtIFBsdWdpbiBuYW1lc3BhY2VcbiAqIEBwYXJhbSBjaHVua3MgLSBBcnJheSBvZiBjaHVuayBzdHJpbmdzIHRvIHNhdmVcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGNvbnN0IG5vZGUgPSBhd2FpdCBnZXRPckNyZWF0ZVJlZ2lzdHJ5Tm9kZSgpO1xuICogc2F2ZUNodW5rc1RvTm9kZShub2RlLCAndG9rZW5fdmF1bHQnLCBjaHVua2VkLmNodW5rcyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhdmVDaHVua3NUb05vZGUoXG4gIG5vZGU6IEZyYW1lTm9kZSxcbiAgbmFtZXNwYWNlOiBzdHJpbmcsXG4gIGNodW5rczogc3RyaW5nW11cbik6IHZvaWQge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNodW5rcy5sZW5ndGg7IGkrKykge1xuICAgIG5vZGUuc2V0U2hhcmVkUGx1Z2luRGF0YShuYW1lc3BhY2UsIGByZWdpc3RyeV8ke2l9YCwgY2h1bmtzW2ldKTtcbiAgfVxufVxuXG4vKipcbiAqIExvYWQgY2h1bmsgZGF0YSBmcm9tIHRoZSByZWdpc3RyeSBub2RlLlxuICpcbiAqIEBwYXJhbSBub2RlIC0gUmVnaXN0cnkgbm9kZSB0byBsb2FkIGZyb21cbiAqIEBwYXJhbSBuYW1lc3BhY2UgLSBQbHVnaW4gbmFtZXNwYWNlXG4gKiBAcGFyYW0gY2h1bmtDb3VudCAtIE51bWJlciBvZiBjaHVua3MgdG8gbG9hZFxuICogQHJldHVybnMgQXJyYXkgb2YgY2h1bmsgc3RyaW5nc1xuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogY29uc3Qgbm9kZSA9IGF3YWl0IGZpbmRSZWdpc3RyeU5vZGUoKTtcbiAqIGlmIChub2RlKSB7XG4gKiAgIGNvbnN0IGNodW5rcyA9IGxvYWRDaHVua3NGcm9tTm9kZShub2RlLCAndG9rZW5fdmF1bHQnLCAzKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9hZENodW5rc0Zyb21Ob2RlKFxuICBub2RlOiBGcmFtZU5vZGUsXG4gIG5hbWVzcGFjZTogc3RyaW5nLFxuICBjaHVua0NvdW50OiBudW1iZXJcbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgY2h1bmtzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2h1bmtDb3VudDsgaSsrKSB7XG4gICAgY29uc3QgY2h1bmsgPSBub2RlLmdldFNoYXJlZFBsdWdpbkRhdGEobmFtZXNwYWNlLCBgcmVnaXN0cnlfJHtpfWApO1xuICAgIGNodW5rcy5wdXNoKGNodW5rKTtcbiAgfVxuXG4gIHJldHVybiBjaHVua3M7XG59XG4iLCAiLyoqXG4gKiBTeW5jIG1ldGFkYXRhIG1hbmFnZW1lbnQgZm9yIHJlZ2lzdHJ5IG5vZGVcbiAqXG4gKiBAbW9kdWxlIGJhY2tlbmQvc3luYy9tZXRhZGF0YVxuICovXG5cbmltcG9ydCB7IFBMVUdJTl9OQU1FU1BBQ0UsIExFR0FDWV9OQU1FU1BBQ0UgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMuanMnO1xuaW1wb3J0IHR5cGUgeyBTeW5jTWV0YWRhdGEsIFN5bmNJbmZvIH0gZnJvbSAnLi4vLi4vdHlwZXMvbWVzc2FnZS50eXBlcy5qcyc7XG5cbi8qKlxuICogUmVhZCBzeW5jIG1ldGFkYXRhIGZyb20gYSByZWdpc3RyeSBub2RlLlxuICogU3VwcG9ydHMgYm90aCBjdXJyZW50IGFuZCBsZWdhY3kgbmFtZXNwYWNlcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gKlxuICogQHBhcmFtIG5vZGUgLSBSZWdpc3RyeSBub2RlIHRvIHJlYWQgZnJvbVxuICogQHJldHVybnMgU3luYyBpbmZvcm1hdGlvblxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogY29uc3Qgbm9kZSA9IGF3YWl0IGZpbmRSZWdpc3RyeU5vZGUoKTtcbiAqIGlmIChub2RlKSB7XG4gKiAgIGNvbnN0IGluZm8gPSByZWFkU3luY01ldGFkYXRhKG5vZGUpO1xuICogICBjb25zb2xlLmxvZyhgTGFzdCBzeW5jZWQ6ICR7aW5mby51cGRhdGVkQXR9YCk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTeW5jTWV0YWRhdGEobm9kZTogRnJhbWVOb2RlKTogU3luY0luZm8ge1xuICAvLyBUcnkgY3VycmVudCBuYW1lc3BhY2UgZmlyc3RcbiAgbGV0IHVwZGF0ZWRBdCA9IG5vZGUuZ2V0U2hhcmVkUGx1Z2luRGF0YShQTFVHSU5fTkFNRVNQQUNFLCAndXBkYXRlZEF0Jyk7XG4gIGxldCB2YXJpYWJsZUNvdW50ID0gbm9kZS5nZXRTaGFyZWRQbHVnaW5EYXRhKFBMVUdJTl9OQU1FU1BBQ0UsICd2YXJpYWJsZUNvdW50Jyk7XG5cbiAgLy8gRmFsbGJhY2sgdG8gbGVnYWN5IG5hbWVzcGFjZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHlcbiAgaWYgKCF1cGRhdGVkQXQpIHtcbiAgICB1cGRhdGVkQXQgPSBub2RlLmdldFNoYXJlZFBsdWdpbkRhdGEoTEVHQUNZX05BTUVTUEFDRSwgJ3VwZGF0ZWRBdCcpO1xuICAgIHZhcmlhYmxlQ291bnQgPSBub2RlLmdldFNoYXJlZFBsdWdpbkRhdGEoTEVHQUNZX05BTUVTUEFDRSwgJ3ZhcmlhYmxlQ291bnQnKTtcbiAgfVxuXG4gIGlmICghdXBkYXRlZEF0KSB7XG4gICAgcmV0dXJuIHsgZXhpc3RzOiBmYWxzZSB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBleGlzdHM6IHRydWUsXG4gICAgbm9kZUlkOiBub2RlLmlkLFxuICAgIHVwZGF0ZWRBdCxcbiAgICB2YXJpYWJsZUNvdW50OiB2YXJpYWJsZUNvdW50ID8gcGFyc2VJbnQodmFyaWFibGVDb3VudCwgMTApIDogdW5kZWZpbmVkXG4gIH07XG59XG5cbi8qKlxuICogV3JpdGUgc3luYyBtZXRhZGF0YSB0byBhIHJlZ2lzdHJ5IG5vZGUuXG4gKlxuICogQHBhcmFtIG5vZGUgLSBSZWdpc3RyeSBub2RlIHRvIHdyaXRlIHRvXG4gKiBAcGFyYW0gbWV0YWRhdGEgLSBNZXRhZGF0YSB0byBzYXZlXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBjb25zdCBub2RlID0gYXdhaXQgZ2V0T3JDcmVhdGVSZWdpc3RyeU5vZGUoKTtcbiAqIHdyaXRlU3luY01ldGFkYXRhKG5vZGUsIHtcbiAqICAgY2h1bmtDb3VudDogMyxcbiAqICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gKiAgIHZhcmlhYmxlQ291bnQ6IDE1MFxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlU3luY01ldGFkYXRhKG5vZGU6IEZyYW1lTm9kZSwgbWV0YWRhdGE6IFN5bmNNZXRhZGF0YSk6IHZvaWQge1xuICBub2RlLnNldFNoYXJlZFBsdWdpbkRhdGEoUExVR0lOX05BTUVTUEFDRSwgJ2NodW5rQ291bnQnLCBTdHJpbmcobWV0YWRhdGEuY2h1bmtDb3VudCkpO1xuICBub2RlLnNldFNoYXJlZFBsdWdpbkRhdGEoUExVR0lOX05BTUVTUEFDRSwgJ3VwZGF0ZWRBdCcsIG1ldGFkYXRhLnVwZGF0ZWRBdCk7XG4gIG5vZGUuc2V0U2hhcmVkUGx1Z2luRGF0YShQTFVHSU5fTkFNRVNQQUNFLCAndmFyaWFibGVDb3VudCcsIFN0cmluZyhtZXRhZGF0YS52YXJpYWJsZUNvdW50KSk7XG59XG4iLCAiLyoqXG4gKiBTeW5jIG9yY2hlc3RyYXRvciAtIGNvb3JkaW5hdGVzIGV4cG9ydCwgY2h1bmtpbmcsIGFuZCBub2RlIHN0b3JhZ2VcbiAqXG4gKiBUaGlzIG1vZHVsZSBtYW5hZ2VzIHRoZSBzeW5jaHJvbml6YXRpb24gb2YgRmlnbWEgdmFyaWFibGVzIHRvIGEgcmVnaXN0cnkgbm9kZSxcbiAqIGVuYWJsaW5nIHRoZSBTeW5raW8gQ0xJIHRvIGZldGNoIHRva2VuIGRhdGEgdmlhIHRoZSBGaWdtYSBBUEkgd2l0aG91dCByZXF1aXJpbmdcbiAqIG1hbnVhbCBleHBvcnQgc3RlcHMgZnJvbSB0aGUgcGx1Z2luLlxuICpcbiAqIEBtb2R1bGUgYmFja2VuZC9zeW5jXG4gKi9cblxuaW1wb3J0IHsgY2h1bmtEYXRhIH0gZnJvbSAnLi9jaHVua2VyLmpzJztcbmltcG9ydCB7XG4gIGdldE9yQ3JlYXRlUmVnaXN0cnlOb2RlLFxuICBmaW5kUmVnaXN0cnlOb2RlLFxuICBjbGVhck5vZGVDaHVua3MsXG4gIHNhdmVDaHVua3NUb05vZGVcbn0gZnJvbSAnLi9ub2RlLW1hbmFnZXIuanMnO1xuaW1wb3J0IHsgcmVhZFN5bmNNZXRhZGF0YSwgd3JpdGVTeW5jTWV0YWRhdGEgfSBmcm9tICcuL21ldGFkYXRhLmpzJztcbmltcG9ydCB7IFBMVUdJTl9OQU1FU1BBQ0UgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMuanMnO1xuaW1wb3J0IHR5cGUgeyBTeW5jSW5mbyB9IGZyb20gJy4uLy4uL3R5cGVzL21lc3NhZ2UudHlwZXMuanMnO1xuXG4vKipcbiAqIFN5bmMgdG9rZW4gZGF0YSB0byByZWdpc3RyeSBub2RlLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgZm9yIHRoZSBzeW5jIGZsb3cuIEl0IG9yY2hlc3RyYXRlcyB0aGUgY29tcGxldGVcbiAqIHByb2Nlc3Mgb2YgcGVyc2lzdGluZyB0b2tlbiBkYXRhIHRvIGEgaGlkZGVuIHJlZ2lzdHJ5IG5vZGUgaW4gdGhlIEZpZ21hIGZpbGUuXG4gKlxuICogKipGbG93OioqXG4gKiAxLiBFeHBvcnQgYmFzZWxpbmUgc25hcHNob3QgKHBhc3NlZCBhcyBwYXJhbWV0ZXIgdG8gYXZvaWQgY2lyY3VsYXIgZGVwZW5kZW5jeSlcbiAqIDIuIENodW5rIHRoZSBkYXRhIGludG8gc2FmZS1zaXplZCBwaWVjZXMgKHVuZGVyIDEwMEtCIHBlciBjaHVuaylcbiAqIDMuIEdldCBvciBjcmVhdGUgcmVnaXN0cnkgbm9kZSAoX3Rva2VuX3JlZ2lzdHJ5IGZyYW1lKVxuICogNC4gQ2xlYXIgb2xkIGNodW5rcyBmcm9tIHByZXZpb3VzIHN5bmNcbiAqIDUuIFNhdmUgbmV3IGNodW5rcyB0byBub2RlJ3Mgc2hhcmVkUGx1Z2luRGF0YVxuICogNi4gU2F2ZSBtZXRhZGF0YSAoY2h1bmsgY291bnQsIHRpbWVzdGFtcCwgdmFyaWFibGUgY291bnQpXG4gKlxuICogVGhlIHJlZ2lzdHJ5IG5vZGUgaXM6XG4gKiAtIEEgaGlkZGVuLCBsb2NrZWQgRnJhbWVOb2RlIG5hbWVkIFwiX3Rva2VuX3JlZ2lzdHJ5XCJcbiAqIC0gUG9zaXRpb25lZCBvZmYtY2FudmFzIGF0ICgtMTAwMDAsIC0xMDAwMClcbiAqIC0gU3RvcmVzIGRhdGEgaW4gc2hhcmVkUGx1Z2luRGF0YSB3aXRoIG5hbWVzcGFjZSAnc3lua2lvLnRva2VuLXZhdWx0J1xuICogLSBBY2Nlc3NpYmxlIHZpYSBGaWdtYSBBUEkgZm9yIENMSSBmZXRjaGluZ1xuICpcbiAqIEBwYXJhbSBleHBvcnREYXRhIC0gQmFzZWxpbmUgc25hcHNob3QgZGF0YSB0byBzeW5jIChmcm9tIGV4cG9ydEJhc2VsaW5lKVxuICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gc3luYyByZXN1bHQgd2l0aCBub2RlIElEIGFuZCB2YXJpYWJsZSBjb3VudFxuICpcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiBub2RlIGNyZWF0aW9uL3VwZGF0ZSBmYWlsc1xuICogQHRocm93cyB7RXJyb3J9IElmIGRhdGEgY2h1bmtpbmcgZmFpbHMgKGRhdGEgdG9vIGxhcmdlIGV2ZW4gYWZ0ZXIgY2h1bmtpbmcpXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiAvLyBUeXBpY2FsIHVzYWdlIGluIG1lc3NhZ2UgaGFuZGxlclxuICogY29uc3Qgc25hcHNob3QgPSBhd2FpdCBleHBvcnRCYXNlbGluZShbJ2NvbGxlY3Rpb24taWQnXSk7XG4gKiBjb25zdCByZXN1bHQgPSBhd2FpdCBzeW5jVG9Ob2RlKHNuYXBzaG90KTtcbiAqXG4gKiBjb25zb2xlLmxvZyhgU3luY2VkIHRvIG5vZGUgJHtyZXN1bHQubm9kZUlkfWApO1xuICogY29uc29sZS5sb2coYFNhdmVkICR7cmVzdWx0LnZhcmlhYmxlQ291bnR9IHZhcmlhYmxlc2ApO1xuICpcbiAqIC8vIENMSSBjYW4gbm93IGZldGNoIHZpYSBGaWdtYSBBUEk6XG4gKiAvLyBHRVQgL3YxL2ZpbGVzLzpmaWxlS2V5L25vZGVzLzpub2RlSWQ/cGx1Z2luX2RhdGE9c3lua2lvLnRva2VuLXZhdWx0XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bmNUb05vZGUoZXhwb3J0RGF0YTogdW5rbm93bik6IFByb21pc2U8e1xuICBub2RlSWQ6IHN0cmluZztcbiAgdmFyaWFibGVDb3VudDogbnVtYmVyO1xufT4ge1xuICBjb25zb2xlLmxvZygnW1N5bmNdIFN0YXJ0aW5nIHN5bmMgdG8gbm9kZS4uLicpO1xuXG4gIC8vIENhbGN1bGF0ZSB2YXJpYWJsZSBjb3VudCBmcm9tIGJhc2VsaW5lXG4gIGNvbnN0IHZhcmlhYmxlQ291bnQgPSBleHBvcnREYXRhICYmIHR5cGVvZiBleHBvcnREYXRhID09PSAnb2JqZWN0JyAmJiAnYmFzZWxpbmUnIGluIGV4cG9ydERhdGFcbiAgICA/IE9iamVjdC5rZXlzKChleHBvcnREYXRhIGFzIGFueSkuYmFzZWxpbmUpLmxlbmd0aFxuICAgIDogMDtcblxuICBjb25zb2xlLmxvZyhgW1N5bmNdIFN5bmNpbmcgJHt2YXJpYWJsZUNvdW50fSB2YXJpYWJsZXNgKTtcblxuICAvLyBDaHVuayB0aGUgZGF0YVxuICBjb25zdCBjaHVua2VkID0gY2h1bmtEYXRhKGV4cG9ydERhdGEpO1xuICBjb25zb2xlLmxvZyhgW1N5bmNdIFNwbGl0ICR7Y2h1bmtlZC50b3RhbFNpemV9IGJ5dGVzIGludG8gJHtjaHVua2VkLmNodW5rQ291bnR9IGNodW5rc2ApO1xuXG4gIC8vIEdldCBvciBjcmVhdGUgcmVnaXN0cnkgbm9kZVxuICBjb25zdCBub2RlID0gYXdhaXQgZ2V0T3JDcmVhdGVSZWdpc3RyeU5vZGUoKTtcbiAgY29uc29sZS5sb2coYFtTeW5jXSBVc2luZyByZWdpc3RyeSBub2RlOiAke25vZGUuaWR9YCk7XG5cbiAgLy8gQ2xlYXIgb2xkIGNodW5rc1xuICBjbGVhck5vZGVDaHVua3Mobm9kZSwgUExVR0lOX05BTUVTUEFDRSk7XG5cbiAgLy8gU2F2ZSBuZXcgY2h1bmtzXG4gIHNhdmVDaHVua3NUb05vZGUobm9kZSwgUExVR0lOX05BTUVTUEFDRSwgY2h1bmtlZC5jaHVua3MpO1xuXG4gIC8vIFNhdmUgbWV0YWRhdGFcbiAgY29uc3QgbWV0YWRhdGEgPSB7XG4gICAgY2h1bmtDb3VudDogY2h1bmtlZC5jaHVua0NvdW50LFxuICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIHZhcmlhYmxlQ291bnRcbiAgfTtcbiAgd3JpdGVTeW5jTWV0YWRhdGEobm9kZSwgbWV0YWRhdGEpO1xuXG4gIGNvbnNvbGUubG9nKGBbU3luY10gU3VjY2Vzc2Z1bGx5IHN5bmNlZCAke2NodW5rZWQudG90YWxTaXplfSBieXRlcyBpbiAke2NodW5rZWQuY2h1bmtDb3VudH0gY2h1bmtzIHRvIG5vZGUgJHtub2RlLmlkfWApO1xuXG4gIHJldHVybiB7XG4gICAgbm9kZUlkOiBub2RlLmlkLFxuICAgIHZhcmlhYmxlQ291bnRcbiAgfTtcbn1cblxuLyoqXG4gKiBHZXQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGxhc3Qgc3luYy5cbiAqXG4gKiBTZWFyY2hlcyBhbGwgcGFnZXMgaW4gdGhlIGN1cnJlbnQgRmlnbWEgZmlsZSBmb3IgdGhlIHJlZ2lzdHJ5IG5vZGUgYW5kIHJlYWRzXG4gKiBpdHMgbWV0YWRhdGEgdG8gZGV0ZXJtaW5lIHdoZW4gdGhlIGxhc3Qgc3luYyBvY2N1cnJlZCBhbmQgaG93IG1hbnkgdmFyaWFibGVzXG4gKiB3ZXJlIHN5bmNlZC5cbiAqXG4gKiBVc2VkIGJ5IHRoZSBVSSB0byBkaXNwbGF5IHN5bmMgc3RhdHVzIGFuZCBoZWxwIHVzZXJzIHVuZGVyc3RhbmQgaWYgdGhlaXJcbiAqIGxvY2FsIHRva2VuIGRhdGEgaXMgdXAtdG8tZGF0ZS5cbiAqXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBzeW5jIGluZm9ybWF0aW9uXG4gKiAgICAgICAgICAtIElmIHJlZ2lzdHJ5IG5vZGUgZXhpc3RzOiB7IGV4aXN0czogdHJ1ZSwgbm9kZUlkLCB1cGRhdGVkQXQsIHZhcmlhYmxlQ291bnQgfVxuICogICAgICAgICAgLSBJZiBubyBzeW5jIGZvdW5kOiB7IGV4aXN0czogZmFsc2UgfVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogY29uc3QgaW5mbyA9IGF3YWl0IGdldExhc3RTeW5jSW5mbygpO1xuICpcbiAqIGlmIChpbmZvLmV4aXN0cykge1xuICogICBjb25zb2xlLmxvZyhgTGFzdCBzeW5jZWQ6ICR7aW5mby51cGRhdGVkQXR9YCk7XG4gKiAgIGNvbnNvbGUubG9nKGBOb2RlIElEOiAke2luZm8ubm9kZUlkfWApO1xuICogICBjb25zb2xlLmxvZyhgVmFyaWFibGVzOiAke2luZm8udmFyaWFibGVDb3VudH1gKTtcbiAqIH0gZWxzZSB7XG4gKiAgIGNvbnNvbGUubG9nKCdObyBzeW5jIGZvdW5kLiBTeW5jIHRvIGNyZWF0ZSByZWdpc3RyeSBub2RlLicpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRMYXN0U3luY0luZm8oKTogUHJvbWlzZTxTeW5jSW5mbz4ge1xuICBjb25zdCBub2RlID0gYXdhaXQgZmluZFJlZ2lzdHJ5Tm9kZSgpO1xuXG4gIGlmICghbm9kZSkge1xuICAgIHJldHVybiB7IGV4aXN0czogZmFsc2UgfTtcbiAgfVxuXG4gIHJldHVybiByZWFkU3luY01ldGFkYXRhKG5vZGUpO1xufVxuXG4vLyBSZS1leHBvcnQgdHlwZXMgYW5kIHV0aWxpdGllcyBmb3IgY29udmVuaWVuY2VcbmV4cG9ydCB0eXBlIHsgU3luY0luZm8sIFN5bmNNZXRhZGF0YSB9IGZyb20gJy4uLy4uL3R5cGVzL21lc3NhZ2UudHlwZXMuanMnO1xuZXhwb3J0IHsgY2h1bmtEYXRhLCB1bmNodW5rRGF0YSB9IGZyb20gJy4vY2h1bmtlci5qcyc7XG5leHBvcnQge1xuICBmaW5kUmVnaXN0cnlOb2RlLFxuICBnZXRPckNyZWF0ZVJlZ2lzdHJ5Tm9kZSxcbiAgY3JlYXRlUmVnaXN0cnlOb2RlXG59IGZyb20gJy4vbm9kZS1tYW5hZ2VyLmpzJztcbmV4cG9ydCB7IHJlYWRTeW5jTWV0YWRhdGEsIHdyaXRlU3luY01ldGFkYXRhIH0gZnJvbSAnLi9tZXRhZGF0YS5qcyc7XG4iLCAiLyoqXG4gKiBNZXNzYWdlIGhhbmRsZXIgcm91dGVyXG4gKiBSb3V0ZXMgaW5jb21pbmcgbWVzc2FnZXMgZnJvbSBVSSB0byBhcHByb3ByaWF0ZSBiYWNrZW5kIG1vZHVsZXNcbiAqXG4gKiBUaGlzIG1vZHVsZSBzZXJ2ZXMgYXMgdGhlIGNlbnRyYWwgbWVzc2FnZSBkaXNwYXRjaGVyIGZvciB0aGUgcGx1Z2luIGJhY2tlbmQsXG4gKiByZWNlaXZpbmcgYWxsIG1lc3NhZ2VzIGZyb20gdGhlIFVJIGlmcmFtZSBhbmQgcm91dGluZyB0aGVtIHRvIHRoZSBhcHByb3ByaWF0ZVxuICogZmVhdHVyZSBoYW5kbGVycyAoaW1wb3J0LCBleHBvcnQsIHN5bmMpLlxuICpcbiAqIEBtb2R1bGUgYmFja2VuZC9oYW5kbGVycy9tZXNzYWdlLXJvdXRlclxuICovXG5cbmltcG9ydCB0eXBlIHsgVUlNZXNzYWdlLCBQbHVnaW5NZXNzYWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvbWVzc2FnZS50eXBlcy5qcyc7XG5pbXBvcnQgeyBpbXBvcnRUb2tlbnMgfSBmcm9tICcuLi9pbXBvcnQvaW5kZXguanMnO1xuaW1wb3J0IHsgZXhwb3J0QmFzZWxpbmUgfSBmcm9tICcuLi9leHBvcnQvaW5kZXguanMnO1xuaW1wb3J0IHsgc3luY1RvTm9kZSwgZ2V0TGFzdFN5bmNJbmZvIH0gZnJvbSAnLi4vc3luYy9pbmRleC5qcyc7XG5cbi8qKlxuICogSGFuZGxlIGluY29taW5nIG1lc3NhZ2UgZnJvbSBVSS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IGZvciBhbGwgVUktdG8tYmFja2VuZCBjb21tdW5pY2F0aW9uIGluIHRoZSBwbHVnaW4uXG4gKiBJdCByZWNlaXZlcyB0eXBlLXNhZmUgbWVzc2FnZXMgZnJvbSB0aGUgVUkgYW5kIHJvdXRlcyB0aGVtIHRvIGFwcHJvcHJpYXRlIGhhbmRsZXJzLlxuICpcbiAqIFRoZSBtZXNzYWdlIHJvdXRpbmcgaXMgZXhoYXVzdGl2ZSAtIFR5cGVTY3JpcHQgZW5mb3JjZXMgdGhhdCBhbGwgbWVzc2FnZSB0eXBlc1xuICogYXJlIGhhbmRsZWQgdmlhIHRoZSBuZXZlciB0eXBlIGNoZWNrIGF0IHRoZSBlbmQgb2YgdGhlIHN3aXRjaCBzdGF0ZW1lbnQuXG4gKlxuICogKipNZXNzYWdlIEZsb3c6KipcbiAqIGBgYFxuICogVUkgXHUyMTkyIG1lc3NhZ2UtYnJpZGdlLnRzIFx1MjE5MiBmaWdtYS51aS5vbm1lc3NhZ2UgXHUyMTkyIGhhbmRsZU1lc3NhZ2UgXHUyMTkyIFtoYW5kbGVyXSBcdTIxOTIgcmVzcG9uc2VcbiAqIGBgYFxuICpcbiAqICoqU3VwcG9ydGVkIE1lc3NhZ2VzOioqXG4gKiAtIGBnZXQtbGFzdC1zeW5jYDogUmV0cmlldmUgc3luYyBtZXRhZGF0YSBmcm9tIHJlZ2lzdHJ5IG5vZGVcbiAqIC0gYGdldC1jb2xsZWN0aW9uc2A6IExpc3QgYWxsIGxvY2FsIHZhcmlhYmxlIGNvbGxlY3Rpb25zXG4gKiAtIGBpbXBvcnQtdG9rZW5zYDogSW1wb3J0IHRva2VucyBmcm9tIEpTT04gZmlsZXMgaW50byBGaWdtYVxuICogLSBgZXhwb3J0LWJhc2VsaW5lYDogRXhwb3J0IHZhcmlhYmxlcyB0byBKU09OIGJhc2VsaW5lIGZvcm1hdFxuICogLSBgc3luYy10by1ub2RlYDogU3luYyB2YXJpYWJsZXMgdG8gcmVnaXN0cnkgbm9kZSBmb3IgQVBJIGFjY2Vzc1xuICogLSBgY2FuY2VsYDogQ2xvc2UgdGhlIHBsdWdpblxuICpcbiAqIEBwYXJhbSBtc2cgLSBUeXBlLXNhZmUgbWVzc2FnZSBmcm9tIFVJIChVSU1lc3NhZ2UgdW5pb24gdHlwZSlcbiAqIEByZXR1cm5zIFByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIG1lc3NhZ2UgaGFuZGxpbmcgaXMgY29tcGxldGVcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIC8vIEluIGNvZGUudHMgZW50cnkgcG9pbnRcbiAqIGZpZ21hLnVpLm9ubWVzc2FnZSA9IGFzeW5jIChtc2c6IFVJTWVzc2FnZSkgPT4ge1xuICogICBhd2FpdCBoYW5kbGVNZXNzYWdlKG1zZyk7XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVNZXNzYWdlKG1zZzogVUlNZXNzYWdlKTogUHJvbWlzZTx2b2lkPiB7XG4gIHN3aXRjaCAobXNnLnR5cGUpIHtcbiAgICBjYXNlICdnZXQtbGFzdC1zeW5jJzpcbiAgICAgIGF3YWl0IGhhbmRsZUdldExhc3RTeW5jKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2dldC1jb2xsZWN0aW9ucyc6XG4gICAgICBhd2FpdCBoYW5kbGVHZXRDb2xsZWN0aW9ucygpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdpbXBvcnQtdG9rZW5zJzpcbiAgICAgIGF3YWl0IGhhbmRsZUltcG9ydFRva2Vucyhtc2cuZGF0YS5jb2xsZWN0aW9ucyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2V4cG9ydC1iYXNlbGluZSc6XG4gICAgICBhd2FpdCBoYW5kbGVFeHBvcnRCYXNlbGluZShtc2cuY29sbGVjdGlvbklkcyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ3N5bmMtdG8tbm9kZSc6XG4gICAgICBhd2FpdCBoYW5kbGVTeW5jVG9Ob2RlKG1zZy5jb2xsZWN0aW9uSWRzKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnY2FuY2VsJzpcbiAgICAgIGhhbmRsZUNhbmNlbCgpO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgLy8gVHlwZVNjcmlwdCBleGhhdXN0aXZlbmVzcyBjaGVja1xuICAgICAgY29uc3QgX2V4aGF1c3RpdmU6IG5ldmVyID0gbXNnO1xuICAgICAgY29uc29sZS53YXJuKCdVbmtub3duIG1lc3NhZ2UgdHlwZTonLCBfZXhoYXVzdGl2ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBQb3N0IG1lc3NhZ2UgdG8gVUkuXG4gKlxuICogVHlwZS1zYWZlIHdyYXBwZXIgYXJvdW5kIGZpZ21hLnVpLnBvc3RNZXNzYWdlLiBBbGwgcmVzcG9uc2VzIHRvIHRoZSBVSVxuICogbXVzdCB1c2UgUGx1Z2luTWVzc2FnZSB0eXBlcy5cbiAqXG4gKiBAcGFyYW0gbXNnIC0gVHlwZS1zYWZlIHBsdWdpbiBtZXNzYWdlXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gcG9zdE1lc3NhZ2UobXNnOiBQbHVnaW5NZXNzYWdlKTogdm9pZCB7XG4gIGZpZ21hLnVpLnBvc3RNZXNzYWdlKG1zZyk7XG59XG5cbi8qKlxuICogSGFuZGxlIGdldC1sYXN0LXN5bmMgbWVzc2FnZS5cbiAqXG4gKiBSZXRyaWV2ZXMgYW5kIHNlbmRzIGxhc3Qgc3luYyBpbmZvcm1hdGlvbiB0byBVSS4gSWYgbm8gcmVnaXN0cnkgbm9kZSBleGlzdHNcbiAqIG9yIG1ldGFkYXRhIGNhbid0IGJlIHJlYWQsIHNlbmRzIHsgZXhpc3RzOiBmYWxzZSB9LlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVHZXRMYXN0U3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBzeW5jSW5mbyA9IGF3YWl0IGdldExhc3RTeW5jSW5mbygpO1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdsYXN0LXN5bmMtbG9hZGVkJyxcbiAgICAgIC4uLnN5bmNJbmZvXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBsYXN0IHN5bmMgaW5mbzonLCBlcnJvcik7XG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ2xhc3Qtc3luYy1sb2FkZWQnLFxuICAgICAgZXhpc3RzOiBmYWxzZVxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogSGFuZGxlIGdldC1jb2xsZWN0aW9ucyBtZXNzYWdlLlxuICpcbiAqIFJldHJpZXZlcyBhbGwgbG9jYWwgdmFyaWFibGUgY29sbGVjdGlvbnMgYW5kIHNlbmRzIHN1bW1hcnkgdG8gVUkuXG4gKiBUaGUgc3VtbWFyeSBpbmNsdWRlcyBjb2xsZWN0aW9uIElELCBuYW1lLCBtb2RlIGNvdW50LCBhbmQgdmFyaWFibGUgY291bnRcbiAqIGZvciBkaXNwbGF5IGluIGV4cG9ydC9zeW5jIHRhYnMuXG4gKlxuICogQGludGVybmFsXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUdldENvbGxlY3Rpb25zKCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbGxlY3Rpb25zID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldExvY2FsVmFyaWFibGVDb2xsZWN0aW9uc0FzeW5jKCk7XG4gICAgY29uc3QgYWxsVmFyaWFibGVzID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldExvY2FsVmFyaWFibGVzQXN5bmMoKTtcblxuICAgIGNvbnN0IGNvbGxlY3Rpb25EYXRhID0gY29sbGVjdGlvbnMubWFwKGNvbCA9PiAoe1xuICAgICAgaWQ6IGNvbC5pZCxcbiAgICAgIG5hbWU6IGNvbC5uYW1lLFxuICAgICAgbW9kZUNvdW50OiBjb2wubW9kZXMubGVuZ3RoLFxuICAgICAgdmFyaWFibGVDb3VudDogYWxsVmFyaWFibGVzLmZpbHRlcih2ID0+IHYudmFyaWFibGVDb2xsZWN0aW9uSWQgPT09IGNvbC5pZCkubGVuZ3RoXG4gICAgfSkpO1xuXG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ2NvbGxlY3Rpb25zLWxvYWRlZCcsXG4gICAgICBjb2xsZWN0aW9uczogY29sbGVjdGlvbkRhdGFcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIGNvbGxlY3Rpb25zOicsIGVycm9yKTtcbiAgfVxufVxuXG4vKipcbiAqIEhhbmRsZSBpbXBvcnQtdG9rZW5zIG1lc3NhZ2UuXG4gKlxuICogT3JjaGVzdHJhdGVzIHRoZSB0b2tlbiBpbXBvcnQgZmxvdyBieSBkZWxlZ2F0aW5nIHRvIHRoZSBpbXBvcnQgbW9kdWxlLlxuICogU2VuZHMgc3VjY2VzcyBvciBlcnJvciBtZXNzYWdlIGJhY2sgdG8gVUkgd2hlbiBjb21wbGV0ZS5cbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvbnMgLSBBcnJheSBvZiBjb2xsZWN0aW9uIGNvbmZpZ3VyYXRpb25zIHdpdGggdG9rZW4gZGF0YVxuICogQGludGVybmFsXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUltcG9ydFRva2Vucyhjb2xsZWN0aW9uczogYW55W10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBpbXBvcnRUb2tlbnMoY29sbGVjdGlvbnMpO1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdpbXBvcnQtY29tcGxldGUnLFxuICAgICAgbWVzc2FnZTogJ1Rva2VucyBpbXBvcnRlZCBzdWNjZXNzZnVsbHkhJ1xuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdpbXBvcnQtZXJyb3InLFxuICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgZXhwb3J0LWJhc2VsaW5lIG1lc3NhZ2UuXG4gKlxuICogRXhwb3J0cyBiYXNlbGluZSBzbmFwc2hvdCBhbmQgc2VuZHMgdG8gVUkgZm9yIGRpc3BsYXkvZG93bmxvYWQuXG4gKiBTdXBwb3J0cyBvcHRpb25hbCBjb2xsZWN0aW9uIGZpbHRlcmluZy5cbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvbklkcyAtIEFycmF5IG9mIGNvbGxlY3Rpb24gSURzIHRvIGV4cG9ydCAoZW1wdHkgPSBhbGwpXG4gKiBAaW50ZXJuYWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlRXhwb3J0QmFzZWxpbmUoY29sbGVjdGlvbklkczogc3RyaW5nW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZygnRXhwb3J0IGJhc2VsaW5lIHJlcXVlc3RlZCcpO1xuICAgIGZpZ21hLm5vdGlmeSgnRXhwb3J0aW5nIGJhc2VsaW5lIHNuYXBzaG90Li4uJyk7XG5cbiAgICBjb25zdCBmaWx0ZXJJZHMgPSBjb2xsZWN0aW9uSWRzICYmIGNvbGxlY3Rpb25JZHMubGVuZ3RoID4gMCA/IGNvbGxlY3Rpb25JZHMgOiBudWxsO1xuICAgIGNvbnN0IGJhc2VsaW5lID0gYXdhaXQgZXhwb3J0QmFzZWxpbmUoZmlsdGVySWRzKTtcbiAgICBjb25zdCBqc29uU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoYmFzZWxpbmUpO1xuXG4gICAgY29uc29sZS5sb2coJ0V4cG9ydCBjb21wbGV0ZSwgZGF0YSBzaXplOicsIGpzb25TdHJpbmcubGVuZ3RoLCAnYnl0ZXMnKTtcblxuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdleHBvcnQtY29tcGxldGUnLFxuICAgICAgZGF0YTogYmFzZWxpbmVcbiAgICB9KTtcblxuICAgIGZpZ21hLm5vdGlmeSgnRXhwb3J0IGNvbXBsZXRlIScpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0V4cG9ydCBlcnJvcjonLCBlcnJvcik7XG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuXG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ2V4cG9ydC1lcnJvcicsXG4gICAgICBtZXNzYWdlOiBlcnJvck1lc3NhZ2VcbiAgICB9KTtcblxuICAgIGZpZ21hLm5vdGlmeSgnRXhwb3J0IGZhaWxlZDogJyArIGVycm9yTWVzc2FnZSwgeyBlcnJvcjogdHJ1ZSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEhhbmRsZSBzeW5jLXRvLW5vZGUgbWVzc2FnZS5cbiAqXG4gKiBTeW5jcyB0b2tlbiByZWdpc3RyeSB0byBub2RlIGZvciBBUEkgYWNjZXNzIGJ5IHRoZSBTeW5raW8gQ0xJLlxuICogVGhpcyBlbmFibGVzIGRldmVsb3BlcnMgdG8gZmV0Y2ggdG9rZW5zIHdpdGhvdXQgbWFudWFsIHBsdWdpbiBpbnRlcmFjdGlvbi5cbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvbklkcyAtIEFycmF5IG9mIGNvbGxlY3Rpb24gSURzIHRvIHN5bmMgKGVtcHR5ID0gYWxsKVxuICogQGludGVybmFsXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVN5bmNUb05vZGUoY29sbGVjdGlvbklkczogc3RyaW5nW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZygnU3luYyB0byBOb2RlIHJlcXVlc3RlZCcpO1xuICAgIGZpZ21hLm5vdGlmeSgnU3luY2luZyByZWdpc3RyeSB0byBub2RlLi4uJyk7XG5cbiAgICBjb25zdCBmaWx0ZXJJZHMgPSBjb2xsZWN0aW9uSWRzICYmIGNvbGxlY3Rpb25JZHMubGVuZ3RoID4gMCA/IGNvbGxlY3Rpb25JZHMgOiBudWxsO1xuXG4gICAgLy8gRXhwb3J0IGJhc2VsaW5lIGZpcnN0XG4gICAgY29uc3QgZXhwb3J0RGF0YSA9IGF3YWl0IGV4cG9ydEJhc2VsaW5lKGZpbHRlcklkcyk7XG5cbiAgICAvLyBUaGVuIHN5bmMgdG8gbm9kZVxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHN5bmNUb05vZGUoZXhwb3J0RGF0YSk7XG5cbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiAnc3luYy1jb21wbGV0ZScsXG4gICAgICBub2RlSWQ6IHJlc3VsdC5ub2RlSWQsXG4gICAgICB2YXJpYWJsZUNvdW50OiByZXN1bHQudmFyaWFibGVDb3VudFxuICAgIH0pO1xuXG4gICAgZmlnbWEubm90aWZ5KGBcdTI3MTMgU3luY2VkICR7cmVzdWx0LnZhcmlhYmxlQ291bnR9IHZhcmlhYmxlcyB0byBub2RlIWApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1N5bmMgZXJyb3I6JywgZXJyb3IpO1xuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcblxuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdzeW5jLWVycm9yJyxcbiAgICAgIG1lc3NhZ2U6IGVycm9yTWVzc2FnZVxuICAgIH0pO1xuXG4gICAgZmlnbWEubm90aWZ5KCdTeW5jIGZhaWxlZDogJyArIGVycm9yTWVzc2FnZSwgeyBlcnJvcjogdHJ1ZSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEhhbmRsZSBjYW5jZWwgbWVzc2FnZS5cbiAqXG4gKiBDbG9zZXMgdGhlIHBsdWdpbiB3aGVuIHVzZXIgY2xpY2tzIGNhbmNlbCBidXR0b24uXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUNhbmNlbCgpOiB2b2lkIHtcbiAgZmlnbWEuY2xvc2VQbHVnaW4oKTtcbn1cbiIsICIvKipcbiAqIFRva2VuIFZhdWx0IC0gRmlnbWEgUGx1Z2luIEVudHJ5IFBvaW50XG4gKiBJbXBvcnQsIGV4cG9ydCwgYW5kIHN5bmMgZGVzaWduIHRva2VucyBhcyBGaWdtYSBWYXJpYWJsZXNcbiAqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IGZvciB0aGUgcGx1Z2luIGJhY2tlbmQuXG4gKiBBbGwgYnVzaW5lc3MgbG9naWMgaXMgZGVsZWdhdGVkIHRvIHNwZWNpYWxpemVkIG1vZHVsZXMuXG4gKlxuICogQG1vZHVsZSBjb2RlXG4gKi9cblxuaW1wb3J0IHsgaGFuZGxlTWVzc2FnZSB9IGZyb20gJy4vYmFja2VuZC9oYW5kbGVycy9tZXNzYWdlLXJvdXRlci5qcyc7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBwbHVnaW4gVUlcbiAqIFNob3dzIHRoZSBwbHVnaW4gd2luZG93IHdpdGggY29uZmlndXJlZCBkaW1lbnNpb25zIGFuZCB0aGVtZSBzdXBwb3J0XG4gKi9cbmZpZ21hLnNob3dVSShfX2h0bWxfXywge1xuICB3aWR0aDogNjAwLFxuICBoZWlnaHQ6IDcwMCxcbiAgdGhlbWVDb2xvcnM6IHRydWVcbn0pO1xuXG4vKipcbiAqIE1lc3NhZ2UgaGFuZGxlclxuICogUm91dGVzIGFsbCBtZXNzYWdlcyBmcm9tIFVJIHRvIHRoZSBtZXNzYWdlIHJvdXRlclxuICovXG5maWdtYS51aS5vbm1lc3NhZ2UgPSBhc3luYyAobXNnKSA9PiB7XG4gIGF3YWl0IGhhbmRsZU1lc3NhZ2UobXNnKTtcbn07XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFTQSxlQUFzQix1QkFBdUIsTUFBMkM7QUFDdEYsUUFBTSxjQUFjLE1BQU0sTUFBTSxVQUFVLGlDQUFpQztBQUMzRSxNQUFJLGFBQWEsWUFBWSxLQUFLLE9BQUssRUFBRSxTQUFTLElBQUk7QUFFdEQsTUFBSSxDQUFDLFlBQVk7QUFDZixpQkFBYSxNQUFNLFVBQVUseUJBQXlCLElBQUk7QUFBQSxFQUM1RDtBQUVBLFNBQU87QUFDVDtBQVFPLFNBQVMsV0FDZCxZQUNBLFFBQ3FCO0FBQ3JCLFFBQU0sY0FBYyxvQkFBSSxJQUFvQjtBQUU1QyxNQUFJLE9BQU8sa0JBQWtCO0FBRTNCLFVBQU0sY0FBYyxXQUFXLE1BQU0sQ0FBQztBQUV0QyxhQUFTLElBQUksR0FBRyxJQUFJLE9BQU8sTUFBTSxRQUFRLEtBQUs7QUFDNUMsWUFBTSxPQUFPLE9BQU8sTUFBTSxDQUFDO0FBQzNCLFVBQUk7QUFFSixVQUFJLE1BQU0sR0FBRztBQUVYLGlCQUFTLFlBQVk7QUFDckIsbUJBQVcsV0FBVyxRQUFRLEtBQUssSUFBSTtBQUFBLE1BQ3pDLE9BQU87QUFFTCxpQkFBUyxXQUFXLFFBQVEsS0FBSyxJQUFJO0FBQUEsTUFDdkM7QUFFQSxrQkFBWSxJQUFJLEtB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
