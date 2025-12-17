/**
 * Shared types for Synkio Figma plugin
 */

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

export interface SyncData {
  version: string;
  timestamp: string;
  tokens: TokenEntry[];
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
