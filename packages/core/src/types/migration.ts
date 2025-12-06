/**
 * Migration Types
 *
 * Types for the migration system (config, adapters, migration manifest).
 * Used by: initMigrationConfig, generateMigrationList, UI components
 */

export interface AdapterTransform {
  separator: string;
  case: 'kebab' | 'camel' | 'pascal' | 'snake' | 'constant';
  prefix: string;
  stripSegments: string[];
}

export interface Adapter {
  enabled: boolean;
  include: string[];
  exclude: string[];
  transform: AdapterTransform;
  patterns: string[];
}

export interface MigrationConfigSettings {
  baselinePath: string;
  snapshotPath: string;
  outputPath: string;
  reportPath: string;
}

export interface MigrationConfig {
  $schema?: string;
  version: '1.0.0';
  styleDictionary: {
    enabled: boolean;
    configPath: string | null;
  };
  adapters: Record<string, Adapter | undefined>;
  settings: MigrationConfigSettings;
}

export interface FileMatch {
  file: string;
  line: number;
  content: string;
  platform: string;
}

export interface Migration {
  variableId: string;
  changeType: 'rename' | 'value' | 'delete' | 'add';
  collection: string;
  mode: string;
  type: string;
  oldPath: string[] | null;
  newPath: string[] | null;
  oldValue?: any;
  newValue?: any;
  jsonFile: string | null;
  oldJsonPath: string[] | null;
  newJsonPath: string[] | null;
  tokenNames: Record<string, { old: string | null; new: string | null }>;
  usages: FileMatch[];
}

export interface MigrationSummary {
  totalMigrations: number;
  byChangeType: Record<string, number>;
  byCollection: Record<string, number>;
  breaking: number;
  nonBreaking: number;
  filesAffected: number;
  totalUsages: number;
}

export interface MigrationManifest {
  version: '1.0.0';
  generatedAt: string;
  sourceFile: string;
  baselineDate: string;
  snapshotDate: string;
  configUsed: string | null;
  migrations: Migration[];
  summary: MigrationSummary;
}

// Comparison result types (used by compareFigmaTokens)
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

export interface ComparisonResult {
  valueChanges: ValueChange[];
  pathChanges: PathChange[];
  newModeNames: string[];
  deletedModeNames: string[];
  newVariables: NewVariable[];
  deletedVariables: DeletedVariable[];
}
