# Export Baseline Feature Specification

## Overview

Enable **code-first design systems** by allowing developers to export token files into a baseline.json format that can be imported into Figma via the Synkio plugin.

## Current Flow (Figma → Code)
```
Figma Plugin → sharedPluginData → CLI Sync → baseline.json → token files
```

## New Flow (Code → Figma)
```
token files → CLI Export → export-baseline.json → Plugin Import → Figma Variables
```

## Goals

1. Reuse existing infrastructure (schemas, split strategies, file reading)
2. Minimal new code - mostly **inverse operations** of existing logic
3. Support all existing `splitBy` strategies (`mode`, `group`, `none`)
4. No new config required (use existing `synkio.config.json`)
5. Make `variableId` optional to support code-first tokens

## CLI Command

### Command Signature
```bash
synkio export-baseline [options]

Options:
  --output=<file>     Output path (default: .synkio/export-baseline.json)
  --config=<file>     Config file path (default: synkio.config.json)
  --preview           Show what would be exported without writing file
```

### Example Usage
```bash
# Export to default location
synkio export-baseline

# Custom output path
synkio export-baseline --output=./figma-import.json

# Preview output structure
synkio export-baseline --preview
```

## Implementation Plan

### Phase 1: Schema Updates

**File**: `packages/cli/src/types/schemas.ts`

**Changes**:
- Make `variableId` optional in `SynkioTokenEntrySchema`
- Make `collectionId` optional (if not already)
- Make `modeId` optional (if not already)

**Rationale**: Code-first tokens don't have Figma IDs yet - these are assigned by the plugin during import.

```typescript
export const SynkioTokenEntrySchema = z.object({
  variableId: z.string().optional(),  // ← Change from required
  collectionId: z.string().optional(),
  modeId: z.string().optional(),
  collection: z.string(),
  mode: z.string(),
  path: z.string(),
  value: z.unknown(),
  type: z.string(),
  description: z.string().optional(),
  scopes: z.array(z.string()).optional(),
});
```

### Phase 2: Token File Reader (Reuse)

**Reuse existing**: Token files are already in DTCG format on disk.

**New utility**: Create file discovery and reading logic.

**File**: `packages/cli/src/core/export/file-reader.ts` (NEW)

**Responsibilities**:
1. Discover token files based on `tokens.dir` and `tokens.collections[].dir`
2. Read JSON files from disk
3. Parse DTCG format into internal token structure
4. Handle all three `splitBy` strategies

**Reuse from**:
- File path logic from `file-writer.ts`
- Collection iteration from `pipeline.ts`

### Phase 3: Token Merger (Inverse of Split)

**File**: `packages/cli/src/core/export/token-merger.ts` (NEW)

**Responsibilities**: Merge split token files back into baseline format.

**Reuse from**: `packages/cli/src/core/tokens/split-strategies.ts`
- **splitByMode** → **mergeByMode**: Combine `theme.light.json` + `theme.dark.json` into single collection
- **splitByGroup** → **mergeByGroup**: Combine `globals.colors.json` + `globals.spacing.json` into single collection
- **splitByNone** → **mergeByNone**: Already single file, minimal transformation

**Key logic**:

```typescript
// For splitBy: "mode"
// Files: theme.light.json, theme.dark.json
// → Merge into single collection with modes: ["light", "dark"]

function mergeByMode(files: TokenFile[], collectionName: string) {
  const tokens = [];
  for (const file of files) {
    const modeName = extractModeFromFilename(file.path); // "theme.light.json" → "light"
    for (const token of file.tokens) {
      tokens.push({
        ...token,
        collection: collectionName,
        mode: modeName,
      });
    }
  }
  return tokens;
}
```

**Reuse**: Filename parsing logic (inverse of `file-writer.ts:106-128`)

### Phase 4: DTCG Parser (Reuse)

**Reuse existing**: The CLI already reads DTCG files in `import` command.

**From**: `packages/cli/src/core/import/parser.ts`

**Extract reusable**:
- Token tree traversal
- Type detection
- Value normalization

**Considerations**:
- Import parser reads Figma's native export (different structure)
- May need adapter layer to convert DTCG → internal format

### Phase 5: Export Command Implementation

**File**: `packages/cli/src/cli/commands/export-baseline.ts` (NEW)

**Flow**:
1. Load config (`loadConfig()`)
2. Discover token files per collection
3. Read and parse files
4. Merge files based on `splitBy` strategy
5. Strip `variableId`, `collectionId`, `modeId` from tokens
6. Build baseline structure
7. Write to output path

**Baseline structure** (reuse from `baseline.ts`):
```typescript
{
  baseline: {
    tokens: [...],        // Merged tokens (no IDs)
    collections: [...],   // Collection metadata
    modes: {...},         // Mode names per collection
  },
  styles: {},            // Optional: if styles are present
  metadata: {
    version: "3",
    timestamp: "2025-12-21T10:00:00Z",
    source: "export-baseline"
  }
}
```

**Reuse from**:
- `loadConfig()` - existing
- `writeBaseline()` - existing (or similar JSON writer)
- Collection discovery logic - existing

### Phase 6: Plugin Import Update

**File**: `packages/figma-plugin/synkio-ui/code.ts`

**Changes**: Update import logic to handle missing IDs.

**Current**: Assumes `variableId` exists (update existing variables)

**New logic**:
```typescript
for (const token of baseline.tokens) {
  if (token.variableId) {
    // Update existing variable (Figma → Code → Figma roundtrip)
    const variable = figma.variables.getVariableById(token.variableId);
    if (variable) {
      variable.setValueForMode(modeId, token.value);
      continue;
    }
  }

  // Create new variable (Code → Figma first import)
  const collection = getOrCreateCollection(token.collection);
  const variable = figma.variables.createVariable(
    token.path,
    collection,
    token.type
  );
  variable.setValueForMode(modeId, token.value);
  if (token.description) variable.description = token.description;
  if (token.scopes) variable.scopes = token.scopes;
}
```

### Phase 7: Example Application

**Directory**: `examples/export-app/` (NEW)

**Purpose**: Demonstrate code-first workflow with pre-written token files ready for export.

**Structure**:
```
examples/export-app/
├── synkio.config.json           # Config with collections defined
├── .env.example                 # FIGMA_TOKEN placeholder
├── tokens/                      # Token files (code-first)
│   ├── primitives/
│   │   ├── colors.json         # splitBy: "group"
│   │   ├── spacing.json
│   │   └── typography.json
│   └── theme/
│       ├── light.json          # splitBy: "mode"
│       └── dark.json
└── README.md                    # Workflow instructions
```

**Config example**:
```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "PLACEHOLDER",
    "accessToken": "${FIGMA_TOKEN}"
  },
  "tokens": {
    "dir": "tokens",
    "collections": {
      "primitives": {
        "dir": "tokens/primitives",
        "splitBy": "group"
      },
      "theme": {
        "dir": "tokens/theme",
        "splitBy": "mode"
      }
    }
  }
}
```

**Token file examples**:

`tokens/primitives/colors.json` (splitBy: "group"):
```json
{
  "colors": {
    "red": {
      "$type": "color",
      "$value": "#ff0000"
    },
    "blue": {
      "$type": "color",
      "$value": "#0000ff"
    }
  }
}
```

`tokens/theme/light.json` (splitBy: "mode"):
```json
{
  "bg": {
    "$type": "color",
    "$value": "{colors.white}"
  },
  "text": {
    "$type": "color",
    "$value": "{colors.black}"
  }
}
```

**README.md** workflow:
1. Review the token files in `tokens/`
2. Run `synkio export-baseline`
3. Check `.synkio/export-baseline.json` was created
4. Open Figma and run Synkio plugin
5. Import the baseline file
6. Verify variables appear in Figma

**Testing value**: End-to-end validation that export → import → Figma works correctly.

## File Structure

### New files
```
packages/cli/src/
├── cli/commands/
│   └── export-baseline.ts        # CLI command (NEW)
├── core/export/
│   ├── file-reader.ts            # Discover and read token files (NEW)
│   ├── token-merger.ts           # Merge split files to baseline (NEW)
│   └── index.ts                  # Exports (NEW)
```

### Modified files
```
packages/cli/src/
├── types/schemas.ts              # Make variableId optional
├── cli/bin.ts                    # Register new command
└── core/tokens.ts                # May need DTCG parser extraction

packages/figma-plugin/synkio-ui/
└── code.ts                       # Handle missing IDs in import
```

## Reuse Strategy

| Component | Reuse From | How |
|-----------|-----------|-----|
| Config loading | `core/config.ts` | Direct import |
| Baseline structure | `core/baseline.ts` | Use existing `writeBaseline()` |
| Split strategies | `core/tokens/split-strategies.ts` | Inverse logic (merge instead of split) |
| File paths | `core/sync/file-writer.ts` | Extract filename/path utilities |
| Collection iteration | `core/sync/pipeline.ts` | Similar loop structure |
| DTCG parsing | `core/import/parser.ts` | Extract reusable parser |
| Token schemas | `types/schemas.ts` | Use existing, make IDs optional |

## Edge Cases

### 1. **Missing collection config**
If `tokens.collections` is empty/undefined in config:
- **Error**: "Cannot export baseline without collection configuration"
- **Reason**: Need explicit collection names and splitBy strategy

### 2. **File not found**
If expected token file doesn't exist:
- **Warning**: "Expected file not found: tokens/theme.light.json"
- **Action**: Skip missing files, continue with available files

### 3. **Invalid DTCG format**
If token file has invalid structure:
- **Error**: "Invalid token format in tokens/theme.light.json: [reason]"
- **Action**: Fail export, show validation error

### 4. **Conflicting tokens**
If same token path appears in multiple files (shouldn't happen):
- **Error**: "Duplicate token path: colors.primary in mode 'light'"
- **Action**: Fail export

### 5. **Styles handling**
Styles are stored separately in baseline. For export:
- **Option A**: Ignore styles (only export tokens)
- **Option B**: Support style files too (future enhancement)
- **Recommendation**: Start with Option A

## Testing Strategy

### Unit tests
- `token-merger.test.ts`: Test merge logic for all splitBy strategies
- `file-reader.test.ts`: Test file discovery and reading
- `export-baseline.test.ts`: Test command end-to-end

### Integration tests
- Export from example project → verify baseline structure
- Import baseline to Figma (manual plugin test)
- Roundtrip: Figma → Code → Export → Import → Figma

### Test fixtures
Reuse existing: `examples/starter-app/` or create minimal test fixtures

## Success Criteria

- [ ] CLI command `synkio export-baseline` runs without errors
- [ ] Generated baseline.json has correct structure (validates against schema)
- [ ] All three `splitBy` strategies work correctly
- [ ] Plugin can import the generated baseline
- [ ] Variables are created in Figma with correct values
- [ ] No breaking changes to existing sync flow
- [ ] Documentation updated (USER_GUIDE.md, CLAUDE.md)

## Future Enhancements (Out of Scope)

- Export styles alongside tokens
- Bi-directional sync conflict resolution
- Incremental updates (merge with existing Figma variables)
- Export only specific collections (`--collection` flag)
- Validation mode (check if export is importable)

## Documentation Updates

**Files to update**:
- `packages/cli/USER_GUIDE.md` - Add export-baseline command
- `CLAUDE.md` - Add export workflow to architecture
- `packages/cli/src/cli/bin.ts` - Add help text for new command

**Example docs**:
```markdown
## Export Baseline

Export token files into a baseline.json format for importing to Figma.

Usage: synkio export-baseline [options]

Workflow:
1. Run export-baseline to generate .synkio/export-baseline.json
2. Open Synkio plugin in Figma
3. Use "Import Baseline" feature
4. Select the exported JSON file
5. Variables are created/updated in Figma
```

## Open Questions

1. **Should we validate the export is importable?** (schema validation, type checking)
   - **Recommendation**: Yes, validate before writing file

2. **How to handle token references?** (e.g., `{colors.primary}`)
   - **Recommendation**: Keep as-is, plugin resolves references during import

3. **Should collectionId/modeId be preserved if present?**
   - **Recommendation**: No, strip all IDs - let Figma assign fresh ones

4. **Output format: single baseline.json or separate file?**
   - **Recommendation**: Separate `export-baseline.json` to avoid confusion with sync baseline

## Timeline Estimate

- Schema updates: 1 hour
- File reader: 3 hours
- Token merger: 4 hours (most complex - inverse split logic)
- Export command: 2 hours
- Plugin updates: 3 hours
- Testing: 3 hours
- Documentation: 1 hour
- Example app: 2 hours

**Total**: ~19 hours (2-3 days)
