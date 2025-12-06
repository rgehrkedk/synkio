"use strict";
// E-Boks Design Token Sync Plugin
// Bidirectional sync between Figma Variables and Design Tokens
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// =============================================================================
// UTILITIES
// =============================================================================
function parseCollectionType(name) {
    const lower = name.toLowerCase();
    if (lower === 'brand' || lower.startsWith('brand/'))
        return 'brand';
    if (lower === 'theme' || lower.startsWith('theme/'))
        return 'theme';
    if (lower === 'globals')
        return 'globals';
    return 'unknown';
}
function rgbToHex(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    if ('a' in color && color.a < 1) {
        return '#' + hex + Math.round(color.a * 255).toString(16).padStart(2, '0');
    }
    return '#' + hex;
}
function hexToRgb(hex) {
    const clean = hex.replace('#', '').toLowerCase();
    if (!/^[0-9a-f]+$/.test(clean))
        return null;
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
function getTokenType(resolvedType) {
    const map = { COLOR: 'color', FLOAT: 'number', STRING: 'string', BOOLEAN: 'boolean' };
    return map[resolvedType] || 'unknown';
}
function tokenTypeToFigmaType(type) {
    const map = { color: 'COLOR', number: 'FLOAT', string: 'STRING', boolean: 'BOOLEAN' };
    return map[type] || 'STRING';
}
function setNestedToken(obj, path, value) {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]])
            current[path[i]] = {};
        current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
}
function parseVariableId(id) {
    const invalid = { collection: '', mode: '', figmaId: '', valid: false };
    if (!id)
        return invalid;
    const parts = id.split(':');
    if (parts.length < 5 || parts[2] !== 'VariableID')
        return invalid;
    if (!['brand', 'theme', 'globals'].includes(parts[0]))
        return invalid;
    return { collection: parts[0], mode: parts[1], figmaId: parts.slice(2).join(':'), valid: true };
}
function isAlias(value) {
    return typeof value === 'string' && value.startsWith('{') && value.endsWith('}');
}
function parseAlias(alias) {
    return alias.slice(1, -1).trim();
}
// =============================================================================
// EXPORT
// =============================================================================
function resolveValue(variable, modeId) {
    return __awaiter(this, void 0, void 0, function* () {
        const value = variable.valuesByMode[modeId];
        if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
            const aliased = yield figma.variables.getVariableByIdAsync(value.id);
            if (aliased)
                return '{' + aliased.name.replace(/\//g, '.') + '}';
        }
        return value;
    });
}
function formatValue(value, type) {
    if (typeof value === 'string' && value.startsWith('{'))
        return value;
    if (type === 'COLOR' && typeof value === 'object' && value !== null && 'r' in value) {
        return rgbToHex(value);
    }
    return value;
}
function exportTokens(selectedIds) {
    return __awaiter(this, void 0, void 0, function* () {
        const output = {
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
        const collections = yield figma.variables.getLocalVariableCollectionsAsync();
        const allVariables = yield figma.variables.getLocalVariablesAsync();
        const filtered = selectedIds.size > 0 ? collections.filter(c => selectedIds.has(c.id)) : collections;
        for (const coll of filtered) {
            const type = parseCollectionType(coll.name);
            const collName = coll.name.toLowerCase();
            const vars = allVariables.filter(v => v.variableCollectionId === coll.id);
            postProgress(`Processing: ${coll.name} (${vars.length} vars)`);
            for (const mode of coll.modes) {
                const modeName = mode.name.toLowerCase();
                // Skip non-matching modes for theme collection
                if (type === 'theme' && modeName !== 'light' && modeName !== 'dark')
                    continue;
                for (const variable of vars) {
                    const pathParts = variable.name.split('/').map(p => p.trim());
                    const raw = yield resolveValue(variable, mode.modeId);
                    const formatted = formatValue(raw, variable.resolvedType);
                    const prefixedId = `${collName}:${modeName}:${variable.id}`;
                    const token = {
                        $value: formatted,
                        $type: getTokenType(variable.resolvedType),
                        $variableId: prefixedId
                    };
                    // Add to appropriate section
                    if (type === 'brand') {
                        if (!output.brand[modeName])
                            output.brand[modeName] = {};
                        setNestedToken(output.brand[modeName], pathParts, token);
                    }
                    else if (type === 'theme') {
                        if (!output.theme[modeName])
                            output.theme[modeName] = {};
                        setNestedToken(output.theme[modeName], pathParts, token);
                    }
                    else if (type === 'globals') {
                        setNestedToken(output.globals, pathParts, token);
                    }
                    // Add to baseline
                    const entry = {
                        path: pathParts.join('.'),
                        value: formatted,
                        type: getTokenType(variable.resolvedType),
                        collection: type === 'unknown' ? collName : type
                    };
                    if (type === 'brand')
                        entry.brand = modeName;
                    if (type === 'theme' || type === 'globals')
                        entry.mode = modeName;
                    output.baseline[prefixedId] = entry;
                }
            }
        }
        postProgress('Export complete!');
        return output;
    });
}
// =============================================================================
// IMPORT
// =============================================================================
function validateBaseline(data) {
    const errors = [];
    if (!data || typeof data !== 'object')
        return { valid: false, errors: ['Not a valid JSON object'] };
    const d = data;
    if (!d.$metadata)
        errors.push('Missing $metadata');
    if (!('brand' in d))
        errors.push('Missing brand');
    if (!('theme' in d))
        errors.push('Missing theme');
    if (!('globals' in d))
        errors.push('Missing globals');
    if (!('baseline' in d))
        errors.push('Missing baseline');
    return { valid: errors.length === 0, errors };
}
function analyzeImport(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const toUpdate = [];
        const toCreate = [];
        const unmatched = [];
        const missingCollections = [];
        const missingModes = [];
        const allVars = yield figma.variables.getLocalVariablesAsync();
        const allColls = yield figma.variables.getLocalVariableCollectionsAsync();
        const varById = new Map(allVars.map(v => [v.id, v]));
        const collByName = new Map(allColls.map(c => [c.name.toLowerCase(), c]));
        const modesByCol = new Map(allColls.map(c => [
            c.name.toLowerCase(),
            new Map(c.modes.map(m => [m.name.toLowerCase(), m.modeId]))
        ]));
        const collIdToName = new Map(allColls.map(c => [c.id, c.name]));
        const seenFigmaIds = new Set();
        const requiredColls = new Set();
        const requiredModes = new Map();
        for (const [variableId, entry] of Object.entries(data.baseline)) {
            const parsed = parseVariableId(variableId);
            if (!parsed.valid)
                continue;
            requiredColls.add(parsed.collection);
            if (!requiredModes.has(parsed.collection))
                requiredModes.set(parsed.collection, new Set());
            requiredModes.get(parsed.collection).add(parsed.mode);
            const token = {
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
            }
            else {
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
            if (!collByName.has(c))
                missingCollections.push(c);
        }
        for (const [col, modes] of requiredModes) {
            const existing = modesByCol.get(col);
            if (existing) {
                for (const m of modes) {
                    if (!existing.has(m))
                        missingModes.push({ collection: col, mode: m });
                }
            }
        }
        postImportProgress(`Analysis: ${toUpdate.length} update, ${toCreate.length} create, ${unmatched.length} unmatched`);
        return { toUpdate, toCreate, unmatched, missingCollections, missingModes };
    });
}
function applyImport(analysis, _data, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        let successes = 0;
        const failures = [];
        let newVars = 0;
        const allColls = yield figma.variables.getLocalVariableCollectionsAsync();
        const collByName = new Map(allColls.map(c => [c.name.toLowerCase(), c]));
        const modesByCol = new Map();
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
                }
                catch (e) {
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
                        if (colModes)
                            colModes.set(mode.toLowerCase(), newMode);
                        postImportProgress(`Created mode: ${mode} in ${collection}`);
                    }
                    catch (e) {
                        postImportProgress(`Failed to create mode: ${mode}`);
                    }
                }
            }
        }
        // Helper to convert value
        function toFigmaValue(token) {
            return __awaiter(this, void 0, void 0, function* () {
                const tokenValue = token.value;
                if (typeof tokenValue === 'string' && tokenValue.startsWith('{') && tokenValue.endsWith('}')) {
                    const path = tokenValue.slice(1, -1).trim();
                    const allVars = yield figma.variables.getLocalVariablesAsync();
                    const target = allVars.find(v => v.name === path.replace(/\./g, '/'));
                    if (target)
                        return { value: figma.variables.createVariableAlias(target) };
                    return { value: null, error: `Alias not found: ${path}` };
                }
                if (token.type === 'color' && typeof tokenValue === 'string') {
                    if (tokenValue.startsWith('#')) {
                        const rgb = hexToRgb(tokenValue);
                        if (rgb)
                            return { value: rgb };
                        return { value: null, error: 'Invalid hex color' };
                    }
                    const match = tokenValue.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
                    if (match) {
                        return { value: { r: +match[1] / 255, g: +match[2] / 255, b: +match[3] / 255, a: +match[4] } };
                    }
                    return { value: null, error: 'Unknown color format' };
                }
                return { value: tokenValue };
            });
        }
        // Process updates
        for (const token of analysis.toUpdate) {
            try {
                const parsed = parseVariableId(token.variableId);
                if (!parsed.valid) {
                    failures.push({ variableId: token.variableId, error: 'Invalid ID' });
                    continue;
                }
                const variable = yield figma.variables.getVariableByIdAsync(parsed.figmaId);
                if (!variable) {
                    failures.push({ variableId: token.variableId, error: 'Not found' });
                    continue;
                }
                const modeId = (_a = modesByCol.get(parsed.collection)) === null || _a === void 0 ? void 0 : _a.get(parsed.mode);
                if (!modeId) {
                    failures.push({ variableId: token.variableId, error: `Mode not found: ${parsed.mode}` });
                    continue;
                }
                const { value, error } = yield toFigmaValue(token);
                if (error || value === null) {
                    failures.push({ variableId: token.variableId, error: error || 'Null value' });
                    continue;
                }
                variable.setValueForMode(modeId, value);
                successes++;
            }
            catch (e) {
                failures.push({ variableId: token.variableId, error: e instanceof Error ? e.message : 'Unknown' });
            }
        }
        // Process creates
        for (const token of analysis.toCreate) {
            try {
                const parsed = parseVariableId(token.variableId);
                const col = collByName.get(parsed.collection);
                if (!col) {
                    if (!opts.createMissingCollections)
                        failures.push({ variableId: token.variableId, error: 'Collection missing' });
                    continue;
                }
                const modeId = (_b = modesByCol.get(parsed.collection)) === null || _b === void 0 ? void 0 : _b.get(parsed.mode);
                if (!modeId) {
                    if (!opts.createMissingModes)
                        failures.push({ variableId: token.variableId, error: 'Mode missing' });
                    continue;
                }
                const figmaName = token.path.replace(/\./g, '/');
                const newVar = figma.variables.createVariable(figmaName, col, tokenTypeToFigmaType(token.type));
                const { value, error } = yield toFigmaValue(token);
                if (!error && value !== null)
                    newVar.setValueForMode(modeId, value);
                successes++;
                newVars++;
            }
            catch (e) {
                failures.push({ variableId: token.variableId, error: e instanceof Error ? e.message : 'Unknown' });
            }
        }
        return { successes, failures, newVariablesCreated: newVars };
    });
}
// =============================================================================
// VARIABLE REGISTRY FRAME
// =============================================================================
const REGISTRY_FRAME_NAME = '_variable_registry';
const REGISTRY_NODE_NAME = '_token_registry';
const PLUGIN_NAMESPACE = 'eboks_tokens';
/**
 * Sync token registry to a node's sharedPluginData.
 * This allows the data to be read via Figma REST API without MCP.
 *
 * The data is stored in the same format as exportTokens() output,
 * so it can be directly compared with .baseline-snapshot.json
 *
 * Uses chunked storage to bypass the 100KB per entry limit.
 */
function syncRegistryToNode(selectedCollectionIds) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('[Registry] Syncing to node...');
        postProgress('Exporting tokens for registry...');
        // Use the same export function to get consistent data (with selected collections)
        const exportData = yield exportTokens(selectedCollectionIds);
        const variableCount = Object.keys(exportData.baseline).length;
        console.log(`[Registry] Exported ${variableCount} variables`);
        postProgress(`Exported ${variableCount} variables`);
        // Find or create the registry node
        let frame = null;
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
        const chunks = [];
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
    });
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
function generateVariableRegistryFrame() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('[Registry] Starting...');
        postProgress('Loading variables...');
        const allVariables = yield figma.variables.getLocalVariablesAsync();
        console.log(`[Registry] Found ${allVariables.length} variables`);
        postProgress(`Found ${allVariables.length} variables`);
        const allCollections = yield figma.variables.getLocalVariableCollectionsAsync();
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
        let frame = null;
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
                const boundPaint = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }, 'color', variable);
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
                }
                catch (e) {
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
    });
}
// =============================================================================
// MESSAGE HELPERS
// =============================================================================
function postProgress(message) {
    figma.ui.postMessage({ type: 'progress', message });
}
function postImportProgress(message) {
    figma.ui.postMessage({ type: 'import-progress', message });
}
// =============================================================================
// PLUGIN INIT
// =============================================================================
figma.showUI(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; font-size: 12px; color: #333; }
    h2 { margin: 0 0 8px 0; font-size: 14px; font-weight: 600; }
    .section { margin-bottom: 20px; }
    .info-box { background: #f5f5f5; border-radius: 4px; padding: 10px; margin-bottom: 16px; font-size: 11px; line-height: 1.4; }
    button { cursor: pointer; transition: background 0.2s; }
    button:disabled { background: #ccc !important; cursor: not-allowed; }
    .btn-primary { width: 100%; padding: 10px 16px; background: #18a0fb; color: white; border: none; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .btn-primary:hover:not(:disabled) { background: #0d8ce8; }
    .btn-secondary { width: 100%; padding: 10px 16px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-weight: 500; margin-top: 8px; }
    .btn-secondary:hover:not(:disabled) { background: #e0e0e0; }
    .btn-small { flex: 1; padding: 6px 12px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; }
    .btn-small:hover { background: #e0e0e0; }

    /* Tab navigation */
    .tab-bar { display: flex; border-bottom: 1px solid #ddd; background: #fafafa; }
    .tab { flex: 1; padding: 12px 16px; background: transparent; border: none; border-bottom: 2px solid transparent; font-size: 13px; font-weight: 500; color: #666; text-align: center; }
    .tab:hover { color: #333; background: #f0f0f0; }
    .tab.active { color: #18a0fb; border-bottom-color: #18a0fb; background: white; }
    .tab-content { padding: 16px; display: none; }
    .tab-content.active { display: block; }

    /* Plugin header */
    .plugin-header { padding: 12px 16px; background: white; border-bottom: 1px solid #eee; }
    .plugin-header h1 { margin: 0; font-size: 14px; font-weight: 600; }
    .plugin-header p { margin: 4px 0 0 0; font-size: 11px; color: #666; }

    /* Collections list */
    .collections-list { max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 12px; }
    .collection-item { display: flex; align-items: flex-start; padding: 8px; margin-bottom: 6px; background: white; border-radius: 3px; border: 1px solid #e0e0e0; }
    .collection-item:hover { background: #f9f9f9; }
    .collection-checkbox { margin-right: 8px; margin-top: 2px; }
    .collection-info { flex: 1; }
    .collection-name { font-weight: 500; margin-bottom: 3px; }
    .collection-meta { font-size: 10px; color: #666; }
    .collection-type { display: inline-block; padding: 2px 6px; border-radius: 3px; margin-right: 4px; font-size: 9px; font-weight: 500; text-transform: uppercase; }
    .collection-type.brand { background: #f3e5f5; color: #7b1fa2; }
    .collection-type.theme { background: #e8f5e9; color: #388e3c; }
    .collection-type.globals { background: #fff3e0; color: #f57c00; }
    .select-buttons { display: flex; gap: 8px; margin-bottom: 12px; }

    /* Progress/Error/Success panels */
    .progress, .error, .success { display: none; margin-top: 16px; padding: 12px; border-radius: 4px; max-height: 150px; overflow-y: auto; }
    .progress.visible, .error.visible, .success.visible { display: block; }
    .progress { background: #f0f9ff; border-left: 3px solid #18a0fb; }
    .error { background: #fff0f0; border-left: 3px solid #f24822; color: #d32f2f; font-size: 11px; }
    .success { background: #f0fff4; border-left: 3px solid #22c55e; font-size: 11px; }
    .success h3 { margin: 0 0 8px 0; font-size: 12px; color: #16a34a; }
    .progress-message { font-size: 10px; color: #555; margin-bottom: 4px; line-height: 1.4; }
    .download-link { display: inline-block; margin-top: 8px; padding: 8px 12px; background: #22c55e; color: white; text-decoration: none; border-radius: 4px; font-weight: 500; }
    .download-link:hover { background: #16a34a; }
    .stats { margin-top: 10px; font-size: 10px; color: #666; }
    .stats-item { margin-bottom: 3px; }
    .stats-item strong { color: #333; }
    .loading { text-align: center; padding: 20px; color: #666; }

    /* Import specific */
    .file-upload-area { border: 2px dashed #ddd; border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; margin-bottom: 16px; }
    .file-upload-area:hover { border-color: #18a0fb; background: #f8fcff; }
    .file-upload-area.dragover { border-color: #18a0fb; background: #e8f4ff; }
    .file-upload-area input[type="file"] { display: none; }
    .file-upload-label { color: #666; font-size: 12px; }
    .file-upload-label strong { color: #18a0fb; }
    .metadata-display { display: none; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px; margin-bottom: 16px; }
    .metadata-display.visible { display: block; }
    .metadata-item { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
    .metadata-label { color: #666; }
    .metadata-value { font-weight: 500; color: #333; }
    .analysis-summary { display: none; margin-bottom: 16px; }
    .analysis-summary.visible { display: block; }
    .summary-counts { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .summary-count { flex: 1; min-width: 80px; background: #f5f5f5; border-radius: 4px; padding: 10px; text-align: center; }
    .summary-count .count { font-size: 18px; font-weight: 600; color: #333; }
    .summary-count .label { font-size: 10px; color: #666; margin-top: 2px; }
    .summary-count.update { background: #e3f2fd; }
    .summary-count.update .count { color: #1976d2; }
    .summary-count.create { background: #e8f5e9; }
    .summary-count.create .count { color: #388e3c; }
    .summary-count.unmatched { background: #fff3e0; }
    .summary-count.unmatched .count { color: #f57c00; }
    .missing-section { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 4px; padding: 12px; margin-bottom: 16px; display: none; }
    .missing-section.visible { display: block; }
    .missing-section h4 { margin: 0 0 8px 0; font-size: 11px; font-weight: 600; color: #92400e; }
    .missing-item { display: flex; align-items: center; padding: 4px 0; font-size: 11px; }
    .missing-item input { margin-right: 8px; }
    .expandable-section { margin-bottom: 12px; }
    .expandable-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f5f5f5; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 500; }
    .expandable-header:hover { background: #eee; }
    .expandable-content { display: none; max-height: 120px; overflow-y: auto; padding: 8px 12px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 4px 4px; font-size: 10px; }
    .expandable-content.visible { display: block; }
    .expandable-item { padding: 2px 0; color: #555; }
    .action-buttons { display: flex; gap: 8px; margin-top: 16px; }
    .action-buttons button { flex: 1; }
    .import-results { display: none; margin-top: 16px; padding: 16px; background: #f0fff4; border-left: 3px solid #22c55e; border-radius: 4px; }
    .import-results.visible { display: block; }
    .import-results.has-errors { background: #fffbeb; border-left-color: #f59e0b; }
    .import-results h3 { margin: 0 0 12px 0; font-size: 12px; color: #16a34a; }
    .import-results.has-errors h3 { color: #92400e; }
    .results-stats-item { font-size: 11px; margin-bottom: 4px; }
    .failure-details { display: none; margin-top: 12px; max-height: 100px; overflow-y: auto; background: #fff0f0; border-radius: 4px; padding: 8px; font-size: 10px; color: #d32f2f; }
    .failure-details.visible { display: block; }
    .failure-item { margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #fecaca; }
    .failure-item:last-child { border-bottom: none; }
    .input-method-toggle { display: flex; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .method-btn { flex: 1; padding: 8px 12px; background: #f5f5f5; border: none; font-size: 11px; }
    .method-btn:first-child { border-right: 1px solid #ddd; }
    .method-btn:hover { background: #e8e8e8; }
    .method-btn.active { background: #18a0fb; color: white; }
    .paste-area { margin-bottom: 16px; }
    .paste-area textarea { width: 100%; height: 150px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 10px; resize: vertical; }
    .paste-area textarea:focus { outline: none; border-color: #18a0fb; }
    .new-vars-prompt { background: #e0f2fe; border: 1px solid #0ea5e9; border-radius: 4px; padding: 10px; margin-top: 12px; font-size: 11px; color: #0369a1; }
    .results-buttons { display: flex; gap: 8px; margin-top: 12px; }
    .results-buttons button { flex: 1; padding: 8px 12px; font-size: 11px; }
  </style>
</head>
<body>
  <div class="plugin-header">
    <h1>E-Boks Design Token Sync</h1>
    <p>Bidirectional sync for design tokens</p>
  </div>

  <div class="tab-bar">
    <button class="tab active" data-tab="import">Import</button>
    <button class="tab" data-tab="export">Export</button>
    <button class="tab" data-tab="registry">Registry</button>
  </div>

  <!-- Import Tab -->
  <div id="import-panel" class="tab-content active">
    <div class="section">
      <h2>Import Tokens</h2>
      <div class="info-box">Import design tokens from <code>.baseline-snapshot.json</code> into Figma variables.</div>

      <div class="input-method-toggle">
        <button id="method-file-btn" class="method-btn active">Upload File</button>
        <button id="method-paste-btn" class="method-btn">Paste JSON</button>
      </div>

      <div id="import-file-upload" class="file-upload-area">
        <input type="file" id="import-file-input" accept=".json">
        <div class="file-upload-label"><strong>Click to select</strong> or drag and drop<br><span style="font-size:10px;color:#999">.baseline-snapshot.json</span></div>
      </div>

      <div id="import-paste-area" class="paste-area" style="display:none">
        <textarea id="import-paste-input" placeholder="Paste JSON here..."></textarea>
        <button id="import-paste-btn" class="btn-primary" style="margin-top:8px">Load JSON</button>
      </div>

      <div id="import-file-error" class="error"></div>

      <div id="import-metadata" class="metadata-display">
        <div class="metadata-item"><span class="metadata-label">File Name:</span><span class="metadata-value" id="metadata-filename"></span></div>
        <div class="metadata-item"><span class="metadata-label">Version:</span><span class="metadata-value" id="metadata-version"></span></div>
        <div class="metadata-item"><span class="metadata-label">Exported At:</span><span class="metadata-value" id="metadata-exported"></span></div>
        <button id="import-analyze-btn" class="btn-primary" style="margin-top:12px">Analyze Import</button>
      </div>

      <div id="import-analysis-progress" class="progress"></div>

      <div id="import-analysis-summary" class="analysis-summary">
        <h2 style="margin-bottom:12px">Analysis Results</h2>
        <div class="summary-counts">
          <div class="summary-count update"><div class="count" id="summary-update-count">0</div><div class="label">To Update</div></div>
          <div class="summary-count create"><div class="count" id="summary-create-count">0</div><div class="label">To Create</div></div>
          <div class="summary-count unmatched"><div class="count" id="summary-unmatched-count">0</div><div class="label">In Figma Only</div></div>
        </div>
        <div id="details-update" class="expandable-section" style="display:none"><div class="expandable-header" onclick="toggleExpandable('update')"><span>Variables to Update</span><span id="expand-icon-update">+</span></div><div id="expand-content-update" class="expandable-content"></div></div>
        <div id="details-create" class="expandable-section" style="display:none"><div class="expandable-header" onclick="toggleExpandable('create')"><span>Variables to Create</span><span id="expand-icon-create">+</span></div><div id="expand-content-create" class="expandable-content"></div></div>
        <div id="details-unmatched" class="expandable-section" style="display:none"><div class="expandable-header" onclick="toggleExpandable('unmatched')"><span>In Figma NOT in file (unchanged)</span><span id="expand-icon-unmatched">+</span></div><div id="expand-content-unmatched" class="expandable-content"></div></div>
      </div>

      <div id="import-missing-section" class="missing-section">
        <h4>Missing Collections/Modes</h4>
        <p style="font-size:10px;color:#666;margin:0 0 8px">Check to create:</p>
        <div id="missing-collections-list"></div>
        <div id="missing-modes-list"></div>
      </div>

      <div id="import-actions" class="action-buttons" style="display:none">
        <button id="import-apply-btn" class="btn-primary" disabled>Apply Import</button>
        <button id="import-cancel-btn" class="btn-secondary">Cancel</button>
      </div>

      <div id="import-progress" class="progress"></div>

      <div id="import-results" class="import-results">
        <h3 id="import-results-title">Import Complete</h3>
        <div class="results-stats">
          <div class="results-stats-item"><strong id="results-success-count">0</strong> tokens imported</div>
          <div class="results-stats-item"><strong id="results-failure-count">0</strong> failed</div>
          <div class="results-stats-item"><strong id="results-new-count">0</strong> new variables</div>
        </div>
        <div id="import-failure-details" class="failure-details"></div>
        <div id="import-new-vars-prompt" class="new-vars-prompt" style="display:none">New variables created. Export to capture IDs.</div>
        <div class="results-buttons">
          <button id="import-export-now-btn" class="btn-primary" style="display:none">Export Now</button>
          <button id="import-close-btn" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Registry Tab -->
  <div id="registry-panel" class="tab-content">
    <div class="section">
      <h2>Variable Registry</h2>
      
      <!-- NEW: Sync to Node (REST API approach) -->
      <div class="info-box" style="background:#e0f7fa;border-left:3px solid #00acc1;">
        <strong>🚀 Sync to Node (Recommended)</strong><br>
        Stores registry as plugin data on a node. Can be read via REST API without MCP.
      </div>

      <div id="sync-loading" class="loading">Loading collections...</div>
      <div id="sync-collections-section" style="display:none;">
        <div class="select-buttons">
          <button class="btn-small" onclick="syncSelectAll()">Select All</button>
          <button class="btn-small" onclick="syncSelectNone()">Select None</button>
        </div>
        <div id="sync-collections-list" class="collections-list" style="max-height:200px;"></div>
        <button id="sync-registry-btn" class="btn-primary" style="background:#00acc1;margin-top:12px;">Sync to Node</button>
      </div>

      <div id="sync-registry-progress" class="progress"></div>
      <div id="sync-registry-success" class="success" style="display:none;">
        <h3>✅ Registry Synced to Node!</h3>
        <div class="stats">
          <div class="stats-item"><strong>Node ID:</strong> <code id="sync-node-id"></code></div>
          <div class="stats-item"><strong>Variables:</strong> <span id="sync-var-count"></span></div>
        </div>
        <p style="font-size:10px;color:#666;margin-top:12px">
          <strong>To use with CLI:</strong><br>
          <code style="display:block;background:#f5f5f5;padding:8px;margin-top:4px;border-radius:4px;word-break:break-all;">
            FIGMA_REGISTRY_NODE=<span id="sync-node-id-copy"></span> pnpm check-figma --remote
          </code>
        </p>
      </div>

      <hr style="margin:20px 0;border:none;border-top:1px solid #ddd;">

      <!-- Legacy: Frame approach -->
      <div class="info-box">
        <strong>Legacy: Frame Approach</strong><br>
        Generate a hidden frame containing all variable IDs mapped to their paths.<br>
        This frame can be read by MCP to get the complete <code>variableId → path</code> mapping.
      </div>
      <button id="generate-registry-btn" class="btn-secondary">Generate Registry Frame</button>
      <div id="registry-progress" class="progress"></div>
      <div id="registry-success" class="success">
        <h3>✅ Registry Generated!</h3>
        <div class="stats">
          <div class="stats-item"><strong>Frame ID:</strong> <span id="registry-frame-id"></span></div>
          <div class="stats-item"><strong>Variables:</strong> <span id="registry-var-count"></span></div>
        </div>
        <p style="font-size:10px;color:#666;margin-top:12px">
          The frame <code>_variable_registry</code> has been created off-canvas.<br>
          Use MCP to read its contents and get the variableId mapping.
        </p>
      </div>
    </div>
  </div>

  <!-- Export Tab -->
  <div id="export-panel" class="tab-content">
    <div id="export-loading" class="loading">Loading collections...</div>
    <div id="export-main-content" style="display:none">
      <div class="section">
        <h2>GitHub Integration</h2>
        <div class="info-box"><strong>Auto PR:</strong> Configure to enable "Export & Create PR".</div>
        <div style="margin-bottom:8px">
          <label for="github-token" style="display:block;margin-bottom:4px;font-weight:500">GitHub Token:</label>
          <input type="password" id="github-token" placeholder="github_pat_..." style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:11px;font-family:monospace">
          <div style="font-size:10px;color:#666;margin-top:4px">Needs <code>repo</code> scope. <a href="https://github.com/settings/tokens/new?scopes=repo&description=Figma+Plugin" target="_blank" style="color:#18a0fb">Generate →</a></div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <button id="save-github-config-btn" class="btn-small">Save</button>
          <button id="test-github-config-btn" class="btn-small">Test</button>
        </div>
        <div id="github-status" style="display:none;padding:8px;border-radius:4px;font-size:11px;margin-bottom:12px"></div>
        <div style="display:flex;align-items:center;margin-bottom:16px">
          <input type="checkbox" id="auto-create-pr" checked style="margin-right:8px">
          <label for="auto-create-pr" style="font-size:12px;cursor:pointer">Auto create PR after export</label>
        </div>
      </div>

      <div class="section">
        <h2>Select Collections</h2>
        <div class="select-buttons">
          <button class="btn-small" onclick="selectAll()">Select All</button>
          <button class="btn-small" onclick="selectNone()">Select None</button>
        </div>
        <div id="export-collections-list" class="collections-list"></div>
        <button id="export-btn" class="btn-primary"><span id="export-btn-text">Export & Create PR</span></button>
      </div>
      <div id="export-progress" class="progress"></div>
      <div id="export-error" class="error"></div>
      <div id="export-success" class="success"></div>
    </div>
  </div>

  <script>
    // State
    var importState = { fileData: null, analysis: null, isAnalyzing: false, isImporting: false };
    var exportCollections = [];
    var githubConfig = { owner: 'e-Boks-com', repo: 'token-vault', token: '' };

    // DOM refs
    var $ = function(id) { return document.getElementById(id); };

    // Tab switching
    document.querySelectorAll('.tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var tabName = this.dataset.tab;
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.toggle('active', t.dataset.tab === tabName); });
        document.querySelectorAll('.tab-content').forEach(function(p) { p.classList.toggle('active', p.id === tabName + '-panel'); });
        if ((tabName === 'export' || tabName === 'registry') && !exportCollections.length) {
          parent.postMessage({ pluginMessage: { type: 'get-collections' } }, '*');
        }
      });
    });

    // Input method toggle
    $('method-file-btn').onclick = function() {
      $('import-file-upload').style.display = 'block';
      $('import-paste-area').style.display = 'none';
      this.classList.add('active');
      $('method-paste-btn').classList.remove('active');
      resetImportState();
    };
    $('method-paste-btn').onclick = function() {
      $('import-file-upload').style.display = 'none';
      $('import-paste-area').style.display = 'block';
      this.classList.add('active');
      $('method-file-btn').classList.remove('active');
      resetImportState();
    };

    function resetImportState() {
      importState = { fileData: null, analysis: null, isAnalyzing: false, isImporting: false };
      $('import-file-input').value = '';
      $('import-paste-input').value = '';
      ['import-file-error', 'import-metadata', 'import-analysis-progress', 'import-analysis-summary', 'import-missing-section', 'import-progress', 'import-results'].forEach(function(id) {
        $(id).classList.remove('visible');
      });
      $('import-actions').style.display = 'none';
      $('import-apply-btn').disabled = true;
      ['details-update', 'details-create', 'details-unmatched'].forEach(function(id) { $(id).style.display = 'none'; });
      $('import-failure-details').classList.remove('visible');
      $('import-new-vars-prompt').style.display = 'none';
      $('import-export-now-btn').style.display = 'none';
      $('import-results').classList.remove('has-errors');
    }

    // File handling
    function handleFile(file) {
      if (!file || !file.name.endsWith('.json')) {
        $('import-file-error').textContent = 'Please select a .json file';
        $('import-file-error').classList.add('visible');
        return;
      }
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = JSON.parse(e.target.result);
          importState.fileData = data;
          parent.postMessage({ pluginMessage: { type: 'validate-file', data: data } }, '*');
        } catch (err) {
          $('import-file-error').textContent = 'Invalid JSON: ' + err.message;
          $('import-file-error').classList.add('visible');
        }
      };
      reader.readAsText(file);
    }

    $('import-file-input').onchange = function(e) { if (e.target.files[0]) handleFile(e.target.files[0]); };
    $('import-file-upload').onclick = function() { $('import-file-input').click(); };
    $('import-file-upload').ondragover = function(e) { e.preventDefault(); this.classList.add('dragover'); };
    $('import-file-upload').ondragleave = function(e) { e.preventDefault(); this.classList.remove('dragover'); };
    $('import-file-upload').ondrop = function(e) { e.preventDefault(); this.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };

    $('import-paste-btn').onclick = function() {
      var text = $('import-paste-input').value.trim();
      if (!text) { $('import-file-error').textContent = 'Please paste JSON'; $('import-file-error').classList.add('visible'); return; }
      try {
        var data = JSON.parse(text);
        importState.fileData = data;
        parent.postMessage({ pluginMessage: { type: 'validate-file', data: data } }, '*');
      } catch (err) {
        $('import-file-error').textContent = 'Invalid JSON: ' + err.message;
        $('import-file-error').classList.add('visible');
      }
    };

    $('import-analyze-btn').onclick = function() {
      if (!importState.fileData) return;
      importState.isAnalyzing = true;
      this.disabled = true;
      $('import-analysis-progress').innerHTML = '';
      $('import-analysis-progress').classList.add('visible');
      parent.postMessage({ pluginMessage: { type: 'analyze-import', data: importState.fileData } }, '*');
    };

    $('import-apply-btn').onclick = function() {
      if (!importState.analysis) return;
      importState.isImporting = true;
      this.disabled = true;
      $('import-progress').innerHTML = '';
      $('import-progress').classList.add('visible');
      var createColls = importState.analysis.missingCollections && importState.analysis.missingCollections.some(function(c) { var cb = $('create-coll-' + c); return cb && cb.checked; });
      var createModes = importState.analysis.missingModes && importState.analysis.missingModes.some(function(m) { var cb = $('create-mode-' + m.collection + '-' + m.mode); return cb && cb.checked; });
      parent.postMessage({ pluginMessage: { type: 'apply-import', analysis: importState.analysis, data: importState.fileData, createMissingCollections: createColls, createMissingModes: createModes } }, '*');
    };

    $('import-cancel-btn').onclick = resetImportState;
    $('import-close-btn').onclick = resetImportState;
    $('import-export-now-btn').onclick = function() {
      document.querySelector('.tab[data-tab="export"]').click();
      setTimeout(function() { selectAll(); $('export-btn').click(); }, 100);
    };

    function toggleExpandable(section) {
      var content = $('expand-content-' + section);
      var icon = $('expand-icon-' + section);
      content.classList.toggle('visible');
      icon.textContent = content.classList.contains('visible') ? '-' : '+';
    }
    window.toggleExpandable = toggleExpandable;

    function displayAnalysis(analysis) {
      importState.analysis = analysis;
      $('summary-update-count').textContent = analysis.toUpdate ? analysis.toUpdate.length : 0;
      $('summary-create-count').textContent = analysis.toCreate ? analysis.toCreate.length : 0;
      $('summary-unmatched-count').textContent = analysis.unmatched ? analysis.unmatched.length : 0;

      function renderList(items, contentId, sectionId, limit) {
        if (items && items.length) {
          var html = items.slice(0, limit).map(function(t) { return '<div class="expandable-item">' + (t.path || t.name || t) + '</div>'; }).join('');
          if (items.length > limit) html += '<div class="expandable-item" style="color:#999">...and ' + (items.length - limit) + ' more</div>';
          $(contentId).innerHTML = html;
          $(sectionId).style.display = 'block';
        }
      }
      renderList(analysis.toUpdate, 'expand-content-update', 'details-update', 50);
      renderList(analysis.toCreate, 'expand-content-create', 'details-create', 50);
      renderList(analysis.unmatched, 'expand-content-unmatched', 'details-unmatched', 50);

      var hasMissing = false;
      if (analysis.missingCollections && analysis.missingCollections.length) {
        hasMissing = true;
        $('missing-collections-list').innerHTML = analysis.missingCollections.map(function(c) {
          return '<div class="missing-item"><input type="checkbox" id="create-coll-' + c + '" checked><label for="create-coll-' + c + '">' + c + '</label></div>';
        }).join('');
      }
      if (analysis.missingModes && analysis.missingModes.length) {
        hasMissing = true;
        $('missing-modes-list').innerHTML = analysis.missingModes.map(function(m) {
          var id = 'create-mode-' + m.collection + '-' + m.mode;
          return '<div class="missing-item"><input type="checkbox" id="' + id + '" checked><label for="' + id + '">' + m.mode + ' (' + m.collection + ')</label></div>';
        }).join('');
      }
      if (hasMissing) $('import-missing-section').classList.add('visible');

      $('import-analysis-summary').classList.add('visible');
      $('import-actions').style.display = 'flex';
      $('import-apply-btn').disabled = false;
      $('import-analysis-progress').classList.remove('visible');
    }

    function displayResults(result) {
      $('results-success-count').textContent = result.successes || 0;
      $('results-failure-count').textContent = result.failures ? result.failures.length : 0;
      $('results-new-count').textContent = result.newVariablesCreated || 0;
      if (result.failures && result.failures.length) {
        $('import-results').classList.add('has-errors');
        $('import-results-title').textContent = 'Import Completed with Errors';
        $('import-failure-details').innerHTML = result.failures.map(function(f) { return '<div class="failure-item"><strong>' + f.variableId + '</strong>: ' + f.error + '</div>'; }).join('');
        $('import-failure-details').classList.add('visible');
      } else {
        $('import-results-title').textContent = 'Import Complete';
      }
      if (result.newVariablesCreated > 0) {
        $('import-new-vars-prompt').style.display = 'block';
        $('import-export-now-btn').style.display = 'inline-block';
      }
      $('import-progress').classList.remove('visible');
      $('import-actions').style.display = 'none';
      $('import-results').classList.add('visible');
    }

    // Export functions
    var syncCollections = [];

    function renderCollections(colls) {
      exportCollections = colls;
      syncCollections = colls;
      
      // Render for Export tab
      $('export-collections-list').innerHTML = colls.map(function(c) {
        return '<div class="collection-item"><input type="checkbox" class="collection-checkbox" id="coll-' + c.id + '" data-coll-id="' + c.id + '" checked><div class="collection-info"><div class="collection-name">' + c.name + '</div><div class="collection-meta"><span class="collection-type ' + c.parsed.type + '">' + c.parsed.type + '</span> ' + c.variableCount + ' vars' + (c.modeCount > 1 ? ' | ' + c.modeNames : '') + '</div></div></div>';
      }).join('');
      $('export-loading').style.display = 'none';
      $('export-main-content').style.display = 'block';

      // Render for Sync tab
      $('sync-collections-list').innerHTML = colls.map(function(c) {
        return '<div class="collection-item"><input type="checkbox" class="sync-collection-checkbox" id="sync-coll-' + c.id + '" data-coll-id="' + c.id + '" checked><div class="collection-info"><div class="collection-name">' + c.name + '</div><div class="collection-meta"><span class="collection-type ' + c.parsed.type + '">' + c.parsed.type + '</span> ' + c.variableCount + ' vars' + (c.modeCount > 1 ? ' | ' + c.modeNames : '') + '</div></div></div>';
      }).join('');
      $('sync-loading').style.display = 'none';
      $('sync-collections-section').style.display = 'block';
    }

    function selectAll() { document.querySelectorAll('.collection-checkbox').forEach(function(cb) { cb.checked = true; }); }
    function selectNone() { document.querySelectorAll('.collection-checkbox').forEach(function(cb) { cb.checked = false; }); }
    function syncSelectAll() { document.querySelectorAll('.sync-collection-checkbox').forEach(function(cb) { cb.checked = true; }); }
    function syncSelectNone() { document.querySelectorAll('.sync-collection-checkbox').forEach(function(cb) { cb.checked = false; }); }
    window.selectAll = selectAll;
    window.selectNone = selectNone;
    window.syncSelectAll = syncSelectAll;
    window.syncSelectNone = syncSelectNone;

    function getSelectedIds() {
      return Array.from(document.querySelectorAll('.collection-checkbox:checked')).map(function(cb) { return cb.dataset.collId; });
    }

    function getSyncSelectedIds() {
      return Array.from(document.querySelectorAll('.sync-collection-checkbox:checked')).map(function(cb) { return cb.dataset.collId; });
    }

    $('auto-create-pr').onchange = function() {
      $('export-btn-text').textContent = this.checked ? 'Export & Create PR' : 'Export & Download';
    };

    // GitHub config
    parent.postMessage({ pluginMessage: { type: 'load-github-config' } }, '*');

    function showGitHubStatus(msg, type) {
      var el = $('github-status');
      el.textContent = msg;
      el.style.display = 'block';
      el.style.backgroundColor = type === 'success' ? '#f0fff4' : type === 'error' ? '#fff0f0' : '#f0f9ff';
      el.style.borderLeft = '3px solid ' + (type === 'success' ? '#22c55e' : type === 'error' ? '#f24822' : '#18a0fb');
      el.style.color = type === 'success' ? '#16a34a' : type === 'error' ? '#d32f2f' : '#1976d2';
    }

    $('save-github-config-btn').onclick = function() {
      var token = $('github-token').value.trim();
      if (!token) { showGitHubStatus('Enter a token', 'error'); return; }
      githubConfig.token = token;
      parent.postMessage({ pluginMessage: { type: 'save-github-config', config: githubConfig } }, '*');
      showGitHubStatus('Saving...', 'info');
    };

    $('test-github-config-btn').onclick = async function() {
      var token = $('github-token').value.trim();
      if (!token) { showGitHubStatus('Enter a token first', 'error'); return; }
      showGitHubStatus('Testing...', 'info');
      this.disabled = true;
      try {
        var res = await fetch('https://api.github.com/repos/' + githubConfig.owner + '/' + githubConfig.repo, {
          headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
        });
        showGitHubStatus(res.ok ? '✓ Connected!' : res.status === 401 ? '✗ Invalid token' : '✗ Error ' + res.status, res.ok ? 'success' : 'error');
      } catch (e) { showGitHubStatus('✗ Network error', 'error'); }
      this.disabled = false;
    };

    // GitHub PR creation
    async function createPR(content, message) {
      var headers = { 'Authorization': 'Bearer ' + githubConfig.token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' };
      var base = 'https://api.github.com/repos/' + githubConfig.owner + '/' + githubConfig.repo;
      try {
        var mainRef = await (await fetch(base + '/git/refs/heads/main', { headers: headers })).json();
        var baseSha = mainRef.object.sha;
        var branchName = 'figma-sync-' + Date.now();
        await fetch(base + '/git/refs', { method: 'POST', headers: headers, body: JSON.stringify({ ref: 'refs/heads/' + branchName, sha: baseSha }) });
        var blob = await (await fetch(base + '/git/blobs', { method: 'POST', headers: headers, body: JSON.stringify({ content: btoa(unescape(encodeURIComponent(content))), encoding: 'base64' }) })).json();
        var baseCommit = await (await fetch(base + '/git/commits/' + baseSha, { headers: headers })).json();
        var tree = await (await fetch(base + '/git/trees', { method: 'POST', headers: headers, body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: [{ path: 'packages/theme/.baseline-snapshot.json', mode: '100644', type: 'blob', sha: blob.sha }] }) })).json();
        var commit = await (await fetch(base + '/git/commits', { method: 'POST', headers: headers, body: JSON.stringify({ message: message, tree: tree.sha, parents: [baseSha] }) })).json();
        await fetch(base + '/git/refs/heads/' + branchName, { method: 'PATCH', headers: headers, body: JSON.stringify({ sha: commit.sha }) });
        var pr = await (await fetch(base + '/pulls', { method: 'POST', headers: headers, body: JSON.stringify({ title: '🎨 Update design tokens from Figma', body: message + '\\n\\n---\\n🤖 Auto-created by Figma Sync Plugin', head: branchName, base: 'main' }) })).json();
        return { success: true, url: pr.html_url };
      } catch (e) { return { success: false, error: e.message }; }
    }

    $('export-btn').onclick = function() {
      var ids = getSelectedIds();
      if (!ids.length) { alert('Select at least one collection'); return; }
      this.disabled = true;
      $('export-progress').innerHTML = '';
      $('export-progress').classList.add('visible');
      $('export-error').classList.remove('visible');
      $('export-success').classList.remove('visible');
      parent.postMessage({ pluginMessage: { type: 'export-tokens', selectedCollectionIds: ids } }, '*');
    };

    // Registry functions
    $('sync-registry-btn').onclick = function() {
      var ids = getSyncSelectedIds();
      if (!ids.length) { alert('Select at least one collection'); return; }
      this.disabled = true;
      $('sync-registry-progress').innerHTML = '';
      $('sync-registry-progress').classList.add('visible');
      $('sync-registry-success').style.display = 'none';
      parent.postMessage({ pluginMessage: { type: 'sync-registry', selectedCollectionIds: ids } }, '*');
    };

    $('generate-registry-btn').onclick = function() {
      this.disabled = true;
      $('registry-progress').innerHTML = '';
      $('registry-progress').classList.add('visible');
      $('registry-success').classList.remove('visible');
      parent.postMessage({ pluginMessage: { type: 'generate-registry' } }, '*');
    };

    // Message handling
    window.onmessage = async function(e) {
      var msg = e.data.pluginMessage;
      if (!msg) return;
      console.log('[UI] Received message:', msg.type, msg);

      if (msg.type === 'collections-loaded') renderCollections(msg.collections);
      if (msg.type === 'progress') {
        var el = document.createElement('div');
        el.className = 'progress-message';
        el.textContent = msg.message;
        $('export-progress').appendChild(el);
        $('export-progress').scrollTop = $('export-progress').scrollHeight;
      }
      if (msg.type === 'error') {
        $('export-btn').disabled = false;
        $('export-error').textContent = 'Error: ' + msg.message;
        $('export-error').classList.add('visible');
        $('export-progress').classList.remove('visible');
      }
      if (msg.type === 'export-complete') {
        var json = JSON.stringify(msg.data, null, 2);
        var stats = { brands: Object.keys(msg.data.brand || {}).length, themes: Object.keys(msg.data.theme || {}).length, tokens: Object.keys(msg.data.baseline || {}).length };

        if ($('auto-create-pr').checked && githubConfig.token) {
          var p = document.createElement('div'); p.className = 'progress-message'; p.textContent = '🚀 Creating PR...';
          $('export-progress').appendChild(p);
          var result = await createPR(json, 'chore: update design tokens\\n\\nBrands: ' + stats.brands + ', Themes: ' + stats.themes + ', Tokens: ' + stats.tokens);
          $('export-btn').disabled = false;
          if (result.success) {
            $('export-success').innerHTML = '<h3>✅ PR Created!</h3><div class="stats"><div class="stats-item"><strong>Brands:</strong> ' + stats.brands + '</div><div class="stats-item"><strong>Themes:</strong> ' + stats.themes + '</div><div class="stats-item"><strong>Tokens:</strong> ' + stats.tokens + '</div></div><a href="' + result.url + '" target="_blank" class="download-link">View PR →</a>';
          } else {
            var blob = new Blob([json], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            $('export-error').innerHTML = 'PR failed: ' + result.error;
            $('export-error').classList.add('visible');
            $('export-success').innerHTML = '<h3>⚠️ Downloaded Instead</h3><a href="' + url + '" download="baseline-snapshot.json" class="download-link">Download</a>';
          }
        } else {
          $('export-btn').disabled = false;
          var blob = new Blob([json], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          $('export-success').innerHTML = '<h3>Export Complete!</h3><div class="stats"><div class="stats-item"><strong>Brands:</strong> ' + stats.brands + '</div><div class="stats-item"><strong>Themes:</strong> ' + stats.themes + '</div><div class="stats-item"><strong>Tokens:</strong> ' + stats.tokens + '</div></div>' + (!githubConfig.token ? '<p style="font-size:10px;color:#f57c00;margin-top:8px">⚠️ Configure GitHub to enable auto PR</p>' : '') + '<a href="' + url + '" download="baseline-snapshot.json" class="download-link">Download</a>';
        }
        $('export-success').classList.add('visible');
        $('export-progress').classList.remove('visible');
      }
      if (msg.type === 'file-validated') {
        $('metadata-filename').textContent = msg.metadata.fileName || 'Unknown';
        $('metadata-version').textContent = msg.metadata.version || 'Unknown';
        $('metadata-exported').textContent = msg.metadata.exportedAt ? new Date(msg.metadata.exportedAt).toLocaleString() : 'Unknown';
        $('import-metadata').classList.add('visible');
      }
      if (msg.type === 'file-error') {
        $('import-file-error').textContent = 'Invalid: ' + (msg.errors || []).join(', ');
        $('import-file-error').classList.add('visible');
      }
      if (msg.type === 'import-progress') {
        var target = importState.isImporting ? $('import-progress') : $('import-analysis-progress');
        var el = document.createElement('div'); el.className = 'progress-message'; el.textContent = msg.message;
        target.appendChild(el);
        target.scrollTop = target.scrollHeight;
      }
      if (msg.type === 'analysis-complete') {
        importState.isAnalyzing = false;
        $('import-analyze-btn').disabled = false;
        displayAnalysis(msg.analysis);
      }
      if (msg.type === 'import-complete') {
        importState.isImporting = false;
        displayResults(msg.result);
      }
      if (msg.type === 'github-config-loaded' && msg.config) {
        githubConfig = Object.assign(githubConfig, msg.config);
        if (githubConfig.token) {
          $('github-token').value = githubConfig.token;
          showGitHubStatus('✓ Loaded', 'success');
          setTimeout(function() { $('github-status').style.display = 'none'; }, 2000);
        }
      }
      if (msg.type === 'github-config-saved') showGitHubStatus('✓ Saved!', 'success');
      if (msg.type === 'github-config-error') showGitHubStatus('✗ ' + msg.message, 'error');
      if (msg.type === 'registry-generated') {
        $('generate-registry-btn').disabled = false;
        $('registry-progress').classList.remove('visible');
        $('registry-frame-id').textContent = msg.frameId;
        $('registry-var-count').textContent = msg.variableCount;
        $('registry-success').classList.add('visible');
      }
      if (msg.type === 'registry-synced') {
        console.log('[UI] Registry synced:', msg);
        $('sync-registry-btn').disabled = false;
        $('sync-registry-progress').classList.remove('visible');
        $('sync-node-id').textContent = msg.nodeId;
        $('sync-node-id-copy').textContent = msg.nodeId;
        $('sync-var-count').textContent = msg.variableCount;
        $('sync-registry-success').style.display = 'block';
      }
      if (msg.type === 'sync-registry-error') {
        console.error('[UI] Sync error:', msg.message);
        $('sync-registry-btn').disabled = false;
        $('sync-registry-progress').innerHTML = '<div class="progress-message" style="color:#d32f2f">Error: ' + msg.message + '</div>';
      }
      if (msg.type === 'import-error') {
        importState.isAnalyzing = false;
        importState.isImporting = false;
        $('import-analyze-btn').disabled = false;
        $('import-apply-btn').disabled = false;
        var el = document.createElement('div'); el.className = 'progress-message'; el.style.color = '#d32f2f'; el.textContent = 'Error: ' + msg.message;
        (importState.isImporting ? $('import-progress') : $('import-analysis-progress')).appendChild(el);
      }
    };
  </script>
</body>
</html>
`, { width: 450, height: 600 });
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        switch (msg.type) {
            case 'get-collections': {
                const colls = yield figma.variables.getLocalVariableCollectionsAsync();
                const vars = yield figma.variables.getLocalVariablesAsync();
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
                const output = yield exportTokens(new Set(msg.selectedCollectionIds || []));
                figma.ui.postMessage({ type: 'export-complete', data: output });
                break;
            }
            case 'validate-file': {
                const result = validateBaseline(msg.data);
                if (result.valid) {
                    figma.ui.postMessage({ type: 'file-validated', metadata: msg.data.$metadata });
                }
                else {
                    figma.ui.postMessage({ type: 'file-error', errors: result.errors });
                }
                break;
            }
            case 'analyze-import': {
                postImportProgress('Analyzing...');
                const analysis = yield analyzeImport(msg.data);
                figma.ui.postMessage({ type: 'analysis-complete', analysis });
                break;
            }
            case 'apply-import': {
                postImportProgress('Applying...');
                const result = yield applyImport(msg.analysis, msg.data, {
                    createMissingCollections: msg.createMissingCollections || false,
                    createMissingModes: msg.createMissingModes || false
                });
                figma.ui.postMessage({ type: 'import-complete', result });
                break;
            }
            case 'save-github-config': {
                yield figma.clientStorage.setAsync('github_config', msg.config);
                figma.ui.postMessage({ type: 'github-config-saved', success: true });
                break;
            }
            case 'load-github-config': {
                const config = yield figma.clientStorage.getAsync('github_config');
                figma.ui.postMessage({ type: 'github-config-loaded', config: config || null });
                break;
            }
            case 'generate-registry': {
                postProgress('Generating variable registry frame...');
                const result = yield generateVariableRegistryFrame();
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
                    const selectedIds = new Set(msg.selectedCollectionIds || []);
                    postProgress('Syncing registry to node...');
                    const syncResult = yield syncRegistryToNode(selectedIds);
                    console.log('[Registry] Sending success message:', syncResult);
                    figma.ui.postMessage({
                        type: 'registry-synced',
                        nodeId: syncResult.nodeId,
                        variableCount: syncResult.variableCount
                    });
                    postProgress(`Registry synced! Node ID: ${syncResult.nodeId}`);
                }
                catch (syncError) {
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
    }
    catch (error) {
        figma.ui.postMessage({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
