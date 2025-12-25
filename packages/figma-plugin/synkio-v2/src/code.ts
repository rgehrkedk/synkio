// =============================================================================
// Synkio Figma Plugin - Main Code (runs in Figma sandbox)
// =============================================================================

import {
  MessageToCode,
  MessageToUI,
  PluginState,
  BaselineData,
  BaselineEntry,
  StyleBaselineEntry,
  TokenEntry,
  StyleEntry,
  SyncEvent,
  PluginSettings,
  RemoteSettings,
  StyleType,
} from './lib/types';

import {
  saveChunked,
  loadChunked,
  saveSimple,
  loadSimple,
  saveClientStorage,
  loadClientStorage,
  KEYS,
} from './lib/storage';

import {
  collectVariables,
  collectStyles,
  getCollectionInfos,
  getStyleTypeInfos,
} from './lib/collector';

import { compareBaselines, compareByPath, hasChanges } from './lib/compare';

// =============================================================================
// Plugin Initialization
// =============================================================================

figma.showUI(__html__, {
  width: 360,
  height: 560,
  themeColors: true,
});

// =============================================================================
// Message Handling
// =============================================================================

figma.ui.onmessage = async (message: MessageToCode) => {
  console.log('Plugin received:', message.type);

  try {
    switch (message.type) {
      case 'ready':
        await handleReady();
        break;

      case 'init':
        await handleInit();
        break;

      case 'sync':
        await handleSync();
        break;

      case 'get-collections':
        handleGetCollections();
        break;

      case 'save-excluded-collections':
        handleSaveExcludedCollections(message.collections);
        break;

      case 'get-style-types':
        handleGetStyleTypes();
        break;

      case 'save-excluded-style-types':
        handleSaveExcludedStyleTypes(message.styleTypes);
        break;

      case 'fetch-remote':
        await handleFetchRemote();
        break;

      case 'import-baseline':
        await handleImportBaseline(message.data);
        break;

      case 'apply-to-figma':
        await handleApplyToFigma();
        break;

      case 'get-history':
        handleGetHistory();
        break;

      case 'get-settings':
        await handleGetSettings();
        break;

      case 'save-settings':
        await handleSaveSettings(message.settings);
        break;

      case 'test-connection':
        await handleTestConnection();
        break;

      case 'close':
        figma.closePlugin();
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendMessage({
      type: 'state-update',
      state: { isLoading: false, error: String(error) },
    });
  }
};

// =============================================================================
// Message Helpers
// =============================================================================

function sendMessage(message: MessageToUI) {
  figma.ui.postMessage(message);
}

// =============================================================================
// Handlers
// =============================================================================

async function handleReady() {
  // Load all stored data
  const syncBaseline = loadChunked<BaselineData>(KEYS.SYNC_BASELINE);
  const codeBaseline = loadChunked<BaselineData>(KEYS.CODE_BASELINE);
  const history = loadSimple<SyncEvent[]>(KEYS.HISTORY) || [];
  const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
  const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];
  const settings = await loadClientStorage<PluginSettings>('settings');

  // Get current collections and styles
  const collections = getCollectionInfos().map(c => ({
    ...c,
    excluded: excludedCollections.includes(c.name),
  }));

  const styleTypes = getStyleTypeInfos().map(s => ({
    ...s,
    excluded: excludedStyleTypes.includes(s.type),
  }));

  // Determine if first time (no sync baseline)
  const isFirstTime = !syncBaseline;

  // Calculate current diff if we have a baseline
  let syncDiff;
  if (syncBaseline) {
    const currentTokens = collectVariables({ excludedCollections });
    const currentStyles = collectStyles({ excludedStyleTypes });
    const currentBaseline = buildBaseline(currentTokens, currentStyles);
    syncDiff = compareBaselines(syncBaseline, currentBaseline);
  }

  // Determine sync status
  let syncStatus: PluginState['syncStatus'] = { state: 'not-setup' };
  if (syncBaseline) {
    const pendingChanges = syncDiff ? countChanges(syncDiff) : 0;
    if (pendingChanges > 0) {
      syncStatus = { state: 'pending-changes', pendingChanges };
    } else {
      syncStatus = { state: 'in-sync' };
    }

    if (history.length > 0) {
      const lastSync = history[0];
      syncStatus.lastSync = {
        timestamp: lastSync.timestamp,
        user: lastSync.user,
        changeCount: lastSync.changeCount,
      };
    }
  }

  sendMessage({
    type: 'initialized',
    state: {
      syncStatus,
      collections,
      styleTypes,
      syncBaseline: syncBaseline || undefined,
      codeBaseline: codeBaseline || undefined,
      syncDiff,
      history,
      settings: settings || {
        remote: {
          enabled: false,
          source: 'none',
          autoCheck: false,
        },
        excludedCollections,
        excludedStyleTypes,
      },
      isFirstTime,
    },
  });
}

async function handleInit() {
  await handleReady();
}

async function handleSync() {
  sendMessage({ type: 'sync-started' });

  try {
    // Get settings
    const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
    const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];

    // Collect current state
    const tokens = collectVariables({ excludedCollections });
    const styles = collectStyles({ excludedStyleTypes });

    // Build baseline
    const newBaseline = buildBaseline(tokens, styles);

    // Load old baseline for comparison
    const oldBaseline = loadChunked<BaselineData>(KEYS.SYNC_BASELINE);

    // Compare if we have an old baseline
    let diff;
    if (oldBaseline) {
      diff = compareBaselines(oldBaseline, newBaseline);
    }

    // Save new baseline
    saveChunked(KEYS.SYNC_BASELINE, newBaseline);

    // Update history
    const changeCount = diff ? countChanges(diff) : Object.keys(newBaseline.baseline).length;
    const user = figma.currentUser?.name || 'unknown';

    const history = loadSimple<SyncEvent[]>(KEYS.HISTORY) || [];
    const newEvent: SyncEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      user,
      direction: 'to-code',
      changeCount,
      changes: diff ? getChangedPaths(diff) : undefined,
    };

    const updatedHistory = [newEvent, ...history].slice(0, 10);
    saveSimple(KEYS.HISTORY, updatedHistory);

    sendMessage({
      type: 'sync-complete',
      baseline: newBaseline,
      diff,
    });
  } catch (error) {
    sendMessage({
      type: 'sync-error',
      error: String(error),
    });
  }
}

function handleGetCollections() {
  const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
  const collections = getCollectionInfos().map(c => ({
    ...c,
    excluded: excludedCollections.includes(c.name),
  }));

  sendMessage({
    type: 'collections-update',
    collections,
  });
}

function handleSaveExcludedCollections(collections: string[]) {
  saveSimple(KEYS.EXCLUDED_COLLECTIONS, collections);
  handleGetCollections();
}

function handleGetStyleTypes() {
  const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];
  const styleTypes = getStyleTypeInfos().map(s => ({
    ...s,
    excluded: excludedStyleTypes.includes(s.type),
  }));

  sendMessage({
    type: 'style-types-update',
    styleTypes,
  });
}

function handleSaveExcludedStyleTypes(styleTypes: StyleType[]) {
  saveSimple(KEYS.EXCLUDED_STYLE_TYPES, styleTypes);
  handleGetStyleTypes();
}

async function handleFetchRemote() {
  sendMessage({ type: 'fetch-started' });

  try {
    const settings = await loadClientStorage<PluginSettings>('settings');
    if (!settings?.remote.github) {
      throw new Error('GitHub not configured. Please configure in Settings.');
    }

    const { owner, repo, branch, path, token } = settings.remote.github;

    if (!owner || !repo) {
      throw new Error('Repository not configured');
    }

    // Fetch from GitHub
    const url = token
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch || 'main'}`
      : `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}/${path}`;

    const headers: Record<string, string> = {
      'Accept': token ? 'application/vnd.github.v3+json' : 'application/json',
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    let content: string;
    if (token) {
      // GitHub API returns base64 encoded content
      const data = await response.json();
      content = atob(data.content);
    } else {
      content = await response.text();
    }

    // Parse and validate
    const codeBaseline = JSON.parse(content) as BaselineData;

    if (!codeBaseline.baseline) {
      throw new Error('Invalid baseline format: missing baseline field');
    }

    // Save code baseline
    saveChunked(KEYS.CODE_BASELINE, codeBaseline);

    // Update settings with last fetch time
    settings.remote.lastFetch = new Date().toISOString();
    await saveClientStorage('settings', settings);

    // Compare with current Figma state
    const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
    const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];

    const tokens = collectVariables({ excludedCollections });
    const styles = collectStyles({ excludedStyleTypes });
    const currentBaseline = buildBaseline(tokens, styles);

    // Use path-based comparison for code baseline (may not have IDs)
    const diff = compareByPath(currentBaseline, codeBaseline);

    sendMessage({
      type: 'fetch-complete',
      baseline: codeBaseline,
      diff,
    });
  } catch (error) {
    sendMessage({
      type: 'fetch-error',
      error: String(error),
    });
  }
}

async function handleImportBaseline(data: string) {
  try {
    const codeBaseline = JSON.parse(data) as BaselineData;

    if (!codeBaseline.baseline) {
      throw new Error('Invalid baseline format: missing baseline field');
    }

    // Save code baseline
    saveChunked(KEYS.CODE_BASELINE, codeBaseline);

    // Compare with current Figma state
    const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
    const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];

    const tokens = collectVariables({ excludedCollections });
    const styles = collectStyles({ excludedStyleTypes });
    const currentBaseline = buildBaseline(tokens, styles);

    // Use path-based comparison for imported baseline (may not have IDs)
    const diff = compareByPath(currentBaseline, codeBaseline);

    sendMessage({
      type: 'import-complete',
      baseline: codeBaseline,
      diff,
    });
  } catch (error) {
    sendMessage({
      type: 'import-error',
      error: String(error),
    });
  }
}

async function handleApplyToFigma() {
  sendMessage({ type: 'apply-started' });

  try {
    const codeBaseline = loadChunked<BaselineData>(KEYS.CODE_BASELINE);
    if (!codeBaseline) {
      throw new Error('No code baseline to apply');
    }

    // Get current Figma state
    const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
    const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];

    const currentTokens = collectVariables({ excludedCollections });
    const currentStyles = collectStyles({ excludedStyleTypes });
    const currentBaseline = buildBaseline(currentTokens, currentStyles);

    // Compare to get diff
    const diff = compareByPath(currentBaseline, codeBaseline);

    let created = 0;
    let updated = 0;

    // Apply new variables
    for (const newVar of diff.newVariables) {
      await createOrUpdateVariable(codeBaseline.baseline, newVar);
      created++;
    }

    // Apply value changes
    for (const change of diff.valueChanges) {
      await createOrUpdateVariable(codeBaseline.baseline, change);
      updated++;
    }

    // Apply new styles
    for (const newStyle of diff.newStyles) {
      if (codeBaseline.styles) {
        await createOrUpdateStyle(codeBaseline.styles, newStyle);
        created++;
      }
    }

    // Apply style value changes
    for (const styleChange of diff.styleValueChanges) {
      if (codeBaseline.styles) {
        await createOrUpdateStyle(codeBaseline.styles, styleChange);
        updated++;
      }
    }

    // Update history
    const user = figma.currentUser?.name || 'unknown';
    const history = loadSimple<SyncEvent[]>(KEYS.HISTORY) || [];

    const allChangePaths = [
      ...diff.newVariables.map(v => v.path),
      ...diff.valueChanges.map(v => v.path),
      ...diff.newStyles.map(s => `[style] ${s.path}`),
      ...diff.styleValueChanges.map(s => `[style] ${s.path}`),
    ];

    const newEvent: SyncEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      user,
      direction: 'from-code',
      changeCount: created + updated,
      changes: allChangePaths.slice(0, 20),
    };

    const updatedHistory = [newEvent, ...history].slice(0, 10);
    saveSimple(KEYS.HISTORY, updatedHistory);

    // Update sync baseline after apply
    const newTokens = collectVariables({ excludedCollections });
    const newStyles = collectStyles({ excludedStyleTypes });
    const newSyncBaseline = buildBaseline(newTokens, newStyles);
    saveChunked(KEYS.SYNC_BASELINE, newSyncBaseline);

    sendMessage({
      type: 'apply-complete',
      summary: { created, updated },
    });
  } catch (error) {
    sendMessage({
      type: 'apply-error',
      error: String(error),
    });
  }
}

function handleGetHistory() {
  const history = loadSimple<SyncEvent[]>(KEYS.HISTORY) || [];
  sendMessage({
    type: 'history-update',
    history,
  });
}

async function handleGetSettings() {
  const settings = await loadClientStorage<PluginSettings>('settings');
  const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
  const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];

  sendMessage({
    type: 'settings-update',
    settings: settings || {
      remote: {
        enabled: false,
        source: 'none',
        autoCheck: false,
      },
      excludedCollections,
      excludedStyleTypes,
    },
  });
}

async function handleSaveSettings(partial: Partial<RemoteSettings>) {
  const settings = await loadClientStorage<PluginSettings>('settings') || {
    remote: { enabled: false, source: 'none', autoCheck: false },
    excludedCollections: [],
    excludedStyleTypes: [],
  };

  settings.remote = { ...settings.remote, ...partial };
  await saveClientStorage('settings', settings);

  await handleGetSettings();
}

async function handleTestConnection() {
  try {
    const settings = await loadClientStorage<PluginSettings>('settings');
    if (!settings?.remote.github) {
      sendMessage({
        type: 'connection-test-result',
        success: false,
        error: 'GitHub not configured',
      });
      return;
    }

    const { owner, repo, branch, path, token } = settings.remote.github;
    const url = token
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch || 'main'}`
      : `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}/${path}`;

    const headers: Record<string, string> = {
      'Accept': token ? 'application/vnd.github.v3+json' : 'application/json',
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(url, { headers, method: 'HEAD' });

    if (response.ok) {
      sendMessage({
        type: 'connection-test-result',
        success: true,
      });
    } else {
      sendMessage({
        type: 'connection-test-result',
        success: false,
        error: `HTTP ${response.status}`,
      });
    }
  } catch (error) {
    sendMessage({
      type: 'connection-test-result',
      success: false,
      error: String(error),
    });
  }
}

// =============================================================================
// Baseline Building
// =============================================================================

function buildBaseline(tokens: TokenEntry[], styles: StyleEntry[]): BaselineData {
  const baseline: Record<string, BaselineEntry> = {};

  for (const token of tokens) {
    // Key format: variableId:collection.mode
    const key = token.variableId
      ? `${token.variableId}:${token.collection}.${token.mode}`
      : `${token.path}:${token.collection}.${token.mode}`;

    baseline[key] = {
      path: token.path,
      value: token.value,
      type: token.type,
      collection: token.collection,
      mode: token.mode,
      variableId: token.variableId,
      collectionId: token.collectionId,
      modeId: token.modeId,
      description: token.description,
      scopes: token.scopes,
      codeSyntax: token.codeSyntax,
    };
  }

  // Build styles baseline
  const stylesBaseline: Record<string, StyleBaselineEntry> = {};

  for (const style of styles) {
    // Key format: styleId
    const key = style.styleId;

    stylesBaseline[key] = {
      styleId: style.styleId,
      type: style.type,
      path: style.path,
      value: style.value,
      description: style.description,
    };
  }

  return {
    baseline,
    styles: Object.keys(stylesBaseline).length > 0 ? stylesBaseline : undefined,
    metadata: {
      syncedAt: new Date().toISOString(),
    },
  };
}

// =============================================================================
// Variable Creation/Update
// =============================================================================

async function createOrUpdateVariable(
  baseline: Record<string, BaselineEntry>,
  change: { path: string; value: unknown; type: string; collection: string; mode: string; variableId?: string }
): Promise<void> {
  // Find or create collection
  let collection = figma.variables.getLocalVariableCollections().find(
    c => c.name === change.collection
  );

  if (!collection) {
    collection = figma.variables.createVariableCollection(change.collection);
  }

  // Find or create mode
  let modeId = collection.modes.find(m => m.name === change.mode)?.modeId;

  if (!modeId) {
    // For collections with single "Mode 1", rename it
    if (collection.modes.length === 1 && collection.modes[0].name === 'Mode 1') {
      collection.renameMode(collection.modes[0].modeId, change.mode);
      modeId = collection.modes[0].modeId;
    } else {
      modeId = collection.addMode(change.mode);
    }
  }

  // Find or create variable
  let variable: Variable | null = null;

  if (change.variableId) {
    variable = figma.variables.getVariableById(change.variableId);
  }

  if (!variable) {
    // Try to find by name
    const variableName = change.path.replace(/\./g, '/');
    const existingVariables = collection.variableIds
      .map(id => figma.variables.getVariableById(id))
      .filter((v): v is Variable => v !== null && v.name === variableName);

    variable = existingVariables[0] || null;
  }

  if (!variable) {
    // Create new variable
    const resolvedType = getResolvedType(change.type);
    const variableName = change.path.replace(/\./g, '/');
    variable = figma.variables.createVariable(variableName, collection, resolvedType);
  }

  // Set value
  const value = convertValueForFigma(change.value, change.type);
  variable.setValueForMode(modeId, value);
}

// =============================================================================
// Style Creation/Update
// =============================================================================

async function createOrUpdateStyle(
  stylesBaseline: Record<string, StyleBaselineEntry>,
  change: { path: string; value: unknown; styleType: StyleType; styleId?: string }
): Promise<void> {
  const styleName = change.path.replace(/\./g, '/');

  // Try to find existing style
  let existingStyle: PaintStyle | TextStyle | EffectStyle | null = null;

  if (change.styleId) {
    existingStyle = figma.getStyleById(change.styleId) as PaintStyle | TextStyle | EffectStyle | null;
  }

  if (!existingStyle) {
    // Try to find by name
    if (change.styleType === 'paint') {
      existingStyle = figma.getLocalPaintStyles().find(s => s.name === styleName) || null;
    } else if (change.styleType === 'text') {
      existingStyle = figma.getLocalTextStyles().find(s => s.name === styleName) || null;
    } else if (change.styleType === 'effect') {
      existingStyle = figma.getLocalEffectStyles().find(s => s.name === styleName) || null;
    }
  }

  // Get the style value from baseline
  const styleEntry = Object.values(stylesBaseline).find(s => s.path === change.path);
  if (!styleEntry) return;

  const styleValue = styleEntry.value as Record<string, unknown>;

  if (change.styleType === 'paint') {
    if (!existingStyle) {
      existingStyle = figma.createPaintStyle();
      existingStyle.name = styleName;
    }

    const paints = convertToPaints(styleValue);
    if (paints) {
      (existingStyle as PaintStyle).paints = paints;
    }
  } else if (change.styleType === 'text') {
    if (!existingStyle) {
      existingStyle = figma.createTextStyle();
      existingStyle.name = styleName;
    }

    await applyTypographyStyle(existingStyle as TextStyle, styleValue);
  } else if (change.styleType === 'effect') {
    if (!existingStyle) {
      existingStyle = figma.createEffectStyle();
      existingStyle.name = styleName;
    }

    const effects = convertToEffects(styleValue);
    if (effects) {
      (existingStyle as EffectStyle).effects = effects;
    }
  }
}

function convertToPaints(styleValue: Record<string, unknown>): Paint[] | null {
  if (!styleValue.$type) return null;

  if (styleValue.$type === 'color') {
    const colorValue = styleValue.$value as string;
    const rgba = parseColor(colorValue);
    return [{
      type: 'SOLID',
      color: { r: rgba.r, g: rgba.g, b: rgba.b },
      opacity: rgba.a,
    }];
  }

  if (styleValue.$type === 'gradient') {
    const gradientData = styleValue.$value as {
      gradientType: string;
      stops: Array<{ color: string; position: number }>;
      angle?: number;
    };

    const gradientTypeMap: Record<string, 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND'> = {
      linear: 'GRADIENT_LINEAR',
      radial: 'GRADIENT_RADIAL',
      angular: 'GRADIENT_ANGULAR',
      diamond: 'GRADIENT_DIAMOND',
    };

    const gradientStops: ColorStop[] = gradientData.stops.map(stop => {
      const rgba = parseColor(stop.color);
      return {
        position: stop.position,
        color: { r: rgba.r, g: rgba.g, b: rgba.b, a: rgba.a },
      };
    });

    return [{
      type: gradientTypeMap[gradientData.gradientType] || 'GRADIENT_LINEAR',
      gradientStops,
      gradientTransform: [[1, 0, 0], [0, 1, 0]], // Identity transform
    }];
  }

  return null;
}

async function applyTypographyStyle(style: TextStyle, styleValue: Record<string, unknown>): Promise<void> {
  if (styleValue.$type !== 'typography') return;

  const typographyValue = styleValue.$value as {
    fontFamily: string;
    fontSize: string;
    fontWeight: number | string;
    lineHeight: string | number;
    letterSpacing: string;
    textTransform?: string;
    textDecoration?: string;
  };

  // Load font
  const fontWeight = typeof typographyValue.fontWeight === 'number'
    ? weightToStyle(typographyValue.fontWeight)
    : typographyValue.fontWeight;

  try {
    await figma.loadFontAsync({ family: typographyValue.fontFamily, style: fontWeight });
    style.fontName = { family: typographyValue.fontFamily, style: fontWeight };
  } catch {
    // Font not available, try loading default
    try {
      await figma.loadFontAsync({ family: typographyValue.fontFamily, style: 'Regular' });
      style.fontName = { family: typographyValue.fontFamily, style: 'Regular' };
    } catch {
      // Keep existing font
    }
  }

  // Font size
  const fontSize = parseFloat(typographyValue.fontSize);
  if (!isNaN(fontSize)) {
    style.fontSize = fontSize;
  }

  // Line height
  if (typographyValue.lineHeight === 'auto') {
    style.lineHeight = { unit: 'AUTO' };
  } else if (typeof typographyValue.lineHeight === 'string') {
    if (typographyValue.lineHeight.endsWith('%')) {
      style.lineHeight = { unit: 'PERCENT', value: parseFloat(typographyValue.lineHeight) };
    } else {
      style.lineHeight = { unit: 'PIXELS', value: parseFloat(typographyValue.lineHeight) };
    }
  } else if (typeof typographyValue.lineHeight === 'number') {
    style.lineHeight = { unit: 'PIXELS', value: typographyValue.lineHeight };
  }

  // Letter spacing
  if (typographyValue.letterSpacing.endsWith('%')) {
    style.letterSpacing = { unit: 'PERCENT', value: parseFloat(typographyValue.letterSpacing) };
  } else {
    style.letterSpacing = { unit: 'PIXELS', value: parseFloat(typographyValue.letterSpacing) };
  }

  // Text case
  if (typographyValue.textTransform) {
    const caseMap: Record<string, TextCase> = {
      uppercase: 'UPPER',
      lowercase: 'LOWER',
      capitalize: 'TITLE',
      'small-caps': 'SMALL_CAPS',
    };
    style.textCase = caseMap[typographyValue.textTransform] || 'ORIGINAL';
  }

  // Text decoration
  if (typographyValue.textDecoration) {
    const decorationMap: Record<string, TextDecoration> = {
      underline: 'UNDERLINE',
      'line-through': 'STRIKETHROUGH',
    };
    style.textDecoration = decorationMap[typographyValue.textDecoration] || 'NONE';
  }
}

function weightToStyle(weight: number): string {
  const weightMap: Record<number, string> = {
    100: 'Thin',
    200: 'Extra Light',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'Semi Bold',
    700: 'Bold',
    800: 'Extra Bold',
    900: 'Black',
  };
  return weightMap[weight] || 'Regular';
}

function convertToEffects(styleValue: Record<string, unknown>): Effect[] | null {
  if (!styleValue.$type) return null;

  if (styleValue.$type === 'shadow') {
    const shadowData = styleValue.$value;
    const shadows = Array.isArray(shadowData) ? shadowData : [shadowData];

    return shadows.map((shadow: {
      offsetX: string;
      offsetY: string;
      blur: string;
      spread: string;
      color: string;
      inset?: boolean;
    }) => {
      const rgba = parseColor(shadow.color);
      return {
        type: shadow.inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
        color: rgba,
        offset: {
          x: parseFloat(shadow.offsetX),
          y: parseFloat(shadow.offsetY),
        },
        radius: parseFloat(shadow.blur),
        spread: parseFloat(shadow.spread),
        visible: true,
        blendMode: 'NORMAL',
      } as DropShadowEffect | InnerShadowEffect;
    });
  }

  if (styleValue.$type === 'blur') {
    const blurData = styleValue.$value as { radius: string };
    return [{
      type: 'LAYER_BLUR',
      radius: parseFloat(blurData.radius),
      visible: true,
    }];
  }

  return null;
}

function getResolvedType(type: string): VariableResolvedDataType {
  switch (type.toLowerCase()) {
    case 'color':
      return 'COLOR';
    case 'number':
    case 'dimension':
      return 'FLOAT';
    case 'string':
      return 'STRING';
    case 'boolean':
      return 'BOOLEAN';
    default:
      return 'STRING';
  }
}

function convertValueForFigma(value: unknown, type: string): VariableValue {
  // Handle reference
  if (typeof value === 'object' && value !== null && '$ref' in value) {
    const refId = (value as { $ref: string }).$ref;
    const variable = figma.variables.getVariableById(refId);
    if (variable) {
      return { type: 'VARIABLE_ALIAS', id: variable.id };
    }
  }

  // Handle color
  if (type === 'color' && typeof value === 'string') {
    return parseColor(value);
  }

  return value as VariableValue;
}

function parseColor(colorStr: string): RGBA {
  // Handle hex
  if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1);
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16) / 255,
        g: parseInt(hex.slice(2, 4), 16) / 255,
        b: parseInt(hex.slice(4, 6), 16) / 255,
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16) / 255,
        g: parseInt(hex.slice(2, 4), 16) / 255,
        b: parseInt(hex.slice(4, 6), 16) / 255,
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  // Handle rgba
  const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]) / 255,
      g: parseInt(rgbaMatch[2]) / 255,
      b: parseInt(rgbaMatch[3]) / 255,
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  // Default to black
  return { r: 0, g: 0, b: 0, a: 1 };
}

// =============================================================================
// Helpers
// =============================================================================

function countChanges(diff: ReturnType<typeof compareBaselines>): number {
  return (
    diff.valueChanges.length +
    diff.pathChanges.length +
    diff.newVariables.length +
    diff.deletedVariables.length
  );
}

function getChangedPaths(diff: ReturnType<typeof compareBaselines>): string[] {
  const paths: string[] = [];

  for (const change of diff.valueChanges) {
    paths.push(change.path);
  }
  for (const change of diff.pathChanges) {
    paths.push(`${change.oldPath} -> ${change.newPath}`);
  }
  for (const newVar of diff.newVariables) {
    paths.push(`+ ${newVar.path}`);
  }
  for (const deleted of diff.deletedVariables) {
    paths.push(`- ${deleted.path}`);
  }

  return paths.slice(0, 20); // Limit to 20 for storage
}
