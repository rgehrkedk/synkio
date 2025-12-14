var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/backend/utils/type-mappers.ts
function mapFigmaTypeToTokenType(figmaType) {
  const typeMap = {
    "COLOR": "color",
    "FLOAT": "number",
    "STRING": "string",
    "BOOLEAN": "boolean"
  };
  return typeMap[figmaType] || "string";
}
var init_type_mappers = __esm({
  "src/backend/utils/type-mappers.ts"() {
    "use strict";
  }
});

// src/backend/utils/parsers.ts
function rgbToHex(color) {
  const toHex = (value) => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}
var init_parsers = __esm({
  "src/backend/utils/parsers.ts"() {
    "use strict";
  }
});

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
var init_transformer = __esm({
  "src/backend/export/transformer.ts"() {
    "use strict";
    init_parsers();
  }
});

// src/backend/utils/constants.ts
var constants_exports = {};
__export(constants_exports, {
  BASELINE_VERSION: () => BASELINE_VERSION,
  CHUNK_SIZE: () => CHUNK_SIZE,
  LEGACY_NAMESPACE: () => LEGACY_NAMESPACE,
  PLUGIN_NAMESPACE: () => PLUGIN_NAMESPACE,
  PLUGIN_VERSION: () => PLUGIN_VERSION,
  REGISTRY_NODE_NAME: () => REGISTRY_NODE_NAME
});
var PLUGIN_NAMESPACE, LEGACY_NAMESPACE, REGISTRY_NODE_NAME, CHUNK_SIZE, PLUGIN_VERSION, BASELINE_VERSION;
var init_constants = __esm({
  "src/backend/utils/constants.ts"() {
    "use strict";
    PLUGIN_NAMESPACE = "token_vault";
    LEGACY_NAMESPACE = "design_token_importer";
    REGISTRY_NODE_NAME = "_token_registry";
    CHUNK_SIZE = 9e4;
    PLUGIN_VERSION = "2.0.0";
    BASELINE_VERSION = "2.0.0";
  }
});

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
function unchunkData(chunks) {
  const jsonData = chunks.join("");
  try {
    return JSON.parse(jsonData);
  } catch (error) {
    throw new Error(`Failed to parse unchunked data: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
var init_chunker = __esm({
  "src/backend/sync/chunker.ts"() {
    "use strict";
    init_constants();
  }
});

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
function loadChunksFromNode(node, namespace, chunkCount) {
  const chunks = [];
  for (let i = 0; i < chunkCount; i++) {
    const chunk = node.getSharedPluginData(namespace, `registry_${i}`);
    chunks.push(chunk);
  }
  return chunks;
}
var init_node_manager = __esm({
  "src/backend/sync/node-manager.ts"() {
    "use strict";
    init_constants();
  }
});

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
var init_metadata = __esm({
  "src/backend/sync/metadata.ts"() {
    "use strict";
    init_constants();
  }
});

// src/backend/sync/index.ts
var sync_exports = {};
__export(sync_exports, {
  chunkData: () => chunkData,
  createRegistryNode: () => createRegistryNode,
  findRegistryNode: () => findRegistryNode,
  getLastSyncInfo: () => getLastSyncInfo,
  getOrCreateRegistryNode: () => getOrCreateRegistryNode,
  loadChunksFromNode: () => loadChunksFromNode,
  readSyncMetadata: () => readSyncMetadata,
  syncToNode: () => syncToNode,
  unchunkData: () => unchunkData,
  writeSyncMetadata: () => writeSyncMetadata
});
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
var init_sync = __esm({
  "src/backend/sync/index.ts"() {
    "use strict";
    init_chunker();
    init_node_manager();
    init_metadata();
    init_constants();
    init_chunker();
    init_node_manager();
    init_metadata();
  }
});

// src/backend/export/baseline.ts
var baseline_exports = {};
__export(baseline_exports, {
  buildBaselineSnapshot: () => buildBaselineSnapshot
});
async function getCurrentStoredVersion() {
  var _a;
  try {
    const node = await findRegistryNode();
    if (!node) {
      return "1.0.0";
    }
    const chunkCountStr = node.getSharedPluginData(PLUGIN_NAMESPACE, "chunkCount");
    if (!chunkCountStr) {
      return "1.0.0";
    }
    const chunkCount = parseInt(chunkCountStr, 10);
    const chunks = loadChunksFromNode(node, PLUGIN_NAMESPACE, chunkCount);
    const storedBaseline = unchunkData(chunks);
    return ((_a = storedBaseline == null ? void 0 : storedBaseline.$metadata) == null ? void 0 : _a.version) || "1.0.0";
  } catch (error) {
    console.warn("Failed to read stored version, defaulting to 1.0.0:", error);
    return "1.0.0";
  }
}
async function buildBaselineSnapshot(filterCollectionIds = null) {
  let collections = await figma.variables.getLocalVariableCollectionsAsync();
  const allVariables = await figma.variables.getLocalVariablesAsync();
  if (filterCollectionIds && filterCollectionIds.length > 0) {
    collections = collections.filter((c) => filterCollectionIds.includes(c.id));
  }
  const registryNode = await findRegistryNode();
  const registryNodeId = registryNode == null ? void 0 : registryNode.id;
  const collectionMetadata = collections.map((col) => {
    const colVariables = allVariables.filter((v) => v.variableCollectionId === col.id);
    return {
      id: col.id,
      name: col.name,
      modeCount: col.modes.length,
      variableCount: colVariables.length,
      modes: col.modes.map((m) => ({ id: m.modeId, name: m.name }))
    };
  });
  const totalVariableCount = collections.reduce((sum, col) => {
    return sum + allVariables.filter((v) => v.variableCollectionId === col.id).length;
  }, 0);
  const storedVersion = await getCurrentStoredVersion();
  const output = {
    $metadata: {
      version: storedVersion,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      pluginVersion: "2.0.0",
      fileKey: figma.fileKey || "",
      fileName: figma.root.name,
      registryNodeId,
      variableCount: totalVariableCount,
      collectionCount: collections.length,
      collections: collectionMetadata
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
          mode: modeName,
          variableId: variable.id,
          collectionId: collection.id,
          modeId: mode.modeId,
          description: variable.description || void 0
        };
      }
    }
  }
  return output;
}
var init_baseline = __esm({
  "src/backend/export/baseline.ts"() {
    "use strict";
    init_type_mappers();
    init_transformer();
    init_sync();
    init_constants();
  }
});

// src/backend/export/index.ts
var export_exports = {};
__export(export_exports, {
  buildBaselineSnapshot: () => buildBaselineSnapshot,
  exportBaseline: () => exportBaseline,
  resolveVariableValue: () => resolveVariableValue,
  setNestedValue: () => setNestedValue
});
async function exportBaseline(filterCollectionIds = null) {
  return buildBaselineSnapshot(filterCollectionIds);
}
var init_export = __esm({
  "src/backend/export/index.ts"() {
    "use strict";
    init_baseline();
    init_transformer();
    init_baseline();
  }
});

// src/backend/utils/baseline-detector.ts
var baseline_detector_exports = {};
__export(baseline_detector_exports, {
  detectBaselineFormat: () => detectBaselineFormat,
  isVersionCompatible: () => isVersionCompatible
});
function detectBaselineFormat(json) {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { isBaseline: false };
  }
  if (!json.$metadata || !json.baseline) {
    return { isBaseline: false };
  }
  const metadata = json.$metadata;
  if (!metadata || typeof metadata !== "object") {
    return { isBaseline: false };
  }
  if (!metadata.version || !metadata.exportedAt) {
    return { isBaseline: false };
  }
  if (!json.baseline || typeof json.baseline !== "object" || Array.isArray(json.baseline)) {
    return { isBaseline: false };
  }
  const collections = extractCollectionSummaries(json.baseline);
  const allModes = /* @__PURE__ */ new Set();
  collections.forEach((col) => col.modes.forEach((mode) => allModes.add(mode)));
  return {
    isBaseline: true,
    metadata: {
      version: metadata.version,
      exportedAt: metadata.exportedAt,
      pluginVersion: metadata.pluginVersion || "unknown",
      fileKey: metadata.fileKey || void 0,
      fileName: metadata.fileName || void 0
    },
    collections,
    totalTokens: Object.keys(json.baseline).length,
    totalCollections: collections.length,
    totalModes: allModes.size
  };
}
function extractCollectionSummaries(baseline) {
  const collectionMap = /* @__PURE__ */ new Map();
  for (const [key, token] of Object.entries(baseline)) {
    if (!token || typeof token !== "object") {
      continue;
    }
    const tokenData = token;
    const collectionName = tokenData.collection;
    const modeName = tokenData.mode;
    if (!collectionName || !modeName) {
      continue;
    }
    if (!collectionMap.has(collectionName)) {
      collectionMap.set(collectionName, {
        modes: /* @__PURE__ */ new Set(),
        tokenCount: 0
      });
    }
    const collection = collectionMap.get(collectionName);
    collection.modes.add(modeName);
    collection.tokenCount++;
  }
  return Array.from(collectionMap.entries()).map(([name, data]) => ({
    name,
    modeCount: data.modes.size,
    tokenCount: data.tokenCount,
    modes: Array.from(data.modes).sort()
  })).sort((a, b) => a.name.localeCompare(b.name));
}
function isVersionCompatible(version) {
  const parts = version.split(".");
  if (parts.length < 1) {
    return {
      compatible: false,
      warning: "Invalid version format"
    };
  }
  const major = parseInt(parts[0], 10);
  if (isNaN(major)) {
    return {
      compatible: false,
      warning: "Invalid version format"
    };
  }
  const currentMajor = 2;
  if (major < currentMajor) {
    return {
      compatible: false,
      warning: `Baseline version ${version} is outdated. Current version is ${currentMajor}.x.x`
    };
  }
  if (major > currentMajor) {
    return {
      compatible: true,
      warning: `Baseline was exported from a newer version (${version}). Some features may not be supported.`
    };
  }
  return { compatible: true };
}
var init_baseline_detector = __esm({
  "src/backend/utils/baseline-detector.ts"() {
    "use strict";
  }
});

// src/backend/utils/baseline-validator.ts
var baseline_validator_exports = {};
__export(baseline_validator_exports, {
  getBrokenAliases: () => getBrokenAliases,
  hasValidationErrors: () => hasValidationErrors,
  validateBaseline: () => validateBaseline
});
function validateBaseline(baseline) {
  const brokenAliases = [];
  const circularReferences = [];
  const warnings = [];
  if (!baseline || typeof baseline !== "object") {
    return {
      valid: false,
      brokenAliases: [],
      circularReferences: [],
      errorCount: 1,
      warnings: ["Invalid baseline format: expected object"]
    };
  }
  if (!baseline.baseline) {
    return {
      valid: false,
      brokenAliases: [],
      circularReferences: [],
      errorCount: 1,
      warnings: ["Invalid baseline format: missing baseline property"]
    };
  }
  const tokens = baseline.baseline;
  if (typeof tokens !== "object" || Array.isArray(tokens)) {
    return {
      valid: false,
      brokenAliases: [],
      circularReferences: [],
      errorCount: 1,
      warnings: ["Invalid baseline format: baseline must be an object"]
    };
  }
  const pathToKey = buildPathIndex(tokens);
  for (const [key, token] of Object.entries(tokens)) {
    if (!token || typeof token !== "object") {
      continue;
    }
    const t = token;
    if (isAlias(t.value)) {
      const referencePath = extractReferencePath(t.value);
      if (!pathToKey.has(referencePath)) {
        brokenAliases.push({
          tokenPath: t.path || key,
          tokenKey: key,
          aliasReference: t.value,
          referencePath,
          error: `Referenced token "${referencePath}" does not exist`
        });
      }
    }
  }
  const circular = detectCircularReferences(tokens, pathToKey);
  circularReferences.push(...circular);
  const errorCount = brokenAliases.length + circularReferences.length;
  return {
    valid: errorCount === 0,
    brokenAliases,
    circularReferences,
    errorCount,
    warnings
  };
}
function buildPathIndex(tokens) {
  const index = /* @__PURE__ */ new Map();
  for (const [key, token] of Object.entries(tokens)) {
    if (!token || typeof token !== "object") {
      continue;
    }
    const t = token;
    if (t.path) {
      index.set(t.path, key);
    }
  }
  return index;
}
function isAlias(value) {
  return typeof value === "string" && value.startsWith("{") && value.endsWith("}") && value.length > 2;
}
function extractReferencePath(aliasValue) {
  return aliasValue.slice(1, -1);
}
function detectCircularReferences(tokens, pathToKey) {
  const circular = [];
  const visited = /* @__PURE__ */ new Set();
  const recursionStack = /* @__PURE__ */ new Set();
  function visit(path, stack) {
    if (recursionStack.has(path)) {
      const cycleStart = stack.indexOf(path);
      const cycle = [...stack.slice(cycleStart), path];
      circular.push({
        path: cycle,
        error: `Circular reference detected: ${cycle.join(" \u2192 ")}`
      });
      return true;
    }
    if (visited.has(path)) {
      return false;
    }
    visited.add(path);
    recursionStack.add(path);
    stack.push(path);
    const key = pathToKey.get(path);
    if (key) {
      const token = tokens[key];
      if (token && isAlias(token.value)) {
        const refPath = extractReferencePath(token.value);
        visit(refPath, [...stack]);
      }
    }
    recursionStack.delete(path);
    return false;
  }
  for (const [key, token] of Object.entries(tokens)) {
    if (!token || typeof token !== "object") {
      continue;
    }
    const t = token;
    if (t.path) {
      visit(t.path, []);
    }
  }
  return circular;
}
function hasValidationErrors(baseline) {
  const result = validateBaseline(baseline);
  return !result.valid;
}
function getBrokenAliases(baseline) {
  const result = validateBaseline(baseline);
  return result.brokenAliases;
}
var init_baseline_validator = __esm({
  "src/backend/utils/baseline-validator.ts"() {
    "use strict";
  }
});

// src/backend/import/baseline-importer.ts
var baseline_importer_exports = {};
__export(baseline_importer_exports, {
  importBaseline: () => importBaseline
});
async function importBaseline(baseline, options = { updateExisting: true }) {
  var _a, _b;
  const errors = [];
  const warnings = [];
  try {
    if (!baseline || !baseline.baseline || typeof baseline.baseline !== "object") {
      return {
        success: false,
        collectionsCreated: 0,
        collectionsUpdated: 0,
        modesCreated: 0,
        variablesCreated: 0,
        variablesUpdated: 0,
        errors: ["Invalid baseline format: missing baseline property"],
        warnings
      };
    }
    const metadata = baseline.$metadata || {};
    const importedVersion = metadata.version || "1.0.0";
    let previousVersion;
    try {
      const { findRegistryNode: findRegistryNode2, loadChunksFromNode: loadChunksFromNode2, unchunkData: unchunkData2 } = await Promise.resolve().then(() => (init_sync(), sync_exports));
      const { PLUGIN_NAMESPACE: PLUGIN_NAMESPACE2 } = await Promise.resolve().then(() => (init_constants(), constants_exports));
      const node = await findRegistryNode2();
      if (node) {
        const chunkCountStr = node.getSharedPluginData(PLUGIN_NAMESPACE2, "chunkCount");
        if (chunkCountStr) {
          const chunkCount = parseInt(chunkCountStr, 10);
          const chunks = loadChunksFromNode2(node, PLUGIN_NAMESPACE2, chunkCount);
          const storedBaseline = unchunkData2(chunks);
          previousVersion = (_a = storedBaseline == null ? void 0 : storedBaseline.$metadata) == null ? void 0 : _a.version;
        }
      }
    } catch (e) {
    }
    if (previousVersion && importedVersion !== previousVersion) {
      const importedParts = importedVersion.split(".").map(Number);
      const previousParts = previousVersion.split(".").map(Number);
      const isOlder = importedParts[0] < previousParts[0] || importedParts[0] === previousParts[0] && importedParts[1] < previousParts[1] || importedParts[0] === previousParts[0] && importedParts[1] === previousParts[1] && importedParts[2] < previousParts[2];
      if (isOlder) {
        warnings.push(`Importing older version (${importedVersion}) over newer version (${previousVersion}). This may overwrite recent changes.`);
      } else {
        warnings.push(`Importing version ${importedVersion} (current: ${previousVersion})`);
      }
    }
    if (options.validateFileKey && metadata.fileKey && figma.fileKey) {
      if (metadata.fileKey !== figma.fileKey) {
        warnings.push(
          `Baseline was exported from a different file (${metadata.fileName || "unknown"}). Variables will be created as new instead of updating existing ones.`
        );
        options = __spreadProps(__spreadValues({}, options), { updateExisting: false });
      }
    }
    const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
    const existingVariables = await figma.variables.getLocalVariablesAsync();
    const collectionById = new Map(existingCollections.map((c) => [c.id, c]));
    const collectionByName = new Map(existingCollections.map((c) => [c.name, c]));
    const variableById = new Map(existingVariables.map((v) => [v.id, v]));
    const variableByKey = /* @__PURE__ */ new Map();
    for (const v of existingVariables) {
      const collection = collectionById.get(v.variableCollectionId);
      if (collection) {
        const key = `${collection.name}:${v.name}`;
        variableByKey.set(key, v);
      }
    }
    const collections = parseBaselineToCollections(baseline);
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
          updateExisting: (_b = options.updateExisting) != null ? _b : true,
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
      errors: [`Import failed: ${error.message}`],
      warnings
    };
  }
}
function parseBaselineToCollections(baseline) {
  var _a;
  const collections = /* @__PURE__ */ new Map();
  const tokens = baseline.baseline || {};
  const metadata = baseline.$metadata || {};
  const collectionMetaById = /* @__PURE__ */ new Map();
  if (metadata.collections) {
    for (const col of metadata.collections) {
      collectionMetaById.set(col.id, col);
    }
  }
  for (const [key, token] of Object.entries(tokens)) {
    const t = token;
    const collectionName = t.collection;
    const modeName = t.mode;
    if (!collectionName || !modeName) {
      continue;
    }
    if (!collections.has(collectionName)) {
      const colMeta = Array.from(collectionMetaById.values()).find((c) => c.name === collectionName);
      collections.set(collectionName, {
        name: collectionName,
        originalId: (colMeta == null ? void 0 : colMeta.id) || t.collectionId,
        modes: /* @__PURE__ */ new Map()
      });
    }
    const collection = collections.get(collectionName);
    if (!collection.modes.has(modeName)) {
      const colMeta = Array.from(collectionMetaById.values()).find((c) => c.name === collectionName);
      const modeMeta = (_a = colMeta == null ? void 0 : colMeta.modes) == null ? void 0 : _a.find((m) => m.name === modeName);
      collection.modes.set(modeName, {
        name: modeName,
        originalId: (modeMeta == null ? void 0 : modeMeta.id) || t.modeId,
        variables: /* @__PURE__ */ new Map()
      });
    }
    const mode = collection.modes.get(modeName);
    const variableName = extractVariableName(t.path, collectionName, modeName);
    mode.variables.set(variableName, {
      name: variableName,
      value: t.value,
      type: t.type,
      resolvedType: mapToFigmaType2(t.type),
      description: t.description,
      originalVariableId: t.variableId,
      originalCollectionId: t.collectionId,
      originalModeId: t.modeId
    });
  }
  return collections;
}
function extractVariableName(path, collection, mode) {
  let name = path;
  if (name.startsWith(collection + ".")) {
    name = name.slice(collection.length + 1);
  }
  if (name.startsWith(mode + ".")) {
    name = name.slice(mode.length + 1);
  }
  return name.replace(/\./g, "/");
}
function mapToFigmaType2(tokenType) {
  const typeMap = {
    "color": "COLOR",
    "number": "FLOAT",
    "dimension": "FLOAT",
    "spacing": "FLOAT",
    "fontSize": "FLOAT",
    "fontFamily": "STRING",
    "fontWeight": "STRING",
    "string": "STRING",
    "boolean": "BOOLEAN"
  };
  return typeMap[tokenType] || "STRING";
}
async function createOrUpdateCollectionInFigma(name, data, ctx) {
  const errors = [];
  const warnings = [];
  let collectionsCreated = 0;
  let collectionsUpdated = 0;
  let modesCreated = 0;
  let variablesCreated = 0;
  let variablesUpdated = 0;
  try {
    let collection;
    let isNewCollection = false;
    if (ctx.updateExisting) {
      if (data.originalId && ctx.collectionById.has(data.originalId)) {
        collection = ctx.collectionById.get(data.originalId);
        collectionsUpdated = 1;
        console.log(`[BaselineImporter] Matched collection by ID: ${name}`);
      } else if (ctx.collectionByName.has(name)) {
        collection = ctx.collectionByName.get(name);
        collectionsUpdated = 1;
        console.log(`[BaselineImporter] Matched collection by name: ${name}`);
      } else {
        collection = figma.variables.createVariableCollection(name);
        isNewCollection = true;
        collectionsCreated = 1;
        console.log(`[BaselineImporter] Created new collection: ${name}`);
      }
    } else {
      collection = figma.variables.createVariableCollection(name);
      isNewCollection = true;
      collectionsCreated = 1;
    }
    const modeNames = Array.from(data.modes.keys());
    const modeIdMap = /* @__PURE__ */ new Map();
    if (isNewCollection) {
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
      const existingModes = new Map(collection.modes.map((m) => [m.name, m.modeId]));
      for (const modeName of modeNames) {
        const modeData = data.modes.get(modeName);
        if (existingModes.has(modeName)) {
          modeIdMap.set(modeName, existingModes.get(modeName));
        } else if (modeData.originalId) {
          const existingModeById = collection.modes.find((m) => m.modeId === modeData.originalId);
          if (existingModeById) {
            modeIdMap.set(modeName, existingModeById.modeId);
            if (existingModeById.name !== modeName) {
              collection.renameMode(existingModeById.modeId, modeName);
            }
          } else {
            const modeId = collection.addMode(modeName);
            modeIdMap.set(modeName, modeId);
            modesCreated++;
          }
        } else {
          const modeId = collection.addMode(modeName);
          modeIdMap.set(modeName, modeId);
          modesCreated++;
        }
      }
    }
    const variableMap = /* @__PURE__ */ new Map();
    for (const [modeName, modeData] of data.modes) {
      for (const [varName, variable] of modeData.variables) {
        if (!variableMap.has(varName)) {
          variableMap.set(varName, /* @__PURE__ */ new Map());
        }
        variableMap.get(varName).set(modeName, variable);
      }
    }
    for (const [varName, modeVariables] of variableMap) {
      try {
        const firstVar = Array.from(modeVariables.values())[0];
        let figmaVar;
        let isNewVariable = false;
        if (ctx.updateExisting) {
          if (firstVar.originalVariableId && ctx.variableById.has(firstVar.originalVariableId)) {
            figmaVar = ctx.variableById.get(firstVar.originalVariableId);
            variablesUpdated++;
          } else {
            const key = `${name}:${varName}`;
            if (ctx.variableByKey.has(key)) {
              figmaVar = ctx.variableByKey.get(key);
              variablesUpdated++;
            }
          }
        }
        if (!figmaVar) {
          figmaVar = figma.variables.createVariable(
            varName,
            collection,
            firstVar.resolvedType
          );
          isNewVariable = true;
          variablesCreated++;
        }
        if (firstVar.description) {
          figmaVar.description = firstVar.description;
        }
        for (const [modeName, modeVar] of modeVariables) {
          const modeId = modeIdMap.get(modeName);
          if (modeId) {
            const value = parseValue2(modeVar.value, modeVar.resolvedType);
            try {
              figmaVar.setValueForMode(modeId, value);
            } catch (error) {
              errors.push(
                `Failed to set value for "${varName}" in mode "${modeName}": ${error.message}`
              );
            }
          }
        }
      } catch (error) {
        errors.push(`Failed to process variable "${varName}": ${error.message}`);
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
      errors: [`Failed to process collection "${name}": ${error.message}`],
      warnings
    };
  }
}
function parseValue2(value, type) {
  if (type === "COLOR") {
    return parseColor2(value);
  } else if (type === "FLOAT") {
    return parseFloat(value);
  } else if (type === "BOOLEAN") {
    return Boolean(value);
  } else {
    return String(value);
  }
}
function parseColor2(colorString) {
  if (typeof colorString === "string" && colorString.startsWith("#")) {
    const hex = colorString.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}
var init_baseline_importer = __esm({
  "src/backend/import/baseline-importer.ts"() {
    "use strict";
  }
});

// src/backend/handlers/message-router.ts
init_export();
init_sync();

// src/backend/utils/structure-analyzer.ts
function analyzeJsonStructure(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid JSON data: expected object");
  }
  const levelMap = /* @__PURE__ */ new Map();
  const sampleMap = /* @__PURE__ */ new Map();
  let maxDepth = 0;
  let hasTokenValues = false;
  function traverse(obj, depth, path = []) {
    if (depth > maxDepth) {
      maxDepth = depth;
    }
    if (!levelMap.has(depth)) {
      levelMap.set(depth, /* @__PURE__ */ new Set());
      sampleMap.set(depth, []);
    }
    const keys = levelMap.get(depth);
    const samples = sampleMap.get(depth);
    for (const [key, value] of Object.entries(obj)) {
      keys.add(key);
      const currentPath = [...path, key];
      if (samples.length < 3) {
        samples.push({
          path: currentPath.join("."),
          value: getValuePreview(value),
          type: getValueType(value)
        });
      }
      if (isTokenValue(value)) {
        hasTokenValues = true;
      }
      if (typeof value === "object" && value !== null && !isTokenValue(value)) {
        traverse(value, depth + 1, currentPath);
      }
    }
  }
  traverse(data, 1);
  const levels = [];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const keys = Array.from(levelMap.get(depth) || []).sort();
    const samples = sampleMap.get(depth) || [];
    levels.push({
      depth,
      keys,
      sampleValues: samples,
      keyCount: keys.length
    });
  }
  return {
    levels,
    maxDepth,
    hasTokenValues
  };
}
function isTokenValue(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "$value" in value || "$type" in value;
}
function getValueType(value) {
  if (Array.isArray(value))
    return "array";
  if (value === null)
    return "object";
  const type = typeof value;
  if (type === "object")
    return "object";
  if (type === "string")
    return "string";
  if (type === "number")
    return "number";
  if (type === "boolean")
    return "boolean";
  return "object";
}
function getValuePreview(value) {
  if (value === null || value === void 0) {
    return value;
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === "object") {
    if ("$value" in value) {
      return value.$value;
    }
    const keys = Object.keys(value);
    return `{${keys.length} keys}`;
  }
  return value;
}

// src/backend/utils/token-extractor.ts
function extractTokensByLevels(data, levels) {
  const tokens = [];
  const collections = /* @__PURE__ */ new Map();
  const sortedLevels = [...levels].sort((a, b) => a.depth - b.depth);
  walkTree(data, sortedLevels, 1, {}, (token) => {
    const collection = token.collection || "Tokens";
    const mode = token.mode || "Mode 1";
    const path = token.path || token.name || "value";
    tokens.push({
      collection,
      mode,
      path,
      value: token.value,
      type: inferTokenType(token.value)
    });
    if (!collections.has(collection)) {
      collections.set(collection, {
        name: collection,
        modes: /* @__PURE__ */ new Map()
      });
    }
    const collectionData = collections.get(collection);
    if (!collectionData.modes.has(mode)) {
      collectionData.modes.set(mode, {
        name: mode,
        tokens: /* @__PURE__ */ new Map()
      });
    }
    const modeData = collectionData.modes.get(mode);
    modeData.tokens.set(path, token.value);
  });
  return { tokens, collections };
}
function walkTree(obj, levels, currentDepth, context, onToken) {
  if (obj === null || obj === void 0) {
    return;
  }
  const currentLevel = levels.find((l) => l.depth === currentDepth);
  if (!currentLevel) {
    if (isTokenValue2(obj)) {
      onToken(__spreadProps(__spreadValues({}, context), {
        value: obj
      }));
    }
    return;
  }
  if (isTokenValue2(obj)) {
    onToken(__spreadProps(__spreadValues({}, context), {
      value: obj
    }));
    return;
  }
  if (typeof obj === "object" && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const newContext = __spreadValues({}, context);
      switch (currentLevel.role) {
        case "collection":
          newContext.collection = key;
          newContext.pathSegments = [];
          break;
        case "mode":
          newContext.mode = key;
          newContext.pathSegments = context.pathSegments || [];
          break;
        case "token-path":
          const segments = context.pathSegments || [];
          newContext.pathSegments = [...segments, key];
          newContext.path = newContext.pathSegments.join("/");
          newContext.name = key;
          break;
      }
      walkTree(value, levels, currentDepth + 1, newContext, onToken);
    }
  }
}
function isTokenValue2(obj) {
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
    return true;
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return "$value" in obj || "value" in obj;
  }
  return false;
}
function inferTokenType(value) {
  if (value && typeof value === "object") {
    if ("$type" in value) {
      return value.$type;
    }
    if ("type" in value) {
      return value.type;
    }
    if ("$value" in value) {
      value = value.$value;
    } else if ("value" in value) {
      value = value.value;
    }
  }
  if (typeof value === "string") {
    if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value)) {
      return "color";
    }
    if (/^rgba?\(/.test(value)) {
      return "color";
    }
    if (/^\d+(\.\d+)?(px|rem|em|pt)$/.test(value)) {
      return "dimension";
    }
    return "string";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  return "string";
}

// src/backend/utils/preview-generator.ts
function generatePreview(fileName, data, levels) {
  const hasCollectionLevel = levels.some((level) => level.role === "collection");
  const fileNameWithoutExt = fileName.replace(/\.json$/i, "");
  const extracted = extractTokensByLevels(data, levels);
  const collections = [];
  let totalModes = 0;
  let totalVariables = 0;
  for (const [collectionName, collectionData] of extracted.collections) {
    const modes = [];
    for (const [modeName, modeData] of collectionData.modes) {
      const variableCount = modeData.tokens.size;
      totalVariables += variableCount;
      const sampleVariables = Array.from(modeData.tokens.keys()).slice(0, 5);
      modes.push({
        name: modeName,
        variableCount,
        sampleVariables
      });
    }
    totalModes += modes.length;
    const finalCollectionName = !hasCollectionLevel && collectionName === "Tokens" ? fileNameWithoutExt : collectionName;
    collections.push({
      name: finalCollectionName,
      modes
    });
  }
  if (collections.length === 0 && extracted.tokens.length > 0) {
    const sampleVariables = extracted.tokens.slice(0, 5).map((t) => t.path || t.value);
    collections.push({
      name: fileNameWithoutExt,
      modes: [{
        name: "Mode 1",
        variableCount: extracted.tokens.length,
        sampleVariables
      }]
    });
    totalModes = 1;
    totalVariables = extracted.tokens.length;
  }
  return {
    collections,
    totalCollections: collections.length,
    totalModes,
    totalVariables
  };
}

// src/types/level-config.types.ts
function validateLevelConfiguration(levels) {
  if (levels.length === 0) {
    return {
      valid: false,
      error: "No level configurations provided"
    };
  }
  const hasCollection = levels.some((level) => level.role === "collection");
  if (!hasCollection) {
    return {
      valid: false,
      error: "At least one level must be mapped as Collection"
    };
  }
  const depths = levels.map((level) => level.depth).sort((a, b) => a - b);
  for (let i = 0; i < depths.length; i++) {
    if (depths[i] !== i + 1) {
      return {
        valid: false,
        error: `Level depths must be sequential starting from 1. Found gap at depth ${i + 1}`
      };
    }
  }
  const warnings = [];
  const hasMode = levels.some((level) => level.role === "mode");
  if (!hasMode) {
    warnings.push("No Mode level defined - a default mode will be created");
  }
  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : void 0
  };
}

// src/backend/import/collection-builder.ts
async function buildFigmaCollection(collectionName, modes) {
  const errors = [];
  const warnings = [];
  try {
    const collection = figma.variables.createVariableCollection(collectionName);
    const modeIds = [];
    const modeNames = modes.map((m) => m.name);
    if (modeNames.length > 0) {
      collection.renameMode(collection.modes[0].modeId, modeNames[0]);
      modeIds.push(collection.modes[0].modeId);
    }
    for (let i = 1; i < modeNames.length; i++) {
      const modeId = collection.addMode(modeNames[i]);
      modeIds.push(modeId);
    }
    let variablesCreated = 0;
    const variablePaths = /* @__PURE__ */ new Set();
    for (const mode of modes) {
      for (const path of mode.tokens.keys()) {
        variablePaths.add(path);
      }
    }
    for (const varPath of variablePaths) {
      try {
        let firstValue = null;
        let firstType = "string";
        for (const mode of modes) {
          const value = mode.tokens.get(varPath);
          if (value !== void 0 && value !== null) {
            firstValue = value;
            firstType = inferTokenType2(value);
            break;
          }
        }
        if (firstValue === null) {
          warnings.push(`Skipping variable "${varPath}": no value found in any mode`);
          continue;
        }
        const figmaType = mapToFigmaType(firstType);
        const variable = figma.variables.createVariable(
          varPath,
          collection,
          figmaType
        );
        for (let i = 0; i < modes.length; i++) {
          const mode = modes[i];
          const modeId = modeIds[i];
          const value = mode.tokens.get(varPath);
          if (value !== void 0 && value !== null) {
            try {
              const parsedValue = parseValue(value, figmaType);
              variable.setValueForMode(modeId, parsedValue);
            } catch (error) {
              errors.push(
                `Failed to set value for "${varPath}" in mode "${mode.name}": ${error.message}`
              );
            }
          } else {
            const defaultValue = getDefaultValue(figmaType);
            try {
              variable.setValueForMode(modeId, defaultValue);
              warnings.push(`Variable "${varPath}" has no value in mode "${mode.name}", using default`);
            } catch (error) {
              errors.push(
                `Failed to set default value for "${varPath}" in mode "${mode.name}": ${error.message}`
              );
            }
          }
        }
        variablesCreated++;
      } catch (error) {
        errors.push(`Failed to create variable "${varPath}": ${error.message}`);
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
      errors: [`Failed to create collection "${collectionName}": ${error.message}`],
      warnings
    };
  }
}
function inferTokenType2(value) {
  if (value && typeof value === "object") {
    if ("$type" in value) {
      return value.$type;
    }
    if ("type" in value) {
      return value.type;
    }
    if ("$value" in value) {
      value = value.$value;
    } else if ("value" in value) {
      value = value.value;
    }
  }
  if (typeof value === "string") {
    if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value)) {
      return "color";
    }
    if (/^rgba?\(/.test(value)) {
      return "color";
    }
    if (/^\d+(\.\d+)?(px|rem|em|pt)$/.test(value)) {
      return "dimension";
    }
    return "string";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  return "string";
}
function mapToFigmaType(tokenType) {
  const typeMap = {
    "color": "COLOR",
    "number": "FLOAT",
    "dimension": "FLOAT",
    "spacing": "FLOAT",
    "fontSize": "FLOAT",
    "fontFamily": "STRING",
    "fontWeight": "STRING",
    "string": "STRING",
    "boolean": "BOOLEAN"
  };
  return typeMap[tokenType] || "STRING";
}
function parseValue(value, figmaType) {
  if (value && typeof value === "object") {
    if ("$value" in value) {
      value = value.$value;
    } else if ("value" in value) {
      value = value.value;
    }
  }
  if (figmaType === "COLOR") {
    return parseColor(value);
  } else if (figmaType === "FLOAT") {
    return parseNumber(value);
  } else if (figmaType === "BOOLEAN") {
    return Boolean(value);
  } else {
    return String(value);
  }
}
function parseColor(colorValue) {
  const colorString = String(colorValue);
  if (colorString.startsWith("#")) {
    const hex = colorString.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  const rgbMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]) / 255;
    const g = parseInt(rgbMatch[2]) / 255;
    const b = parseInt(rgbMatch[3]) / 255;
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
    return { r, g, b, a };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}
function parseNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  const str = String(value);
  const numStr = str.replace(/(px|rem|em|pt)$/, "");
  const num = parseFloat(numStr);
  return isNaN(num) ? 0 : num;
}
function getDefaultValue(figmaType) {
  switch (figmaType) {
    case "COLOR":
      return { r: 0, g: 0, b: 0, a: 1 };
    case "FLOAT":
      return 0;
    case "BOOLEAN":
      return false;
    case "STRING":
    default:
      return "";
  }
}

// src/backend/import/level-mapper.ts
async function importWithLevelMapping(config) {
  const errors = [];
  const warnings = [];
  let totalCollections = 0;
  let totalModes = 0;
  let totalVariables = 0;
  try {
    if (config.singleFile) {
      const result = await importSingleFile(
        config.singleFile.data,
        config.singleFile.levels,
        config.singleFile.fileName
      );
      return result;
    }
    if (config.multiFile) {
      const result = await importMultiFile(config.multiFile);
      return result;
    }
    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: ["No import configuration provided"],
      warnings: []
    };
  } catch (error) {
    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: [`Import failed: ${error.message}`],
      warnings
    };
  }
}
async function importSingleFile(data, levels, fileName) {
  const errors = [];
  const warnings = [];
  const validation = validateLevelConfiguration(levels);
  if (!validation.valid) {
    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: [validation.error || "Invalid level configuration"],
      warnings: validation.warnings || []
    };
  }
  if (validation.warnings) {
    warnings.push(...validation.warnings);
  }
  try {
    const extracted = extractTokensByLevels(data, levels);
    let totalCollections = 0;
    let totalModes = 0;
    let totalVariables = 0;
    for (const [collectionName, collectionData] of extracted.collections) {
      const modes = Array.from(collectionData.modes.values());
      const result = await buildFigmaCollection(collectionName, modes);
      totalCollections += result.collectionsCreated;
      totalModes += result.modesCreated;
      totalVariables += result.variablesCreated;
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
    return {
      success: errors.length === 0,
      collectionsCreated: totalCollections,
      modesCreated: totalModes,
      variablesCreated: totalVariables,
      errors,
      warnings
    };
  } catch (error) {
    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: [`Failed to import from ${fileName}: ${error.message}`],
      warnings
    };
  }
}
async function importMultiFile(config) {
  return {
    success: false,
    collectionsCreated: 0,
    modesCreated: 0,
    variablesCreated: 0,
    errors: ["Multi-file import not yet implemented - will be completed in Task Group 7"],
    warnings: []
  };
}

// src/backend/utils/mode-extractor.ts
function extractModeNameFromFilename(filename) {
  const nameWithoutExt = filename.replace(/\.json$/i, "");
  if (nameWithoutExt.includes("-")) {
    const parts = nameWithoutExt.split("-");
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
  }
  if (nameWithoutExt.includes(".")) {
    const parts = nameWithoutExt.split(".");
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
  }
  if (nameWithoutExt.includes("_")) {
    const parts = nameWithoutExt.split("_");
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
  }
  return nameWithoutExt;
}

// src/backend/utils/file-merger.ts
function mergeFilesAsMode(files, levels, collectionName, customModeNames) {
  const modes = [];
  for (const file of files) {
    const modeName = (customModeNames == null ? void 0 : customModeNames[file.fileName]) || extractModeNameFromFilename(file.fileName);
    modes.push({
      modeName,
      data: file.data
    });
  }
  return {
    collectionName,
    modes
  };
}
function mergeFilesAsSingleMode(files, levels, collectionName, modeName = "Mode 1") {
  const mergedData = files.reduce((acc, file) => {
    return deepMerge(acc, file.data);
  }, {});
  return {
    collectionName,
    modes: [
      {
        modeName,
        data: mergedData
      }
    ]
  };
}
function deepMerge(target, source) {
  const result = __spreadValues({}, target);
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && !isTokenValue3(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  return result;
}
function isTokenValue3(value) {
  if (value === null || value === void 0) {
    return false;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "object" && "$value" in value) {
    return true;
  }
  if (typeof value === "object" && "value" in value && !("$value" in value)) {
    return true;
  }
  return false;
}

// src/backend/import/multi-file-handler.ts
async function handleMultiFileImport(groups, levelsByGroup, filesData) {
  const errors = [];
  const warnings = [];
  let totalCollections = 0;
  let totalModes = 0;
  let totalVariables = 0;
  for (const group of groups) {
    try {
      const levels = levelsByGroup.get(group.id);
      if (!levels) {
        errors.push(`No level configuration found for group "${group.collectionName}"`);
        continue;
      }
      const groupFiles = group.fileNames.map((fileName) => {
        const data = filesData.get(fileName);
        if (!data) {
          errors.push(`File data not found: ${fileName}`);
          return null;
        }
        return { fileName, data };
      }).filter((f) => f !== null);
      if (groupFiles.length === 0) {
        errors.push(`No valid files in group "${group.collectionName}"`);
        continue;
      }
      const result = await importFileGroup(group, groupFiles, levels);
      totalCollections += result.collectionsCreated;
      totalModes += result.modesCreated;
      totalVariables += result.variablesCreated;
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    } catch (error) {
      errors.push(`Failed to import group "${group.collectionName}": ${error.message}`);
    }
  }
  return {
    success: errors.length === 0,
    collectionsCreated: totalCollections,
    modesCreated: totalModes,
    variablesCreated: totalVariables,
    errors,
    warnings
  };
}
async function importFileGroup(group, files, levels) {
  const errors = [];
  const warnings = [];
  try {
    let mergedCollection;
    const isSingleFileWithModes = files.length === 1 && levels.length > 0 && levels[0].role === "mode";
    if (isSingleFileWithModes) {
      const fileData = files[0].data;
      const modes = [];
      if (typeof fileData === "object" && fileData !== null) {
        for (const [key, value] of Object.entries(fileData)) {
          if (key.startsWith("$"))
            continue;
          modes.push({
            modeName: key,
            data: value
          });
        }
      }
      mergedCollection = {
        collectionName: group.collectionName,
        modes
      };
    } else if (group.modeStrategy === "per-file") {
      mergedCollection = mergeFilesAsMode(files, levels, group.collectionName, group.modeNames);
    } else {
      mergedCollection = mergeFilesAsSingleMode(files, levels, group.collectionName);
    }
    console.log("[MultiFileHandler] Processing collection:", group.collectionName, "with", mergedCollection.modes.length, "modes");
    console.log("[MultiFileHandler] Mode names:", mergedCollection.modes.map((m) => m.modeName));
    const modeTokensList = [];
    for (const modeData of mergedCollection.modes) {
      const tokens = flattenTokens(modeData.data);
      console.log("[MultiFileHandler] Mode", modeData.modeName, "has", tokens.size, "tokens");
      modeTokensList.push({
        name: modeData.modeName,
        tokens
      });
    }
    const result = await buildFigmaCollection(group.collectionName, modeTokensList);
    return {
      success: result.errors.length === 0,
      collectionsCreated: result.collectionsCreated,
      modesCreated: result.modesCreated,
      variablesCreated: result.variablesCreated,
      errors: [...errors, ...result.errors],
      warnings: [...warnings, ...result.warnings]
    };
  } catch (error) {
    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: [`Failed to import file group: ${error.message}`],
      warnings
    };
  }
}
function flattenTokens(obj, pathSegments = []) {
  const tokens = /* @__PURE__ */ new Map();
  if (obj === null || obj === void 0) {
    return tokens;
  }
  if (typeof obj !== "object" || Array.isArray(obj)) {
    if (pathSegments.length > 0) {
      tokens.set(pathSegments.join("/"), obj);
    }
    return tokens;
  }
  if ("$value" in obj || "value" in obj) {
    if (pathSegments.length > 0) {
      tokens.set(pathSegments.join("/"), obj);
    }
    return tokens;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) {
      continue;
    }
    const childTokens = flattenTokens(value, [...pathSegments, key]);
    for (const [path, val] of childTokens) {
      tokens.set(path, val);
    }
  }
  return tokens;
}

// src/backend/utils/version-manager.ts
function calculateVersionBump(currentVersion, previousBaseline, newBaseline) {
  const changes = detectChanges(previousBaseline, newBaseline);
  const breaking = changes.filter((c) => c.type === "breaking");
  const additions = changes.filter((c) => c.type === "addition");
  const patches = changes.filter((c) => c.type === "patch");
  let changeType;
  if (breaking.length > 0) {
    changeType = "major";
  } else if (additions.length > 0) {
    changeType = "minor";
  } else if (patches.length > 0) {
    changeType = "patch";
  } else {
    changeType = "none";
  }
  const suggested = bumpVersion(currentVersion, changeType);
  const summary = generateSummary(breaking.length, additions.length, patches.length);
  return {
    current: currentVersion,
    suggested,
    changeType,
    changes,
    breakingCount: breaking.length,
    additionCount: additions.length,
    patchCount: patches.length,
    summary
  };
}
function detectChanges(prev, next) {
  const changes = [];
  const prevBaseline = (prev == null ? void 0 : prev.baseline) || {};
  const nextBaseline = (next == null ? void 0 : next.baseline) || {};
  const prevTokens = new Map(Object.entries(prevBaseline));
  const nextTokens = new Map(Object.entries(nextBaseline));
  Array.from(prevTokens.entries()).forEach(([key, token]) => {
    if (!nextTokens.has(key)) {
      const t = token;
      changes.push({
        type: "breaking",
        severity: "critical",
        category: "token-deleted",
        path: t.path || key,
        description: `Token deleted: ${t.path || key}`,
        before: token
      });
    }
  });
  Array.from(nextTokens.entries()).forEach(([key, token]) => {
    if (!prevTokens.has(key)) {
      const t = token;
      changes.push({
        type: "addition",
        severity: "info",
        category: "token-added",
        path: t.path || key,
        description: `Token added: ${t.path || key}`,
        after: token
      });
    }
  });
  Array.from(nextTokens.entries()).forEach(([key, nextToken]) => {
    const prevToken = prevTokens.get(key);
    if (!prevToken)
      return;
    const prev2 = prevToken;
    const next2 = nextToken;
    if (prev2.path !== next2.path) {
      changes.push({
        type: "breaking",
        severity: "critical",
        category: "token-renamed",
        path: prev2.path,
        description: `Token renamed: ${prev2.path} \u2192 ${next2.path}`,
        before: prev2,
        after: next2
      });
    } else if (prev2.type !== next2.type) {
      changes.push({
        type: "breaking",
        severity: "critical",
        category: "type-changed",
        path: next2.path,
        description: `Type changed: ${prev2.type} \u2192 ${next2.type}`,
        before: prev2,
        after: next2
      });
    } else if (prev2.value !== next2.value) {
      const prevIsAlias = typeof prev2.value === "string" && prev2.value.startsWith("{");
      const nextIsAlias = typeof next2.value === "string" && next2.value.startsWith("{");
      if (prevIsAlias || nextIsAlias) {
        changes.push({
          type: "patch",
          severity: "info",
          category: "alias-changed",
          path: next2.path,
          description: `Alias changed: ${prev2.value} \u2192 ${next2.value}`,
          before: prev2,
          after: next2
        });
      } else {
        changes.push({
          type: "patch",
          severity: "info",
          category: "value-changed",
          path: next2.path,
          description: `Value updated: ${prev2.value} \u2192 ${next2.value}`,
          before: prev2,
          after: next2
        });
      }
    } else if (prev2.description !== next2.description) {
      changes.push({
        type: "patch",
        severity: "info",
        category: "description-changed",
        path: next2.path,
        description: `Description updated: ${prev2.description || "(empty)"} \u2192 ${next2.description || "(empty)"}`,
        before: prev2,
        after: next2
      });
    }
  });
  changes.push(...detectCollectionChanges(prevBaseline, nextBaseline));
  return changes;
}
function detectCollectionChanges(prevBaseline, nextBaseline) {
  const changes = [];
  const prevCollections = /* @__PURE__ */ new Set();
  const nextCollections = /* @__PURE__ */ new Set();
  const prevModes = /* @__PURE__ */ new Map();
  const nextModes = /* @__PURE__ */ new Map();
  Object.values(prevBaseline).forEach((token) => {
    if (token.collection) {
      prevCollections.add(token.collection);
      if (!prevModes.has(token.collection)) {
        prevModes.set(token.collection, /* @__PURE__ */ new Set());
      }
      if (token.mode) {
        prevModes.get(token.collection).add(token.mode);
      }
    }
  });
  Object.values(nextBaseline).forEach((token) => {
    if (token.collection) {
      nextCollections.add(token.collection);
      if (!nextModes.has(token.collection)) {
        nextModes.set(token.collection, /* @__PURE__ */ new Set());
      }
      if (token.mode) {
        nextModes.get(token.collection).add(token.mode);
      }
    }
  });
  Array.from(prevCollections).forEach((collection) => {
    if (!nextCollections.has(collection)) {
      changes.push({
        type: "breaking",
        severity: "critical",
        category: "collection-deleted",
        path: collection,
        description: `Collection deleted: ${collection}`
      });
    }
  });
  Array.from(nextCollections).forEach((collection) => {
    if (!prevCollections.has(collection)) {
      changes.push({
        type: "addition",
        severity: "info",
        category: "collection-added",
        path: collection,
        description: `Collection added: ${collection}`
      });
    }
  });
  Array.from(prevModes.entries()).forEach(([collection, modes]) => {
    const nextCollectionModes = nextModes.get(collection);
    if (!nextCollectionModes)
      return;
    Array.from(modes).forEach((mode) => {
      if (!nextCollectionModes.has(mode)) {
        changes.push({
          type: "breaking",
          severity: "critical",
          category: "mode-deleted",
          path: `${collection}.${mode}`,
          description: `Mode deleted: ${mode} from collection ${collection}`
        });
      }
    });
  });
  Array.from(nextModes.entries()).forEach(([collection, modes]) => {
    const prevCollectionModes = prevModes.get(collection);
    if (!prevCollectionModes)
      return;
    Array.from(modes).forEach((mode) => {
      if (!prevCollectionModes.has(mode)) {
        changes.push({
          type: "addition",
          severity: "info",
          category: "mode-added",
          path: `${collection}.${mode}`,
          description: `Mode added: ${mode} to collection ${collection}`
        });
      }
    });
  });
  return changes;
}
function bumpVersion(version, type) {
  const [major, minor, patch] = version.split(".").map(Number);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    case "none":
      return version;
  }
}
function generateSummary(breaking, additions, patches) {
  const parts = [];
  if (breaking > 0) {
    parts.push(`${breaking} breaking change${breaking > 1 ? "s" : ""}`);
  }
  if (additions > 0) {
    parts.push(`${additions} addition${additions > 1 ? "s" : ""}`);
  }
  if (patches > 0) {
    parts.push(`${patches} update${patches > 1 ? "s" : ""}`);
  }
  if (parts.length === 0) {
    return "No changes detected";
  }
  return parts.join(", ");
}

// src/backend/handlers/message-router.ts
init_constants();
async function handleMessage(msg) {
  switch (msg.type) {
    case "get-last-sync":
      await handleGetLastSync();
      break;
    case "get-collections":
      await handleGetCollections();
      break;
    case "export-baseline":
      await handleExportBaseline(msg.collectionIds);
      break;
    case "sync-to-node":
      await handleSyncToNode(msg.collectionIds);
      break;
    case "check-sync-changes":
      await handleCheckSyncChanges();
      break;
    case "sync-with-version":
      await handleSyncWithVersion(msg.version, msg.changes);
      break;
    case "detect-import-format":
      await handleDetectImportFormat(msg.fileName, msg.jsonData);
      break;
    case "import-baseline":
      await handleImportBaseline(msg.baseline);
      break;
    case "preview-baseline-import":
      await handlePreviewBaselineImport(msg.baseline);
      break;
    case "confirm-baseline-import":
      await handleImportBaseline(msg.baseline);
      break;
    case "analyze-structure":
      await handleAnalyzeStructure(msg.fileName, msg.jsonData, msg.metadata);
      break;
    case "generate-preview":
      await handleGeneratePreview(msg.fileName, msg.jsonData, msg.levels);
      break;
    case "import-with-manual-config":
      await handleImportWithManualConfig(msg.config);
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
async function handleDetectImportFormat(fileName, jsonData) {
  try {
    const { detectBaselineFormat: detectBaselineFormat2 } = await Promise.resolve().then(() => (init_baseline_detector(), baseline_detector_exports));
    const { validateBaseline: validateBaseline2 } = await Promise.resolve().then(() => (init_baseline_validator(), baseline_validator_exports));
    const detection = detectBaselineFormat2(jsonData);
    let validation;
    if (detection.isBaseline && jsonData) {
      validation = validateBaseline2(jsonData);
    }
    postMessage({
      type: "import-format-detected",
      fileName,
      baselineDetection: detection,
      validation
    });
  } catch (error) {
    console.error("Error detecting import format:", error);
    postMessage({
      type: "import-error",
      message: `Failed to detect format: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}
async function handleImportBaseline(baseline) {
  try {
    const { importBaseline: importBaseline2 } = await Promise.resolve().then(() => (init_baseline_importer(), baseline_importer_exports));
    figma.notify("Importing baseline...");
    const result = await importBaseline2(baseline);
    if (result.success) {
      try {
        const { exportBaseline: exportBaseline2 } = await Promise.resolve().then(() => (init_export(), export_exports));
        const { syncToNode: syncToNode2 } = await Promise.resolve().then(() => (init_sync(), sync_exports));
        const currentBaseline = await exportBaseline2(null);
        if (!currentBaseline.$metadata) {
          currentBaseline.$metadata = {};
        }
        currentBaseline.$metadata.version = result.importedVersion || "1.0.0";
        currentBaseline.$metadata.syncedAt = (/* @__PURE__ */ new Date()).toISOString();
        await syncToNode2(currentBaseline);
        console.log("[Import] Synced imported baseline to registry node with version:", result.importedVersion);
      } catch (syncError) {
        console.warn("[Import] Failed to sync baseline to registry node:", syncError);
      }
      let message = "";
      if (result.importedVersion) {
        message += `v${result.importedVersion}`;
        if (result.previousVersion && result.previousVersion !== result.importedVersion) {
          message += ` (was v${result.previousVersion})`;
        }
        message += ": ";
      }
      const parts = [];
      if (result.collectionsCreated > 0)
        parts.push(`${result.collectionsCreated} collection(s) created`);
      if (result.collectionsUpdated > 0)
        parts.push(`${result.collectionsUpdated} collection(s) updated`);
      if (result.variablesCreated > 0)
        parts.push(`${result.variablesCreated} variable(s) created`);
      if (result.variablesUpdated > 0)
        parts.push(`${result.variablesUpdated} variable(s) updated`);
      message += parts.length > 0 ? parts.join(", ") : "No changes";
      postMessage({
        type: "import-complete",
        message
      });
      figma.notify("Import complete!");
    } else {
      postMessage({
        type: "import-error",
        message: result.errors.join("\n")
      });
      figma.notify("Import failed", { error: true });
    }
  } catch (error) {
    console.error("Baseline import error:", error);
    postMessage({
      type: "import-error",
      message: error instanceof Error ? error.message : String(error)
    });
    figma.notify("Import failed", { error: true });
  }
}
async function handlePreviewBaselineImport(baseline) {
  var _a, _b;
  try {
    console.log("[ImportPreview] Generating import preview...");
    figma.notify("Analyzing changes...");
    const baselineData = baseline;
    if (!baselineData || !baselineData.baseline || typeof baselineData.baseline !== "object") {
      postMessage({
        type: "import-error",
        message: "Invalid baseline format: missing baseline property"
      });
      return;
    }
    const importedVersion = ((_a = baselineData.$metadata) == null ? void 0 : _a.version) || "1.0.0";
    const { buildBaselineSnapshot: buildBaselineSnapshot2 } = await Promise.resolve().then(() => (init_baseline(), baseline_exports));
    const currentBaseline = await buildBaselineSnapshot2(null);
    const currentVersion = ((_b = currentBaseline.$metadata) == null ? void 0 : _b.version) || "1.0.0";
    console.log("[ImportPreview] Comparing imported v" + importedVersion + " with current Figma state v" + currentVersion);
    const versionBump = calculateVersionBump(currentVersion, currentBaseline, baselineData);
    console.log("[ImportPreview] Changes detected:", versionBump.changes.length);
    console.log("[ImportPreview] Breaking:", versionBump.breakingCount, "Additions:", versionBump.additionCount, "Patches:", versionBump.patchCount);
    postMessage({
      type: "import-changes-detected",
      versionBump: __spreadProps(__spreadValues({}, versionBump), {
        // Override the suggested version to show the imported version
        current: currentVersion,
        suggested: importedVersion
      }),
      baseline
    });
    if (versionBump.changeType === "none") {
      figma.notify("No changes detected");
    } else {
      figma.notify(`${versionBump.changes.length} change(s) will be applied`);
    }
  } catch (error) {
    console.error("[ImportPreview] Error:", error);
    postMessage({
      type: "import-error",
      message: error instanceof Error ? error.message : String(error)
    });
    figma.notify("Failed to analyze import", { error: true });
  }
}
async function handleAnalyzeStructure(fileName, jsonData, metadata) {
  try {
    console.log("[Backend] Analyzing structure for:", fileName, metadata ? `(groupId: ${metadata.groupId})` : "");
    const structure = analyzeJsonStructure(jsonData);
    console.log("[Backend] Structure analyzed:", structure.levels.length, "levels");
    const levels = structure.levels.map((level) => ({
      depth: level.depth,
      role: "token-path",
      // Default role
      exampleKeys: level.keys,
      keyCount: level.keyCount
    }));
    console.log("[Backend] Sending structure-analyzed message");
    postMessage({
      type: "structure-analyzed",
      fileName,
      levels,
      metadata
    });
  } catch (error) {
    console.error("[Backend] Error analyzing structure:", error);
    postMessage({
      type: "import-error",
      message: `Failed to analyze structure: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}
async function handleGeneratePreview(fileName, jsonData, levels) {
  try {
    const preview = generatePreview(fileName, jsonData, levels);
    postMessage({
      type: "preview-generated",
      preview
    });
  } catch (error) {
    console.error("Error generating preview:", error);
    postMessage({
      type: "import-error",
      message: `Failed to generate preview: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}
async function handleImportWithManualConfig(config) {
  try {
    figma.notify("Importing tokens...");
    let result;
    if (config.singleFile) {
      result = await importWithLevelMapping(config);
    } else if (config.multiFile) {
      const filesDataRecord = config.multiFile.filesData || {};
      const filesData = new Map(Object.entries(filesDataRecord));
      const levelsByGroupRecord = config.multiFile.levelsByGroup || {};
      const levelsByGroup = new Map(Object.entries(levelsByGroupRecord));
      console.log("[Backend] Multi-file import with", filesData.size, "files");
      result = await handleMultiFileImport(
        config.multiFile.groups,
        levelsByGroup,
        filesData
      );
    } else {
      throw new Error("Invalid import configuration");
    }
    if (result.success) {
      postMessage({
        type: "import-complete",
        message: `Imported ${result.collectionsCreated} collection(s), ${result.modesCreated} mode(s), ${result.variablesCreated} variable(s)`
      });
      figma.notify("Import complete!");
    } else {
      postMessage({
        type: "import-error",
        message: result.errors.join("\n")
      });
      figma.notify("Import failed", { error: true });
    }
  } catch (error) {
    console.error("Manual import error:", error);
    postMessage({
      type: "import-error",
      message: error instanceof Error ? error.message : String(error)
    });
    figma.notify("Import failed", { error: true });
  }
}
async function handleCheckSyncChanges() {
  var _a;
  try {
    console.log("[SyncChanges] Checking for changes...");
    figma.notify("Checking for changes...");
    const node = await findRegistryNode();
    if (!node) {
      postMessage({
        type: "sync-error",
        message: "No previous sync found. Please sync to node first."
      });
      figma.notify("No previous sync found", { error: true });
      return;
    }
    const chunkCountStr = node.getSharedPluginData(PLUGIN_NAMESPACE, "chunkCount");
    if (!chunkCountStr) {
      postMessage({
        type: "sync-error",
        message: "No baseline data found in registry node."
      });
      figma.notify("No baseline data found", { error: true });
      return;
    }
    const chunkCount = parseInt(chunkCountStr, 10);
    const chunks = loadChunksFromNode(node, PLUGIN_NAMESPACE, chunkCount);
    const previousBaseline = unchunkData(chunks);
    console.log("[SyncChanges] Loaded previous baseline with", Object.keys((previousBaseline == null ? void 0 : previousBaseline.baseline) || {}).length, "tokens");
    const currentBaseline = await exportBaseline(null);
    console.log("[SyncChanges] Exported current baseline with", Object.keys((currentBaseline == null ? void 0 : currentBaseline.baseline) || {}).length, "tokens");
    const currentVersion = ((_a = previousBaseline == null ? void 0 : previousBaseline.$metadata) == null ? void 0 : _a.version) || "1.0.0";
    const versionBump = calculateVersionBump(currentVersion, previousBaseline, currentBaseline);
    console.log("[SyncChanges] Version bump:", versionBump.changeType, "from", versionBump.current, "to", versionBump.suggested);
    console.log("[SyncChanges] Changes:", versionBump.breakingCount, "breaking,", versionBump.additionCount, "additions,", versionBump.patchCount, "patches");
    postMessage({
      type: "sync-changes-detected",
      versionBump
    });
    if (versionBump.changeType === "none") {
      figma.notify("No changes detected");
    } else {
      figma.notify(`${versionBump.changes.length} change(s) detected`);
    }
  } catch (error) {
    console.error("[SyncChanges] Error:", error);
    postMessage({
      type: "sync-error",
      message: error instanceof Error ? error.message : String(error)
    });
    figma.notify("Failed to check for changes", { error: true });
  }
}
async function handleSyncWithVersion(version, changes) {
  try {
    console.log("[SyncWithVersion] Syncing with version:", version);
    figma.notify("Syncing...");
    const baseline = await exportBaseline(null);
    if (!baseline.$metadata) {
      baseline.$metadata = {};
    }
    baseline.$metadata.version = version;
    baseline.$metadata.syncedAt = (/* @__PURE__ */ new Date()).toISOString();
    const result = await syncToNode(baseline);
    postMessage({
      type: "sync-complete",
      nodeId: result.nodeId,
      variableCount: result.variableCount
    });
    figma.notify(`\u2713 Synced v${version} with ${result.variableCount} variables`);
  } catch (error) {
    console.error("[SyncWithVersion] Error:", error);
    postMessage({
      type: "sync-error",
      message: error instanceof Error ? error.message : String(error)
    });
    figma.notify("Sync failed", { error: true });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2JhY2tlbmQvdXRpbHMvdHlwZS1tYXBwZXJzLnRzIiwgInNyYy9iYWNrZW5kL3V0aWxzL3BhcnNlcnMudHMiLCAic3JjL2JhY2tlbmQvZXhwb3J0L3RyYW5zZm9ybWVyLnRzIiwgInNyYy9iYWNrZW5kL3V0aWxzL2NvbnN0YW50cy50cyIsICJzcmMvYmFja2VuZC9zeW5jL2NodW5rZXIudHMiLCAic3JjL2JhY2tlbmQvc3luYy9ub2RlLW1hbmFnZXIudHMiLCAic3JjL2JhY2tlbmQvc3luYy9tZXRhZGF0YS50cyIsICJzcmMvYmFja2VuZC9zeW5jL2luZGV4LnRzIiwgInNyYy9iYWNrZW5kL2V4cG9ydC9iYXNlbGluZS50cyIsICJzcmMvYmFja2VuZC9leHBvcnQvaW5kZXgudHMiLCAic3JjL2JhY2tlbmQvdXRpbHMvYmFzZWxpbmUtZGV0ZWN0b3IudHMiLCAic3JjL2JhY2tlbmQvdXRpbHMvYmFzZWxpbmUtdmFsaWRhdG9yLnRzIiwgInNyYy9iYWNrZW5kL2ltcG9ydC9iYXNlbGluZS1pbXBvcnRlci50cyIsICJzcmMvYmFja2VuZC9oYW5kbGVycy9tZXNzYWdlLXJvdXRlci50cyIsICJzcmMvYmFja2VuZC91dGlscy9zdHJ1Y3R1cmUtYW5hbHl6ZXIudHMiLCAic3JjL2JhY2tlbmQvdXRpbHMvdG9rZW4tZXh0cmFjdG9yLnRzIiwgInNyYy9iYWNrZW5kL3V0aWxzL3ByZXZpZXctZ2VuZXJhdG9yLnRzIiwgInNyYy90eXBlcy9sZXZlbC1jb25maWcudHlwZXMudHMiLCAic3JjL2JhY2tlbmQvaW1wb3J0L2NvbGxlY3Rpb24tYnVpbGRlci50cyIsICJzcmMvYmFja2VuZC9pbXBvcnQvbGV2ZWwtbWFwcGVyLnRzIiwgInNyYy9iYWNrZW5kL3V0aWxzL21vZGUtZXh0cmFjdG9yLnRzIiwgInNyYy9iYWNrZW5kL3V0aWxzL2ZpbGUtbWVyZ2VyLnRzIiwgInNyYy9iYWNrZW5kL2ltcG9ydC9tdWx0aS1maWxlLWhhbmRsZXIudHMiLCAic3JjL2JhY2tlbmQvdXRpbHMvdmVyc2lvbi1tYW5hZ2VyLnRzIiwgInNyYy9jb2RlLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIFR5cGUgY29udmVyc2lvbiB1dGlsaXRpZXMgYmV0d2VlbiB0b2tlbiB0eXBlcyBhbmQgRmlnbWEgdHlwZXNcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFRva2VuVHlwZSB9IGZyb20gJy4uLy4uL3R5cGVzL2luZGV4LmpzJztcblxuLyoqXG4gKiBNYXAgdG9rZW4gdHlwZSB0byBGaWdtYSB2YXJpYWJsZSB0eXBlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXBUb2tlblR5cGVUb0ZpZ21hVHlwZSh0b2tlblR5cGU6IHN0cmluZyk6IFZhcmlhYmxlUmVzb2x2ZWREYXRhVHlwZSB7XG4gIGNvbnN0IHR5cGVNYXA6IFJlY29yZDxzdHJpbmcsIFZhcmlhYmxlUmVzb2x2ZWREYXRhVHlwZT4gPSB7XG4gICAgJ2NvbG9yJzogJ0NPTE9SJyxcbiAgICAnZGltZW5zaW9uJzogJ0ZMT0FUJyxcbiAgICAnc3BhY2luZyc6ICdGTE9BVCcsXG4gICAgJ2ZvbnRGYW1pbHknOiAnU1RSSU5HJyxcbiAgICAnZm9udFdlaWdodCc6ICdTVFJJTkcnLFxuICAgICdmb250U2l6ZSc6ICdGTE9BVCcsXG4gICAgJ2R1cmF0aW9uJzogJ1NUUklORycsXG4gICAgJ3N0cmluZyc6ICdTVFJJTkcnLFxuICAgICdudW1iZXInOiAnRkxPQVQnLFxuICAgICdib29sZWFuJzogJ0JPT0xFQU4nLFxuICAgICdzaGFkb3cnOiAnU1RSSU5HJyxcbiAgICAnZ3JhZGllbnQnOiAnU1RSSU5HJ1xuICB9O1xuXG4gIHJldHVybiB0eXBlTWFwW3Rva2VuVHlwZV0gfHwgJ1NUUklORyc7XG59XG5cbi8qKlxuICogTWFwIEZpZ21hIHZhcmlhYmxlIHR5cGUgdG8gdG9rZW4gdHlwZVxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFwRmlnbWFUeXBlVG9Ub2tlblR5cGUoZmlnbWFUeXBlOiBWYXJpYWJsZVJlc29sdmVkRGF0YVR5cGUpOiBUb2tlblR5cGUge1xuICBjb25zdCB0eXBlTWFwOiBSZWNvcmQ8VmFyaWFibGVSZXNvbHZlZERhdGFUeXBlLCBUb2tlblR5cGU+ID0ge1xuICAgICdDT0xPUic6ICdjb2xvcicsXG4gICAgJ0ZMT0FUJzogJ251bWJlcicsXG4gICAgJ1NUUklORyc6ICdzdHJpbmcnLFxuICAgICdCT09MRUFOJzogJ2Jvb2xlYW4nXG4gIH07XG4gIHJldHVybiB0eXBlTWFwW2ZpZ21hVHlwZV0gfHwgJ3N0cmluZyc7XG59XG5cbi8qKlxuICogR2V0IGRlZmF1bHQgdmFsdWUgZm9yIGEgZ2l2ZW4gRmlnbWEgdHlwZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdFZhbHVlRm9yVHlwZSh0eXBlOiBWYXJpYWJsZVJlc29sdmVkRGF0YVR5cGUpOiBhbnkge1xuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICdDT0xPUic6XG4gICAgICByZXR1cm4geyByOiAwLCBnOiAwLCBiOiAwIH07IC8vIEJsYWNrXG4gICAgY2FzZSAnRkxPQVQnOlxuICAgICAgcmV0dXJuIDA7XG4gICAgY2FzZSAnU1RSSU5HJzpcbiAgICAgIHJldHVybiAnJztcbiAgICBjYXNlICdCT09MRUFOJzpcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiIsICIvKipcbiAqIFZhbHVlIHBhcnNpbmcgdXRpbGl0aWVzIGZvciBkaWZmZXJlbnQgdG9rZW4gdHlwZXNcbiAqL1xuXG4vKipcbiAqIFBhcnNlIGhleCBjb2xvciBzdHJpbmcgdG8gUkdCIG9iamVjdFxuICogU3VwcG9ydHMgI1JSR0dCQiBmb3JtYXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQ29sb3IodmFsdWU6IHN0cmluZyk6IFJHQiB8IG51bGwge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHJldHVybiBudWxsO1xuXG4gIC8vIEhhbmRsZSBoZXggY29sb3JzXG4gIGlmICh2YWx1ZS5zdGFydHNXaXRoKCcjJykpIHtcbiAgICBjb25zdCBoZXggPSB2YWx1ZS5yZXBsYWNlKCcjJywgJycpO1xuXG4gICAgaWYgKGhleC5sZW5ndGggPT09IDYpIHtcbiAgICAgIGNvbnN0IHIgPSBwYXJzZUludChoZXguc3Vic3RyaW5nKDAsIDIpLCAxNikgLyAyNTU7XG4gICAgICBjb25zdCBnID0gcGFyc2VJbnQoaGV4LnN1YnN0cmluZygyLCA0KSwgMTYpIC8gMjU1O1xuICAgICAgY29uc3QgYiA9IHBhcnNlSW50KGhleC5zdWJzdHJpbmcoNCwgNiksIDE2KSAvIDI1NTtcbiAgICAgIHJldHVybiB7IHIsIGcsIGIgfTtcbiAgICB9XG4gIH1cblxuICAvLyBIYW5kbGUgcmdiYVxuICBpZiAodmFsdWUuc3RhcnRzV2l0aCgncmdiYScpKSB7XG4gICAgY29uc3QgbWF0Y2ggPSB2YWx1ZS5tYXRjaCgvcmdiYVxcKChcXGQrKSxcXHMqKFxcZCspLFxccyooXFxkKyksXFxzKihbXFxkLl0rKVxcKS8pO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcjogcGFyc2VJbnQobWF0Y2hbMV0pIC8gMjU1LFxuICAgICAgICBnOiBwYXJzZUludChtYXRjaFsyXSkgLyAyNTUsXG4gICAgICAgIGI6IHBhcnNlSW50KG1hdGNoWzNdKSAvIDI1NVxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBQYXJzZSBudW1iZXIgdmFsdWUsIHN0cmlwcGluZyB1bml0c1xuICogU3VwcG9ydHMgbnVtZXJpYyB2YWx1ZXMgYW5kIHN0cmluZ3Mgd2l0aCB1bml0cyAocHgsIHJlbSwgZW0sIGV0Yy4pXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU51bWJlcih2YWx1ZTogYW55KTogbnVtYmVyIHwgbnVsbCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSByZXR1cm4gdmFsdWU7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgLy8gUmVtb3ZlIHVuaXRzIChweCwgcmVtLCBlbSwgZXRjLilcbiAgICBjb25zdCBudW0gPSBwYXJzZUZsb2F0KHZhbHVlLnJlcGxhY2UoL1thLXolXSskL2ksICcnKSk7XG4gICAgcmV0dXJuIGlzTmFOKG51bSkgPyBudWxsIDogbnVtO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFBhcnNlIGZvbnQgd2VpZ2h0IHZhbHVlXG4gKiBNYXBzIG51bWVyaWMgd2VpZ2h0cyB0byBuYW1lc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VGb250V2VpZ2h0KHZhbHVlOiBhbnkpOiBzdHJpbmcge1xuICBjb25zdCB3ZWlnaHRNYXA6IFJlY29yZDxudW1iZXIsIHN0cmluZz4gPSB7XG4gICAgMTAwOiAnVGhpbicsXG4gICAgMjAwOiAnRXh0cmEgTGlnaHQnLFxuICAgIDMwMDogJ0xpZ2h0JyxcbiAgICA0MDA6ICdSZWd1bGFyJyxcbiAgICA1MDA6ICdNZWRpdW0nLFxuICAgIDYwMDogJ1NlbWkgQm9sZCcsXG4gICAgNzAwOiAnQm9sZCcsXG4gICAgODAwOiAnRXh0cmEgQm9sZCcsXG4gICAgOTAwOiAnQmxhY2snXG4gIH07XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gd2VpZ2h0TWFwW3ZhbHVlXSB8fCB2YWx1ZS50b1N0cmluZygpO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG59XG5cbi8qKlxuICogQ29udmVydCBSR0IgdG8gaGV4IGNvbG9yIHN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmdiVG9IZXgoY29sb3I6IFJHQiB8IFJHQkEpOiBzdHJpbmcge1xuICBjb25zdCB0b0hleCA9ICh2YWx1ZTogbnVtYmVyKSA9PiB7XG4gICAgY29uc3QgaGV4ID0gTWF0aC5yb3VuZCh2YWx1ZSAqIDI1NSkudG9TdHJpbmcoMTYpO1xuICAgIHJldHVybiBoZXgubGVuZ3RoID09PSAxID8gJzAnICsgaGV4IDogaGV4O1xuICB9O1xuICByZXR1cm4gYCMke3RvSGV4KGNvbG9yLnIpfSR7dG9IZXgoY29sb3IuZyl9JHt0b0hleChjb2xvci5iKX1gO1xufVxuIiwgIi8qKlxuICogRXhwb3J0IHRyYW5zZm9ybWVyIG1vZHVsZVxuICogSGFuZGxlcyB2YWx1ZSB0cmFuc2Zvcm1hdGlvbiBmcm9tIEZpZ21hIGZvcm1hdCB0byB0b2tlbiBmb3JtYXRcbiAqL1xuXG5pbXBvcnQgeyByZ2JUb0hleCB9IGZyb20gJy4uL3V0aWxzL3BhcnNlcnMuanMnO1xuXG4vKipcbiAqIFJlc29sdmUgYSB2YXJpYWJsZSdzIHZhbHVlIGZvciBhIHNwZWNpZmljIG1vZGVcbiAqIEhhbmRsZXMgVkFSSUFCTEVfQUxJQVMgcmVmZXJlbmNlcyBhbmQgY29sb3IgdHJhbnNmb3JtYXRpb25zXG4gKlxuICogQHBhcmFtIHZhcmlhYmxlIC0gRmlnbWEgdmFyaWFibGUgdG8gcmVzb2x2ZVxuICogQHBhcmFtIG1vZGVJZCAtIE1vZGUgSUQgdG8gZ2V0IHZhbHVlIGZvclxuICogQHJldHVybnMgUmVzb2x2ZWQgdmFsdWUgKGFsaWFzIHN0cmluZywgaGV4IGNvbG9yLCBvciByYXcgdmFsdWUpXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlVmFyaWFibGVWYWx1ZSh2YXJpYWJsZTogVmFyaWFibGUsIG1vZGVJZDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgY29uc3QgdmFsdWUgPSB2YXJpYWJsZS52YWx1ZXNCeU1vZGVbbW9kZUlkXTtcblxuICAvLyBDaGVjayBpZiBpdCdzIGFuIGFsaWFzIHJlZmVyZW5jZVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCAmJiAndHlwZScgaW4gdmFsdWUgJiYgdmFsdWUudHlwZSA9PT0gJ1ZBUklBQkxFX0FMSUFTJykge1xuICAgIGNvbnN0IGFsaWFzZWRWYXJpYWJsZSA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRWYXJpYWJsZUJ5SWRBc3luYyh2YWx1ZS5pZCk7XG4gICAgaWYgKGFsaWFzZWRWYXJpYWJsZSkge1xuICAgICAgLy8gUmV0dXJuIGFsaWFzIGluIHtwYXRoLnRvLnRva2VufSBmb3JtYXRcbiAgICAgIHJldHVybiAneycgKyBhbGlhc2VkVmFyaWFibGUubmFtZS5yZXBsYWNlKC9cXC8vZywgJy4nKSArICd9JztcbiAgICB9XG4gIH1cblxuICAvLyBIYW5kbGUgY29sb3IgdmFsdWVzIC0gY29udmVydCBSR0IgdG8gaGV4XG4gIGlmICh2YXJpYWJsZS5yZXNvbHZlZFR5cGUgPT09ICdDT0xPUicgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCAmJiAncicgaW4gdmFsdWUpIHtcbiAgICByZXR1cm4gcmdiVG9IZXgodmFsdWUgYXMgUkdCIHwgUkdCQSk7XG4gIH1cblxuICAvLyBSZXR1cm4gcmF3IHZhbHVlIGZvciBvdGhlciB0eXBlc1xuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogU2V0IGEgbmVzdGVkIHZhbHVlIGluIGFuIG9iamVjdCB1c2luZyBhIHBhdGhcbiAqIENyZWF0ZXMgaW50ZXJtZWRpYXRlIG9iamVjdHMgYXMgbmVlZGVkXG4gKlxuICogQHBhcmFtIG9iaiAtIFRhcmdldCBvYmplY3QgdG8gbW9kaWZ5XG4gKiBAcGFyYW0gcGF0aFBhcnRzIC0gQXJyYXkgb2YgcGF0aCBzZWdtZW50cyAoZS5nLiwgWydjb2xvcnMnLCAncHJpbWFyeSddKVxuICogQHBhcmFtIHZhbHVlIC0gVmFsdWUgdG8gc2V0IGF0IHRoZSBwYXRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXROZXN0ZWRWYWx1ZShvYmo6IGFueSwgcGF0aFBhcnRzOiBzdHJpbmdbXSwgdmFsdWU6IGFueSk6IHZvaWQge1xuICBsZXQgY3VycmVudCA9IG9iajtcblxuICAvLyBOYXZpZ2F0ZS9jcmVhdGUgbmVzdGVkIHN0cnVjdHVyZSB1cCB0byB0aGUgbGFzdCBzZWdtZW50XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcGF0aFBhcnRzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgIGNvbnN0IHBhcnQgPSBwYXRoUGFydHNbaV07XG4gICAgaWYgKCEocGFydCBpbiBjdXJyZW50KSkge1xuICAgICAgY3VycmVudFtwYXJ0XSA9IHt9O1xuICAgIH1cbiAgICBjdXJyZW50ID0gY3VycmVudFtwYXJ0XTtcbiAgfVxuXG4gIC8vIFNldCB0aGUgZmluYWwgdmFsdWVcbiAgY3VycmVudFtwYXRoUGFydHNbcGF0aFBhcnRzLmxlbmd0aCAtIDFdXSA9IHZhbHVlO1xufVxuIiwgIi8qKlxuICogUGx1Z2luIGNvbnN0YW50cyBhbmQgY29uZmlndXJhdGlvblxuICovXG5cbi8qKiBQbHVnaW4gbmFtZXNwYWNlIGZvciBzaGFyZWRQbHVnaW5EYXRhIHN0b3JhZ2UgKi9cbmV4cG9ydCBjb25zdCBQTFVHSU5fTkFNRVNQQUNFID0gJ3Rva2VuX3ZhdWx0JztcblxuLyoqIExlZ2FjeSBuYW1lc3BhY2UgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5ICovXG5leHBvcnQgY29uc3QgTEVHQUNZX05BTUVTUEFDRSA9ICdkZXNpZ25fdG9rZW5faW1wb3J0ZXInO1xuXG4vKiogTmFtZSBvZiB0aGUgcmVnaXN0cnkgbm9kZSAqL1xuZXhwb3J0IGNvbnN0IFJFR0lTVFJZX05PREVfTkFNRSA9ICdfdG9rZW5fcmVnaXN0cnknO1xuXG4vKiogQ2h1bmsgc2l6ZSBmb3Igc3BsaXR0aW5nIGRhdGEgKDkwS0IgdG8gc3RheSB1bmRlciAxMDBLQiBsaW1pdCkgKi9cbmV4cG9ydCBjb25zdCBDSFVOS19TSVpFID0gOTAwMDA7XG5cbi8qKiBQbHVnaW4gdmVyc2lvbiAqL1xuZXhwb3J0IGNvbnN0IFBMVUdJTl9WRVJTSU9OID0gJzIuMC4wJztcblxuLyoqIEJhc2VsaW5lIHZlcnNpb24gKi9cbmV4cG9ydCBjb25zdCBCQVNFTElORV9WRVJTSU9OID0gJzIuMC4wJztcbiIsICIvKipcbiAqIERhdGEgY2h1bmtpbmcgdXRpbGl0aWVzIGZvciBoYW5kbGluZyBGaWdtYSdzIDEwMEtCIHNoYXJlZFBsdWdpbkRhdGEgbGltaXRcbiAqXG4gKiBAbW9kdWxlIGJhY2tlbmQvc3luYy9jaHVua2VyXG4gKi9cblxuaW1wb3J0IHsgQ0hVTktfU0laRSB9IGZyb20gJy4uL3V0aWxzL2NvbnN0YW50cy5qcyc7XG5cbi8qKlxuICogUmVzdWx0IG9mIGNodW5raW5nIG9wZXJhdGlvblxuICovXG5leHBvcnQgaW50ZXJmYWNlIENodW5rZWREYXRhIHtcbiAgLyoqIEFycmF5IG9mIGNodW5rIHN0cmluZ3MgKi9cbiAgY2h1bmtzOiBzdHJpbmdbXTtcbiAgLyoqIFRvdGFsIHNpemUgaW4gYnl0ZXMgKi9cbiAgdG90YWxTaXplOiBudW1iZXI7XG4gIC8qKiBOdW1iZXIgb2YgY2h1bmtzIGNyZWF0ZWQgKi9cbiAgY2h1bmtDb3VudDogbnVtYmVyO1xufVxuXG4vKipcbiAqIFNwbGl0IGRhdGEgaW50byBzYWZlLXNpemVkIGNodW5rcyBmb3Igc3RvcmFnZSBpbiBzaGFyZWRQbHVnaW5EYXRhLlxuICogVXNlcyA5MEtCIGNodW5rcyB0byBzdGF5IHVuZGVyIEZpZ21hJ3MgMTAwS0IgbGltaXQgcGVyIGVudHJ5LlxuICpcbiAqIEBwYXJhbSBkYXRhIC0gRGF0YSB0byBjaHVuayAod2lsbCBiZSBKU09OIHN0cmluZ2lmaWVkKVxuICogQHJldHVybnMgQ2h1bmtlZCBkYXRhIHdpdGggbWV0YWRhdGFcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGNvbnN0IHNuYXBzaG90ID0geyB0b2tlbnM6IHsuLi59IH07XG4gKiBjb25zdCBjaHVua2VkID0gY2h1bmtEYXRhKHNuYXBzaG90KTtcbiAqIGNvbnNvbGUubG9nKGBTcGxpdCBpbnRvICR7Y2h1bmtlZC5jaHVua0NvdW50fSBjaHVua3NgKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2h1bmtEYXRhKGRhdGE6IHVua25vd24pOiBDaHVua2VkRGF0YSB7XG4gIC8vIFN0cmluZ2lmeSB0aGUgZGF0YVxuICBjb25zdCBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICBjb25zdCB0b3RhbFNpemUgPSBqc29uRGF0YS5sZW5ndGg7XG4gIGNvbnN0IGNodW5rczogc3RyaW5nW10gPSBbXTtcblxuICAvLyBTcGxpdCBpbnRvIGNodW5rc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGpzb25EYXRhLmxlbmd0aDsgaSArPSBDSFVOS19TSVpFKSB7XG4gICAgY2h1bmtzLnB1c2goanNvbkRhdGEuc2xpY2UoaSwgaSArIENIVU5LX1NJWkUpKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY2h1bmtzLFxuICAgIHRvdGFsU2l6ZSxcbiAgICBjaHVua0NvdW50OiBjaHVua3MubGVuZ3RoXG4gIH07XG59XG5cbi8qKlxuICogUmVhc3NlbWJsZSBjaHVua2VkIGRhdGEgYmFjayBpbnRvIG9yaWdpbmFsIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gY2h1bmtzIC0gQXJyYXkgb2YgY2h1bmsgc3RyaW5nc1xuICogQHJldHVybnMgUGFyc2VkIGRhdGEgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIEpTT04gcGFyc2luZyBmYWlsc1xuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogY29uc3Qgb3JpZ2luYWwgPSB1bmNodW5rRGF0YShjaHVua2VkLmNodW5rcyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuY2h1bmtEYXRhKGNodW5rczogc3RyaW5nW10pOiB1bmtub3duIHtcbiAgLy8gSm9pbiBhbGwgY2h1bmtzXG4gIGNvbnN0IGpzb25EYXRhID0gY2h1bmtzLmpvaW4oJycpO1xuXG4gIC8vIFBhcnNlIGFuZCByZXR1cm5cbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShqc29uRGF0YSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcGFyc2UgdW5jaHVua2VkIGRhdGE6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIFJlZ2lzdHJ5IG5vZGUgbWFuYWdlbWVudCBmb3IgdG9rZW4gc3luY2hyb25pemF0aW9uXG4gKlxuICogQG1vZHVsZSBiYWNrZW5kL3N5bmMvbm9kZS1tYW5hZ2VyXG4gKi9cblxuaW1wb3J0IHsgUkVHSVNUUllfTk9ERV9OQU1FIH0gZnJvbSAnLi4vdXRpbHMvY29uc3RhbnRzLmpzJztcblxuLyoqXG4gKiBGaW5kIHRoZSByZWdpc3RyeSBub2RlIGFjcm9zcyBhbGwgcGFnZXMuXG4gKiBUaGUgcmVnaXN0cnkgbm9kZSBpcyBhIGhpZGRlbiwgbG9ja2VkIGZyYW1lIHRoYXQgc3RvcmVzIHRva2VuIGRhdGEuXG4gKlxuICogQHJldHVybnMgUmVnaXN0cnkgbm9kZSBpZiBmb3VuZCwgbnVsbCBvdGhlcndpc2VcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGNvbnN0IG5vZGUgPSBhd2FpdCBmaW5kUmVnaXN0cnlOb2RlKCk7XG4gKiBpZiAobm9kZSkge1xuICogICBjb25zb2xlLmxvZyhgRm91bmQgcmVnaXN0cnkgbm9kZTogJHtub2RlLmlkfWApO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kUmVnaXN0cnlOb2RlKCk6IFByb21pc2U8RnJhbWVOb2RlIHwgbnVsbD4ge1xuICAvLyBTZWFyY2ggYWxsIHBhZ2VzIGZvciB0aGUgcmVnaXN0cnkgbm9kZVxuICBmb3IgKGNvbnN0IHBhZ2Ugb2YgZmlnbWEucm9vdC5jaGlsZHJlbikge1xuICAgIC8vIExvYWQgcGFnZSBiZWZvcmUgYWNjZXNzaW5nIGNoaWxkcmVuXG4gICAgYXdhaXQgcGFnZS5sb2FkQXN5bmMoKTtcblxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBwYWdlLmNoaWxkcmVuKSB7XG4gICAgICBpZiAobm9kZS50eXBlID09PSAnRlJBTUUnICYmIG5vZGUubmFtZSA9PT0gUkVHSVNUUllfTk9ERV9OQU1FKSB7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyByZWdpc3RyeSBub2RlIG9uIHRoZSBjdXJyZW50IHBhZ2UuXG4gKiBUaGUgbm9kZSBpcyBjcmVhdGVkIG9mZi1jYW52YXMsIGhpZGRlbiwgYW5kIGxvY2tlZCB0byBwcmV2ZW50IGFjY2lkZW50YWwgZGVsZXRpb24uXG4gKlxuICogQHJldHVybnMgTmV3bHkgY3JlYXRlZCByZWdpc3RyeSBub2RlXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBjb25zdCBub2RlID0gYXdhaXQgY3JlYXRlUmVnaXN0cnlOb2RlKCk7XG4gKiBjb25zb2xlLmxvZyhgQ3JlYXRlZCByZWdpc3RyeSBub2RlOiAke25vZGUuaWR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVJlZ2lzdHJ5Tm9kZSgpOiBQcm9taXNlPEZyYW1lTm9kZT4ge1xuICBjb25zdCBmcmFtZSA9IGZpZ21hLmNyZWF0ZUZyYW1lKCk7XG4gIGZyYW1lLm5hbWUgPSBSRUdJU1RSWV9OT0RFX05BTUU7XG4gIGZyYW1lLnJlc2l6ZSgxMDAsIDEwMCk7XG5cbiAgLy8gUG9zaXRpb24gb2ZmLWNhbnZhcyB0byBrZWVwIGl0IG91dCBvZiB0aGUgd2F5XG4gIGZyYW1lLnggPSAtMTAwMDtcbiAgZnJhbWUueSA9IC0xMDAwO1xuXG4gIC8vIEhpZGUgYW5kIGxvY2sgdG8gcHJldmVudCBhY2NpZGVudGFsIGludGVyYWN0aW9uXG4gIGZyYW1lLnZpc2libGUgPSBmYWxzZTtcbiAgZnJhbWUubG9ja2VkID0gdHJ1ZTtcblxuICByZXR1cm4gZnJhbWU7XG59XG5cbi8qKlxuICogR2V0IHRoZSByZWdpc3RyeSBub2RlLCBjcmVhdGluZyBpdCBpZiBpdCBkb2Vzbid0IGV4aXN0LlxuICogVGhpcyBpcyB0aGUgcHJpbWFyeSBlbnRyeSBwb2ludCBmb3IgYWNjZXNzaW5nIHRoZSByZWdpc3RyeSBub2RlLlxuICpcbiAqIEByZXR1cm5zIFJlZ2lzdHJ5IG5vZGUgKGV4aXN0aW5nIG9yIG5ld2x5IGNyZWF0ZWQpXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBjb25zdCBub2RlID0gYXdhaXQgZ2V0T3JDcmVhdGVSZWdpc3RyeU5vZGUoKTtcbiAqIC8vIE5vZGUgaXMgZ3VhcmFudGVlZCB0byBleGlzdCBoZXJlXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldE9yQ3JlYXRlUmVnaXN0cnlOb2RlKCk6IFByb21pc2U8RnJhbWVOb2RlPiB7XG4gIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgZmluZFJlZ2lzdHJ5Tm9kZSgpO1xuXG4gIGlmIChleGlzdGluZykge1xuICAgIHJldHVybiBleGlzdGluZztcbiAgfVxuXG4gIHJldHVybiBhd2FpdCBjcmVhdGVSZWdpc3RyeU5vZGUoKTtcbn1cblxuLyoqXG4gKiBDbGVhciBhbGwgY2h1bmsgZGF0YSBmcm9tIHRoZSByZWdpc3RyeSBub2RlLlxuICogUmVtb3ZlcyB1cCB0byAyMCBjaHVua3MgdG8gZW5zdXJlIGNsZWFuIHNsYXRlIGZvciBuZXcgZGF0YS5cbiAqXG4gKiBAcGFyYW0gbm9kZSAtIFJlZ2lzdHJ5IG5vZGUgdG8gY2xlYXJcbiAqIEBwYXJhbSBuYW1lc3BhY2UgLSBQbHVnaW4gbmFtZXNwYWNlIHRvIGNsZWFyIGRhdGEgZnJvbVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogY29uc3Qgbm9kZSA9IGF3YWl0IGdldE9yQ3JlYXRlUmVnaXN0cnlOb2RlKCk7XG4gKiBjbGVhck5vZGVDaHVua3Mobm9kZSwgJ3Rva2VuX3ZhdWx0Jyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyTm9kZUNodW5rcyhub2RlOiBGcmFtZU5vZGUsIG5hbWVzcGFjZTogc3RyaW5nKTogdm9pZCB7XG4gIC8vIENsZWFyIHVwIHRvIDIwIGNodW5rcyAoc2hvdWxkIGJlIG1vcmUgdGhhbiBlbm91Z2gpXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMjA7IGkrKykge1xuICAgIG5vZGUuc2V0U2hhcmVkUGx1Z2luRGF0YShuYW1lc3BhY2UsIGByZWdpc3RyeV8ke2l9YCwgJycpO1xuICB9XG59XG5cbi8qKlxuICogU2F2ZSBjaHVuayBkYXRhIHRvIHRoZSByZWdpc3RyeSBub2RlLlxuICpcbiAqIEBwYXJhbSBub2RlIC0gUmVnaXN0cnkgbm9kZSB0byBzYXZlIHRvXG4gKiBAcGFyYW0gbmFtZXNwYWNlIC0gUGx1Z2luIG5hbWVzcGFjZVxuICogQHBhcmFtIGNodW5rcyAtIEFycmF5IG9mIGNodW5rIHN0cmluZ3MgdG8gc2F2ZVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogY29uc3Qgbm9kZSA9IGF3YWl0IGdldE9yQ3JlYXRlUmVnaXN0cnlOb2RlKCk7XG4gKiBzYXZlQ2h1bmtzVG9Ob2RlKG5vZGUsICd0b2tlbl92YXVsdCcsIGNodW5rZWQuY2h1bmtzKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUNodW5rc1RvTm9kZShcbiAgbm9kZTogRnJhbWVOb2RlLFxuICBuYW1lc3BhY2U6IHN0cmluZyxcbiAgY2h1bmtzOiBzdHJpbmdbXVxuKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2h1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgbm9kZS5zZXRTaGFyZWRQbHVnaW5EYXRhKG5hbWVzcGFjZSwgYHJlZ2lzdHJ5XyR7aX1gLCBjaHVua3NbaV0pO1xuICB9XG59XG5cbi8qKlxuICogTG9hZCBjaHVuayBkYXRhIGZyb20gdGhlIHJlZ2lzdHJ5IG5vZGUuXG4gKlxuICogQHBhcmFtIG5vZGUgLSBSZWdpc3RyeSBub2RlIHRvIGxvYWQgZnJvbVxuICogQHBhcmFtIG5hbWVzcGFjZSAtIFBsdWdpbiBuYW1lc3BhY2VcbiAqIEBwYXJhbSBjaHVua0NvdW50IC0gTnVtYmVyIG9mIGNodW5rcyB0byBsb2FkXG4gKiBAcmV0dXJucyBBcnJheSBvZiBjaHVuayBzdHJpbmdzXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBjb25zdCBub2RlID0gYXdhaXQgZmluZFJlZ2lzdHJ5Tm9kZSgpO1xuICogaWYgKG5vZGUpIHtcbiAqICAgY29uc3QgY2h1bmtzID0gbG9hZENodW5rc0Zyb21Ob2RlKG5vZGUsICd0b2tlbl92YXVsdCcsIDMpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkQ2h1bmtzRnJvbU5vZGUoXG4gIG5vZGU6IEZyYW1lTm9kZSxcbiAgbmFtZXNwYWNlOiBzdHJpbmcsXG4gIGNodW5rQ291bnQ6IG51bWJlclxuKTogc3RyaW5nW10ge1xuICBjb25zdCBjaHVua3M6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaHVua0NvdW50OyBpKyspIHtcbiAgICBjb25zdCBjaHVuayA9IG5vZGUuZ2V0U2hhcmVkUGx1Z2luRGF0YShuYW1lc3BhY2UsIGByZWdpc3RyeV8ke2l9YCk7XG4gICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICB9XG5cbiAgcmV0dXJuIGNodW5rcztcbn1cbiIsICIvKipcbiAqIFN5bmMgbWV0YWRhdGEgbWFuYWdlbWVudCBmb3IgcmVnaXN0cnkgbm9kZVxuICpcbiAqIEBtb2R1bGUgYmFja2VuZC9zeW5jL21ldGFkYXRhXG4gKi9cblxuaW1wb3J0IHsgUExVR0lOX05BTUVTUEFDRSwgTEVHQUNZX05BTUVTUEFDRSB9IGZyb20gJy4uL3V0aWxzL2NvbnN0YW50cy5qcyc7XG5pbXBvcnQgdHlwZSB7IFN5bmNNZXRhZGF0YSwgU3luY0luZm8gfSBmcm9tICcuLi8uLi90eXBlcy9tZXNzYWdlLnR5cGVzLmpzJztcblxuLyoqXG4gKiBSZWFkIHN5bmMgbWV0YWRhdGEgZnJvbSBhIHJlZ2lzdHJ5IG5vZGUuXG4gKiBTdXBwb3J0cyBib3RoIGN1cnJlbnQgYW5kIGxlZ2FjeSBuYW1lc3BhY2VzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAqXG4gKiBAcGFyYW0gbm9kZSAtIFJlZ2lzdHJ5IG5vZGUgdG8gcmVhZCBmcm9tXG4gKiBAcmV0dXJucyBTeW5jIGluZm9ybWF0aW9uXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBjb25zdCBub2RlID0gYXdhaXQgZmluZFJlZ2lzdHJ5Tm9kZSgpO1xuICogaWYgKG5vZGUpIHtcbiAqICAgY29uc3QgaW5mbyA9IHJlYWRTeW5jTWV0YWRhdGEobm9kZSk7XG4gKiAgIGNvbnNvbGUubG9nKGBMYXN0IHN5bmNlZDogJHtpbmZvLnVwZGF0ZWRBdH1gKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN5bmNNZXRhZGF0YShub2RlOiBGcmFtZU5vZGUpOiBTeW5jSW5mbyB7XG4gIC8vIFRyeSBjdXJyZW50IG5hbWVzcGFjZSBmaXJzdFxuICBsZXQgdXBkYXRlZEF0ID0gbm9kZS5nZXRTaGFyZWRQbHVnaW5EYXRhKFBMVUdJTl9OQU1FU1BBQ0UsICd1cGRhdGVkQXQnKTtcbiAgbGV0IHZhcmlhYmxlQ291bnQgPSBub2RlLmdldFNoYXJlZFBsdWdpbkRhdGEoUExVR0lOX05BTUVTUEFDRSwgJ3ZhcmlhYmxlQ291bnQnKTtcblxuICAvLyBGYWxsYmFjayB0byBsZWdhY3kgbmFtZXNwYWNlIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eVxuICBpZiAoIXVwZGF0ZWRBdCkge1xuICAgIHVwZGF0ZWRBdCA9IG5vZGUuZ2V0U2hhcmVkUGx1Z2luRGF0YShMRUdBQ1lfTkFNRVNQQUNFLCAndXBkYXRlZEF0Jyk7XG4gICAgdmFyaWFibGVDb3VudCA9IG5vZGUuZ2V0U2hhcmVkUGx1Z2luRGF0YShMRUdBQ1lfTkFNRVNQQUNFLCAndmFyaWFibGVDb3VudCcpO1xuICB9XG5cbiAgaWYgKCF1cGRhdGVkQXQpIHtcbiAgICByZXR1cm4geyBleGlzdHM6IGZhbHNlIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGV4aXN0czogdHJ1ZSxcbiAgICBub2RlSWQ6IG5vZGUuaWQsXG4gICAgdXBkYXRlZEF0LFxuICAgIHZhcmlhYmxlQ291bnQ6IHZhcmlhYmxlQ291bnQgPyBwYXJzZUludCh2YXJpYWJsZUNvdW50LCAxMCkgOiB1bmRlZmluZWRcbiAgfTtcbn1cblxuLyoqXG4gKiBXcml0ZSBzeW5jIG1ldGFkYXRhIHRvIGEgcmVnaXN0cnkgbm9kZS5cbiAqXG4gKiBAcGFyYW0gbm9kZSAtIFJlZ2lzdHJ5IG5vZGUgdG8gd3JpdGUgdG9cbiAqIEBwYXJhbSBtZXRhZGF0YSAtIE1ldGFkYXRhIHRvIHNhdmVcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGNvbnN0IG5vZGUgPSBhd2FpdCBnZXRPckNyZWF0ZVJlZ2lzdHJ5Tm9kZSgpO1xuICogd3JpdGVTeW5jTWV0YWRhdGEobm9kZSwge1xuICogICBjaHVua0NvdW50OiAzLFxuICogICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAqICAgdmFyaWFibGVDb3VudDogMTUwXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVTeW5jTWV0YWRhdGEobm9kZTogRnJhbWVOb2RlLCBtZXRhZGF0YTogU3luY01ldGFkYXRhKTogdm9pZCB7XG4gIG5vZGUuc2V0U2hhcmVkUGx1Z2luRGF0YShQTFVHSU5fTkFNRVNQQUNFLCAnY2h1bmtDb3VudCcsIFN0cmluZyhtZXRhZGF0YS5jaHVua0NvdW50KSk7XG4gIG5vZGUuc2V0U2hhcmVkUGx1Z2luRGF0YShQTFVHSU5fTkFNRVNQQUNFLCAndXBkYXRlZEF0JywgbWV0YWRhdGEudXBkYXRlZEF0KTtcbiAgbm9kZS5zZXRTaGFyZWRQbHVnaW5EYXRhKFBMVUdJTl9OQU1FU1BBQ0UsICd2YXJpYWJsZUNvdW50JywgU3RyaW5nKG1ldGFkYXRhLnZhcmlhYmxlQ291bnQpKTtcbn1cbiIsICIvKipcbiAqIFN5bmMgb3JjaGVzdHJhdG9yIC0gY29vcmRpbmF0ZXMgZXhwb3J0LCBjaHVua2luZywgYW5kIG5vZGUgc3RvcmFnZVxuICpcbiAqIFRoaXMgbW9kdWxlIG1hbmFnZXMgdGhlIHN5bmNocm9uaXphdGlvbiBvZiBGaWdtYSB2YXJpYWJsZXMgdG8gYSByZWdpc3RyeSBub2RlLFxuICogZW5hYmxpbmcgdGhlIFN5bmtpbyBDTEkgdG8gZmV0Y2ggdG9rZW4gZGF0YSB2aWEgdGhlIEZpZ21hIEFQSSB3aXRob3V0IHJlcXVpcmluZ1xuICogbWFudWFsIGV4cG9ydCBzdGVwcyBmcm9tIHRoZSBwbHVnaW4uXG4gKlxuICogQG1vZHVsZSBiYWNrZW5kL3N5bmNcbiAqL1xuXG5pbXBvcnQgeyBjaHVua0RhdGEgfSBmcm9tICcuL2NodW5rZXIuanMnO1xuaW1wb3J0IHtcbiAgZ2V0T3JDcmVhdGVSZWdpc3RyeU5vZGUsXG4gIGZpbmRSZWdpc3RyeU5vZGUsXG4gIGNsZWFyTm9kZUNodW5rcyxcbiAgc2F2ZUNodW5rc1RvTm9kZVxufSBmcm9tICcuL25vZGUtbWFuYWdlci5qcyc7XG5pbXBvcnQgeyByZWFkU3luY01ldGFkYXRhLCB3cml0ZVN5bmNNZXRhZGF0YSB9IGZyb20gJy4vbWV0YWRhdGEuanMnO1xuaW1wb3J0IHsgUExVR0lOX05BTUVTUEFDRSB9IGZyb20gJy4uL3V0aWxzL2NvbnN0YW50cy5qcyc7XG5pbXBvcnQgdHlwZSB7IFN5bmNJbmZvIH0gZnJvbSAnLi4vLi4vdHlwZXMvbWVzc2FnZS50eXBlcy5qcyc7XG5cbi8qKlxuICogU3luYyB0b2tlbiBkYXRhIHRvIHJlZ2lzdHJ5IG5vZGUuXG4gKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeSBwb2ludCBmb3IgdGhlIHN5bmMgZmxvdy4gSXQgb3JjaGVzdHJhdGVzIHRoZSBjb21wbGV0ZVxuICogcHJvY2VzcyBvZiBwZXJzaXN0aW5nIHRva2VuIGRhdGEgdG8gYSBoaWRkZW4gcmVnaXN0cnkgbm9kZSBpbiB0aGUgRmlnbWEgZmlsZS5cbiAqXG4gKiAqKkZsb3c6KipcbiAqIDEuIEV4cG9ydCBiYXNlbGluZSBzbmFwc2hvdCAocGFzc2VkIGFzIHBhcmFtZXRlciB0byBhdm9pZCBjaXJjdWxhciBkZXBlbmRlbmN5KVxuICogMi4gQ2h1bmsgdGhlIGRhdGEgaW50byBzYWZlLXNpemVkIHBpZWNlcyAodW5kZXIgMTAwS0IgcGVyIGNodW5rKVxuICogMy4gR2V0IG9yIGNyZWF0ZSByZWdpc3RyeSBub2RlIChfdG9rZW5fcmVnaXN0cnkgZnJhbWUpXG4gKiA0LiBDbGVhciBvbGQgY2h1bmtzIGZyb20gcHJldmlvdXMgc3luY1xuICogNS4gU2F2ZSBuZXcgY2h1bmtzIHRvIG5vZGUncyBzaGFyZWRQbHVnaW5EYXRhXG4gKiA2LiBTYXZlIG1ldGFkYXRhIChjaHVuayBjb3VudCwgdGltZXN0YW1wLCB2YXJpYWJsZSBjb3VudClcbiAqXG4gKiBUaGUgcmVnaXN0cnkgbm9kZSBpczpcbiAqIC0gQSBoaWRkZW4sIGxvY2tlZCBGcmFtZU5vZGUgbmFtZWQgXCJfdG9rZW5fcmVnaXN0cnlcIlxuICogLSBQb3NpdGlvbmVkIG9mZi1jYW52YXMgYXQgKC0xMDAwMCwgLTEwMDAwKVxuICogLSBTdG9yZXMgZGF0YSBpbiBzaGFyZWRQbHVnaW5EYXRhIHdpdGggbmFtZXNwYWNlICdzeW5raW8udG9rZW4tdmF1bHQnXG4gKiAtIEFjY2Vzc2libGUgdmlhIEZpZ21hIEFQSSBmb3IgQ0xJIGZldGNoaW5nXG4gKlxuICogQHBhcmFtIGV4cG9ydERhdGEgLSBCYXNlbGluZSBzbmFwc2hvdCBkYXRhIHRvIHN5bmMgKGZyb20gZXhwb3J0QmFzZWxpbmUpXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBzeW5jIHJlc3VsdCB3aXRoIG5vZGUgSUQgYW5kIHZhcmlhYmxlIGNvdW50XG4gKlxuICogQHRocm93cyB7RXJyb3J9IElmIG5vZGUgY3JlYXRpb24vdXBkYXRlIGZhaWxzXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgZGF0YSBjaHVua2luZyBmYWlscyAoZGF0YSB0b28gbGFyZ2UgZXZlbiBhZnRlciBjaHVua2luZylcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIC8vIFR5cGljYWwgdXNhZ2UgaW4gbWVzc2FnZSBoYW5kbGVyXG4gKiBjb25zdCBzbmFwc2hvdCA9IGF3YWl0IGV4cG9ydEJhc2VsaW5lKFsnY29sbGVjdGlvbi1pZCddKTtcbiAqIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHN5bmNUb05vZGUoc25hcHNob3QpO1xuICpcbiAqIGNvbnNvbGUubG9nKGBTeW5jZWQgdG8gbm9kZSAke3Jlc3VsdC5ub2RlSWR9YCk7XG4gKiBjb25zb2xlLmxvZyhgU2F2ZWQgJHtyZXN1bHQudmFyaWFibGVDb3VudH0gdmFyaWFibGVzYCk7XG4gKlxuICogLy8gQ0xJIGNhbiBub3cgZmV0Y2ggdmlhIEZpZ21hIEFQSTpcbiAqIC8vIEdFVCAvdjEvZmlsZXMvOmZpbGVLZXkvbm9kZXMvOm5vZGVJZD9wbHVnaW5fZGF0YT1zeW5raW8udG9rZW4tdmF1bHRcbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3luY1RvTm9kZShleHBvcnREYXRhOiB1bmtub3duKTogUHJvbWlzZTx7XG4gIG5vZGVJZDogc3RyaW5nO1xuICB2YXJpYWJsZUNvdW50OiBudW1iZXI7XG59PiB7XG4gIGNvbnNvbGUubG9nKCdbU3luY10gU3RhcnRpbmcgc3luYyB0byBub2RlLi4uJyk7XG5cbiAgLy8gQ2FsY3VsYXRlIHZhcmlhYmxlIGNvdW50IGZyb20gYmFzZWxpbmVcbiAgY29uc3QgdmFyaWFibGVDb3VudCA9IGV4cG9ydERhdGEgJiYgdHlwZW9mIGV4cG9ydERhdGEgPT09ICdvYmplY3QnICYmICdiYXNlbGluZScgaW4gZXhwb3J0RGF0YVxuICAgID8gT2JqZWN0LmtleXMoKGV4cG9ydERhdGEgYXMgYW55KS5iYXNlbGluZSkubGVuZ3RoXG4gICAgOiAwO1xuXG4gIGNvbnNvbGUubG9nKGBbU3luY10gU3luY2luZyAke3ZhcmlhYmxlQ291bnR9IHZhcmlhYmxlc2ApO1xuXG4gIC8vIENodW5rIHRoZSBkYXRhXG4gIGNvbnN0IGNodW5rZWQgPSBjaHVua0RhdGEoZXhwb3J0RGF0YSk7XG4gIGNvbnNvbGUubG9nKGBbU3luY10gU3BsaXQgJHtjaHVua2VkLnRvdGFsU2l6ZX0gYnl0ZXMgaW50byAke2NodW5rZWQuY2h1bmtDb3VudH0gY2h1bmtzYCk7XG5cbiAgLy8gR2V0IG9yIGNyZWF0ZSByZWdpc3RyeSBub2RlXG4gIGNvbnN0IG5vZGUgPSBhd2FpdCBnZXRPckNyZWF0ZVJlZ2lzdHJ5Tm9kZSgpO1xuICBjb25zb2xlLmxvZyhgW1N5bmNdIFVzaW5nIHJlZ2lzdHJ5IG5vZGU6ICR7bm9kZS5pZH1gKTtcblxuICAvLyBDbGVhciBvbGQgY2h1bmtzXG4gIGNsZWFyTm9kZUNodW5rcyhub2RlLCBQTFVHSU5fTkFNRVNQQUNFKTtcblxuICAvLyBTYXZlIG5ldyBjaHVua3NcbiAgc2F2ZUNodW5rc1RvTm9kZShub2RlLCBQTFVHSU5fTkFNRVNQQUNFLCBjaHVua2VkLmNodW5rcyk7XG5cbiAgLy8gU2F2ZSBtZXRhZGF0YVxuICBjb25zdCBtZXRhZGF0YSA9IHtcbiAgICBjaHVua0NvdW50OiBjaHVua2VkLmNodW5rQ291bnQsXG4gICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgdmFyaWFibGVDb3VudFxuICB9O1xuICB3cml0ZVN5bmNNZXRhZGF0YShub2RlLCBtZXRhZGF0YSk7XG5cbiAgY29uc29sZS5sb2coYFtTeW5jXSBTdWNjZXNzZnVsbHkgc3luY2VkICR7Y2h1bmtlZC50b3RhbFNpemV9IGJ5dGVzIGluICR7Y2h1bmtlZC5jaHVua0NvdW50fSBjaHVua3MgdG8gbm9kZSAke25vZGUuaWR9YCk7XG5cbiAgcmV0dXJuIHtcbiAgICBub2RlSWQ6IG5vZGUuaWQsXG4gICAgdmFyaWFibGVDb3VudFxuICB9O1xufVxuXG4vKipcbiAqIEdldCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgbGFzdCBzeW5jLlxuICpcbiAqIFNlYXJjaGVzIGFsbCBwYWdlcyBpbiB0aGUgY3VycmVudCBGaWdtYSBmaWxlIGZvciB0aGUgcmVnaXN0cnkgbm9kZSBhbmQgcmVhZHNcbiAqIGl0cyBtZXRhZGF0YSB0byBkZXRlcm1pbmUgd2hlbiB0aGUgbGFzdCBzeW5jIG9jY3VycmVkIGFuZCBob3cgbWFueSB2YXJpYWJsZXNcbiAqIHdlcmUgc3luY2VkLlxuICpcbiAqIFVzZWQgYnkgdGhlIFVJIHRvIGRpc3BsYXkgc3luYyBzdGF0dXMgYW5kIGhlbHAgdXNlcnMgdW5kZXJzdGFuZCBpZiB0aGVpclxuICogbG9jYWwgdG9rZW4gZGF0YSBpcyB1cC10by1kYXRlLlxuICpcbiAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHN5bmMgaW5mb3JtYXRpb25cbiAqICAgICAgICAgIC0gSWYgcmVnaXN0cnkgbm9kZSBleGlzdHM6IHsgZXhpc3RzOiB0cnVlLCBub2RlSWQsIHVwZGF0ZWRBdCwgdmFyaWFibGVDb3VudCB9XG4gKiAgICAgICAgICAtIElmIG5vIHN5bmMgZm91bmQ6IHsgZXhpc3RzOiBmYWxzZSB9XG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBjb25zdCBpbmZvID0gYXdhaXQgZ2V0TGFzdFN5bmNJbmZvKCk7XG4gKlxuICogaWYgKGluZm8uZXhpc3RzKSB7XG4gKiAgIGNvbnNvbGUubG9nKGBMYXN0IHN5bmNlZDogJHtpbmZvLnVwZGF0ZWRBdH1gKTtcbiAqICAgY29uc29sZS5sb2coYE5vZGUgSUQ6ICR7aW5mby5ub2RlSWR9YCk7XG4gKiAgIGNvbnNvbGUubG9nKGBWYXJpYWJsZXM6ICR7aW5mby52YXJpYWJsZUNvdW50fWApO1xuICogfSBlbHNlIHtcbiAqICAgY29uc29sZS5sb2coJ05vIHN5bmMgZm91bmQuIFN5bmMgdG8gY3JlYXRlIHJlZ2lzdHJ5IG5vZGUuJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldExhc3RTeW5jSW5mbygpOiBQcm9taXNlPFN5bmNJbmZvPiB7XG4gIGNvbnN0IG5vZGUgPSBhd2FpdCBmaW5kUmVnaXN0cnlOb2RlKCk7XG5cbiAgaWYgKCFub2RlKSB7XG4gICAgcmV0dXJuIHsgZXhpc3RzOiBmYWxzZSB9O1xuICB9XG5cbiAgcmV0dXJuIHJlYWRTeW5jTWV0YWRhdGEobm9kZSk7XG59XG5cbi8vIFJlLWV4cG9ydCB0eXBlcyBhbmQgdXRpbGl0aWVzIGZvciBjb252ZW5pZW5jZVxuZXhwb3J0IHR5cGUgeyBTeW5jSW5mbywgU3luY01ldGFkYXRhIH0gZnJvbSAnLi4vLi4vdHlwZXMvbWVzc2FnZS50eXBlcy5qcyc7XG5leHBvcnQgeyBjaHVua0RhdGEsIHVuY2h1bmtEYXRhIH0gZnJvbSAnLi9jaHVua2VyLmpzJztcbmV4cG9ydCB7XG4gIGZpbmRSZWdpc3RyeU5vZGUsXG4gIGdldE9yQ3JlYXRlUmVnaXN0cnlOb2RlLFxuICBjcmVhdGVSZWdpc3RyeU5vZGUsXG4gIGxvYWRDaHVua3NGcm9tTm9kZVxufSBmcm9tICcuL25vZGUtbWFuYWdlci5qcyc7XG5leHBvcnQgeyByZWFkU3luY01ldGFkYXRhLCB3cml0ZVN5bmNNZXRhZGF0YSB9IGZyb20gJy4vbWV0YWRhdGEuanMnO1xuIiwgIi8qKlxuICogRXhwb3J0IGJhc2VsaW5lIGJ1aWxkZXIgbW9kdWxlXG4gKiBCdWlsZHMgYmFzZWxpbmUgc25hcHNob3Qgc3RydWN0dXJlIGZyb20gRmlnbWEgdmFyaWFibGVzXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBCYXNlbGluZVNuYXBzaG90LCBCYXNlbGluZUVudHJ5LCBFeHBvcnRUb2tlbiwgQ29sbGVjdGlvbk1ldGFkYXRhIH0gZnJvbSAnLi4vLi4vdHlwZXMvaW5kZXguanMnO1xuaW1wb3J0IHsgbWFwRmlnbWFUeXBlVG9Ub2tlblR5cGUgfSBmcm9tICcuLi91dGlscy90eXBlLW1hcHBlcnMuanMnO1xuaW1wb3J0IHsgcmVzb2x2ZVZhcmlhYmxlVmFsdWUsIHNldE5lc3RlZFZhbHVlIH0gZnJvbSAnLi90cmFuc2Zvcm1lci5qcyc7XG5pbXBvcnQgeyBmaW5kUmVnaXN0cnlOb2RlLCBsb2FkQ2h1bmtzRnJvbU5vZGUsIHVuY2h1bmtEYXRhIH0gZnJvbSAnLi4vc3luYy9pbmRleC5qcyc7XG5pbXBvcnQgeyBQTFVHSU5fTkFNRVNQQUNFIH0gZnJvbSAnLi4vdXRpbHMvY29uc3RhbnRzLmpzJztcblxuLyoqXG4gKiBHZXQgdGhlIGN1cnJlbnQgYmFzZWxpbmUgdmVyc2lvbiBmcm9tIHRoZSBzdG9yZWQgcmVnaXN0cnkgbm9kZS5cbiAqIFJldHVybnMgXCIxLjAuMFwiIGlmIG5vIHByZXZpb3VzIHZlcnNpb24gZXhpc3RzLlxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRDdXJyZW50U3RvcmVkVmVyc2lvbigpOiBQcm9taXNlPHN0cmluZz4ge1xuICB0cnkge1xuICAgIGNvbnN0IG5vZGUgPSBhd2FpdCBmaW5kUmVnaXN0cnlOb2RlKCk7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICByZXR1cm4gJzEuMC4wJztcbiAgICB9XG5cbiAgICBjb25zdCBjaHVua0NvdW50U3RyID0gbm9kZS5nZXRTaGFyZWRQbHVnaW5EYXRhKFBMVUdJTl9OQU1FU1BBQ0UsICdjaHVua0NvdW50Jyk7XG4gICAgaWYgKCFjaHVua0NvdW50U3RyKSB7XG4gICAgICByZXR1cm4gJzEuMC4wJztcbiAgICB9XG5cbiAgICBjb25zdCBjaHVua0NvdW50ID0gcGFyc2VJbnQoY2h1bmtDb3VudFN0ciwgMTApO1xuICAgIGNvbnN0IGNodW5rcyA9IGxvYWRDaHVua3NGcm9tTm9kZShub2RlLCBQTFVHSU5fTkFNRVNQQUNFLCBjaHVua0NvdW50KTtcbiAgICBjb25zdCBzdG9yZWRCYXNlbGluZSA9IHVuY2h1bmtEYXRhKGNodW5rcykgYXMgYW55O1xuXG4gICAgcmV0dXJuIHN0b3JlZEJhc2VsaW5lPy4kbWV0YWRhdGE/LnZlcnNpb24gfHwgJzEuMC4wJztcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byByZWFkIHN0b3JlZCB2ZXJzaW9uLCBkZWZhdWx0aW5nIHRvIDEuMC4wOicsIGVycm9yKTtcbiAgICByZXR1cm4gJzEuMC4wJztcbiAgfVxufVxuXG4vKipcbiAqIEJ1aWxkIGEgY29tcGxldGUgYmFzZWxpbmUgc25hcHNob3QgZnJvbSBGaWdtYSB2YXJpYWJsZXNcbiAqIEdlbmVyYXRlcyBib3RoIG5lc3RlZCB0b2tlbiBzdHJ1Y3R1cmUgYW5kIGZsYXQgYmFzZWxpbmUgbG9va3VwXG4gKlxuICogQHBhcmFtIGZpbHRlckNvbGxlY3Rpb25JZHMgLSBPcHRpb25hbCBhcnJheSBvZiBjb2xsZWN0aW9uIElEcyB0byBleHBvcnQgKG51bGwgPSBhbGwpXG4gKiBAcmV0dXJucyBDb21wbGV0ZSBiYXNlbGluZSBzbmFwc2hvdCB3aXRoIG1ldGFkYXRhXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBidWlsZEJhc2VsaW5lU25hcHNob3QoXG4gIGZpbHRlckNvbGxlY3Rpb25JZHM6IHN0cmluZ1tdIHwgbnVsbCA9IG51bGxcbik6IFByb21pc2U8QmFzZWxpbmVTbmFwc2hvdD4ge1xuICBsZXQgY29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgY29uc3QgYWxsVmFyaWFibGVzID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldExvY2FsVmFyaWFibGVzQXN5bmMoKTtcblxuICAvLyBGaWx0ZXIgY29sbGVjdGlvbnMgaWYgc3BlY2lmaWMgSURzIHByb3ZpZGVkXG4gIGlmIChmaWx0ZXJDb2xsZWN0aW9uSWRzICYmIGZpbHRlckNvbGxlY3Rpb25JZHMubGVuZ3RoID4gMCkge1xuICAgIGNvbGxlY3Rpb25zID0gY29sbGVjdGlvbnMuZmlsdGVyKGMgPT4gZmlsdGVyQ29sbGVjdGlvbklkcy5pbmNsdWRlcyhjLmlkKSk7XG4gIH1cblxuICAvLyBHZXQgcmVnaXN0cnkgbm9kZSBJRCBpZiBpdCBleGlzdHNcbiAgY29uc3QgcmVnaXN0cnlOb2RlID0gYXdhaXQgZmluZFJlZ2lzdHJ5Tm9kZSgpO1xuICBjb25zdCByZWdpc3RyeU5vZGVJZCA9IHJlZ2lzdHJ5Tm9kZT8uaWQ7XG5cbiAgLy8gQnVpbGQgY29sbGVjdGlvbiBtZXRhZGF0YVxuICBjb25zdCBjb2xsZWN0aW9uTWV0YWRhdGE6IENvbGxlY3Rpb25NZXRhZGF0YVtdID0gY29sbGVjdGlvbnMubWFwKGNvbCA9PiB7XG4gICAgY29uc3QgY29sVmFyaWFibGVzID0gYWxsVmFyaWFibGVzLmZpbHRlcih2ID0+IHYudmFyaWFibGVDb2xsZWN0aW9uSWQgPT09IGNvbC5pZCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBjb2wuaWQsXG4gICAgICBuYW1lOiBjb2wubmFtZSxcbiAgICAgIG1vZGVDb3VudDogY29sLm1vZGVzLmxlbmd0aCxcbiAgICAgIHZhcmlhYmxlQ291bnQ6IGNvbFZhcmlhYmxlcy5sZW5ndGgsXG4gICAgICBtb2RlczogY29sLm1vZGVzLm1hcChtID0+ICh7IGlkOiBtLm1vZGVJZCwgbmFtZTogbS5uYW1lIH0pKVxuICAgIH07XG4gIH0pO1xuXG4gIC8vIENvdW50IHRvdGFsIHZhcmlhYmxlc1xuICBjb25zdCB0b3RhbFZhcmlhYmxlQ291bnQgPSBjb2xsZWN0aW9ucy5yZWR1Y2UoKHN1bSwgY29sKSA9PiB7XG4gICAgcmV0dXJuIHN1bSArIGFsbFZhcmlhYmxlcy5maWx0ZXIodiA9PiB2LnZhcmlhYmxlQ29sbGVjdGlvbklkID09PSBjb2wuaWQpLmxlbmd0aDtcbiAgfSwgMCk7XG5cbiAgLy8gR2V0IHRoZSBjdXJyZW50IHN0b3JlZCB2ZXJzaW9uIChmcm9tIGxhc3Qgc3luYykgZm9yIHRoZSBleHBvcnRcbiAgY29uc3Qgc3RvcmVkVmVyc2lvbiA9IGF3YWl0IGdldEN1cnJlbnRTdG9yZWRWZXJzaW9uKCk7XG5cbiAgLy8gSW5pdGlhbGl6ZSBvdXRwdXQgc3RydWN0dXJlIHdpdGggZW5oYW5jZWQgbWV0YWRhdGFcbiAgY29uc3Qgb3V0cHV0OiBCYXNlbGluZVNuYXBzaG90ID0ge1xuICAgICRtZXRhZGF0YToge1xuICAgICAgdmVyc2lvbjogc3RvcmVkVmVyc2lvbixcbiAgICAgIGV4cG9ydGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIHBsdWdpblZlcnNpb246ICcyLjAuMCcsXG4gICAgICBmaWxlS2V5OiBmaWdtYS5maWxlS2V5IHx8ICcnLFxuICAgICAgZmlsZU5hbWU6IGZpZ21hLnJvb3QubmFtZSxcbiAgICAgIHJlZ2lzdHJ5Tm9kZUlkOiByZWdpc3RyeU5vZGVJZCxcbiAgICAgIHZhcmlhYmxlQ291bnQ6IHRvdGFsVmFyaWFibGVDb3VudCxcbiAgICAgIGNvbGxlY3Rpb25Db3VudDogY29sbGVjdGlvbnMubGVuZ3RoLFxuICAgICAgY29sbGVjdGlvbnM6IGNvbGxlY3Rpb25NZXRhZGF0YVxuICAgIH0sXG4gICAgYmFzZWxpbmU6IHt9XG4gIH07XG5cbiAgLy8gUHJvY2VzcyBlYWNoIGNvbGxlY3Rpb25cbiAgZm9yIChjb25zdCBjb2xsZWN0aW9uIG9mIGNvbGxlY3Rpb25zKSB7XG4gICAgY29uc3QgY29sbGVjdGlvbk5hbWUgPSBjb2xsZWN0aW9uLm5hbWU7XG4gICAgY29uc3QgdmFyaWFibGVzID0gYWxsVmFyaWFibGVzLmZpbHRlcih2ID0+IHYudmFyaWFibGVDb2xsZWN0aW9uSWQgPT09IGNvbGxlY3Rpb24uaWQpO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSBjb2xsZWN0aW9uIGluIG91dHB1dFxuICAgIGlmICghb3V0cHV0W2NvbGxlY3Rpb25OYW1lXSkge1xuICAgICAgb3V0cHV0W2NvbGxlY3Rpb25OYW1lXSA9IHt9O1xuICAgIH1cblxuICAgIC8vIFByb2Nlc3MgZWFjaCBtb2RlXG4gICAgZm9yIChjb25zdCBtb2RlIG9mIGNvbGxlY3Rpb24ubW9kZXMpIHtcbiAgICAgIC8vIFVzZSBcInZhbHVlXCIgYXMgZGVmYXVsdCBtb2RlIG5hbWUgaWYgRmlnbWEncyBkZWZhdWx0IFwiTW9kZSAxXCIgaXMgZGV0ZWN0ZWRcbiAgICAgIGNvbnN0IG1vZGVOYW1lID0gbW9kZS5uYW1lID09PSAnTW9kZSAxJyA/ICd2YWx1ZScgOiBtb2RlLm5hbWU7XG5cbiAgICAgIC8vIEluaXRpYWxpemUgbW9kZSBpbiBjb2xsZWN0aW9uXG4gICAgICBpZiAoIW91dHB1dFtjb2xsZWN0aW9uTmFtZV1bbW9kZU5hbWVdKSB7XG4gICAgICAgIG91dHB1dFtjb2xsZWN0aW9uTmFtZV1bbW9kZU5hbWVdID0ge307XG4gICAgICB9XG5cbiAgICAgIC8vIFByb2Nlc3MgZWFjaCB2YXJpYWJsZSBpbiB0aGlzIG1vZGVcbiAgICAgIGZvciAoY29uc3QgdmFyaWFibGUgb2YgdmFyaWFibGVzKSB7XG4gICAgICAgIGNvbnN0IHBhdGhQYXJ0cyA9IHZhcmlhYmxlLm5hbWUuc3BsaXQoJy8nKS5tYXAocCA9PiBwLnRyaW0oKSk7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgcmVzb2x2ZVZhcmlhYmxlVmFsdWUodmFyaWFibGUsIG1vZGUubW9kZUlkKTtcbiAgICAgICAgY29uc3QgdG9rZW5UeXBlID0gbWFwRmlnbWFUeXBlVG9Ub2tlblR5cGUodmFyaWFibGUucmVzb2x2ZWRUeXBlKTtcblxuICAgICAgICAvLyBDcmVhdGUgcHJlZml4ZWQgdmFyaWFibGUgSUQ6IGNvbGxlY3Rpb25OYW1lOm1vZGVOYW1lOlZhcmlhYmxlSURcbiAgICAgICAgY29uc3QgcHJlZml4ZWRJZCA9IGAke2NvbGxlY3Rpb25OYW1lfToke21vZGVOYW1lfToke3ZhcmlhYmxlLmlkfWA7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRva2VuIGZvciBuZXN0ZWQgc3RydWN0dXJlXG4gICAgICAgIGNvbnN0IHRva2VuOiBFeHBvcnRUb2tlbiA9IHtcbiAgICAgICAgICAkdHlwZTogdG9rZW5UeXBlLFxuICAgICAgICAgICR2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgJHZhcmlhYmxlSWQ6IHByZWZpeGVkSWRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgdG8gbmVzdGVkIHN0cnVjdHVyZVxuICAgICAgICBzZXROZXN0ZWRWYWx1ZShvdXRwdXRbY29sbGVjdGlvbk5hbWVdW21vZGVOYW1lXSwgcGF0aFBhcnRzLCB0b2tlbik7XG5cbiAgICAgICAgLy8gQWRkIHRvIGJhc2VsaW5lIChmbGF0IHN0cnVjdHVyZSkgd2l0aCBJRHMgZm9yIHJlLWltcG9ydCBtYXRjaGluZ1xuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IGAke2NvbGxlY3Rpb25OYW1lfS4ke21vZGVOYW1lfS4ke3BhdGhQYXJ0cy5qb2luKCcuJyl9YDtcbiAgICAgICAgb3V0cHV0LmJhc2VsaW5lW3ByZWZpeGVkSWRdID0ge1xuICAgICAgICAgIHBhdGg6IGZ1bGxQYXRoLFxuICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICB0eXBlOiB0b2tlblR5cGUsXG4gICAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgbW9kZTogbW9kZU5hbWUsXG4gICAgICAgICAgdmFyaWFibGVJZDogdmFyaWFibGUuaWQsXG4gICAgICAgICAgY29sbGVjdGlvbklkOiBjb2xsZWN0aW9uLmlkLFxuICAgICAgICAgIG1vZGVJZDogbW9kZS5tb2RlSWQsXG4gICAgICAgICAgZGVzY3JpcHRpb246IHZhcmlhYmxlLmRlc2NyaXB0aW9uIHx8IHVuZGVmaW5lZFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvdXRwdXQ7XG59XG4iLCAiLyoqXG4gKiBFeHBvcnQgb3JjaGVzdHJhdG9yIG1vZHVsZVxuICogTWFpbiBlbnRyeSBwb2ludCBmb3IgZXhwb3J0aW5nIGJhc2VsaW5lIHNuYXBzaG90cyBmcm9tIEZpZ21hIHZhcmlhYmxlc1xuICpcbiAqIEBtb2R1bGUgYmFja2VuZC9leHBvcnRcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEJhc2VsaW5lU25hcHNob3QgfSBmcm9tICcuLi8uLi90eXBlcy9pbmRleC5qcyc7XG5pbXBvcnQgeyBidWlsZEJhc2VsaW5lU25hcHNob3QgfSBmcm9tICcuL2Jhc2VsaW5lLmpzJztcblxuLyoqXG4gKiBFeHBvcnQgYmFzZWxpbmUgc25hcHNob3Qgd2l0aCBvcHRpb25hbCBjb2xsZWN0aW9uIGZpbHRlcmluZy5cbiAqXG4gKiBDcmVhdGVzIGEgY29tcGxldGUgc25hcHNob3Qgb2YgRmlnbWEgdmFyaWFibGVzIGluIGEgc3RhbmRhcmRpemVkIGJhc2VsaW5lIGZvcm1hdFxuICogdGhhdCBjYW4gYmUgdXNlZCBmb3I6XG4gKiAtIFN5bmNpbmcgdG8gdGhlIHJlZ2lzdHJ5IG5vZGUgZm9yIEFQSSBhY2Nlc3NcbiAqIC0gRXhwb3J0aW5nIHRvIEpTT04gZmlsZXMgZm9yIHZlcnNpb24gY29udHJvbFxuICogLSBEaWZmaW5nIGFnYWluc3QgcHJldmlvdXMgYmFzZWxpbmVzIHRvIGRldGVjdCBjaGFuZ2VzXG4gKlxuICogVGhlIGJhc2VsaW5lIHNuYXBzaG90IGluY2x1ZGVzOlxuICogLSBOZXN0ZWQgdG9rZW4gc3RydWN0dXJlIG9yZ2FuaXplZCBieSBjb2xsZWN0aW9uIFx1MjE5MiBtb2RlIFx1MjE5MiBncm91cCBcdTIxOTIgdG9rZW5cbiAqIC0gRmxhdCBiYXNlbGluZSBsb29rdXAgbWFwcGluZyB2YXJpYWJsZSBJRHMgdG8gbWV0YWRhdGFcbiAqIC0gTWV0YWRhdGEgYWJvdXQgdGhlIGV4cG9ydCAodGltZXN0YW1wLCBmaWxlIGluZm8sIHBsdWdpbiB2ZXJzaW9uKVxuICpcbiAqIEBwYXJhbSBmaWx0ZXJDb2xsZWN0aW9uSWRzIC0gT3B0aW9uYWwgYXJyYXkgb2YgY29sbGVjdGlvbiBJRHMgdG8gZXhwb3J0LlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJZiBudWxsIG9yIGVtcHR5LCBhbGwgY29sbGVjdGlvbnMgYXJlIGV4cG9ydGVkLlxuICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY29tcGxldGUgYmFzZWxpbmUgc25hcHNob3RcbiAqXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgRmlnbWEgQVBJIGNhbGxzIGZhaWxcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiB2YXJpYWJsZSB2YWx1ZSByZXNvbHV0aW9uIGZhaWxzXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiAvLyBFeHBvcnQgYWxsIGNvbGxlY3Rpb25zXG4gKiBjb25zdCBmdWxsQmFzZWxpbmUgPSBhd2FpdCBleHBvcnRCYXNlbGluZSgpO1xuICpcbiAqIC8vIEV4cG9ydCBzcGVjaWZpYyBjb2xsZWN0aW9uc1xuICogY29uc3QgZmlsdGVyZWRCYXNlbGluZSA9IGF3YWl0IGV4cG9ydEJhc2VsaW5lKFsnY29sbGVjdGlvbi1pZC0xJywgJ2NvbGxlY3Rpb24taWQtMiddKTtcbiAqXG4gKiAvLyBBY2Nlc3MgbmVzdGVkIHN0cnVjdHVyZVxuICogY29uc3QgcHJpbWFyeUNvbG9yID0gZnVsbEJhc2VsaW5lWydEZXNpZ24gVG9rZW5zJ10ubGlnaHQuY29sb3JzLnByaW1hcnk7XG4gKlxuICogLy8gQWNjZXNzIGZsYXQgYmFzZWxpbmVcbiAqIGNvbnN0IHZhcmlhYmxlSW5mbyA9IGZ1bGxCYXNlbGluZS5iYXNlbGluZVsnMTIzOjQ1NiddO1xuICogLy8geyBwYXRoOiAnY29sb3JzL3ByaW1hcnknLCB2YWx1ZTogJyMwMDAwZmYnLCB0eXBlOiAnY29sb3InLCAuLi4gfVxuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleHBvcnRCYXNlbGluZShcbiAgZmlsdGVyQ29sbGVjdGlvbklkczogc3RyaW5nW10gfCBudWxsID0gbnVsbFxuKTogUHJvbWlzZTxCYXNlbGluZVNuYXBzaG90PiB7XG4gIHJldHVybiBidWlsZEJhc2VsaW5lU25hcHNob3QoZmlsdGVyQ29sbGVjdGlvbklkcyk7XG59XG5cbi8vIFJlLWV4cG9ydCB0cmFuc2Zvcm1lciB1dGlsaXRpZXMgZm9yIGNvbnZlbmllbmNlXG5leHBvcnQgeyByZXNvbHZlVmFyaWFibGVWYWx1ZSwgc2V0TmVzdGVkVmFsdWUgfSBmcm9tICcuL3RyYW5zZm9ybWVyLmpzJztcbmV4cG9ydCB7IGJ1aWxkQmFzZWxpbmVTbmFwc2hvdCB9IGZyb20gJy4vYmFzZWxpbmUuanMnO1xuIiwgIi8qKlxuICogQmFzZWxpbmUgZm9ybWF0IGRldGVjdGlvbiB1dGlsaXRpZXNcbiAqXG4gKiBEZXRlY3RzIGlmIGltcG9ydGVkIEpTT04gaXMgaW4gYmFzZWxpbmUgZXhwb3J0IGZvcm1hdCBhbmQgZXh0cmFjdHMgbWV0YWRhdGFcbiAqIGZvciByb3VuZC10cmlwIGltcG9ydC9leHBvcnQgZnVuY3Rpb25hbGl0eS5cbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEJhc2VsaW5lTWV0YWRhdGEge1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIGV4cG9ydGVkQXQ6IHN0cmluZztcbiAgcGx1Z2luVmVyc2lvbjogc3RyaW5nO1xuICBmaWxlS2V5Pzogc3RyaW5nO1xuICBmaWxlTmFtZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2xsZWN0aW9uU3VtbWFyeSB7XG4gIG5hbWU6IHN0cmluZztcbiAgbW9kZUNvdW50OiBudW1iZXI7XG4gIHRva2VuQ291bnQ6IG51bWJlcjtcbiAgbW9kZXM6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJhc2VsaW5lRGV0ZWN0aW9uUmVzdWx0IHtcbiAgaXNCYXNlbGluZTogYm9vbGVhbjtcbiAgbWV0YWRhdGE/OiBCYXNlbGluZU1ldGFkYXRhO1xuICBjb2xsZWN0aW9ucz86IENvbGxlY3Rpb25TdW1tYXJ5W107XG4gIHRvdGFsVG9rZW5zPzogbnVtYmVyO1xuICB0b3RhbENvbGxlY3Rpb25zPzogbnVtYmVyO1xuICB0b3RhbE1vZGVzPzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFZlcnNpb25Db21wYXRpYmlsaXR5UmVzdWx0IHtcbiAgY29tcGF0aWJsZTogYm9vbGVhbjtcbiAgd2FybmluZz86IHN0cmluZztcbn1cblxuLyoqXG4gKiBEZXRlY3QgaWYgYSBKU09OIGZpbGUgaXMgaW4gYmFzZWxpbmUgZXhwb3J0IGZvcm1hdFxuICpcbiAqIFZhbGlkYXRlcyBzdHJ1Y3R1cmUgYW5kIGV4dHJhY3RzIGNvbGxlY3Rpb24gc3VtbWFyaWVzIGZvciBwcmV2aWV3XG4gKlxuICogQHBhcmFtIGpzb24gLSBQYXJzZWQgSlNPTiBvYmplY3QgdG8gdmFsaWRhdGVcbiAqIEByZXR1cm5zIERldGVjdGlvbiByZXN1bHQgd2l0aCBtZXRhZGF0YSBhbmQgY29sbGVjdGlvbiBpbmZvXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXRlY3RCYXNlbGluZUZvcm1hdChqc29uOiBhbnkpOiBCYXNlbGluZURldGVjdGlvblJlc3VsdCB7XG4gIC8vIFR5cGUgZ3VhcmQ6IG11c3QgYmUgYW4gb2JqZWN0XG4gIGlmICghanNvbiB8fCB0eXBlb2YganNvbiAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShqc29uKSkge1xuICAgIHJldHVybiB7IGlzQmFzZWxpbmU6IGZhbHNlIH07XG4gIH1cblxuICAvLyBDaGVjayBmb3IgcmVxdWlyZWQgdG9wLWxldmVsIGZpZWxkc1xuICBpZiAoIWpzb24uJG1ldGFkYXRhIHx8ICFqc29uLmJhc2VsaW5lKSB7XG4gICAgcmV0dXJuIHsgaXNCYXNlbGluZTogZmFsc2UgfTtcbiAgfVxuXG4gIC8vIFZhbGlkYXRlIG1ldGFkYXRhIHN0cnVjdHVyZVxuICBjb25zdCBtZXRhZGF0YSA9IGpzb24uJG1ldGFkYXRhO1xuICBpZiAoIW1ldGFkYXRhIHx8IHR5cGVvZiBtZXRhZGF0YSAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4geyBpc0Jhc2VsaW5lOiBmYWxzZSB9O1xuICB9XG5cbiAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgbWV0YWRhdGEgZmllbGRzXG4gIGlmICghbWV0YWRhdGEudmVyc2lvbiB8fCAhbWV0YWRhdGEuZXhwb3J0ZWRBdCkge1xuICAgIHJldHVybiB7IGlzQmFzZWxpbmU6IGZhbHNlIH07XG4gIH1cblxuICAvLyBWYWxpZGF0ZSBiYXNlbGluZSBpcyBhbiBvYmplY3RcbiAgaWYgKCFqc29uLmJhc2VsaW5lIHx8IHR5cGVvZiBqc29uLmJhc2VsaW5lICE9PSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KGpzb24uYmFzZWxpbmUpKSB7XG4gICAgcmV0dXJuIHsgaXNCYXNlbGluZTogZmFsc2UgfTtcbiAgfVxuXG4gIC8vIEV4dHJhY3QgY29sbGVjdGlvbiBzdW1tYXJpZXMgZnJvbSBiYXNlbGluZVxuICBjb25zdCBjb2xsZWN0aW9ucyA9IGV4dHJhY3RDb2xsZWN0aW9uU3VtbWFyaWVzKGpzb24uYmFzZWxpbmUpO1xuXG4gIC8vIENhbGN1bGF0ZSB0b3RhbCB1bmlxdWUgbW9kZXMgYWNyb3NzIGFsbCBjb2xsZWN0aW9uc1xuICBjb25zdCBhbGxNb2RlcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb2xsZWN0aW9ucy5mb3JFYWNoKGNvbCA9PiBjb2wubW9kZXMuZm9yRWFjaChtb2RlID0+IGFsbE1vZGVzLmFkZChtb2RlKSkpO1xuXG4gIHJldHVybiB7XG4gICAgaXNCYXNlbGluZTogdHJ1ZSxcbiAgICBtZXRhZGF0YToge1xuICAgICAgdmVyc2lvbjogbWV0YWRhdGEudmVyc2lvbixcbiAgICAgIGV4cG9ydGVkQXQ6IG1ldGFkYXRhLmV4cG9ydGVkQXQsXG4gICAgICBwbHVnaW5WZXJzaW9uOiBtZXRhZGF0YS5wbHVnaW5WZXJzaW9uIHx8ICd1bmtub3duJyxcbiAgICAgIGZpbGVLZXk6IG1ldGFkYXRhLmZpbGVLZXkgfHwgdW5kZWZpbmVkLFxuICAgICAgZmlsZU5hbWU6IG1ldGFkYXRhLmZpbGVOYW1lIHx8IHVuZGVmaW5lZFxuICAgIH0sXG4gICAgY29sbGVjdGlvbnMsXG4gICAgdG90YWxUb2tlbnM6IE9iamVjdC5rZXlzKGpzb24uYmFzZWxpbmUpLmxlbmd0aCxcbiAgICB0b3RhbENvbGxlY3Rpb25zOiBjb2xsZWN0aW9ucy5sZW5ndGgsXG4gICAgdG90YWxNb2RlczogYWxsTW9kZXMuc2l6ZVxuICB9O1xufVxuXG4vKipcbiAqIEV4dHJhY3QgY29sbGVjdGlvbiBzdW1tYXJpZXMgZnJvbSBiYXNlbGluZSBkYXRhXG4gKlxuICogR3JvdXBzIHRva2VucyBieSBjb2xsZWN0aW9uIGFuZCBjb3VudHMgbW9kZXMvdG9rZW5zIHBlciBjb2xsZWN0aW9uXG4gKlxuICogQHBhcmFtIGJhc2VsaW5lIC0gQmFzZWxpbmUgdG9rZW4gZGF0YSBvYmplY3RcbiAqIEByZXR1cm5zIEFycmF5IG9mIGNvbGxlY3Rpb24gc3VtbWFyaWVzXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RDb2xsZWN0aW9uU3VtbWFyaWVzKGJhc2VsaW5lOiBhbnkpOiBDb2xsZWN0aW9uU3VtbWFyeVtdIHtcbiAgY29uc3QgY29sbGVjdGlvbk1hcCA9IG5ldyBNYXA8c3RyaW5nLCB7XG4gICAgbW9kZXM6IFNldDxzdHJpbmc+O1xuICAgIHRva2VuQ291bnQ6IG51bWJlcjtcbiAgfT4oKTtcblxuICAvLyBHcm91cCBieSBjb2xsZWN0aW9uIG5hbWVcbiAgZm9yIChjb25zdCBba2V5LCB0b2tlbl0gb2YgT2JqZWN0LmVudHJpZXMoYmFzZWxpbmUpKSB7XG4gICAgLy8gU2tpcCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAoIXRva2VuIHx8IHR5cGVvZiB0b2tlbiAhPT0gJ29iamVjdCcpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHRva2VuRGF0YSA9IHRva2VuIGFzIGFueTtcbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IHRva2VuRGF0YS5jb2xsZWN0aW9uO1xuICAgIGNvbnN0IG1vZGVOYW1lID0gdG9rZW5EYXRhLm1vZGU7XG5cbiAgICAvLyBTa2lwIHRva2VucyB3aXRob3V0IHJlcXVpcmVkIGZpZWxkc1xuICAgIGlmICghY29sbGVjdGlvbk5hbWUgfHwgIW1vZGVOYW1lKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBJbml0aWFsaXplIGNvbGxlY3Rpb24gaWYgbm90IGV4aXN0c1xuICAgIGlmICghY29sbGVjdGlvbk1hcC5oYXMoY29sbGVjdGlvbk5hbWUpKSB7XG4gICAgICBjb2xsZWN0aW9uTWFwLnNldChjb2xsZWN0aW9uTmFtZSwge1xuICAgICAgICBtb2RlczogbmV3IFNldCgpLFxuICAgICAgICB0b2tlbkNvdW50OiAwXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uID0gY29sbGVjdGlvbk1hcC5nZXQoY29sbGVjdGlvbk5hbWUpITtcbiAgICBjb2xsZWN0aW9uLm1vZGVzLmFkZChtb2RlTmFtZSk7XG4gICAgY29sbGVjdGlvbi50b2tlbkNvdW50Kys7XG4gIH1cblxuICAvLyBDb252ZXJ0IHRvIGFycmF5IGFuZCBzb3J0IGJ5IG5hbWUgZm9yIGNvbnNpc3RlbmN5XG4gIHJldHVybiBBcnJheS5mcm9tKGNvbGxlY3Rpb25NYXAuZW50cmllcygpKVxuICAgIC5tYXAoKFtuYW1lLCBkYXRhXSkgPT4gKHtcbiAgICAgIG5hbWUsXG4gICAgICBtb2RlQ291bnQ6IGRhdGEubW9kZXMuc2l6ZSxcbiAgICAgIHRva2VuQ291bnQ6IGRhdGEudG9rZW5Db3VudCxcbiAgICAgIG1vZGVzOiBBcnJheS5mcm9tKGRhdGEubW9kZXMpLnNvcnQoKVxuICAgIH0pKVxuICAgIC5zb3J0KChhLCBiKSA9PiBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpKTtcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSBiYXNlbGluZSBmb3JtYXQgdmVyc2lvbiBjb21wYXRpYmlsaXR5XG4gKlxuICogQ2hlY2tzIGlmIHRoZSBiYXNlbGluZSB2ZXJzaW9uIGlzIGNvbXBhdGlibGUgd2l0aCBjdXJyZW50IHBsdWdpbiB2ZXJzaW9uLlxuICogTWFqb3IgdmVyc2lvbiBtdXN0IG1hdGNoICh2Mi54LngpLCBtaW5vci9wYXRjaCBkaWZmZXJlbmNlcyBhcmUgYWNjZXB0YWJsZS5cbiAqXG4gKiBAcGFyYW0gdmVyc2lvbiAtIFZlcnNpb24gc3RyaW5nIGZyb20gYmFzZWxpbmUgbWV0YWRhdGEgKGUuZy4sIFwiMi4wLjBcIilcbiAqIEByZXR1cm5zIENvbXBhdGliaWxpdHkgcmVzdWx0IHdpdGggb3B0aW9uYWwgd2FybmluZyBtZXNzYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ZlcnNpb25Db21wYXRpYmxlKHZlcnNpb246IHN0cmluZyk6IFZlcnNpb25Db21wYXRpYmlsaXR5UmVzdWx0IHtcbiAgLy8gUGFyc2UgdmVyc2lvbiBzdHJpbmdcbiAgY29uc3QgcGFydHMgPSB2ZXJzaW9uLnNwbGl0KCcuJyk7XG4gIGlmIChwYXJ0cy5sZW5ndGggPCAxKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbXBhdGlibGU6IGZhbHNlLFxuICAgICAgd2FybmluZzogJ0ludmFsaWQgdmVyc2lvbiBmb3JtYXQnXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IG1ham9yID0gcGFyc2VJbnQocGFydHNbMF0sIDEwKTtcbiAgaWYgKGlzTmFOKG1ham9yKSkge1xuICAgIHJldHVybiB7XG4gICAgICBjb21wYXRpYmxlOiBmYWxzZSxcbiAgICAgIHdhcm5pbmc6ICdJbnZhbGlkIHZlcnNpb24gZm9ybWF0J1xuICAgIH07XG4gIH1cblxuICBjb25zdCBjdXJyZW50TWFqb3IgPSAyO1xuXG4gIC8vIFJlamVjdCBvbGRlciBtYWpvciB2ZXJzaW9uc1xuICBpZiAobWFqb3IgPCBjdXJyZW50TWFqb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29tcGF0aWJsZTogZmFsc2UsXG4gICAgICB3YXJuaW5nOiBgQmFzZWxpbmUgdmVyc2lvbiAke3ZlcnNpb259IGlzIG91dGRhdGVkLiBDdXJyZW50IHZlcnNpb24gaXMgJHtjdXJyZW50TWFqb3J9LngueGBcbiAgICB9O1xuICB9XG5cbiAgLy8gV2FybiBhYm91dCBuZXdlciBtYWpvciB2ZXJzaW9ucyBidXQgYWxsb3cgaW1wb3J0XG4gIGlmIChtYWpvciA+IGN1cnJlbnRNYWpvcikge1xuICAgIHJldHVybiB7XG4gICAgICBjb21wYXRpYmxlOiB0cnVlLFxuICAgICAgd2FybmluZzogYEJhc2VsaW5lIHdhcyBleHBvcnRlZCBmcm9tIGEgbmV3ZXIgdmVyc2lvbiAoJHt2ZXJzaW9ufSkuIFNvbWUgZmVhdHVyZXMgbWF5IG5vdCBiZSBzdXBwb3J0ZWQuYFxuICAgIH07XG4gIH1cblxuICAvLyBTYW1lIG1ham9yIHZlcnNpb24gLSBmdWxseSBjb21wYXRpYmxlXG4gIHJldHVybiB7IGNvbXBhdGlibGU6IHRydWUgfTtcbn1cbiIsICIvKipcbiAqIEJhc2VsaW5lIHZhbGlkYXRpb24gdXRpbGl0aWVzXG4gKlxuICogVmFsaWRhdGVzIGJhc2VsaW5lIGRhdGEgZm9yIGJyb2tlbiBhbGlhcyByZWZlcmVuY2VzIGFuZCBjaXJjdWxhciByZWZlcmVuY2VzXG4gKiBiZWZvcmUgaW1wb3J0IG9yIHN5bmMgb3BlcmF0aW9ucy4gQnJva2VuIGFsaWFzZXMgY2F1c2UgY29ycnVwdGlvbiBpbiBGaWdtYVxuICogYW5kIG11c3QgYmxvY2sgb3BlcmF0aW9ucy5cbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEJyb2tlbkFsaWFzIHtcbiAgdG9rZW5QYXRoOiBzdHJpbmc7ICAgICAgIC8vIGUuZy4sIFwiY29sb3JzLmJ1dHRvbi1iZ1wiXG4gIHRva2VuS2V5OiBzdHJpbmc7ICAgICAgICAvLyBlLmcuLCBcImtleTJcIlxuICBhbGlhc1JlZmVyZW5jZTogc3RyaW5nOyAgLy8gZS5nLiwgXCJ7Y29sb3JzLnByaW1hcnl9XCJcbiAgcmVmZXJlbmNlUGF0aDogc3RyaW5nOyAgIC8vIGUuZy4sIFwiY29sb3JzLnByaW1hcnlcIlxuICBlcnJvcjogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENpcmN1bGFyUmVmZXJlbmNlIHtcbiAgcGF0aDogc3RyaW5nW107ICAgICAgICAgIC8vIGUuZy4sIFtcIkFcIiwgXCJCXCIsIFwiQ1wiLCBcIkFcIl1cbiAgZXJyb3I6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWYWxpZGF0aW9uUmVzdWx0IHtcbiAgdmFsaWQ6IGJvb2xlYW47XG4gIGJyb2tlbkFsaWFzZXM6IEJyb2tlbkFsaWFzW107XG4gIGNpcmN1bGFyUmVmZXJlbmNlczogQ2lyY3VsYXJSZWZlcmVuY2VbXTtcbiAgZXJyb3JDb3VudDogbnVtYmVyO1xuICB3YXJuaW5nczogc3RyaW5nW107XG59XG5cbi8qKlxuICogVmFsaWRhdGUgYmFzZWxpbmUgZm9yIGJyb2tlbiBhbGlhcyByZWZlcmVuY2VzIGFuZCBjaXJjdWxhciByZWZzXG4gKlxuICogUGVyZm9ybXMgY29tcHJlaGVuc2l2ZSB2YWxpZGF0aW9uIG9mIGJhc2VsaW5lIGRhdGE6XG4gKiAtIENoZWNrcyB0aGF0IGFsbCBhbGlhcyByZWZlcmVuY2VzIHBvaW50IHRvIGV4aXN0aW5nIHRva2Vuc1xuICogLSBEZXRlY3RzIGNpcmN1bGFyIHJlZmVyZW5jZSBjaGFpbnNcbiAqIC0gUmV0dXJucyBkZXRhaWxlZCBlcnJvciBpbmZvcm1hdGlvbiBmb3IgZGVidWdnaW5nXG4gKlxuICogQHBhcmFtIGJhc2VsaW5lIC0gQmFzZWxpbmUgb2JqZWN0IHdpdGggJG1ldGFkYXRhIGFuZCBiYXNlbGluZSBwcm9wZXJ0aWVzXG4gKiBAcmV0dXJucyBWYWxpZGF0aW9uIHJlc3VsdCB3aXRoIGVycm9ycyBhbmQgd2FybmluZ3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQmFzZWxpbmUoYmFzZWxpbmU6IGFueSk6IFZhbGlkYXRpb25SZXN1bHQge1xuICBjb25zdCBicm9rZW5BbGlhc2VzOiBCcm9rZW5BbGlhc1tdID0gW107XG4gIGNvbnN0IGNpcmN1bGFyUmVmZXJlbmNlczogQ2lyY3VsYXJSZWZlcmVuY2VbXSA9IFtdO1xuICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXTtcblxuICAvLyBWYWxpZGF0ZSBiYXNlbGluZSBmb3JtYXRcbiAgaWYgKCFiYXNlbGluZSB8fCB0eXBlb2YgYmFzZWxpbmUgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgIGJyb2tlbkFsaWFzZXM6IFtdLFxuICAgICAgY2lyY3VsYXJSZWZlcmVuY2VzOiBbXSxcbiAgICAgIGVycm9yQ291bnQ6IDEsXG4gICAgICB3YXJuaW5nczogWydJbnZhbGlkIGJhc2VsaW5lIGZvcm1hdDogZXhwZWN0ZWQgb2JqZWN0J11cbiAgICB9O1xuICB9XG5cbiAgaWYgKCFiYXNlbGluZS5iYXNlbGluZSkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICBicm9rZW5BbGlhc2VzOiBbXSxcbiAgICAgIGNpcmN1bGFyUmVmZXJlbmNlczogW10sXG4gICAgICBlcnJvckNvdW50OiAxLFxuICAgICAgd2FybmluZ3M6IFsnSW52YWxpZCBiYXNlbGluZSBmb3JtYXQ6IG1pc3NpbmcgYmFzZWxpbmUgcHJvcGVydHknXVxuICAgIH07XG4gIH1cblxuICBjb25zdCB0b2tlbnMgPSBiYXNlbGluZS5iYXNlbGluZTtcblxuICAvLyBWYWxpZGF0ZSBiYXNlbGluZSBpcyBhbiBvYmplY3RcbiAgaWYgKHR5cGVvZiB0b2tlbnMgIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkodG9rZW5zKSkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICBicm9rZW5BbGlhc2VzOiBbXSxcbiAgICAgIGNpcmN1bGFyUmVmZXJlbmNlczogW10sXG4gICAgICBlcnJvckNvdW50OiAxLFxuICAgICAgd2FybmluZ3M6IFsnSW52YWxpZCBiYXNlbGluZSBmb3JtYXQ6IGJhc2VsaW5lIG11c3QgYmUgYW4gb2JqZWN0J11cbiAgICB9O1xuICB9XG5cbiAgLy8gQnVpbGQgcGF0aCBpbmRleCBmb3IgcXVpY2sgbG9va3Vwc1xuICBjb25zdCBwYXRoVG9LZXkgPSBidWlsZFBhdGhJbmRleCh0b2tlbnMpO1xuXG4gIC8vIENoZWNrIGVhY2ggdG9rZW4gZm9yIGJyb2tlbiBhbGlhc2VzXG4gIGZvciAoY29uc3QgW2tleSwgdG9rZW5dIG9mIE9iamVjdC5lbnRyaWVzKHRva2VucykpIHtcbiAgICBpZiAoIXRva2VuIHx8IHR5cGVvZiB0b2tlbiAhPT0gJ29iamVjdCcpIHtcbiAgICAgIGNvbnRpbnVlOyAvLyBTa2lwIGludmFsaWQgZW50cmllc1xuICAgIH1cblxuICAgIGNvbnN0IHQgPSB0b2tlbiBhcyBhbnk7XG5cbiAgICBpZiAoaXNBbGlhcyh0LnZhbHVlKSkge1xuICAgICAgY29uc3QgcmVmZXJlbmNlUGF0aCA9IGV4dHJhY3RSZWZlcmVuY2VQYXRoKHQudmFsdWUpO1xuXG4gICAgICBpZiAoIXBhdGhUb0tleS5oYXMocmVmZXJlbmNlUGF0aCkpIHtcbiAgICAgICAgYnJva2VuQWxpYXNlcy5wdXNoKHtcbiAgICAgICAgICB0b2tlblBhdGg6IHQucGF0aCB8fCBrZXksXG4gICAgICAgICAgdG9rZW5LZXk6IGtleSxcbiAgICAgICAgICBhbGlhc1JlZmVyZW5jZTogdC52YWx1ZSxcbiAgICAgICAgICByZWZlcmVuY2VQYXRoLFxuICAgICAgICAgIGVycm9yOiBgUmVmZXJlbmNlZCB0b2tlbiBcIiR7cmVmZXJlbmNlUGF0aH1cIiBkb2VzIG5vdCBleGlzdGBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hlY2sgZm9yIGNpcmN1bGFyIHJlZmVyZW5jZXNcbiAgY29uc3QgY2lyY3VsYXIgPSBkZXRlY3RDaXJjdWxhclJlZmVyZW5jZXModG9rZW5zLCBwYXRoVG9LZXkpO1xuICBjaXJjdWxhclJlZmVyZW5jZXMucHVzaCguLi5jaXJjdWxhcik7XG5cbiAgY29uc3QgZXJyb3JDb3VudCA9IGJyb2tlbkFsaWFzZXMubGVuZ3RoICsgY2lyY3VsYXJSZWZlcmVuY2VzLmxlbmd0aDtcblxuICByZXR1cm4ge1xuICAgIHZhbGlkOiBlcnJvckNvdW50ID09PSAwLFxuICAgIGJyb2tlbkFsaWFzZXMsXG4gICAgY2lyY3VsYXJSZWZlcmVuY2VzLFxuICAgIGVycm9yQ291bnQsXG4gICAgd2FybmluZ3NcbiAgfTtcbn1cblxuLyoqXG4gKiBCdWlsZCBpbmRleDogcGF0aCBcdTIxOTIga2V5IGZvciBmYXN0IGxvb2t1cHNcbiAqXG4gKiBDcmVhdGVzIGEgTWFwIGZvciBPKDEpIGxvb2t1cCB3aGVuIHZhbGlkYXRpbmcgYWxpYXMgcmVmZXJlbmNlcy5cbiAqXG4gKiBAcGFyYW0gdG9rZW5zIC0gVG9rZW4gb2JqZWN0IGZyb20gYmFzZWxpbmVcbiAqIEByZXR1cm5zIE1hcCBvZiB0b2tlbiBwYXRoIHRvIHRva2VuIGtleVxuICovXG5mdW5jdGlvbiBidWlsZFBhdGhJbmRleCh0b2tlbnM6IGFueSk6IE1hcDxzdHJpbmcsIHN0cmluZz4ge1xuICBjb25zdCBpbmRleCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBba2V5LCB0b2tlbl0gb2YgT2JqZWN0LmVudHJpZXModG9rZW5zKSkge1xuICAgIGlmICghdG9rZW4gfHwgdHlwZW9mIHRva2VuICE9PSAnb2JqZWN0Jykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgdCA9IHRva2VuIGFzIGFueTtcbiAgICBpZiAodC5wYXRoKSB7XG4gICAgICBpbmRleC5zZXQodC5wYXRoLCBrZXkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBpbmRleDtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB2YWx1ZSBpcyBhbiBhbGlhcyByZWZlcmVuY2VcbiAqXG4gKiBBbGlhcyByZWZlcmVuY2VzIGFyZSBzdHJpbmdzIHdyYXBwZWQgaW4gY3VybHkgYnJhY2VzOiBcIntwYXRoLnRvLnRva2VufVwiXG4gKlxuICogQHBhcmFtIHZhbHVlIC0gVG9rZW4gdmFsdWUgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdmFsdWUgaXMgYW4gYWxpYXMgcmVmZXJlbmNlXG4gKi9cbmZ1bmN0aW9uIGlzQWxpYXModmFsdWU6IGFueSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJlxuICAgIHZhbHVlLnN0YXJ0c1dpdGgoJ3snKSAmJlxuICAgIHZhbHVlLmVuZHNXaXRoKCd9JykgJiZcbiAgICB2YWx1ZS5sZW5ndGggPiAyO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgcGF0aCBmcm9tIGFsaWFzIHJlZmVyZW5jZVxuICpcbiAqIFJlbW92ZXMgdGhlIGN1cmx5IGJyYWNlcyBmcm9tIHRoZSBhbGlhcyByZWZlcmVuY2UuXG4gKlxuICogQHBhcmFtIGFsaWFzVmFsdWUgLSBBbGlhcyByZWZlcmVuY2UgKGUuZy4sIFwie2NvbG9ycy5wcmltYXJ5fVwiKVxuICogQHJldHVybnMgRXh0cmFjdGVkIHBhdGggKGUuZy4sIFwiY29sb3JzLnByaW1hcnlcIilcbiAqL1xuZnVuY3Rpb24gZXh0cmFjdFJlZmVyZW5jZVBhdGgoYWxpYXNWYWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGFsaWFzVmFsdWUuc2xpY2UoMSwgLTEpO1xufVxuXG4vKipcbiAqIERldGVjdCBjaXJjdWxhciByZWZlcmVuY2UgY2hhaW5zXG4gKlxuICogVXNlcyBkZXB0aC1maXJzdCBzZWFyY2ggd2l0aCBjeWNsZSBkZXRlY3Rpb24gdG8gZmluZCBjaXJjdWxhciByZWZlcmVuY2VzLlxuICogVHJhY2tzIHZpc2l0ZWQgbm9kZXMgYW5kIGN1cnJlbnQgc3RhY2sgdG8gZGV0ZWN0IHdoZW4gd2UgcmV2aXNpdCBhIG5vZGVcbiAqIGluIHRoZSBjdXJyZW50IHBhdGguXG4gKlxuICogQHBhcmFtIHRva2VucyAtIFRva2VuIG9iamVjdCBmcm9tIGJhc2VsaW5lXG4gKiBAcGFyYW0gcGF0aFRvS2V5IC0gUGF0aCBpbmRleCBmb3IgbG9va3Vwc1xuICogQHJldHVybnMgQXJyYXkgb2YgY2lyY3VsYXIgcmVmZXJlbmNlcyBmb3VuZFxuICovXG5mdW5jdGlvbiBkZXRlY3RDaXJjdWxhclJlZmVyZW5jZXMoXG4gIHRva2VuczogYW55LFxuICBwYXRoVG9LZXk6IE1hcDxzdHJpbmcsIHN0cmluZz5cbik6IENpcmN1bGFyUmVmZXJlbmNlW10ge1xuICBjb25zdCBjaXJjdWxhcjogQ2lyY3VsYXJSZWZlcmVuY2VbXSA9IFtdO1xuICBjb25zdCB2aXNpdGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHJlY3Vyc2lvblN0YWNrID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZnVuY3Rpb24gdmlzaXQocGF0aDogc3RyaW5nLCBzdGFjazogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgICAvLyBGb3VuZCBhIGN5Y2xlIC0gdGhlIHBhdGggaXMgYWxyZWFkeSBpbiBvdXIgY3VycmVudCByZWN1cnNpb24gc3RhY2tcbiAgICBpZiAocmVjdXJzaW9uU3RhY2suaGFzKHBhdGgpKSB7XG4gICAgICBjb25zdCBjeWNsZVN0YXJ0ID0gc3RhY2suaW5kZXhPZihwYXRoKTtcbiAgICAgIGNvbnN0IGN5Y2xlID0gWy4uLnN0YWNrLnNsaWNlKGN5Y2xlU3RhcnQpLCBwYXRoXTtcbiAgICAgIGNpcmN1bGFyLnB1c2goe1xuICAgICAgICBwYXRoOiBjeWNsZSxcbiAgICAgICAgZXJyb3I6IGBDaXJjdWxhciByZWZlcmVuY2UgZGV0ZWN0ZWQ6ICR7Y3ljbGUuam9pbignIFx1MjE5MiAnKX1gXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIEFscmVhZHkgcHJvY2Vzc2VkIHRoaXMgcGF0aCBjb21wbGV0ZWx5XG4gICAgaWYgKHZpc2l0ZWQuaGFzKHBhdGgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gTWFyayBhcyBiZWluZyBwcm9jZXNzZWRcbiAgICB2aXNpdGVkLmFkZChwYXRoKTtcbiAgICByZWN1cnNpb25TdGFjay5hZGQocGF0aCk7XG4gICAgc3RhY2sucHVzaChwYXRoKTtcblxuICAgIC8vIENoZWNrIGlmIHRoaXMgdG9rZW4gaGFzIGFuIGFsaWFzXG4gICAgY29uc3Qga2V5ID0gcGF0aFRvS2V5LmdldChwYXRoKTtcbiAgICBpZiAoa2V5KSB7XG4gICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1trZXldO1xuICAgICAgaWYgKHRva2VuICYmIGlzQWxpYXModG9rZW4udmFsdWUpKSB7XG4gICAgICAgIGNvbnN0IHJlZlBhdGggPSBleHRyYWN0UmVmZXJlbmNlUGF0aCh0b2tlbi52YWx1ZSk7XG4gICAgICAgIHZpc2l0KHJlZlBhdGgsIFsuLi5zdGFja10pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERvbmUgcHJvY2Vzc2luZyB0aGlzIHBhdGhcbiAgICByZWN1cnNpb25TdGFjay5kZWxldGUocGF0aCk7XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBDaGVjayBhbGwgdG9rZW5zIGFzIHBvdGVudGlhbCBjeWNsZSBzdGFydGluZyBwb2ludHNcbiAgZm9yIChjb25zdCBba2V5LCB0b2tlbl0gb2YgT2JqZWN0LmVudHJpZXModG9rZW5zKSkge1xuICAgIGlmICghdG9rZW4gfHwgdHlwZW9mIHRva2VuICE9PSAnb2JqZWN0Jykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgdCA9IHRva2VuIGFzIGFueTtcbiAgICBpZiAodC5wYXRoKSB7XG4gICAgICB2aXNpdCh0LnBhdGgsIFtdKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY2lyY3VsYXI7XG59XG5cbi8qKlxuICogUXVpY2sgdmFsaWRhdGlvbiAtIGp1c3QgY2hlY2sgaWYgYW55IGVycm9ycyBleGlzdFxuICpcbiAqIExpZ2h0d2VpZ2h0IGNoZWNrIGZvciB1c2UgY2FzZXMgd2hlcmUgZGV0YWlsZWQgZXJyb3IgaW5mbyBpcyBub3QgbmVlZGVkLlxuICpcbiAqIEBwYXJhbSBiYXNlbGluZSAtIEJhc2VsaW5lIG9iamVjdCB0byB2YWxpZGF0ZVxuICogQHJldHVybnMgVHJ1ZSBpZiB2YWxpZGF0aW9uIGVycm9ycyBleGlzdFxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzVmFsaWRhdGlvbkVycm9ycyhiYXNlbGluZTogYW55KTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlQmFzZWxpbmUoYmFzZWxpbmUpO1xuICByZXR1cm4gIXJlc3VsdC52YWxpZDtcbn1cblxuLyoqXG4gKiBHZXQgYnJva2VuIGFsaWFzZXMgb25seSAoZm9yIHF1aWNrIGNoZWNrKVxuICpcbiAqIFJldHVybnMgb25seSBicm9rZW4gYWxpYXMgaW5mb3JtYXRpb24sIHNraXBwaW5nIGNpcmN1bGFyIHJlZmVyZW5jZSBkZXRlY3Rpb24uXG4gKiBVc2VmdWwgZm9yIHNjZW5hcmlvcyB3aGVyZSB5b3Ugb25seSBjYXJlIGFib3V0IG1pc3NpbmcgdG9rZW4gcmVmZXJlbmNlcy5cbiAqXG4gKiBAcGFyYW0gYmFzZWxpbmUgLSBCYXNlbGluZSBvYmplY3QgdG8gdmFsaWRhdGVcbiAqIEByZXR1cm5zIEFycmF5IG9mIGJyb2tlbiBhbGlhcyBlcnJvcnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEJyb2tlbkFsaWFzZXMoYmFzZWxpbmU6IGFueSk6IEJyb2tlbkFsaWFzW10ge1xuICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZUJhc2VsaW5lKGJhc2VsaW5lKTtcbiAgcmV0dXJuIHJlc3VsdC5icm9rZW5BbGlhc2VzO1xufVxuIiwgIi8qKlxuICogQmFzZWxpbmUgaW1wb3J0ZXIgbW9kdWxlXG4gKlxuICogSW1wb3J0cyB2YWxpZGF0ZWQgYmFzZWxpbmUgZmlsZXMgYmFjayBpbnRvIEZpZ21hLiBUaGUgYmFzZWxpbmUgZm9ybWF0IGNvbnRhaW5zXG4gKiBhbGwgY29sbGVjdGlvbi9tb2RlL3Rva2VuIGRhdGEgYW5kIG11c3QgYmUgcmVjcmVhdGVkIGV4YWN0bHkgaW4gRmlnbWEuXG4gKiBcbiAqIFN1cHBvcnRzIFwiaGFuZHNoYWtlXCIgbW9kZSB3aGVyZSBleGlzdGluZyB2YXJpYWJsZXMgYXJlIG1hdGNoZWQgYnkgdGhlaXJcbiAqIG9yaWdpbmFsIElEcyBhbmQgdXBkYXRlZCByYXRoZXIgdGhhbiByZWNyZWF0ZWQuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBCYXNlbGluZURldGVjdGlvblJlc3VsdCB9IGZyb20gJy4uL3V0aWxzL2Jhc2VsaW5lLWRldGVjdG9yLmpzJztcblxuZXhwb3J0IGludGVyZmFjZSBJbXBvcnRSZXN1bHQge1xuICBzdWNjZXNzOiBib29sZWFuO1xuICBjb2xsZWN0aW9uc0NyZWF0ZWQ6IG51bWJlcjtcbiAgY29sbGVjdGlvbnNVcGRhdGVkOiBudW1iZXI7XG4gIG1vZGVzQ3JlYXRlZDogbnVtYmVyO1xuICB2YXJpYWJsZXNDcmVhdGVkOiBudW1iZXI7XG4gIHZhcmlhYmxlc1VwZGF0ZWQ6IG51bWJlcjtcbiAgZXJyb3JzOiBzdHJpbmdbXTtcbiAgd2FybmluZ3M6IHN0cmluZ1tdO1xuICAvKiogVmVyc2lvbiBmcm9tIHRoZSBpbXBvcnRlZCBiYXNlbGluZSAqL1xuICBpbXBvcnRlZFZlcnNpb24/OiBzdHJpbmc7XG4gIC8qKiBDdXJyZW50IHZlcnNpb24gYmVmb3JlIGltcG9ydCAoZnJvbSBzdG9yZWQgYmFzZWxpbmUpICovXG4gIHByZXZpb3VzVmVyc2lvbj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2xsZWN0aW9uRGF0YSB7XG4gIG5hbWU6IHN0cmluZztcbiAgb3JpZ2luYWxJZD86IHN0cmluZzsgLy8gT3JpZ2luYWwgRmlnbWEgY29sbGVjdGlvbiBJRCBmb3IgbWF0Y2hpbmdcbiAgbW9kZXM6IE1hcDxzdHJpbmcsIE1vZGVEYXRhPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNb2RlRGF0YSB7XG4gIG5hbWU6IHN0cmluZztcbiAgb3JpZ2luYWxJZD86IHN0cmluZzsgLy8gT3JpZ2luYWwgRmlnbWEgbW9kZSBJRCBmb3IgbWF0Y2hpbmdcbiAgdmFyaWFibGVzOiBNYXA8c3RyaW5nLCBWYXJpYWJsZT47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmFyaWFibGUge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZhbHVlOiBhbnk7XG4gIHR5cGU6IHN0cmluZztcbiAgcmVzb2x2ZWRUeXBlOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuICBvcmlnaW5hbFZhcmlhYmxlSWQ/OiBzdHJpbmc7IC8vIE9yaWdpbmFsIEZpZ21hIHZhcmlhYmxlIElEIGZvciBtYXRjaGluZ1xuICBvcmlnaW5hbENvbGxlY3Rpb25JZD86IHN0cmluZztcbiAgb3JpZ2luYWxNb2RlSWQ/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogSW1wb3J0IG9wdGlvbnMgZm9yIGJhc2VsaW5lIGltcG9ydFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEltcG9ydE9wdGlvbnMge1xuICAvKiogXG4gICAqIElmIHRydWUsIGF0dGVtcHQgdG8gbWF0Y2ggZXhpc3RpbmcgdmFyaWFibGVzIGJ5IElEIGFuZCB1cGRhdGUgdGhlbS5cbiAgICogSWYgZmFsc2UsIGFsd2F5cyBjcmVhdGUgbmV3IGNvbGxlY3Rpb25zL3ZhcmlhYmxlcy5cbiAgICovXG4gIHVwZGF0ZUV4aXN0aW5nPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIElmIHRydWUsIGNoZWNrIGlmIHRoZSBmaWxlIGtleSBtYXRjaGVzIHRoZSBjdXJyZW50IGZpbGUuXG4gICAqIFByZXZlbnRzIGFjY2lkZW50YWxseSBpbXBvcnRpbmcgYmFzZWxpbmUgZnJvbSBhIGRpZmZlcmVudCBmaWxlLlxuICAgKi9cbiAgdmFsaWRhdGVGaWxlS2V5PzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBJbXBvcnQgYmFzZWxpbmUgaW50byBGaWdtYVxuICpcbiAqIFBhcnNlcyB0aGUgYmFzZWxpbmUgc3RydWN0dXJlIGFuZCByZWNyZWF0ZXMgYWxsIGNvbGxlY3Rpb25zLCBtb2RlcywgYW5kIHZhcmlhYmxlc1xuICogaW4gRmlnbWEuIFN1cHBvcnRzIFwiaGFuZHNoYWtlXCIgbW9kZSB3aGVyZSBleGlzdGluZyB2YXJpYWJsZXMgYXJlIG1hdGNoZWQgYnkgdGhlaXJcbiAqIG9yaWdpbmFsIElEcyBhbmQgdXBkYXRlZCByYXRoZXIgdGhhbiByZWNyZWF0ZWQuXG4gKlxuICogQHBhcmFtIGJhc2VsaW5lIC0gVmFsaWRhdGVkIGJhc2VsaW5lIG9iamVjdCB3aXRoICRtZXRhZGF0YSBhbmQgYmFzZWxpbmUgcHJvcGVydGllc1xuICogQHBhcmFtIG9wdGlvbnMgLSBJbXBvcnQgb3B0aW9ucyAodXBkYXRlRXhpc3RpbmcsIHZhbGlkYXRlRmlsZUtleSlcbiAqIEByZXR1cm5zIEltcG9ydCByZXN1bHQgd2l0aCBjb3VudHMgYW5kIGFueSBlcnJvcnMvd2FybmluZ3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGltcG9ydEJhc2VsaW5lKFxuICBiYXNlbGluZTogYW55LFxuICBvcHRpb25zOiBJbXBvcnRPcHRpb25zID0geyB1cGRhdGVFeGlzdGluZzogdHJ1ZSB9XG4pOiBQcm9taXNlPEltcG9ydFJlc3VsdD4ge1xuICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHdhcm5pbmdzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIHRyeSB7XG4gICAgLy8gVmFsaWRhdGUgYmFzZWxpbmUgZm9ybWF0XG4gICAgaWYgKCFiYXNlbGluZSB8fCAhYmFzZWxpbmUuYmFzZWxpbmUgfHwgdHlwZW9mIGJhc2VsaW5lLmJhc2VsaW5lICE9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGNvbGxlY3Rpb25zQ3JlYXRlZDogMCxcbiAgICAgICAgY29sbGVjdGlvbnNVcGRhdGVkOiAwLFxuICAgICAgICBtb2Rlc0NyZWF0ZWQ6IDAsXG4gICAgICAgIHZhcmlhYmxlc0NyZWF0ZWQ6IDAsXG4gICAgICAgIHZhcmlhYmxlc1VwZGF0ZWQ6IDAsXG4gICAgICAgIGVycm9yczogWydJbnZhbGlkIGJhc2VsaW5lIGZvcm1hdDogbWlzc2luZyBiYXNlbGluZSBwcm9wZXJ0eSddLFxuICAgICAgICB3YXJuaW5nc1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IHZlcnNpb24gaW5mb3JtYXRpb24gZnJvbSB0aGUgaW1wb3J0ZWQgYmFzZWxpbmVcbiAgICBjb25zdCBtZXRhZGF0YSA9IGJhc2VsaW5lLiRtZXRhZGF0YSB8fCB7fTtcbiAgICBjb25zdCBpbXBvcnRlZFZlcnNpb24gPSBtZXRhZGF0YS52ZXJzaW9uIHx8ICcxLjAuMCc7XG4gICAgXG4gICAgLy8gVHJ5IHRvIGdldCB0aGUgY3VycmVudCBzdG9yZWQgdmVyc2lvbiBmb3IgY29tcGFyaXNvblxuICAgIGxldCBwcmV2aW91c1ZlcnNpb246IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBmaW5kUmVnaXN0cnlOb2RlLCBsb2FkQ2h1bmtzRnJvbU5vZGUsIHVuY2h1bmtEYXRhIH0gPSBhd2FpdCBpbXBvcnQoJy4uL3N5bmMvaW5kZXguanMnKTtcbiAgICAgIGNvbnN0IHsgUExVR0lOX05BTUVTUEFDRSB9ID0gYXdhaXQgaW1wb3J0KCcuLi91dGlscy9jb25zdGFudHMuanMnKTtcbiAgICAgIFxuICAgICAgY29uc3Qgbm9kZSA9IGF3YWl0IGZpbmRSZWdpc3RyeU5vZGUoKTtcbiAgICAgIGlmIChub2RlKSB7XG4gICAgICAgIGNvbnN0IGNodW5rQ291bnRTdHIgPSBub2RlLmdldFNoYXJlZFBsdWdpbkRhdGEoUExVR0lOX05BTUVTUEFDRSwgJ2NodW5rQ291bnQnKTtcbiAgICAgICAgaWYgKGNodW5rQ291bnRTdHIpIHtcbiAgICAgICAgICBjb25zdCBjaHVua0NvdW50ID0gcGFyc2VJbnQoY2h1bmtDb3VudFN0ciwgMTApO1xuICAgICAgICAgIGNvbnN0IGNodW5rcyA9IGxvYWRDaHVua3NGcm9tTm9kZShub2RlLCBQTFVHSU5fTkFNRVNQQUNFLCBjaHVua0NvdW50KTtcbiAgICAgICAgICBjb25zdCBzdG9yZWRCYXNlbGluZSA9IHVuY2h1bmtEYXRhKGNodW5rcykgYXMgYW55O1xuICAgICAgICAgIHByZXZpb3VzVmVyc2lvbiA9IHN0b3JlZEJhc2VsaW5lPy4kbWV0YWRhdGE/LnZlcnNpb247XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgLSB2ZXJzaW9uIGNvbXBhcmlzb24gaXMgb3B0aW9uYWxcbiAgICB9XG5cbiAgICAvLyBBZGQgdmVyc2lvbiBpbmZvIHRvIHdhcm5pbmdzIGlmIHZlcnNpb25zIGRpZmZlclxuICAgIGlmIChwcmV2aW91c1ZlcnNpb24gJiYgaW1wb3J0ZWRWZXJzaW9uICE9PSBwcmV2aW91c1ZlcnNpb24pIHtcbiAgICAgIGNvbnN0IGltcG9ydGVkUGFydHMgPSBpbXBvcnRlZFZlcnNpb24uc3BsaXQoJy4nKS5tYXAoTnVtYmVyKTtcbiAgICAgIGNvbnN0IHByZXZpb3VzUGFydHMgPSBwcmV2aW91c1ZlcnNpb24uc3BsaXQoJy4nKS5tYXAoTnVtYmVyKTtcbiAgICAgIFxuICAgICAgLy8gQ29tcGFyZSB2ZXJzaW9uc1xuICAgICAgY29uc3QgaXNPbGRlciA9IGltcG9ydGVkUGFydHNbMF0gPCBwcmV2aW91c1BhcnRzWzBdIHx8XG4gICAgICAgIChpbXBvcnRlZFBhcnRzWzBdID09PSBwcmV2aW91c1BhcnRzWzBdICYmIGltcG9ydGVkUGFydHNbMV0gPCBwcmV2aW91c1BhcnRzWzFdKSB8fFxuICAgICAgICAoaW1wb3J0ZWRQYXJ0c1swXSA9PT0gcHJldmlvdXNQYXJ0c1swXSAmJiBpbXBvcnRlZFBhcnRzWzFdID09PSBwcmV2aW91c1BhcnRzWzFdICYmIGltcG9ydGVkUGFydHNbMl0gPCBwcmV2aW91c1BhcnRzWzJdKTtcbiAgICAgIFxuICAgICAgaWYgKGlzT2xkZXIpIHtcbiAgICAgICAgd2FybmluZ3MucHVzaChgSW1wb3J0aW5nIG9sZGVyIHZlcnNpb24gKCR7aW1wb3J0ZWRWZXJzaW9ufSkgb3ZlciBuZXdlciB2ZXJzaW9uICgke3ByZXZpb3VzVmVyc2lvbn0pLiBUaGlzIG1heSBvdmVyd3JpdGUgcmVjZW50IGNoYW5nZXMuYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3YXJuaW5ncy5wdXNoKGBJbXBvcnRpbmcgdmVyc2lvbiAke2ltcG9ydGVkVmVyc2lvbn0gKGN1cnJlbnQ6ICR7cHJldmlvdXNWZXJzaW9ufSlgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmaWxlIGtleSBpZiB2YWxpZGF0aW9uIGlzIGVuYWJsZWRcbiAgICBpZiAob3B0aW9ucy52YWxpZGF0ZUZpbGVLZXkgJiYgbWV0YWRhdGEuZmlsZUtleSAmJiBmaWdtYS5maWxlS2V5KSB7XG4gICAgICBpZiAobWV0YWRhdGEuZmlsZUtleSAhPT0gZmlnbWEuZmlsZUtleSkge1xuICAgICAgICB3YXJuaW5ncy5wdXNoKFxuICAgICAgICAgIGBCYXNlbGluZSB3YXMgZXhwb3J0ZWQgZnJvbSBhIGRpZmZlcmVudCBmaWxlICgke21ldGFkYXRhLmZpbGVOYW1lIHx8ICd1bmtub3duJ30pLiBgICtcbiAgICAgICAgICBgVmFyaWFibGVzIHdpbGwgYmUgY3JlYXRlZCBhcyBuZXcgaW5zdGVhZCBvZiB1cGRhdGluZyBleGlzdGluZyBvbmVzLmBcbiAgICAgICAgKTtcbiAgICAgICAgLy8gRGlzYWJsZSB1cGRhdGUgbW9kZSBpZiBmaWxlIGRvZXNuJ3QgbWF0Y2hcbiAgICAgICAgb3B0aW9ucyA9IHsgLi4ub3B0aW9ucywgdXBkYXRlRXhpc3Rpbmc6IGZhbHNlIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gR2V0IGV4aXN0aW5nIGNvbGxlY3Rpb25zIGFuZCB2YXJpYWJsZXMgZm9yIG1hdGNoaW5nXG4gICAgY29uc3QgZXhpc3RpbmdDb2xsZWN0aW9ucyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICAgIGNvbnN0IGV4aXN0aW5nVmFyaWFibGVzID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldExvY2FsVmFyaWFibGVzQXN5bmMoKTtcbiAgICBcbiAgICAvLyBCdWlsZCBsb29rdXAgbWFwcyBmb3IgZXhpc3RpbmcgaXRlbXNcbiAgICBjb25zdCBjb2xsZWN0aW9uQnlJZCA9IG5ldyBNYXAoZXhpc3RpbmdDb2xsZWN0aW9ucy5tYXAoYyA9PiBbYy5pZCwgY10pKTtcbiAgICBjb25zdCBjb2xsZWN0aW9uQnlOYW1lID0gbmV3IE1hcChleGlzdGluZ0NvbGxlY3Rpb25zLm1hcChjID0+IFtjLm5hbWUsIGNdKSk7XG4gICAgY29uc3QgdmFyaWFibGVCeUlkID0gbmV3IE1hcChleGlzdGluZ1ZhcmlhYmxlcy5tYXAodiA9PiBbdi5pZCwgdl0pKTtcbiAgICBjb25zdCB2YXJpYWJsZUJ5S2V5ID0gbmV3IE1hcDxzdHJpbmcsIHR5cGVvZiBleGlzdGluZ1ZhcmlhYmxlc1swXT4oKTtcbiAgICBcbiAgICAvLyBCdWlsZCB2YXJpYWJsZSBsb29rdXAgYnkgY29sbGVjdGlvbituYW1lIGtleVxuICAgIGZvciAoY29uc3QgdiBvZiBleGlzdGluZ1ZhcmlhYmxlcykge1xuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IGNvbGxlY3Rpb25CeUlkLmdldCh2LnZhcmlhYmxlQ29sbGVjdGlvbklkKTtcbiAgICAgIGlmIChjb2xsZWN0aW9uKSB7XG4gICAgICAgIGNvbnN0IGtleSA9IGAke2NvbGxlY3Rpb24ubmFtZX06JHt2Lm5hbWV9YDtcbiAgICAgICAgdmFyaWFibGVCeUtleS5zZXQoa2V5LCB2KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAxLiBQYXJzZSBiYXNlbGluZSBpbnRvIGNvbGxlY3Rpb25zICh3aXRoIG9yaWdpbmFsIElEcylcbiAgICBjb25zdCBjb2xsZWN0aW9ucyA9IHBhcnNlQmFzZWxpbmVUb0NvbGxlY3Rpb25zKGJhc2VsaW5lKTtcblxuICAgIC8vIDIuIENyZWF0ZS91cGRhdGUgY29sbGVjdGlvbnMgaW4gRmlnbWFcbiAgICBsZXQgY29sbGVjdGlvbnNDcmVhdGVkID0gMDtcbiAgICBsZXQgY29sbGVjdGlvbnNVcGRhdGVkID0gMDtcbiAgICBsZXQgbW9kZXNDcmVhdGVkID0gMDtcbiAgICBsZXQgdmFyaWFibGVzQ3JlYXRlZCA9IDA7XG4gICAgbGV0IHZhcmlhYmxlc1VwZGF0ZWQgPSAwO1xuXG4gICAgZm9yIChjb25zdCBbY29sbGVjdGlvbk5hbWUsIGNvbGxlY3Rpb25EYXRhXSBvZiBjb2xsZWN0aW9ucykge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlT3JVcGRhdGVDb2xsZWN0aW9uSW5GaWdtYShcbiAgICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIGNvbGxlY3Rpb25EYXRhLFxuICAgICAgICB7XG4gICAgICAgICAgdXBkYXRlRXhpc3Rpbmc6IG9wdGlvbnMudXBkYXRlRXhpc3RpbmcgPz8gdHJ1ZSxcbiAgICAgICAgICBjb2xsZWN0aW9uQnlJZCxcbiAgICAgICAgICBjb2xsZWN0aW9uQnlOYW1lLFxuICAgICAgICAgIHZhcmlhYmxlQnlJZCxcbiAgICAgICAgICB2YXJpYWJsZUJ5S2V5XG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICAgIGNvbGxlY3Rpb25zQ3JlYXRlZCArPSByZXN1bHQuY29sbGVjdGlvbnNDcmVhdGVkO1xuICAgICAgY29sbGVjdGlvbnNVcGRhdGVkICs9IHJlc3VsdC5jb2xsZWN0aW9uc1VwZGF0ZWQ7XG4gICAgICBtb2Rlc0NyZWF0ZWQgKz0gcmVzdWx0Lm1vZGVzQ3JlYXRlZDtcbiAgICAgIHZhcmlhYmxlc0NyZWF0ZWQgKz0gcmVzdWx0LnZhcmlhYmxlc0NyZWF0ZWQ7XG4gICAgICB2YXJpYWJsZXNVcGRhdGVkICs9IHJlc3VsdC52YXJpYWJsZXNVcGRhdGVkO1xuICAgICAgZXJyb3JzLnB1c2goLi4ucmVzdWx0LmVycm9ycyk7XG4gICAgICB3YXJuaW5ncy5wdXNoKC4uLnJlc3VsdC53YXJuaW5ncyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgICBjb2xsZWN0aW9uc0NyZWF0ZWQsXG4gICAgICBjb2xsZWN0aW9uc1VwZGF0ZWQsXG4gICAgICBtb2Rlc0NyZWF0ZWQsXG4gICAgICB2YXJpYWJsZXNDcmVhdGVkLFxuICAgICAgdmFyaWFibGVzVXBkYXRlZCxcbiAgICAgIGVycm9ycyxcbiAgICAgIHdhcm5pbmdzLFxuICAgICAgaW1wb3J0ZWRWZXJzaW9uLFxuICAgICAgcHJldmlvdXNWZXJzaW9uXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBjb2xsZWN0aW9uc0NyZWF0ZWQ6IDAsXG4gICAgICBjb2xsZWN0aW9uc1VwZGF0ZWQ6IDAsXG4gICAgICBtb2Rlc0NyZWF0ZWQ6IDAsXG4gICAgICB2YXJpYWJsZXNDcmVhdGVkOiAwLFxuICAgICAgdmFyaWFibGVzVXBkYXRlZDogMCxcbiAgICAgIGVycm9yczogW2BJbXBvcnQgZmFpbGVkOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gXSxcbiAgICAgIHdhcm5pbmdzXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlIGJhc2VsaW5lIEpTT04gaW50byBjb2xsZWN0aW9uIHN0cnVjdHVyZVxuICpcbiAqIEdyb3VwcyB0b2tlbnMgYnkgY29sbGVjdGlvbiBhbmQgbW9kZSwgZXh0cmFjdGluZyB2YXJpYWJsZSBuYW1lcyBhbmQgdmFsdWVzXG4gKiBmcm9tIHRoZSBiYXNlbGluZSBmbGF0IHN0cnVjdHVyZS4gSW5jbHVkZXMgb3JpZ2luYWwgSURzIGZvciBoYW5kc2hha2UgbWF0Y2hpbmcuXG4gKlxuICogQHBhcmFtIGJhc2VsaW5lIC0gQmFzZWxpbmUgb2JqZWN0IHdpdGggdG9rZW5zIGtleWVkIGJ5IHByZWZpeGVkIElEc1xuICogQHJldHVybnMgTWFwIG9mIGNvbGxlY3Rpb24gbmFtZXMgdG8gdGhlaXIgZGF0YSBzdHJ1Y3R1cmVzXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQmFzZWxpbmVUb0NvbGxlY3Rpb25zKGJhc2VsaW5lOiBhbnkpOiBNYXA8c3RyaW5nLCBDb2xsZWN0aW9uRGF0YT4ge1xuICBjb25zdCBjb2xsZWN0aW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBDb2xsZWN0aW9uRGF0YT4oKTtcbiAgY29uc3QgdG9rZW5zID0gYmFzZWxpbmUuYmFzZWxpbmUgfHwge307XG4gIGNvbnN0IG1ldGFkYXRhID0gYmFzZWxpbmUuJG1ldGFkYXRhIHx8IHt9O1xuICBcbiAgLy8gQnVpbGQgY29sbGVjdGlvbiBtZXRhZGF0YSBsb29rdXBcbiAgY29uc3QgY29sbGVjdGlvbk1ldGFCeUlkID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKTtcbiAgaWYgKG1ldGFkYXRhLmNvbGxlY3Rpb25zKSB7XG4gICAgZm9yIChjb25zdCBjb2wgb2YgbWV0YWRhdGEuY29sbGVjdGlvbnMpIHtcbiAgICAgIGNvbGxlY3Rpb25NZXRhQnlJZC5zZXQoY29sLmlkLCBjb2wpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgW2tleSwgdG9rZW5dIG9mIE9iamVjdC5lbnRyaWVzKHRva2VucykpIHtcbiAgICBjb25zdCB0ID0gdG9rZW4gYXMgYW55O1xuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gdC5jb2xsZWN0aW9uO1xuICAgIGNvbnN0IG1vZGVOYW1lID0gdC5tb2RlO1xuXG4gICAgLy8gU2tpcCB0b2tlbnMgd2l0aG91dCByZXF1aXJlZCBmaWVsZHNcbiAgICBpZiAoIWNvbGxlY3Rpb25OYW1lIHx8ICFtb2RlTmFtZSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gR2V0IG9yIGNyZWF0ZSBjb2xsZWN0aW9uIHdpdGggb3JpZ2luYWwgSURcbiAgICBpZiAoIWNvbGxlY3Rpb25zLmhhcyhjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgIC8vIEZpbmQgb3JpZ2luYWwgY29sbGVjdGlvbiBJRCBmcm9tIG1ldGFkYXRhXG4gICAgICBjb25zdCBjb2xNZXRhID0gQXJyYXkuZnJvbShjb2xsZWN0aW9uTWV0YUJ5SWQudmFsdWVzKCkpLmZpbmQoYyA9PiBjLm5hbWUgPT09IGNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIFxuICAgICAgY29sbGVjdGlvbnMuc2V0KGNvbGxlY3Rpb25OYW1lLCB7XG4gICAgICAgIG5hbWU6IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICBvcmlnaW5hbElkOiBjb2xNZXRhPy5pZCB8fCB0LmNvbGxlY3Rpb25JZCxcbiAgICAgICAgbW9kZXM6IG5ldyBNYXAoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgY29sbGVjdGlvbiA9IGNvbGxlY3Rpb25zLmdldChjb2xsZWN0aW9uTmFtZSkhO1xuXG4gICAgLy8gR2V0IG9yIGNyZWF0ZSBtb2RlIHdpdGggb3JpZ2luYWwgSURcbiAgICBpZiAoIWNvbGxlY3Rpb24ubW9kZXMuaGFzKG1vZGVOYW1lKSkge1xuICAgICAgLy8gRmluZCBvcmlnaW5hbCBtb2RlIElEIGZyb20gbWV0YWRhdGFcbiAgICAgIGNvbnN0IGNvbE1ldGEgPSBBcnJheS5mcm9tKGNvbGxlY3Rpb25NZXRhQnlJZC52YWx1ZXMoKSkuZmluZChjID0+IGMubmFtZSA9PT0gY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3QgbW9kZU1ldGEgPSBjb2xNZXRhPy5tb2Rlcz8uZmluZCgobTogYW55KSA9PiBtLm5hbWUgPT09IG1vZGVOYW1lKTtcbiAgICAgIFxuICAgICAgY29sbGVjdGlvbi5tb2Rlcy5zZXQobW9kZU5hbWUsIHtcbiAgICAgICAgbmFtZTogbW9kZU5hbWUsXG4gICAgICAgIG9yaWdpbmFsSWQ6IG1vZGVNZXRhPy5pZCB8fCB0Lm1vZGVJZCxcbiAgICAgICAgdmFyaWFibGVzOiBuZXcgTWFwKClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZGUgPSBjb2xsZWN0aW9uLm1vZGVzLmdldChtb2RlTmFtZSkhO1xuXG4gICAgLy8gRXh0cmFjdCB2YXJpYWJsZSBuYW1lIGZyb20gcGF0aFxuICAgIC8vIFwicHJpbWl0aXZlcy5Nb2RlIDEuY29sb3IuZ3JheS41MFwiIFx1MjE5MiBcImNvbG9yL2dyYXkvNTBcIlxuICAgIGNvbnN0IHZhcmlhYmxlTmFtZSA9IGV4dHJhY3RWYXJpYWJsZU5hbWUodC5wYXRoLCBjb2xsZWN0aW9uTmFtZSwgbW9kZU5hbWUpO1xuXG4gICAgLy8gR3JvdXAgdmFyaWFibGVzIGFjcm9zcyBtb2RlcyAoc2FtZSB2YXJpYWJsZSBuYW1lIGluIGRpZmZlcmVudCBtb2RlcylcbiAgICAvLyBJbmNsdWRlIG9yaWdpbmFsIElEcyBmb3IgaGFuZHNoYWtlIG1hdGNoaW5nXG4gICAgbW9kZS52YXJpYWJsZXMuc2V0KHZhcmlhYmxlTmFtZSwge1xuICAgICAgbmFtZTogdmFyaWFibGVOYW1lLFxuICAgICAgdmFsdWU6IHQudmFsdWUsXG4gICAgICB0eXBlOiB0LnR5cGUsXG4gICAgICByZXNvbHZlZFR5cGU6IG1hcFRvRmlnbWFUeXBlKHQudHlwZSksXG4gICAgICBkZXNjcmlwdGlvbjogdC5kZXNjcmlwdGlvbixcbiAgICAgIG9yaWdpbmFsVmFyaWFibGVJZDogdC52YXJpYWJsZUlkLFxuICAgICAgb3JpZ2luYWxDb2xsZWN0aW9uSWQ6IHQuY29sbGVjdGlvbklkLFxuICAgICAgb3JpZ2luYWxNb2RlSWQ6IHQubW9kZUlkXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gY29sbGVjdGlvbnM7XG59XG5cbi8qKlxuICogRXh0cmFjdCB2YXJpYWJsZSBuYW1lIGZyb20gcGF0aFxuICpcbiAqIFJlbW92ZXMgY29sbGVjdGlvbiBhbmQgbW9kZSBwcmVmaXhlcyBmcm9tIHRoZSBmdWxsIHBhdGgsIHRoZW4gY29udmVydHNcbiAqIGRvdCBub3RhdGlvbiB0byBzbGFzaCBub3RhdGlvbiBmb3IgRmlnbWEgdmFyaWFibGUgbmFtaW5nLlxuICpcbiAqIEBwYXJhbSBwYXRoIC0gRnVsbCB0b2tlbiBwYXRoIChlLmcuLCBcInByaW1pdGl2ZXMuTW9kZSAxLmNvbG9yLmdyYXkuNTBcIilcbiAqIEBwYXJhbSBjb2xsZWN0aW9uIC0gQ29sbGVjdGlvbiBuYW1lIHRvIHJlbW92ZVxuICogQHBhcmFtIG1vZGUgLSBNb2RlIG5hbWUgdG8gcmVtb3ZlXG4gKiBAcmV0dXJucyBWYXJpYWJsZSBuYW1lIGluIHNsYXNoIG5vdGF0aW9uIChlLmcuLCBcImNvbG9yL2dyYXkvNTBcIilcbiAqL1xuZnVuY3Rpb24gZXh0cmFjdFZhcmlhYmxlTmFtZShwYXRoOiBzdHJpbmcsIGNvbGxlY3Rpb246IHN0cmluZywgbW9kZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy8gUmVtb3ZlIGNvbGxlY3Rpb24gYW5kIG1vZGUgZnJvbSBwYXRoXG4gIGxldCBuYW1lID0gcGF0aDtcblxuICAvLyBSZW1vdmUgY29sbGVjdGlvbiBwcmVmaXhcbiAgaWYgKG5hbWUuc3RhcnRzV2l0aChjb2xsZWN0aW9uICsgJy4nKSkge1xuICAgIG5hbWUgPSBuYW1lLnNsaWNlKGNvbGxlY3Rpb24ubGVuZ3RoICsgMSk7XG4gIH1cblxuICAvLyBSZW1vdmUgbW9kZSBwcmVmaXhcbiAgaWYgKG5hbWUuc3RhcnRzV2l0aChtb2RlICsgJy4nKSkge1xuICAgIG5hbWUgPSBuYW1lLnNsaWNlKG1vZGUubGVuZ3RoICsgMSk7XG4gIH1cblxuICAvLyBDb252ZXJ0IGRvdHMgdG8gc2xhc2hlcyBmb3IgRmlnbWEgdmFyaWFibGUgbmFtaW5nXG4gIHJldHVybiBuYW1lLnJlcGxhY2UoL1xcLi9nLCAnLycpO1xufVxuXG4vKipcbiAqIE1hcCB0b2tlbiB0eXBlIHRvIEZpZ21hIHZhcmlhYmxlIHR5cGVcbiAqXG4gKiBDb252ZXJ0cyBEVENHL2Jhc2VsaW5lIHRva2VuIHR5cGVzIHRvIEZpZ21hJ3MgVmFyaWFibGVSZXNvbHZlZERhdGFUeXBlLlxuICpcbiAqIEBwYXJhbSB0b2tlblR5cGUgLSBUb2tlbiB0eXBlIGZyb20gYmFzZWxpbmUgKGUuZy4sIFwiY29sb3JcIiwgXCJkaW1lbnNpb25cIilcbiAqIEByZXR1cm5zIEZpZ21hIHZhcmlhYmxlIHR5cGUgKGUuZy4sIFwiQ09MT1JcIiwgXCJGTE9BVFwiLCBcIlNUUklOR1wiKVxuICovXG5mdW5jdGlvbiBtYXBUb0ZpZ21hVHlwZSh0b2tlblR5cGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHR5cGVNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgJ2NvbG9yJzogJ0NPTE9SJyxcbiAgICAnbnVtYmVyJzogJ0ZMT0FUJyxcbiAgICAnZGltZW5zaW9uJzogJ0ZMT0FUJyxcbiAgICAnc3BhY2luZyc6ICdGTE9BVCcsXG4gICAgJ2ZvbnRTaXplJzogJ0ZMT0FUJyxcbiAgICAnZm9udEZhbWlseSc6ICdTVFJJTkcnLFxuICAgICdmb250V2VpZ2h0JzogJ1NUUklORycsXG4gICAgJ3N0cmluZyc6ICdTVFJJTkcnLFxuICAgICdib29sZWFuJzogJ0JPT0xFQU4nXG4gIH07XG5cbiAgcmV0dXJuIHR5cGVNYXBbdG9rZW5UeXBlXSB8fCAnU1RSSU5HJztcbn1cblxuLyoqXG4gKiBDb250ZXh0IGZvciBtYXRjaGluZyBleGlzdGluZyBGaWdtYSBpdGVtc1xuICovXG5pbnRlcmZhY2UgTWF0Y2hDb250ZXh0IHtcbiAgdXBkYXRlRXhpc3Rpbmc6IGJvb2xlYW47XG4gIGNvbGxlY3Rpb25CeUlkOiBNYXA8c3RyaW5nLCBWYXJpYWJsZUNvbGxlY3Rpb24+O1xuICBjb2xsZWN0aW9uQnlOYW1lOiBNYXA8c3RyaW5nLCBWYXJpYWJsZUNvbGxlY3Rpb24+O1xuICB2YXJpYWJsZUJ5SWQ6IE1hcDxzdHJpbmcsIFZhcmlhYmxlPjtcbiAgdmFyaWFibGVCeUtleTogTWFwPHN0cmluZywgVmFyaWFibGU+OyAvLyBcIkNvbGxlY3Rpb25OYW1lOnZhck5hbWVcIiBcdTIxOTIgVmFyaWFibGVcbn1cblxuLyoqXG4gKiBDcmVhdGUgb3IgdXBkYXRlIGNvbGxlY3Rpb24gaW4gRmlnbWEgd2l0aCBhbGwgbW9kZXMgYW5kIHZhcmlhYmxlc1xuICpcbiAqIElmIHVwZGF0ZUV4aXN0aW5nIGlzIHRydWUsIGF0dGVtcHRzIHRvIG1hdGNoIGV4aXN0aW5nIGNvbGxlY3Rpb25zIGFuZCB2YXJpYWJsZXNcbiAqIGJ5IHRoZWlyIG9yaWdpbmFsIElEcyBvciBuYW1lcyBhbmQgdXBkYXRlcyB0aGVtLiBPdGhlcndpc2UsIGNyZWF0ZXMgbmV3LlxuICpcbiAqIEBwYXJhbSBuYW1lIC0gQ29sbGVjdGlvbiBuYW1lXG4gKiBAcGFyYW0gZGF0YSAtIENvbGxlY3Rpb24gZGF0YSB3aXRoIG1vZGVzIGFuZCB2YXJpYWJsZXNcbiAqIEBwYXJhbSBjdHggLSBDb250ZXh0IHdpdGggZXhpc3RpbmcgaXRlbXMgZm9yIG1hdGNoaW5nXG4gKiBAcmV0dXJucyBJbXBvcnQgcmVzdWx0IGZvciB0aGlzIGNvbGxlY3Rpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY3JlYXRlT3JVcGRhdGVDb2xsZWN0aW9uSW5GaWdtYShcbiAgbmFtZTogc3RyaW5nLFxuICBkYXRhOiBDb2xsZWN0aW9uRGF0YSxcbiAgY3R4OiBNYXRjaENvbnRleHRcbik6IFByb21pc2U8SW1wb3J0UmVzdWx0PiB7XG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gIGxldCBjb2xsZWN0aW9uc0NyZWF0ZWQgPSAwO1xuICBsZXQgY29sbGVjdGlvbnNVcGRhdGVkID0gMDtcbiAgbGV0IG1vZGVzQ3JlYXRlZCA9IDA7XG4gIGxldCB2YXJpYWJsZXNDcmVhdGVkID0gMDtcbiAgbGV0IHZhcmlhYmxlc1VwZGF0ZWQgPSAwO1xuXG4gIHRyeSB7XG4gICAgbGV0IGNvbGxlY3Rpb246IFZhcmlhYmxlQ29sbGVjdGlvbjtcbiAgICBsZXQgaXNOZXdDb2xsZWN0aW9uID0gZmFsc2U7XG5cbiAgICAvLyBUcnkgdG8gZmluZCBleGlzdGluZyBjb2xsZWN0aW9uXG4gICAgaWYgKGN0eC51cGRhdGVFeGlzdGluZykge1xuICAgICAgLy8gRmlyc3QgdHJ5IGJ5IG9yaWdpbmFsIElEXG4gICAgICBpZiAoZGF0YS5vcmlnaW5hbElkICYmIGN0eC5jb2xsZWN0aW9uQnlJZC5oYXMoZGF0YS5vcmlnaW5hbElkKSkge1xuICAgICAgICBjb2xsZWN0aW9uID0gY3R4LmNvbGxlY3Rpb25CeUlkLmdldChkYXRhLm9yaWdpbmFsSWQpITtcbiAgICAgICAgY29sbGVjdGlvbnNVcGRhdGVkID0gMTtcbiAgICAgICAgY29uc29sZS5sb2coYFtCYXNlbGluZUltcG9ydGVyXSBNYXRjaGVkIGNvbGxlY3Rpb24gYnkgSUQ6ICR7bmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIC8vIFRoZW4gdHJ5IGJ5IG5hbWVcbiAgICAgIGVsc2UgaWYgKGN0eC5jb2xsZWN0aW9uQnlOYW1lLmhhcyhuYW1lKSkge1xuICAgICAgICBjb2xsZWN0aW9uID0gY3R4LmNvbGxlY3Rpb25CeU5hbWUuZ2V0KG5hbWUpITtcbiAgICAgICAgY29sbGVjdGlvbnNVcGRhdGVkID0gMTtcbiAgICAgICAgY29uc29sZS5sb2coYFtCYXNlbGluZUltcG9ydGVyXSBNYXRjaGVkIGNvbGxlY3Rpb24gYnkgbmFtZTogJHtuYW1lfWApO1xuICAgICAgfVxuICAgICAgLy8gQ3JlYXRlIG5ld1xuICAgICAgZWxzZSB7XG4gICAgICAgIGNvbGxlY3Rpb24gPSBmaWdtYS52YXJpYWJsZXMuY3JlYXRlVmFyaWFibGVDb2xsZWN0aW9uKG5hbWUpO1xuICAgICAgICBpc05ld0NvbGxlY3Rpb24gPSB0cnVlO1xuICAgICAgICBjb2xsZWN0aW9uc0NyZWF0ZWQgPSAxO1xuICAgICAgICBjb25zb2xlLmxvZyhgW0Jhc2VsaW5lSW1wb3J0ZXJdIENyZWF0ZWQgbmV3IGNvbGxlY3Rpb246ICR7bmFtZX1gKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQWx3YXlzIGNyZWF0ZSBuZXdcbiAgICAgIGNvbGxlY3Rpb24gPSBmaWdtYS52YXJpYWJsZXMuY3JlYXRlVmFyaWFibGVDb2xsZWN0aW9uKG5hbWUpO1xuICAgICAgaXNOZXdDb2xsZWN0aW9uID0gdHJ1ZTtcbiAgICAgIGNvbGxlY3Rpb25zQ3JlYXRlZCA9IDE7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIG1vZGVzXG4gICAgY29uc3QgbW9kZU5hbWVzID0gQXJyYXkuZnJvbShkYXRhLm1vZGVzLmtleXMoKSk7XG4gICAgY29uc3QgbW9kZUlkTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTsgLy8gbW9kZU5hbWUgXHUyMTkyIG1vZGVJZFxuXG4gICAgaWYgKGlzTmV3Q29sbGVjdGlvbikge1xuICAgICAgLy8gRm9yIG5ldyBjb2xsZWN0aW9ucywgcmVuYW1lIGZpcnN0IG1vZGUgYW5kIGFkZCBhZGRpdGlvbmFsIG9uZXNcbiAgICAgIGlmIChtb2RlTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb2xsZWN0aW9uLnJlbmFtZU1vZGUoY29sbGVjdGlvbi5tb2Rlc1swXS5tb2RlSWQsIG1vZGVOYW1lc1swXSk7XG4gICAgICAgIG1vZGVJZE1hcC5zZXQobW9kZU5hbWVzWzBdLCBjb2xsZWN0aW9uLm1vZGVzWzBdLm1vZGVJZCk7XG4gICAgICAgIG1vZGVzQ3JlYXRlZCsrO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IG1vZGVOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBtb2RlSWQgPSBjb2xsZWN0aW9uLmFkZE1vZGUobW9kZU5hbWVzW2ldKTtcbiAgICAgICAgbW9kZUlkTWFwLnNldChtb2RlTmFtZXNbaV0sIG1vZGVJZCk7XG4gICAgICAgIG1vZGVzQ3JlYXRlZCsrO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb3IgZXhpc3RpbmcgY29sbGVjdGlvbnMsIG1hdGNoIG1vZGVzIGJ5IG5hbWUgb3Igb3JpZ2luYWwgSURcbiAgICAgIGNvbnN0IGV4aXN0aW5nTW9kZXMgPSBuZXcgTWFwKGNvbGxlY3Rpb24ubW9kZXMubWFwKG0gPT4gW20ubmFtZSwgbS5tb2RlSWRdKSk7XG4gICAgICBcbiAgICAgIGZvciAoY29uc3QgbW9kZU5hbWUgb2YgbW9kZU5hbWVzKSB7XG4gICAgICAgIGNvbnN0IG1vZGVEYXRhID0gZGF0YS5tb2Rlcy5nZXQobW9kZU5hbWUpITtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyeSB0byBmaW5kIGV4aXN0aW5nIG1vZGUgYnkgbmFtZVxuICAgICAgICBpZiAoZXhpc3RpbmdNb2Rlcy5oYXMobW9kZU5hbWUpKSB7XG4gICAgICAgICAgbW9kZUlkTWFwLnNldChtb2RlTmFtZSwgZXhpc3RpbmdNb2Rlcy5nZXQobW9kZU5hbWUpISk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVHJ5IGJ5IG9yaWdpbmFsIElEXG4gICAgICAgIGVsc2UgaWYgKG1vZGVEYXRhLm9yaWdpbmFsSWQpIHtcbiAgICAgICAgICBjb25zdCBleGlzdGluZ01vZGVCeUlkID0gY29sbGVjdGlvbi5tb2Rlcy5maW5kKG0gPT4gbS5tb2RlSWQgPT09IG1vZGVEYXRhLm9yaWdpbmFsSWQpO1xuICAgICAgICAgIGlmIChleGlzdGluZ01vZGVCeUlkKSB7XG4gICAgICAgICAgICBtb2RlSWRNYXAuc2V0KG1vZGVOYW1lLCBleGlzdGluZ01vZGVCeUlkLm1vZGVJZCk7XG4gICAgICAgICAgICAvLyBSZW5hbWUgaWYgbmFtZSBjaGFuZ2VkXG4gICAgICAgICAgICBpZiAoZXhpc3RpbmdNb2RlQnlJZC5uYW1lICE9PSBtb2RlTmFtZSkge1xuICAgICAgICAgICAgICBjb2xsZWN0aW9uLnJlbmFtZU1vZGUoZXhpc3RpbmdNb2RlQnlJZC5tb2RlSWQsIG1vZGVOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBtb2RlXG4gICAgICAgICAgICBjb25zdCBtb2RlSWQgPSBjb2xsZWN0aW9uLmFkZE1vZGUobW9kZU5hbWUpO1xuICAgICAgICAgICAgbW9kZUlkTWFwLnNldChtb2RlTmFtZSwgbW9kZUlkKTtcbiAgICAgICAgICAgIG1vZGVzQ3JlYXRlZCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBDcmVhdGUgbmV3IG1vZGVcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgY29uc3QgbW9kZUlkID0gY29sbGVjdGlvbi5hZGRNb2RlKG1vZGVOYW1lKTtcbiAgICAgICAgICBtb2RlSWRNYXAuc2V0KG1vZGVOYW1lLCBtb2RlSWQpO1xuICAgICAgICAgIG1vZGVzQ3JlYXRlZCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gR3JvdXAgdmFyaWFibGVzIGJ5IG5hbWUgYWNyb3NzIG1vZGVzXG4gICAgY29uc3QgdmFyaWFibGVNYXAgPSBuZXcgTWFwPHN0cmluZywgTWFwPHN0cmluZywgVmFyaWFibGU+PigpOyAvLyB2YXJOYW1lIFx1MjE5MiBtb2RlTmFtZSBcdTIxOTIgVmFyaWFibGVcbiAgICBmb3IgKGNvbnN0IFttb2RlTmFtZSwgbW9kZURhdGFdIG9mIGRhdGEubW9kZXMpIHtcbiAgICAgIGZvciAoY29uc3QgW3Zhck5hbWUsIHZhcmlhYmxlXSBvZiBtb2RlRGF0YS52YXJpYWJsZXMpIHtcbiAgICAgICAgaWYgKCF2YXJpYWJsZU1hcC5oYXModmFyTmFtZSkpIHtcbiAgICAgICAgICB2YXJpYWJsZU1hcC5zZXQodmFyTmFtZSwgbmV3IE1hcCgpKTtcbiAgICAgICAgfVxuICAgICAgICB2YXJpYWJsZU1hcC5nZXQodmFyTmFtZSkhLnNldChtb2RlTmFtZSwgdmFyaWFibGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFByb2Nlc3MgZWFjaCB2YXJpYWJsZVxuICAgIGZvciAoY29uc3QgW3Zhck5hbWUsIG1vZGVWYXJpYWJsZXNdIG9mIHZhcmlhYmxlTWFwKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmaXJzdFZhciA9IEFycmF5LmZyb20obW9kZVZhcmlhYmxlcy52YWx1ZXMoKSlbMF07XG4gICAgICAgIGxldCBmaWdtYVZhcjogdHlwZW9mIGN0eC52YXJpYWJsZUJ5SWQgZXh0ZW5kcyBNYXA8c3RyaW5nLCBpbmZlciBWPiA/IFYgOiBuZXZlcjtcbiAgICAgICAgbGV0IGlzTmV3VmFyaWFibGUgPSBmYWxzZTtcblxuICAgICAgICAvLyBUcnkgdG8gZmluZCBleGlzdGluZyB2YXJpYWJsZVxuICAgICAgICBpZiAoY3R4LnVwZGF0ZUV4aXN0aW5nKSB7XG4gICAgICAgICAgLy8gRmlyc3QgdHJ5IGJ5IG9yaWdpbmFsIHZhcmlhYmxlIElEXG4gICAgICAgICAgaWYgKGZpcnN0VmFyLm9yaWdpbmFsVmFyaWFibGVJZCAmJiBjdHgudmFyaWFibGVCeUlkLmhhcyhmaXJzdFZhci5vcmlnaW5hbFZhcmlhYmxlSWQpKSB7XG4gICAgICAgICAgICBmaWdtYVZhciA9IGN0eC52YXJpYWJsZUJ5SWQuZ2V0KGZpcnN0VmFyLm9yaWdpbmFsVmFyaWFibGVJZCkhO1xuICAgICAgICAgICAgdmFyaWFibGVzVXBkYXRlZCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBUaGVuIHRyeSBieSBjb2xsZWN0aW9uK25hbWUga2V5XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBgJHtuYW1lfToke3Zhck5hbWV9YDtcbiAgICAgICAgICAgIGlmIChjdHgudmFyaWFibGVCeUtleS5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICBmaWdtYVZhciA9IGN0eC52YXJpYWJsZUJ5S2V5LmdldChrZXkpITtcbiAgICAgICAgICAgICAgdmFyaWFibGVzVXBkYXRlZCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBuZXcgdmFyaWFibGUgaWYgbm90IGZvdW5kXG4gICAgICAgIGlmICghZmlnbWFWYXIpIHtcbiAgICAgICAgICBmaWdtYVZhciA9IGZpZ21hLnZhcmlhYmxlcy5jcmVhdGVWYXJpYWJsZShcbiAgICAgICAgICAgIHZhck5hbWUsXG4gICAgICAgICAgICBjb2xsZWN0aW9uLFxuICAgICAgICAgICAgZmlyc3RWYXIucmVzb2x2ZWRUeXBlIGFzIFZhcmlhYmxlUmVzb2x2ZWREYXRhVHlwZVxuICAgICAgICAgICk7XG4gICAgICAgICAgaXNOZXdWYXJpYWJsZSA9IHRydWU7XG4gICAgICAgICAgdmFyaWFibGVzQ3JlYXRlZCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGRlc2NyaXB0aW9uIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChmaXJzdFZhci5kZXNjcmlwdGlvbikge1xuICAgICAgICAgIGZpZ21hVmFyLmRlc2NyaXB0aW9uID0gZmlyc3RWYXIuZGVzY3JpcHRpb247XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdmFsdWUgZm9yIGVhY2ggbW9kZVxuICAgICAgICBmb3IgKGNvbnN0IFttb2RlTmFtZSwgbW9kZVZhcl0gb2YgbW9kZVZhcmlhYmxlcykge1xuICAgICAgICAgIGNvbnN0IG1vZGVJZCA9IG1vZGVJZE1hcC5nZXQobW9kZU5hbWUpO1xuICAgICAgICAgIGlmIChtb2RlSWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcGFyc2VWYWx1ZShtb2RlVmFyLnZhbHVlLCBtb2RlVmFyLnJlc29sdmVkVHlwZSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBmaWdtYVZhci5zZXRWYWx1ZUZvck1vZGUobW9kZUlkLCB2YWx1ZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICBlcnJvcnMucHVzaChcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIHNldCB2YWx1ZSBmb3IgXCIke3Zhck5hbWV9XCIgaW4gbW9kZSBcIiR7bW9kZU5hbWV9XCI6ICR7KGVycm9yIGFzIEVycm9yKS5tZXNzYWdlfWBcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKGBGYWlsZWQgdG8gcHJvY2VzcyB2YXJpYWJsZSBcIiR7dmFyTmFtZX1cIjogJHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgICBjb2xsZWN0aW9uc0NyZWF0ZWQsXG4gICAgICBjb2xsZWN0aW9uc1VwZGF0ZWQsXG4gICAgICBtb2Rlc0NyZWF0ZWQsXG4gICAgICB2YXJpYWJsZXNDcmVhdGVkLFxuICAgICAgdmFyaWFibGVzVXBkYXRlZCxcbiAgICAgIGVycm9ycyxcbiAgICAgIHdhcm5pbmdzXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBjb2xsZWN0aW9uc0NyZWF0ZWQ6IDAsXG4gICAgICBjb2xsZWN0aW9uc1VwZGF0ZWQ6IDAsXG4gICAgICBtb2Rlc0NyZWF0ZWQ6IDAsXG4gICAgICB2YXJpYWJsZXNDcmVhdGVkOiAwLFxuICAgICAgdmFyaWFibGVzVXBkYXRlZDogMCxcbiAgICAgIGVycm9yczogW2BGYWlsZWQgdG8gcHJvY2VzcyBjb2xsZWN0aW9uIFwiJHtuYW1lfVwiOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gXSxcbiAgICAgIHdhcm5pbmdzXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSBjb2xsZWN0aW9uIGluIEZpZ21hIHdpdGggYWxsIG1vZGVzIGFuZCB2YXJpYWJsZXNcbiAqXG4gKiBDcmVhdGVzIHRoZSBjb2xsZWN0aW9uLCBzZXRzIHVwIG1vZGVzLCBhbmQgY3JlYXRlcyBhbGwgdmFyaWFibGVzIHdpdGggdGhlaXJcbiAqIHZhbHVlcyBmb3IgZWFjaCBtb2RlLiBWYXJpYWJsZXMgYXJlIGNyZWF0ZWQgb25jZSBhbmQgdmFsdWVzIGFyZSBzZXQgZm9yIGFsbCBtb2Rlcy5cbiAqXG4gKiBAcGFyYW0gbmFtZSAtIENvbGxlY3Rpb24gbmFtZVxuICogQHBhcmFtIGRhdGEgLSBDb2xsZWN0aW9uIGRhdGEgd2l0aCBtb2RlcyBhbmQgdmFyaWFibGVzXG4gKiBAcmV0dXJucyBJbXBvcnQgcmVzdWx0IGZvciB0aGlzIGNvbGxlY3Rpb25cbiAqIEBkZXByZWNhdGVkIFVzZSBjcmVhdGVPclVwZGF0ZUNvbGxlY3Rpb25JbkZpZ21hIGluc3RlYWRcbiAqL1xuYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29sbGVjdGlvbkluRmlnbWEoXG4gIG5hbWU6IHN0cmluZyxcbiAgZGF0YTogQ29sbGVjdGlvbkRhdGFcbik6IFByb21pc2U8SW1wb3J0UmVzdWx0PiB7XG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgdHJ5IHtcbiAgICAvLyBDcmVhdGUgdmFyaWFibGUgY29sbGVjdGlvblxuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBmaWdtYS52YXJpYWJsZXMuY3JlYXRlVmFyaWFibGVDb2xsZWN0aW9uKG5hbWUpO1xuXG4gICAgLy8gQ3JlYXRlIG1vZGVzXG4gICAgY29uc3QgbW9kZU5hbWVzID0gQXJyYXkuZnJvbShkYXRhLm1vZGVzLmtleXMoKSk7XG4gICAgY29uc3QgbW9kZUlkczogc3RyaW5nW10gPSBbXTtcblxuICAgIC8vIEZpcnN0IG1vZGUgaXMgYWxyZWFkeSBjcmVhdGVkLCByZW5hbWUgaXRcbiAgICBpZiAobW9kZU5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbGxlY3Rpb24ucmVuYW1lTW9kZShjb2xsZWN0aW9uLm1vZGVzWzBdLm1vZGVJZCwgbW9kZU5hbWVzWzBdKTtcbiAgICAgIG1vZGVJZHMucHVzaChjb2xsZWN0aW9uLm1vZGVzWzBdLm1vZGVJZCk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHJlbWFpbmluZyBtb2Rlc1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbW9kZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBtb2RlSWQgPSBjb2xsZWN0aW9uLmFkZE1vZGUobW9kZU5hbWVzW2ldKTtcbiAgICAgIG1vZGVJZHMucHVzaChtb2RlSWQpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSB2YXJpYWJsZXMgZm9yIGVhY2ggbW9kZVxuICAgIGxldCB2YXJpYWJsZXNDcmVhdGVkID0gMDtcbiAgICBjb25zdCB2YXJpYWJsZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBWYXJpYWJsZT4+KCk7IC8vIHZhck5hbWUgXHUyMTkyIG1vZGVOYW1lIFx1MjE5MiBWYXJpYWJsZVxuXG4gICAgLy8gR3JvdXAgdmFyaWFibGVzIGJ5IG5hbWUgYWNyb3NzIG1vZGVzXG4gICAgZm9yIChjb25zdCBbbW9kZU5hbWUsIG1vZGVEYXRhXSBvZiBkYXRhLm1vZGVzKSB7XG4gICAgICBmb3IgKGNvbnN0IFt2YXJOYW1lLCB2YXJpYWJsZV0gb2YgbW9kZURhdGEudmFyaWFibGVzKSB7XG4gICAgICAgIGlmICghdmFyaWFibGVNYXAuaGFzKHZhck5hbWUpKSB7XG4gICAgICAgICAgdmFyaWFibGVNYXAuc2V0KHZhck5hbWUsIG5ldyBNYXAoKSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyaWFibGVNYXAuZ2V0KHZhck5hbWUpIS5zZXQobW9kZU5hbWUsIHZhcmlhYmxlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgZWFjaCB2YXJpYWJsZSBvbmNlIHdpdGggdmFsdWVzIGZvciBhbGwgbW9kZXNcbiAgICBmb3IgKGNvbnN0IFt2YXJOYW1lLCBtb2RlVmFyaWFibGVzXSBvZiB2YXJpYWJsZU1hcCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gR2V0IHRoZSBmaXJzdCB2YXJpYWJsZSB0byBkZXRlcm1pbmUgdHlwZVxuICAgICAgICBjb25zdCBmaXJzdFZhciA9IEFycmF5LmZyb20obW9kZVZhcmlhYmxlcy52YWx1ZXMoKSlbMF07XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gZmlnbWEudmFyaWFibGVzLmNyZWF0ZVZhcmlhYmxlKFxuICAgICAgICAgIHZhck5hbWUsXG4gICAgICAgICAgY29sbGVjdGlvbixcbiAgICAgICAgICBmaXJzdFZhci5yZXNvbHZlZFR5cGUgYXMgVmFyaWFibGVSZXNvbHZlZERhdGFUeXBlXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gU2V0IGRlc2NyaXB0aW9uIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAoZmlyc3RWYXIuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICB2YXJpYWJsZS5kZXNjcmlwdGlvbiA9IGZpcnN0VmFyLmRlc2NyaXB0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHZhbHVlIGZvciBlYWNoIG1vZGVcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtb2RlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBtb2RlTmFtZSA9IG1vZGVOYW1lc1tpXTtcbiAgICAgICAgICBjb25zdCBtb2RlSWQgPSBtb2RlSWRzW2ldO1xuICAgICAgICAgIGNvbnN0IG1vZGVWYXIgPSBtb2RlVmFyaWFibGVzLmdldChtb2RlTmFtZSk7XG5cbiAgICAgICAgICBpZiAobW9kZVZhcikge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJzZVZhbHVlKG1vZGVWYXIudmFsdWUsIG1vZGVWYXIucmVzb2x2ZWRUeXBlKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHZhcmlhYmxlLnNldFZhbHVlRm9yTW9kZShtb2RlSWQsIHZhbHVlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgIGVycm9ycy5wdXNoKFxuICAgICAgICAgICAgICAgIGBGYWlsZWQgdG8gc2V0IHZhbHVlIGZvciBcIiR7dmFyTmFtZX1cIiBpbiBtb2RlIFwiJHttb2RlTmFtZX1cIjogJHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhcmlhYmxlc0NyZWF0ZWQrKztcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKGBGYWlsZWQgdG8gY3JlYXRlIHZhcmlhYmxlIFwiJHt2YXJOYW1lfVwiOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICAgIGNvbGxlY3Rpb25zQ3JlYXRlZDogMSxcbiAgICAgIG1vZGVzQ3JlYXRlZDogbW9kZUlkcy5sZW5ndGgsXG4gICAgICB2YXJpYWJsZXNDcmVhdGVkLFxuICAgICAgZXJyb3JzLFxuICAgICAgd2FybmluZ3NcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGNvbGxlY3Rpb25zQ3JlYXRlZDogMCxcbiAgICAgIG1vZGVzQ3JlYXRlZDogMCxcbiAgICAgIHZhcmlhYmxlc0NyZWF0ZWQ6IDAsXG4gICAgICBlcnJvcnM6IFtgRmFpbGVkIHRvIGNyZWF0ZSBjb2xsZWN0aW9uIFwiJHtuYW1lfVwiOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gXSxcbiAgICAgIHdhcm5pbmdzXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlIHZhbHVlIHN0cmluZyB0byBhcHByb3ByaWF0ZSBGaWdtYSB0eXBlXG4gKlxuICogQ29udmVydHMgc3RyaW5nIHJlcHJlc2VudGF0aW9ucyBvZiB2YWx1ZXMgdG8gdGhlaXIgcHJvcGVyIEZpZ21hIHR5cGVzLlxuICogSGFuZGxlcyBjb2xvcnMgKGhleCksIG51bWJlcnMsIGFuZCBzdHJpbmdzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFZhbHVlIHRvIHBhcnNlIChjYW4gYmUgYW55IHR5cGUpXG4gKiBAcGFyYW0gdHlwZSAtIEZpZ21hIHZhcmlhYmxlIHR5cGUgKENPTE9SLCBGTE9BVCwgU1RSSU5HLCBldGMuKVxuICogQHJldHVybnMgUGFyc2VkIHZhbHVlIGluIHRoZSBhcHByb3ByaWF0ZSBmb3JtYXQgZm9yIEZpZ21hXG4gKi9cbmZ1bmN0aW9uIHBhcnNlVmFsdWUodmFsdWU6IGFueSwgdHlwZTogc3RyaW5nKTogYW55IHtcbiAgaWYgKHR5cGUgPT09ICdDT0xPUicpIHtcbiAgICByZXR1cm4gcGFyc2VDb2xvcih2YWx1ZSk7XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0ZMT0FUJykge1xuICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnQk9PTEVBTicpIHtcbiAgICByZXR1cm4gQm9vbGVhbih2YWx1ZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFN0cmluZyh2YWx1ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBjb2xvciBzdHJpbmcgdG8gUkdCQVxuICpcbiAqIENvbnZlcnRzIGhleCBjb2xvciBzdHJpbmdzIHRvIEZpZ21hJ3MgUkdCQSBvYmplY3QgZm9ybWF0LlxuICogU3VwcG9ydHMgYm90aCA2LWRpZ2l0ICgjUlJHR0JCKSBhbmQgOC1kaWdpdCAoI1JSR0dCQkFBKSBoZXggZm9ybWF0cy5cbiAqXG4gKiBAcGFyYW0gY29sb3JTdHJpbmcgLSBDb2xvciB2YWx1ZSAoaGV4IHN0cmluZylcbiAqIEByZXR1cm5zIFJHQkEgb2JqZWN0IHdpdGggdmFsdWVzIGZyb20gMC0xXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQ29sb3IoY29sb3JTdHJpbmc6IHN0cmluZyk6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH0ge1xuICAvLyBIYW5kbGUgaGV4IGNvbG9yc1xuICBpZiAodHlwZW9mIGNvbG9yU3RyaW5nID09PSAnc3RyaW5nJyAmJiBjb2xvclN0cmluZy5zdGFydHNXaXRoKCcjJykpIHtcbiAgICBjb25zdCBoZXggPSBjb2xvclN0cmluZy5zbGljZSgxKTtcbiAgICBjb25zdCByID0gcGFyc2VJbnQoaGV4LnNsaWNlKDAsIDIpLCAxNikgLyAyNTU7XG4gICAgY29uc3QgZyA9IHBhcnNlSW50KGhleC5zbGljZSgyLCA0KSwgMTYpIC8gMjU1O1xuICAgIGNvbnN0IGIgPSBwYXJzZUludChoZXguc2xpY2UoNCwgNiksIDE2KSAvIDI1NTtcbiAgICBjb25zdCBhID0gaGV4Lmxlbmd0aCA9PT0gOCA/IHBhcnNlSW50KGhleC5zbGljZSg2LCA4KSwgMTYpIC8gMjU1IDogMTtcbiAgICByZXR1cm4geyByLCBnLCBiLCBhIH07XG4gIH1cblxuICAvLyBEZWZhdWx0IGZhbGxiYWNrXG4gIHJldHVybiB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfTtcbn1cbiIsICIvKipcbiAqIE1lc3NhZ2UgaGFuZGxlciByb3V0ZXJcbiAqIFJvdXRlcyBpbmNvbWluZyBtZXNzYWdlcyBmcm9tIFVJIHRvIGFwcHJvcHJpYXRlIGJhY2tlbmQgbW9kdWxlc1xuICpcbiAqIFRoaXMgbW9kdWxlIHNlcnZlcyBhcyB0aGUgY2VudHJhbCBtZXNzYWdlIGRpc3BhdGNoZXIgZm9yIHRoZSBwbHVnaW4gYmFja2VuZCxcbiAqIHJlY2VpdmluZyBhbGwgbWVzc2FnZXMgZnJvbSB0aGUgVUkgaWZyYW1lIGFuZCByb3V0aW5nIHRoZW0gdG8gdGhlIGFwcHJvcHJpYXRlXG4gKiBmZWF0dXJlIGhhbmRsZXJzIChpbXBvcnQsIGV4cG9ydCwgc3luYykuXG4gKlxuICogQG1vZHVsZSBiYWNrZW5kL2hhbmRsZXJzL21lc3NhZ2Utcm91dGVyXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBVSU1lc3NhZ2UsIFBsdWdpbk1lc3NhZ2UsIE1hbnVhbEltcG9ydENvbmZpZyB9IGZyb20gJy4uLy4uL3R5cGVzL21lc3NhZ2UudHlwZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBMZXZlbENvbmZpZ3VyYXRpb24gfSBmcm9tICcuLi8uLi90eXBlcy9sZXZlbC1jb25maWcudHlwZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBUb2tlbkNoYW5nZSB9IGZyb20gJy4uL3V0aWxzL3ZlcnNpb24tbWFuYWdlci5qcyc7XG5pbXBvcnQgeyBleHBvcnRCYXNlbGluZSB9IGZyb20gJy4uL2V4cG9ydC9pbmRleC5qcyc7XG5pbXBvcnQgeyBzeW5jVG9Ob2RlLCBnZXRMYXN0U3luY0luZm8sIGZpbmRSZWdpc3RyeU5vZGUsIGxvYWRDaHVua3NGcm9tTm9kZSwgdW5jaHVua0RhdGEgfSBmcm9tICcuLi9zeW5jL2luZGV4LmpzJztcbmltcG9ydCB7IGFuYWx5emVKc29uU3RydWN0dXJlIH0gZnJvbSAnLi4vdXRpbHMvc3RydWN0dXJlLWFuYWx5emVyLmpzJztcbmltcG9ydCB7IGdlbmVyYXRlUHJldmlldyB9IGZyb20gJy4uL3V0aWxzL3ByZXZpZXctZ2VuZXJhdG9yLmpzJztcbmltcG9ydCB7IGltcG9ydFdpdGhMZXZlbE1hcHBpbmcgfSBmcm9tICcuLi9pbXBvcnQvbGV2ZWwtbWFwcGVyLmpzJztcbmltcG9ydCB7IGhhbmRsZU11bHRpRmlsZUltcG9ydCB9IGZyb20gJy4uL2ltcG9ydC9tdWx0aS1maWxlLWhhbmRsZXIuanMnO1xuaW1wb3J0IHsgY2FsY3VsYXRlVmVyc2lvbkJ1bXAgfSBmcm9tICcuLi91dGlscy92ZXJzaW9uLW1hbmFnZXIuanMnO1xuaW1wb3J0IHsgUExVR0lOX05BTUVTUEFDRSB9IGZyb20gJy4uL3V0aWxzL2NvbnN0YW50cy5qcyc7XG5cbi8qKlxuICogSGFuZGxlIGluY29taW5nIG1lc3NhZ2UgZnJvbSBVSS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IGZvciBhbGwgVUktdG8tYmFja2VuZCBjb21tdW5pY2F0aW9uIGluIHRoZSBwbHVnaW4uXG4gKiBJdCByZWNlaXZlcyB0eXBlLXNhZmUgbWVzc2FnZXMgZnJvbSB0aGUgVUkgYW5kIHJvdXRlcyB0aGVtIHRvIGFwcHJvcHJpYXRlIGhhbmRsZXJzLlxuICpcbiAqIFRoZSBtZXNzYWdlIHJvdXRpbmcgaXMgZXhoYXVzdGl2ZSAtIFR5cGVTY3JpcHQgZW5mb3JjZXMgdGhhdCBhbGwgbWVzc2FnZSB0eXBlc1xuICogYXJlIGhhbmRsZWQgdmlhIHRoZSBuZXZlciB0eXBlIGNoZWNrIGF0IHRoZSBlbmQgb2YgdGhlIHN3aXRjaCBzdGF0ZW1lbnQuXG4gKlxuICogKipNZXNzYWdlIEZsb3c6KipcbiAqIGBgYFxuICogVUkgXHUyMTkyIG1lc3NhZ2UtYnJpZGdlLnRzIFx1MjE5MiBmaWdtYS51aS5vbm1lc3NhZ2UgXHUyMTkyIGhhbmRsZU1lc3NhZ2UgXHUyMTkyIFtoYW5kbGVyXSBcdTIxOTIgcmVzcG9uc2VcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBtc2cgLSBUeXBlLXNhZmUgbWVzc2FnZSBmcm9tIFVJIChVSU1lc3NhZ2UgdW5pb24gdHlwZSlcbiAqIEByZXR1cm5zIFByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIG1lc3NhZ2UgaGFuZGxpbmcgaXMgY29tcGxldGVcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIC8vIEluIGNvZGUudHMgZW50cnkgcG9pbnRcbiAqIGZpZ21hLnVpLm9ubWVzc2FnZSA9IGFzeW5jIChtc2c6IFVJTWVzc2FnZSkgPT4ge1xuICogICBhd2FpdCBoYW5kbGVNZXNzYWdlKG1zZyk7XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVNZXNzYWdlKG1zZzogVUlNZXNzYWdlKTogUHJvbWlzZTx2b2lkPiB7XG4gIHN3aXRjaCAobXNnLnR5cGUpIHtcbiAgICBjYXNlICdnZXQtbGFzdC1zeW5jJzpcbiAgICAgIGF3YWl0IGhhbmRsZUdldExhc3RTeW5jKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2dldC1jb2xsZWN0aW9ucyc6XG4gICAgICBhd2FpdCBoYW5kbGVHZXRDb2xsZWN0aW9ucygpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdleHBvcnQtYmFzZWxpbmUnOlxuICAgICAgYXdhaXQgaGFuZGxlRXhwb3J0QmFzZWxpbmUobXNnLmNvbGxlY3Rpb25JZHMpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdzeW5jLXRvLW5vZGUnOlxuICAgICAgYXdhaXQgaGFuZGxlU3luY1RvTm9kZShtc2cuY29sbGVjdGlvbklkcyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2NoZWNrLXN5bmMtY2hhbmdlcyc6XG4gICAgICBhd2FpdCBoYW5kbGVDaGVja1N5bmNDaGFuZ2VzKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ3N5bmMtd2l0aC12ZXJzaW9uJzpcbiAgICAgIGF3YWl0IGhhbmRsZVN5bmNXaXRoVmVyc2lvbihtc2cudmVyc2lvbiwgbXNnLmNoYW5nZXMpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdkZXRlY3QtaW1wb3J0LWZvcm1hdCc6XG4gICAgICBhd2FpdCBoYW5kbGVEZXRlY3RJbXBvcnRGb3JtYXQobXNnLmZpbGVOYW1lLCBtc2cuanNvbkRhdGEpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdpbXBvcnQtYmFzZWxpbmUnOlxuICAgICAgYXdhaXQgaGFuZGxlSW1wb3J0QmFzZWxpbmUobXNnLmJhc2VsaW5lKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAncHJldmlldy1iYXNlbGluZS1pbXBvcnQnOlxuICAgICAgYXdhaXQgaGFuZGxlUHJldmlld0Jhc2VsaW5lSW1wb3J0KG1zZy5iYXNlbGluZSk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2NvbmZpcm0tYmFzZWxpbmUtaW1wb3J0JzpcbiAgICAgIGF3YWl0IGhhbmRsZUltcG9ydEJhc2VsaW5lKG1zZy5iYXNlbGluZSk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2FuYWx5emUtc3RydWN0dXJlJzpcbiAgICAgIGF3YWl0IGhhbmRsZUFuYWx5emVTdHJ1Y3R1cmUobXNnLmZpbGVOYW1lLCBtc2cuanNvbkRhdGEsIG1zZy5tZXRhZGF0YSk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2dlbmVyYXRlLXByZXZpZXcnOlxuICAgICAgYXdhaXQgaGFuZGxlR2VuZXJhdGVQcmV2aWV3KG1zZy5maWxlTmFtZSwgbXNnLmpzb25EYXRhLCBtc2cubGV2ZWxzKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnaW1wb3J0LXdpdGgtbWFudWFsLWNvbmZpZyc6XG4gICAgICBhd2FpdCBoYW5kbGVJbXBvcnRXaXRoTWFudWFsQ29uZmlnKG1zZy5jb25maWcpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdjYW5jZWwnOlxuICAgICAgaGFuZGxlQ2FuY2VsKCk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBUeXBlU2NyaXB0IGV4aGF1c3RpdmVuZXNzIGNoZWNrXG4gICAgICBjb25zdCBfZXhoYXVzdGl2ZTogbmV2ZXIgPSBtc2c7XG4gICAgICBjb25zb2xlLndhcm4oJ1Vua25vd24gbWVzc2FnZSB0eXBlOicsIF9leGhhdXN0aXZlKTtcbiAgfVxufVxuXG4vKipcbiAqIFBvc3QgbWVzc2FnZSB0byBVSS5cbiAqXG4gKiBUeXBlLXNhZmUgd3JhcHBlciBhcm91bmQgZmlnbWEudWkucG9zdE1lc3NhZ2UuIEFsbCByZXNwb25zZXMgdG8gdGhlIFVJXG4gKiBtdXN0IHVzZSBQbHVnaW5NZXNzYWdlIHR5cGVzLlxuICpcbiAqIEBwYXJhbSBtc2cgLSBUeXBlLXNhZmUgcGx1Z2luIG1lc3NhZ2VcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBwb3N0TWVzc2FnZShtc2c6IFBsdWdpbk1lc3NhZ2UpOiB2b2lkIHtcbiAgZmlnbWEudWkucG9zdE1lc3NhZ2UobXNnKTtcbn1cblxuLyoqXG4gKiBIYW5kbGUgZ2V0LWxhc3Qtc3luYyBtZXNzYWdlLlxuICpcbiAqIFJldHJpZXZlcyBhbmQgc2VuZHMgbGFzdCBzeW5jIGluZm9ybWF0aW9uIHRvIFVJLiBJZiBubyByZWdpc3RyeSBub2RlIGV4aXN0c1xuICogb3IgbWV0YWRhdGEgY2FuJ3QgYmUgcmVhZCwgc2VuZHMgeyBleGlzdHM6IGZhbHNlIH0uXG4gKlxuICogQGludGVybmFsXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUdldExhc3RTeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHN5bmNJbmZvID0gYXdhaXQgZ2V0TGFzdFN5bmNJbmZvKCk7XG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ2xhc3Qtc3luYy1sb2FkZWQnLFxuICAgICAgLi4uc3luY0luZm9cbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIGxhc3Qgc3luYyBpbmZvOicsIGVycm9yKTtcbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiAnbGFzdC1zeW5jLWxvYWRlZCcsXG4gICAgICBleGlzdHM6IGZhbHNlXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgZ2V0LWNvbGxlY3Rpb25zIG1lc3NhZ2UuXG4gKlxuICogUmV0cmlldmVzIGFsbCBsb2NhbCB2YXJpYWJsZSBjb2xsZWN0aW9ucyBhbmQgc2VuZHMgc3VtbWFyeSB0byBVSS5cbiAqIFRoZSBzdW1tYXJ5IGluY2x1ZGVzIGNvbGxlY3Rpb24gSUQsIG5hbWUsIG1vZGUgY291bnQsIGFuZCB2YXJpYWJsZSBjb3VudFxuICogZm9yIGRpc3BsYXkgaW4gZXhwb3J0L3N5bmMgdGFicy5cbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlR2V0Q29sbGVjdGlvbnMoKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgY29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgICBjb25zdCBhbGxWYXJpYWJsZXMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZXNBc3luYygpO1xuXG4gICAgY29uc3QgY29sbGVjdGlvbkRhdGEgPSBjb2xsZWN0aW9ucy5tYXAoY29sID0+ICh7XG4gICAgICBpZDogY29sLmlkLFxuICAgICAgbmFtZTogY29sLm5hbWUsXG4gICAgICBtb2RlQ291bnQ6IGNvbC5tb2Rlcy5sZW5ndGgsXG4gICAgICB2YXJpYWJsZUNvdW50OiBhbGxWYXJpYWJsZXMuZmlsdGVyKHYgPT4gdi52YXJpYWJsZUNvbGxlY3Rpb25JZCA9PT0gY29sLmlkKS5sZW5ndGhcbiAgICB9KSk7XG5cbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiAnY29sbGVjdGlvbnMtbG9hZGVkJyxcbiAgICAgIGNvbGxlY3Rpb25zOiBjb2xsZWN0aW9uRGF0YVxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgY29sbGVjdGlvbnM6JywgZXJyb3IpO1xuICB9XG59XG5cblxuLyoqXG4gKiBIYW5kbGUgZXhwb3J0LWJhc2VsaW5lIG1lc3NhZ2UuXG4gKlxuICogRXhwb3J0cyBiYXNlbGluZSBzbmFwc2hvdCBhbmQgc2VuZHMgdG8gVUkgZm9yIGRpc3BsYXkvZG93bmxvYWQuXG4gKiBTdXBwb3J0cyBvcHRpb25hbCBjb2xsZWN0aW9uIGZpbHRlcmluZy5cbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvbklkcyAtIEFycmF5IG9mIGNvbGxlY3Rpb24gSURzIHRvIGV4cG9ydCAoZW1wdHkgPSBhbGwpXG4gKiBAaW50ZXJuYWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlRXhwb3J0QmFzZWxpbmUoY29sbGVjdGlvbklkczogc3RyaW5nW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZygnRXhwb3J0IGJhc2VsaW5lIHJlcXVlc3RlZCcpO1xuICAgIGZpZ21hLm5vdGlmeSgnRXhwb3J0aW5nIGJhc2VsaW5lIHNuYXBzaG90Li4uJyk7XG5cbiAgICBjb25zdCBmaWx0ZXJJZHMgPSBjb2xsZWN0aW9uSWRzICYmIGNvbGxlY3Rpb25JZHMubGVuZ3RoID4gMCA/IGNvbGxlY3Rpb25JZHMgOiBudWxsO1xuICAgIGNvbnN0IGJhc2VsaW5lID0gYXdhaXQgZXhwb3J0QmFzZWxpbmUoZmlsdGVySWRzKTtcbiAgICBjb25zdCBqc29uU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoYmFzZWxpbmUpO1xuXG4gICAgY29uc29sZS5sb2coJ0V4cG9ydCBjb21wbGV0ZSwgZGF0YSBzaXplOicsIGpzb25TdHJpbmcubGVuZ3RoLCAnYnl0ZXMnKTtcblxuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdleHBvcnQtY29tcGxldGUnLFxuICAgICAgZGF0YTogYmFzZWxpbmVcbiAgICB9KTtcblxuICAgIGZpZ21hLm5vdGlmeSgnRXhwb3J0IGNvbXBsZXRlIScpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0V4cG9ydCBlcnJvcjonLCBlcnJvcik7XG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuXG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ2V4cG9ydC1lcnJvcicsXG4gICAgICBtZXNzYWdlOiBlcnJvck1lc3NhZ2VcbiAgICB9KTtcblxuICAgIGZpZ21hLm5vdGlmeSgnRXhwb3J0IGZhaWxlZDogJyArIGVycm9yTWVzc2FnZSwgeyBlcnJvcjogdHJ1ZSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEhhbmRsZSBzeW5jLXRvLW5vZGUgbWVzc2FnZS5cbiAqXG4gKiBTeW5jcyB0b2tlbiByZWdpc3RyeSB0byBub2RlIGZvciBBUEkgYWNjZXNzIGJ5IHRoZSBTeW5raW8gQ0xJLlxuICogVGhpcyBlbmFibGVzIGRldmVsb3BlcnMgdG8gZmV0Y2ggdG9rZW5zIHdpdGhvdXQgbWFudWFsIHBsdWdpbiBpbnRlcmFjdGlvbi5cbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvbklkcyAtIEFycmF5IG9mIGNvbGxlY3Rpb24gSURzIHRvIHN5bmMgKGVtcHR5ID0gYWxsKVxuICogQGludGVybmFsXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVN5bmNUb05vZGUoY29sbGVjdGlvbklkczogc3RyaW5nW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZygnU3luYyB0byBOb2RlIHJlcXVlc3RlZCcpO1xuICAgIGZpZ21hLm5vdGlmeSgnU3luY2luZyByZWdpc3RyeSB0byBub2RlLi4uJyk7XG5cbiAgICBjb25zdCBmaWx0ZXJJZHMgPSBjb2xsZWN0aW9uSWRzICYmIGNvbGxlY3Rpb25JZHMubGVuZ3RoID4gMCA/IGNvbGxlY3Rpb25JZHMgOiBudWxsO1xuXG4gICAgLy8gRXhwb3J0IGJhc2VsaW5lIGZpcnN0XG4gICAgY29uc3QgZXhwb3J0RGF0YSA9IGF3YWl0IGV4cG9ydEJhc2VsaW5lKGZpbHRlcklkcyk7XG5cbiAgICAvLyBUaGVuIHN5bmMgdG8gbm9kZVxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHN5bmNUb05vZGUoZXhwb3J0RGF0YSk7XG5cbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiAnc3luYy1jb21wbGV0ZScsXG4gICAgICBub2RlSWQ6IHJlc3VsdC5ub2RlSWQsXG4gICAgICB2YXJpYWJsZUNvdW50OiByZXN1bHQudmFyaWFibGVDb3VudFxuICAgIH0pO1xuXG4gICAgZmlnbWEubm90aWZ5KGBcdTI3MTMgU3luY2VkICR7cmVzdWx0LnZhcmlhYmxlQ291bnR9IHZhcmlhYmxlcyB0byBub2RlIWApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1N5bmMgZXJyb3I6JywgZXJyb3IpO1xuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcblxuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdzeW5jLWVycm9yJyxcbiAgICAgIG1lc3NhZ2U6IGVycm9yTWVzc2FnZVxuICAgIH0pO1xuXG4gICAgZmlnbWEubm90aWZ5KCdTeW5jIGZhaWxlZDogJyArIGVycm9yTWVzc2FnZSwgeyBlcnJvcjogdHJ1ZSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEhhbmRsZSBkZXRlY3QtaW1wb3J0LWZvcm1hdCBtZXNzYWdlLlxuICpcbiAqIERldGVjdHMgaWYgdXBsb2FkZWQgZmlsZSBpcyBhIGJhc2VsaW5lIGZvcm1hdC5cbiAqIEN1cnJlbnRseSBvbmx5IGRldGVjdHMgYmFzZWxpbmUgLSBhbGwgb3RoZXIgZm9ybWF0cyBnbyB0byBmbGV4aWJsZSBpbXBvcnQuXG4gKlxuICogQHBhcmFtIGZpbGVOYW1lIC0gTmFtZSBvZiB0aGUgZmlsZVxuICogQHBhcmFtIGpzb25EYXRhIC0gUGFyc2VkIEpTT04gZGF0YVxuICogQGludGVybmFsXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZURldGVjdEltcG9ydEZvcm1hdChmaWxlTmFtZTogc3RyaW5nLCBqc29uRGF0YTogdW5rbm93bik6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGV0ZWN0QmFzZWxpbmVGb3JtYXQgfSA9IGF3YWl0IGltcG9ydCgnLi4vdXRpbHMvYmFzZWxpbmUtZGV0ZWN0b3IuanMnKTtcbiAgICBjb25zdCB7IHZhbGlkYXRlQmFzZWxpbmUgfSA9IGF3YWl0IGltcG9ydCgnLi4vdXRpbHMvYmFzZWxpbmUtdmFsaWRhdG9yLmpzJyk7XG5cbiAgICBjb25zdCBkZXRlY3Rpb24gPSBkZXRlY3RCYXNlbGluZUZvcm1hdChqc29uRGF0YSk7XG5cbiAgICBsZXQgdmFsaWRhdGlvbjtcbiAgICBpZiAoZGV0ZWN0aW9uLmlzQmFzZWxpbmUgJiYganNvbkRhdGEpIHtcbiAgICAgIHZhbGlkYXRpb24gPSB2YWxpZGF0ZUJhc2VsaW5lKGpzb25EYXRhKTtcbiAgICB9XG5cbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiAnaW1wb3J0LWZvcm1hdC1kZXRlY3RlZCcsXG4gICAgICBmaWxlTmFtZSxcbiAgICAgIGJhc2VsaW5lRGV0ZWN0aW9uOiBkZXRlY3Rpb24sXG4gICAgICB2YWxpZGF0aW9uXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZGV0ZWN0aW5nIGltcG9ydCBmb3JtYXQ6JywgZXJyb3IpO1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdpbXBvcnQtZXJyb3InLFxuICAgICAgbWVzc2FnZTogYEZhaWxlZCB0byBkZXRlY3QgZm9ybWF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgaW1wb3J0LWJhc2VsaW5lIG1lc3NhZ2UuXG4gKlxuICogSW1wb3J0cyBhIGJhc2VsaW5lIHNuYXBzaG90IGZpbGUuXG4gKlxuICogQHBhcmFtIGJhc2VsaW5lIC0gQmFzZWxpbmUgZGF0YVxuICogQGludGVybmFsXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUltcG9ydEJhc2VsaW5lKGJhc2VsaW5lOiB1bmtub3duKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBpbXBvcnRCYXNlbGluZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9pbXBvcnQvYmFzZWxpbmUtaW1wb3J0ZXIuanMnKTtcblxuICAgIGZpZ21hLm5vdGlmeSgnSW1wb3J0aW5nIGJhc2VsaW5lLi4uJyk7XG5cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBpbXBvcnRCYXNlbGluZShiYXNlbGluZSk7XG5cbiAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgIC8vIEFmdGVyIHN1Y2Nlc3NmdWwgaW1wb3J0LCBzeW5jIHRoZSBjdXJyZW50IHN0YXRlIHRvIHRoZSByZWdpc3RyeSBub2RlXG4gICAgICAvLyBUaGlzIG1ha2VzIHRoZSBpbXBvcnRlZCB2ZXJzaW9uIHRoZSBuZXcgYmFzZWxpbmUgZm9yIGZ1dHVyZSBjb21wYXJpc29uc1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgeyBleHBvcnRCYXNlbGluZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9leHBvcnQvaW5kZXguanMnKTtcbiAgICAgICAgY29uc3QgeyBzeW5jVG9Ob2RlIH0gPSBhd2FpdCBpbXBvcnQoJy4uL3N5bmMvaW5kZXguanMnKTtcbiAgICAgICAgY29uc3QgY3VycmVudEJhc2VsaW5lID0gYXdhaXQgZXhwb3J0QmFzZWxpbmUobnVsbCkgYXMgYW55O1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHRoZSBpbXBvcnRlZCB2ZXJzaW9uIG51bWJlclxuICAgICAgICBpZiAoIWN1cnJlbnRCYXNlbGluZS4kbWV0YWRhdGEpIHtcbiAgICAgICAgICBjdXJyZW50QmFzZWxpbmUuJG1ldGFkYXRhID0ge307XG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudEJhc2VsaW5lLiRtZXRhZGF0YS52ZXJzaW9uID0gcmVzdWx0LmltcG9ydGVkVmVyc2lvbiB8fCAnMS4wLjAnO1xuICAgICAgICBjdXJyZW50QmFzZWxpbmUuJG1ldGFkYXRhLnN5bmNlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgc3luY1RvTm9kZShjdXJyZW50QmFzZWxpbmUpO1xuICAgICAgICBjb25zb2xlLmxvZygnW0ltcG9ydF0gU3luY2VkIGltcG9ydGVkIGJhc2VsaW5lIHRvIHJlZ2lzdHJ5IG5vZGUgd2l0aCB2ZXJzaW9uOicsIHJlc3VsdC5pbXBvcnRlZFZlcnNpb24pO1xuICAgICAgfSBjYXRjaCAoc3luY0Vycm9yKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignW0ltcG9ydF0gRmFpbGVkIHRvIHN5bmMgYmFzZWxpbmUgdG8gcmVnaXN0cnkgbm9kZTonLCBzeW5jRXJyb3IpO1xuICAgICAgICAvLyBEb24ndCBmYWlsIHRoZSBpbXBvcnQgLSBqdXN0IHdhcm5cbiAgICAgIH1cblxuICAgICAgLy8gQnVpbGQgbWVzc2FnZSB3aXRoIHZlcnNpb24gaW5mbyBpZiBhdmFpbGFibGVcbiAgICAgIGxldCBtZXNzYWdlID0gJyc7XG4gICAgICBcbiAgICAgIC8vIFNob3cgdmVyc2lvbiBpbmZvXG4gICAgICBpZiAocmVzdWx0LmltcG9ydGVkVmVyc2lvbikge1xuICAgICAgICBtZXNzYWdlICs9IGB2JHtyZXN1bHQuaW1wb3J0ZWRWZXJzaW9ufWA7XG4gICAgICAgIGlmIChyZXN1bHQucHJldmlvdXNWZXJzaW9uICYmIHJlc3VsdC5wcmV2aW91c1ZlcnNpb24gIT09IHJlc3VsdC5pbXBvcnRlZFZlcnNpb24pIHtcbiAgICAgICAgICBtZXNzYWdlICs9IGAgKHdhcyB2JHtyZXN1bHQucHJldmlvdXNWZXJzaW9ufSlgO1xuICAgICAgICB9XG4gICAgICAgIG1lc3NhZ2UgKz0gJzogJztcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gU2hvdyBjb3VudHMgLSBwcmlvcml0aXplIHVwZGF0ZXMgaWYgdGhleSBleGlzdFxuICAgICAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XG4gICAgICBpZiAocmVzdWx0LmNvbGxlY3Rpb25zQ3JlYXRlZCA+IDApIHBhcnRzLnB1c2goYCR7cmVzdWx0LmNvbGxlY3Rpb25zQ3JlYXRlZH0gY29sbGVjdGlvbihzKSBjcmVhdGVkYCk7XG4gICAgICBpZiAocmVzdWx0LmNvbGxlY3Rpb25zVXBkYXRlZCA+IDApIHBhcnRzLnB1c2goYCR7cmVzdWx0LmNvbGxlY3Rpb25zVXBkYXRlZH0gY29sbGVjdGlvbihzKSB1cGRhdGVkYCk7XG4gICAgICBpZiAocmVzdWx0LnZhcmlhYmxlc0NyZWF0ZWQgPiAwKSBwYXJ0cy5wdXNoKGAke3Jlc3VsdC52YXJpYWJsZXNDcmVhdGVkfSB2YXJpYWJsZShzKSBjcmVhdGVkYCk7XG4gICAgICBpZiAocmVzdWx0LnZhcmlhYmxlc1VwZGF0ZWQgPiAwKSBwYXJ0cy5wdXNoKGAke3Jlc3VsdC52YXJpYWJsZXNVcGRhdGVkfSB2YXJpYWJsZShzKSB1cGRhdGVkYCk7XG4gICAgICBcbiAgICAgIG1lc3NhZ2UgKz0gcGFydHMubGVuZ3RoID4gMCA/IHBhcnRzLmpvaW4oJywgJykgOiAnTm8gY2hhbmdlcyc7XG4gICAgICBcbiAgICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgICAgdHlwZTogJ2ltcG9ydC1jb21wbGV0ZScsXG4gICAgICAgIG1lc3NhZ2VcbiAgICAgIH0pO1xuICAgICAgZmlnbWEubm90aWZ5KCdJbXBvcnQgY29tcGxldGUhJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgICAgdHlwZTogJ2ltcG9ydC1lcnJvcicsXG4gICAgICAgIG1lc3NhZ2U6IHJlc3VsdC5lcnJvcnMuam9pbignXFxuJylcbiAgICAgIH0pO1xuICAgICAgZmlnbWEubm90aWZ5KCdJbXBvcnQgZmFpbGVkJywgeyBlcnJvcjogdHJ1ZSB9KTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignQmFzZWxpbmUgaW1wb3J0IGVycm9yOicsIGVycm9yKTtcbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiAnaW1wb3J0LWVycm9yJyxcbiAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxuICAgIH0pO1xuICAgIGZpZ21hLm5vdGlmeSgnSW1wb3J0IGZhaWxlZCcsIHsgZXJyb3I6IHRydWUgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgcHJldmlldy1iYXNlbGluZS1pbXBvcnQgbWVzc2FnZS5cbiAqXG4gKiBDb21wYXJlcyB0aGUgaW1wb3J0ZWQgYmFzZWxpbmUgd2l0aCBjdXJyZW50IEZpZ21hIHN0YXRlIGFuZCByZXR1cm5zXG4gKiBhIGRpZmYgc2hvd2luZyB3aGF0IHdpbGwgY2hhbmdlIGJlZm9yZSB0aGUgaW1wb3J0IGlzIGFwcGxpZWQuXG4gKlxuICogQHBhcmFtIGJhc2VsaW5lIC0gQmFzZWxpbmUgZGF0YSB0byBwcmV2aWV3XG4gKiBAaW50ZXJuYWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUHJldmlld0Jhc2VsaW5lSW1wb3J0KGJhc2VsaW5lOiB1bmtub3duKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coJ1tJbXBvcnRQcmV2aWV3XSBHZW5lcmF0aW5nIGltcG9ydCBwcmV2aWV3Li4uJyk7XG4gICAgZmlnbWEubm90aWZ5KCdBbmFseXppbmcgY2hhbmdlcy4uLicpO1xuXG4gICAgLy8gVmFsaWRhdGUgYmFzZWxpbmUgZm9ybWF0XG4gICAgY29uc3QgYmFzZWxpbmVEYXRhID0gYmFzZWxpbmUgYXMgYW55O1xuICAgIGlmICghYmFzZWxpbmVEYXRhIHx8ICFiYXNlbGluZURhdGEuYmFzZWxpbmUgfHwgdHlwZW9mIGJhc2VsaW5lRGF0YS5iYXNlbGluZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgICAgdHlwZTogJ2ltcG9ydC1lcnJvcicsXG4gICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIGJhc2VsaW5lIGZvcm1hdDogbWlzc2luZyBiYXNlbGluZSBwcm9wZXJ0eSdcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEdldCB0aGUgaW1wb3J0ZWQgdmVyc2lvblxuICAgIGNvbnN0IGltcG9ydGVkVmVyc2lvbiA9IGJhc2VsaW5lRGF0YS4kbWV0YWRhdGE/LnZlcnNpb24gfHwgJzEuMC4wJztcblxuICAgIC8vIEJ1aWxkIGN1cnJlbnQgRmlnbWEgc3RhdGUgYXMgYmFzZWxpbmUgZm9yIGNvbXBhcmlzb25cbiAgICBjb25zdCB7IGJ1aWxkQmFzZWxpbmVTbmFwc2hvdCB9ID0gYXdhaXQgaW1wb3J0KCcuLi9leHBvcnQvYmFzZWxpbmUuanMnKTtcbiAgICBjb25zdCBjdXJyZW50QmFzZWxpbmUgPSBhd2FpdCBidWlsZEJhc2VsaW5lU25hcHNob3QobnVsbCk7XG4gICAgY29uc3QgY3VycmVudFZlcnNpb24gPSBjdXJyZW50QmFzZWxpbmUuJG1ldGFkYXRhPy52ZXJzaW9uIHx8ICcxLjAuMCc7XG5cbiAgICBjb25zb2xlLmxvZygnW0ltcG9ydFByZXZpZXddIENvbXBhcmluZyBpbXBvcnRlZCB2JyArIGltcG9ydGVkVmVyc2lvbiArICcgd2l0aCBjdXJyZW50IEZpZ21hIHN0YXRlIHYnICsgY3VycmVudFZlcnNpb24pO1xuXG4gICAgLy8gQ2FsY3VsYXRlIGNoYW5nZXMgKG5vdGU6IHdlJ3JlIGNvbXBhcmluZyB3aGF0J3MgSU4gRklHTUEgdnMgd2hhdCB3ZSdyZSBJTVBPUlRJTkcpXG4gICAgLy8gU28gXCJjdXJyZW50XCIgaXMgRmlnbWEsIFwibmV3XCIgaXMgdGhlIGltcG9ydGVkIGJhc2VsaW5lXG4gICAgY29uc3QgdmVyc2lvbkJ1bXAgPSBjYWxjdWxhdGVWZXJzaW9uQnVtcChjdXJyZW50VmVyc2lvbiwgY3VycmVudEJhc2VsaW5lLCBiYXNlbGluZURhdGEpO1xuXG4gICAgY29uc29sZS5sb2coJ1tJbXBvcnRQcmV2aWV3XSBDaGFuZ2VzIGRldGVjdGVkOicsIHZlcnNpb25CdW1wLmNoYW5nZXMubGVuZ3RoKTtcbiAgICBjb25zb2xlLmxvZygnW0ltcG9ydFByZXZpZXddIEJyZWFraW5nOicsIHZlcnNpb25CdW1wLmJyZWFraW5nQ291bnQsICdBZGRpdGlvbnM6JywgdmVyc2lvbkJ1bXAuYWRkaXRpb25Db3VudCwgJ1BhdGNoZXM6JywgdmVyc2lvbkJ1bXAucGF0Y2hDb3VudCk7XG5cbiAgICAvLyBTZW5kIHJlc3VsdCB0byBVSVxuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdpbXBvcnQtY2hhbmdlcy1kZXRlY3RlZCcsXG4gICAgICB2ZXJzaW9uQnVtcDoge1xuICAgICAgICAuLi52ZXJzaW9uQnVtcCxcbiAgICAgICAgLy8gT3ZlcnJpZGUgdGhlIHN1Z2dlc3RlZCB2ZXJzaW9uIHRvIHNob3cgdGhlIGltcG9ydGVkIHZlcnNpb25cbiAgICAgICAgY3VycmVudDogY3VycmVudFZlcnNpb24sXG4gICAgICAgIHN1Z2dlc3RlZDogaW1wb3J0ZWRWZXJzaW9uXG4gICAgICB9LFxuICAgICAgYmFzZWxpbmU6IGJhc2VsaW5lXG4gICAgfSk7XG5cbiAgICBpZiAodmVyc2lvbkJ1bXAuY2hhbmdlVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICBmaWdtYS5ub3RpZnkoJ05vIGNoYW5nZXMgZGV0ZWN0ZWQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlnbWEubm90aWZ5KGAke3ZlcnNpb25CdW1wLmNoYW5nZXMubGVuZ3RofSBjaGFuZ2Uocykgd2lsbCBiZSBhcHBsaWVkYCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tJbXBvcnRQcmV2aWV3XSBFcnJvcjonLCBlcnJvcik7XG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ2ltcG9ydC1lcnJvcicsXG4gICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICB9KTtcbiAgICBmaWdtYS5ub3RpZnkoJ0ZhaWxlZCB0byBhbmFseXplIGltcG9ydCcsIHsgZXJyb3I6IHRydWUgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgYW5hbHl6ZS1zdHJ1Y3R1cmUgbWVzc2FnZS5cbiAqXG4gKiBBbmFseXplcyBKU09OIHN0cnVjdHVyZSBhbmQgcmV0dXJucyBsZXZlbCBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAcGFyYW0gZmlsZU5hbWUgLSBOYW1lIG9mIHRoZSBmaWxlXG4gKiBAcGFyYW0ganNvbkRhdGEgLSBQYXJzZWQgSlNPTiBkYXRhXG4gKiBAcGFyYW0gbWV0YWRhdGEgLSBPcHRpb25hbCBtZXRhZGF0YSB0byBwYXNzIHRocm91Z2ggKGUuZy4sIGdyb3VwSWQgZm9yIG11bHRpLWNvbGxlY3Rpb24pXG4gKiBAaW50ZXJuYWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQW5hbHl6ZVN0cnVjdHVyZShmaWxlTmFtZTogc3RyaW5nLCBqc29uRGF0YTogdW5rbm93biwgbWV0YWRhdGE/OiB7IGdyb3VwSWQ6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coJ1tCYWNrZW5kXSBBbmFseXppbmcgc3RydWN0dXJlIGZvcjonLCBmaWxlTmFtZSwgbWV0YWRhdGEgPyBgKGdyb3VwSWQ6ICR7bWV0YWRhdGEuZ3JvdXBJZH0pYCA6ICcnKTtcbiAgICBjb25zdCBzdHJ1Y3R1cmUgPSBhbmFseXplSnNvblN0cnVjdHVyZShqc29uRGF0YSk7XG4gICAgY29uc29sZS5sb2coJ1tCYWNrZW5kXSBTdHJ1Y3R1cmUgYW5hbHl6ZWQ6Jywgc3RydWN0dXJlLmxldmVscy5sZW5ndGgsICdsZXZlbHMnKTtcblxuICAgIC8vIENvbnZlcnQgdG8gTGV2ZWxDb25maWd1cmF0aW9uIGZvcm1hdCBmb3IgVUlcbiAgICBjb25zdCBsZXZlbHM6IExldmVsQ29uZmlndXJhdGlvbltdID0gc3RydWN0dXJlLmxldmVscy5tYXAoKGxldmVsKSA9PiAoe1xuICAgICAgZGVwdGg6IGxldmVsLmRlcHRoLFxuICAgICAgcm9sZTogJ3Rva2VuLXBhdGgnLCAvLyBEZWZhdWx0IHJvbGVcbiAgICAgIGV4YW1wbGVLZXlzOiBsZXZlbC5rZXlzLFxuICAgICAga2V5Q291bnQ6IGxldmVsLmtleUNvdW50XG4gICAgfSkpO1xuXG4gICAgY29uc29sZS5sb2coJ1tCYWNrZW5kXSBTZW5kaW5nIHN0cnVjdHVyZS1hbmFseXplZCBtZXNzYWdlJyk7XG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ3N0cnVjdHVyZS1hbmFseXplZCcsXG4gICAgICBmaWxlTmFtZSxcbiAgICAgIGxldmVscyxcbiAgICAgIG1ldGFkYXRhXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW0JhY2tlbmRdIEVycm9yIGFuYWx5emluZyBzdHJ1Y3R1cmU6JywgZXJyb3IpO1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdpbXBvcnQtZXJyb3InLFxuICAgICAgbWVzc2FnZTogYEZhaWxlZCB0byBhbmFseXplIHN0cnVjdHVyZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YFxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogSGFuZGxlIGdlbmVyYXRlLXByZXZpZXcgbWVzc2FnZS5cbiAqXG4gKiBHZW5lcmF0ZXMgYSBwcmV2aWV3IG9mIHdoYXQgd2lsbCBiZSBjcmVhdGVkIGluIEZpZ21hIGJhc2VkIG9uIGxldmVsIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogQHBhcmFtIGZpbGVOYW1lIC0gTmFtZSBvZiB0aGUgZmlsZVxuICogQHBhcmFtIGpzb25EYXRhIC0gUGFyc2VkIEpTT04gZGF0YVxuICogQHBhcmFtIGxldmVscyAtIExldmVsIGNvbmZpZ3VyYXRpb25cbiAqIEBpbnRlcm5hbFxuICovXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVHZW5lcmF0ZVByZXZpZXcoZmlsZU5hbWU6IHN0cmluZywganNvbkRhdGE6IHVua25vd24sIGxldmVsczogTGV2ZWxDb25maWd1cmF0aW9uW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwcmV2aWV3ID0gZ2VuZXJhdGVQcmV2aWV3KGZpbGVOYW1lLCBqc29uRGF0YSwgbGV2ZWxzKTtcblxuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdwcmV2aWV3LWdlbmVyYXRlZCcsXG4gICAgICBwcmV2aWV3XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2VuZXJhdGluZyBwcmV2aWV3OicsIGVycm9yKTtcbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiAnaW1wb3J0LWVycm9yJyxcbiAgICAgIG1lc3NhZ2U6IGBGYWlsZWQgdG8gZ2VuZXJhdGUgcHJldmlldzogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YFxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogSGFuZGxlIGltcG9ydC13aXRoLW1hbnVhbC1jb25maWcgbWVzc2FnZS5cbiAqXG4gKiBJbXBvcnRzIHRva2VucyB1c2luZyBtYW51YWwgbGV2ZWwgY29uZmlndXJhdGlvbi5cbiAqXG4gKiBAcGFyYW0gY29uZmlnIC0gTWFudWFsIGltcG9ydCBjb25maWd1cmF0aW9uXG4gKiBAaW50ZXJuYWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlSW1wb3J0V2l0aE1hbnVhbENvbmZpZyhjb25maWc6IE1hbnVhbEltcG9ydENvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGZpZ21hLm5vdGlmeSgnSW1wb3J0aW5nIHRva2Vucy4uLicpO1xuXG4gICAgbGV0IHJlc3VsdDtcblxuICAgIGlmIChjb25maWcuc2luZ2xlRmlsZSkge1xuICAgICAgLy8gU2luZ2xlIGZpbGUgaW1wb3J0XG4gICAgICByZXN1bHQgPSBhd2FpdCBpbXBvcnRXaXRoTGV2ZWxNYXBwaW5nKGNvbmZpZyk7XG4gICAgfSBlbHNlIGlmIChjb25maWcubXVsdGlGaWxlKSB7XG4gICAgICAvLyBNdWx0aS1maWxlIGltcG9ydCAtIGNvbnZlcnQgUmVjb3JkcyB0byBNYXBzIGZvciBpbnRlcm5hbCB1c2VcbiAgICAgIGNvbnN0IGZpbGVzRGF0YVJlY29yZCA9IGNvbmZpZy5tdWx0aUZpbGUuZmlsZXNEYXRhIHx8IHt9O1xuICAgICAgY29uc3QgZmlsZXNEYXRhID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oT2JqZWN0LmVudHJpZXMoZmlsZXNEYXRhUmVjb3JkKSk7XG4gICAgICBcbiAgICAgIGNvbnN0IGxldmVsc0J5R3JvdXBSZWNvcmQgPSBjb25maWcubXVsdGlGaWxlLmxldmVsc0J5R3JvdXAgfHwge307XG4gICAgICBjb25zdCBsZXZlbHNCeUdyb3VwID0gbmV3IE1hcDxzdHJpbmcsIExldmVsQ29uZmlndXJhdGlvbltdPihPYmplY3QuZW50cmllcyhsZXZlbHNCeUdyb3VwUmVjb3JkKSk7XG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKCdbQmFja2VuZF0gTXVsdGktZmlsZSBpbXBvcnQgd2l0aCcsIGZpbGVzRGF0YS5zaXplLCAnZmlsZXMnKTtcblxuICAgICAgcmVzdWx0ID0gYXdhaXQgaGFuZGxlTXVsdGlGaWxlSW1wb3J0KFxuICAgICAgICBjb25maWcubXVsdGlGaWxlLmdyb3VwcyxcbiAgICAgICAgbGV2ZWxzQnlHcm91cCxcbiAgICAgICAgZmlsZXNEYXRhXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaW1wb3J0IGNvbmZpZ3VyYXRpb24nKTtcbiAgICB9XG5cbiAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgICAgdHlwZTogJ2ltcG9ydC1jb21wbGV0ZScsXG4gICAgICAgIG1lc3NhZ2U6IGBJbXBvcnRlZCAke3Jlc3VsdC5jb2xsZWN0aW9uc0NyZWF0ZWR9IGNvbGxlY3Rpb24ocyksICR7cmVzdWx0Lm1vZGVzQ3JlYXRlZH0gbW9kZShzKSwgJHtyZXN1bHQudmFyaWFibGVzQ3JlYXRlZH0gdmFyaWFibGUocylgXG4gICAgICB9KTtcbiAgICAgIGZpZ21hLm5vdGlmeSgnSW1wb3J0IGNvbXBsZXRlIScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwb3N0TWVzc2FnZSh7XG4gICAgICAgIHR5cGU6ICdpbXBvcnQtZXJyb3InLFxuICAgICAgICBtZXNzYWdlOiByZXN1bHQuZXJyb3JzLmpvaW4oJ1xcbicpXG4gICAgICB9KTtcbiAgICAgIGZpZ21hLm5vdGlmeSgnSW1wb3J0IGZhaWxlZCcsIHsgZXJyb3I6IHRydWUgfSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ01hbnVhbCBpbXBvcnQgZXJyb3I6JywgZXJyb3IpO1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdpbXBvcnQtZXJyb3InLFxuICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgfSk7XG4gICAgZmlnbWEubm90aWZ5KCdJbXBvcnQgZmFpbGVkJywgeyBlcnJvcjogdHJ1ZSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEhhbmRsZSBjaGVjay1zeW5jLWNoYW5nZXMgbWVzc2FnZS5cbiAqXG4gKiBDb21wYXJlcyBjdXJyZW50IEZpZ21hIHZhcmlhYmxlcyB3aXRoIHRoZSBzdG9yZWQgYmFzZWxpbmUgdG8gZGV0ZWN0IGNoYW5nZXMuXG4gKiBDYWxjdWxhdGVzIHZlcnNpb24gYnVtcCBiYXNlZCBvbiBzZW1hbnRpYyB2ZXJzaW9uaW5nIHJ1bGVzLlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVDaGVja1N5bmNDaGFuZ2VzKCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKCdbU3luY0NoYW5nZXNdIENoZWNraW5nIGZvciBjaGFuZ2VzLi4uJyk7XG4gICAgZmlnbWEubm90aWZ5KCdDaGVja2luZyBmb3IgY2hhbmdlcy4uLicpO1xuXG4gICAgLy8gMS4gRmluZCB0aGUgcmVnaXN0cnkgbm9kZSB3aXRoIHN0b3JlZCBiYXNlbGluZVxuICAgIGNvbnN0IG5vZGUgPSBhd2FpdCBmaW5kUmVnaXN0cnlOb2RlKCk7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICBwb3N0TWVzc2FnZSh7XG4gICAgICAgIHR5cGU6ICdzeW5jLWVycm9yJyxcbiAgICAgICAgbWVzc2FnZTogJ05vIHByZXZpb3VzIHN5bmMgZm91bmQuIFBsZWFzZSBzeW5jIHRvIG5vZGUgZmlyc3QuJ1xuICAgICAgfSk7XG4gICAgICBmaWdtYS5ub3RpZnkoJ05vIHByZXZpb3VzIHN5bmMgZm91bmQnLCB7IGVycm9yOiB0cnVlIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIDIuIFJlYWQgY2h1bmsgY291bnQgZnJvbSBtZXRhZGF0YVxuICAgIGNvbnN0IGNodW5rQ291bnRTdHIgPSBub2RlLmdldFNoYXJlZFBsdWdpbkRhdGEoUExVR0lOX05BTUVTUEFDRSwgJ2NodW5rQ291bnQnKTtcbiAgICBpZiAoIWNodW5rQ291bnRTdHIpIHtcbiAgICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgICAgdHlwZTogJ3N5bmMtZXJyb3InLFxuICAgICAgICBtZXNzYWdlOiAnTm8gYmFzZWxpbmUgZGF0YSBmb3VuZCBpbiByZWdpc3RyeSBub2RlLidcbiAgICAgIH0pO1xuICAgICAgZmlnbWEubm90aWZ5KCdObyBiYXNlbGluZSBkYXRhIGZvdW5kJywgeyBlcnJvcjogdHJ1ZSB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY2h1bmtDb3VudCA9IHBhcnNlSW50KGNodW5rQ291bnRTdHIsIDEwKTtcblxuICAgIC8vIDMuIExvYWQgYW5kIHJlYXNzZW1ibGUgdGhlIHByZXZpb3VzIGJhc2VsaW5lXG4gICAgY29uc3QgY2h1bmtzID0gbG9hZENodW5rc0Zyb21Ob2RlKG5vZGUsIFBMVUdJTl9OQU1FU1BBQ0UsIGNodW5rQ291bnQpO1xuICAgIGNvbnN0IHByZXZpb3VzQmFzZWxpbmUgPSB1bmNodW5rRGF0YShjaHVua3MpIGFzIGFueTtcbiAgICBjb25zb2xlLmxvZygnW1N5bmNDaGFuZ2VzXSBMb2FkZWQgcHJldmlvdXMgYmFzZWxpbmUgd2l0aCcsIE9iamVjdC5rZXlzKHByZXZpb3VzQmFzZWxpbmU/LmJhc2VsaW5lIHx8IHt9KS5sZW5ndGgsICd0b2tlbnMnKTtcblxuICAgIC8vIDQuIEV4cG9ydCBjdXJyZW50IEZpZ21hIHZhcmlhYmxlcyBhcyBuZXcgYmFzZWxpbmVcbiAgICBjb25zdCBjdXJyZW50QmFzZWxpbmUgPSBhd2FpdCBleHBvcnRCYXNlbGluZShudWxsKTtcbiAgICBjb25zb2xlLmxvZygnW1N5bmNDaGFuZ2VzXSBFeHBvcnRlZCBjdXJyZW50IGJhc2VsaW5lIHdpdGgnLCBPYmplY3Qua2V5cygoY3VycmVudEJhc2VsaW5lIGFzIGFueSk/LmJhc2VsaW5lIHx8IHt9KS5sZW5ndGgsICd0b2tlbnMnKTtcblxuICAgIC8vIDUuIEdldCBjdXJyZW50IHZlcnNpb24gZnJvbSBtZXRhZGF0YVxuICAgIGNvbnN0IGN1cnJlbnRWZXJzaW9uID0gcHJldmlvdXNCYXNlbGluZT8uJG1ldGFkYXRhPy52ZXJzaW9uIHx8ICcxLjAuMCc7XG5cbiAgICAvLyA2LiBDYWxjdWxhdGUgdmVyc2lvbiBidW1wXG4gICAgY29uc3QgdmVyc2lvbkJ1bXAgPSBjYWxjdWxhdGVWZXJzaW9uQnVtcChjdXJyZW50VmVyc2lvbiwgcHJldmlvdXNCYXNlbGluZSwgY3VycmVudEJhc2VsaW5lKTtcbiAgICBjb25zb2xlLmxvZygnW1N5bmNDaGFuZ2VzXSBWZXJzaW9uIGJ1bXA6JywgdmVyc2lvbkJ1bXAuY2hhbmdlVHlwZSwgJ2Zyb20nLCB2ZXJzaW9uQnVtcC5jdXJyZW50LCAndG8nLCB2ZXJzaW9uQnVtcC5zdWdnZXN0ZWQpO1xuICAgIGNvbnNvbGUubG9nKCdbU3luY0NoYW5nZXNdIENoYW5nZXM6JywgdmVyc2lvbkJ1bXAuYnJlYWtpbmdDb3VudCwgJ2JyZWFraW5nLCcsIHZlcnNpb25CdW1wLmFkZGl0aW9uQ291bnQsICdhZGRpdGlvbnMsJywgdmVyc2lvbkJ1bXAucGF0Y2hDb3VudCwgJ3BhdGNoZXMnKTtcblxuICAgIC8vIDcuIFNlbmQgcmVzdWx0IHRvIFVJXG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ3N5bmMtY2hhbmdlcy1kZXRlY3RlZCcsXG4gICAgICB2ZXJzaW9uQnVtcFxuICAgIH0pO1xuXG4gICAgaWYgKHZlcnNpb25CdW1wLmNoYW5nZVR5cGUgPT09ICdub25lJykge1xuICAgICAgZmlnbWEubm90aWZ5KCdObyBjaGFuZ2VzIGRldGVjdGVkJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpZ21hLm5vdGlmeShgJHt2ZXJzaW9uQnVtcC5jaGFuZ2VzLmxlbmd0aH0gY2hhbmdlKHMpIGRldGVjdGVkYCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tTeW5jQ2hhbmdlc10gRXJyb3I6JywgZXJyb3IpO1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdzeW5jLWVycm9yJyxcbiAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxuICAgIH0pO1xuICAgIGZpZ21hLm5vdGlmeSgnRmFpbGVkIHRvIGNoZWNrIGZvciBjaGFuZ2VzJywgeyBlcnJvcjogdHJ1ZSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEhhbmRsZSBzeW5jLXdpdGgtdmVyc2lvbiBtZXNzYWdlLlxuICpcbiAqIFN5bmNzIHRva2VucyB0byBub2RlIHdpdGggYSB1c2VyLXNwZWNpZmllZCB2ZXJzaW9uIG51bWJlci5cbiAqXG4gKiBAcGFyYW0gdmVyc2lvbiAtIFZlcnNpb24gc3RyaW5nIHRvIHVzZSAoZS5nLiwgXCIyLjAuMFwiKVxuICogQHBhcmFtIGNoYW5nZXMgLSBBcnJheSBvZiBjaGFuZ2VzIGJlaW5nIHN5bmNlZFxuICogQGludGVybmFsXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVN5bmNXaXRoVmVyc2lvbih2ZXJzaW9uOiBzdHJpbmcsIGNoYW5nZXM6IFRva2VuQ2hhbmdlW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZygnW1N5bmNXaXRoVmVyc2lvbl0gU3luY2luZyB3aXRoIHZlcnNpb246JywgdmVyc2lvbik7XG4gICAgZmlnbWEubm90aWZ5KCdTeW5jaW5nLi4uJyk7XG5cbiAgICAvLyBFeHBvcnQgY3VycmVudCBiYXNlbGluZVxuICAgIGNvbnN0IGJhc2VsaW5lID0gYXdhaXQgZXhwb3J0QmFzZWxpbmUobnVsbCkgYXMgYW55O1xuXG4gICAgLy8gVXBkYXRlIHZlcnNpb24gaW4gbWV0YWRhdGFcbiAgICBpZiAoIWJhc2VsaW5lLiRtZXRhZGF0YSkge1xuICAgICAgYmFzZWxpbmUuJG1ldGFkYXRhID0ge307XG4gICAgfVxuICAgIGJhc2VsaW5lLiRtZXRhZGF0YS52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICBiYXNlbGluZS4kbWV0YWRhdGEuc3luY2VkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG5cbiAgICAvLyBTeW5jIHRvIG5vZGVcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzeW5jVG9Ob2RlKGJhc2VsaW5lKTtcblxuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6ICdzeW5jLWNvbXBsZXRlJyxcbiAgICAgIG5vZGVJZDogcmVzdWx0Lm5vZGVJZCxcbiAgICAgIHZhcmlhYmxlQ291bnQ6IHJlc3VsdC52YXJpYWJsZUNvdW50XG4gICAgfSk7XG5cbiAgICBmaWdtYS5ub3RpZnkoYFx1MjcxMyBTeW5jZWQgdiR7dmVyc2lvbn0gd2l0aCAke3Jlc3VsdC52YXJpYWJsZUNvdW50fSB2YXJpYWJsZXNgKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdbU3luY1dpdGhWZXJzaW9uXSBFcnJvcjonLCBlcnJvcik7XG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ3N5bmMtZXJyb3InLFxuICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgfSk7XG4gICAgZmlnbWEubm90aWZ5KCdTeW5jIGZhaWxlZCcsIHsgZXJyb3I6IHRydWUgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgY2FuY2VsIG1lc3NhZ2UuXG4gKlxuICogQ2xvc2VzIHRoZSBwbHVnaW4gd2hlbiB1c2VyIGNsaWNrcyBjYW5jZWwgYnV0dG9uLlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVDYW5jZWwoKTogdm9pZCB7XG4gIGZpZ21hLmNsb3NlUGx1Z2luKCk7XG59XG4iLCAiLyoqXG4gKiBTdHJ1Y3R1cmUgQW5hbHl6ZXIgVXRpbGl0eVxuICpcbiAqIEFuYWx5emVzIEpTT04gc3RydWN0dXJlIGFuZCBleHRyYWN0cyBsZXZlbHMgd2l0aCBrZXlzLlxuICogTk8gYXV0by1kZXRlY3Rpb24gb2Ygcm9sZXMgLSBqdXN0IGV4dHJhY3RzIHN0cnVjdHVyYWwgaW5mb3JtYXRpb24uXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMZXZlbENvbmZpZ3VyYXRpb24gfSBmcm9tICcuLi8uLi90eXBlcy9sZXZlbC1jb25maWcudHlwZXMuanMnO1xuXG4vKipcbiAqIFJlc3VsdCBvZiBhbmFseXppbmcgSlNPTiBzdHJ1Y3R1cmVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBbmFseXplZFN0cnVjdHVyZSB7XG4gIC8qKlxuICAgKiBBcnJheSBvZiBkZXRlY3RlZCBsZXZlbHMgaW4gdGhlIEpTT04gaGllcmFyY2h5XG4gICAqL1xuICBsZXZlbHM6IEFuYWx5emVkTGV2ZWxbXTtcblxuICAvKipcbiAgICogTWF4aW11bSBkZXB0aCBmb3VuZCBpbiB0aGUgc3RydWN0dXJlXG4gICAqL1xuICBtYXhEZXB0aDogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBzdHJ1Y3R1cmUgY29udGFpbnMgdG9rZW4gdmFsdWVzXG4gICAqL1xuICBoYXNUb2tlblZhbHVlczogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCBhIHNpbmdsZSBsZXZlbCBpbiB0aGUgaGllcmFyY2h5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRMZXZlbCB7XG4gIC8qKlxuICAgKiBMZXZlbCBkZXB0aCAoMS1iYXNlZCBpbmRleClcbiAgICovXG4gIGRlcHRoOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEFsbCB1bmlxdWUga2V5cyBmb3VuZCBhdCB0aGlzIGxldmVsXG4gICAqL1xuICBrZXlzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogU2FtcGxlIHZhbHVlcyBmcm9tIHRoaXMgbGV2ZWwgKHVwIHRvIDMpXG4gICAqL1xuICBzYW1wbGVWYWx1ZXM6IFNhbXBsZVZhbHVlW107XG5cbiAgLyoqXG4gICAqIFRvdGFsIG51bWJlciBvZiB1bmlxdWUga2V5cyBhdCB0aGlzIGxldmVsXG4gICAqL1xuICBrZXlDb3VudDogbnVtYmVyO1xufVxuXG4vKipcbiAqIFNhbXBsZSB2YWx1ZSB3aXRoIGNvbnRleHRcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTYW1wbGVWYWx1ZSB7XG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoaXMgdmFsdWUgKGRvdC1zZXBhcmF0ZWQpXG4gICAqL1xuICBwYXRoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSB2YWx1ZSBpdHNlbGYgKHByaW1pdGl2ZSBvciBvYmplY3QgcHJldmlldylcbiAgICovXG4gIHZhbHVlOiB1bmtub3duO1xuXG4gIC8qKlxuICAgKiBUeXBlIG9mIHZhbHVlXG4gICAqL1xuICB0eXBlOiAnc3RyaW5nJyB8ICdudW1iZXInIHwgJ2Jvb2xlYW4nIHwgJ29iamVjdCcgfCAnYXJyYXknO1xufVxuXG4vKipcbiAqIEFuYWx5emUgSlNPTiBzdHJ1Y3R1cmUgYW5kIGV4dHJhY3QgbGV2ZWxzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gdHJhdmVyc2VzIHRoZSBKU09OIHN0cnVjdHVyZSBhbmQgZXh0cmFjdHMgaW5mb3JtYXRpb24gYWJvdXRcbiAqIGVhY2ggbGV2ZWwgb2YgbmVzdGluZywgaW5jbHVkaW5nOlxuICogLSBLZXlzIGZvdW5kIGF0IGVhY2ggbGV2ZWxcbiAqIC0gU2FtcGxlIHZhbHVlc1xuICogLSBUb3RhbCBkZXB0aFxuICpcbiAqIEl0IGRvZXMgTk9UIGF0dGVtcHQgdG8gZGV0ZWN0IHJvbGVzIChDb2xsZWN0aW9uL01vZGUvVG9rZW4gUGF0aCkuXG4gKiBUaGF0IGlzIHRoZSByZXNwb25zaWJpbGl0eSBvZiB0aGUgVUkgY29tcG9uZW50IGluIFRhc2sgR3JvdXAgMy5cbiAqXG4gKiBAcGFyYW0gZGF0YSAtIFBhcnNlZCBKU09OIGRhdGEgdG8gYW5hbHl6ZVxuICogQHJldHVybnMgQW5hbHl6ZWQgc3RydWN0dXJlIHdpdGggbGV2ZWwgaW5mb3JtYXRpb25cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGNvbnN0IHN0cnVjdHVyZSA9IGFuYWx5emVKc29uU3RydWN0dXJlKHtcbiAqICAgdGhlbWU6IHtcbiAqICAgICBsaWdodDoge1xuICogICAgICAgY29sb3JzOiB7XG4gKiAgICAgICAgIHByaW1hcnk6IFwiI0ZGMDAwMFwiXG4gKiAgICAgICB9XG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqIC8vIFJldHVybnMgNCBsZXZlbHM6IFt0aGVtZV0sIFtsaWdodF0sIFtjb2xvcnNdLCBbcHJpbWFyeV1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUpzb25TdHJ1Y3R1cmUoZGF0YTogdW5rbm93bik6IEFuYWx5emVkU3RydWN0dXJlIHtcbiAgaWYgKCFkYXRhIHx8IHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0Jykge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBKU09OIGRhdGE6IGV4cGVjdGVkIG9iamVjdCcpO1xuICB9XG5cbiAgY29uc3QgbGV2ZWxNYXAgPSBuZXcgTWFwPG51bWJlciwgU2V0PHN0cmluZz4+KCk7XG4gIGNvbnN0IHNhbXBsZU1hcCA9IG5ldyBNYXA8bnVtYmVyLCBTYW1wbGVWYWx1ZVtdPigpO1xuICBsZXQgbWF4RGVwdGggPSAwO1xuICBsZXQgaGFzVG9rZW5WYWx1ZXMgPSBmYWxzZTtcblxuICAvKipcbiAgICogUmVjdXJzaXZlbHkgdHJhdmVyc2Ugc3RydWN0dXJlXG4gICAqL1xuICBmdW5jdGlvbiB0cmF2ZXJzZShvYmo6IGFueSwgZGVwdGg6IG51bWJlciwgcGF0aDogc3RyaW5nW10gPSBbXSk6IHZvaWQge1xuICAgIGlmIChkZXB0aCA+IG1heERlcHRoKSB7XG4gICAgICBtYXhEZXB0aCA9IGRlcHRoO1xuICAgIH1cblxuICAgIC8vIEluaXRpYWxpemUgbGV2ZWwgc2V0cyBpZiBub3QgZXhpc3RzXG4gICAgaWYgKCFsZXZlbE1hcC5oYXMoZGVwdGgpKSB7XG4gICAgICBsZXZlbE1hcC5zZXQoZGVwdGgsIG5ldyBTZXQoKSk7XG4gICAgICBzYW1wbGVNYXAuc2V0KGRlcHRoLCBbXSk7XG4gICAgfVxuXG4gICAgY29uc3Qga2V5cyA9IGxldmVsTWFwLmdldChkZXB0aCkhO1xuICAgIGNvbnN0IHNhbXBsZXMgPSBzYW1wbGVNYXAuZ2V0KGRlcHRoKSE7XG5cbiAgICAvLyBQcm9jZXNzIGVhY2gga2V5IGF0IHRoaXMgbGV2ZWxcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvYmopKSB7XG4gICAgICBrZXlzLmFkZChrZXkpO1xuICAgICAgY29uc3QgY3VycmVudFBhdGggPSBbLi4ucGF0aCwga2V5XTtcblxuICAgICAgLy8gQWRkIHNhbXBsZSBpZiB3ZSBoYXZlIGxlc3MgdGhhbiAzXG4gICAgICBpZiAoc2FtcGxlcy5sZW5ndGggPCAzKSB7XG4gICAgICAgIHNhbXBsZXMucHVzaCh7XG4gICAgICAgICAgcGF0aDogY3VycmVudFBhdGguam9pbignLicpLFxuICAgICAgICAgIHZhbHVlOiBnZXRWYWx1ZVByZXZpZXcodmFsdWUpLFxuICAgICAgICAgIHR5cGU6IGdldFZhbHVlVHlwZSh2YWx1ZSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgdG9rZW4gdmFsdWVcbiAgICAgIGlmIChpc1Rva2VuVmFsdWUodmFsdWUpKSB7XG4gICAgICAgIGhhc1Rva2VuVmFsdWVzID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVjdXJzZSBpZiBvYmplY3QgKGJ1dCBub3QgaWYgaXQncyBhIHRva2VuIG9iamVjdCB3aXRoICR2YWx1ZSlcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsICYmICFpc1Rva2VuVmFsdWUodmFsdWUpKSB7XG4gICAgICAgIHRyYXZlcnNlKHZhbHVlLCBkZXB0aCArIDEsIGN1cnJlbnRQYXRoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBTdGFydCB0cmF2ZXJzYWxcbiAgdHJhdmVyc2UoZGF0YSwgMSk7XG5cbiAgLy8gQ29udmVydCB0byBzb3J0ZWQgYXJyYXkgb2YgbGV2ZWxzXG4gIGNvbnN0IGxldmVsczogQW5hbHl6ZWRMZXZlbFtdID0gW107XG4gIGZvciAobGV0IGRlcHRoID0gMTsgZGVwdGggPD0gbWF4RGVwdGg7IGRlcHRoKyspIHtcbiAgICBjb25zdCBrZXlzID0gQXJyYXkuZnJvbShsZXZlbE1hcC5nZXQoZGVwdGgpIHx8IFtdKS5zb3J0KCk7XG4gICAgY29uc3Qgc2FtcGxlcyA9IHNhbXBsZU1hcC5nZXQoZGVwdGgpIHx8IFtdO1xuXG4gICAgbGV2ZWxzLnB1c2goe1xuICAgICAgZGVwdGgsXG4gICAgICBrZXlzLFxuICAgICAgc2FtcGxlVmFsdWVzOiBzYW1wbGVzLFxuICAgICAga2V5Q291bnQ6IGtleXMubGVuZ3RoLFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBsZXZlbHMsXG4gICAgbWF4RGVwdGgsXG4gICAgaGFzVG9rZW5WYWx1ZXMsXG4gIH07XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgdmFsdWUgaXMgYSBEZXNpZ24gVG9rZW5zIGZvcm1hdCB0b2tlbiB2YWx1ZVxuICovXG5mdW5jdGlvbiBpc1Rva2VuVmFsdWUodmFsdWU6IGFueSk6IGJvb2xlYW4ge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuICckdmFsdWUnIGluIHZhbHVlIHx8ICckdHlwZScgaW4gdmFsdWU7XG59XG5cbi8qKlxuICogR2V0IHR5cGUgb2YgdmFsdWVcbiAqL1xuZnVuY3Rpb24gZ2V0VmFsdWVUeXBlKHZhbHVlOiB1bmtub3duKTogU2FtcGxlVmFsdWVbJ3R5cGUnXSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkgcmV0dXJuICdhcnJheSc7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuICdvYmplY3QnO1xuICBjb25zdCB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICBpZiAodHlwZSA9PT0gJ29iamVjdCcpIHJldHVybiAnb2JqZWN0JztcbiAgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSByZXR1cm4gJ3N0cmluZyc7XG4gIGlmICh0eXBlID09PSAnbnVtYmVyJykgcmV0dXJuICdudW1iZXInO1xuICBpZiAodHlwZSA9PT0gJ2Jvb2xlYW4nKSByZXR1cm4gJ2Jvb2xlYW4nO1xuICByZXR1cm4gJ29iamVjdCc7XG59XG5cbi8qKlxuICogR2V0IHByZXZpZXcgb2YgdmFsdWUgZm9yIGRpc3BsYXlcbiAqL1xuZnVuY3Rpb24gZ2V0VmFsdWVQcmV2aWV3KHZhbHVlOiB1bmtub3duKTogdW5rbm93biB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIGBbJHt2YWx1ZS5sZW5ndGh9IGl0ZW1zXWA7XG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgIC8vIENoZWNrIGZvciB0b2tlbiB2YWx1ZVxuICAgIGlmICgnJHZhbHVlJyBpbiB2YWx1ZSkge1xuICAgICAgcmV0dXJuICh2YWx1ZSBhcyBhbnkpLiR2YWx1ZTtcbiAgICB9XG4gICAgLy8gUmV0dXJuIG9iamVjdCBwcmV2aWV3XG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgICByZXR1cm4gYHske2tleXMubGVuZ3RofSBrZXlzfWA7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdmFsdWVzXG4gIHJldHVybiB2YWx1ZTtcbn1cbiIsICIvKipcbiAqIFRva2VuIGV4dHJhY3RvciB1dGlsaXR5XG4gKlxuICogRXh0cmFjdHMgdG9rZW5zIGZyb20gSlNPTiBkYXRhIGJhc2VkIG9uIGxldmVsIGNvbmZpZ3VyYXRpb24uXG4gKiBXYWxrcyB0aGUgSlNPTiB0cmVlIGFjY29yZGluZyB0byBsZXZlbCByb2xlcyBhbmQgYXNzZW1ibGVzIHRva2VuIHBhdGhzLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTGV2ZWxDb25maWd1cmF0aW9uIH0gZnJvbSAnLi4vLi4vdHlwZXMvbGV2ZWwtY29uZmlnLnR5cGVzLmpzJztcblxuLyoqXG4gKiBFeHRyYWN0ZWQgdG9rZW4gd2l0aCBjb2xsZWN0aW9uLCBtb2RlLCBhbmQgcGF0aCBpbmZvcm1hdGlvblxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV4dHJhY3RlZFRva2VuIHtcbiAgY29sbGVjdGlvbjogc3RyaW5nO1xuICBtb2RlOiBzdHJpbmc7XG4gIHBhdGg6IHN0cmluZztcbiAgdmFsdWU6IGFueTtcbiAgdHlwZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEdyb3VwZWQgdG9rZW5zIG9yZ2FuaXplZCBieSBjb2xsZWN0aW9uIGFuZCBtb2RlXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXh0cmFjdGVkVG9rZW5zIHtcbiAgdG9rZW5zOiBFeHRyYWN0ZWRUb2tlbltdO1xuICBjb2xsZWN0aW9uczogTWFwPHN0cmluZywgQ29sbGVjdGlvblRva2Vucz47XG59XG5cbi8qKlxuICogVG9rZW5zIG9yZ2FuaXplZCBieSBjb2xsZWN0aW9uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29sbGVjdGlvblRva2VucyB7XG4gIG5hbWU6IHN0cmluZztcbiAgbW9kZXM6IE1hcDxzdHJpbmcsIE1vZGVUb2tlbnM+O1xufVxuXG4vKipcbiAqIFRva2VucyBvcmdhbml6ZWQgYnkgbW9kZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1vZGVUb2tlbnMge1xuICBuYW1lOiBzdHJpbmc7XG4gIHRva2VuczogTWFwPHN0cmluZywgYW55PjsgLy8gcGF0aCBcdTIxOTIgdmFsdWVcbn1cblxuLyoqXG4gKiBFeHRyYWN0IHRva2VucyBmcm9tIEpTT04gZGF0YSBiYXNlZCBvbiBsZXZlbCBjb25maWd1cmF0aW9uXG4gKlxuICogV2Fsa3MgdGhlIEpTT04gdHJlZSBhY2NvcmRpbmcgdG8gdGhlIGxldmVsIHJvbGVzOlxuICogLSBDb2xsZWN0aW9uIGxldmVsczogQ3JlYXRlIHNlcGFyYXRlIGNvbGxlY3Rpb25zXG4gKiAtIE1vZGUgbGV2ZWxzOiBDcmVhdGUgc2VwYXJhdGUgbW9kZXMgd2l0aGluIGNvbGxlY3Rpb25zXG4gKiAtIFRva2VuIFBhdGggbGV2ZWxzOiBCdWlsZCB0b2tlbiBwYXRoIGhpZXJhcmNoeVxuICpcbiAqIEBwYXJhbSBkYXRhIC0gSlNPTiBkYXRhIHRvIGV4dHJhY3QgZnJvbVxuICogQHBhcmFtIGxldmVscyAtIExldmVsIGNvbmZpZ3VyYXRpb24gZGVmaW5pbmcgcm9sZXNcbiAqIEByZXR1cm5zIEV4dHJhY3RlZCB0b2tlbnMgZ3JvdXBlZCBieSBjb2xsZWN0aW9uIGFuZCBtb2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VG9rZW5zQnlMZXZlbHMoXG4gIGRhdGE6IHVua25vd24sXG4gIGxldmVsczogTGV2ZWxDb25maWd1cmF0aW9uW11cbik6IEV4dHJhY3RlZFRva2VucyB7XG4gIGNvbnN0IHRva2VuczogRXh0cmFjdGVkVG9rZW5bXSA9IFtdO1xuICBjb25zdCBjb2xsZWN0aW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBDb2xsZWN0aW9uVG9rZW5zPigpO1xuXG4gIC8vIFNvcnQgbGV2ZWxzIGJ5IGRlcHRoIHRvIGVuc3VyZSBjb3JyZWN0IHRyYXZlcnNhbCBvcmRlclxuICBjb25zdCBzb3J0ZWRMZXZlbHMgPSBbLi4ubGV2ZWxzXS5zb3J0KChhLCBiKSA9PiBhLmRlcHRoIC0gYi5kZXB0aCk7XG5cbiAgLy8gV2FsayB0aGUgSlNPTiB0cmVlXG4gIHdhbGtUcmVlKGRhdGEsIHNvcnRlZExldmVscywgMSwge30sICh0b2tlbikgPT4ge1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB0b2tlbi5jb2xsZWN0aW9uIHx8ICdUb2tlbnMnO1xuICAgIGNvbnN0IG1vZGUgPSB0b2tlbi5tb2RlIHx8ICdNb2RlIDEnO1xuICAgIGNvbnN0IHBhdGggPSB0b2tlbi5wYXRoIHx8IHRva2VuLm5hbWUgfHwgJ3ZhbHVlJztcblxuICAgIC8vIEFkZCB0byB0b2tlbnMgYXJyYXlcbiAgICB0b2tlbnMucHVzaCh7XG4gICAgICBjb2xsZWN0aW9uLFxuICAgICAgbW9kZSxcbiAgICAgIHBhdGgsXG4gICAgICB2YWx1ZTogdG9rZW4udmFsdWUsXG4gICAgICB0eXBlOiBpbmZlclRva2VuVHlwZSh0b2tlbi52YWx1ZSlcbiAgICB9KTtcblxuICAgIC8vIE9yZ2FuaXplIGJ5IGNvbGxlY3Rpb24gYW5kIG1vZGVcbiAgICBpZiAoIWNvbGxlY3Rpb25zLmhhcyhjb2xsZWN0aW9uKSkge1xuICAgICAgY29sbGVjdGlvbnMuc2V0KGNvbGxlY3Rpb24sIHtcbiAgICAgICAgbmFtZTogY29sbGVjdGlvbixcbiAgICAgICAgbW9kZXM6IG5ldyBNYXAoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgY29sbGVjdGlvbkRhdGEgPSBjb2xsZWN0aW9ucy5nZXQoY29sbGVjdGlvbikhO1xuXG4gICAgaWYgKCFjb2xsZWN0aW9uRGF0YS5tb2Rlcy5oYXMobW9kZSkpIHtcbiAgICAgIGNvbGxlY3Rpb25EYXRhLm1vZGVzLnNldChtb2RlLCB7XG4gICAgICAgIG5hbWU6IG1vZGUsXG4gICAgICAgIHRva2VuczogbmV3IE1hcCgpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBtb2RlRGF0YSA9IGNvbGxlY3Rpb25EYXRhLm1vZGVzLmdldChtb2RlKSE7XG4gICAgbW9kZURhdGEudG9rZW5zLnNldChwYXRoLCB0b2tlbi52YWx1ZSk7XG4gIH0pO1xuXG4gIHJldHVybiB7IHRva2VucywgY29sbGVjdGlvbnMgfTtcbn1cblxuLyoqXG4gKiBDb250ZXh0IGFjY3VtdWxhdGVkIHdoaWxlIHdhbGtpbmcgdGhlIHRyZWVcbiAqL1xuaW50ZXJmYWNlIFdhbGtDb250ZXh0IHtcbiAgY29sbGVjdGlvbj86IHN0cmluZztcbiAgbW9kZT86IHN0cmluZztcbiAgcGF0aD86IHN0cmluZztcbiAgbmFtZT86IHN0cmluZztcbiAgcGF0aFNlZ21lbnRzPzogc3RyaW5nW107XG59XG5cbi8qKlxuICogVG9rZW4gd2l0aCB2YWx1ZVxuICovXG5pbnRlcmZhY2UgVG9rZW5SZXN1bHQgZXh0ZW5kcyBXYWxrQ29udGV4dCB7XG4gIHZhbHVlOiBhbnk7XG59XG5cbi8qKlxuICogV2FsayB0aGUgSlNPTiB0cmVlIGFjY29yZGluZyB0byBsZXZlbCBjb25maWd1cmF0aW9uXG4gKi9cbmZ1bmN0aW9uIHdhbGtUcmVlKFxuICBvYmo6IGFueSxcbiAgbGV2ZWxzOiBMZXZlbENvbmZpZ3VyYXRpb25bXSxcbiAgY3VycmVudERlcHRoOiBudW1iZXIsXG4gIGNvbnRleHQ6IFdhbGtDb250ZXh0LFxuICBvblRva2VuOiAodG9rZW46IFRva2VuUmVzdWx0KSA9PiB2b2lkXG4pOiB2b2lkIHtcbiAgLy8gSGFuZGxlIG51bGwvdW5kZWZpbmVkXG4gIGlmIChvYmogPT09IG51bGwgfHwgb2JqID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBGaW5kIGN1cnJlbnQgbGV2ZWwgY29uZmlndXJhdGlvblxuICBjb25zdCBjdXJyZW50TGV2ZWwgPSBsZXZlbHMuZmluZChsID0+IGwuZGVwdGggPT09IGN1cnJlbnREZXB0aCk7XG5cbiAgLy8gSWYgbm8gbGV2ZWwgY29uZmlnIGZvciB0aGlzIGRlcHRoLCB3ZSBtaWdodCBoYXZlIHJlYWNoZWQgdG9rZW4gdmFsdWVzXG4gIGlmICghY3VycmVudExldmVsKSB7XG4gICAgLy8gSWYgdGhpcyBpcyBhIHRva2VuIHZhbHVlLCBlbWl0IGl0XG4gICAgaWYgKGlzVG9rZW5WYWx1ZShvYmopKSB7XG4gICAgICBvblRva2VuKHtcbiAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgdmFsdWU6IG9ialxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEhhbmRsZSB0b2tlbiB2YWx1ZXMgKGxlYWYgbm9kZXMpIC0gZW1pdCBpbW1lZGlhdGVseVxuICBpZiAoaXNUb2tlblZhbHVlKG9iaikpIHtcbiAgICBvblRva2VuKHtcbiAgICAgIC4uLmNvbnRleHQsXG4gICAgICB2YWx1ZTogb2JqXG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gSGFuZGxlIG9iamVjdHMgLSByZWN1cnNlIGJhc2VkIG9uIGxldmVsIHJvbGVcbiAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvYmopKSB7XG4gICAgICBjb25zdCBuZXdDb250ZXh0ID0geyAuLi5jb250ZXh0IH07XG5cbiAgICAgIHN3aXRjaCAoY3VycmVudExldmVsLnJvbGUpIHtcbiAgICAgICAgY2FzZSAnY29sbGVjdGlvbic6XG4gICAgICAgICAgbmV3Q29udGV4dC5jb2xsZWN0aW9uID0ga2V5O1xuICAgICAgICAgIG5ld0NvbnRleHQucGF0aFNlZ21lbnRzID0gW107XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnbW9kZSc6XG4gICAgICAgICAgbmV3Q29udGV4dC5tb2RlID0ga2V5O1xuICAgICAgICAgIG5ld0NvbnRleHQucGF0aFNlZ21lbnRzID0gY29udGV4dC5wYXRoU2VnbWVudHMgfHwgW107XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAndG9rZW4tcGF0aCc6XG4gICAgICAgICAgY29uc3Qgc2VnbWVudHMgPSBjb250ZXh0LnBhdGhTZWdtZW50cyB8fCBbXTtcbiAgICAgICAgICBuZXdDb250ZXh0LnBhdGhTZWdtZW50cyA9IFsuLi5zZWdtZW50cywga2V5XTtcbiAgICAgICAgICBuZXdDb250ZXh0LnBhdGggPSBuZXdDb250ZXh0LnBhdGhTZWdtZW50cy5qb2luKCcvJyk7XG4gICAgICAgICAgbmV3Q29udGV4dC5uYW1lID0ga2V5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBSZWN1cnNlIHRvIG5leHQgbGV2ZWxcbiAgICAgIHdhbGtUcmVlKHZhbHVlLCBsZXZlbHMsIGN1cnJlbnREZXB0aCArIDEsIG5ld0NvbnRleHQsIG9uVG9rZW4pO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENoZWNrIGlmIHZhbHVlIGlzIGEgdG9rZW4gKGxlYWYgbm9kZSlcbiAqXG4gKiBBIHZhbHVlIGlzIGNvbnNpZGVyZWQgYSB0b2tlbiBpZiBpdCdzOlxuICogLSBBIHByaW1pdGl2ZSAoc3RyaW5nLCBudW1iZXIsIGJvb2xlYW4pXG4gKiAtIEFuIG9iamVjdCB3aXRoICR2YWx1ZSBvciB2YWx1ZSBwcm9wZXJ0eSAoRGVzaWduIFRva2VucyBmb3JtYXQpXG4gKi9cbmZ1bmN0aW9uIGlzVG9rZW5WYWx1ZShvYmo6IGFueSk6IGJvb2xlYW4ge1xuICAvLyBQcmltaXRpdmVzIGFyZSB0b2tlbnNcbiAgaWYgKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBvYmogPT09ICdudW1iZXInIHx8IHR5cGVvZiBvYmogPT09ICdib29sZWFuJykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gT2JqZWN0cyB3aXRoICR2YWx1ZSBvciB2YWx1ZSBhcmUgdG9rZW5zIChEZXNpZ24gVG9rZW5zIGZvcm1hdClcbiAgaWYgKG9iaiAmJiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgcmV0dXJuICckdmFsdWUnIGluIG9iaiB8fCAndmFsdWUnIGluIG9iajtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBJbmZlciB0b2tlbiB0eXBlIGZyb20gdmFsdWVcbiAqXG4gKiBBdHRlbXB0cyB0byBkZXRlcm1pbmUgdGhlIHRva2VuIHR5cGUgYmFzZWQgb24gdGhlIHZhbHVlIGZvcm1hdC5cbiAqIFVzZWQgZm9yIEZpZ21hIHZhcmlhYmxlIHR5cGUgbWFwcGluZy5cbiAqL1xuZnVuY3Rpb24gaW5mZXJUb2tlblR5cGUodmFsdWU6IGFueSk6IHN0cmluZyB7XG4gIC8vIEhhbmRsZSBEZXNpZ24gVG9rZW5zIGZvcm1hdCB3aXRoIGV4cGxpY2l0IHR5cGVcbiAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICBpZiAoJyR0eXBlJyBpbiB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlLiR0eXBlO1xuICAgIH1cbiAgICBpZiAoJ3R5cGUnIGluIHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUudHlwZTtcbiAgICB9XG4gICAgLy8gRXh0cmFjdCB2YWx1ZSBmcm9tIERUQ0cgZm9ybWF0XG4gICAgaWYgKCckdmFsdWUnIGluIHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLiR2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKCd2YWx1ZScgaW4gdmFsdWUpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUudmFsdWU7XG4gICAgfVxuICB9XG5cbiAgLy8gSW5mZXIgZnJvbSB2YWx1ZSBmb3JtYXRcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAvLyBIZXggY29sb3JcbiAgICBpZiAoL14jWzAtOUEtRmEtZl17Nn0oWzAtOUEtRmEtZl17Mn0pPyQvLnRlc3QodmFsdWUpKSB7XG4gICAgICByZXR1cm4gJ2NvbG9yJztcbiAgICB9XG4gICAgLy8gUkdCL1JHQkFcbiAgICBpZiAoL15yZ2JhP1xcKC8udGVzdCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiAnY29sb3InO1xuICAgIH1cbiAgICAvLyBEaW1lbnNpb24gd2l0aCB1bml0c1xuICAgIGlmICgvXlxcZCsoXFwuXFxkKyk/KHB4fHJlbXxlbXxwdCkkLy50ZXN0KHZhbHVlKSkge1xuICAgICAgcmV0dXJuICdkaW1lbnNpb24nO1xuICAgIH1cbiAgICAvLyBEZWZhdWx0IHRvIHN0cmluZ1xuICAgIHJldHVybiAnc3RyaW5nJztcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuICdudW1iZXInO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgcmV0dXJuICdib29sZWFuJztcbiAgfVxuXG4gIHJldHVybiAnc3RyaW5nJztcbn1cbiIsICIvKipcbiAqIFByZXZpZXcgZ2VuZXJhdG9yIHV0aWxpdHlcbiAqXG4gKiBHZW5lcmF0ZXMgYSBwcmV2aWV3IG9mIHRoZSBGaWdtYSBzdHJ1Y3R1cmUgdGhhdCB3aWxsIGJlIGNyZWF0ZWRcbiAqIGZyb20gaW1wb3J0ZWQgdG9rZW5zIHdpdGhvdXQgYWN0dWFsbHkgY3JlYXRpbmcgdmFyaWFibGVzLlxuICpcbiAqIFRoaXMgcHJvdmlkZXMgdXNlcnMgd2l0aCBhIGxpdmUgcHJldmlldyBvZiBjb2xsZWN0aW9ucywgbW9kZXMsIGFuZFxuICogdmFyaWFibGUgY291bnRzIGJlZm9yZSBjb21taXR0aW5nIHRvIHRoZSBpbXBvcnQuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMZXZlbENvbmZpZ3VyYXRpb24gfSBmcm9tICcuLi8uLi90eXBlcy9sZXZlbC1jb25maWcudHlwZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBQcmV2aWV3U3RydWN0dXJlLCBQcmV2aWV3Q29sbGVjdGlvbiwgUHJldmlld01vZGUgfSBmcm9tICcuLi8uLi90eXBlcy9tZXNzYWdlLnR5cGVzLmpzJztcbmltcG9ydCB7IGV4dHJhY3RUb2tlbnNCeUxldmVscyB9IGZyb20gJy4vdG9rZW4tZXh0cmFjdG9yLmpzJztcblxuLyoqXG4gKiBHZW5lcmF0ZSBwcmV2aWV3IHN0cnVjdHVyZSBmcm9tIEpTT04gZGF0YSBhbmQgbGV2ZWwgY29uZmlndXJhdGlvblxuICpcbiAqIFRoaXMgaXMgYSBSRUFELU9OTFkgb3BlcmF0aW9uIHRoYXQgc2ltdWxhdGVzIHdoYXQgd2lsbCBiZSBjcmVhdGVkXG4gKiBpbiBGaWdtYSB3aXRob3V0IGFjdHVhbGx5IGNyZWF0aW5nIGFueSB2YXJpYWJsZXMgb3IgY29sbGVjdGlvbnMuXG4gKlxuICogQHBhcmFtIGZpbGVOYW1lIC0gTmFtZSBvZiB0aGUgZmlsZSBiZWluZyBpbXBvcnRlZCAodXNlZCBmb3IgZGVmYXVsdCBjb2xsZWN0aW9uIG5hbWUpXG4gKiBAcGFyYW0gZGF0YSAtIEpTT04gZGF0YSB0byBwcmV2aWV3XG4gKiBAcGFyYW0gbGV2ZWxzIC0gTGV2ZWwgY29uZmlndXJhdGlvbiBkZWZpbmluZyBjb2xsZWN0aW9uL21vZGUvdG9rZW4tcGF0aCBtYXBwaW5nXG4gKiBAcmV0dXJucyBQcmV2aWV3IHN0cnVjdHVyZSBzaG93aW5nIGNvbGxlY3Rpb25zLCBtb2RlcywgYW5kIHZhcmlhYmxlIHNhbXBsZXNcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGNvbnN0IHByZXZpZXcgPSBnZW5lcmF0ZVByZXZpZXcoJ3NlbWFudGljLmpzb24nLCBqc29uRGF0YSwgW1xuICogICB7IGRlcHRoOiAxLCByb2xlOiAnY29sbGVjdGlvbicsIGV4YW1wbGVLZXlzOiBbJ3NlbWFudGljJ10gfSxcbiAqICAgeyBkZXB0aDogMiwgcm9sZTogJ21vZGUnLCBleGFtcGxlS2V5czogWydsaWdodCcsICdkYXJrJ10gfSxcbiAqICAgeyBkZXB0aDogMywgcm9sZTogJ3Rva2VuLXBhdGgnLCBleGFtcGxlS2V5czogWydiZycsICd0ZXh0J10gfVxuICogXSk7XG4gKlxuICogLy8gUHJldmlldyB3aWxsIHNob3c6XG4gKiAvLyAtIENvbGxlY3Rpb246IFwic2VtYW50aWNcIlxuICogLy8gICAtIE1vZGU6IFwibGlnaHRcIiAoOCB2YXJpYWJsZXMpXG4gKiAvLyAgIC0gTW9kZTogXCJkYXJrXCIgKDggdmFyaWFibGVzKVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVByZXZpZXcoXG4gIGZpbGVOYW1lOiBzdHJpbmcsXG4gIGRhdGE6IHVua25vd24sXG4gIGxldmVsczogTGV2ZWxDb25maWd1cmF0aW9uW11cbik6IFByZXZpZXdTdHJ1Y3R1cmUge1xuICAvLyBEZXRlcm1pbmUgaWYgdXNlciBkZWZpbmVkIGEgY29sbGVjdGlvbiBsZXZlbFxuICBjb25zdCBoYXNDb2xsZWN0aW9uTGV2ZWwgPSBsZXZlbHMuc29tZShsZXZlbCA9PiBsZXZlbC5yb2xlID09PSAnY29sbGVjdGlvbicpO1xuICBjb25zdCBmaWxlTmFtZVdpdGhvdXRFeHQgPSBmaWxlTmFtZS5yZXBsYWNlKC9cXC5qc29uJC9pLCAnJyk7XG5cbiAgLy8gRXh0cmFjdCB0b2tlbnMgdXNpbmcgdGhlIHRva2VuLWV4dHJhY3RvciBmcm9tIEdyb3VwIDZcbiAgY29uc3QgZXh0cmFjdGVkID0gZXh0cmFjdFRva2Vuc0J5TGV2ZWxzKGRhdGEsIGxldmVscyk7XG5cbiAgY29uc3QgY29sbGVjdGlvbnM6IFByZXZpZXdDb2xsZWN0aW9uW10gPSBbXTtcbiAgbGV0IHRvdGFsTW9kZXMgPSAwO1xuICBsZXQgdG90YWxWYXJpYWJsZXMgPSAwO1xuXG4gIC8vIEJ1aWxkIHByZXZpZXcgZnJvbSBleHRyYWN0ZWQgZGF0YVxuICBmb3IgKGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgY29sbGVjdGlvbkRhdGFdIG9mIGV4dHJhY3RlZC5jb2xsZWN0aW9ucykge1xuICAgIGNvbnN0IG1vZGVzOiBQcmV2aWV3TW9kZVtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IFttb2RlTmFtZSwgbW9kZURhdGFdIG9mIGNvbGxlY3Rpb25EYXRhLm1vZGVzKSB7XG4gICAgICBjb25zdCB2YXJpYWJsZUNvdW50ID0gbW9kZURhdGEudG9rZW5zLnNpemU7XG4gICAgICB0b3RhbFZhcmlhYmxlcyArPSB2YXJpYWJsZUNvdW50O1xuXG4gICAgICAvLyBHZXQgc2FtcGxlIHZhcmlhYmxlcyAoZmlyc3QgMy01KVxuICAgICAgY29uc3Qgc2FtcGxlVmFyaWFibGVzID0gQXJyYXkuZnJvbShtb2RlRGF0YS50b2tlbnMua2V5cygpKS5zbGljZSgwLCA1KTtcblxuICAgICAgbW9kZXMucHVzaCh7XG4gICAgICAgIG5hbWU6IG1vZGVOYW1lLFxuICAgICAgICB2YXJpYWJsZUNvdW50LFxuICAgICAgICBzYW1wbGVWYXJpYWJsZXNcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRvdGFsTW9kZXMgKz0gbW9kZXMubGVuZ3RoO1xuXG4gICAgLy8gSWYgbm8gY29sbGVjdGlvbiBsZXZlbCB3YXMgZGVmaW5lZCwgdXNlIGZpbGVuYW1lIGluc3RlYWQgb2YgXCJUb2tlbnNcIiBkZWZhdWx0XG4gICAgY29uc3QgZmluYWxDb2xsZWN0aW9uTmFtZSA9ICFoYXNDb2xsZWN0aW9uTGV2ZWwgJiYgY29sbGVjdGlvbk5hbWUgPT09ICdUb2tlbnMnXG4gICAgICA/IGZpbGVOYW1lV2l0aG91dEV4dFxuICAgICAgOiBjb2xsZWN0aW9uTmFtZTtcblxuICAgIGNvbGxlY3Rpb25zLnB1c2goe1xuICAgICAgbmFtZTogZmluYWxDb2xsZWN0aW9uTmFtZSxcbiAgICAgIG1vZGVzXG4gICAgfSk7XG4gIH1cblxuICAvLyBIYW5kbGUgZWRnZSBjYXNlOiBubyBjb2xsZWN0aW9ucyBmb3VuZCAoZmxhdCBzdHJ1Y3R1cmUgd2l0aCBubyBjb2xsZWN0aW9uIGxldmVsKVxuICBpZiAoY29sbGVjdGlvbnMubGVuZ3RoID09PSAwICYmIGV4dHJhY3RlZC50b2tlbnMubGVuZ3RoID4gMCkge1xuICAgIC8vIEFsbCB0b2tlbnMgZ28gaW50byBvbmUgZGVmYXVsdCBtb2RlXG4gICAgY29uc3Qgc2FtcGxlVmFyaWFibGVzID0gZXh0cmFjdGVkLnRva2Vuc1xuICAgICAgLnNsaWNlKDAsIDUpXG4gICAgICAubWFwKHQgPT4gdC5wYXRoIHx8IHQudmFsdWUpO1xuXG4gICAgY29sbGVjdGlvbnMucHVzaCh7XG4gICAgICBuYW1lOiBmaWxlTmFtZVdpdGhvdXRFeHQsXG4gICAgICBtb2RlczogW3tcbiAgICAgICAgbmFtZTogJ01vZGUgMScsXG4gICAgICAgIHZhcmlhYmxlQ291bnQ6IGV4dHJhY3RlZC50b2tlbnMubGVuZ3RoLFxuICAgICAgICBzYW1wbGVWYXJpYWJsZXNcbiAgICAgIH1dXG4gICAgfSk7XG5cbiAgICB0b3RhbE1vZGVzID0gMTtcbiAgICB0b3RhbFZhcmlhYmxlcyA9IGV4dHJhY3RlZC50b2tlbnMubGVuZ3RoO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBjb2xsZWN0aW9ucyxcbiAgICB0b3RhbENvbGxlY3Rpb25zOiBjb2xsZWN0aW9ucy5sZW5ndGgsXG4gICAgdG90YWxNb2RlcyxcbiAgICB0b3RhbFZhcmlhYmxlc1xuICB9O1xufVxuIiwgIi8qKlxuICogTGV2ZWwtYmFzZWQgaW1wb3J0IGNvbmZpZ3VyYXRpb24gdHlwZXNcbiAqIERlZmluZXMgaG93IEpTT04gc3RydWN0dXJlIGxldmVscyBtYXAgdG8gRmlnbWEgY29uY2VwdHNcbiAqL1xuXG4vKipcbiAqIFR5cGUgb2Ygcm9sZSBhIGxldmVsIGNhbiBwbGF5IGluIHRoZSBpbXBvcnQgc3RydWN0dXJlXG4gKi9cbmV4cG9ydCB0eXBlIExldmVsUm9sZSA9ICdjb2xsZWN0aW9uJyB8ICdtb2RlJyB8ICd0b2tlbi1wYXRoJztcblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIGZvciBhIHNpbmdsZSBsZXZlbCBpbiB0aGUgSlNPTiBzdHJ1Y3R1cmVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMZXZlbENvbmZpZ3VyYXRpb24ge1xuICAvKipcbiAgICogTGV2ZWwgZGVwdGggKDEtYmFzZWQgaW5kZXgpXG4gICAqL1xuICBkZXB0aDogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBSb2xlIHRoaXMgbGV2ZWwgcGxheXMgaW4gdGhlIEZpZ21hIHN0cnVjdHVyZVxuICAgKi9cbiAgcm9sZTogTGV2ZWxSb2xlO1xuXG4gIC8qKlxuICAgKiBFeGFtcGxlIGtleXMgZm91bmQgYXQgdGhpcyBsZXZlbCAobWF4IDUpXG4gICAqL1xuICBleGFtcGxlS2V5cz86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBUb3RhbCBjb3VudCBvZiB1bmlxdWUga2V5cyBhdCB0aGlzIGxldmVsXG4gICAqL1xuICBrZXlDb3VudD86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBGaWxlIGdyb3VwaW5nIGNvbmZpZ3VyYXRpb24gZm9yIG11bHRpLWZpbGUgaW1wb3J0c1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVHcm91cCB7XG4gIC8qKlxuICAgKiBVbmlxdWUgaWRlbnRpZmllciBmb3IgdGhpcyBncm91cFxuICAgKi9cbiAgaWQ6IHN0cmluZztcblxuICAvKipcbiAgICogTmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0aGlzIGdyb3VwIHdpbGwgY3JlYXRlXG4gICAqL1xuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBGaWxlIG5hbWVzIGluY2x1ZGVkIGluIHRoaXMgZ3JvdXBcbiAgICovXG4gIGZpbGVOYW1lczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEhvdyB0byBoYW5kbGUgbXVsdGlwbGUgZmlsZXNcbiAgICogLSAncGVyLWZpbGUnOiBFYWNoIGZpbGUgYmVjb21lcyBhIHNlcGFyYXRlIG1vZGVcbiAgICogLSAnbWVyZ2VkJzogTWVyZ2UgYWxsIGZpbGVzIGludG8gb25lIG1vZGVcbiAgICovXG4gIG1vZGVTdHJhdGVneTogJ3Blci1maWxlJyB8ICdtZXJnZWQnO1xuXG4gIC8qKlxuICAgKiBFeHRyYWN0ZWQgbW9kZSBuYW1lcyBmb3IgZWFjaCBmaWxlICh3aGVuIG1vZGVTdHJhdGVneSBpcyAncGVyLWZpbGUnKVxuICAgKiBNYXBzIGZpbGVOYW1lIC0+IG1vZGVOYW1lIChhcyBSZWNvcmQgZm9yIEpTT04gc2VyaWFsaXphdGlvbilcbiAgICovXG4gIG1vZGVOYW1lcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbi8qKlxuICogQ29tcGxldGUgY29uZmlndXJhdGlvbiBmb3IgYSBjb2xsZWN0aW9uIGltcG9ydFxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbGxlY3Rpb25Db25maWd1cmF0aW9uIHtcbiAgLyoqXG4gICAqIENvbGxlY3Rpb24gbmFtZVxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBMZXZlbCBjb25maWd1cmF0aW9ucyBmb3IgdGhpcyBjb2xsZWN0aW9uXG4gICAqL1xuICBsZXZlbHM6IExldmVsQ29uZmlndXJhdGlvbltdO1xuXG4gIC8qKlxuICAgKiBTb3VyY2UgZmlsZXMgZm9yIHRoaXMgY29sbGVjdGlvblxuICAgKi9cbiAgc291cmNlRmlsZXM6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBNb2RlIHN0cmF0ZWd5IChmb3IgbXVsdGktZmlsZSBpbXBvcnRzKVxuICAgKi9cbiAgbW9kZVN0cmF0ZWd5PzogJ3Blci1maWxlJyB8ICdtZXJnZWQnO1xufVxuXG4vKipcbiAqIFZhbGlkYXRpb24gcmVzdWx0IGZvciBsZXZlbCBjb25maWd1cmF0aW9uc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIExldmVsVmFsaWRhdGlvbiB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBjb25maWd1cmF0aW9uIGlzIHZhbGlkXG4gICAqL1xuICB2YWxpZDogYm9vbGVhbjtcblxuICAvKipcbiAgICogRXJyb3IgbWVzc2FnZSBpZiBpbnZhbGlkXG4gICAqL1xuICBlcnJvcj86IHN0cmluZztcblxuICAvKipcbiAgICogV2FybmluZyBtZXNzYWdlc1xuICAgKi9cbiAgd2FybmluZ3M/OiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSB0aGF0IGxldmVsIGNvbmZpZ3VyYXRpb25zIGFyZSBjb3JyZWN0XG4gKiAtIEF0IGxlYXN0IG9uZSBsZXZlbCBtdXN0IGJlICdjb2xsZWN0aW9uJ1xuICogLSBEZXB0aHMgbXVzdCBiZSBzZXF1ZW50aWFsIHN0YXJ0aW5nIGZyb20gMVxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVMZXZlbENvbmZpZ3VyYXRpb24obGV2ZWxzOiBMZXZlbENvbmZpZ3VyYXRpb25bXSk6IExldmVsVmFsaWRhdGlvbiB7XG4gIGlmIChsZXZlbHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgIGVycm9yOiAnTm8gbGV2ZWwgY29uZmlndXJhdGlvbnMgcHJvdmlkZWQnLFxuICAgIH07XG4gIH1cblxuICAvLyBDaGVjayBmb3IgYXQgbGVhc3Qgb25lIGNvbGxlY3Rpb25cbiAgY29uc3QgaGFzQ29sbGVjdGlvbiA9IGxldmVscy5zb21lKChsZXZlbCkgPT4gbGV2ZWwucm9sZSA9PT0gJ2NvbGxlY3Rpb24nKTtcbiAgaWYgKCFoYXNDb2xsZWN0aW9uKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgIGVycm9yOiAnQXQgbGVhc3Qgb25lIGxldmVsIG11c3QgYmUgbWFwcGVkIGFzIENvbGxlY3Rpb24nLFxuICAgIH07XG4gIH1cblxuICAvLyBDaGVjayBkZXB0aHMgYXJlIHNlcXVlbnRpYWxcbiAgY29uc3QgZGVwdGhzID0gbGV2ZWxzLm1hcCgobGV2ZWwpID0+IGxldmVsLmRlcHRoKS5zb3J0KChhLCBiKSA9PiBhIC0gYik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZGVwdGhzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGRlcHRoc1tpXSAhPT0gaSArIDEpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGBMZXZlbCBkZXB0aHMgbXVzdCBiZSBzZXF1ZW50aWFsIHN0YXJ0aW5nIGZyb20gMS4gRm91bmQgZ2FwIGF0IGRlcHRoICR7aSArIDF9YCxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLy8gV2FybmluZ3NcbiAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGhhc01vZGUgPSBsZXZlbHMuc29tZSgobGV2ZWwpID0+IGxldmVsLnJvbGUgPT09ICdtb2RlJyk7XG4gIGlmICghaGFzTW9kZSkge1xuICAgIHdhcm5pbmdzLnB1c2goJ05vIE1vZGUgbGV2ZWwgZGVmaW5lZCAtIGEgZGVmYXVsdCBtb2RlIHdpbGwgYmUgY3JlYXRlZCcpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB2YWxpZDogdHJ1ZSxcbiAgICB3YXJuaW5nczogd2FybmluZ3MubGVuZ3RoID4gMCA/IHdhcm5pbmdzIDogdW5kZWZpbmVkLFxuICB9O1xufVxuXG4vKipcbiAqIEV4dHJhY3QgbW9kZSBuYW1lIGZyb20gZmlsZW5hbWVcbiAqIFN1cHBvcnRzIHBhdHRlcm5zIGxpa2U6XG4gKiAtIFwic2VtYW50aWMtbGlnaHQuanNvblwiIC0+IFwibGlnaHRcIlxuICogLSBcInRoZW1lLmRhcmsuanNvblwiIC0+IFwiZGFya1wiXG4gKiAtIFwibW9iaWxlX3RoZW1lLmpzb25cIiAtPiBcIm1vYmlsZV90aGVtZVwiXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0TW9kZU5hbWVGcm9tRmlsZW5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIFJlbW92ZSAuanNvbiBleHRlbnNpb25cbiAgY29uc3QgbmFtZVdpdGhvdXRFeHQgPSBmaWxlTmFtZS5yZXBsYWNlKC9cXC5qc29uJC9pLCAnJyk7XG5cbiAgLy8gVHJ5IGh5cGhlbiBzZXBhcmF0b3IgKHNlbWFudGljLWxpZ2h0KVxuICBpZiAobmFtZVdpdGhvdXRFeHQuaW5jbHVkZXMoJy0nKSkge1xuICAgIGNvbnN0IHBhcnRzID0gbmFtZVdpdGhvdXRFeHQuc3BsaXQoJy0nKTtcbiAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgIHJldHVybiBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXTtcbiAgICB9XG4gIH1cblxuICAvLyBUcnkgZG90IHNlcGFyYXRvciAodGhlbWUubGlnaHQpXG4gIGlmIChuYW1lV2l0aG91dEV4dC5pbmNsdWRlcygnLicpKSB7XG4gICAgY29uc3QgcGFydHMgPSBuYW1lV2l0aG91dEV4dC5zcGxpdCgnLicpO1xuICAgIGlmIChwYXJ0cy5sZW5ndGggPj0gMikge1xuICAgICAgcmV0dXJuIHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRyeSB1bmRlcnNjb3JlIHNlcGFyYXRvciAobW9iaWxlX3RoZW1lKVxuICBpZiAobmFtZVdpdGhvdXRFeHQuaW5jbHVkZXMoJ18nKSkge1xuICAgIGNvbnN0IHBhcnRzID0gbmFtZVdpdGhvdXRFeHQuc3BsaXQoJ18nKTtcbiAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgIHJldHVybiBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXTtcbiAgICB9XG4gIH1cblxuICAvLyBGYWxsYmFjazogcmV0dXJuIGZ1bGwgbmFtZSB3aXRob3V0IGV4dGVuc2lvblxuICByZXR1cm4gbmFtZVdpdGhvdXRFeHQ7XG59XG5cbi8qKlxuICogU3VnZ2VzdCBjb2xsZWN0aW9uIG5hbWUgZnJvbSBncm91cGVkIGZpbGUgbmFtZXNcbiAqIEZpbmRzIGNvbW1vbiBwcmVmaXggZnJvbSBmaWxlbmFtZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1Z2dlc3RDb2xsZWN0aW9uTmFtZShmaWxlTmFtZXM6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgaWYgKGZpbGVOYW1lcy5sZW5ndGggPT09IDApIHJldHVybiAnVG9rZW5zJztcbiAgaWYgKGZpbGVOYW1lcy5sZW5ndGggPT09IDEpIHtcbiAgICAvLyBSZW1vdmUgbW9kZSBzdWZmaXggYW5kIGV4dGVuc2lvblxuICAgIHJldHVybiBmaWxlTmFtZXNbMF1cbiAgICAgIC5yZXBsYWNlKC9cXC5qc29uJC9pLCAnJylcbiAgICAgIC5yZXBsYWNlKC9bLS5fXShsaWdodHxkYXJrfG1vYmlsZXxkZXNrdG9wKSQvaSwgJycpO1xuICB9XG5cbiAgLy8gRmluZCBjb21tb24gcHJlZml4XG4gIGNvbnN0IHByZWZpeCA9IGZpbmRDb21tb25QcmVmaXgoZmlsZU5hbWVzLm1hcCgoZikgPT4gZi5yZXBsYWNlKC9cXC5qc29uJC9pLCAnJykpKTtcblxuICByZXR1cm4gcHJlZml4IHx8ICdUb2tlbnMnO1xufVxuXG4vKipcbiAqIEZpbmQgY29tbW9uIHByZWZpeCBhbW9uZyBzdHJpbmdzXG4gKi9cbmZ1bmN0aW9uIGZpbmRDb21tb25QcmVmaXgoc3RyaW5nczogc3RyaW5nW10pOiBzdHJpbmcge1xuICBpZiAoc3RyaW5ncy5sZW5ndGggPT09IDApIHJldHVybiAnJztcblxuICBsZXQgcHJlZml4ID0gc3RyaW5nc1swXTtcblxuICBmb3IgKGxldCBpID0gMTsgaSA8IHN0cmluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICB3aGlsZSAoIXN0cmluZ3NbaV0uc3RhcnRzV2l0aChwcmVmaXgpKSB7XG4gICAgICBwcmVmaXggPSBwcmVmaXguc2xpY2UoMCwgLTEpO1xuICAgICAgaWYgKHByZWZpeCA9PT0gJycpIHJldHVybiAnJztcbiAgICB9XG4gIH1cblxuICAvLyBSZW1vdmUgdHJhaWxpbmcgc2VwYXJhdG9yc1xuICByZXR1cm4gcHJlZml4LnJlcGxhY2UoL1stLl9dKyQvLCAnJyk7XG59XG4iLCAiLyoqXG4gKiBDb2xsZWN0aW9uIGJ1aWxkZXIgbW9kdWxlXG4gKlxuICogQnVpbGRzIEZpZ21hIHZhcmlhYmxlIGNvbGxlY3Rpb25zIGZyb20gZXh0cmFjdGVkIHRva2VuIGRhdGEuXG4gKiBDcmVhdGVzIGNvbGxlY3Rpb25zLCBtb2RlcywgYW5kIHZhcmlhYmxlcyB3aXRoIHByb3BlciB0eXBlIG1hcHBpbmcuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBNb2RlVG9rZW5zIH0gZnJvbSAnLi4vdXRpbHMvdG9rZW4tZXh0cmFjdG9yLmpzJztcblxuLyoqXG4gKiBSZXN1bHQgb2YgYnVpbGRpbmcgYSBjb2xsZWN0aW9uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQnVpbGRSZXN1bHQge1xuICBzdWNjZXNzOiBib29sZWFuO1xuICBjb2xsZWN0aW9uc0NyZWF0ZWQ6IG51bWJlcjtcbiAgbW9kZXNDcmVhdGVkOiBudW1iZXI7XG4gIHZhcmlhYmxlc0NyZWF0ZWQ6IG51bWJlcjtcbiAgZXJyb3JzOiBzdHJpbmdbXTtcbiAgd2FybmluZ3M6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIEJ1aWxkIGEgRmlnbWEgdmFyaWFibGUgY29sbGVjdGlvbiBmcm9tIHRva2VuIGRhdGFcbiAqXG4gKiBDcmVhdGVzIHRoZSBjb2xsZWN0aW9uLCBzZXRzIHVwIG1vZGVzLCBhbmQgY3JlYXRlcyBhbGwgdmFyaWFibGVzIHdpdGggdGhlaXJcbiAqIHZhbHVlcyBmb3IgZWFjaCBtb2RlLiBWYXJpYWJsZXMgYXJlIGNyZWF0ZWQgb25jZSBhbmQgdmFsdWVzIGFyZSBzZXQgZm9yIGFsbCBtb2Rlcy5cbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvbk5hbWUgLSBOYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHRvIGNyZWF0ZVxuICogQHBhcmFtIG1vZGVzIC0gQXJyYXkgb2YgbW9kZSBkYXRhIHdpdGggdG9rZW5zXG4gKiBAcmV0dXJucyBCdWlsZCByZXN1bHQgd2l0aCBjb3VudHMgYW5kIGFueSBlcnJvcnMvd2FybmluZ3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJ1aWxkRmlnbWFDb2xsZWN0aW9uKFxuICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nLFxuICBtb2RlczogTW9kZVRva2Vuc1tdXG4pOiBQcm9taXNlPEJ1aWxkUmVzdWx0PiB7XG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgdHJ5IHtcbiAgICAvLyBDcmVhdGUgdmFyaWFibGUgY29sbGVjdGlvblxuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBmaWdtYS52YXJpYWJsZXMuY3JlYXRlVmFyaWFibGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcblxuICAgIC8vIFNldCB1cCBtb2Rlc1xuICAgIGNvbnN0IG1vZGVJZHM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgbW9kZU5hbWVzID0gbW9kZXMubWFwKG0gPT4gbS5uYW1lKTtcblxuICAgIC8vIEZpcnN0IG1vZGUgaXMgYWxyZWFkeSBjcmVhdGVkIGJ5IEZpZ21hLCByZW5hbWUgaXRcbiAgICBpZiAobW9kZU5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbGxlY3Rpb24ucmVuYW1lTW9kZShjb2xsZWN0aW9uLm1vZGVzWzBdLm1vZGVJZCwgbW9kZU5hbWVzWzBdKTtcbiAgICAgIG1vZGVJZHMucHVzaChjb2xsZWN0aW9uLm1vZGVzWzBdLm1vZGVJZCk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHJlbWFpbmluZyBtb2Rlc1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbW9kZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBtb2RlSWQgPSBjb2xsZWN0aW9uLmFkZE1vZGUobW9kZU5hbWVzW2ldKTtcbiAgICAgIG1vZGVJZHMucHVzaChtb2RlSWQpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSB2YXJpYWJsZXNcbiAgICBsZXQgdmFyaWFibGVzQ3JlYXRlZCA9IDA7XG5cbiAgICAvLyBDb2xsZWN0IGFsbCB1bmlxdWUgdmFyaWFibGUgcGF0aHMgYWNyb3NzIGFsbCBtb2Rlc1xuICAgIGNvbnN0IHZhcmlhYmxlUGF0aHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IG1vZGUgb2YgbW9kZXMpIHtcbiAgICAgIGZvciAoY29uc3QgcGF0aCBvZiBtb2RlLnRva2Vucy5rZXlzKCkpIHtcbiAgICAgICAgdmFyaWFibGVQYXRocy5hZGQocGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGVhY2ggdmFyaWFibGUgd2l0aCB2YWx1ZXMgZm9yIGFsbCBtb2Rlc1xuICAgIGZvciAoY29uc3QgdmFyUGF0aCBvZiB2YXJpYWJsZVBhdGhzKSB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBHZXQgdGhlIGZpcnN0IG5vbi1udWxsIHZhbHVlIHRvIGRldGVybWluZSB0eXBlXG4gICAgICAgIGxldCBmaXJzdFZhbHVlOiBhbnkgPSBudWxsO1xuICAgICAgICBsZXQgZmlyc3RUeXBlOiBzdHJpbmcgPSAnc3RyaW5nJztcblxuICAgICAgICBmb3IgKGNvbnN0IG1vZGUgb2YgbW9kZXMpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IG1vZGUudG9rZW5zLmdldCh2YXJQYXRoKTtcbiAgICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgZmlyc3RWYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgZmlyc3RUeXBlID0gaW5mZXJUb2tlblR5cGUodmFsdWUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpcnN0VmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICB3YXJuaW5ncy5wdXNoKGBTa2lwcGluZyB2YXJpYWJsZSBcIiR7dmFyUGF0aH1cIjogbm8gdmFsdWUgZm91bmQgaW4gYW55IG1vZGVgKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hcCB0byBGaWdtYSB0eXBlXG4gICAgICAgIGNvbnN0IGZpZ21hVHlwZSA9IG1hcFRvRmlnbWFUeXBlKGZpcnN0VHlwZSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHZhcmlhYmxlXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gZmlnbWEudmFyaWFibGVzLmNyZWF0ZVZhcmlhYmxlKFxuICAgICAgICAgIHZhclBhdGgsXG4gICAgICAgICAgY29sbGVjdGlvbixcbiAgICAgICAgICBmaWdtYVR5cGUgYXMgVmFyaWFibGVSZXNvbHZlZERhdGFUeXBlXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gU2V0IHZhbHVlIGZvciBlYWNoIG1vZGVcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IG1vZGUgPSBtb2Rlc1tpXTtcbiAgICAgICAgICBjb25zdCBtb2RlSWQgPSBtb2RlSWRzW2ldO1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gbW9kZS50b2tlbnMuZ2V0KHZhclBhdGgpO1xuXG4gICAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhcnNlZFZhbHVlID0gcGFyc2VWYWx1ZSh2YWx1ZSwgZmlnbWFUeXBlKTtcbiAgICAgICAgICAgICAgdmFyaWFibGUuc2V0VmFsdWVGb3JNb2RlKG1vZGVJZCwgcGFyc2VkVmFsdWUpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgZXJyb3JzLnB1c2goXG4gICAgICAgICAgICAgICAgYEZhaWxlZCB0byBzZXQgdmFsdWUgZm9yIFwiJHt2YXJQYXRofVwiIGluIG1vZGUgXCIke21vZGUubmFtZX1cIjogJHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCB2YWx1ZSBiYXNlZCBvbiB0eXBlXG4gICAgICAgICAgICBjb25zdCBkZWZhdWx0VmFsdWUgPSBnZXREZWZhdWx0VmFsdWUoZmlnbWFUeXBlKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHZhcmlhYmxlLnNldFZhbHVlRm9yTW9kZShtb2RlSWQsIGRlZmF1bHRWYWx1ZSk7XG4gICAgICAgICAgICAgIHdhcm5pbmdzLnB1c2goYFZhcmlhYmxlIFwiJHt2YXJQYXRofVwiIGhhcyBubyB2YWx1ZSBpbiBtb2RlIFwiJHttb2RlLm5hbWV9XCIsIHVzaW5nIGRlZmF1bHRgKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgIGVycm9ycy5wdXNoKFxuICAgICAgICAgICAgICAgIGBGYWlsZWQgdG8gc2V0IGRlZmF1bHQgdmFsdWUgZm9yIFwiJHt2YXJQYXRofVwiIGluIG1vZGUgXCIke21vZGUubmFtZX1cIjogJHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhcmlhYmxlc0NyZWF0ZWQrKztcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKGBGYWlsZWQgdG8gY3JlYXRlIHZhcmlhYmxlIFwiJHt2YXJQYXRofVwiOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICAgIGNvbGxlY3Rpb25zQ3JlYXRlZDogMSxcbiAgICAgIG1vZGVzQ3JlYXRlZDogbW9kZUlkcy5sZW5ndGgsXG4gICAgICB2YXJpYWJsZXNDcmVhdGVkLFxuICAgICAgZXJyb3JzLFxuICAgICAgd2FybmluZ3NcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGNvbGxlY3Rpb25zQ3JlYXRlZDogMCxcbiAgICAgIG1vZGVzQ3JlYXRlZDogMCxcbiAgICAgIHZhcmlhYmxlc0NyZWF0ZWQ6IDAsXG4gICAgICBlcnJvcnM6IFtgRmFpbGVkIHRvIGNyZWF0ZSBjb2xsZWN0aW9uIFwiJHtjb2xsZWN0aW9uTmFtZX1cIjogJHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YF0sXG4gICAgICB3YXJuaW5nc1xuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBJbmZlciB0b2tlbiB0eXBlIGZyb20gdmFsdWVcbiAqL1xuZnVuY3Rpb24gaW5mZXJUb2tlblR5cGUodmFsdWU6IGFueSk6IHN0cmluZyB7XG4gIC8vIEhhbmRsZSBEZXNpZ24gVG9rZW5zIGZvcm1hdCB3aXRoIGV4cGxpY2l0IHR5cGVcbiAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICBpZiAoJyR0eXBlJyBpbiB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlLiR0eXBlO1xuICAgIH1cbiAgICBpZiAoJ3R5cGUnIGluIHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUudHlwZTtcbiAgICB9XG4gICAgLy8gRXh0cmFjdCB2YWx1ZSBmcm9tIERUQ0cgZm9ybWF0XG4gICAgaWYgKCckdmFsdWUnIGluIHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLiR2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKCd2YWx1ZScgaW4gdmFsdWUpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUudmFsdWU7XG4gICAgfVxuICB9XG5cbiAgLy8gSW5mZXIgZnJvbSB2YWx1ZSBmb3JtYXRcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAvLyBIZXggY29sb3JcbiAgICBpZiAoL14jWzAtOUEtRmEtZl17Nn0oWzAtOUEtRmEtZl17Mn0pPyQvLnRlc3QodmFsdWUpKSB7XG4gICAgICByZXR1cm4gJ2NvbG9yJztcbiAgICB9XG4gICAgLy8gUkdCL1JHQkFcbiAgICBpZiAoL15yZ2JhP1xcKC8udGVzdCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiAnY29sb3InO1xuICAgIH1cbiAgICAvLyBEaW1lbnNpb24gd2l0aCB1bml0c1xuICAgIGlmICgvXlxcZCsoXFwuXFxkKyk/KHB4fHJlbXxlbXxwdCkkLy50ZXN0KHZhbHVlKSkge1xuICAgICAgcmV0dXJuICdkaW1lbnNpb24nO1xuICAgIH1cbiAgICByZXR1cm4gJ3N0cmluZyc7XG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHJldHVybiAnbnVtYmVyJztcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgIHJldHVybiAnYm9vbGVhbic7XG4gIH1cblxuICByZXR1cm4gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogTWFwIHRva2VuIHR5cGUgdG8gRmlnbWEgdmFyaWFibGUgdHlwZVxuICovXG5mdW5jdGlvbiBtYXBUb0ZpZ21hVHlwZSh0b2tlblR5cGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHR5cGVNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgJ2NvbG9yJzogJ0NPTE9SJyxcbiAgICAnbnVtYmVyJzogJ0ZMT0FUJyxcbiAgICAnZGltZW5zaW9uJzogJ0ZMT0FUJyxcbiAgICAnc3BhY2luZyc6ICdGTE9BVCcsXG4gICAgJ2ZvbnRTaXplJzogJ0ZMT0FUJyxcbiAgICAnZm9udEZhbWlseSc6ICdTVFJJTkcnLFxuICAgICdmb250V2VpZ2h0JzogJ1NUUklORycsXG4gICAgJ3N0cmluZyc6ICdTVFJJTkcnLFxuICAgICdib29sZWFuJzogJ0JPT0xFQU4nXG4gIH07XG5cbiAgcmV0dXJuIHR5cGVNYXBbdG9rZW5UeXBlXSB8fCAnU1RSSU5HJztcbn1cblxuLyoqXG4gKiBQYXJzZSB2YWx1ZSBzdHJpbmcgdG8gYXBwcm9wcmlhdGUgRmlnbWEgdHlwZVxuICovXG5mdW5jdGlvbiBwYXJzZVZhbHVlKHZhbHVlOiBhbnksIGZpZ21hVHlwZTogc3RyaW5nKTogYW55IHtcbiAgLy8gRXh0cmFjdCB2YWx1ZSBmcm9tIERlc2lnbiBUb2tlbnMgZm9ybWF0IGlmIG5lZWRlZFxuICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgIGlmICgnJHZhbHVlJyBpbiB2YWx1ZSkge1xuICAgICAgdmFsdWUgPSB2YWx1ZS4kdmFsdWU7XG4gICAgfSBlbHNlIGlmICgndmFsdWUnIGluIHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIGlmIChmaWdtYVR5cGUgPT09ICdDT0xPUicpIHtcbiAgICByZXR1cm4gcGFyc2VDb2xvcih2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoZmlnbWFUeXBlID09PSAnRkxPQVQnKSB7XG4gICAgcmV0dXJuIHBhcnNlTnVtYmVyKHZhbHVlKTtcbiAgfSBlbHNlIGlmIChmaWdtYVR5cGUgPT09ICdCT09MRUFOJykge1xuICAgIHJldHVybiBCb29sZWFuKHZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gU3RyaW5nKHZhbHVlKTtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlIGNvbG9yIHZhbHVlIHRvIFJHQkFcbiAqL1xuZnVuY3Rpb24gcGFyc2VDb2xvcihjb2xvclZhbHVlOiBhbnkpOiB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlciB9IHtcbiAgY29uc3QgY29sb3JTdHJpbmcgPSBTdHJpbmcoY29sb3JWYWx1ZSk7XG5cbiAgLy8gSGFuZGxlIGhleCBjb2xvcnNcbiAgaWYgKGNvbG9yU3RyaW5nLnN0YXJ0c1dpdGgoJyMnKSkge1xuICAgIGNvbnN0IGhleCA9IGNvbG9yU3RyaW5nLnNsaWNlKDEpO1xuICAgIGNvbnN0IHIgPSBwYXJzZUludChoZXguc2xpY2UoMCwgMiksIDE2KSAvIDI1NTtcbiAgICBjb25zdCBnID0gcGFyc2VJbnQoaGV4LnNsaWNlKDIsIDQpLCAxNikgLyAyNTU7XG4gICAgY29uc3QgYiA9IHBhcnNlSW50KGhleC5zbGljZSg0LCA2KSwgMTYpIC8gMjU1O1xuICAgIGNvbnN0IGEgPSBoZXgubGVuZ3RoID09PSA4ID8gcGFyc2VJbnQoaGV4LnNsaWNlKDYsIDgpLCAxNikgLyAyNTUgOiAxO1xuICAgIHJldHVybiB7IHIsIGcsIGIsIGEgfTtcbiAgfVxuXG4gIC8vIEhhbmRsZSByZ2IvcmdiYVxuICBjb25zdCByZ2JNYXRjaCA9IGNvbG9yU3RyaW5nLm1hdGNoKC9yZ2JhP1xcKChcXGQrKSxcXHMqKFxcZCspLFxccyooXFxkKykoPzosXFxzKihbXFxkLl0rKSk/XFwpLyk7XG4gIGlmIChyZ2JNYXRjaCkge1xuICAgIGNvbnN0IHIgPSBwYXJzZUludChyZ2JNYXRjaFsxXSkgLyAyNTU7XG4gICAgY29uc3QgZyA9IHBhcnNlSW50KHJnYk1hdGNoWzJdKSAvIDI1NTtcbiAgICBjb25zdCBiID0gcGFyc2VJbnQocmdiTWF0Y2hbM10pIC8gMjU1O1xuICAgIGNvbnN0IGEgPSByZ2JNYXRjaFs0XSA/IHBhcnNlRmxvYXQocmdiTWF0Y2hbNF0pIDogMTtcbiAgICByZXR1cm4geyByLCBnLCBiLCBhIH07XG4gIH1cblxuICAvLyBEZWZhdWx0IGZhbGxiYWNrXG4gIHJldHVybiB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfTtcbn1cblxuLyoqXG4gKiBQYXJzZSBudW1iZXIgdmFsdWUgZnJvbSBzdHJpbmcgb3IgbnVtYmVyXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnVtYmVyKHZhbHVlOiBhbnkpOiBudW1iZXIge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIGNvbnN0IHN0ciA9IFN0cmluZyh2YWx1ZSk7XG5cbiAgLy8gUmVtb3ZlIHVuaXRzIChweCwgcmVtLCBlbSwgcHQpXG4gIGNvbnN0IG51bVN0ciA9IHN0ci5yZXBsYWNlKC8ocHh8cmVtfGVtfHB0KSQvLCAnJyk7XG4gIGNvbnN0IG51bSA9IHBhcnNlRmxvYXQobnVtU3RyKTtcblxuICByZXR1cm4gaXNOYU4obnVtKSA/IDAgOiBudW07XG59XG5cbi8qKlxuICogR2V0IGRlZmF1bHQgdmFsdWUgZm9yIGEgRmlnbWEgdHlwZVxuICovXG5mdW5jdGlvbiBnZXREZWZhdWx0VmFsdWUoZmlnbWFUeXBlOiBzdHJpbmcpOiBhbnkge1xuICBzd2l0Y2ggKGZpZ21hVHlwZSkge1xuICAgIGNhc2UgJ0NPTE9SJzpcbiAgICAgIHJldHVybiB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfTtcbiAgICBjYXNlICdGTE9BVCc6XG4gICAgICByZXR1cm4gMDtcbiAgICBjYXNlICdCT09MRUFOJzpcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjYXNlICdTVFJJTkcnOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gJyc7XG4gIH1cbn1cbiIsICIvKipcbiAqIExldmVsLWJhc2VkIGltcG9ydGVyIG1vZHVsZVxuICpcbiAqIEltcG9ydHMgdG9rZW5zIHVzaW5nIG1hbnVhbCBsZXZlbCBjb25maWd1cmF0aW9uIChubyBhdXRvLWRldGVjdGlvbikuXG4gKiBNYXBzIEpTT04gbGV2ZWxzIHRvIEZpZ21hIHN0cnVjdHVyZSBiYXNlZCBvbiB1c2VyLWRlZmluZWQgbGV2ZWwgcm9sZXMuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBNYW51YWxJbXBvcnRDb25maWcgfSBmcm9tICcuLi8uLi90eXBlcy9tZXNzYWdlLnR5cGVzLmpzJztcbmltcG9ydCB0eXBlIHsgTGV2ZWxDb25maWd1cmF0aW9uIH0gZnJvbSAnLi4vLi4vdHlwZXMvbGV2ZWwtY29uZmlnLnR5cGVzLmpzJztcbmltcG9ydCB7IHZhbGlkYXRlTGV2ZWxDb25maWd1cmF0aW9uIH0gZnJvbSAnLi4vLi4vdHlwZXMvbGV2ZWwtY29uZmlnLnR5cGVzLmpzJztcbmltcG9ydCB7IGV4dHJhY3RUb2tlbnNCeUxldmVscyB9IGZyb20gJy4uL3V0aWxzL3Rva2VuLWV4dHJhY3Rvci5qcyc7XG5pbXBvcnQgeyBidWlsZEZpZ21hQ29sbGVjdGlvbiB9IGZyb20gJy4vY29sbGVjdGlvbi1idWlsZGVyLmpzJztcblxuLyoqXG4gKiBJbXBvcnQgcmVzdWx0XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0UmVzdWx0IHtcbiAgc3VjY2VzczogYm9vbGVhbjtcbiAgY29sbGVjdGlvbnNDcmVhdGVkOiBudW1iZXI7XG4gIG1vZGVzQ3JlYXRlZDogbnVtYmVyO1xuICB2YXJpYWJsZXNDcmVhdGVkOiBudW1iZXI7XG4gIGVycm9yczogc3RyaW5nW107XG4gIHdhcm5pbmdzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBJbXBvcnQgdG9rZW5zIHdpdGggbWFudWFsIGxldmVsIGNvbmZpZ3VyYXRpb25cbiAqXG4gKiBNYWluIGVudHJ5IHBvaW50IGZvciBmbGV4aWJsZSBpbXBvcnQuIEhhbmRsZXMgYm90aCBzaW5nbGUtZmlsZSBhbmQgbXVsdGktZmlsZSBpbXBvcnRzLlxuICogQ3JlYXRlcyBGaWdtYSBjb2xsZWN0aW9ucywgbW9kZXMsIGFuZCB2YXJpYWJsZXMgYmFzZWQgb24gbGV2ZWwgbWFwcGluZy5cbiAqXG4gKiBAcGFyYW0gY29uZmlnIC0gTWFudWFsIGltcG9ydCBjb25maWd1cmF0aW9uIHdpdGggbGV2ZWwgbWFwcGluZ1xuICogQHJldHVybnMgSW1wb3J0IHJlc3VsdCB3aXRoIGNvdW50cyBhbmQgYW55IGVycm9ycy93YXJuaW5nc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW1wb3J0V2l0aExldmVsTWFwcGluZyhcbiAgY29uZmlnOiBNYW51YWxJbXBvcnRDb25maWdcbik6IFByb21pc2U8SW1wb3J0UmVzdWx0PiB7XG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gIGxldCB0b3RhbENvbGxlY3Rpb25zID0gMDtcbiAgbGV0IHRvdGFsTW9kZXMgPSAwO1xuICBsZXQgdG90YWxWYXJpYWJsZXMgPSAwO1xuXG4gIHRyeSB7XG4gICAgLy8gSGFuZGxlIHNpbmdsZS1maWxlIGltcG9ydFxuICAgIGlmIChjb25maWcuc2luZ2xlRmlsZSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaW1wb3J0U2luZ2xlRmlsZShcbiAgICAgICAgY29uZmlnLnNpbmdsZUZpbGUuZGF0YSxcbiAgICAgICAgY29uZmlnLnNpbmdsZUZpbGUubGV2ZWxzLFxuICAgICAgICBjb25maWcuc2luZ2xlRmlsZS5maWxlTmFtZVxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgbXVsdGktZmlsZSBpbXBvcnRcbiAgICBpZiAoY29uZmlnLm11bHRpRmlsZSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaW1wb3J0TXVsdGlGaWxlKGNvbmZpZy5tdWx0aUZpbGUpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBjb2xsZWN0aW9uc0NyZWF0ZWQ6IDAsXG4gICAgICBtb2Rlc0NyZWF0ZWQ6IDAsXG4gICAgICB2YXJpYWJsZXNDcmVhdGVkOiAwLFxuICAgICAgZXJyb3JzOiBbJ05vIGltcG9ydCBjb25maWd1cmF0aW9uIHByb3ZpZGVkJ10sXG4gICAgICB3YXJuaW5nczogW11cbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGNvbGxlY3Rpb25zQ3JlYXRlZDogMCxcbiAgICAgIG1vZGVzQ3JlYXRlZDogMCxcbiAgICAgIHZhcmlhYmxlc0NyZWF0ZWQ6IDAsXG4gICAgICBlcnJvcnM6IFtgSW1wb3J0IGZhaWxlZDogJHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YF0sXG4gICAgICB3YXJuaW5nc1xuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBJbXBvcnQgZnJvbSBhIHNpbmdsZSBKU09OIGZpbGVcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaW1wb3J0U2luZ2xlRmlsZShcbiAgZGF0YTogdW5rbm93bixcbiAgbGV2ZWxzOiBMZXZlbENvbmZpZ3VyYXRpb25bXSxcbiAgZmlsZU5hbWU6IHN0cmluZ1xuKTogUHJvbWlzZTxJbXBvcnRSZXN1bHQ+IHtcbiAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXTtcblxuICAvLyBWYWxpZGF0ZSBsZXZlbCBjb25maWd1cmF0aW9uXG4gIGNvbnN0IHZhbGlkYXRpb24gPSB2YWxpZGF0ZUxldmVsQ29uZmlndXJhdGlvbihsZXZlbHMpO1xuICBpZiAoIXZhbGlkYXRpb24udmFsaWQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBjb2xsZWN0aW9uc0NyZWF0ZWQ6IDAsXG4gICAgICBtb2Rlc0NyZWF0ZWQ6IDAsXG4gICAgICB2YXJpYWJsZXNDcmVhdGVkOiAwLFxuICAgICAgZXJyb3JzOiBbdmFsaWRhdGlvbi5lcnJvciB8fCAnSW52YWxpZCBsZXZlbCBjb25maWd1cmF0aW9uJ10sXG4gICAgICB3YXJuaW5nczogdmFsaWRhdGlvbi53YXJuaW5ncyB8fCBbXVxuICAgIH07XG4gIH1cblxuICBpZiAodmFsaWRhdGlvbi53YXJuaW5ncykge1xuICAgIHdhcm5pbmdzLnB1c2goLi4udmFsaWRhdGlvbi53YXJuaW5ncyk7XG4gIH1cblxuICB0cnkge1xuICAgIC8vIEV4dHJhY3QgdG9rZW5zIGJhc2VkIG9uIGxldmVsIGNvbmZpZ3VyYXRpb25cbiAgICBjb25zdCBleHRyYWN0ZWQgPSBleHRyYWN0VG9rZW5zQnlMZXZlbHMoZGF0YSwgbGV2ZWxzKTtcblxuICAgIGxldCB0b3RhbENvbGxlY3Rpb25zID0gMDtcbiAgICBsZXQgdG90YWxNb2RlcyA9IDA7XG4gICAgbGV0IHRvdGFsVmFyaWFibGVzID0gMDtcblxuICAgIC8vIENyZWF0ZSBGaWdtYSBjb2xsZWN0aW9uc1xuICAgIGZvciAoY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBjb2xsZWN0aW9uRGF0YV0gb2YgZXh0cmFjdGVkLmNvbGxlY3Rpb25zKSB7XG4gICAgICBjb25zdCBtb2RlcyA9IEFycmF5LmZyb20oY29sbGVjdGlvbkRhdGEubW9kZXMudmFsdWVzKCkpO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEZpZ21hQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSwgbW9kZXMpO1xuXG4gICAgICB0b3RhbENvbGxlY3Rpb25zICs9IHJlc3VsdC5jb2xsZWN0aW9uc0NyZWF0ZWQ7XG4gICAgICB0b3RhbE1vZGVzICs9IHJlc3VsdC5tb2Rlc0NyZWF0ZWQ7XG4gICAgICB0b3RhbFZhcmlhYmxlcyArPSByZXN1bHQudmFyaWFibGVzQ3JlYXRlZDtcbiAgICAgIGVycm9ycy5wdXNoKC4uLnJlc3VsdC5lcnJvcnMpO1xuICAgICAgd2FybmluZ3MucHVzaCguLi5yZXN1bHQud2FybmluZ3MpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBlcnJvcnMubGVuZ3RoID09PSAwLFxuICAgICAgY29sbGVjdGlvbnNDcmVhdGVkOiB0b3RhbENvbGxlY3Rpb25zLFxuICAgICAgbW9kZXNDcmVhdGVkOiB0b3RhbE1vZGVzLFxuICAgICAgdmFyaWFibGVzQ3JlYXRlZDogdG90YWxWYXJpYWJsZXMsXG4gICAgICBlcnJvcnMsXG4gICAgICB3YXJuaW5nc1xuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgY29sbGVjdGlvbnNDcmVhdGVkOiAwLFxuICAgICAgbW9kZXNDcmVhdGVkOiAwLFxuICAgICAgdmFyaWFibGVzQ3JlYXRlZDogMCxcbiAgICAgIGVycm9yczogW2BGYWlsZWQgdG8gaW1wb3J0IGZyb20gJHtmaWxlTmFtZX06ICR7KGVycm9yIGFzIEVycm9yKS5tZXNzYWdlfWBdLFxuICAgICAgd2FybmluZ3NcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogSW1wb3J0IGZyb20gbXVsdGlwbGUgZmlsZXMgKG5vdCB5ZXQgZnVsbHkgaW1wbGVtZW50ZWQgLSBwbGFjZWhvbGRlcilcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaW1wb3J0TXVsdGlGaWxlKGNvbmZpZzogYW55KTogUHJvbWlzZTxJbXBvcnRSZXN1bHQ+IHtcbiAgLy8gVGhpcyB3aWxsIGJlIGltcGxlbWVudGVkIGluIFRhc2sgR3JvdXAgNzogTXVsdGktZmlsZSBIYW5kbGVyXG4gIC8vIEZvciBub3csIHJldHVybiBhbiBlcnJvclxuICByZXR1cm4ge1xuICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgIGNvbGxlY3Rpb25zQ3JlYXRlZDogMCxcbiAgICBtb2Rlc0NyZWF0ZWQ6IDAsXG4gICAgdmFyaWFibGVzQ3JlYXRlZDogMCxcbiAgICBlcnJvcnM6IFsnTXVsdGktZmlsZSBpbXBvcnQgbm90IHlldCBpbXBsZW1lbnRlZCAtIHdpbGwgYmUgY29tcGxldGVkIGluIFRhc2sgR3JvdXAgNyddLFxuICAgIHdhcm5pbmdzOiBbXVxuICB9O1xufVxuIiwgIi8qKlxuICogTW9kZSBuYW1lIGV4dHJhY3Rpb24gZnJvbSBmaWxlbmFtZXNcbiAqXG4gKiBFeHRyYWN0cyBtb2RlIG5hbWVzIGZyb20gZmlsZW5hbWVzIGZvciBtdWx0aS1maWxlIGltcG9ydHMgd2hlcmUgZWFjaCBmaWxlXG4gKiByZXByZXNlbnRzIGEgbW9kZSAoZS5nLiwgc2VtYW50aWMtbGlnaHQuanNvbiAtPiBcImxpZ2h0XCIpLlxuICovXG5cbi8qKlxuICogRXh0cmFjdCBtb2RlIG5hbWUgZnJvbSBmaWxlbmFtZVxuICpcbiAqIFN1cHBvcnRzIG11bHRpcGxlIHNlcGFyYXRvciBwYXR0ZXJuczpcbiAqIC0gXCJzZW1hbnRpYy1saWdodC5qc29uXCIgLT4gXCJsaWdodFwiXG4gKiAtIFwidGhlbWUuZGFyay5qc29uXCIgLT4gXCJkYXJrXCJcbiAqIC0gXCJtb2JpbGVfdGhlbWUuanNvblwiIC0+IFwidGhlbWVcIlxuICogLSBcInRva2Vucy5qc29uXCIgLT4gXCJ0b2tlbnNcIiAoZmFsbGJhY2spXG4gKlxuICogQHBhcmFtIGZpbGVuYW1lIC0gTmFtZSBvZiB0aGUgZmlsZSAod2l0aCBvciB3aXRob3V0IGV4dGVuc2lvbilcbiAqIEByZXR1cm5zIEV4dHJhY3RlZCBtb2RlIG5hbWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RNb2RlTmFtZUZyb21GaWxlbmFtZShmaWxlbmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy8gUmVtb3ZlIC5qc29uIGV4dGVuc2lvblxuICBjb25zdCBuYW1lV2l0aG91dEV4dCA9IGZpbGVuYW1lLnJlcGxhY2UoL1xcLmpzb24kL2ksICcnKTtcblxuICAvLyBUcnkgaHlwaGVuIHNlcGFyYXRvciAoc2VtYW50aWMtbGlnaHQpXG4gIGlmIChuYW1lV2l0aG91dEV4dC5pbmNsdWRlcygnLScpKSB7XG4gICAgY29uc3QgcGFydHMgPSBuYW1lV2l0aG91dEV4dC5zcGxpdCgnLScpO1xuICAgIGlmIChwYXJ0cy5sZW5ndGggPj0gMikge1xuICAgICAgcmV0dXJuIHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdOyAvLyBSZXR1cm4gbGFzdCBwYXJ0XG4gICAgfVxuICB9XG5cbiAgLy8gVHJ5IGRvdCBzZXBhcmF0b3IgKHRoZW1lLmxpZ2h0KVxuICBpZiAobmFtZVdpdGhvdXRFeHQuaW5jbHVkZXMoJy4nKSkge1xuICAgIGNvbnN0IHBhcnRzID0gbmFtZVdpdGhvdXRFeHQuc3BsaXQoJy4nKTtcbiAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgIHJldHVybiBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXTsgLy8gUmV0dXJuIGxhc3QgcGFydFxuICAgIH1cbiAgfVxuXG4gIC8vIFRyeSB1bmRlcnNjb3JlIHNlcGFyYXRvciAobW9iaWxlX3RoZW1lKVxuICBpZiAobmFtZVdpdGhvdXRFeHQuaW5jbHVkZXMoJ18nKSkge1xuICAgIGNvbnN0IHBhcnRzID0gbmFtZVdpdGhvdXRFeHQuc3BsaXQoJ18nKTtcbiAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgIHJldHVybiBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXTsgLy8gUmV0dXJuIGxhc3QgcGFydFxuICAgIH1cbiAgfVxuXG4gIC8vIEZhbGxiYWNrOiByZXR1cm4gZnVsbCBuYW1lIHdpdGhvdXQgZXh0ZW5zaW9uXG4gIHJldHVybiBuYW1lV2l0aG91dEV4dDtcbn1cblxuLyoqXG4gKiBTdWdnZXN0IGNvbGxlY3Rpb24gbmFtZSBmcm9tIGdyb3VwZWQgZmlsZSBuYW1lc1xuICpcbiAqIEZpbmRzIGNvbW1vbiBwcmVmaXggZnJvbSBmaWxlbmFtZXMgdG8gc3VnZ2VzdCBhIGNvbGxlY3Rpb24gbmFtZS5cbiAqXG4gKiBAcGFyYW0gZmlsZU5hbWVzIC0gQXJyYXkgb2YgZmlsZSBuYW1lcyBpbiB0aGUgZ3JvdXBcbiAqIEByZXR1cm5zIFN1Z2dlc3RlZCBjb2xsZWN0aW9uIG5hbWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1Z2dlc3RDb2xsZWN0aW9uTmFtZUZyb21GaWxlcyhmaWxlTmFtZXM6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgaWYgKGZpbGVOYW1lcy5sZW5ndGggPT09IDApIHJldHVybiAnVG9rZW5zJztcbiAgaWYgKGZpbGVOYW1lcy5sZW5ndGggPT09IDEpIHtcbiAgICAvLyBSZW1vdmUgbW9kZSBzdWZmaXggYW5kIGV4dGVuc2lvblxuICAgIHJldHVybiBmaWxlTmFtZXNbMF1cbiAgICAgIC5yZXBsYWNlKC9cXC5qc29uJC9pLCAnJylcbiAgICAgIC5yZXBsYWNlKC9bLS5fXShsaWdodHxkYXJrfG1vYmlsZXxkZXNrdG9wfGNvbXBhY3R8Y29tZm9ydGFibGUpJC9pLCAnJyk7XG4gIH1cblxuICAvLyBGaW5kIGNvbW1vbiBwcmVmaXhcbiAgY29uc3QgcHJlZml4ID0gZmluZENvbW1vblByZWZpeChmaWxlTmFtZXMubWFwKChmKSA9PiBmLnJlcGxhY2UoL1xcLmpzb24kL2ksICcnKSkpO1xuXG4gIHJldHVybiBwcmVmaXggfHwgJ1Rva2Vucyc7XG59XG5cbi8qKlxuICogRmluZCBjb21tb24gcHJlZml4IGFtb25nIHN0cmluZ3NcbiAqXG4gKiBAcGFyYW0gc3RyaW5ncyAtIEFycmF5IG9mIHN0cmluZ3MgdG8gYW5hbHl6ZVxuICogQHJldHVybnMgQ29tbW9uIHByZWZpeCAoZW1wdHkgc3RyaW5nIGlmIG5vbmUgZm91bmQpXG4gKi9cbmZ1bmN0aW9uIGZpbmRDb21tb25QcmVmaXgoc3RyaW5nczogc3RyaW5nW10pOiBzdHJpbmcge1xuICBpZiAoc3RyaW5ncy5sZW5ndGggPT09IDApIHJldHVybiAnJztcblxuICBsZXQgcHJlZml4ID0gc3RyaW5nc1swXTtcblxuICBmb3IgKGxldCBpID0gMTsgaSA8IHN0cmluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICB3aGlsZSAoIXN0cmluZ3NbaV0uc3RhcnRzV2l0aChwcmVmaXgpKSB7XG4gICAgICBwcmVmaXggPSBwcmVmaXguc2xpY2UoMCwgLTEpO1xuICAgICAgaWYgKHByZWZpeCA9PT0gJycpIHJldHVybiAnJztcbiAgICB9XG4gIH1cblxuICAvLyBSZW1vdmUgdHJhaWxpbmcgc2VwYXJhdG9yc1xuICByZXR1cm4gcHJlZml4LnJlcGxhY2UoL1stLl9dKyQvLCAnJyk7XG59XG4iLCAiLyoqXG4gKiBGaWxlIG1lcmdlciBmb3IgbXVsdGktZmlsZSBpbXBvcnRzXG4gKlxuICogTWVyZ2VzIG11bHRpcGxlIGZpbGVzIGludG8gYSBzaW5nbGUgY29sbGVjdGlvbiBzdHJ1Y3R1cmUgd2l0aCBtb2Rlcy5cbiAqIFN1cHBvcnRzIHR3byBzdHJhdGVnaWVzOlxuICogLSBpbXBvcnRBc01vZGU6IHRydWUgLT4gRWFjaCBmaWxlIGJlY29tZXMgYSBtb2RlXG4gKiAtIGltcG9ydEFzTW9kZTogZmFsc2UgLT4gTWVyZ2UgYWxsIGZpbGVzIGludG8gc2luZ2xlIG1vZGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IExldmVsQ29uZmlndXJhdGlvbiB9IGZyb20gJy4uLy4uL3R5cGVzL2xldmVsLWNvbmZpZy50eXBlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEZpbGVEYXRhIH0gZnJvbSAnLi9tdWx0aS1maWxlLXZhbGlkYXRvci5qcyc7XG5pbXBvcnQgeyBleHRyYWN0TW9kZU5hbWVGcm9tRmlsZW5hbWUgfSBmcm9tICcuL21vZGUtZXh0cmFjdG9yLmpzJztcblxuZXhwb3J0IGludGVyZmFjZSBNZXJnZWRDb2xsZWN0aW9uIHtcbiAgY29sbGVjdGlvbk5hbWU6IHN0cmluZztcbiAgbW9kZXM6IE1vZGVEYXRhW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTW9kZURhdGEge1xuICBtb2RlTmFtZTogc3RyaW5nO1xuICBkYXRhOiBhbnk7XG59XG5cbi8qKlxuICogTWVyZ2UgZmlsZXMgYXMgbW9kZXMgaW4gYSBzaW5nbGUgY29sbGVjdGlvblxuICpcbiAqIFRha2VzIG11bHRpcGxlIGZpbGVzIGFuZCBtZXJnZXMgdGhlbSBpbnRvIGEgc2luZ2xlIGNvbGxlY3Rpb24gc3RydWN0dXJlXG4gKiB3aGVyZSBlYWNoIGZpbGUgcmVwcmVzZW50cyBhIG1vZGUuXG4gKlxuICogQHBhcmFtIGZpbGVzIC0gQXJyYXkgb2YgZmlsZXMgdG8gbWVyZ2VcbiAqIEBwYXJhbSBsZXZlbHMgLSBMZXZlbCBjb25maWd1cmF0aW9uIGZvciB0b2tlbiBzdHJ1Y3R1cmVcbiAqIEBwYXJhbSBjb2xsZWN0aW9uTmFtZSAtIE5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdG8gY3JlYXRlXG4gKiBAcGFyYW0gY3VzdG9tTW9kZU5hbWVzIC0gT3B0aW9uYWwgY3VzdG9tIG1vZGUgbmFtZXMgKGZpbGVOYW1lIC0+IG1vZGVOYW1lKVxuICogQHJldHVybnMgTWVyZ2VkIGNvbGxlY3Rpb24gd2l0aCBtb2Rlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VGaWxlc0FzTW9kZShcbiAgZmlsZXM6IEZpbGVEYXRhW10sXG4gIGxldmVsczogTGV2ZWxDb25maWd1cmF0aW9uW10sXG4gIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsXG4gIGN1c3RvbU1vZGVOYW1lcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IE1lcmdlZENvbGxlY3Rpb24ge1xuICBjb25zdCBtb2RlczogTW9kZURhdGFbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIC8vIFVzZSBjdXN0b20gbW9kZSBuYW1lIGlmIHByb3ZpZGVkLCBvdGhlcndpc2UgZXh0cmFjdCBmcm9tIGZpbGVuYW1lXG4gICAgY29uc3QgbW9kZU5hbWUgPSBjdXN0b21Nb2RlTmFtZXM/LltmaWxlLmZpbGVOYW1lXSB8fCBleHRyYWN0TW9kZU5hbWVGcm9tRmlsZW5hbWUoZmlsZS5maWxlTmFtZSk7XG4gICAgbW9kZXMucHVzaCh7XG4gICAgICBtb2RlTmFtZSxcbiAgICAgIGRhdGE6IGZpbGUuZGF0YSxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY29sbGVjdGlvbk5hbWUsXG4gICAgbW9kZXMsXG4gIH07XG59XG5cbi8qKlxuICogTWVyZ2UgZmlsZXMgaW50byBhIHNpbmdsZSBtb2RlXG4gKlxuICogVGFrZXMgbXVsdGlwbGUgZmlsZXMgYW5kIG1lcmdlcyB0aGVpciBjb250ZW50cyBpbnRvIGEgc2luZ2xlIG1vZGUuXG4gKiBBbGwgdG9rZW5zIGZyb20gYWxsIGZpbGVzIGFyZSBjb21iaW5lZC5cbiAqXG4gKiBAcGFyYW0gZmlsZXMgLSBBcnJheSBvZiBmaWxlcyB0byBtZXJnZVxuICogQHBhcmFtIGxldmVscyAtIExldmVsIGNvbmZpZ3VyYXRpb24gZm9yIHRva2VuIHN0cnVjdHVyZVxuICogQHBhcmFtIGNvbGxlY3Rpb25OYW1lIC0gTmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0byBjcmVhdGVcbiAqIEBwYXJhbSBtb2RlTmFtZSAtIE5hbWUgb2YgdGhlIG1vZGUgKGRlZmF1bHRzIHRvIFwiTW9kZSAxXCIpXG4gKiBAcmV0dXJucyBNZXJnZWQgY29sbGVjdGlvbiB3aXRoIHNpbmdsZSBtb2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZUZpbGVzQXNTaW5nbGVNb2RlKFxuICBmaWxlczogRmlsZURhdGFbXSxcbiAgbGV2ZWxzOiBMZXZlbENvbmZpZ3VyYXRpb25bXSxcbiAgY29sbGVjdGlvbk5hbWU6IHN0cmluZyxcbiAgbW9kZU5hbWU6IHN0cmluZyA9ICdNb2RlIDEnXG4pOiBNZXJnZWRDb2xsZWN0aW9uIHtcbiAgLy8gTWVyZ2UgYWxsIGZpbGUgZGF0YSBpbnRvIGEgc2luZ2xlIG9iamVjdFxuICBjb25zdCBtZXJnZWREYXRhID0gZmlsZXMucmVkdWNlKChhY2MsIGZpbGUpID0+IHtcbiAgICByZXR1cm4gZGVlcE1lcmdlKGFjYywgZmlsZS5kYXRhKTtcbiAgfSwge30pO1xuXG4gIHJldHVybiB7XG4gICAgY29sbGVjdGlvbk5hbWUsXG4gICAgbW9kZXM6IFtcbiAgICAgIHtcbiAgICAgICAgbW9kZU5hbWUsXG4gICAgICAgIGRhdGE6IG1lcmdlZERhdGEsXG4gICAgICB9LFxuICAgIF0sXG4gIH07XG59XG5cbi8qKlxuICogRGVlcCBtZXJnZSB0d28gb2JqZWN0c1xuICpcbiAqIFJlY3Vyc2l2ZWx5IG1lcmdlcyB0d28gb2JqZWN0cywgd2l0aCB0aGUgc2Vjb25kIG9iamVjdCdzIHZhbHVlc1xuICogdGFraW5nIHByZWNlZGVuY2UgaW4gY2FzZSBvZiBjb25mbGljdHMuXG4gKlxuICogQHBhcmFtIHRhcmdldCAtIFRhcmdldCBvYmplY3RcbiAqIEBwYXJhbSBzb3VyY2UgLSBTb3VyY2Ugb2JqZWN0IHRvIG1lcmdlXG4gKiBAcmV0dXJucyBNZXJnZWQgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIGRlZXBNZXJnZSh0YXJnZXQ6IGFueSwgc291cmNlOiBhbnkpOiBhbnkge1xuICBjb25zdCByZXN1bHQgPSB7IC4uLnRhcmdldCB9O1xuXG4gIGZvciAoY29uc3Qga2V5IGluIHNvdXJjZSkge1xuICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgaWYgKFxuICAgICAgICBzb3VyY2Vba2V5XSAmJlxuICAgICAgICB0eXBlb2Ygc291cmNlW2tleV0gPT09ICdvYmplY3QnICYmXG4gICAgICAgICFBcnJheS5pc0FycmF5KHNvdXJjZVtrZXldKSAmJlxuICAgICAgICAhaXNUb2tlblZhbHVlKHNvdXJjZVtrZXldKVxuICAgICAgKSB7XG4gICAgICAgIC8vIFJlY3Vyc2l2ZWx5IG1lcmdlIG5lc3RlZCBvYmplY3RzXG4gICAgICAgIHJlc3VsdFtrZXldID0gZGVlcE1lcmdlKHJlc3VsdFtrZXldIHx8IHt9LCBzb3VyY2Vba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBPdmVyd3JpdGUgd2l0aCBzb3VyY2UgdmFsdWVcbiAgICAgICAgcmVzdWx0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGEgdmFsdWUgaXMgYSB0b2tlbiB2YWx1ZSAobGVhZiBub2RlKVxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFZhbHVlIHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoaXMgaXMgYSB0b2tlbiB2YWx1ZVxuICovXG5mdW5jdGlvbiBpc1Rva2VuVmFsdWUodmFsdWU6IGFueSk6IGJvb2xlYW4ge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB2YWx1ZXMgYXJlIHRva2Vuc1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBEVENHIGZvcm1hdDogb2JqZWN0IHdpdGggJHZhbHVlXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmICckdmFsdWUnIGluIHZhbHVlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBMZWdhY3kgZm9ybWF0OiBvYmplY3Qgd2l0aCB2YWx1ZVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiAndmFsdWUnIGluIHZhbHVlICYmICEoJyR2YWx1ZScgaW4gdmFsdWUpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG4iLCAiLyoqXG4gKiBNdWx0aS1maWxlIGltcG9ydCBoYW5kbGVyXG4gKlxuICogQ29vcmRpbmF0ZXMgdGhlIGltcG9ydCBvZiBtdWx0aXBsZSBmaWxlcyB3aXRoIHZhcmlvdXMgZ3JvdXBpbmcgc3RyYXRlZ2llcy5cbiAqIERlbGVnYXRlcyB0byBsZXZlbC1tYXBwZXIgZm9yIGFjdHVhbCBGaWdtYSBBUEkgY2FsbHMuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBGaWxlR3JvdXAgfSBmcm9tICcuLi8uLi90eXBlcy9sZXZlbC1jb25maWcudHlwZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBMZXZlbENvbmZpZ3VyYXRpb24gfSBmcm9tICcuLi8uLi90eXBlcy9sZXZlbC1jb25maWcudHlwZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBGaWxlRGF0YSB9IGZyb20gJy4uL3V0aWxzL211bHRpLWZpbGUtdmFsaWRhdG9yLmpzJztcbmltcG9ydCB7IG1lcmdlRmlsZXNBc01vZGUsIG1lcmdlRmlsZXNBc1NpbmdsZU1vZGUsIHR5cGUgTW9kZURhdGEgfSBmcm9tICcuLi91dGlscy9maWxlLW1lcmdlci5qcyc7XG5pbXBvcnQgeyBidWlsZEZpZ21hQ29sbGVjdGlvbiB9IGZyb20gJy4vY29sbGVjdGlvbi1idWlsZGVyLmpzJztcbmltcG9ydCB0eXBlIHsgSW1wb3J0UmVzdWx0IH0gZnJvbSAnLi9iYXNlbGluZS1pbXBvcnRlci5qcyc7XG5cbi8qKlxuICogSGFuZGxlIG11bHRpLWZpbGUgaW1wb3J0XG4gKlxuICogUHJvY2Vzc2VzIG11bHRpcGxlIGZpbGUgZ3JvdXBzLCBlYWNoIHBvdGVudGlhbGx5IHdpdGggZGlmZmVyZW50IGltcG9ydCBzdHJhdGVnaWVzLlxuICogRm9yIGdyb3VwcyB3aXRoIGltcG9ydEFzTW9kZT10cnVlLCBmaWxlcyBhcmUgbWVyZ2VkIGFzIG1vZGVzIGluIGEgc2luZ2xlIGNvbGxlY3Rpb24uXG4gKiBGb3IgZ3JvdXBzIHdpdGggaW1wb3J0QXNNb2RlPWZhbHNlLCBmaWxlcyBhcmUgbWVyZ2VkIGludG8gYSBzaW5nbGUgbW9kZS5cbiAqXG4gKiBAcGFyYW0gZ3JvdXBzIC0gRmlsZSBncm91cHMgd2l0aCB0aGVpciBjb25maWd1cmF0aW9uc1xuICogQHBhcmFtIGxldmVsc0J5R3JvdXAgLSBNYXAgb2YgZ3JvdXAgSUQgdG8gbGV2ZWwgY29uZmlndXJhdGlvbnNcbiAqIEBwYXJhbSBmaWxlc0RhdGEgLSBNYXAgb2YgZmlsZW5hbWUgdG8gZmlsZSBkYXRhXG4gKiBAcmV0dXJucyBBZ2dyZWdhdGVkIGltcG9ydCByZXN1bHRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZU11bHRpRmlsZUltcG9ydChcbiAgZ3JvdXBzOiBGaWxlR3JvdXBbXSxcbiAgbGV2ZWxzQnlHcm91cDogTWFwPHN0cmluZywgTGV2ZWxDb25maWd1cmF0aW9uW10+LFxuICBmaWxlc0RhdGE6IE1hcDxzdHJpbmcsIGFueT5cbik6IFByb21pc2U8SW1wb3J0UmVzdWx0PiB7XG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gIGxldCB0b3RhbENvbGxlY3Rpb25zID0gMDtcbiAgbGV0IHRvdGFsTW9kZXMgPSAwO1xuICBsZXQgdG90YWxWYXJpYWJsZXMgPSAwO1xuXG4gIGZvciAoY29uc3QgZ3JvdXAgb2YgZ3JvdXBzKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIEdldCBsZXZlbCBjb25maWd1cmF0aW9uIGZvciB0aGlzIGdyb3VwXG4gICAgICBjb25zdCBsZXZlbHMgPSBsZXZlbHNCeUdyb3VwLmdldChncm91cC5pZCk7XG4gICAgICBpZiAoIWxldmVscykge1xuICAgICAgICBlcnJvcnMucHVzaChgTm8gbGV2ZWwgY29uZmlndXJhdGlvbiBmb3VuZCBmb3IgZ3JvdXAgXCIke2dyb3VwLmNvbGxlY3Rpb25OYW1lfVwiYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBQcmVwYXJlIGZpbGUgZGF0YSBmb3IgdGhpcyBncm91cFxuICAgICAgY29uc3QgZ3JvdXBGaWxlczogRmlsZURhdGFbXSA9IGdyb3VwLmZpbGVOYW1lc1xuICAgICAgICAubWFwKChmaWxlTmFtZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRhdGEgPSBmaWxlc0RhdGEuZ2V0KGZpbGVOYW1lKTtcbiAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKGBGaWxlIGRhdGEgbm90IGZvdW5kOiAke2ZpbGVOYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB7IGZpbGVOYW1lLCBkYXRhIH07XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoKGYpOiBmIGlzIEZpbGVEYXRhID0+IGYgIT09IG51bGwpO1xuXG4gICAgICBpZiAoZ3JvdXBGaWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZXJyb3JzLnB1c2goYE5vIHZhbGlkIGZpbGVzIGluIGdyb3VwIFwiJHtncm91cC5jb2xsZWN0aW9uTmFtZX1cImApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gTm90ZTogV2UgRE9OJ1QgdmFsaWRhdGUgc3RydWN0dXJlIGNvbXBhdGliaWxpdHkgZm9yIHBlci1maWxlIG1vZGVcbiAgICAgIC8vIFdoZW4gZmlsZXMgcmVwcmVzZW50IGRpZmZlcmVudCBtb2RlcywgdGhleSBjYW4gaGF2ZSBjb21wbGV0ZWx5IGRpZmZlcmVudCB0b2tlbnNcbiAgICAgIC8vIEVhY2ggbW9kZSBpbiBhIGNvbGxlY3Rpb24gY2FuIGhhdmUgaXRzIG93biBzZXQgb2YgdmFyaWFibGVzXG5cbiAgICAgIC8vIE1lcmdlIGZpbGVzIGFjY29yZGluZyB0byBzdHJhdGVneVxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaW1wb3J0RmlsZUdyb3VwKGdyb3VwLCBncm91cEZpbGVzLCBsZXZlbHMpO1xuXG4gICAgICB0b3RhbENvbGxlY3Rpb25zICs9IHJlc3VsdC5jb2xsZWN0aW9uc0NyZWF0ZWQ7XG4gICAgICB0b3RhbE1vZGVzICs9IHJlc3VsdC5tb2Rlc0NyZWF0ZWQ7XG4gICAgICB0b3RhbFZhcmlhYmxlcyArPSByZXN1bHQudmFyaWFibGVzQ3JlYXRlZDtcbiAgICAgIGVycm9ycy5wdXNoKC4uLnJlc3VsdC5lcnJvcnMpO1xuICAgICAgd2FybmluZ3MucHVzaCguLi5yZXN1bHQud2FybmluZ3MpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBlcnJvcnMucHVzaChgRmFpbGVkIHRvIGltcG9ydCBncm91cCBcIiR7Z3JvdXAuY29sbGVjdGlvbk5hbWV9XCI6ICR7KGVycm9yIGFzIEVycm9yKS5tZXNzYWdlfWApO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3VjY2VzczogZXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICBjb2xsZWN0aW9uc0NyZWF0ZWQ6IHRvdGFsQ29sbGVjdGlvbnMsXG4gICAgbW9kZXNDcmVhdGVkOiB0b3RhbE1vZGVzLFxuICAgIHZhcmlhYmxlc0NyZWF0ZWQ6IHRvdGFsVmFyaWFibGVzLFxuICAgIGVycm9ycyxcbiAgICB3YXJuaW5ncyxcbiAgfTtcbn1cblxuLyoqXG4gKiBJbXBvcnQgYSBzaW5nbGUgZmlsZSBncm91cFxuICpcbiAqIERlbGVnYXRlcyB0byB0aGUgYXBwcm9wcmlhdGUgbWVyZ2VyIGJhc2VkIG9uIHRoZSBncm91cCdzIG1vZGUgc3RyYXRlZ3ksXG4gKiB0aGVuIHBhc3NlcyB0aGUgbWVyZ2VkIHN0cnVjdHVyZSB0byB0aGUgbGV2ZWwgbWFwcGVyIGZvciBGaWdtYSBpbXBvcnQuXG4gKlxuICogQHBhcmFtIGdyb3VwIC0gRmlsZSBncm91cCBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gZmlsZXMgLSBGaWxlIGRhdGEgZm9yIHRoaXMgZ3JvdXBcbiAqIEBwYXJhbSBsZXZlbHMgLSBMZXZlbCBjb25maWd1cmF0aW9uXG4gKiBAcmV0dXJucyBJbXBvcnQgcmVzdWx0IGZvciB0aGlzIGdyb3VwXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGltcG9ydEZpbGVHcm91cChcbiAgZ3JvdXA6IEZpbGVHcm91cCxcbiAgZmlsZXM6IEZpbGVEYXRhW10sXG4gIGxldmVsczogTGV2ZWxDb25maWd1cmF0aW9uW11cbik6IFByb21pc2U8SW1wb3J0UmVzdWx0PiB7XG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgdHJ5IHtcbiAgICBsZXQgbWVyZ2VkQ29sbGVjdGlvbjtcblxuICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBzaW5nbGUgZmlsZSB3aXRoIG1vZGVzIGZyb20gZmlyc3QgbGV2ZWxcbiAgICBjb25zdCBpc1NpbmdsZUZpbGVXaXRoTW9kZXMgPSBmaWxlcy5sZW5ndGggPT09IDEgJiYgXG4gICAgICBsZXZlbHMubGVuZ3RoID4gMCAmJiBcbiAgICAgIGxldmVsc1swXS5yb2xlID09PSAnbW9kZSc7XG5cbiAgICBpZiAoaXNTaW5nbGVGaWxlV2l0aE1vZGVzKSB7XG4gICAgICAvLyBTaW5nbGUgZmlsZSB3aGVyZSBmaXJzdCBsZXZlbCBrZXlzIGFyZSBtb2Rlc1xuICAgICAgLy8gU3BsaXQgdGhlIGZpbGUgZGF0YSBieSBmaXJzdCBsZXZlbCBrZXlzXG4gICAgICBjb25zdCBmaWxlRGF0YSA9IGZpbGVzWzBdLmRhdGE7XG4gICAgICBjb25zdCBtb2RlczogTW9kZURhdGFbXSA9IFtdO1xuXG4gICAgICBpZiAodHlwZW9mIGZpbGVEYXRhID09PSAnb2JqZWN0JyAmJiBmaWxlRGF0YSAhPT0gbnVsbCkge1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhmaWxlRGF0YSkpIHtcbiAgICAgICAgICAvLyBTa2lwIG1ldGFkYXRhIGtleXNcbiAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJyQnKSkgY29udGludWU7XG4gICAgICAgICAgXG4gICAgICAgICAgbW9kZXMucHVzaCh7XG4gICAgICAgICAgICBtb2RlTmFtZToga2V5LFxuICAgICAgICAgICAgZGF0YTogdmFsdWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBtZXJnZWRDb2xsZWN0aW9uID0ge1xuICAgICAgICBjb2xsZWN0aW9uTmFtZTogZ3JvdXAuY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIG1vZGVzXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoZ3JvdXAubW9kZVN0cmF0ZWd5ID09PSAncGVyLWZpbGUnKSB7XG4gICAgICAvLyBFYWNoIGZpbGUgYmVjb21lcyBhIG1vZGUgLSBwYXNzIGN1c3RvbSBtb2RlIG5hbWVzIGlmIGF2YWlsYWJsZVxuICAgICAgbWVyZ2VkQ29sbGVjdGlvbiA9IG1lcmdlRmlsZXNBc01vZGUoZmlsZXMsIGxldmVscywgZ3JvdXAuY29sbGVjdGlvbk5hbWUsIGdyb3VwLm1vZGVOYW1lcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE1lcmdlIGFsbCBmaWxlcyBpbnRvIG9uZSBtb2RlXG4gICAgICBtZXJnZWRDb2xsZWN0aW9uID0gbWVyZ2VGaWxlc0FzU2luZ2xlTW9kZShmaWxlcywgbGV2ZWxzLCBncm91cC5jb2xsZWN0aW9uTmFtZSk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ1tNdWx0aUZpbGVIYW5kbGVyXSBQcm9jZXNzaW5nIGNvbGxlY3Rpb246JywgZ3JvdXAuY29sbGVjdGlvbk5hbWUsICd3aXRoJywgbWVyZ2VkQ29sbGVjdGlvbi5tb2Rlcy5sZW5ndGgsICdtb2RlcycpO1xuICAgIGNvbnNvbGUubG9nKCdbTXVsdGlGaWxlSGFuZGxlcl0gTW9kZSBuYW1lczonLCBtZXJnZWRDb2xsZWN0aW9uLm1vZGVzLm1hcChtID0+IG0ubW9kZU5hbWUpKTtcblxuICAgIC8vIENvbnZlcnQgbWVyZ2VkIGNvbGxlY3Rpb24gdG8gTW9kZVRva2VucyBmb3JtYXQgZm9yIGJ1aWxkRmlnbWFDb2xsZWN0aW9uXG4gICAgLy8gRm9yIGVhY2ggbW9kZSwgd2UgZXh0cmFjdCBhbGwgdG9rZW5zIGJ5IGZsYXR0ZW5pbmcgdGhlIGRhdGEgc3RydWN0dXJlXG4gICAgY29uc3QgbW9kZVRva2Vuc0xpc3Q6IHsgbmFtZTogc3RyaW5nOyB0b2tlbnM6IE1hcDxzdHJpbmcsIGFueT4gfVtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG1vZGVEYXRhIG9mIG1lcmdlZENvbGxlY3Rpb24ubW9kZXMpIHtcbiAgICAgIC8vIEZsYXR0ZW4gYWxsIHRva2VucyBmcm9tIHRoaXMgbW9kZSdzIGRhdGFcbiAgICAgIGNvbnN0IHRva2VucyA9IGZsYXR0ZW5Ub2tlbnMobW9kZURhdGEuZGF0YSk7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdbTXVsdGlGaWxlSGFuZGxlcl0gTW9kZScsIG1vZGVEYXRhLm1vZGVOYW1lLCAnaGFzJywgdG9rZW5zLnNpemUsICd0b2tlbnMnKTtcblxuICAgICAgbW9kZVRva2Vuc0xpc3QucHVzaCh7XG4gICAgICAgIG5hbWU6IG1vZGVEYXRhLm1vZGVOYW1lLFxuICAgICAgICB0b2tlbnNcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFjdHVhbGx5IGNyZWF0ZSB0aGUgRmlnbWEgY29sbGVjdGlvblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkRmlnbWFDb2xsZWN0aW9uKGdyb3VwLmNvbGxlY3Rpb25OYW1lLCBtb2RlVG9rZW5zTGlzdCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogcmVzdWx0LmVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgICBjb2xsZWN0aW9uc0NyZWF0ZWQ6IHJlc3VsdC5jb2xsZWN0aW9uc0NyZWF0ZWQsXG4gICAgICBtb2Rlc0NyZWF0ZWQ6IHJlc3VsdC5tb2Rlc0NyZWF0ZWQsXG4gICAgICB2YXJpYWJsZXNDcmVhdGVkOiByZXN1bHQudmFyaWFibGVzQ3JlYXRlZCxcbiAgICAgIGVycm9yczogWy4uLmVycm9ycywgLi4ucmVzdWx0LmVycm9yc10sXG4gICAgICB3YXJuaW5nczogWy4uLndhcm5pbmdzLCAuLi5yZXN1bHQud2FybmluZ3NdLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgY29sbGVjdGlvbnNDcmVhdGVkOiAwLFxuICAgICAgbW9kZXNDcmVhdGVkOiAwLFxuICAgICAgdmFyaWFibGVzQ3JlYXRlZDogMCxcbiAgICAgIGVycm9yczogW2BGYWlsZWQgdG8gaW1wb3J0IGZpbGUgZ3JvdXA6ICR7KGVycm9yIGFzIEVycm9yKS5tZXNzYWdlfWBdLFxuICAgICAgd2FybmluZ3MsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEVzdGltYXRlIHZhcmlhYmxlIGNvdW50IGZyb20gbWVyZ2VkIGNvbGxlY3Rpb25cbiAqXG4gKiBDb3VudHMgdW5pcXVlIHZhcmlhYmxlIG5hbWVzIGFjcm9zcyBhbGwgbW9kZXMuXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb24gLSBNZXJnZWQgY29sbGVjdGlvbiBzdHJ1Y3R1cmVcbiAqIEByZXR1cm5zIEVzdGltYXRlZCB2YXJpYWJsZSBjb3VudFxuICovXG5mdW5jdGlvbiBlc3RpbWF0ZVZhcmlhYmxlQ291bnQoY29sbGVjdGlvbjogYW55KTogbnVtYmVyIHtcbiAgLy8gRm9yIGVzdGltYXRpb24sIGNvdW50IHRva2VucyBpbiBmaXJzdCBtb2RlXG4gIGlmIChjb2xsZWN0aW9uLm1vZGVzICYmIGNvbGxlY3Rpb24ubW9kZXMubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBjb3VudFRva2Vucyhjb2xsZWN0aW9uLm1vZGVzWzBdLmRhdGEpO1xuICB9XG4gIHJldHVybiAwO1xufVxuXG4vKipcbiAqIENvdW50IHRva2VucyBpbiBhIGRhdGEgc3RydWN0dXJlXG4gKlxuICogQHBhcmFtIG9iaiAtIE9iamVjdCB0byBjb3VudCB0b2tlbnMgaW5cbiAqIEByZXR1cm5zIE51bWJlciBvZiB0b2tlbnNcbiAqL1xuZnVuY3Rpb24gY291bnRUb2tlbnMob2JqOiBhbnkpOiBudW1iZXIge1xuICBpZiAoIW9iaiB8fCB0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgaWYgKGlzVG9rZW5WYWx1ZShvYmopKSB7XG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICBsZXQgY291bnQgPSAwO1xuICBmb3IgKGNvbnN0IHZhbHVlIG9mIE9iamVjdC52YWx1ZXMob2JqKSkge1xuICAgIGlmIChpc1Rva2VuVmFsdWUodmFsdWUpKSB7XG4gICAgICBjb3VudCsrO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgY291bnQgKz0gY291bnRUb2tlbnModmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb3VudDtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIHZhbHVlIGlzIGEgdG9rZW4gdmFsdWVcbiAqXG4gKiBAcGFyYW0gdmFsdWUgLSBWYWx1ZSB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0b2tlbiB2YWx1ZVxuICovXG5mdW5jdGlvbiBpc1Rva2VuVmFsdWUodmFsdWU6IGFueSk6IGJvb2xlYW4ge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmICgnJHZhbHVlJyBpbiB2YWx1ZSB8fCAndmFsdWUnIGluIHZhbHVlKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEZsYXR0ZW4gYWxsIHRva2VucyBmcm9tIGEgbmVzdGVkIG9iamVjdCBpbnRvIGEgTWFwXG4gKlxuICogUmVjdXJzaXZlbHkgd2Fsa3MgdGhlIG9iamVjdCBhbmQgZXh0cmFjdHMgYWxsIHRva2VuIHZhbHVlcyxcbiAqIGJ1aWxkaW5nIGEgcGF0aCBmcm9tIHRoZSBuZXN0ZWQga2V5cy5cbiAqXG4gKiBAcGFyYW0gb2JqIC0gT2JqZWN0IHRvIGZsYXR0ZW5cbiAqIEBwYXJhbSBwYXRoU2VnbWVudHMgLSBDdXJyZW50IHBhdGggc2VnbWVudHMgKGZvciByZWN1cnNpb24pXG4gKiBAcmV0dXJucyBNYXAgb2YgdG9rZW4gcGF0aHMgdG8gdG9rZW4gdmFsdWVzXG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW5Ub2tlbnMob2JqOiBhbnksIHBhdGhTZWdtZW50czogc3RyaW5nW10gPSBbXSk6IE1hcDxzdHJpbmcsIGFueT4ge1xuICBjb25zdCB0b2tlbnMgPSBuZXcgTWFwPHN0cmluZywgYW55PigpO1xuXG4gIGlmIChvYmogPT09IG51bGwgfHwgb2JqID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdG9rZW5zO1xuICB9XG5cbiAgLy8gSWYgaXQncyBhIHByaW1pdGl2ZSwgdHJlYXQgdGhlIGN1cnJlbnQgcGF0aCBhcyBhIHRva2VuXG4gIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICBpZiAocGF0aFNlZ21lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRva2Vucy5zZXQocGF0aFNlZ21lbnRzLmpvaW4oJy8nKSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIHRva2VucztcbiAgfVxuXG4gIC8vIENoZWNrIGlmIHRoaXMgb2JqZWN0IGlzIGEgdG9rZW4gKGhhcyAkdmFsdWUgb3IgdmFsdWUgcHJvcGVydHkpXG4gIGlmICgnJHZhbHVlJyBpbiBvYmogfHwgJ3ZhbHVlJyBpbiBvYmopIHtcbiAgICBpZiAocGF0aFNlZ21lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRva2Vucy5zZXQocGF0aFNlZ21lbnRzLmpvaW4oJy8nKSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIHRva2VucztcbiAgfVxuXG4gIC8vIFJlY3Vyc2UgaW50byBuZXN0ZWQgb2JqZWN0c1xuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvYmopKSB7XG4gICAgLy8gU2tpcCAkLXByZWZpeGVkIG1ldGFkYXRhIGtleXMgbGlrZSAkdHlwZSwgJGRlc2NyaXB0aW9uXG4gICAgaWYgKGtleS5zdGFydHNXaXRoKCckJykpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGNoaWxkVG9rZW5zID0gZmxhdHRlblRva2Vucyh2YWx1ZSwgWy4uLnBhdGhTZWdtZW50cywga2V5XSk7XG4gICAgZm9yIChjb25zdCBbcGF0aCwgdmFsXSBvZiBjaGlsZFRva2Vucykge1xuICAgICAgdG9rZW5zLnNldChwYXRoLCB2YWwpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0b2tlbnM7XG59XG4iLCAiLyoqXG4gKiBWZXJzaW9uIG1hbmFnZW1lbnQgYW5kIFNlbVZlciBidW1wIGRldGVjdGlvblxuICpcbiAqIERldGVjdHMgY2hhbmdlcyBiZXR3ZWVuIGJhc2VsaW5lcyBhbmQgY2FsY3VsYXRlcyBhcHByb3ByaWF0ZSB2ZXJzaW9uIGJ1bXBzXG4gKiBmb2xsb3dpbmcgU2VtYW50aWMgVmVyc2lvbmluZyAyLjAuMCBydWxlcy5cbiAqXG4gKiBWZXJzaW9uIEJ1bXAgUnVsZXM6XG4gKiAtIE1BSk9SICh4LjAuMCk6IEJyZWFraW5nIGNoYW5nZXMgKHRva2VuIGRlbGV0ZWQsIHJlbmFtZWQsIHR5cGUgY2hhbmdlZClcbiAqIC0gTUlOT1IgKDAueS4wKTogQWRkaXRpb25zIChuZXcgdG9rZW4sIGNvbGxlY3Rpb24sIG1vZGUpXG4gKiAtIFBBVENIICgwLjAueik6IFVwZGF0ZXMgKHZhbHVlIGNoYW5nZWQsIGRlc2NyaXB0aW9uIHVwZGF0ZWQsIGFsaWFzIGNoYW5nZWQpXG4gKi9cblxuZXhwb3J0IHR5cGUgQ2hhbmdlVHlwZSA9ICdicmVha2luZycgfCAnYWRkaXRpb24nIHwgJ3BhdGNoJztcbmV4cG9ydCB0eXBlIENoYW5nZVNldmVyaXR5ID0gJ2NyaXRpY2FsJyB8ICd3YXJuaW5nJyB8ICdpbmZvJztcblxuZXhwb3J0IGludGVyZmFjZSBUb2tlbkNoYW5nZSB7XG4gIHR5cGU6IENoYW5nZVR5cGU7XG4gIHNldmVyaXR5OiBDaGFuZ2VTZXZlcml0eTtcbiAgY2F0ZWdvcnk6ICd0b2tlbi1kZWxldGVkJyB8ICd0b2tlbi1hZGRlZCcgfCAndG9rZW4tcmVuYW1lZCcgfFxuICAgICAgICAgICAgJ3R5cGUtY2hhbmdlZCcgfCAndmFsdWUtY2hhbmdlZCcgfCAnYWxpYXMtY2hhbmdlZCcgfFxuICAgICAgICAgICAgJ2NvbGxlY3Rpb24tZGVsZXRlZCcgfCAnY29sbGVjdGlvbi1hZGRlZCcgfFxuICAgICAgICAgICAgJ21vZGUtZGVsZXRlZCcgfCAnbW9kZS1hZGRlZCcgfCAnZGVzY3JpcHRpb24tY2hhbmdlZCc7XG4gIHBhdGg6IHN0cmluZztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgYmVmb3JlPzogYW55O1xuICBhZnRlcj86IGFueTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWZXJzaW9uQnVtcCB7XG4gIGN1cnJlbnQ6IHN0cmluZztcbiAgc3VnZ2VzdGVkOiBzdHJpbmc7XG4gIGNoYW5nZVR5cGU6ICdtYWpvcicgfCAnbWlub3InIHwgJ3BhdGNoJyB8ICdub25lJztcbiAgY2hhbmdlczogVG9rZW5DaGFuZ2VbXTtcbiAgYnJlYWtpbmdDb3VudDogbnVtYmVyO1xuICBhZGRpdGlvbkNvdW50OiBudW1iZXI7XG4gIHBhdGNoQ291bnQ6IG51bWJlcjtcbiAgc3VtbWFyeTogc3RyaW5nO1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSB2ZXJzaW9uIGJ1bXAgYnkgY29tcGFyaW5nIHR3byBiYXNlbGluZXNcbiAqXG4gKiBAcGFyYW0gY3VycmVudFZlcnNpb24gLSBDdXJyZW50IHZlcnNpb24gc3RyaW5nIChlLmcuLCBcIjEuMC4wXCIpXG4gKiBAcGFyYW0gcHJldmlvdXNCYXNlbGluZSAtIFByZXZpb3VzIGJhc2VsaW5lIGRhdGEgb2JqZWN0XG4gKiBAcGFyYW0gbmV3QmFzZWxpbmUgLSBOZXcgYmFzZWxpbmUgZGF0YSBvYmplY3RcbiAqIEByZXR1cm5zIFZlcnNpb24gYnVtcCByZXN1bHQgd2l0aCBzdWdnZXN0ZWQgdmVyc2lvbiBhbmQgY2hhbmdlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlVmVyc2lvbkJ1bXAoXG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmcsXG4gIHByZXZpb3VzQmFzZWxpbmU6IGFueSxcbiAgbmV3QmFzZWxpbmU6IGFueVxuKTogVmVyc2lvbkJ1bXAge1xuICBjb25zdCBjaGFuZ2VzID0gZGV0ZWN0Q2hhbmdlcyhwcmV2aW91c0Jhc2VsaW5lLCBuZXdCYXNlbGluZSk7XG5cbiAgLy8gQ291bnQgYnkgdHlwZVxuICBjb25zdCBicmVha2luZyA9IGNoYW5nZXMuZmlsdGVyKGMgPT4gYy50eXBlID09PSAnYnJlYWtpbmcnKTtcbiAgY29uc3QgYWRkaXRpb25zID0gY2hhbmdlcy5maWx0ZXIoYyA9PiBjLnR5cGUgPT09ICdhZGRpdGlvbicpO1xuICBjb25zdCBwYXRjaGVzID0gY2hhbmdlcy5maWx0ZXIoYyA9PiBjLnR5cGUgPT09ICdwYXRjaCcpO1xuXG4gIC8vIERldGVybWluZSBidW1wIHR5cGUgKGJyZWFraW5nID4gYWRkaXRpb24gPiBwYXRjaClcbiAgbGV0IGNoYW5nZVR5cGU6ICdtYWpvcicgfCAnbWlub3InIHwgJ3BhdGNoJyB8ICdub25lJztcbiAgaWYgKGJyZWFraW5nLmxlbmd0aCA+IDApIHtcbiAgICBjaGFuZ2VUeXBlID0gJ21ham9yJztcbiAgfSBlbHNlIGlmIChhZGRpdGlvbnMubGVuZ3RoID4gMCkge1xuICAgIGNoYW5nZVR5cGUgPSAnbWlub3InO1xuICB9IGVsc2UgaWYgKHBhdGNoZXMubGVuZ3RoID4gMCkge1xuICAgIGNoYW5nZVR5cGUgPSAncGF0Y2gnO1xuICB9IGVsc2Uge1xuICAgIGNoYW5nZVR5cGUgPSAnbm9uZSc7XG4gIH1cblxuICBjb25zdCBzdWdnZXN0ZWQgPSBidW1wVmVyc2lvbihjdXJyZW50VmVyc2lvbiwgY2hhbmdlVHlwZSk7XG4gIGNvbnN0IHN1bW1hcnkgPSBnZW5lcmF0ZVN1bW1hcnkoYnJlYWtpbmcubGVuZ3RoLCBhZGRpdGlvbnMubGVuZ3RoLCBwYXRjaGVzLmxlbmd0aCk7XG5cbiAgcmV0dXJuIHtcbiAgICBjdXJyZW50OiBjdXJyZW50VmVyc2lvbixcbiAgICBzdWdnZXN0ZWQsXG4gICAgY2hhbmdlVHlwZSxcbiAgICBjaGFuZ2VzLFxuICAgIGJyZWFraW5nQ291bnQ6IGJyZWFraW5nLmxlbmd0aCxcbiAgICBhZGRpdGlvbkNvdW50OiBhZGRpdGlvbnMubGVuZ3RoLFxuICAgIHBhdGNoQ291bnQ6IHBhdGNoZXMubGVuZ3RoLFxuICAgIHN1bW1hcnlcbiAgfTtcbn1cblxuLyoqXG4gKiBEZXRlY3QgYWxsIGNoYW5nZXMgYmV0d2VlbiB0d28gYmFzZWxpbmVzXG4gKlxuICogQ29tcGFyZXMgdG9rZW4tbGV2ZWwgY2hhbmdlcyAoZGVsZXRpb25zLCBhZGRpdGlvbnMsIG1vZGlmaWNhdGlvbnMpXG4gKiBhbmQgY29sbGVjdGlvbi1sZXZlbCBjaGFuZ2VzIChjb2xsZWN0aW9ucywgbW9kZXMpXG4gKlxuICogQHBhcmFtIHByZXYgLSBQcmV2aW91cyBiYXNlbGluZSBvYmplY3RcbiAqIEBwYXJhbSBuZXh0IC0gTmV3IGJhc2VsaW5lIG9iamVjdFxuICogQHJldHVybnMgQXJyYXkgb2YgZGV0ZWN0ZWQgY2hhbmdlc1xuICovXG5mdW5jdGlvbiBkZXRlY3RDaGFuZ2VzKHByZXY6IGFueSwgbmV4dDogYW55KTogVG9rZW5DaGFuZ2VbXSB7XG4gIGNvbnN0IGNoYW5nZXM6IFRva2VuQ2hhbmdlW10gPSBbXTtcblxuICAvLyBIYW5kbGUgZW1wdHkgb3IgaW52YWxpZCBiYXNlbGluZXNcbiAgY29uc3QgcHJldkJhc2VsaW5lID0gcHJldj8uYmFzZWxpbmUgfHwge307XG4gIGNvbnN0IG5leHRCYXNlbGluZSA9IG5leHQ/LmJhc2VsaW5lIHx8IHt9O1xuXG4gIGNvbnN0IHByZXZUb2tlbnMgPSBuZXcgTWFwKE9iamVjdC5lbnRyaWVzKHByZXZCYXNlbGluZSkpO1xuICBjb25zdCBuZXh0VG9rZW5zID0gbmV3IE1hcChPYmplY3QuZW50cmllcyhuZXh0QmFzZWxpbmUpKTtcblxuICAvLyBEZXRlY3QgZGVsZXRpb25zIChicmVha2luZylcbiAgQXJyYXkuZnJvbShwcmV2VG9rZW5zLmVudHJpZXMoKSkuZm9yRWFjaCgoW2tleSwgdG9rZW5dKSA9PiB7XG4gICAgaWYgKCFuZXh0VG9rZW5zLmhhcyhrZXkpKSB7XG4gICAgICBjb25zdCB0ID0gdG9rZW4gYXMgYW55O1xuICAgICAgY2hhbmdlcy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2JyZWFraW5nJyxcbiAgICAgICAgc2V2ZXJpdHk6ICdjcml0aWNhbCcsXG4gICAgICAgIGNhdGVnb3J5OiAndG9rZW4tZGVsZXRlZCcsXG4gICAgICAgIHBhdGg6IHQucGF0aCB8fCBrZXksXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgVG9rZW4gZGVsZXRlZDogJHt0LnBhdGggfHwga2V5fWAsXG4gICAgICAgIGJlZm9yZTogdG9rZW5cbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gRGV0ZWN0IGFkZGl0aW9ucyAobWlub3IpXG4gIEFycmF5LmZyb20obmV4dFRva2Vucy5lbnRyaWVzKCkpLmZvckVhY2goKFtrZXksIHRva2VuXSkgPT4ge1xuICAgIGlmICghcHJldlRva2Vucy5oYXMoa2V5KSkge1xuICAgICAgY29uc3QgdCA9IHRva2VuIGFzIGFueTtcbiAgICAgIGNoYW5nZXMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhZGRpdGlvbicsXG4gICAgICAgIHNldmVyaXR5OiAnaW5mbycsXG4gICAgICAgIGNhdGVnb3J5OiAndG9rZW4tYWRkZWQnLFxuICAgICAgICBwYXRoOiB0LnBhdGggfHwga2V5LFxuICAgICAgICBkZXNjcmlwdGlvbjogYFRva2VuIGFkZGVkOiAke3QucGF0aCB8fCBrZXl9YCxcbiAgICAgICAgYWZ0ZXI6IHRva2VuXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIERldGVjdCBtb2RpZmljYXRpb25zXG4gIEFycmF5LmZyb20obmV4dFRva2Vucy5lbnRyaWVzKCkpLmZvckVhY2goKFtrZXksIG5leHRUb2tlbl0pID0+IHtcbiAgICBjb25zdCBwcmV2VG9rZW4gPSBwcmV2VG9rZW5zLmdldChrZXkpO1xuICAgIGlmICghcHJldlRva2VuKSByZXR1cm47XG5cbiAgICBjb25zdCBwcmV2ID0gcHJldlRva2VuIGFzIGFueTtcbiAgICBjb25zdCBuZXh0ID0gbmV4dFRva2VuIGFzIGFueTtcblxuICAgIC8vIFBhdGggY2hhbmdlID0gcmVuYW1lIChicmVha2luZylcbiAgICBpZiAocHJldi5wYXRoICE9PSBuZXh0LnBhdGgpIHtcbiAgICAgIGNoYW5nZXMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdicmVha2luZycsXG4gICAgICAgIHNldmVyaXR5OiAnY3JpdGljYWwnLFxuICAgICAgICBjYXRlZ29yeTogJ3Rva2VuLXJlbmFtZWQnLFxuICAgICAgICBwYXRoOiBwcmV2LnBhdGgsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgVG9rZW4gcmVuYW1lZDogJHtwcmV2LnBhdGh9IFx1MjE5MiAke25leHQucGF0aH1gLFxuICAgICAgICBiZWZvcmU6IHByZXYsXG4gICAgICAgIGFmdGVyOiBuZXh0XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gVHlwZSBjaGFuZ2UgKGJyZWFraW5nKVxuICAgIGVsc2UgaWYgKHByZXYudHlwZSAhPT0gbmV4dC50eXBlKSB7XG4gICAgICBjaGFuZ2VzLnB1c2goe1xuICAgICAgICB0eXBlOiAnYnJlYWtpbmcnLFxuICAgICAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyxcbiAgICAgICAgY2F0ZWdvcnk6ICd0eXBlLWNoYW5nZWQnLFxuICAgICAgICBwYXRoOiBuZXh0LnBhdGgsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgVHlwZSBjaGFuZ2VkOiAke3ByZXYudHlwZX0gXHUyMTkyICR7bmV4dC50eXBlfWAsXG4gICAgICAgIGJlZm9yZTogcHJldixcbiAgICAgICAgYWZ0ZXI6IG5leHRcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBWYWx1ZSBjaGFuZ2UgKHBhdGNoKVxuICAgIGVsc2UgaWYgKHByZXYudmFsdWUgIT09IG5leHQudmFsdWUpIHtcbiAgICAgIC8vIENoZWNrIGlmIGFsaWFzIGNoYW5nZWRcbiAgICAgIGNvbnN0IHByZXZJc0FsaWFzID0gdHlwZW9mIHByZXYudmFsdWUgPT09ICdzdHJpbmcnICYmIHByZXYudmFsdWUuc3RhcnRzV2l0aCgneycpO1xuICAgICAgY29uc3QgbmV4dElzQWxpYXMgPSB0eXBlb2YgbmV4dC52YWx1ZSA9PT0gJ3N0cmluZycgJiYgbmV4dC52YWx1ZS5zdGFydHNXaXRoKCd7Jyk7XG5cbiAgICAgIGlmIChwcmV2SXNBbGlhcyB8fCBuZXh0SXNBbGlhcykge1xuICAgICAgICBjaGFuZ2VzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdwYXRjaCcsXG4gICAgICAgICAgc2V2ZXJpdHk6ICdpbmZvJyxcbiAgICAgICAgICBjYXRlZ29yeTogJ2FsaWFzLWNoYW5nZWQnLFxuICAgICAgICAgIHBhdGg6IG5leHQucGF0aCxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYEFsaWFzIGNoYW5nZWQ6ICR7cHJldi52YWx1ZX0gXHUyMTkyICR7bmV4dC52YWx1ZX1gLFxuICAgICAgICAgIGJlZm9yZTogcHJldixcbiAgICAgICAgICBhZnRlcjogbmV4dFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoYW5nZXMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3BhdGNoJyxcbiAgICAgICAgICBzZXZlcml0eTogJ2luZm8nLFxuICAgICAgICAgIGNhdGVnb3J5OiAndmFsdWUtY2hhbmdlZCcsXG4gICAgICAgICAgcGF0aDogbmV4dC5wYXRoLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgVmFsdWUgdXBkYXRlZDogJHtwcmV2LnZhbHVlfSBcdTIxOTIgJHtuZXh0LnZhbHVlfWAsXG4gICAgICAgICAgYmVmb3JlOiBwcmV2LFxuICAgICAgICAgIGFmdGVyOiBuZXh0XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBEZXNjcmlwdGlvbiBjaGFuZ2UgKHBhdGNoKVxuICAgIGVsc2UgaWYgKHByZXYuZGVzY3JpcHRpb24gIT09IG5leHQuZGVzY3JpcHRpb24pIHtcbiAgICAgIGNoYW5nZXMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdwYXRjaCcsXG4gICAgICAgIHNldmVyaXR5OiAnaW5mbycsXG4gICAgICAgIGNhdGVnb3J5OiAnZGVzY3JpcHRpb24tY2hhbmdlZCcsXG4gICAgICAgIHBhdGg6IG5leHQucGF0aCxcbiAgICAgICAgZGVzY3JpcHRpb246IGBEZXNjcmlwdGlvbiB1cGRhdGVkOiAke3ByZXYuZGVzY3JpcHRpb24gfHwgJyhlbXB0eSknfSBcdTIxOTIgJHtuZXh0LmRlc2NyaXB0aW9uIHx8ICcoZW1wdHkpJ31gLFxuICAgICAgICBiZWZvcmU6IHByZXYsXG4gICAgICAgIGFmdGVyOiBuZXh0XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIERldGVjdCBjb2xsZWN0aW9uIGFuZCBtb2RlIGNoYW5nZXNcbiAgY2hhbmdlcy5wdXNoKC4uLmRldGVjdENvbGxlY3Rpb25DaGFuZ2VzKHByZXZCYXNlbGluZSwgbmV4dEJhc2VsaW5lKSk7XG5cbiAgcmV0dXJuIGNoYW5nZXM7XG59XG5cbi8qKlxuICogRGV0ZWN0IGNvbGxlY3Rpb24gYW5kIG1vZGUgYWRkaXRpb25zIGFuZCBkZWxldGlvbnNcbiAqXG4gKiBFeHRyYWN0cyB1bmlxdWUgY29sbGVjdGlvbnMgYW5kIG1vZGVzIGZyb20gdG9rZW4gZGF0YVxuICogYW5kIGNvbXBhcmVzIHRoZW0gdG8gZGV0ZWN0IHN0cnVjdHVyYWwgY2hhbmdlc1xuICpcbiAqIEBwYXJhbSBwcmV2QmFzZWxpbmUgLSBQcmV2aW91cyBiYXNlbGluZSB0b2tlbnNcbiAqIEBwYXJhbSBuZXh0QmFzZWxpbmUgLSBOZXcgYmFzZWxpbmUgdG9rZW5zXG4gKiBAcmV0dXJucyBBcnJheSBvZiBjb2xsZWN0aW9uL21vZGUgY2hhbmdlc1xuICovXG5mdW5jdGlvbiBkZXRlY3RDb2xsZWN0aW9uQ2hhbmdlcyhwcmV2QmFzZWxpbmU6IGFueSwgbmV4dEJhc2VsaW5lOiBhbnkpOiBUb2tlbkNoYW5nZVtdIHtcbiAgY29uc3QgY2hhbmdlczogVG9rZW5DaGFuZ2VbXSA9IFtdO1xuXG4gIGNvbnN0IHByZXZDb2xsZWN0aW9ucyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBuZXh0Q29sbGVjdGlvbnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgcHJldk1vZGVzID0gbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpO1xuICBjb25zdCBuZXh0TW9kZXMgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XG5cbiAgLy8gRXh0cmFjdCBjb2xsZWN0aW9ucyBhbmQgbW9kZXMgZnJvbSBwcmV2aW91cyBiYXNlbGluZVxuICBPYmplY3QudmFsdWVzKHByZXZCYXNlbGluZSkuZm9yRWFjaCgodG9rZW46IGFueSkgPT4ge1xuICAgIGlmICh0b2tlbi5jb2xsZWN0aW9uKSB7XG4gICAgICBwcmV2Q29sbGVjdGlvbnMuYWRkKHRva2VuLmNvbGxlY3Rpb24pO1xuICAgICAgaWYgKCFwcmV2TW9kZXMuaGFzKHRva2VuLmNvbGxlY3Rpb24pKSB7XG4gICAgICAgIHByZXZNb2Rlcy5zZXQodG9rZW4uY29sbGVjdGlvbiwgbmV3IFNldCgpKTtcbiAgICAgIH1cbiAgICAgIGlmICh0b2tlbi5tb2RlKSB7XG4gICAgICAgIHByZXZNb2Rlcy5nZXQodG9rZW4uY29sbGVjdGlvbikhLmFkZCh0b2tlbi5tb2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIC8vIEV4dHJhY3QgY29sbGVjdGlvbnMgYW5kIG1vZGVzIGZyb20gbmV3IGJhc2VsaW5lXG4gIE9iamVjdC52YWx1ZXMobmV4dEJhc2VsaW5lKS5mb3JFYWNoKCh0b2tlbjogYW55KSA9PiB7XG4gICAgaWYgKHRva2VuLmNvbGxlY3Rpb24pIHtcbiAgICAgIG5leHRDb2xsZWN0aW9ucy5hZGQodG9rZW4uY29sbGVjdGlvbik7XG4gICAgICBpZiAoIW5leHRNb2Rlcy5oYXModG9rZW4uY29sbGVjdGlvbikpIHtcbiAgICAgICAgbmV4dE1vZGVzLnNldCh0b2tlbi5jb2xsZWN0aW9uLCBuZXcgU2V0KCkpO1xuICAgICAgfVxuICAgICAgaWYgKHRva2VuLm1vZGUpIHtcbiAgICAgICAgbmV4dE1vZGVzLmdldCh0b2tlbi5jb2xsZWN0aW9uKSEuYWRkKHRva2VuLm1vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLy8gQ29sbGVjdGlvbiBkZWxldGlvbnMgKGJyZWFraW5nKVxuICBBcnJheS5mcm9tKHByZXZDb2xsZWN0aW9ucykuZm9yRWFjaChjb2xsZWN0aW9uID0+IHtcbiAgICBpZiAoIW5leHRDb2xsZWN0aW9ucy5oYXMoY29sbGVjdGlvbikpIHtcbiAgICAgIGNoYW5nZXMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdicmVha2luZycsXG4gICAgICAgIHNldmVyaXR5OiAnY3JpdGljYWwnLFxuICAgICAgICBjYXRlZ29yeTogJ2NvbGxlY3Rpb24tZGVsZXRlZCcsXG4gICAgICAgIHBhdGg6IGNvbGxlY3Rpb24sXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgQ29sbGVjdGlvbiBkZWxldGVkOiAke2NvbGxlY3Rpb259YFxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBDb2xsZWN0aW9uIGFkZGl0aW9ucyAobWlub3IpXG4gIEFycmF5LmZyb20obmV4dENvbGxlY3Rpb25zKS5mb3JFYWNoKGNvbGxlY3Rpb24gPT4ge1xuICAgIGlmICghcHJldkNvbGxlY3Rpb25zLmhhcyhjb2xsZWN0aW9uKSkge1xuICAgICAgY2hhbmdlcy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2FkZGl0aW9uJyxcbiAgICAgICAgc2V2ZXJpdHk6ICdpbmZvJyxcbiAgICAgICAgY2F0ZWdvcnk6ICdjb2xsZWN0aW9uLWFkZGVkJyxcbiAgICAgICAgcGF0aDogY29sbGVjdGlvbixcbiAgICAgICAgZGVzY3JpcHRpb246IGBDb2xsZWN0aW9uIGFkZGVkOiAke2NvbGxlY3Rpb259YFxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBNb2RlIGRlbGV0aW9ucyAoYnJlYWtpbmcpXG4gIEFycmF5LmZyb20ocHJldk1vZGVzLmVudHJpZXMoKSkuZm9yRWFjaCgoW2NvbGxlY3Rpb24sIG1vZGVzXSkgPT4ge1xuICAgIGNvbnN0IG5leHRDb2xsZWN0aW9uTW9kZXMgPSBuZXh0TW9kZXMuZ2V0KGNvbGxlY3Rpb24pO1xuICAgIGlmICghbmV4dENvbGxlY3Rpb25Nb2RlcykgcmV0dXJuO1xuXG4gICAgQXJyYXkuZnJvbShtb2RlcykuZm9yRWFjaChtb2RlID0+IHtcbiAgICAgIGlmICghbmV4dENvbGxlY3Rpb25Nb2Rlcy5oYXMobW9kZSkpIHtcbiAgICAgICAgY2hhbmdlcy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnYnJlYWtpbmcnLFxuICAgICAgICAgIHNldmVyaXR5OiAnY3JpdGljYWwnLFxuICAgICAgICAgIGNhdGVnb3J5OiAnbW9kZS1kZWxldGVkJyxcbiAgICAgICAgICBwYXRoOiBgJHtjb2xsZWN0aW9ufS4ke21vZGV9YCxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYE1vZGUgZGVsZXRlZDogJHttb2RlfSBmcm9tIGNvbGxlY3Rpb24gJHtjb2xsZWN0aW9ufWBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIE1vZGUgYWRkaXRpb25zIChtaW5vcilcbiAgQXJyYXkuZnJvbShuZXh0TW9kZXMuZW50cmllcygpKS5mb3JFYWNoKChbY29sbGVjdGlvbiwgbW9kZXNdKSA9PiB7XG4gICAgY29uc3QgcHJldkNvbGxlY3Rpb25Nb2RlcyA9IHByZXZNb2Rlcy5nZXQoY29sbGVjdGlvbik7XG4gICAgaWYgKCFwcmV2Q29sbGVjdGlvbk1vZGVzKSByZXR1cm47XG5cbiAgICBBcnJheS5mcm9tKG1vZGVzKS5mb3JFYWNoKG1vZGUgPT4ge1xuICAgICAgaWYgKCFwcmV2Q29sbGVjdGlvbk1vZGVzLmhhcyhtb2RlKSkge1xuICAgICAgICBjaGFuZ2VzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdhZGRpdGlvbicsXG4gICAgICAgICAgc2V2ZXJpdHk6ICdpbmZvJyxcbiAgICAgICAgICBjYXRlZ29yeTogJ21vZGUtYWRkZWQnLFxuICAgICAgICAgIHBhdGg6IGAke2NvbGxlY3Rpb259LiR7bW9kZX1gLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgTW9kZSBhZGRlZDogJHttb2RlfSB0byBjb2xsZWN0aW9uICR7Y29sbGVjdGlvbn1gXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gY2hhbmdlcztcbn1cblxuLyoqXG4gKiBCdW1wIHZlcnNpb24gYWNjb3JkaW5nIHRvIFNlbVZlciBydWxlc1xuICpcbiAqIEBwYXJhbSB2ZXJzaW9uIC0gQ3VycmVudCB2ZXJzaW9uIHN0cmluZyAoZS5nLiwgXCIxLjAuMFwiKVxuICogQHBhcmFtIHR5cGUgLSBUeXBlIG9mIGJ1bXAgKG1ham9yLCBtaW5vciwgcGF0Y2gsIG5vbmUpXG4gKiBAcmV0dXJucyBOZXcgdmVyc2lvbiBzdHJpbmdcbiAqL1xuZnVuY3Rpb24gYnVtcFZlcnNpb24odmVyc2lvbjogc3RyaW5nLCB0eXBlOiAnbWFqb3InIHwgJ21pbm9yJyB8ICdwYXRjaCcgfCAnbm9uZScpOiBzdHJpbmcge1xuICBjb25zdCBbbWFqb3IsIG1pbm9yLCBwYXRjaF0gPSB2ZXJzaW9uLnNwbGl0KCcuJykubWFwKE51bWJlcik7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAnbWFqb3InOlxuICAgICAgcmV0dXJuIGAke21ham9yICsgMX0uMC4wYDtcbiAgICBjYXNlICdtaW5vcic6XG4gICAgICByZXR1cm4gYCR7bWFqb3J9LiR7bWlub3IgKyAxfS4wYDtcbiAgICBjYXNlICdwYXRjaCc6XG4gICAgICByZXR1cm4gYCR7bWFqb3J9LiR7bWlub3J9LiR7cGF0Y2ggKyAxfWA7XG4gICAgY2FzZSAnbm9uZSc6XG4gICAgICByZXR1cm4gdmVyc2lvbjtcbiAgfVxufVxuXG4vKipcbiAqIEdlbmVyYXRlIGh1bWFuLXJlYWRhYmxlIHN1bW1hcnkgb2YgY2hhbmdlc1xuICpcbiAqIEBwYXJhbSBicmVha2luZyAtIE51bWJlciBvZiBicmVha2luZyBjaGFuZ2VzXG4gKiBAcGFyYW0gYWRkaXRpb25zIC0gTnVtYmVyIG9mIGFkZGl0aW9uc1xuICogQHBhcmFtIHBhdGNoZXMgLSBOdW1iZXIgb2YgcGF0Y2hlc1xuICogQHJldHVybnMgU3VtbWFyeSBzdHJpbmdcbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVTdW1tYXJ5KGJyZWFraW5nOiBudW1iZXIsIGFkZGl0aW9uczogbnVtYmVyLCBwYXRjaGVzOiBudW1iZXIpOiBzdHJpbmcge1xuICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcblxuICBpZiAoYnJlYWtpbmcgPiAwKSB7XG4gICAgcGFydHMucHVzaChgJHticmVha2luZ30gYnJlYWtpbmcgY2hhbmdlJHticmVha2luZyA+IDEgPyAncycgOiAnJ31gKTtcbiAgfVxuICBpZiAoYWRkaXRpb25zID4gMCkge1xuICAgIHBhcnRzLnB1c2goYCR7YWRkaXRpb25zfSBhZGRpdGlvbiR7YWRkaXRpb25zID4gMSA/ICdzJyA6ICcnfWApO1xuICB9XG4gIGlmIChwYXRjaGVzID4gMCkge1xuICAgIHBhcnRzLnB1c2goYCR7cGF0Y2hlc30gdXBkYXRlJHtwYXRjaGVzID4gMSA/ICdzJyA6ICcnfWApO1xuICB9XG5cbiAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiAnTm8gY2hhbmdlcyBkZXRlY3RlZCc7XG4gIH1cblxuICByZXR1cm4gcGFydHMuam9pbignLCAnKTtcbn1cblxuLyoqXG4gKiBQYXJzZSB2ZXJzaW9uIHN0cmluZyB0byBjb21wb25lbnRzXG4gKlxuICogQHBhcmFtIHZlcnNpb24gLSBWZXJzaW9uIHN0cmluZyAoZS5nLiwgXCIxLjIuM1wiKVxuICogQHJldHVybnMgVmVyc2lvbiBjb21wb25lbnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVZlcnNpb24odmVyc2lvbjogc3RyaW5nKTogeyBtYWpvcjogbnVtYmVyOyBtaW5vcjogbnVtYmVyOyBwYXRjaDogbnVtYmVyIH0ge1xuICBjb25zdCBbbWFqb3IsIG1pbm9yLCBwYXRjaF0gPSB2ZXJzaW9uLnNwbGl0KCcuJykubWFwKE51bWJlcik7XG4gIHJldHVybiB7IG1ham9yLCBtaW5vciwgcGF0Y2ggfTtcbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byB2ZXJzaW9uc1xuICpcbiAqIEBwYXJhbSBhIC0gRmlyc3QgdmVyc2lvbiBzdHJpbmdcbiAqIEBwYXJhbSBiIC0gU2Vjb25kIHZlcnNpb24gc3RyaW5nXG4gKiBAcmV0dXJucyBOZWdhdGl2ZSBpZiBhIDwgYiwgMCBpZiBlcXVhbCwgcG9zaXRpdmUgaWYgYSA+IGJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVWZXJzaW9ucyhhOiBzdHJpbmcsIGI6IHN0cmluZyk6IG51bWJlciB7XG4gIGNvbnN0IHZBID0gcGFyc2VWZXJzaW9uKGEpO1xuICBjb25zdCB2QiA9IHBhcnNlVmVyc2lvbihiKTtcblxuICBpZiAodkEubWFqb3IgIT09IHZCLm1ham9yKSByZXR1cm4gdkEubWFqb3IgLSB2Qi5tYWpvcjtcbiAgaWYgKHZBLm1pbm9yICE9PSB2Qi5taW5vcikgcmV0dXJuIHZBLm1pbm9yIC0gdkIubWlub3I7XG4gIHJldHVybiB2QS5wYXRjaCAtIHZCLnBhdGNoO1xufVxuIiwgIi8qKlxuICogVG9rZW4gVmF1bHQgLSBGaWdtYSBQbHVnaW4gRW50cnkgUG9pbnRcbiAqIEltcG9ydCwgZXhwb3J0LCBhbmQgc3luYyBkZXNpZ24gdG9rZW5zIGFzIEZpZ21hIFZhcmlhYmxlc1xuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgZm9yIHRoZSBwbHVnaW4gYmFja2VuZC5cbiAqIEFsbCBidXNpbmVzcyBsb2dpYyBpcyBkZWxlZ2F0ZWQgdG8gc3BlY2lhbGl6ZWQgbW9kdWxlcy5cbiAqXG4gKiBAbW9kdWxlIGNvZGVcbiAqL1xuXG5pbXBvcnQgeyBoYW5kbGVNZXNzYWdlIH0gZnJvbSAnLi9iYWNrZW5kL2hhbmRsZXJzL21lc3NhZ2Utcm91dGVyLmpzJztcblxuLyoqXG4gKiBJbml0aWFsaXplIHBsdWdpbiBVSVxuICogU2hvd3MgdGhlIHBsdWdpbiB3aW5kb3cgd2l0aCBjb25maWd1cmVkIGRpbWVuc2lvbnMgYW5kIHRoZW1lIHN1cHBvcnRcbiAqL1xuZmlnbWEuc2hvd1VJKF9faHRtbF9fLCB7XG4gIHdpZHRoOiA2MDAsXG4gIGhlaWdodDogNzAwLFxuICB0aGVtZUNvbG9yczogdHJ1ZVxufSk7XG5cbi8qKlxuICogTWVzc2FnZSBoYW5kbGVyXG4gKiBSb3V0ZXMgYWxsIG1lc3NhZ2VzIGZyb20gVUkgdG8gdGhlIG1lc3NhZ2Ugcm91dGVyXG4gKi9cbmZpZ21hLnVpLm9ubWVzc2FnZSA9IGFzeW5jIChtc2cpID0+IHtcbiAgYXdhaXQgaGFuZGxlTWVzc2FnZShtc2cpO1xufTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBK0JPLFNBQVMsd0JBQXdCLFdBQWdEO0FBQ3RGLFFBQU0sVUFBdUQ7QUFBQSxJQUMzRCxTQUFTO0FBQUEsSUFDVCxTQUFTO0FBQUEsSUFDVCxVQUFVO0FBQUEsSUFDVixXQUFXO0FBQUEsRUFDYjtBQUNBLFNBQU8sUUFBUSxTQUFTLEtBQUs7QUFDL0I7QUF2Q0E7QUFBQTtBQUFBO0FBQUE7QUFBQTs7O0FDK0VPLFNBQVMsU0FBUyxPQUEyQjtBQUNsRCxRQUFNLFFBQVEsQ0FBQyxVQUFrQjtBQUMvQixVQUFNLE1BQU0sS0FBSyxNQUFNLFFBQVEs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TztBQUNkLFlBQVEsTUFBTSx3QkFBd0IsS0FBSztBQUMzQyxnQkFBWTtBQUFBLE1BQ1YsTUFBTTtBQUFBLE1BQ04sU0FBUyxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQUEsSUFDaEUsQ0FBQztBQUNELFVBQU0sT0FBTywrQkFBK0IsRUFBRSxPQUFPLEtBQUssQ0FBQztBQUFBLEVBQzdEO0FBQ0Y7QUFXQSxlQUFlLHNCQUFzQixTQUFpQixTQUF1QztBQUMzRixNQUFJO0FBQ0YsWUFBUSxJQUFJLDJDQUEyQyxPQUFPO0FBQzlELFVBQU0sT0FBTyxZQUFZO0FBR3pCLFVBQU0sV0FBVyxNQUFNLGVBQWUsSUFBSTtBQUcxQyxRQUFJLENBQUMsU0FBUyxXQUFXO0FBQ3ZCLGVBQVMsWUFBWSxDQUFDO0FBQUEsSUFDeEI7QUFDQSxhQUFTLFVBQVUsVUFBVTtBQUM3QixhQUFTLFVBQVUsWUFBVyxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUdyRCxVQUFNLFNBQVMsTUFBTSxXQUFXLFFBQVE7QUFFeEMsZ0JBQVk7QUFBQSxNQUNWLE1BQU07QUFBQSxNQUNOLFFBQVEsT0FBTztBQUFBLE1BQ2YsZUFBZSxPQUFPO0FBQUEsSUFDeEIsQ0FBQztBQUVELFVBQU0sT0FBTyxrQkFBYSxPQUFPLFNBQVMsT0FBTyxhQUFhLFlBQVk7QUFBQSxFQUM1RSxTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sNEJBQTRCLEtBQUs7QUFDL0MsZ0JBQVk7QUFBQSxNQUNWLE1BQU07QUFBQSxNQUNOLFNBQVMsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSztBQUFBLElBQ2hFLENBQUM7QUFDRCxVQUFNLE9BQU8sZUFBZSxFQUFFLE9BQU8sS0FBSyxDQUFDO0FBQUEsRUFDN0M7QUFDRjtBQVNBLFNBQVMsZUFBcUI7QUFDNUIsUUFBTSxZQUFZO0FBQ3BCOzs7QVc3cUJBLE1BQU0sT0FBTyxVQUFVO0FBQUEsRUFDckIsT0FBTztBQUFBLEVBQ1AsUUFBUTtBQUFBLEVBQ1IsYUFBYTtBQUNmLENBQUM7QUFNRCxNQUFNLEdBQUcsWUFBWSxPQUFPLFFBQVE7QUFDbEMsUUFBTSxjQUFjLEdBQUc7QUFDekI7IiwKICAibmFtZXMiOiBbImZpbmRSZWdpc3RyeU5vZGUiLCAibG9hZENodW5rc0Zyb21Ob2RlIiwgInVuY2h1bmtEYXRhIiwgIlBMVUdJTl9OQU1FU1BBQ0UiLCAibWFwVG9GaWdtYVR5cGUiLCAicGFyc2VWYWx1ZSIsICJwYXJzZUNvbG9yIiwgImlzVG9rZW5WYWx1ZSIsICJpbmZlclRva2VuVHlwZSIsICJpc1Rva2VuVmFsdWUiLCAicHJldiIsICJuZXh0IiwgImRldGVjdEJhc2VsaW5lRm9ybWF0IiwgInZhbGlkYXRlQmFzZWxpbmUiLCAiaW1wb3J0QmFzZWxpbmUiLCAiZXhwb3J0QmFzZWxpbmUiLCAic3luY1RvTm9kZSIsICJidWlsZEJhc2VsaW5lU25hcHNob3QiXQp9Cg==
