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

export interface ModeChange {
  collection: string;
  mode: string;
}

export interface CollectionRename {
  oldCollection: string;
  newCollection: string;
  modeMapping: { oldMode: string; newMode: string }[];
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
}
