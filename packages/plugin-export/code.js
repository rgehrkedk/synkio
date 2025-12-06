"use strict";
(() => {
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

  // src/code.ts
  figma.showUI(__html__, {
    width: 600,
    height: 700,
    themeColors: true
  });
  figma.ui.onmessage = async (msg) => {
    if (msg.type === "get-last-sync") {
      try {
        const syncInfo = await getLastSyncInfo();
        figma.ui.postMessage(__spreadValues({
          type: "last-sync-loaded"
        }, syncInfo));
      } catch (error) {
        console.error("Error loading last sync info:", error);
        figma.ui.postMessage({
          type: "last-sync-loaded",
          exists: false
        });
      }
    }
    if (msg.type === "get-collections") {
      try {
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        const allVariables = await figma.variables.getLocalVariablesAsync();
        const collectionData = collections.map((col) => ({
          id: col.id,
          name: col.name,
          modeCount: col.modes.length,
          variableCount: allVariables.filter((v) => v.variableCollectionId === col.id).length
        }));
        figma.ui.postMessage({
          type: "collections-loaded",
          collections: collectionData
        });
      } catch (error) {
        console.error("Error loading collections:", error);
      }
    }
    if (msg.type === "import-tokens") {
      try {
        const { collections } = msg.data;
        await importTokens(collections);
        figma.ui.postMessage({
          type: "import-complete",
          message: "Tokens imported successfully!"
        });
      } catch (error) {
        figma.ui.postMessage({
          type: "import-error",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
    if (msg.type === "export-baseline") {
      try {
        console.log("Export baseline requested");
        figma.notify("Exporting baseline snapshot...");
        const collectionIds = msg.collectionIds || null;
        const baseline = await exportBaselineSnapshot(collectionIds);
        const jsonString = JSON.stringify(baseline);
        console.log("Export complete, data size:", jsonString.length, "bytes");
        figma.ui.postMessage({
          type: "export-complete",
          data: baseline
        });
        figma.notify("Export complete!");
      } catch (error) {
        console.error("Export error:", error);
        figma.ui.postMessage({
          type: "export-error",
          message: error instanceof Error ? error.message : String(error)
        });
        figma.notify("Export failed: " + (error instanceof Error ? error.message : String(error)), { error: true });
      }
    }
    if (msg.type === "sync-to-node") {
      try {
        console.log("Sync to Node requested");
        figma.notify("Syncing registry to node...");
        const collectionIds = msg.collectionIds || null;
        const result = await syncRegistryToNode(collectionIds);
        figma.ui.postMessage({
          type: "sync-complete",
          nodeId: result.nodeId,
          variableCount: result.variableCount
        });
        figma.notify(`\u2713 Synced ${result.variableCount} variables to node!`);
      } catch (error) {
        console.error("Sync error:", error);
        figma.ui.postMessage({
          type: "sync-error",
          message: error instanceof Error ? error.message : String(error)
        });
        figma.notify("Sync failed: " + (error instanceof Error ? error.message : String(error)), { error: true });
      }
    }
    if (msg.type === "cancel") {
      figma.closePlugin();
    }
  };
  async function importTokens(collectionConfigs) {
    figma.notify("Starting token import...");
    for (const config of collectionConfigs) {
      await createVariableCollection(config);
    }
    figma.notify("Resolving aliases...");
    await resolveAliases();
    figma.notify("\u2713 Import complete!");
  }
  async function createVariableCollection(config) {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    let collection = collections.find((c) => c.name === config.name);
    if (!collection) {
      collection = figma.variables.createVariableCollection(config.name);
    }
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
        await importTokensForMode(collection, modeId, file.content);
      }
    } else {
      const defaultMode = collection.modes[0];
      const mergedTokens = {};
      for (const file of config.files) {
        Object.assign(mergedTokens, file.content);
      }
      await importTokensForMode(collection, defaultMode.modeId, mergedTokens);
    }
  }
  async function importTokensForMode(collection, modeId, tokens, prefix = "") {
    for (const [key, value] of Object.entries(tokens)) {
      if (key === "value" || key === "type" || key === "description") {
        continue;
      }
      const path = prefix ? `${prefix}/${key}` : key;
      if (isTokenValue(value)) {
        await createVariable(collection, modeId, path, value);
      } else if (typeof value === "object" && value !== null) {
        await importTokensForMode(collection, modeId, value, path);
      }
    }
  }
  function isTokenValue(obj) {
    return obj && typeof obj === "object" && "value" in obj && "type" in obj;
  }
  async function createVariable(collection, modeId, path, token) {
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
    const resolvedValue = parseTokenValue(token.value, token.type, variable, modeId);
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
  }
  function getDefaultValueForType(type) {
    switch (type) {
      case "COLOR":
        return { r: 0, g: 0, b: 0 };
      // Black
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
  function parseTokenValue(value, type, variable, modeId) {
    if (typeof value === "string" && value.includes("{")) {
      if (value.startsWith("{") && value.endsWith("}") && value.indexOf("}") === value.length - 1) {
        if (variable && modeId) {
          aliasReferences.push({
            variable,
            modeId,
            aliasPath: value
          });
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
  function parseColor(value) {
    if (!value || typeof value !== "string") return null;
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
    if (typeof value === "number") return value;
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
  var aliasReferences = [];
  async function resolveAliases() {
    const allVariables = await figma.variables.getLocalVariablesAsync();
    const variableMap = /* @__PURE__ */ new Map();
    for (const variable of allVariables) {
      variableMap.set(variable.name, variable);
    }
    for (const ref of aliasReferences) {
      const aliasPath = ref.aliasPath.replace(/^{/, "").replace(/}$/, "").replace(/\./g, "/");
      const targetVariable = variableMap.get(aliasPath);
      if (targetVariable) {
        try {
          ref.variable.setValueForMode(ref.modeId, {
            type: "VARIABLE_ALIAS",
            id: targetVariable.id
          });
        } catch (error) {
          console.error(`Failed to create alias ${ref.variable.name} -> ${aliasPath}:`, error instanceof Error ? error.message : String(error));
        }
      } else {
        console.warn(`Alias target not found: ${aliasPath} (referenced by ${ref.variable.name})`);
      }
    }
    aliasReferences.length = 0;
  }
  function mapFigmaTypeToTokenType(figmaType) {
    const typeMap = {
      "COLOR": "color",
      "FLOAT": "number",
      "STRING": "string",
      "BOOLEAN": "boolean"
    };
    return typeMap[figmaType] || "unknown";
  }
  function rgbToHex(color) {
    const toHex = (value) => {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }
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
  async function exportBaselineSnapshot(filterCollectionIds = null) {
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
  var PLUGIN_NAMESPACE = "token_vault";
  var LEGACY_NAMESPACE = "design_token_importer";
  var REGISTRY_NODE_NAME = "_token_registry";
  async function getLastSyncInfo() {
    for (const page of figma.root.children) {
      for (const node of page.children) {
        if (node.type === "FRAME" && node.name === REGISTRY_NODE_NAME) {
          let updatedAt = node.getSharedPluginData(PLUGIN_NAMESPACE, "updatedAt");
          let variableCount = node.getSharedPluginData(PLUGIN_NAMESPACE, "variableCount");
          if (!updatedAt) {
            updatedAt = node.getSharedPluginData(LEGACY_NAMESPACE, "updatedAt");
            variableCount = node.getSharedPluginData(LEGACY_NAMESPACE, "variableCount");
          }
          if (updatedAt) {
            return {
              exists: true,
              nodeId: node.id,
              updatedAt,
              variableCount: variableCount ? parseInt(variableCount, 10) : void 0
            };
          }
        }
      }
    }
    return { exists: false };
  }
  async function syncRegistryToNode(filterCollectionIds = null) {
    console.log("[Registry] Syncing to node...");
    const exportData = await exportBaselineSnapshot(filterCollectionIds);
    const variableCount = Object.keys(exportData.baseline).length;
    console.log(`[Registry] Exported ${variableCount} variables`);
    let frame = null;
    for (const node of figma.currentPage.children) {
      if (node.type === "FRAME" && node.name === REGISTRY_NODE_NAME) {
        frame = node;
        break;
      }
    }
    if (!frame) {
      console.log("[Registry] Creating new registry node...");
      frame = figma.createFrame();
      frame.name = REGISTRY_NODE_NAME;
      frame.resize(100, 100);
      frame.x = -1e3;
      frame.y = -1e3;
      frame.visible = false;
      frame.locked = true;
    }
    const jsonData = JSON.stringify(exportData);
    const CHUNK_SIZE = 9e4;
    const chunks = [];
    for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
      chunks.push(jsonData.slice(i, i + CHUNK_SIZE));
    }
    console.log(`[Registry] Splitting ${jsonData.length} bytes into ${chunks.length} chunks`);
    for (let i = 0; i < 20; i++) {
      frame.setSharedPluginData(PLUGIN_NAMESPACE, `registry_${i}`, "");
    }
    for (let i = 0; i < chunks.length; i++) {
      frame.setSharedPluginData(PLUGIN_NAMESPACE, `registry_${i}`, chunks[i]);
    }
    frame.setSharedPluginData(PLUGIN_NAMESPACE, "chunkCount", String(chunks.length));
    frame.setSharedPluginData(PLUGIN_NAMESPACE, "updatedAt", (/* @__PURE__ */ new Date()).toISOString());
    frame.setSharedPluginData(PLUGIN_NAMESPACE, "variableCount", String(variableCount));
    console.log(`[Registry] Saved ${jsonData.length} bytes in ${chunks.length} chunks to node ${frame.id}`);
    return {
      nodeId: frame.id,
      variableCount
    };
  }
})();
