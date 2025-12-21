/**
 * Synkio UI Plugin - Main Code
 * Handles plugin logic and communication with UI
 */

import { chunkData, reassembleChunks } from './lib/chunking';
import { compareSnapshots } from './lib/compare';
import { addHistoryEntry, parseHistory, serializeHistory } from './lib/history';
import type {
  SyncData,
  TokenEntry,
  SyncEvent,
  StyleEntry,
  StyleType,
  PaintStyleEntry,
  TextStyleEntry,
  EffectStyleEntry,
  SolidColorValue,
  GradientValue,
  GradientStop,
  TypographyValue,
  ShadowValue,
  ShadowObject,
  BlurValue,
} from './lib/types';
import type { SimpleDiff, SimpleCompareResult } from './lib/compare';

const NAMESPACE = 'synkio';

// Show UI
figma.showUI(__html__, {
  width: 400,
  height: 600,
  themeColors: true,
});

// Wait for UI to be ready
let uiReady = false;

/**
 * Get excluded collections from sharedPluginData
 */
function getExcludedCollections(): string[] {
  const excludedJson = figma.root.getSharedPluginData(NAMESPACE, 'excludedCollections');
  if (!excludedJson) return [];
  try {
    return JSON.parse(excludedJson);
  } catch (e) {
    return [];
  }
}

/**
 * Get excluded style types from sharedPluginData
 */
function getExcludedStyleTypes(): StyleType[] {
  const excludedJson = figma.root.getSharedPluginData(NAMESPACE, 'excludedStyleTypes');
  if (!excludedJson) return [];
  try {
    return JSON.parse(excludedJson);
  } catch (e) {
    return [];
  }
}

/**
 * Convert Figma variable value to simple value
 */
function resolveValue(value: VariableValue, type: string): any {
  if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    return { $ref: value.id };
  }

  if (type === 'COLOR' && typeof value === 'object' && 'r' in value) {
    const { r, g, b, a } = value as RGBA;
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    if (a !== undefined && a < 1) {
      return 'rgba(' + Math.round(r * 255) + ', ' + Math.round(g * 255) + ', ' + Math.round(b * 255) + ', ' + a.toFixed(2) + ')';
    }
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  return value;
}

/**
 * Collect all current variables (excluding excluded collections)
 */
async function collectTokens(): Promise<TokenEntry[]> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const tokens: TokenEntry[] = [];

  // Load excluded collections
  const excludedCollections = getExcludedCollections();

  // Filter out excluded collections
  const activeCollections = collections.filter(col => !excludedCollections.includes(col.name));

  for (const collection of activeCollections) {
    const isSingleMode = collection.modes.length === 1;
    const modeMap = new Map(collection.modes.map(m => {
      const normalizedName = (isSingleMode && m.name === 'Mode 1') ? 'value' : m.name;
      return [m.modeId, normalizedName];
    }));

    for (const variableId of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(variableId);
      if (!variable) continue;

      for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
        const modeName = modeMap.get(modeId) || modeId;

        tokens.push({
          variableId: variable.id,
          collectionId: collection.id,
          modeId: modeId,
          collection: collection.name,
          mode: modeName,
          path: variable.name.replace(/\//g, '.'),
          value: resolveValue(value, variable.resolvedType),
          type: variable.resolvedType.toLowerCase(),
        });
      }
    }
  }

  return tokens;
}

// =============================================================================
// Style Collection Functions
// =============================================================================

/**
 * Build a map from VariableID to path for reference resolution in styles
 */
async function buildVariableMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  for (const collection of collections) {
    for (const variableId of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(variableId);
      if (variable) {
        // Store path with dots (same format as tokens)
        map.set(variable.id, variable.name.replace(/\//g, '.'));
      }
    }
  }

  return map;
}

/**
 * Round a number to avoid floating point precision issues
 * Uses 2 decimal places for most values, which is sufficient for CSS
 */
function roundValue(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Format a pixel value with rounding
 */
function formatPx(value: number): string {
  const rounded = roundValue(value);
  return `${rounded}px`;
}

/**
 * Convert RGB or RGBA to hex or rgba string
 */
function rgbaToString(color: RGB | RGBA, opacity?: number): string {
  const { r, g, b } = color;
  const a = 'a' in color ? color.a : 1;
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  const finalAlpha = opacity !== undefined ? opacity : (a ?? 1);

  if (finalAlpha < 1) {
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${finalAlpha.toFixed(2)})`;
  }
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Map Figma font style name to numeric weight
 */
function fontStyleToWeight(style: string): number {
  const lower = style.toLowerCase();
  if (lower.includes('thin') || lower.includes('hairline')) return 100;
  if (lower.includes('extralight') || lower.includes('ultralight')) return 200;
  if (lower.includes('light')) return 300;
  if (lower.includes('regular') || lower.includes('normal') || lower === 'book') return 400;
  if (lower.includes('medium')) return 500;
  if (lower.includes('semibold') || lower.includes('demibold')) return 600;
  if (lower.includes('extrabold') || lower.includes('ultrabold')) return 800;
  if (lower.includes('bold')) return 700;
  if (lower.includes('black') || lower.includes('heavy')) return 900;
  return 400; // Default to regular
}

/**
 * Format line height from Figma format
 */
function formatLineHeight(lineHeight: LineHeight): string | number {
  if (lineHeight.unit === 'AUTO') {
    return 'normal';
  }
  if (lineHeight.unit === 'PIXELS') {
    return formatPx(lineHeight.value);
  }
  // PERCENT - convert to unitless ratio
  return String(roundValue(lineHeight.value / 100));
}

/**
 * Format letter spacing from Figma format
 */
function formatLetterSpacing(letterSpacing: LetterSpacing): string {
  if (letterSpacing.unit === 'PIXELS') {
    return formatPx(letterSpacing.value);
  }
  // PERCENT - convert to em (Figma percent is based on font size)
  return `${roundValue(letterSpacing.value / 100, 3)}em`;
}

/**
 * Map Figma text case to CSS text-transform
 */
function mapTextCase(textCase: TextCase): string | undefined {
  switch (textCase) {
    case 'UPPER': return 'uppercase';
    case 'LOWER': return 'lowercase';
    case 'TITLE': return 'capitalize';
    default: return undefined;
  }
}

/**
 * Map Figma text decoration to CSS
 */
function mapTextDecoration(decoration: TextDecoration): string | undefined {
  switch (decoration) {
    case 'UNDERLINE': return 'underline';
    case 'STRIKETHROUGH': return 'line-through';
    default: return undefined;
  }
}

/**
 * Map Figma gradient type to output format
 */
function mapGradientType(type: string): 'linear' | 'radial' | 'angular' | 'diamond' {
  switch (type) {
    case 'GRADIENT_LINEAR': return 'linear';
    case 'GRADIENT_RADIAL': return 'radial';
    case 'GRADIENT_ANGULAR': return 'angular';
    case 'GRADIENT_DIAMOND': return 'diamond';
    default: return 'linear';
  }
}

/**
 * Convert Figma PaintStyle to StyleEntry
 * Excludes image paints, handles solid colors and gradients
 */
function convertPaintStyle(
  style: PaintStyle,
  variableMap: Map<string, string>
): PaintStyleEntry | null {
  const paint = style.paints[0]; // Primary paint
  if (!paint || !paint.visible) return null;

  // Skip unsupported paint types
  if (paint.type === 'IMAGE' || paint.type === 'VIDEO') {
    return null;
  }

  let value: SolidColorValue | GradientValue;

  if (paint.type === 'SOLID') {
    // Check for bound variable on the paint
    const boundVars = style.boundVariables;
    const paintBinding = boundVars?.paints?.[0]?.color;

    if (paintBinding && typeof paintBinding === 'object' && 'id' in paintBinding) {
      const varPath = variableMap.get(paintBinding.id);
      if (varPath) {
        value = {
          $type: 'color',
          $value: `{${varPath}}`,
        };
      } else {
        // Variable from excluded collection - resolve to actual value
        value = {
          $type: 'color',
          $value: rgbaToString(paint.color, paint.opacity),
        };
      }
    } else {
      value = {
        $type: 'color',
        $value: rgbaToString(paint.color, paint.opacity),
      };
    }
  } else if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL' ||
             paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') {
    // Gradient types - now type-narrowed to GradientPaint
    const stops: GradientStop[] = paint.gradientStops.map((stop: ColorStop) => ({
      color: rgbaToString(stop.color),
      position: roundValue(stop.position, 3),
    }));

    value = {
      $type: 'gradient',
      $value: {
        gradientType: mapGradientType(paint.type),
        stops,
      },
    };
  } else {
    // PATTERN or other unsupported types - return null
    return null;
  }

  return {
    styleId: style.id,
    type: 'paint',
    path: style.name.replace(/\//g, '.'),
    description: style.description || undefined,
    value,
  };
}

/**
 * Convert Figma TextStyle to StyleEntry
 * Uses DTCG typography composite format
 */
function convertTextStyle(
  style: TextStyle,
  variableMap: Map<string, string>
): TextStyleEntry {
  const boundVars = style.boundVariables || {};

  // Helper to resolve value or variable reference
  // Typography bindings can be arrays (for text ranges) or single objects
  const resolveTypographyProp = <T>(
    fieldKey: string,
    rawValue: T,
    transform?: (v: T) => string | number
  ): string | number => {
    const binding = (boundVars as any)[fieldKey];
    // Handle array bindings (text properties like fontFamily, fontSize)
    if (Array.isArray(binding) && binding.length > 0 && binding[0]?.id) {
      const varPath = variableMap.get(binding[0].id);
      if (varPath) return `{${varPath}}`;
    }
    // Handle single object binding
    if (binding && typeof binding === 'object' && 'id' in binding) {
      const varPath = variableMap.get(binding.id);
      if (varPath) return `{${varPath}}`;
    }
    // Fallback: variable from excluded collection or no binding - use raw value
    return transform ? transform(rawValue) : String(rawValue);
  };

  const typographyValue: TypographyValue['$value'] = {
    fontFamily: resolveTypographyProp('fontFamily', style.fontName.family) as string,
    fontSize: resolveTypographyProp('fontSize', style.fontSize, (v) => formatPx(v)) as string,
    fontWeight: fontStyleToWeight(style.fontName.style),
    lineHeight: formatLineHeight(style.lineHeight),
    letterSpacing: formatLetterSpacing(style.letterSpacing),
  };

  // Add optional properties if set
  const textTransform = mapTextCase(style.textCase);
  if (textTransform) typographyValue.textTransform = textTransform;

  const textDecoration = mapTextDecoration(style.textDecoration);
  if (textDecoration) typographyValue.textDecoration = textDecoration;

  return {
    styleId: style.id,
    type: 'text',
    path: style.name.replace(/\//g, '.'),
    description: style.description || undefined,
    value: {
      $type: 'typography',
      $value: typographyValue,
    },
  };
}

/**
 * Format a single shadow effect
 */
function formatShadow(effect: DropShadowEffect | InnerShadowEffect, variableMap: Map<string, string>): ShadowObject {
  // Check for bound variables on shadow properties
  const boundVars = (effect as any).boundVariables || {};

  const resolveColor = (): string => {
    const colorBinding = boundVars.color;
    if (colorBinding && typeof colorBinding === 'object' && 'id' in colorBinding) {
      const varPath = variableMap.get(colorBinding.id);
      if (varPath) return `{${varPath}}`;
    }
    return rgbaToString(effect.color);
  };

  return {
    offsetX: formatPx(effect.offset.x),
    offsetY: formatPx(effect.offset.y),
    blur: formatPx(effect.radius),
    spread: formatPx(effect.spread || 0),
    color: resolveColor(),
    inset: effect.type === 'INNER_SHADOW' ? true : undefined,
  };
}

/**
 * Convert Figma EffectStyle to StyleEntry
 */
function convertEffectStyle(
  style: EffectStyle,
  variableMap: Map<string, string>
): EffectStyleEntry {
  const effects = style.effects.filter((e) => e.visible);

  // Categorize effects
  const shadows = effects.filter(
    (e): e is DropShadowEffect | InnerShadowEffect =>
      e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'
  );
  const blurs = effects.filter(
    (e): e is BlurEffect => e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR'
  );

  let value: ShadowValue | BlurValue;

  if (shadows.length > 0) {
    const shadowObjects = shadows.map((s) => formatShadow(s, variableMap));
    value = {
      $type: 'shadow',
      $value: shadowObjects.length === 1 ? shadowObjects[0] : shadowObjects,
    };
  } else if (blurs.length > 0) {
    value = {
      $type: 'blur',
      $value: {
        radius: formatPx(blurs[0].radius),
      },
    };
  } else {
    // Empty or unsupported effects - return minimal shadow
    value = {
      $type: 'shadow',
      $value: {
        offsetX: '0',
        offsetY: '0',
        blur: '0',
        spread: '0',
        color: 'transparent',
      },
    };
  }

  return {
    styleId: style.id,
    type: 'effect',
    path: style.name.replace(/\//g, '.'),
    description: style.description || undefined,
    value,
  };
}

/**
 * Collect all local styles (excluding excluded types)
 */
async function collectStyles(): Promise<StyleEntry[]> {
  const styles: StyleEntry[] = [];
  const excludedTypes = getExcludedStyleTypes();
  const variableMap = await buildVariableMap();

  // Paint Styles
  if (!excludedTypes.includes('paint')) {
    const paintStyles = await figma.getLocalPaintStylesAsync();
    for (const style of paintStyles) {
      const entry = convertPaintStyle(style, variableMap);
      if (entry) styles.push(entry);
    }
  }

  // Text Styles
  if (!excludedTypes.includes('text')) {
    const textStyles = await figma.getLocalTextStylesAsync();
    for (const style of textStyles) {
      styles.push(convertTextStyle(style, variableMap));
    }
  }

  // Effect Styles
  if (!excludedTypes.includes('effect')) {
    const effectStyles = await figma.getLocalEffectStylesAsync();
    for (const style of effectStyles) {
      styles.push(convertEffectStyle(style, variableMap));
    }
  }

  return styles;
}

/**
 * Get baseline snapshot from storage
 */
function getBaselineSnapshot(): SyncData | null {
  const countStr = figma.root.getSharedPluginData(NAMESPACE, 'baseline_chunkCount');
  if (!countStr) return null;

  const count = parseInt(countStr, 10);
  const json = reassembleChunks(
    (i) => figma.root.getSharedPluginData(NAMESPACE, 'baseline_chunk_' + i),
    count
  );

  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/**
 * Save baseline snapshot to storage
 */
function saveBaselineSnapshot(data: SyncData): void {
  const json = JSON.stringify(data);
  const chunks = chunkData(json);

  // Clear old baseline chunks
  const oldCount = figma.root.getSharedPluginData(NAMESPACE, 'baseline_chunkCount');
  if (oldCount) {
    for (let i = 0; i < parseInt(oldCount, 10); i++) {
      figma.root.setSharedPluginData(NAMESPACE, 'baseline_chunk_' + i, '');
    }
  }

  // Save new baseline chunks (for plugin diff)
  figma.root.setSharedPluginData(NAMESPACE, 'baseline_chunkCount', String(chunks.length));
  chunks.forEach((chunk, i) => {
    figma.root.setSharedPluginData(NAMESPACE, 'baseline_chunk_' + i, chunk);
  });
  figma.root.setSharedPluginData(NAMESPACE, 'baseline_timestamp', data.timestamp);

  // ALSO save to chunk_* keys (for CLI to read)
  const oldCliCount = figma.root.getSharedPluginData(NAMESPACE, 'chunkCount');
  if (oldCliCount) {
    for (let i = 0; i < parseInt(oldCliCount, 10); i++) {
      figma.root.setSharedPluginData(NAMESPACE, 'chunk_' + i, '');
    }
  }

  figma.root.setSharedPluginData(NAMESPACE, 'chunkCount', String(chunks.length));
  chunks.forEach((chunk, i) => {
    figma.root.setSharedPluginData(NAMESPACE, 'chunk_' + i, chunk);
  });
  figma.root.setSharedPluginData(NAMESPACE, 'version', data.version);
  figma.root.setSharedPluginData(NAMESPACE, 'timestamp', data.timestamp);
  figma.root.setSharedPluginData(NAMESPACE, 'tokenCount', String(data.tokens.length));
  figma.root.setSharedPluginData(NAMESPACE, 'styleCount', String(data.styles?.length || 0));
}

/**
 * Get sync history from storage
 */
function getHistory(): SyncEvent[] {
  const json = figma.root.getSharedPluginData(NAMESPACE, 'history');
  return json ? parseHistory(json) : [];
}

/**
 * Add sync event to history
 */
function addToHistory(event: SyncEvent): void {
  const history = getHistory();
  const updated = addHistoryEntry(history, event);
  figma.root.setSharedPluginData(NAMESPACE, 'history', serializeHistory(updated));
}

/**
 * Filter baseline to exclude currently-excluded collections and styles
 */
function filterBaselineByExclusions(baseline: SyncData): SyncData {
  const excludedCollections = getExcludedCollections();
  const excludedStyleTypes = getExcludedStyleTypes();

  // Filter tokens from excluded collections
  const filteredTokens = baseline.tokens.filter(
    token => !excludedCollections.includes(token.collection)
  );

  // Filter styles by excluded types
  const filteredStyles = baseline.styles?.filter(
    style => !excludedStyleTypes.includes(style.type)
  );

  return {
    ...baseline,
    tokens: filteredTokens,
    styles: filteredStyles,
  };
}

/**
 * CLI Baseline format (from baseline.json)
 */
interface CLIBaseline {
  baseline: Record<string, TokenEntry>;
  styles?: Record<string, StyleEntry>;
  metadata: {
    syncedAt: string;
  };
}

/**
 * Validate and convert CLI baseline format to plugin SyncData format
 */
function convertCLIBaselineToSyncData(cliBaseline: any): SyncData | { error: string } {
  // Validate structure
  if (!cliBaseline || typeof cliBaseline !== 'object') {
    return { error: 'Invalid baseline: must be a JSON object' };
  }

  if (!cliBaseline.baseline || typeof cliBaseline.baseline !== 'object') {
    return { error: 'Invalid baseline: missing "baseline" object' };
  }

  if (!cliBaseline.metadata || !cliBaseline.metadata.syncedAt) {
    return { error: 'Invalid baseline: missing "metadata.syncedAt"' };
  }

  // Convert baseline tokens (object to array)
  const tokens: TokenEntry[] = [];
  for (const [key, token] of Object.entries(cliBaseline.baseline)) {
    if (!token || typeof token !== 'object') {
      return { error: `Invalid token entry for key: ${key}` };
    }

    const t = token as any;

    // Validate required fields
    if (!t.collection || !t.mode || !t.path || t.value === undefined || !t.type) {
      return { error: `Invalid token entry: ${key} is missing required fields (collection, mode, path, value, type)` };
    }

    tokens.push(t as TokenEntry);
  }

  // Convert styles if present (object to array)
  let styles: StyleEntry[] | undefined;
  if (cliBaseline.styles && typeof cliBaseline.styles === 'object') {
    styles = [];
    for (const [key, style] of Object.entries(cliBaseline.styles)) {
      if (!style || typeof style !== 'object') {
        return { error: `Invalid style entry for key: ${key}` };
      }

      const s = style as any;

      // Validate required fields
      if (!s.styleId || !s.type || !s.path || !s.value) {
        return { error: `Invalid style entry: ${key} is missing required fields` };
      }

      styles.push(s as StyleEntry);
    }
  }

  return {
    version: '3.0.0',
    timestamp: cliBaseline.metadata.syncedAt,
    tokens,
    styles,
  };
}

// =============================================================================
// Apply to Figma Functions
// =============================================================================

async function buildExistingVariableMap(): Promise<Map<string, Variable>> {
  const map = new Map<string, Variable>();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  for (const collection of collections) {
    for (const varId of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(varId);
      if (variable) {
        const path = variable.name.replace(/\//g, '.');
        const key = `${collection.name}.${path}`;
        map.set(key, variable);
      }
    }
  }

  return map;
}

async function buildCollectionMap(): Promise<Map<string, VariableCollection>> {
  const map = new Map<string, VariableCollection>();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  for (const collection of collections) {
    map.set(collection.name, collection);
  }

  return map;
}

async function getOrCreateCollection(
  name: string,
  collectionMap: Map<string, VariableCollection>
): Promise<VariableCollection> {
  let collection = collectionMap.get(name);

  if (!collection) {
    collection = figma.variables.createVariableCollection(name);
    collectionMap.set(name, collection);
  }

  return collection;
}

function getOrCreateMode(
  collection: VariableCollection,
  modeName: string
): string {
  const existingMode = collection.modes.find(m => m.name === modeName);
  if (existingMode) {
    return existingMode.modeId;
  }

  if (collection.modes.length === 1 && collection.modes[0].name === 'Mode 1') {
    collection.renameMode(collection.modes[0].modeId, modeName);
    return collection.modes[0].modeId;
  }

  return collection.addMode(modeName);
}

function mapTokenTypeToFigma(type: string): VariableResolvedDataType {
  switch (type.toLowerCase()) {
    case 'color':
      return 'COLOR';
    case 'number':
    case 'dimension':
    case 'spacing':
    case 'size':
      return 'FLOAT';
    case 'string':
      return 'STRING';
    case 'boolean':
      return 'BOOLEAN';
    default:
      return 'STRING';
  }
}

function parseColorValue(color: string): RGBA {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]) / 255,
      g: parseInt(rgbaMatch[2]) / 255,
      b: parseInt(rgbaMatch[3]) / 255,
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  throw new Error(`Unsupported color format: ${color}`);
}

function convertValueToFigma(
  value: unknown,
  type: string,
  variableLookup: Map<string, string>
): VariableValue {
  if (typeof value === 'object' && value !== null && '$ref' in value) {
    const refId = (value as { $ref: string }).$ref;
    return { type: 'VARIABLE_ALIAS', id: refId };
  }

  if (typeof value === 'string') {
    const match = value.match(/^\{(.+)\}$/);
    if (match) {
      const refPath = match[1];
      const varId = variableLookup.get(refPath);

      if (!varId) {
        throw new Error(`Cannot resolve reference: {${refPath}}`);
      }

      return { type: 'VARIABLE_ALIAS', id: varId };
    }
  }

  if (type.toLowerCase() === 'color' && typeof value === 'string') {
    return parseColorValue(value);
  }

  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  throw new Error(`Unsupported value type: ${typeof value}`);
}

function extractReferences(value: unknown): string[] {
  if (typeof value === 'string') {
    const match = value.match(/^\{(.+)\}$/);
    if (match) return [match[1]];
  }
  return [];
}

function sortByDependencies(tokens: TokenEntry[]): TokenEntry[] {
  const graph = new Map<string, string[]>();
  const tokenMap = new Map<string, TokenEntry>();

  for (const token of tokens) {
    const key = `${token.collection}.${token.path}`;
    tokenMap.set(key, token);

    const refs = extractReferences(token.value);
    graph.set(key, refs);
  }

  const sorted: TokenEntry[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(key: string): void {
    if (visited.has(key)) return;

    if (visiting.has(key)) {
      throw new Error(`Circular reference detected involving: ${key}`);
    }

    visiting.add(key);

    for (const dep of graph.get(key) || []) {
      if (tokenMap.has(dep)) {
        visit(dep);
      }
    }

    visiting.delete(key);
    visited.add(key);

    const token = tokenMap.get(key);
    if (token) {
      sorted.push(token);
    }
  }

  for (const key of tokenMap.keys()) {
    visit(key);
  }

  return sorted;
}

function resolveReference(
  refPath: string,
  currentCollection: string,
  existingVars: Map<string, Variable>,
  createdVars: Map<string, string>
): string {
  if (createdVars.has(refPath)) {
    return createdVars.get(refPath)!;
  }
  const existingExact = existingVars.get(refPath);
  if (existingExact) {
    return existingExact.id;
  }

  const withCollection = `${currentCollection}.${refPath}`;
  if (createdVars.has(withCollection)) {
    return createdVars.get(withCollection)!;
  }
  const existingWithCollection = existingVars.get(withCollection);
  if (existingWithCollection) {
    return existingWithCollection.id;
  }

  for (const [path, varId] of createdVars) {
    if (path.endsWith(`.${refPath}`)) {
      return varId;
    }
  }
  for (const [path, variable] of existingVars) {
    if (path.endsWith(`.${refPath}`)) {
      return variable.id;
    }
  }

  throw new Error(`Cannot resolve reference: {${refPath}}`);
}

async function applyBaselineToFigma(): Promise<void> {
  const baseline = getBaselineSnapshot();

  if (!baseline || !baseline.tokens || baseline.tokens.length === 0) {
    figma.notify('No baseline to apply. Import a baseline first.', { error: true });
    return;
  }

  try {
    const existingVars = await buildExistingVariableMap();
    const collectionMap = await buildCollectionMap();
    const createdVars = new Map<string, string>();

    const sortedTokens = sortByDependencies(baseline.tokens);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const token of sortedTokens) {
      const fullPath = `${token.collection}.${token.path}`;

      try {
        const collection = await getOrCreateCollection(token.collection, collectionMap);
        const modeId = getOrCreateMode(collection, token.mode);

        let variable: Variable | null = null;

        if (token.variableId) {
          variable = await figma.variables.getVariableByIdAsync(token.variableId);
        }

        if (!variable) {
          const existing = existingVars.get(fullPath);
          if (existing) {
            variable = existing;
          }
        }

        if (!variable) {
          const figmaType = mapTokenTypeToFigma(token.type);
          const figmaName = token.path.replace(/\./g, '/');
          variable = figma.variables.createVariable(figmaName, collection, figmaType);
          created++;
        } else {
          updated++;
        }

        createdVars.set(fullPath, variable.id);

        const variableLookup = new Map<string, string>();
        for (const [path, varId] of createdVars) {
          variableLookup.set(path, varId);
        }
        for (const [path, v] of existingVars) {
          if (!variableLookup.has(path)) {
            variableLookup.set(path, v.id);
          }
        }

        const figmaValue = convertValueToFigma(token.value, token.type, variableLookup);
        variable.setValueForMode(modeId, figmaValue);

        if (token.description) {
          variable.description = token.description;
        }
        if (token.scopes && token.scopes.length > 0) {
          variable.scopes = token.scopes as VariableScope[];
        }

      } catch (err) {
        console.error(`Error applying token ${fullPath}:`, err);
        skipped++;
      }
    }

    figma.notify(`Applied: ${created} created, ${updated} updated, ${skipped} skipped`);

    await sendDiffToUI();

    figma.ui.postMessage({ type: 'apply-success', created, updated, skipped });

  } catch (err) {
    figma.notify(`Apply failed: ${(err as Error).message}`, { error: true });
    figma.ui.postMessage({ type: 'apply-error', error: (err as Error).message });
  }
}

/**
 * Calculate diff and send to UI
 */
async function sendDiffToUI() {
  const currentTokens = await collectTokens();
  const currentStyles = await collectStyles();
  const current: SyncData = {
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    tokens: currentTokens,
    styles: currentStyles.length > 0 ? currentStyles : undefined,
  };

  const baseline = getBaselineSnapshot();

  let diffs: SimpleDiff[] = [];

  if (baseline) {
    // Filter baseline to match current exclusions before comparing
    const filteredBaseline = filterBaselineByExclusions(baseline);
    const result = compareSnapshots(current, filteredBaseline);
    diffs = result.diffs;
  } else {
    // No baseline yet - all current tokens are "new"
    diffs = currentTokens.map(token => ({
      id: token.variableId + ':' + token.mode,
      name: token.path,
      type: 'added' as const,
      newValue: token.value,
      collection: token.collection,
      mode: token.mode,
    }));
    // Also add styles as new items
    diffs = diffs.concat(currentStyles.map(style => ({
      id: style.styleId,
      name: style.path,
      type: 'added' as const,
      newValue: style.value,
      collection: `${style.type}-styles`,
      mode: 'value',
    })));
  }

  const history = getHistory();
  const excludedCount = getExcludedCollections().length;
  const excludedStyleCount = getExcludedStyleTypes().length;

  figma.ui.postMessage({
    type: 'update',
    diffs: diffs,
    history: history,
    hasBaseline: !!baseline,
    excludedCount: excludedCount,
    excludedStyleCount: excludedStyleCount,
  });
}

/**
 * Handle messages from UI
 */
figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'ready') {
      uiReady = true;
      await sendDiffToUI();
    }

    if (msg.type === 'sync') {
      const currentTokens = await collectTokens();
      const currentStyles = await collectStyles();
      const snapshot: SyncData = {
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        tokens: currentTokens,
        styles: currentStyles.length > 0 ? currentStyles : undefined,
      };

      const baseline = getBaselineSnapshot();
      const result = baseline ? compareSnapshots(snapshot, baseline) : null;
      const tokenCount = result
        ? result.counts.total
        : currentTokens.length;
      const styleCount = currentStyles.length;
      const changeCount = tokenCount + styleCount;

      // Collect change paths with values for history
      let changePaths: string[] = [];
      const truncate = (v: any, max = 20): string => {
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return s.length > max ? s.slice(0, max) + '...' : s;
      };

      if (result) {
        changePaths = result.diffs.map(d => {
          if (d.type === 'renamed') {
            // Show path rename
            if (d.oldValue !== undefined && d.newValue !== undefined) {
              return '<-> ' + d.oldName + ' -> ' + d.name + ': ' + truncate(d.oldValue) + ' -> ' + truncate(d.newValue);
            }
            return '<-> ' + d.oldName + ' -> ' + d.name;
          } else if (d.type === 'modified') {
            return '~ ' + d.name + ': ' + truncate(d.oldValue) + ' -> ' + truncate(d.newValue);
          } else if (d.type === 'added') {
            return '+ ' + d.name + ': ' + truncate(d.newValue);
          } else {
            return '- ' + d.name + ': ' + truncate(d.oldValue);
          }
        });
      } else {
        // Initial sync - show token names with values
        changePaths = currentTokens.slice(0, 50).map(t => '+ ' + t.path + ': ' + truncate(t.value));
        if (currentTokens.length > 50) {
          changePaths.push('... and ' + (currentTokens.length - 50) + ' more tokens');
        }
        // Add styles to change paths
        if (currentStyles.length > 0) {
          const styleLines = currentStyles.slice(0, 10).map(s => '+ [style] ' + s.path);
          changePaths = changePaths.concat(styleLines);
          if (currentStyles.length > 10) {
            changePaths.push('... and ' + (currentStyles.length - 10) + ' more styles');
          }
        }
      }

      // Save new baseline
      saveBaselineSnapshot(snapshot);

      // Add to history with paths
      const userName = figma.currentUser ? figma.currentUser.name : 'Unknown';
      addToHistory({
        u: userName,
        t: Date.now(),
        c: changeCount,
        p: changePaths,
      });

      const notifyMsg = styleCount > 0
        ? `Synced ${tokenCount} tokens + ${styleCount} styles`
        : `Synced ${tokenCount} changes`;
      figma.notify(notifyMsg);

      // Refresh UI
      await sendDiffToUI();
    }

    if (msg.type === 'get-collections') {
      // Get all collections with exclusion status
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const excluded = getExcludedCollections();

      const collectionInfos = collections.map(col => ({
        name: col.name,
        modeCount: col.modes.length,
        excluded: excluded.includes(col.name)
      }));

      figma.ui.postMessage({
        type: 'collections-update',
        collections: collectionInfos
      });
    }

    if (msg.type === 'save-excluded-collections') {
      const { excluded } = msg;
      figma.root.setSharedPluginData(NAMESPACE, 'excludedCollections', JSON.stringify(excluded));
      figma.ui.postMessage({ type: 'collections-saved' });
      figma.notify('Collection settings saved');
    }

    if (msg.type === 'get-style-types') {
      // Get all style types with their counts and exclusion status
      const excluded = getExcludedStyleTypes();

      const paintStyles = await figma.getLocalPaintStylesAsync();
      const textStyles = await figma.getLocalTextStylesAsync();
      const effectStyles = await figma.getLocalEffectStylesAsync();

      const styleTypes = [
        {
          type: 'paint' as StyleType,
          label: 'Paint Styles',
          count: paintStyles.length,
          excluded: excluded.includes('paint'),
        },
        {
          type: 'text' as StyleType,
          label: 'Text Styles',
          count: textStyles.length,
          excluded: excluded.includes('text'),
        },
        {
          type: 'effect' as StyleType,
          label: 'Effect Styles',
          count: effectStyles.length,
          excluded: excluded.includes('effect'),
        },
      ];

      figma.ui.postMessage({
        type: 'style-types-update',
        styleTypes: styleTypes,
      });
    }

    if (msg.type === 'save-excluded-style-types') {
      const { excluded } = msg;
      figma.root.setSharedPluginData(NAMESPACE, 'excludedStyleTypes', JSON.stringify(excluded));
      figma.ui.postMessage({ type: 'style-types-saved' });
      figma.notify('Style settings saved');
    }

    if (msg.type === 'import-baseline') {
      const { baselineJson } = msg;

      // Parse and validate the baseline JSON
      let parsedBaseline: any;
      try {
        parsedBaseline = JSON.parse(baselineJson);
      } catch (e) {
        figma.notify('Invalid JSON: Could not parse baseline file', { error: true });
        figma.ui.postMessage({ type: 'import-error', error: 'Invalid JSON format' });
        return;
      }

      // Convert CLI baseline to plugin format
      const result = convertCLIBaselineToSyncData(parsedBaseline);

      if ('error' in result) {
        figma.notify('Import failed: ' + result.error, { error: true });
        figma.ui.postMessage({ type: 'import-error', error: result.error });
        return;
      }

      // Save as new baseline
      saveBaselineSnapshot(result);

      // Add to history
      const userName = figma.currentUser ? figma.currentUser.name : 'Unknown';
      const tokenCount = result.tokens.length;
      const styleCount = result.styles?.length || 0;
      addToHistory({
        u: userName,
        t: Date.now(),
        c: tokenCount + styleCount,
        p: [`Imported baseline with ${tokenCount} tokens and ${styleCount} styles`],
      });

      figma.notify(`Baseline imported: ${tokenCount} tokens + ${styleCount} styles`);

      // Recalculate diff with current Figma state
      await sendDiffToUI();

      figma.ui.postMessage({ type: 'import-success' });
    }

    if (msg.type === 'apply-to-figma') {
      await applyBaselineToFigma();
    }

    if (msg.type === 'close') {
      figma.closePlugin();
    }
  } catch (error) {
    figma.notify('Error: ' + String(error), { error: true });
  }
};
