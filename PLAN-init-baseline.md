# Plan: `synkio init-baseline` Command

## Problem Statement

On first `synkio pull`, there's no `baseline.json` with variable IDs. Without IDs, the comparison system can't distinguish:
- A **rename** (`colors.primary` → `colors.brand`) — same variable, new path
- A **delete + add** — unrelated variables

This means the first pull has no meaningful diff detection for teams with existing token files.

## Solution Overview

Introduce `synkio init-baseline` — a command that creates a baseline.json from existing token files **before** the first Figma pull. This baseline has no Figma IDs but establishes the "current state" of code tokens.

When `pull` detects a baseline without IDs, it switches to **path-based comparison** for that one-time bootstrap, showing what would change. After confirmation, the baseline is replaced with Figma's version (which has IDs), and all future pulls use ID-based comparison.

## Relationship to `export-baseline`

The existing `export-baseline` command has enrichment logic that tries to add variableIds from an existing baseline. This was designed for "roundtrip" workflows (Figma → code → Figma).

**`init-baseline` is a stripped-down version** that:
- Reuses: `discoverTokenFiles()`, `parseTokenFile()`, `buildExportBaseline()`
- Skips: All enrichment logic, style lookup, style handling
- Writes: Just `baseline.json` with `source: 'init'`

The enrichment logic in `export-baseline` can be simplified/removed later since the Figma plugin already has the IDs when applying changes.

---

## Command Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  BOOTSTRAP FLOW (one-time)                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. synkio init                                                     │
│     └── Creates synkio.config.json (already exists)                 │
│                                                                     │
│  2. User configures synkio.config.json                              │
│     └── Sets collections, output paths, splitBy strategies          │
│                                                                     │
│  3. synkio init-baseline                                            │
│     └── Reads token files based on config                           │
│     └── Creates baseline.json WITHOUT IDs                           │
│     └── metadata.source = "init"                                    │
│     └── No variableId, collectionId, modeId fields                  │
│                                                                     │
│  4. synkio pull (first time)                                        │
│     └── Detects baseline exists but has NO IDs                      │
│     └── Switches to PATH-BASED comparison                           │
│     └── Shows diff: "Figma has X, code has Y"                       │
│     └── On confirm (--force or prompt): replaces baseline with      │
│         Figma's version (now has IDs)                               │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  NORMAL FLOW (subsequent pulls)                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  synkio pull                                                        │
│     └── Baseline has IDs                                            │
│     └── Uses ID-BASED comparison (can detect renames)               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: `init-baseline` Command

### Location
`packages/cli/src/cli/commands/init-baseline.ts`

### Purpose
Create a baseline.json from existing token files on disk, without any Figma IDs. This is a **simplified version of export-baseline** without enrichment logic.

### Input
- `synkio.config.json` — defines collections and their output paths

### Output
- `synkio/baseline.json` — baseline structure without IDs:

```json
{
  "baseline": {
    "colors.primary.500:theme.light": {
      "collection": "theme",
      "mode": "light",
      "path": "colors.primary.500",
      "value": "#0066cc",
      "type": "color"
    }
  },
  "styles": {},
  "metadata": {
    "syncedAt": "2026-01-03T10:00:00.000Z",
    "source": "init"
  }
}
```

**Note:** No `variableId`, `collectionId`, or `modeId` fields.

### CLI Interface

```bash
synkio init-baseline [options]

Options:
  --config <path>    Path to config file (default: synkio.config.json)
  --dry-run          Show what would be created without writing
  --force            Overwrite existing baseline.json if present

Examples:
  synkio init-baseline
  synkio init-baseline --dry-run
  synkio init-baseline --force
```

### Behavior

| Scenario | Behavior |
|----------|----------|
| No config file | Error: "No synkio.config.json found. Run 'synkio init' first." |
| No collections in config | Error: "No collections configured." |
| No token files found | Warning + create empty baseline |
| Token files found | Parse and create baseline |
| baseline.json exists | Error: "baseline.json already exists. Use --force to overwrite." |
| baseline.json exists + --force | Overwrite |
| --dry-run | Print summary, don't write |

### Code Reuse from `export-baseline`

| Module | Function | Reuse |
|--------|----------|-------|
| `file-discoverer.ts` | `discoverTokenFiles()` | ✅ As-is |
| `file-discoverer.ts` | `extractModeFromFile()` | ✅ As-is |
| `file-discoverer.ts` | `extractGroupFromFile()` | ✅ As-is |
| `token-parser.ts` | `parseTokenFile()` | ✅ As-is |
| `token-parser.ts` | `parseMultiModeFile()` | ✅ As-is |
| `baseline-builder.ts` | `buildBaselineKey()` | ✅ As-is (handles no-ID case) |
| `baseline-builder.ts` | `buildBaselineEntry()` | ✅ As-is (handles no-ID case) |
| `baseline-builder.ts` | `buildExportBaseline()` | ✅ Call without enrichment options |
| `baseline.ts` | `writeBaseline()` | ✅ As-is (add 'init' source) |

**What we DON'T use from export-baseline:**
- `enrichTokensWithVariableIds()` — skip entirely
- `buildBaselineLookupMap()` — not needed
- `buildStyleLookupMap()` — not needed
- `createLookupFunctions()` — not needed
- Style handling — skip for now

---

## Part 2: Modify `pull` Command for Path-Based Comparison

### Detection Logic

In `pull.ts`, after loading existing baseline:

```typescript
const existingBaseline = await readBaseline();

// Check if baseline exists but has no IDs (init-baseline scenario)
const isIdLessBaseline = existingBaseline && !baselineHasIds(existingBaseline);

if (isIdLessBaseline) {
  // Use path-based comparison for bootstrap
  const result = compareBaselinesByPath(existingBaseline, fetchedBaseline);
  // ... handle result
} else {
  // Normal ID-based comparison (existing logic)
  const result = compareBaselines(existingBaseline, fetchedBaseline);
}
```

### Helper: `baselineHasIds()`

```typescript
function baselineHasIds(baseline: BaselineData): boolean {
  const entries = Object.values(baseline.baseline);
  if (entries.length === 0) return false;
  return entries.some(entry => entry.variableId != null);
}
```

### New: `compareBaselinesByPath()`

Location: `packages/cli/src/core/compare/path-comparison.ts`

Simple path-only comparison:

```typescript
interface PathComparisonResult {
  matched: PathMatch[];           // Same path in both
  onlyInCode: BaselineEntry[];    // In code baseline, not in Figma
  onlyInFigma: BaselineEntry[];   // In Figma, not in code baseline
  valueChanges: PathValueChange[]; // Same path, different value
}
```

### Algorithm

```
1. Build lookup from code baseline: Map<"path:collection.mode", entry>

2. For each Figma entry:
   - Look up by "path:collection.mode"
   - Found → matched (check value change)
   - Not found → onlyInFigma

3. Remaining in code lookup → onlyInCode

4. Return result
```

### Console Output

```
📊 Bootstrap Comparison (path-based)

Comparing by token path (no Figma IDs yet).

✅ Matched: 45 tokens

⚠️  Only in Figma: 3 tokens
   + theme.light/colors.accent.primary
   + theme.dark/colors.accent.primary

⚠️  Only in code: 2 tokens
   - theme.light/colors.old.deprecated

📝 Value changes: 5 tokens
   ~ theme.light/colors.primary.500: "#0066cc" → "#0055bb"

────────────────────────────────────────────────────────────────────
After sync, baseline will have Figma's variable IDs.
Use --force to proceed.
```

---

## Part 3: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `packages/cli/src/cli/commands/init-baseline.ts` | Command (simple, reuses existing modules) |
| `packages/cli/src/core/compare/path-comparison.ts` | Path-based comparison logic |

### Modified Files

| File | Change |
|------|--------|
| `packages/cli/src/cli/bin.ts` | Register `init-baseline` command |
| `packages/cli/src/cli/commands/pull.ts` | Add bootstrap detection branch |
| `packages/cli/src/core/compare/console-display.ts` | Add `displayPathComparisonResult()` |
| `packages/cli/src/types/index.ts` | Add `'init'` to `source` type union (line 52) |
| `packages/cli/src/core/baseline.ts` | Add `'init'` to `writeBaseline` signature (line 93) |

---

## Part 3.5: Type System Updates

The plan requires adding `'init'` as a valid source type. Currently only `'figma' | 'code'` are supported.

### Files to Modify

**`packages/cli/src/types/index.ts` (line 52)**
```typescript
// Before
source?: 'figma' | 'code';

// After
source?: 'figma' | 'code' | 'init';
```

**`packages/cli/src/core/baseline.ts` (line 93)**
```typescript
// Before
export async function writeBaseline(
  data: BaselineData,
  source: 'figma' | 'code'
): Promise<void>

// After
export async function writeBaseline(
  data: BaselineData,
  source: 'figma' | 'code' | 'init'
): Promise<void>
```

**Note:** The `'init'` source is special:
- Does NOT create compare directory files (no rotation needed)
- Only writes `baseline.json` with `source: 'init'` in metadata
- The `writeBaseline` function may need a branch to skip compare file handling for `'init'`

---

## Part 4: Implementation

### 1. `init-baseline.ts` Command

```typescript
// packages/cli/src/cli/commands/init-baseline.ts

import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../../core/config.js';
import { discoverTokenFiles, extractModeFromFile, extractGroupFromFile } from '../../core/export/file-discoverer.js';
import { parseTokenFile, parseMultiModeFile } from '../../core/export/token-parser.js';
import { buildExportBaseline } from '../../core/export/baseline-builder.js';
import { readBaseline, writeBaseline } from '../../core/baseline.js';

export interface InitBaselineOptions {
  config?: string;
  dryRun?: boolean;
  force?: boolean;
}

export async function initBaselineCommand(options: InitBaselineOptions = {}): Promise<void> {
  const spinner = ora('Initializing baseline...').start();

  try {
    // 1. Load config
    spinner.text = 'Loading configuration...';
    const config = loadConfig(options.config);

    if (!config.tokens?.collections || Object.keys(config.tokens.collections).length === 0) {
      spinner.fail(chalk.red('No collections configured'));
      process.exit(1);
    }

    // 2. Check for existing baseline
    const existingBaseline = await readBaseline();
    if (existingBaseline && !options.force) {
      spinner.fail(chalk.red('baseline.json already exists'));
      console.error(chalk.dim('\nUse --force to overwrite\n'));
      process.exit(1);
    }

    // 3. Discover token files
    spinner.text = 'Discovering token files...';
    const baseDir = process.cwd();
    const { files, errors } = await discoverTokenFiles(config.tokens.collections, baseDir);

    if (errors.length > 0) {
      for (const err of errors) {
        console.warn(chalk.yellow(`  Warning: ${err}`));
      }
    }

    if (files.length === 0) {
      spinner.warn(chalk.yellow('No token files found'));
      console.log(chalk.dim('\nCreating empty baseline\n'));
    }

    // 4. Parse all files (reuse export-baseline logic, but simpler)
    spinner.text = 'Parsing token files...';
    const parsedFiles: Array<{
      file: typeof files[0];
      tokens: Awaited<ReturnType<typeof parseTokenFile>>['tokens'];
      mode: string;
    }> = [];

    for (const file of files) {
      const { tokens } = await parseTokenFile(file.path);

      // Handle multi-mode files
      if (tokens.length === 0) {
        const content = JSON.parse(await readFile(file.path, 'utf-8'));
        const multiMode = parseMultiModeFile(content);

        if (multiMode.size > 0) {
          for (const [mode, modeTokens] of multiMode) {
            const groupPrefix = extractGroupFromFile(file);
            if (groupPrefix) {
              for (const token of modeTokens) {
                token.path = `${groupPrefix}.${token.path}`;
              }
            }
            parsedFiles.push({ file, tokens: modeTokens, mode });
          }
          continue;
        }
      }

      // Add group prefix for splitBy: "group"
      const groupPrefix = extractGroupFromFile(file);
      if (groupPrefix) {
        for (const token of tokens) {
          token.path = `${groupPrefix}.${token.path}`;
        }
      }

      const mode = extractModeFromFile(file, 'value');
      parsedFiles.push({ file, tokens, mode });
    }

    // 5. Build baseline WITHOUT enrichment (key difference from export-baseline)
    spinner.text = 'Building baseline...';
    const baselineData = buildExportBaseline(parsedFiles, {
      // No stylesConfig, no getStyleId, no getVariableMetadata
      // This means no ID enrichment happens
    });

    // Override source to 'init'
    baselineData.metadata.source = 'init';

    const tokenCount = Object.keys(baselineData.baseline).length;
    const collections = new Set(
      Object.values(baselineData.baseline).map(t => t.collection)
    );

    // 6. Output
    if (options.dryRun) {
      spinner.stop();
      console.log(chalk.cyan('\n📋 Dry run - would create baseline with:\n'));
      console.log(`  Tokens: ${tokenCount}`);
      console.log(`  Collections: ${Array.from(collections).join(', ')}`);
      console.log(chalk.dim('\n  No variableIds (will be added on first pull)\n'));
      return;
    }

    await writeBaseline(baselineData, 'init');

    spinner.succeed(chalk.green('Baseline initialized!'));
    console.log('');
    console.log(chalk.dim('  Tokens:'), tokenCount);
    console.log(chalk.dim('  Collections:'), Array.from(collections).join(', '));
    console.log(chalk.dim('  Source:'), 'init (no Figma IDs)');
    console.log('');
    console.log(chalk.cyan('  Next step:'));
    console.log(chalk.dim('    Run "synkio pull" to sync with Figma'));
    console.log(chalk.dim('    The first pull will show a path-based comparison'));
    console.log('');

  } catch (error: any) {
    spinner.fail(chalk.red('Init failed'));
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
    process.exit(1);
  }
}
```

### 2. `path-comparison.ts`

```typescript
// packages/cli/src/core/compare/path-comparison.ts

import type { BaselineData, BaselineEntry } from '../../types/index.js';

export interface PathComparisonResult {
  matched: PathMatch[];
  onlyInCode: BaselineEntry[];
  onlyInFigma: BaselineEntry[];
  valueChanges: PathValueChange[];
}

export interface PathMatch {
  path: string;
  collection: string;
  mode: string;
  codeEntry: BaselineEntry;
  figmaEntry: BaselineEntry;
}

export interface PathValueChange {
  path: string;
  collection: string;
  mode: string;
  codeValue: unknown;
  figmaValue: unknown;
}

/**
 * Compare two baselines by path (for bootstrap when code baseline has no IDs)
 */
export function compareBaselinesByPath(
  codeBaseline: BaselineData,
  figmaBaseline: BaselineData
): PathComparisonResult {
  const result: PathComparisonResult = {
    matched: [],
    onlyInCode: [],
    onlyInFigma: [],
    valueChanges: [],
  };

  // Build lookup from code baseline
  const codeLookup = new Map<string, BaselineEntry>();
  for (const entry of Object.values(codeBaseline.baseline)) {
    const key = `${entry.path}:${entry.collection}.${entry.mode}`;
    codeLookup.set(key, entry);
  }

  // Compare Figma entries against code
  for (const figmaEntry of Object.values(figmaBaseline.baseline)) {
    const key = `${figmaEntry.path}:${figmaEntry.collection}.${figmaEntry.mode}`;
    const codeEntry = codeLookup.get(key);

    if (codeEntry) {
      result.matched.push({
        path: figmaEntry.path,
        collection: figmaEntry.collection,
        mode: figmaEntry.mode,
        codeEntry,
        figmaEntry,
      });

      if (!valuesEqual(codeEntry.value, figmaEntry.value)) {
        result.valueChanges.push({
          path: figmaEntry.path,
          collection: figmaEntry.collection,
          mode: figmaEntry.mode,
          codeValue: codeEntry.value,
          figmaValue: figmaEntry.value,
        });
      }

      codeLookup.delete(key);
    } else {
      result.onlyInFigma.push(figmaEntry);
    }
  }

  result.onlyInCode = Array.from(codeLookup.values());

  return result;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Check if a baseline has any variableIds
 */
export function baselineHasIds(baseline: BaselineData): boolean {
  const entries = Object.values(baseline.baseline);
  if (entries.length === 0) return false;
  return entries.some(entry => entry.variableId != null);
}
```

### 3. `pull.ts` Modification

Add after existing baseline is loaded:

```typescript
import { compareBaselinesByPath, baselineHasIds } from '../core/compare/path-comparison.js';
import { displayPathComparisonResult } from '../core/compare/console-display.js';

// ... in pullCommand(), after loading existingBaseline ...

// Check for bootstrap scenario (baseline exists but has no IDs)
const isBootstrapSync = existingBaseline && !baselineHasIds(existingBaseline);

if (isBootstrapSync) {
  console.log(chalk.cyan('📊 Bootstrap sync detected\n'));
  console.log(chalk.dim('Baseline has no Figma IDs. Using path-based comparison.\n'));

  const pathResult = compareBaselinesByPath(existingBaseline, fetchedBaseline);
  displayPathComparisonResult(pathResult);

  const hasChanges =
    pathResult.onlyInCode.length > 0 ||
    pathResult.onlyInFigma.length > 0 ||
    pathResult.valueChanges.length > 0;

  if (hasChanges && !options.force) {
    console.log(chalk.yellow('\n⚠️  Use --force to proceed with bootstrap sync.\n'));
    process.exit(1);
  }

  // Write Figma baseline (has IDs)
  await writeBaseline(fetchedBaseline, 'figma');

  console.log(chalk.green('\n✅ Baseline updated with Figma variable IDs.'));
  console.log(chalk.dim('   Future pulls will use ID-based comparison.\n'));

  return {
    hasChanges,
    hasBreakingChanges: false,
    isFirstSync: false,
    isBootstrapSync: true,
  };
}

// ... continue with normal ID-based comparison ...
```

### 4. Register in `bin.ts`

```typescript
import { initBaselineCommand } from './commands/init-baseline.js';

// In showHelp()
case 'init-baseline':
  console.log('Usage: synkio init-baseline [options]\n');
  console.log('Create baseline.json from existing token files.\n');
  console.log('Options:');
  console.log('  --config <path>  Path to config file');
  console.log('  --dry-run        Preview without writing');
  console.log('  --force          Overwrite existing baseline');
  break;

// In main switch
case 'init-baseline': {
  await initBaselineCommand({
    config: getOption('--config', '-c'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
  });
  break;
}

// In general help
console.log('  init-baseline  Create baseline from existing token files');
```

---

## Part 5: Edge Cases

| Case | Handling |
|------|----------|
| Empty token files | Create empty baseline with warning |
| No token files | Create empty baseline with warning |
| baseline.json exists | Error unless --force |
| Styles in token files | Ignored (variables only for now) |
| Collection/mode name mismatch | Shows as onlyInCode/onlyInFigma |

---

## Part 6: Testing

### Unit Tests
- `path-comparison.test.ts` — test comparison logic
- `init-baseline.test.ts` — test command

### Manual Testing
```bash
cd examples/starter-app
rm synkio/baseline.json
npx synkio init-baseline --dry-run
npx synkio init-baseline
cat synkio/baseline.json  # Verify no IDs
npx synkio pull           # See path comparison
```

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create `init-baseline.ts` (reuses export-baseline modules, no enrichment) |
| 2 | Create `path-comparison.ts` |
| 3 | Modify `pull.ts` to detect ID-less baseline |
| 4 | Add `displayPathComparisonResult()` |
| 5 | Register command in `bin.ts` |
| 6 | Update types |
| 7 | Add tests |

**Key insight:** `init-baseline` is `export-baseline` without the enrichment logic. We reuse `discoverTokenFiles`, `parseTokenFile`, and `buildExportBaseline` but skip the ID lookup/enrichment step.

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `init-baseline.ts` | ✅ Done | `packages/cli/src/cli/commands/init-baseline.ts` |
| `path-comparison.ts` | ✅ Done | `packages/cli/src/core/compare/path-comparison.ts` |
| `displayPathComparisonResult()` | ✅ Done | Added to `console-display.ts` |
| Bootstrap detection in `pull.ts` | ✅ Done | Detects ID-less baseline, uses path comparison |
| `source: 'init'` in types | ✅ Done | Updated `types/index.ts:52` and `baseline.ts:93` |
| Command registration in `bin.ts` | ✅ Done | Help and switch case added |
| Tests | ⏳ Pending | Unit tests not yet written |

**Last reviewed:** 2026-01-03
**Implemented:** 2026-01-03

---

## Part 7: Legacy Code Cleanup (Future)

### Enrichment Logic in export-baseline

The `export-baseline` command contains ~160 lines of enrichment logic that becomes partially redundant once `init-baseline` is adopted.

**Location:** `packages/cli/src/cli/commands/export-baseline.ts` (lines 41-199)

**Functions that become legacy after init-baseline adoption:**
- `buildBaselineLookupMap()` - Creates lookup from existing baseline
- `buildStyleLookupMap()` - Creates lookup for styles
- `createLookupFunctions()` - Creates getStyleId/getVariableMetadata callbacks
- `enrichTokensWithVariableIds()` - Two-pass enrichment (exact + fuzzy match)
- `valuesMatch()` - Value comparison for fuzzy matching
- `hasAnyVariableIds()` - Checks if files already have IDs

**Why NOT remove now:**
1. Teams still use roundtrip workflows (export-baseline → Figma → pull)
2. The fuzzy value-matching helps preserve variable continuity for renamed tokens
3. No deprecation path announced yet

**Cleanup timeline:**
1. Ship `init-baseline` command
2. Add deprecation notice to `export-baseline` (or document preferred workflow)
3. Monitor adoption (1-2 release cycles)
4. Remove enrichment logic from `export-baseline`
5. Consider consolidating `export-baseline` and `init-baseline` into one command with `--source` flag

**Lines of code:** ~160 lines of enrichment-specific code

### Existing Building Blocks (Reusable)

These modules are already designed to work without enrichment:

| Module | Function | Notes |
|--------|----------|-------|
| `file-discoverer.ts` | `discoverTokenFiles()` | Reusable as-is |
| `file-discoverer.ts` | `extractModeFromFile()` | Reusable as-is |
| `file-discoverer.ts` | `extractGroupFromFile()` | Reusable as-is |
| `token-parser.ts` | `parseTokenFile()` | Reusable as-is |
| `token-parser.ts` | `parseMultiModeFile()` | Reusable as-is |
| `baseline-builder.ts` | `buildExportBaseline()` | Pass no enrichment options |
| `collection-matcher.ts` | `hasIdBasedMatching()` | Already checks for IDs (line 448) |
