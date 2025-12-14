// @synkio/cli - Type definitions

export interface BaselineEntry {
  path: string;
  value: any;
  type: string;
  collection: string;
  mode: string;
  variableId?: string;
  collectionId?: string;
  modeId?: string;
  // Optional metadata from Figma
  description?: string;
  scopes?: string[];
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
}

export type RawTokens = Record<string, BaselineEntry>;

export interface BaselineData {
  baseline: Record<string, BaselineEntry>;
  metadata: {
    syncedAt: string;
  };
}

export interface ValueChange {
  variableId: string;
  path: string;
  oldValue: any;
  newValue: any;
  type: string;
}

export interface PathChange {
  variableId: string;
  oldPath: string;
  newPath: string;
  value: any;
  type: string;
}

export interface NewVariable {
  variableId: string;
  path: string;
  value: any;
  type: string;
  collection: string;
  mode: string;
}

export interface DeletedVariable {
  variableId: string;
  path: string;
  value: any;
  type: string;
  collection: string;
  mode: string;
}

export interface ModeRename {
  collection: string;
  oldMode: string;
  newMode: string;
}

export interface ComparisonResult {
  valueChanges: ValueChange[];
  pathChanges: PathChange[];
  modeRenames: ModeRename[];
  newModeNames: string[];
  deletedModeNames: string[];
  newVariables: NewVariable[];
  deletedVariables: DeletedVariable[];
}
