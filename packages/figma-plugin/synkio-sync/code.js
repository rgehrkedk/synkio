"use strict";
(() => {
  // code.ts
  var NAMESPACE = "synkio";
  var MAX_CHUNK_SIZE = 9e4;
  function resolveValue(value, type) {
    if (typeof value === "object" && "type" in value && value.type === "VARIABLE_ALIAS") {
      return { $ref: value.id };
    }
    if (type === "COLOR" && typeof value === "object" && "r" in value) {
      const { r, g, b, a } = value;
      const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
      if (a !== void 0 && a < 1) {
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a.toFixed(2)})`;
      }
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    return value;
  }
  async function collectTokens() {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const tokens = [];
    for (const collection of collections) {
      const isSingleMode = collection.modes.length === 1;
      const modeMap = new Map(collection.modes.map((m) => {
        const normalizedName = isSingleMode && m.name === "Mode 1" ? "value" : m.name;
        return [m.modeId, normalizedName];
      }));
      for (const variableId of collection.variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        if (!variable)
          continue;
        const description = variable.description || void 0;
        const scopes = variable.scopes && variable.scopes.length > 0 ? variable.scopes : void 0;
        const codeSyntax = variable.codeSyntax && Object.keys(variable.codeSyntax).length > 0 ? variable.codeSyntax : void 0;
        for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
          const modeName = modeMap.get(modeId) || modeId;
          const entry = {
            variableId: variable.id,
            collection: collection.name,
            mode: modeName,
            path: variable.name.replace(/\//g, "."),
            // Convert Figma path separators
            value: resolveValue(value, variable.resolvedType),
            type: variable.resolvedType.toLowerCase()
          };
          if (description)
            entry.description = description;
          if (scopes)
            entry.scopes = scopes;
          if (codeSyntax)
            entry.codeSyntax = codeSyntax;
          tokens.push(entry);
        }
      }
    }
    return tokens;
  }
  function storeData(data) {
    const json = JSON.stringify(data);
    const existingCount = figma.root.getSharedPluginData(NAMESPACE, "chunkCount");
    if (existingCount) {
      const count = parseInt(existingCount, 10);
      for (let i = 0; i < count; i++) {
        figma.root.setSharedPluginData(NAMESPACE, `chunk_${i}`, "");
      }
    }
    const chunks = [];
    for (let i = 0; i < json.length; i += MAX_CHUNK_SIZE) {
      chunks.push(json.slice(i, i + MAX_CHUNK_SIZE));
    }
    figma.root.setSharedPluginData(NAMESPACE, "chunkCount", String(chunks.length));
    chunks.forEach((chunk, i) => {
      figma.root.setSharedPluginData(NAMESPACE, `chunk_${i}`, chunk);
    });
    figma.root.setSharedPluginData(NAMESPACE, "version", data.version);
    figma.root.setSharedPluginData(NAMESPACE, "timestamp", data.timestamp);
    figma.root.setSharedPluginData(NAMESPACE, "tokenCount", String(data.tokens.length));
  }
  async function sync() {
    try {
      figma.notify("Syncing variables...", { timeout: 1e3 });
      const tokens = await collectTokens();
      if (tokens.length === 0) {
        figma.notify("No variables found", { error: true });
        figma.closePlugin();
        return;
      }
      const data = {
        version: "2.0.0",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        tokens
      };
      storeData(data);
      figma.notify(`\u2713 Synced ${tokens.length} tokens`, { timeout: 2e3 });
      figma.closePlugin();
    } catch (error) {
      figma.notify(`Error: ${error}`, { error: true });
      figma.closePlugin();
    }
  }
  sync();
})();
