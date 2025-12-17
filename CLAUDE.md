# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synkio is a CLI tool that syncs Figma design variables to code without requiring a Figma Enterprise plan. It uses a hybrid approach: a Figma plugin stores variable data in `sharedPluginData`, and the CLI fetches this data via the standard Figma API.

## Repository Structure

```
packages/
├── cli/                    # npm package (synkio) - TypeScript CLI
│   └── src/
│       ├── cli/           # Command implementations (init, sync, docs, etc.)
│       ├── core/          # Business logic (config, compare, tokens, output)
│       └── types/         # TypeScript types and Zod schemas
└── figma-plugin/
    ├── synkio-sync/       # Main Figma plugin for preparing sync
    └── synkio-ui/         # Figma plugin with UI for diff view and history
examples/
└── demo-app/              # Example project with sample configs
```

## Development Commands

### CLI Package (packages/cli)
```bash
cd packages/cli
npm install
npm run build          # Compile TypeScript
npm run dev            # Watch mode
npm run test           # Run Vitest tests
npm run test:watch     # Tests in watch mode
npm link               # Link for local development
```

### Figma Plugins (packages/figma-plugin/*)
```bash
cd packages/figma-plugin/synkio-sync  # or synkio-ui
npm install
npm run build
npm run watch          # Watch mode
```

### Running the CLI Locally
After building and linking the CLI package:
```bash
synkio sync                                    # Using npm link
node packages/cli/dist/cli/bin.js sync         # Direct execution
```

### Demo App Testing
```bash
cd examples/demo-app
npm install
synkio sync                # Requires FIGMA_TOKEN in .env
```

## Key Architecture Concepts

### Token Processing Pipeline
1. **Figma Plugin** writes variables to `figma.root.sharedPluginData`
2. **CLI `sync`** fetches data via Figma API → `core/figma.ts`
3. **Compare** detects changes against baseline → `core/compare.ts`
4. **Transform** to intermediate format → `core/intermediate-tokens.ts`
5. **Output** generates JSON/CSS/Style Dictionary → `core/output.ts`, `core/tokens.ts`

### Configuration
- Config file: `synkio.config.json` (legacy: `tokensrc.json`)
- Schema validation via Zod in `types/schemas.ts`
- Loaded by `core/config.ts`

### Breaking Change Detection
The `core/compare.ts` module detects:
- Path changes (renames)
- Deleted variables
- Deleted/added/renamed modes

Uses permanent Figma variable IDs to distinguish renames from deletions.

### Output Modes
- **JSON mode**: Direct DTCG-format output
- **Style Dictionary mode**: Requires `style-dictionary` peer dependency, uses `core/style-dictionary/` and `core/sd-hooks.ts`

## Testing

Tests use Vitest and are co-located with source files (`*.test.ts`):
```bash
npm run test                           # Run all tests
npm run test -- compare                # Run specific test file
npm run test -- --reporter=verbose     # Verbose output
```

Mock Figma server for E2E testing: `packages/cli/test-utils/mock-figma-server.cjs`

## CLI Commands

| Command | Description |
|---------|-------------|
| `synkio init` | Initialize project with Figma credentials |
| `synkio sync` | Fetch and sync tokens from Figma |
| `synkio sync --preview` | Preview changes without applying |
| `synkio sync --regenerate` | Regenerate files from existing baseline |
| `synkio import` | Import from Figma native JSON export |
| `synkio docs` | Generate static documentation site |
| `synkio rollback` | Revert to previous sync state |
| `synkio validate` | Check config and Figma connection |
