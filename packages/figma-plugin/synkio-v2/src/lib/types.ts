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
    figmaBaselineHash?: string; // Hash for sync status tracking
    source?: 'figma' | 'code';  // Indicates who last synced this baseline
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
export type SyncActionType = 'cli-save' | 'pr-created' | 'pr-merged' | 'applied-from-code';

export interface SyncEvent {
  id: string;
  timestamp: number;
  user: string;
  direction: SyncDirection;
  changeCount: number;
  changes?: string[]; // Token paths that changed
  action?: SyncActionType; // Type of sync action performed
  prUrl?: string; // PR URL if action was pr-created
  prNumber?: number; // PR number if action was pr-created
}

// =============================================================================
// Settings Types
// =============================================================================

export interface GitHubSettings {
  owner: string;
  repo: string;
  branch: string;
  path: string;              // Path to baseline.json. Default: synkio/baseline.json
  /** @deprecated Use `path` instead. Falls back to path if not set. */
  prPath?: string;
  token?: string;
}

export interface UrlSettings {
  baselineUrl?: string; // URL to baseline.json. Primary field.
  /** @deprecated Use `baselineUrl` instead. Falls back to baselineUrl if not set. */
  exportUrl?: string;
}

export interface RemoteSettings {
  enabled: boolean;
  source: 'github' | 'url' | 'none';
  github?: GitHubSettings;
  url?: UrlSettings;
  customUrl?: string;   // @deprecated - use url.baselineUrl instead
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

export type Screen = 'main' | 'sync' | 'apply' | 'history';
export type MainTab = 'sync' | 'tokens' | 'setup';

export interface SyncStatus {
  state: 'in-sync' | 'pending-changes' | 'out-of-sync' | 'not-setup';
  lastSync?: {
    timestamp: number;
    user: string;
    changeCount: number;
  };
  pendingChanges?: number;
  lastAction?: {
    type: SyncActionType;
    timestamp: number;
    prUrl?: string;
    prNumber?: number;
  };
  figmaBaselineHash?: string; // Hash of the current saved baseline
}

// =============================================================================
// Code Sync Status - Tracks whether code has the latest baseline
// =============================================================================

export type CodeSyncStatus =
  | 'synced'        // baseline.json hash matches Figma hash
  | 'pr-pending'    // PR created with this hash, awaiting merge
  | 'pending-pull'  // Figma saved but CLI hasn't pulled yet
  | 'not-connected' // No GitHub configured
  | 'checking';     // Currently fetching status

export interface CodeSyncState {
  status: CodeSyncStatus;
  lastChecked?: string;           // ISO timestamp
  codeBaselineHash?: string;      // Hash from baseline.json on GitHub
  error?: string;
}

/**
 * Result of testing a path/URL
 */
export interface PathTestResult {
  tested: boolean;
  success?: boolean;
  warning?: boolean;  // true = not found but will be created (yellow/orange)
  error?: string;
}

/**
 * State for the Setup tab form (prevents race conditions from module-level state).
 */
export interface SetupFormState {
  editingSource: 'github' | 'url' | null;
  githubForm: Partial<GitHubSettings>;
  urlForm: Partial<UrlSettings>;
  connectionStatus: {
    tested: boolean;
    success?: boolean;
    error?: string;
  };
  // Individual path test results
  pathTests?: {
    repo?: PathTestResult;
    exportPath?: PathTestResult;  // Used for baseline path testing
  };
  // Raw input value for repository field to avoid re-render issues while typing
  repoInputValue?: string;
}

export interface PluginState {
  screen: Screen;
  isLoading: boolean;
  loadingMessage?: string;
  error?: string;

  // Data
  syncStatus: SyncStatus;
  codeSyncState: CodeSyncState; // Tracks if code has pulled the latest baseline
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
  onboardingStep?: 1 | 2 | 3;  // Only present during first-time flow

  // Setup tab form state (moved from module-level to avoid race conditions)
  setupFormState?: SetupFormState;
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
  | { type: 'complete-onboarding' }
  | { type: 'close' }
  | { type: 'fetch-remote-result'; content: string }
  | { type: 'fetch-remote-error'; error: string }
  | { type: 'create-pr' }
  | { type: 'pr-created-result'; prUrl: string; prNumber: number }
  | { type: 'pr-created-error'; error: string }
  // Code sync status
  | { type: 'check-code-sync' }
  | { type: 'code-sync-result'; content: string }
  | { type: 'code-sync-error'; error: string }
  // Connection test results from UI
  | { type: 'test-connection-result'; success: boolean; error?: string }
  // Debug
  | { type: 'toggle-debug' };

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
  | { type: 'do-fetch-remote-url'; url: string }
  | { type: 'import-complete'; baseline: BaselineData; diff?: ComparisonResult }
  | { type: 'import-error'; error: string }
  | { type: 'apply-started' }
  | { type: 'apply-complete'; summary: { created: number; updated: number; renamed: number } }
  | { type: 'apply-error'; error: string }
  | { type: 'history-update'; history: SyncEvent[] }
  | { type: 'settings-update'; settings: PluginSettings }
  | { type: 'connection-test-result'; success: boolean; error?: string }
  | { type: 'do-test-connection'; github: GitHubSettings }
  | { type: 'do-test-path'; github: GitHubSettings; path: string; testType: 'repo' | 'exportPath' }
  | { type: 'path-test-result'; testType: 'repo' | 'exportPath'; success: boolean; error?: string }
  | { type: 'data-cleared' }
  | { type: 'do-create-pr'; github: GitHubSettings; files: Record<string, string>; prTitle: string; prBody: string }
  | { type: 'pr-created'; prUrl: string; prNumber: number }
  | { type: 'pr-error'; error: string }
  // Code sync status
  | { type: 'do-check-code-sync'; github: GitHubSettings; baselinePath: string }
  | { type: 'do-check-code-sync-url'; url: string }
  | { type: 'code-sync-update'; codeSyncState: CodeSyncState }
  // Debug mode
  | { type: 'debug-toggled'; enabled: boolean };
