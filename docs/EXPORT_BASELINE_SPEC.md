# Export Baseline Feature Specification

## Overview

Enable **code-first design systems** by allowing developers to export token files into a baseline format that can be applied to Figma via the Synkio plugin.

## Design Principle

**One format, one import flow, two actions.**

- Use the same `baseline.json` structure for both sync and export
- Plugin has one "Import Baseline" flow (already exists)
- Add "Apply to Figma" action to create/update variables from imported baseline

## Flows

### Flow 1: Figma → Code (existing sync)

```
Figma Variables
      ↓
Plugin stores in sharedPluginData (with IDs)
      ↓
CLI fetches via API
      ↓
Writes synkio/baseline.json + token files (with IDs in $extensions)
```

### Flow 2: Code → Figma (new export)

```
Token files on disk
      ↓
CLI reads and merges
      ↓
Writes synkio/export-baseline.json
      ↓
User pastes/uploads into plugin
      ↓
Plugin imports baseline, shows diff
      ↓
User clicks "Apply to Figma"
      ↓
Plugin creates/updates variables
```

### Flow 3: Roundtrip (sync → edit → apply)

```
Sync from Figma (has IDs)
      ↓
Developer edits token files
      ↓
Export baseline (preserves IDs)
      ↓
Apply to Figma (updates existing variables by ID)
```

## Output Format

The export uses the **same structure as `baseline.json`** from sync. The only difference is that IDs are optional.

### Code-First Example (No IDs)

```json
{
  "baseline": {
    "colors.primary:primitives.value": {
      "collection": "primitives",
      "mode": "value",
      "path": "colors.primary",
      "value": "#0066cc",
      "type": "color"
    },
    "colors.neutral.100:primitives.value": {
      "collection": "primitives",
      "mode": "value",
      "path": "colors.neutral.100",
      "value": "#f5f5f5",
      "type": "color"
    },
    "spacing.sm:primitives.value": {
      "collection": "primitives",
      "mode": "value",
      "path": "spacing.sm",
      "value": 8,
      "type": "number"
    },
    "bg.primary:theme.light": {
      "collection": "theme",
      "mode": "light",
      "path": "bg.primary",
      "value": "{primitives.colors.primary}",
      "type": "color"
    },
    "bg.primary:theme.dark": {
      "collection": "theme",
      "mode": "dark",
      "path": "bg.primary",
      "value": "{primitives.colors.neutral.100}",
      "type": "color"
    }
  },
  "metadata": {
    "syncedAt": "2025-12-21T10:30:00.000Z",
    "source": "export"
  }
}
```

### Roundtrip Example (Has IDs)

```json
{
  "baseline": {
    "VariableID:1:31:primitives.value": {
      "variableId": "VariableID:1:31",
      "collectionId": "VariableCollectionId:1:30",
      "modeId": "1:0",
      "collection": "primitives",
      "mode": "value",
      "path": "colors.primary",
      "value": "#0066cc",
      "type": "color"
    },
    "VariableID:1:45:theme.light": {
      "variableId": "VariableID:1:45",
      "collectionId": "VariableCollectionId:1:40",
      "modeId": "1:1",
      "collection": "theme",
      "mode": "light",
      "path": "bg.primary",
      "value": { "$ref": "VariableID:1:31" },
      "type": "color"
    }
  },
  "metadata": {
    "syncedAt": "2025-12-21T10:30:00.000Z",
    "source": "export"
  }
}
```

### Key Format Details

| Field | Code-First | Roundtrip | Required |
|-------|------------|-----------|----------|
| Baseline key | `{path}:{collection}.{mode}` | `{variableId}:{collection}.{mode}` | Yes |
| `collection` | Present | Present | Yes |
| `mode` | Present | Present | Yes |
| `path` | Present | Present | Yes |
| `value` | Present | Present | Yes |
| `type` | Present | Present | Yes |
| `variableId` | Absent | Present | No |
| `collectionId` | Absent | Present | No |
| `modeId` | Absent | Present | No |
| `description` | Optional | Optional | No |
| `scopes` | Optional | Optional | No |

### Alias Value Formats

The plugin must handle two alias formats:

| Format | Example | Source |
|--------|---------|--------|
| Path reference | `"{primitives.colors.primary}"` | Code-first tokens |
| ID reference | `{ "$ref": "VariableID:1:31" }` | Roundtrip from sync |

---

## CLI Command

### Command Signature

```bash
synkio export-baseline [options]

Options:
  --output, -o <path>   Output file path (default: synkio/export-baseline.json)
  --config, -c <path>   Config file path (default: synkio.config.json)
  --preview             Print output to console without writing file
  --verbose             Show detailed processing information
```

### Example Usage

```bash
# Export to default location
synkio export-baseline

# Custom output path
synkio export-baseline --output ./for-figma.json

# Preview without writing
synkio export-baseline --preview

# With verbose logging
synkio export-baseline --verbose
```

### Console Output

```
Exporting baseline...

Reading collections:
  ✓ primitives (3 files, splitBy: group)
  ✓ theme (2 files, splitBy: mode)

Tokens found:
  • primitives: 24 tokens (1 mode)
  • theme: 18 tokens (2 modes)

Written to synkio/export-baseline.json
Total: 42 tokens from 2 collections
```

---

## CLI Implementation

### File Structure

```
packages/cli/src/
├── cli/commands/
│   └── export-baseline.ts       # CLI command entry point
├── core/export/
│   ├── index.ts                 # Public exports
│   ├── file-discoverer.ts       # Find token files based on config
│   ├── token-parser.ts          # Parse DTCG token files
│   ├── baseline-builder.ts      # Build baseline structure
│   └── export-baseline.test.ts  # Tests
```

### Phase 1: File Discovery

**File**: `packages/cli/src/core/export/file-discoverer.ts`

Discovers token files based on collection configuration.

```typescript
import { readdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

export interface DiscoveredFile {
  /** Absolute path to the file */
  path: string;
  /** Filename without directory */
  filename: string;
  /** Collection name from config */
  collection: string;
  /** Split strategy for this collection */
  splitBy: 'mode' | 'group' | 'none';
}

export interface DiscoveryResult {
  files: DiscoveredFile[];
  errors: string[];
}

/**
 * Discover token files for all collections in config
 */
export async function discoverTokenFiles(
  collections: Record<string, CollectionConfig>,
  baseDir: string
): Promise<DiscoveryResult> {
  const files: DiscoveredFile[] = [];
  const errors: string[] = [];

  for (const [name, config] of Object.entries(collections)) {
    const collectionDir = resolve(baseDir, config.dir || name);
    const splitBy = config.splitBy || 'none';

    try {
      const entries = await readdir(collectionDir);
      const jsonFiles = entries.filter(f => f.endsWith('.json'));

      if (jsonFiles.length === 0) {
        errors.push(`No JSON files found in ${collectionDir}`);
        continue;
      }

      for (const filename of jsonFiles) {
        files.push({
          path: resolve(collectionDir, filename),
          filename,
          collection: name,
          splitBy,
        });
      }
    } catch (err) {
      errors.push(`Cannot read directory ${collectionDir}: ${err.message}`);
    }
  }

  return { files, errors };
}

/**
 * Extract mode name from filename based on splitBy strategy
 *
 * Examples:
 *   splitBy: "mode"  -> "theme.light.json" -> "light"
 *   splitBy: "group" -> "primitives.colors.json" -> uses defaultMode
 *   splitBy: "none"  -> "theme.json" -> uses defaultMode
 */
export function extractModeFromFile(
  file: DiscoveredFile,
  defaultMode: string = 'value'
): string {
  if (file.splitBy !== 'mode') {
    return defaultMode;
  }

  // Pattern: {collection}.{mode}.json or {mode}.json
  const baseName = file.filename.replace(/\.json$/i, '');
  const parts = baseName.split('.');

  // If filename is "theme.light", mode is "light"
  // If filename is "light", mode is "light"
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

/**
 * Extract group name from filename for splitBy: "group"
 *
 * Example: "primitives.colors.json" -> "colors"
 */
export function extractGroupFromFile(file: DiscoveredFile): string | null {
  if (file.splitBy !== 'group') {
    return null;
  }

  const baseName = file.filename.replace(/\.json$/i, '');
  const parts = baseName.split('.');

  // If filename is "primitives.colors", group is "colors"
  // If filename is "colors", group is "colors"
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}
```

### Phase 2: Token Parser

**File**: `packages/cli/src/core/export/token-parser.ts`

Parses DTCG-format token files into flat token entries.

```typescript
import { readFile } from 'node:fs/promises';

export interface ParsedToken {
  path: string;
  value: unknown;
  type: string;
  variableId?: string;
  description?: string;
  scopes?: string[];
}

export interface ParseResult {
  tokens: ParsedToken[];
  errors: string[];
}

/**
 * Parse a DTCG token file into flat token entries
 */
export async function parseTokenFile(filePath: string): Promise<ParseResult> {
  const content = await readFile(filePath, 'utf-8');
  const json = JSON.parse(content);

  const tokens: ParsedToken[] = [];
  const errors: string[] = [];

  traverseTokens(json, [], tokens, errors);

  return { tokens, errors };
}

/**
 * Recursively traverse token tree and extract tokens
 */
function traverseTokens(
  node: unknown,
  path: string[],
  tokens: ParsedToken[],
  errors: string[]
): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  const obj = node as Record<string, unknown>;

  // Check if this is a token (has $value and $type)
  if ('$value' in obj && '$type' in obj) {
    const token: ParsedToken = {
      path: path.join('.'),
      value: obj.$value,
      type: obj.$type as string,
    };

    // Extract optional fields from $extensions
    if (obj.$extensions && typeof obj.$extensions === 'object') {
      const ext = obj.$extensions as Record<string, unknown>;

      // Check for com.figma namespace
      if (ext['com.figma'] && typeof ext['com.figma'] === 'object') {
        const figma = ext['com.figma'] as Record<string, unknown>;

        if (figma.variableId) {
          token.variableId = figma.variableId as string;
        }
        if (figma.scopes && Array.isArray(figma.scopes)) {
          token.scopes = figma.scopes as string[];
        }
      }
    }

    // Extract description
    if (obj.$description && typeof obj.$description === 'string') {
      token.description = obj.$description;
    }

    tokens.push(token);
    return;
  }

  // Not a token - recurse into children
  for (const [key, value] of Object.entries(obj)) {
    // Skip DTCG special keys
    if (key.startsWith('$')) {
      continue;
    }

    traverseTokens(value, [...path, key], tokens, errors);
  }
}

/**
 * Handle includeMode: true structure where modes are top-level keys
 *
 * Input structure:
 * {
 *   "light": { "colors": { "primary": { "$value": "#fff" } } },
 *   "dark": { "colors": { "primary": { "$value": "#000" } } }
 * }
 *
 * Returns: Map of mode name to tokens
 */
export function parseMultiModeFile(
  json: Record<string, unknown>
): Map<string, ParsedToken[]> {
  const result = new Map<string, ParsedToken[]>();

  for (const [key, value] of Object.entries(json)) {
    // Skip if it looks like a token (has $value)
    if (key.startsWith('$') || (typeof value === 'object' && value && '$value' in value)) {
      continue;
    }

    // Assume top-level keys are mode names
    const tokens: ParsedToken[] = [];
    const errors: string[] = [];
    traverseTokens(value, [], tokens, errors);

    if (tokens.length > 0) {
      result.set(key, tokens);
    }
  }

  return result;
}
```

### Phase 3: Baseline Builder

**File**: `packages/cli/src/core/export/baseline-builder.ts`

Builds the baseline structure from parsed tokens.

```typescript
import type { ParsedToken } from './token-parser.js';
import type { DiscoveredFile } from './file-discoverer.js';

export interface BaselineEntry {
  variableId?: string;
  collectionId?: string;
  modeId?: string;
  collection: string;
  mode: string;
  path: string;
  value: unknown;
  type: string;
  description?: string;
  scopes?: string[];
}

export interface ExportBaseline {
  baseline: Record<string, BaselineEntry>;
  metadata: {
    syncedAt: string;
    source: 'export';
  };
}

/**
 * Build baseline key for a token
 *
 * With variableId:    "VariableID:1:31:theme.light"
 * Without variableId: "colors.primary:theme.light"
 */
export function buildBaselineKey(
  token: ParsedToken,
  collection: string,
  mode: string
): string {
  const suffix = `${collection}.${mode}`;

  if (token.variableId) {
    return `${token.variableId}:${suffix}`;
  }

  return `${token.path}:${suffix}`;
}

/**
 * Build baseline entry from parsed token
 */
export function buildBaselineEntry(
  token: ParsedToken,
  collection: string,
  mode: string
): BaselineEntry {
  const entry: BaselineEntry = {
    collection,
    mode,
    path: token.path,
    value: token.value,
    type: token.type,
  };

  // Include IDs if present (roundtrip scenario)
  if (token.variableId) {
    entry.variableId = token.variableId;
  }

  // Include optional metadata
  if (token.description) {
    entry.description = token.description;
  }
  if (token.scopes && token.scopes.length > 0) {
    entry.scopes = token.scopes;
  }

  return entry;
}

/**
 * Build complete export baseline from all parsed files
 */
export function buildExportBaseline(
  parsedFiles: Array<{
    file: DiscoveredFile;
    tokens: ParsedToken[];
    mode: string;
  }>
): ExportBaseline {
  const baseline: Record<string, BaselineEntry> = {};

  for (const { file, tokens, mode } of parsedFiles) {
    for (const token of tokens) {
      const key = buildBaselineKey(token, file.collection, mode);
      const entry = buildBaselineEntry(token, file.collection, mode);

      // Check for duplicates
      if (baseline[key]) {
        throw new Error(
          `Duplicate token: "${token.path}" in collection "${file.collection}" mode "${mode}"`
        );
      }

      baseline[key] = entry;
    }
  }

  return {
    baseline,
    metadata: {
      syncedAt: new Date().toISOString(),
      source: 'export',
    },
  };
}
```

### Phase 4: Export Command

**File**: `packages/cli/src/cli/commands/export-baseline.ts`

```typescript
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadConfig } from '../../core/config.js';
import { discoverTokenFiles, extractModeFromFile } from '../../core/export/file-discoverer.js';
import { parseTokenFile, parseMultiModeFile } from '../../core/export/token-parser.js';
import { buildExportBaseline } from '../../core/export/baseline-builder.js';
import { logger } from '../../utils/logger.js';

export interface ExportBaselineOptions {
  output?: string;
  config?: string;
  preview?: boolean;
  verbose?: boolean;
}

const DEFAULT_OUTPUT = 'synkio/export-baseline.json';

export async function exportBaseline(options: ExportBaselineOptions = {}): Promise<void> {
  const outputPath = options.output || DEFAULT_OUTPUT;

  // 1. Load config
  logger.info('Loading configuration...');
  const config = await loadConfig(options.config);

  if (!config.tokens?.collections || Object.keys(config.tokens.collections).length === 0) {
    throw new Error(
      'No collections configured. Add collections to tokens.collections in synkio.config.json'
    );
  }

  // 2. Discover token files
  logger.info('Discovering token files...');
  const baseDir = process.cwd();
  const { files, errors: discoveryErrors } = await discoverTokenFiles(
    config.tokens.collections,
    baseDir
  );

  if (discoveryErrors.length > 0) {
    for (const err of discoveryErrors) {
      logger.warn(err);
    }
  }

  if (files.length === 0) {
    throw new Error('No token files found');
  }

  if (options.verbose) {
    logger.info(`Found ${files.length} token files`);
  }

  // 3. Parse all files
  logger.info('Parsing token files...');
  const parsedFiles: Array<{
    file: typeof files[0];
    tokens: Awaited<ReturnType<typeof parseTokenFile>>['tokens'];
    mode: string;
  }> = [];

  for (const file of files) {
    const { tokens, errors: parseErrors } = await parseTokenFile(file.path);

    if (parseErrors.length > 0) {
      for (const err of parseErrors) {
        logger.warn(`${file.filename}: ${err}`);
      }
    }

    // Check for multi-mode structure (includeMode: true)
    if (tokens.length === 0) {
      const content = JSON.parse(await readFile(file.path, 'utf-8'));
      const multiMode = parseMultiModeFile(content);

      if (multiMode.size > 0) {
        for (const [mode, modeTokens] of multiMode) {
          parsedFiles.push({ file, tokens: modeTokens, mode });
        }
        continue;
      }
    }

    const mode = extractModeFromFile(file, config.tokens.defaultMode || 'value');
    parsedFiles.push({ file, tokens, mode });

    if (options.verbose) {
      logger.info(`  ${file.filename}: ${tokens.length} tokens (mode: ${mode})`);
    }
  }

  // 4. Build baseline
  logger.info('Building baseline...');
  const exportData = buildExportBaseline(parsedFiles);

  const tokenCount = Object.keys(exportData.baseline).length;
  const collections = new Set(
    Object.values(exportData.baseline).map(t => t.collection)
  );

  // 5. Output
  if (options.preview) {
    console.log(JSON.stringify(exportData, null, 2));
  } else {
    await mkdir(dirname(resolve(outputPath)), { recursive: true });
    await writeFile(resolve(outputPath), JSON.stringify(exportData, null, 2));
    logger.success(`Written to ${outputPath}`);
  }

  logger.info(`Total: ${tokenCount} tokens from ${collections.size} collections`);
}
```

### Phase 5: Register Command

**File**: `packages/cli/src/cli/bin.ts` (modification)

Add to command registration:

```typescript
import { exportBaseline } from './commands/export-baseline.js';

// In command handling:
case 'export-baseline':
  await exportBaseline({
    output: args['--output'] || args['-o'],
    config: args['--config'] || args['-c'],
    preview: args['--preview'],
    verbose: args['--verbose'],
  });
  break;
```

Add to help text:

```typescript
function showHelp() {
  console.log(`
  Commands:
    ...existing commands...
    export-baseline    Export token files to baseline format for Figma import

  export-baseline options:
    --output, -o <path>   Output file (default: synkio/export-baseline.json)
    --config, -c <path>   Config file (default: synkio.config.json)
    --preview             Print to console without writing file
    --verbose             Show detailed processing info
  `);
}
```

---

## Plugin Implementation

### Current State

The plugin already has import functionality (`import-baseline` message handler at line 898-939 in `code.ts`). It:

1. Parses JSON from UI
2. Validates structure via `convertCLIBaselineToSyncData()`
3. Saves as baseline in sharedPluginData
4. Shows diff against current Figma state

**Current limitation**: Requires `variableId` (line 652):
```typescript
if (!t.variableId || !t.collection || !t.mode || !t.path || t.value === undefined || !t.type) {
  return { error: `...missing required fields` };
}
```

### Required Changes

#### Change 1: Relax Validation

**File**: `packages/figma-plugin/synkio-ui/code.ts`

**Location**: `convertCLIBaselineToSyncData()` function (line 628-685)

```typescript
// BEFORE (line 652)
if (!t.variableId || !t.collection || !t.mode || !t.path || t.value === undefined || !t.type) {
  return { error: `Invalid token entry: ${key} is missing required fields` };
}

// AFTER
if (!t.collection || !t.mode || !t.path || t.value === undefined || !t.type) {
  return { error: `Invalid token entry: ${key} is missing required fields (collection, mode, path, value, type)` };
}
```

#### Change 2: Add "Apply to Figma" Message Handler

Add new message type after the `import-baseline` handler:

```typescript
if (msg.type === 'apply-to-figma') {
  await applyBaselineToFigma();
}
```

#### Change 3: Implement Apply Logic

Add these new functions to `code.ts`:

```typescript
// =============================================================================
// Apply to Figma Functions
// =============================================================================

/**
 * Build a map of existing variables: "collection.path" -> Variable
 */
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

/**
 * Build a map of existing collections: name -> VariableCollection
 */
async function buildCollectionMap(): Promise<Map<string, VariableCollection>> {
  const map = new Map<string, VariableCollection>();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  for (const collection of collections) {
    map.set(collection.name, collection);
  }

  return map;
}

/**
 * Get or create a collection by name
 */
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

/**
 * Get or create a mode in a collection
 */
function getOrCreateMode(
  collection: VariableCollection,
  modeName: string
): string {
  // Check if mode exists
  const existingMode = collection.modes.find(m => m.name === modeName);
  if (existingMode) {
    return existingMode.modeId;
  }

  // Rename default "Mode 1" if it's the only mode
  if (collection.modes.length === 1 && collection.modes[0].name === 'Mode 1') {
    collection.renameMode(collection.modes[0].modeId, modeName);
    return collection.modes[0].modeId;
  }

  // Add new mode
  return collection.addMode(modeName);
}

/**
 * Map token type to Figma VariableResolvedDataType
 */
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

/**
 * Convert token value to Figma value
 */
function convertValueToFigma(
  value: unknown,
  type: string,
  variableLookup: Map<string, string> // path -> variableId
): VariableValue {
  // Handle alias reference: { "$ref": "VariableID:xxx" }
  if (typeof value === 'object' && value !== null && '$ref' in value) {
    const refId = (value as { $ref: string }).$ref;
    return { type: 'VARIABLE_ALIAS', id: refId };
  }

  // Handle path reference: "{collection.path}" or "{path}"
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

  // Handle color values
  if (type.toLowerCase() === 'color' && typeof value === 'string') {
    return parseColor(value);
  }

  // Handle other primitives
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  throw new Error(`Unsupported value type: ${typeof value}`);
}

/**
 * Parse color string to Figma RGBA
 */
function parseColor(color: string): RGBA {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  // Handle rgba()
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

/**
 * Extract path references from a value
 */
function extractReferences(value: unknown): string[] {
  if (typeof value === 'string') {
    const match = value.match(/^\{(.+)\}$/);
    if (match) return [match[1]];
  }
  // $ref format doesn't need resolution - already has ID
  return [];
}

/**
 * Topological sort tokens by dependencies
 * Returns tokens in order where dependencies come before dependents
 */
function sortByDependencies(tokens: TokenEntry[]): TokenEntry[] {
  // Build adjacency list
  const graph = new Map<string, string[]>();
  const tokenMap = new Map<string, TokenEntry>();

  for (const token of tokens) {
    const key = `${token.collection}.${token.path}`;
    tokenMap.set(key, token);

    const refs = extractReferences(token.value);
    graph.set(key, refs);
  }

  // Topological sort using DFS
  const sorted: TokenEntry[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(key: string): void {
    if (visited.has(key)) return;

    if (visiting.has(key)) {
      throw new Error(`Circular reference detected involving: ${key}`);
    }

    visiting.add(key);

    // Visit dependencies first
    for (const dep of graph.get(key) || []) {
      // Try to find the dependency
      if (tokenMap.has(dep)) {
        visit(dep);
      }
      // If not in our token set, it must exist in Figma already
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

/**
 * Find a variable ID by path reference
 * Tries multiple resolution strategies
 */
function resolveReference(
  refPath: string,
  currentCollection: string,
  existingVars: Map<string, Variable>,
  createdVars: Map<string, string>
): string {
  // Strategy 1: Exact match (full path with collection)
  if (createdVars.has(refPath)) {
    return createdVars.get(refPath)!;
  }
  const existingExact = existingVars.get(refPath);
  if (existingExact) {
    return existingExact.id;
  }

  // Strategy 2: Same collection prefix
  const withCollection = `${currentCollection}.${refPath}`;
  if (createdVars.has(withCollection)) {
    return createdVars.get(withCollection)!;
  }
  const existingWithCollection = existingVars.get(withCollection);
  if (existingWithCollection) {
    return existingWithCollection.id;
  }

  // Strategy 3: Search all (suffix match)
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

/**
 * Apply imported baseline to Figma
 * Creates new variables or updates existing ones
 */
async function applyBaselineToFigma(): Promise<void> {
  const baseline = getBaselineSnapshot();

  if (!baseline || !baseline.tokens || baseline.tokens.length === 0) {
    figma.notify('No baseline to apply. Import a baseline first.', { error: true });
    return;
  }

  try {
    // Build lookup maps
    const existingVars = await buildExistingVariableMap();
    const collectionMap = await buildCollectionMap();
    const createdVars = new Map<string, string>(); // path -> variableId

    // Sort tokens by dependencies
    const sortedTokens = sortByDependencies(baseline.tokens);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Process tokens in dependency order
    for (const token of sortedTokens) {
      const fullPath = `${token.collection}.${token.path}`;

      try {
        // Get or create collection
        const collection = await getOrCreateCollection(token.collection, collectionMap);

        // Get or create mode
        const modeId = getOrCreateMode(collection, token.mode);

        // Try to find existing variable
        let variable: Variable | null = null;

        // By ID (roundtrip case)
        if (token.variableId) {
          variable = await figma.variables.getVariableByIdAsync(token.variableId);
        }

        // By name in collection
        if (!variable) {
          const existing = existingVars.get(fullPath);
          if (existing) {
            variable = existing;
          }
        }

        // Create new variable if not found
        if (!variable) {
          const figmaType = mapTokenTypeToFigma(token.type);
          const figmaName = token.path.replace(/\./g, '/');
          variable = figma.variables.createVariable(figmaName, collection, figmaType);
          created++;
        } else {
          updated++;
        }

        // Track created variable
        createdVars.set(fullPath, variable.id);

        // Build lookup for reference resolution
        const variableLookup = new Map<string, string>();
        for (const [path, varId] of createdVars) {
          variableLookup.set(path, varId);
        }
        for (const [path, v] of existingVars) {
          if (!variableLookup.has(path)) {
            variableLookup.set(path, v.id);
          }
        }

        // Convert and set value
        const figmaValue = convertValueToFigma(token.value, token.type, variableLookup);
        variable.setValueForMode(modeId, figmaValue);

        // Set optional metadata
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

    // Refresh diff view
    await sendDiffToUI();

    figma.ui.postMessage({ type: 'apply-success', created, updated, skipped });

  } catch (err) {
    figma.notify(`Apply failed: ${err.message}`, { error: true });
    figma.ui.postMessage({ type: 'apply-error', error: err.message });
  }
}
```

#### Change 4: Update UI

Add "Apply to Figma" button to the UI after import.

**File**: `packages/figma-plugin/synkio-ui/ui.ts` (or relevant UI file)

Add button in the diff view area:

```html
<button id="apply-btn" class="primary-btn" disabled>
  Apply to Figma
</button>
```

Enable after successful import:

```typescript
// After import success
document.getElementById('apply-btn').disabled = false;

// Button click handler
document.getElementById('apply-btn').addEventListener('click', () => {
  parent.postMessage({ pluginMessage: { type: 'apply-to-figma' } }, '*');
});
```

---

## Alias Resolution Details

### Supported Alias Formats

| Format | Example | When Used |
|--------|---------|-----------|
| Path reference | `"{colors.primary}"` | Code-first tokens |
| Full path reference | `"{primitives.colors.primary}"` | Cross-collection references |
| ID reference | `{ "$ref": "VariableID:1:31" }` | Roundtrip from sync |

### Resolution Strategy

1. **ID reference (`$ref`)**: Use ID directly, no resolution needed
2. **Path reference**: Resolve in this order:
   - Exact match in created variables
   - Exact match in existing Figma variables
   - Same-collection prefix match
   - Suffix match across all collections

### Dependency Ordering

Tokens are sorted topologically before applying:

```
Input:
  bg.main = {colors.primary}
  colors.primary = #0066cc

Sorted:
  colors.primary = #0066cc  (no dependencies, created first)
  bg.main = {colors.primary} (depends on colors.primary, created second)
```

### Circular Reference Detection

Circular references are detected during topological sort:

```
A → B → C → A  (circular)

Error: "Circular reference detected involving: A"
```

---

## Edge Cases

### 1. Missing collection config

```
Error: "No collections configured. Add collections to tokens.collections in synkio.config.json"
```

### 2. No token files found

```
Error: "No token files found"
```

### 3. Invalid DTCG format

```
Warning: "theme.light.json: Invalid token at path colors.primary - missing $type"
```

File is skipped, export continues with other files.

### 4. Duplicate tokens

```
Error: "Duplicate token: colors.primary in collection primitives mode value"
```

Same path in same collection/mode from different files.

### 5. Unresolvable reference

```
Error: "Cannot resolve reference: {nonexistent.token}"
```

Referenced token doesn't exist in import or Figma.

### 6. Circular reference

```
Error: "Circular reference detected involving: theme.bg.primary"
```

### 7. Type mismatch on update

When updating an existing variable with a different type:

```
Error: "Cannot change variable type from COLOR to FLOAT"
```

Figma doesn't allow changing variable types. Variable is skipped.

### 8. Cross-collection reference not found

```
// In theme collection
bg.main = {primitives.colors.primary}

// But primitives collection not in import AND not in Figma
Error: "Cannot resolve reference: {primitives.colors.primary}"
```

---

## Testing Strategy

### Unit Tests

**CLI tests** (`packages/cli/src/core/export/*.test.ts`):

```typescript
describe('file-discoverer', () => {
  it('discovers files for splitBy: mode');
  it('discovers files for splitBy: group');
  it('discovers files for splitBy: none');
  it('extracts mode from filename');
  it('handles missing directories');
});

describe('token-parser', () => {
  it('parses simple tokens');
  it('parses nested token groups');
  it('extracts variableId from extensions');
  it('handles multi-mode structure');
  it('skips invalid tokens with warning');
});

describe('baseline-builder', () => {
  it('builds correct baseline keys without IDs');
  it('builds correct baseline keys with IDs');
  it('detects duplicate tokens');
});

describe('export-baseline command', () => {
  it('exports from splitBy: mode collection');
  it('exports from splitBy: group collection');
  it('exports mixed collections');
  it('handles --preview flag');
  it('errors on missing config');
});
```

### Plugin Tests (Manual)

1. **Code-first flow**:
   - Create token files manually
   - Run `synkio export-baseline`
   - Import in plugin
   - Click "Apply to Figma"
   - Verify variables created

2. **Roundtrip flow**:
   - Sync from Figma
   - Edit token values
   - Run `synkio export-baseline`
   - Import in plugin
   - Click "Apply to Figma"
   - Verify variables updated (not duplicated)

3. **Alias resolution**:
   - Create tokens with `{path}` references
   - Export and apply
   - Verify aliases created correctly in Figma

4. **Error cases**:
   - Circular reference
   - Missing reference
   - Invalid token format

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `packages/cli/src/core/export/index.ts` | Public exports |
| `packages/cli/src/core/export/file-discoverer.ts` | Find token files |
| `packages/cli/src/core/export/token-parser.ts` | Parse DTCG files |
| `packages/cli/src/core/export/baseline-builder.ts` | Build baseline structure |
| `packages/cli/src/cli/commands/export-baseline.ts` | CLI command |
| `packages/cli/src/core/export/export-baseline.test.ts` | Tests |

### Modified Files

| File | Change |
|------|--------|
| `packages/cli/src/cli/bin.ts` | Register command, add help |
| `packages/cli/src/types/schemas.ts` | Make IDs optional (if validation used) |
| `packages/figma-plugin/synkio-ui/code.ts` | Relax validation, add apply logic |
| `packages/figma-plugin/synkio-ui/ui.ts` | Add "Apply to Figma" button |
| `packages/cli/USER_GUIDE.md` | Document command |
| `CLAUDE.md` | Add to architecture docs |

---

## Success Criteria

- [ ] `synkio export-baseline` runs without errors
- [ ] Handles all three `splitBy` strategies correctly
- [ ] Output validates against baseline schema
- [ ] Plugin imports code-first baseline (no IDs)
- [ ] Plugin imports roundtrip baseline (with IDs)
- [ ] "Apply to Figma" creates new variables
- [ ] "Apply to Figma" updates existing variables (by ID)
- [ ] Alias resolution works for `{path}` format
- [ ] Alias resolution works for `$ref` format
- [ ] Circular references detected and reported
- [ ] Missing references reported clearly
- [ ] No breaking changes to existing sync flow
- [ ] Documentation updated

---

## Out of Scope (Future Enhancements)

- Export styles alongside tokens
- `--collection` flag to export specific collections
- `--dry-run` validation mode (check importability without writing)
- Conflict resolution UI for mismatched changes
- Automatic sync after apply
