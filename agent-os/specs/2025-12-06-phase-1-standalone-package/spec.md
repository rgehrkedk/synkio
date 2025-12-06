# Specification: Phase 1: Standalone NPM Package (Complete)

## Goal
Extract @synkio/core into a publish-ready, framework-agnostic NPM package that works in any Node.js project with zero configuration. Developers should be able to install the package, run interactive setup, sync tokens from Figma, and use it programmatically in Next.js, Remix, or any framework.

## User Stories
- As a developer installing in a blank Next.js project, I want to run `npx synkio init` and have it guide me through setup so I can start syncing tokens immediately
- As a designer running token sync for the first time, I want clear interactive prompts and visual feedback so I know what's happening
- As a developer using the package in my API routes, I want to import core functions and use them programmatically with full TypeScript support
- As a monorepo maintainer, I want to sync tokens for multiple projects simultaneously using explicit context instances

## Specific Requirements

**Context System with Dual API (Phase 1A)**
- Create `src/context.ts` implementing both global singleton (convenience) and explicit instance (multi-project) patterns
- Global context auto-initializes on first use with only `rootDir: process.cwd()`, no other assumptions
- Support creating multiple context instances for monorepo usage where each project can have its own configuration
- All path functions accept optional `Context` parameter, defaulting to global singleton if not provided
- Validate context is initialized before use and throw actionable errors if config missing or invalid
- Follow error pattern from `loader.ts:61,109` with next-step suggestions like "Run 'synkio init' to create configuration"

**Path Resolution Refactoring (Phase 1A)**
- Convert ALL constants in `src/files/paths.ts` to functions that read from context system
- Remove hard-coded references to `figma-sync/`, `tokens/`, `styles/`, and all project-specific paths
- All path exports become functions with signature: `export function getDataDir(ctx?: Context): string`
- Resolve all paths relative to config file location, not process.cwd()
- Update approximately 33 TypeScript files across `src/cli/`, `src/tokens/`, `src/compare/`, `src/figma/`, `src/files/`, `src/detect/` to use new path functions
- Ensure `process.cwd()` is never used directly except in context initialization

**Environment Variable Lazy Loading (Phase 1A)**
- Create `src/env.ts` for lazy environment variable loading with no side effects at module import time
- Refactor `src/figma/constants.ts` to remove side effects that load dotenv at import
- Load from standard locations: `.env` → `.env.local` → custom path (if configured) → `process.env`
- Support optional `envPath` in tokensrc.json for package-specific env file location
- Environment variables loaded once per process and cached, safe to call loadEnv() multiple times
- No automatic checking of package-specific paths like `figma-sync/.figma/.env`

**Full Configuration Schema Implementation (Phase 1B)**
- Implement complete `tokensrc.json` schema with `version`, `figma`, `paths`, `collections`, `build`, and `migration` sections
- Config loader with validation that provides detailed, field-specific error messages
- Support environment variable interpolation in any config field: `${FIGMA_ACCESS_TOKEN}` → actual value
- Relative paths in config resolved from config file directory, not from process.cwd()
- Support multiple config file names with discovery order: `tokensrc.json` → `.synkiorc` → `synkio.config.json`
- Implement smart defaults when config is missing (package works without config file)
- Validation must check required fields and provide clear error messages about what's missing and how to fix it

**Interactive CLI Setup (Phase 1C)**
- Build `synkio init` command with inquirer for interactive setup wizard
- Prompt for Figma file URL, access token, and node ID (optional)
- Validate Figma connection before proceeding with setup
- Display found collections and modes from Figma file
- Guide user through collection mapping configuration
- Generate `tokensrc.json` with user's choices
- Provide template options for common setups (Next.js, Tailwind, CSS)

**Core CLI Commands (Phase 1C)**
- Implement `synkio sync` command to fetch and apply tokens from Figma with progress spinners
- Use ora for spinners, chalk for colored output, boxen for formatted messages
- Commands must provide actionable error messages with clear next steps
- All CLI output should be user-friendly with no raw stack traces in production mode
- Support `--dry-run` flag for preview mode
- Support `--no-backup` and `--no-build` flags for advanced usage

**Programmatic API Exports (Phase 1D)**
- Create `src/api/index.ts` as main entry point for programmatic usage
- Export `init()` function for context initialization
- Export core functions: `fetchFigmaData()`, `compareBaselines()`, `splitTokens()`
- Export all TypeScript types for full type safety in consuming applications
- API must work in Next.js App Router, Remix loaders, Express routes, and other server environments
- All exports must have complete TypeScript definitions

**Package Build Configuration (Phase 1D)**
- Configure package.json with correct exports for CLI and API
- Binary entry point must be executable with shebang
- Build outputs to `dist/` with TypeScript declarations
- Support ESM modules with proper type definitions
- Include templates directory in published package
- Set minimum Node.js version to 18.0.0

**CLI User Experience (Phase 1C)**
- Add dependencies: commander (CLI framework), inquirer (prompts), chalk (colors), ora (spinners), boxen (formatted boxes), cli-table3 (tables)
- Progress spinners for long-running operations (fetching from Figma, processing tokens)
- Colored output: success (green), error (red), info (cyan), warning (yellow)
- Formatted success/error messages in boxes for visibility
- Table output for diffs and comparisons
- Non-interactive mode support for CI/CD environments

**Testing Strategy**
- Unit tests with mocked filesystem using Vitest
- Test scenarios: no config file, minimal config, full config, invalid config, multiple config file names
- Mock `fs`, `path`, `process.cwd()` for predictable testing
- Target >80% code coverage for context system, path resolution, env loading, and config validation
- Test multi-context usage explicitly with isolated instances
- Focus on core happy paths and critical error cases

## Visual Design
No visual assets - this is a CLI and API package.

## Existing Code to Leverage

**Error Pattern from loader.ts**
- Lines 61 and 109 show excellent error message pattern with actionable next steps
- Format: `throw new Error('Problem description: ${details}\nRun 'command' to fix.')`
- Replicate this pattern for all context validation errors
- Pattern ensures users know exactly what went wrong and how to proceed

**Existing Config Loading Logic from loader.ts**
- Functions `loadConfig()`, `loadConfigOrThrow()`, `saveConfig()` already exist (lines 32-72)
- Environment variable interpolation pattern already implemented (lines 44-47) for `${VAR_NAME}` syntax
- Refactor to use context system instead of hard-coded paths
- Preserve environment variable interpolation but make it work with any config field

**Directory Initialization from loader.ts**
- Functions `ensureDir()` and `ensureFigmaDir()` handle directory creation (lines 305-320)
- Refactor to accept paths from context instead of using constants
- Keep recursive directory creation logic but make paths configurable

**Path Resolution Utilities from loader.ts**
- Function `getAbsolutePath()` (line 298) handles relative-to-absolute conversion
- Integrate into context system's path resolution
- Preserve pattern of resolving relative paths but do it from config directory, not process.cwd()

**File Operations from loader.ts**
- Generic functions `loadJsonFile()`, `saveJsonFile()`, `saveTextFile()` (lines 243-286)
- Update to use context system but preserve core logic
- Good pattern of handling both absolute and relative paths

**Package Dependencies Already Added**
- commander, inquirer, chalk, ora, boxen, cli-table3 already in package.json
- dotenv, glob, style-dictionary already included
- All required dependencies for Phase 1C are available

## Out of Scope
- Integration tests with real project structures (Phase 1E - separate testing phase)
- NPM package publishing workflow (Phase 1E - separate publishing phase)
- Full test coverage expansion beyond 80% (Phase 1E)
- Migration tooling implementation (`synkio migrate` command for code migrations)
- Documentation site or comprehensive README expansion (Phase 1E)
- Style Dictionary integration changes or making it fully optional (future enhancement)
- Config file auto-discovery in monorepo structures (future enhancement)
- Config validation with JSON schema (future enhancement)
- Watch mode for config file changes (future enhancement)
- Config merging or inheritance for monorepos (future enhancement)
- Webhook integrations or GitHub PR automation (Phase 3)
- Dashboard integration (Phase 2)
- Auth and billing features (Phase 3)
