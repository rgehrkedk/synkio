# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synkio is a **designer-first design token synchronization tool** that syncs Figma Variables to code. The project enables designers to export tokens from Figma with one click, which developers can then sync to their codebase with zero friction.

**Architecture**: Monorepo using pnpm workspaces and Turborepo containing:
- `@synkio/core` - NPM package (CLI + programmatic API)
- `dashboard` - Next.js web app at synkio.io
- `token-vault` - Figma plugin for import/export

## Development Commands

### Root Commands (Turborepo)
```bash
pnpm install           # Install all dependencies
pnpm dev               # Run all packages in dev mode (parallel)
pnpm build             # Build all packages
pnpm test              # Run all tests across packages
pnpm lint              # Lint all packages
pnpm clean             # Clean build artifacts and node_modules
```

### Core Package (`packages/core/`)
```bash
cd packages/core
pnpm build             # Build CLI and API (TypeScript → dist/)
pnpm dev               # Watch mode for development
pnpm test              # Run Vitest tests
pnpm test:watch        # Run tests in watch mode
```

### Dashboard (`apps/dashboard/`)
```bash
cd apps/dashboard
pnpm dev               # Start Next.js dev server
pnpm build             # Build for production
pnpm start             # Start production server
```

### Figma Plugin (`packages/figma-plugin/token-vault/`)
```bash
cd packages/figma-plugin/token-vault
npm run build          # Build plugin (esbuild)
npm run watch          # Watch mode for plugin development
```

## Core Architecture

### CLI Commands (`packages/core/src/cli/`)
The CLI is built with Commander.js and provides 5 main commands:

1. **`synkio init`** - Interactive setup wizard (5-10 min, 12-20 questions)
   - Detects existing Style Dictionary, build scripts, token directories
   - Connects to Figma via API
   - Configures collection organization (byMode vs byGroup)
   - Creates `tokensrc.json` configuration

2. **`synkio sync`** - Fetch and apply tokens from Figma
   - Fetches from Figma REST API or plugin data
   - Compares with local baseline
   - Optionally runs migration for changed tokens
   - Saves new baseline and runs build command

3. **`synkio diff`** - Compare Figma tokens with local baseline
   - Shows added/removed/changed/breaking changes
   - Supports table, JSON, markdown output formats

4. **`synkio rollback`** - Restore previous baseline from backup
   - Uses `.figma/data/baseline-prev.json`

5. **`synkio migrate`** - Manage code migrations when tokens change
   - `--scan`: Scan codebase for token usage patterns
   - `--plan`: Generate migration plan from detected changes
   - `--apply`: Apply approved migration plan
   - Supports platform-specific patterns (CSS vars, Tailwind, JS/TS)

### Context System (`packages/core/src/context.ts`)
- Framework-agnostic path resolution
- Supports both global singleton (CLI) and explicit instances (monorepo)
- Auto-initializes with `process.cwd()` if not explicitly set
- All file operations use context-based paths

### Data Flow
```
Figma Variables
  ↓ (Plugin exports to node data)
Figma REST API
  ↓ (fetchFigmaData)
Baseline JSON (raw structure)
  ↓ (splitTokens)
Token Files (organized by collection/mode/group)
  ↓ (Style Dictionary - optional)
CSS/SCSS/Tailwind/etc.
```

### Key Concepts

**Baseline** (`.figma/data/baseline.json`):
- Single source of truth containing all raw tokens from Figma
- Structured as: `{ [collection]: { [mode]: { [group]: tokens } } }`
- Used for diffing and migration detection

**TokensConfig** (`tokensrc.json`):
- User configuration file created by `synkio init`
- Defines Figma connection, split strategy, build integration, migration settings

**Split Strategies**:
- `byMode`: One file per mode (e.g., `light.json`, `dark.json`)
- `byGroup`: One file per group (e.g., `colors.json`, `spacing.json`)

**Token Map** (`.figma/data/token-map.json`):
- Maps token paths to output files for migration tracking
- Structure: `{ [tokenPath]: { outputs: { [platform]: outputPath } } }`

**Migration System**:
- Detects renamed/deleted/changed tokens via baseline comparison
- Scans codebase for usage patterns (platform-specific regexes)
- Generates migration plan with file matches and replacements
- User approves plan (edits `migration-plan.md`), then runs `--apply`

## File Organization

### Core Package Structure
```
packages/core/src/
├── cli/               # CLI commands and prompt logic
│   ├── commands/      # Individual command implementations
│   ├── bin.ts         # CLI entry point
│   └── prompt.ts      # Interactive prompts
├── api/               # Programmatic API (fetchFigmaData, etc.)
├── figma/             # Figma REST API client
├── tokens/            # Token processing (split, transform, migrate)
├── compare/           # Baseline diffing logic
├── detect/            # Project detection (paths, build scripts, Style Dictionary)
├── files/             # File operations and path management
├── types/             # TypeScript type definitions
├── context.ts         # Context system for path resolution
└── env.ts             # Environment variable loading
```

### Important Files
- `.figma/` - Data directory (baseline, backups, reports, token-map)
- `tokensrc.json` - User configuration (created by init)
- `templates/` - Template configs for different frameworks

## Testing

Tests use Vitest and are colocated with source files (`.test.ts`). Run individual test files:
```bash
cd packages/core
pnpm test src/context.test.ts
pnpm test src/tokens/
```

## Style Dictionary Integration

Synkio can optionally integrate with Style Dictionary (v3 or v4):
- Detection: `detectStyleDictionary()` scans for existing configs
- Build integration: Runs SD build command after sync
- Config reference: Does not modify SD config, users manage it separately

## Migration Pattern Detection

The migration system (`packages/core/src/detect/patterns.ts`) detects token usage across platforms:
- **CSS/SCSS**: `var(--token-name)`, `$token-name`
- **Tailwind**: `bg-[var(--token-name)]`, utilities with CSS vars
- **JS/TS**: `tokens.path.to.token`, import statements

Platform detection is automatic based on file extensions and content patterns.

## Common Development Patterns

### Adding a New CLI Command
1. Create command file in `packages/core/src/cli/commands/`
2. Export command function with options interface
3. Import and register in `packages/core/src/cli/bin.ts`
4. Add tests in same directory

### Working with Figma API
- Use `fetchFigmaData()` from `packages/core/src/figma/api.ts`
- Supports both node-based (plugin data) and file-based fetching
- Requires `FIGMA_ACCESS_TOKEN` and either `FIGMA_FILE_KEY` + `FIGMA_REGISTRY_NODE` or just file ID

### Modifying Token Processing
- Core logic in `packages/core/src/tokens/split.ts`
- Transformations in `packages/core/src/tokens/transform.ts`
- Always preserve baseline structure for diffing

## Environment Variables

Required for Figma API access:
```
FIGMA_ACCESS_TOKEN=figd_...
FIGMA_FILE_KEY=abc123...
FIGMA_REGISTRY_NODE=123:456  # Optional: specific node with plugin data
```

Load from `.env`, `.env.local`, or `.figma/.env` (priority order).

## TypeScript Configuration

- Root `tsconfig.json`: Shared base config (ES2022, ESNext modules)
- Package-level configs extend root
- Output: `dist/` with declarations and source maps
- Module resolution: `bundler` mode

## Notes for AI Development

- The codebase uses **context-based path resolution** - always use `getContext()` for file paths
- Token baseline is the single source of truth - never modify it directly during sync
- Migration is a three-step process: scan → plan → apply (user approval required)
- Collection detection uses fuzzy matching with confidence scores
- All CLI commands support both interactive and non-interactive modes (--yes flag)
