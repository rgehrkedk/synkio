/**
 * Shared types for Synkio Figma plugin
 */

// =============================================================================
// Variable Types (existing)
// =============================================================================

export interface TokenEntry {
  variableId: string;
  collectionId?: string;   // Figma's permanent collection ID
  modeId?: string;         // Figma's permanent mode ID
  collection: string;
  mode: string;
  path: string;
  value: any;
  type: string;
  description?: string;
  scopes?: string[];
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
}

// =============================================================================
// Style Types (new)
// =============================================================================

export type StyleType = 'paint' | 'text' | 'effect';

/** Base fields shared by all style entries */
export interface StyleEntryBase {
  styleId: string;          // Permanent Figma style ID (e.g., "S:abc123")
  type: StyleType;          // Discriminator
  path: string;             // From style.name, "/" replaced with "."
  description?: string;     // From style.description
}

/** Paint style - solid colors and gradients */
export interface PaintStyleEntry extends StyleEntryBase {
  type: 'paint';
  value: PaintStyleValue;
}

export interface SolidColorValue {
  $type: 'color';
  $value: string;           // "#rrggbb", "rgba(...)", or "{path.to.variable}"
}

export interface GradientStop {
  color: string;            // Color string or "{path.to.variable}" reference
  position: number;         // 0-1
}

export interface GradientValue {
  $type: 'gradient';
  $value: {
    gradientType: 'linear' | 'radial' | 'angular' | 'diamond';
    stops: GradientStop[];
    angle?: number;         // For linear gradients (degrees)
  };
}

export type PaintStyleValue = SolidColorValue | GradientValue;

/** Text style - typography composite (DTCG format) */
export interface TextStyleEntry extends StyleEntryBase {
  type: 'text';
  value: TypographyValue;
}

export interface TypographyValue {
  $type: 'typography';
  $value: {
    fontFamily: string;
    fontSize: string;           // "16px" or "{variable.ref}"
    fontWeight: number | string; // 400, 700, or "{variable.ref}"
    lineHeight: string | number; // "1.5", "24px", "normal", or "{variable.ref}"
    letterSpacing: string;      // "0.5px", "-0.02em", or "{variable.ref}"
    textTransform?: string;     // "uppercase", "lowercase", "capitalize"
    textDecoration?: string;    // "underline", "line-through"
  };
}

/** Effect style - shadows and blurs */
export interface EffectStyleEntry extends StyleEntryBase {
  type: 'effect';
  value: EffectValue;
}

export interface ShadowObject {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;            // Color string or "{variable.ref}"
  inset?: boolean;
}

export interface ShadowValue {
  $type: 'shadow';
  $value: ShadowObject | ShadowObject[];  // Single or multiple shadows
}

export interface BlurValue {
  $type: 'blur';
  $value: {
    radius: string;
  };
}

export type EffectValue = ShadowValue | BlurValue;

/** Union type for all style entries */
export type StyleEntry = PaintStyleEntry | TextStyleEntry | EffectStyleEntry;

// =============================================================================
// Sync Data
// =============================================================================

export interface SyncData {
  version: string;
  timestamp: string;
  tokens: TokenEntry[];
  styles?: StyleEntry[];    // Optional for backwards compatibility
}

export type ChangeType = 'added' | 'deleted' | 'modified';

export interface DiffEntry {
  id: string;
  name: string;
  type: ChangeType;
  oldValue?: any;
  newValue?: any;
  collection: string;
  mode: string;
}

export interface SyncEvent {
  u: string;      // user
  t: number;      // timestamp (ms)
  c: number;      // changeCount
  p?: string[];   // paths of changed tokens (optional for backwards compat)
}

export interface CollectionRename {
  oldCollection: string;
  newCollection: string;
}

export interface ModeRename {
  collection: string;
  oldMode: string;
  newMode: string;
}

export interface ComparisonResult {
  diffs: DiffEntry[];
  collectionRenames: CollectionRename[];
  modeRenames: ModeRename[];
}

// =============================================================================
// Baseline Types (Phase 1: Separate Sync and Code Baselines)
// =============================================================================

/**
 * Sync Baseline - Used for Figma→Code workflow (Changes Since Last Sync)
 * Always contains variableId for ID-based comparison
 * Created by the Sync button
 */
export interface SyncBaseline {
  type: 'sync';
  tokens: TokenEntry[];      // Always has variableId
  styles?: StyleEntry[];
  timestamp: string;
  syncedTo: 'local' | 'remote';  // Where it was synced to
}

/**
 * Code Baseline - Used for Code→Figma workflow (Compare with Code)
 * May lack variableId for path-based comparison
 * Created by Remote Fetch or Import actions
 */
export interface CodeBaseline {
  type: 'code';
  tokens: TokenEntry[];      // May lack variableId
  styles?: StyleEntry[];
  source: 'fetch' | 'import';
  sourceUrl?: string;
  timestamp: string;
}
