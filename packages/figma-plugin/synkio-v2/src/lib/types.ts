// =============================================================================
// Core Types - Aligned with CLI package
// =============================================================================

/**
 * Token entry collected from Figma variables
 * This is what we store in sharedPluginData
 */
export interface TokenEntry {
  variableId: string;
  collectionId: string;
  modeId: string;
  collection: string;
  mode: string;
  path: string;
  value: TokenValue;
  type: TokenType;
  description?: string;
  scopes?: string[];
  codeSyntax?: {
    WEB?: string;
    ANDROID?: string;
    iOS?: string;
  };
}

export type TokenType = 'color' | 'number' | 'string' | 'boolean' | 'dimension';

export type TokenValue =
  | string
  | number
  | boolean
  | { $ref: string }; // Variable alias reference

// =============================================================================
// Style Types
// =============================================================================

export type StyleType = 'paint' | 'text' | 'effect';

export interface BaseStyleEntry {
  styleId: string;
  type: StyleType;
  path: string;
  description?: string;
}

export interface PaintStyleEntry extends BaseStyleEntry {
  type: 'paint';
  value: ColorValue | GradientValue;
}

export interface TextStyleEntry extends BaseStyleEntry {
  type: 'text';
  value: TypographyValue;
}

export interface EffectStyleEntry extends BaseStyleEntry {
  type: 'effect';
  value: ShadowValue | BlurValue;
}

export type StyleEntry = PaintStyleEntry | TextStyleEntry | EffectStyleEntry;

export interface ColorValue {
  $type: 'color';
  $value: string;
}

export interface GradientValue {
  $type: 'gradient';
  $value: {
    gradientType: 'linear' | 'radial' | 'angular' | 'diamond';
    stops: Array<{ color: string; position: number }>;
    angle?: number;
  };
}

export interface TypographyValue {
  $type: 'typography';
  $value: {
    fontFamily: string;
    fontSize: string;
    fontWeight: number | string;
    lineHeight: string | number;
    letterSpacing: string;
    textTransform?: string;
    textDecoration?: string;
  };
}

export interface ShadowValue {
  $type: 'shadow';
  $value: ShadowObject | ShadowObject[];
}

export interface ShadowObject {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
  inset?: boolean;
}

export interface BlurValue {
  $type: 'blur';
  $value: {
    radius: string;
  };
}

// =============================================================================
// Baseline Types - What gets stored and compared
// =============================================================================

export interface BaselineEntry {
  path: string;
  value: unknown;
  type: string;
  collection: string;
  mode: string;
  variableId?: string;
  collectionId?: string;
  modeId?: string;
  description?: string;
  scopes?: string[];
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
}

export interface StyleBaselineEntry {
  styleId: string;
  type: StyleType;
  path: string;
  value: unknown;
  description?: string;
}

export interface BaselineData {
  baseline: Record<string, BaselineEntry>;
  styles?: Record<string, StyleBaselineEntry>;
  metadata: {
    syncedAt: string;
  };
}

// =============================================================================
// Comparison Types
// =============================================================================

export interface ValueChange {
  variableId: string;
  path: string;
  oldValue: unknown;
  newValue: unknown;
  type: string;
  collection: string;
  mode: string;
}

export interface PathChange {
  variableId: string;
  oldPath: string;
  newPath: string;
  value: unknown;
  type: string;
  collection: string;
  mode: string;
}

export interface NewVariable {
  variableId: string;
  path: string;
  value: unknown;
  type: string;
  collection: string;
  mode: string;
}

export interface DeletedVariable {
  variableId: string;
  path: string;
  value: unknown;
  type: string;
  collection: string;
  mode: string;
}

export interface ModeRename {
  collection: string;
  oldMode: string;
  newMode: string;
}

export interface ModeChange {
  collection: string;
  mode: string;
}

export interface CollectionRename {
  oldCollection: string;
  newCollection: string;
}

export interface ComparisonResult {
  valueChanges: ValueChange[];
  pathChanges: PathChange[];
  collectionRenames: CollectionRename[];
  modeRenames: ModeRename[];
  newModes: ModeChange[];
  deletedModes: ModeChange[];
  newVariables: NewVariable[];
  deletedVariables: DeletedVariable[];
  // Style changes
  styleValueChanges: StyleValueChange[];
  stylePathChanges: StylePathChange[];
  newStyles: NewStyle[];
  deletedStyles: DeletedStyle[];
}

// =============================================================================
// Style Comparison Types
// =============================================================================

export interface StyleValueChange {
  styleId: string;
  path: string;
  oldValue: unknown;
  newValue: unknown;
  styleType: StyleType;
}

export interface StylePathChange {
  styleId: string;
  oldPath: string;
  newPath: string;
  value: unknown;
  styleType: StyleType;
}

export interface NewStyle {
  styleId: string;
  path: string;
  value: unknown;
  styleType: StyleType;
}

export interface DeletedStyle {
  styleId: string;
  path: string;
  value: unknown;
  styleType: StyleType;
}

// =============================================================================
// Collection Info
// =============================================================================

export interface CollectionInfo {
  id: string;
  name: string;
  modes: ModeInfo[];
  variableCount: number;
  excluded: boolean;
}

export interface ModeInfo {
  id: string;
  name: string;
}

export interface StyleTypeInfo {
  type: StyleType;
  count: number;
  excluded: boolean;
}

// =============================================================================
// History Types
// =============================================================================

export type SyncDirection = 'to-code' | 'from-code';

export interface SyncEvent {
  id: string;
  timestamp: number;
  user: string;
  direction: SyncDirection;
  changeCount: number;
  changes?: string[]; // Token paths that changed
}

// =============================================================================
// Settings Types
// =============================================================================

export interface GitHubSettings {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token?: string;
}

export interface RemoteSettings {
  enabled: boolean;
  source: 'github' | 'url' | 'none';
  github?: GitHubSettings;
  customUrl?: string;
  autoCheck: boolean;
  lastFetch?: string;
}

export interface PluginSettings {
  remote: RemoteSettings;
  excludedCollections: string[];
  excludedStyleTypes: StyleType[];
}

// =============================================================================
// Plugin State
// =============================================================================

export type Screen = 'home' | 'sync' | 'apply' | 'history' | 'settings' | 'onboarding';

export interface SyncStatus {
  state: 'in-sync' | 'pending-changes' | 'out-of-sync' | 'not-setup';
  lastSync?: {
    timestamp: number;
    user: string;
    changeCount: number;
  };
  pendingChanges?: number;
}

export interface PluginState {
  screen: Screen;
  isLoading: boolean;
  loadingMessage?: string;
  error?: string;

  // Data
  syncStatus: SyncStatus;
  collections: CollectionInfo[];
  styleTypes: StyleTypeInfo[];
  syncBaseline?: BaselineData;
  codeBaseline?: BaselineData;
  syncDiff?: ComparisonResult;
  codeDiff?: ComparisonResult;
  history: SyncEvent[];
  settings: PluginSettings;

  // First-time state
  isFirstTime: boolean;
}

// =============================================================================
// Message Types (UI <-> Plugin Code)
// =============================================================================

export type MessageToCode =
  | { type: 'ready' }
  | { type: 'init' }
  | { type: 'sync' }
  | { type: 'get-collections' }
  | { type: 'save-excluded-collections'; collections: string[] }
  | { type: 'get-style-types' }
  | { type: 'save-excluded-style-types'; styleTypes: StyleType[] }
  | { type: 'fetch-remote' }
  | { type: 'import-baseline'; data: string }
  | { type: 'apply-to-figma' }
  | { type: 'get-history' }
  | { type: 'get-settings' }
  | { type: 'save-settings'; settings: Partial<RemoteSettings> }
  | { type: 'test-connection' }
  | { type: 'clear-all-data' }
  | { type: 'navigate'; screen: Screen }
  | { type: 'close' }
  | { type: 'fetch-remote-result'; content: string }
  | { type: 'fetch-remote-error'; error: string }
  | { type: 'create-pr' }
  | { type: 'pr-created-result'; prUrl: string; prNumber: number }
  | { type: 'pr-created-error'; error: string };

export type MessageToUI =
  | { type: 'initialized'; state: Partial<PluginState> }
  | { type: 'state-update'; state: Partial<PluginState> }
  | { type: 'sync-started' }
  | { type: 'sync-complete'; baseline: BaselineData; diff?: ComparisonResult }
  | { type: 'sync-error'; error: string }
  | { type: 'collections-update'; collections: CollectionInfo[] }
  | { type: 'style-types-update'; styleTypes: StyleTypeInfo[] }
  | { type: 'fetch-started' }
  | { type: 'fetch-complete'; baseline: BaselineData; diff?: ComparisonResult }
  | { type: 'fetch-error'; error: string }
  | { type: 'do-fetch-remote'; github: GitHubSettings }
  | { type: 'import-complete'; baseline: BaselineData; diff?: ComparisonResult }
  | { type: 'import-error'; error: string }
  | { type: 'apply-started' }
  | { type: 'apply-complete'; summary: { created: number; updated: number; renamed: number } }
  | { type: 'apply-error'; error: string }
  | { type: 'history-update'; history: SyncEvent[] }
  | { type: 'settings-update'; settings: PluginSettings }
  | { type: 'connection-test-result'; success: boolean; error?: string }
  | { type: 'data-cleared' }
  | { type: 'do-create-pr'; github: GitHubSettings; files: Record<string, string>; prTitle: string; prBody: string }
  | { type: 'pr-created'; prUrl: string; prNumber: number }
  | { type: 'pr-error'; error: string };
