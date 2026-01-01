# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synkio is a CLI tool that syncs Figma design variables to code without requiring Figma's Enterprise plan. It uses a hybrid approach:
1. A Figma plugin captures variables and stores them in `sharedPluginData`
2. The CLI fetches this data via Figma's standard API and generates W3C DTCG-compliant token files

The key innovation is ID-based diffing that prevents breaking changes by distinguishing renames from deletions using permanent Figma variable IDs.

## Repository Structure

```
synkio/
├── packages/
│   ├── cli/                    # Main npm package (synkio)
│   │   ├── src/
│   │   │   ├── cli/           # Command implementations (init, pull, build, diff, import, docs, etc.)
│   │   │   ├── core/          # Core business logic
│   │   │   │   ├── sync/      # Sync pipeline orchestration
│   │   │   │   ├── compare/   # Baseline comparison and diffing
│   │   │   │   ├── tokens/    # Token processing and splitting
│   │   │   │   ├── import/    # Figma native JSON import
│   │   │   │   ├── export/    # Export baseline generator (code → Figma)
│   │   │   │   ├── docs/      # Documentation site generator
│   │   │   │   └── css/       # CSS custom properties generator
│   │   │   ├── types/         # Zod schemas and TypeScript types
│   │   │   └── utils/         # Shared utilities
│   │   └── USER_GUIDE.md      # Complete command and config reference
│   └── figma-plugin/
│       ├── synkio-sync/       # Minimal Figma plugin (esbuild)
│       └── synkio-ui/         # UI plugin with diff view and history
└── examples/
    └── demo-app/              # Example integration
```

## Development Commands

### CLI Package (packages/cli)

```bash
# Build TypeScript
npm run build

# Watch mode (rebuild on changes)
npm run dev

# Run tests
npm run test

# Watch tests
npm run test:watch

# Clean build artifacts
npm run clean

# Generate docs site
npm run docs

# Generate and serve docs
npm run docs:serve
```

### Figma Plugin (packages/figma-plugin/synkio-sync)

```bash
# Build plugin
npm run build

# Watch mode
npm run watch
```

### Testing Locally

When developing the CLI locally, `npx synkio` will fetch from npm instead of using your local build. Use one of these approaches:

```bash
# After building, link the CLI globally
cd packages/cli
npm link
synkio pull  # Now uses local build

# Or run the built CLI directly
node packages/cli/dist/cli/bin.js pull
```

### Running Tests

- Test files: `**/*.test.ts` (excluded from build)
- Test framework: Vitest
- Tests are located alongside implementation files (e.g., `compare.ts` → `compare.test.ts`)

## Core Architecture

### Pull/Build Command Flow

The CLI uses a two-phase approach:

#### Pull Command ([pull.ts](packages/cli/src/cli/commands/pull.ts))
Fetches from Figma and updates baseline.json only:

1. **Fetch** - [figma.ts](packages/cli/src/core/figma.ts) fetches data via Figma API
2. **Normalize** - [tokens.ts](packages/cli/src/core/tokens.ts) transforms plugin data to internal format
3. **Compare** - [core/compare/](packages/cli/src/core/compare/) detects changes via ID-based diffing
4. **Write Baseline** - Updates `synkio/baseline.json`

#### Build Command ([build.ts](packages/cli/src/cli/commands/build.ts))
Generates token files from baseline.json (offline, no Figma API):

1. **Read Baseline** - [baseline.ts](packages/cli/src/core/baseline.ts) reads baseline.json
2. **Split** - [tokens/split-strategies.ts](packages/cli/src/core/tokens/split-strategies.ts) applies collection-specific splitting (mode/group/none)
3. **Merge Styles** - [sync/style-merger.ts](packages/cli/src/core/sync/style-merger.ts) integrates Figma styles with variables
4. **Write** - [sync/file-writer.ts](packages/cli/src/core/sync/file-writer.ts) writes token files
5. **Build** - [sync/build-runner.ts](packages/cli/src/core/sync/build-runner.ts) runs CSS generation or custom build scripts

#### Diff Command ([diff.ts](packages/cli/src/cli/commands/diff.ts))
Compares baseline.json with token files on disk (read-only, for CI):

1. **Read Baseline** - Loads baseline.json
2. **Discover Files** - [export/file-discoverer.ts](packages/cli/src/core/export/file-discoverer.ts) finds token files
3. **Parse Tokens** - [export/token-parser.ts](packages/cli/src/core/export/token-parser.ts) reads token files
4. **Compare** - Reports differences between baseline and files

### Baseline System

- **Location**: `synkio/baseline.json`
- **Purpose**: Stores normalized token data for comparison
- **Format**: `{ baseline: {...}, styles: {...}, metadata: {...} }`
- **Implementation**: [baseline.ts](packages/cli/src/core/baseline.ts)

The baseline enables intelligent diffing by preserving Figma variable IDs across pulls.

### Breaking Change Detection

The comparison system ([core/compare/](packages/cli/src/core/compare/)) detects:

- **Path changes** - Token renamed (e.g., `colors.primary` → `colors.brand.primary`)
- **Deleted variables** - Token removed entirely
- **Deleted modes** - Mode removed from collection
- **New modes** - New mode added to collection
- **Mode renames** - Mode name changed (detected via mode ID)

Breaking changes are reported during pull (exit code 1) and can be bypassed with `--force` during build. See [breaking-changes.ts](packages/cli/src/core/sync/breaking-changes.ts).

### Token Splitting Strategies

Collections can be split three ways (configured per-collection in `synkio.config.json`):

- **`splitBy: "mode"`** - One file per mode: `theme.light.json`, `theme.dark.json`
- **`splitBy: "group"`** - One file per top-level group: `globals.colors.json`, `globals.spacing.json`
- **`splitBy: "none"`** - Single file: `theme.json`

Implementation: [tokens/split-strategies.ts](packages/cli/src/core/tokens/split-strategies.ts)

### Import Workflow

The `import` command ([core/import/](packages/cli/src/core/import/)) supports Figma's native JSON export:

1. **Parser** - [import/parser.ts](packages/cli/src/core/import/parser.ts) reads Figma's export format
2. **Validator** - [import/validator.ts](packages/cli/src/core/import/validator.ts) checks for required fields
3. **Source Resolver** - [import/source-resolver.ts](packages/cli/src/core/import/source-resolver.ts) maps files to collections
4. **File Generator** - [import/file-generator.ts](packages/cli/src/core/import/file-generator.ts) updates baseline

This provides a plugin-free workflow where designers export JSON files manually.

### Export Workflow

The `export-baseline` command ([core/export/](packages/cli/src/core/export/)) enables the reverse "Code → Figma" workflow:

1. **File Discovery** - [export/file-discoverer.ts](packages/cli/src/core/export/file-discoverer.ts) finds token files based on config
2. **Token Parsing** - [export/token-parser.ts](packages/cli/src/core/export/token-parser.ts) reads DTCG token files
3. **Baseline Building** - [export/baseline-builder.ts](packages/cli/src/core/export/baseline-builder.ts) generates baseline structure

This allows teams to bootstrap Synkio from existing token files or migrate from other design token tools.

### Configuration Schema

Configuration is validated using Zod schemas ([types/schemas.ts](packages/cli/src/types/schemas.ts)):

- **SynkioTokenEntrySchema** - Single token from Figma plugin
- **SynkioPluginDataSchema** - Complete plugin data (v2 = tokens only, v3 = tokens + styles)
- **StyleEntrySchema** - Figma styles (paint, text, effect)

Config files: `synkio.config.json` (recommended) or legacy `tokensrc.json`

## Important Implementation Details

### Variable ID vs Path

- **Variable IDs** (`VariableID:123:456`) are permanent Figma identifiers
- **Paths** (`colors.primary.500`) are derived from variable names and can change
- The comparison system uses IDs as source of truth to detect renames vs deletions

### Phantom Mode Filtering

Figma can return modes that don't exist. The CLI filters these via [utils/figma.ts](packages/cli/src/utils/figma.ts) `filterPhantomModes()`.

### Collection Discovery

On first pull, the CLI discovers collections from token data and updates `synkio.config.json` automatically. See [utils/collection-discovery.ts](packages/cli/src/core/utils/collection-discovery.ts).

### Rebuild Mode

`synkio build --rebuild` regenerates all output files from existing baseline. Useful after changing config (e.g., switching `splitBy` strategy).

### Style Merging

Figma styles (paint/text/effect) can be:
- **Merged into variable collections** - Via `mergeInto.collection` config
- **Written as standalone files** - Default behavior

See [sync/style-merger.ts](packages/cli/src/core/sync/style-merger.ts).

### Documentation Generation

The `docs` command ([core/docs/](packages/cli/src/core/docs/)) generates a static HTML site with:
- Color swatches
- Typography previews
- CSS custom properties reference
- Copy-to-clipboard functionality

Output: `synkio/docs/` (configurable via `docsPages.dir`)

## Common Tasks

### Adding a New Command

1. Create command file in [src/cli/commands/](packages/cli/src/cli/commands/)
2. Import and register in [src/cli/bin.ts](packages/cli/src/cli/bin.ts)
3. Add help text to `showHelp()` in [bin.ts](packages/cli/src/cli/bin.ts)
4. Add to command list in [USER_GUIDE.md](packages/cli/USER_GUIDE.md)

### Modifying Comparison Logic

All comparison logic lives in [src/core/compare/](packages/cli/src/core/compare/):
- **collection-matcher.ts** - Collection and mode matching
- **variable-comparator.ts** - Variable-level comparison
- **utils.ts** - Change detection helpers
- **report-generator.ts** - Markdown report generation
- **console-display.ts** - Terminal output

### Adding a New Token Type

1. Update Figma plugin to export the new type
2. Add schema in [types/schemas.ts](packages/cli/src/types/schemas.ts)
3. Update normalization in [core/tokens.ts](packages/cli/src/core/tokens.ts)
4. Update CSS generation in [core/css/](packages/cli/src/core/css/) if needed

### Debugging

The CLI uses a debug logger ([utils/logger.ts](packages/cli/src/utils/logger.ts)). Enable with:

```bash
DEBUG=synkio synkio pull
```

## Environment Variables

- **FIGMA_TOKEN** - Required. Figma personal access token
- **DEBUG** - Optional. Set to `synkio` for debug output

Tokens are loaded from `.env` via `dotenv/config` in [bin.ts:2](packages/cli/src/cli/bin.ts#L2).

## Configuration Notes

- Legacy `tokensrc.json` is deprecated but still supported
- Config updates happen automatically for collection discovery and renames
- Per-collection config overrides parent `tokens.splitBy` and `tokens.includeMode`
- Use `synkio build --rebuild` after config changes to regenerate files

## Output Formats

- **DTCG format** - Default (`$value`, `$type`). Disable with `dtcg: false`
- **CSS custom properties** - Generated via `build.css.enabled`
- **Utility classes** - Generated via `build.css.utilities`
- **Documentation site** - Generated via `docsPages.enabled`

See [USER_GUIDE.md](packages/cli/USER_GUIDE.md) for full config reference.
