/**
 * Shared types for Synkio CLI and Figma plugin
 */

export interface TokenEntry {
  variableId: string;
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
}
