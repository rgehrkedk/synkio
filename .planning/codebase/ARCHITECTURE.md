# Architecture

> System design, patterns, and data flow

**Generated:** 2026-01-06

---

## Architectural Pattern

**Layered Monorepo with Clear Separation of Concerns**

Synkio uses a layered architecture with distinct command, business logic, and utility layers organized as a monorepo:

- **CLI Package** (`packages/cli`) - Main npm package
- **Figma Plugin** (`packages/figma-plugin/synkio-v2`) - Data capture plugin
- **Supporting Packages** (docs, website)

---

## Two-Phase Workflow

The architecture emphasizes offline-capable operation:

1. **Pull Phase** - Fetch from Figma → compare with baseline → update baseline.json
2. **Build Phase** - Generate token files from baseline.json (offline, no API calls)

---

## Conceptual Layers

### 1. CLI Layer (`packages/cli/src/cli`)

**Entry Point:** `bin.ts` - Command dispatcher and argument parser

**Commands** (`commands/*.ts`):
| Command | Purpose |
|---------|---------|
| `pull.ts` | Fetch from Figma, update baseline |
| `build.ts` | Generate token files |
| `diff.ts` | Compare baseline with files |
| `init.ts`, `init-baseline.ts` | Project initialization |
| `import.ts`, `export-baseline.ts` | Workflow integrations |
| `serve.ts` | Local HTTP server for plugin |
| `docs.ts`, `validate.ts`, `rollback.ts` | Utilities |

### 2. Core Business Logic Layer (`packages/cli/src/core`)

**Primary Modules:**

| Module | Purpose | Key File |
|--------|---------|----------|
| Figma Integration | API calls, retry logic | `figma.ts` |
| Baseline Management | Read/write baseline.json | `baseline.ts` |
| Token Processing | Normalize, split, transform | `tokens.ts` |
| Comparison Engine | ID-based change detection | `compare/` |
| Sync Pipeline | Orchestration | `sync/pipeline.ts` |
| Config Management | Zod validation | `config.ts` |

### 3. Type Definition Layer (`packages/cli/src/types`)

- `BaselineEntry` - Token with path, value, type, IDs, metadata
- `StyleBaselineEntry` - Figma styles (paint, text, effect)
- `BaselineData` - Complete baseline structure
- Zod schemas in `schemas.ts`

### 4. Utility Layer (`packages/cli/src/utils`)

- `figma.ts` - Phantom mode filtering
- `logger.ts` - Debug logging
- `core/utils/` - Collection discovery, deep merge, nested set

---

## Data Flow

### Pull Command Flow

```
1. Load config (synkio.config.json)
2. Create FigmaClient with token/fileId
3. Fetch from Figma API → raw plugin data
4. Normalize to internal format
5. Filter phantom modes
6. Auto-discover collections (if first sync)
7. Read existing baseline.json
8. Compare: ID-based matching
9. Detect changes: added, modified, deleted, path changes
10. Check for breaking changes
11. Write baseline.json
12. Rotate compare files
13. Exit code 0 (success) or 1 (breaking changes)
```

### Build Command Flow

```
1. Load config
2. Read baseline.json (offline)
3. Compare baseline with existing files
4. Split tokens by strategy (mode/group/none)
5. Merge Figma styles into variables
6. Write output files (DTCG JSON)
7. Generate CSS custom properties
8. Run build script
9. Generate docs site
10. Report completion
```

---

## Key Abstractions & Patterns

### Facade Pattern
- `core/compare/index.ts` - Re-exports comparison APIs
- `core/sync/index.ts` - Re-exports sync pipeline APIs
- `core/import/index.ts`, `core/export/index.ts` - Workflow facades

### Client Pattern
`FigmaClient` class encapsulates:
- Exponential backoff retry (factor 2: 1s, 2s, 4s)
- Configurable timeout (120s default)
- Rate limit handling (429 responses)
- Multiple namespace support

### Strategy Patterns

**Comparison:**
- ID-based matching (primary)
- Heuristic matching (fallback)
- Path-based matching (legacy)

**Token Splitting:**
- `splitBy: "mode"` - One file per mode
- `splitBy: "group"` - One file per group
- `splitBy: "none"` - Single file

### Pipeline/Orchestration
- `executeSyncPipeline` coordinates complex multi-step flows
- Separates concerns: fetch, normalize, compare, write, build

---

## Entry Points

| Entry Point | Location | Purpose |
|-------------|----------|---------|
| CLI | `packages/cli/src/cli/bin.ts` | Command dispatcher |
| Package Export | `packages/cli/src/index.ts` | Programmatic API |
| Figma Plugin | `packages/figma-plugin/synkio-v2/src/code.ts` | Plugin handler |
