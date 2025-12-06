# Changelog

All notable changes to @synkio/core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-06

### Added - Phase 1: Standalone NPM Package

#### Phase 1A: Foundation & Context System
- **Context System**: Framework-agnostic context management
  - `initContext()` - Initialize global singleton context
  - `getContext()` - Get current context with auto-initialization
  - `createContext()` - Create isolated context instances for monorepos
  - Zero hard-coded paths - all paths derived from context
- **Environment Loading**: Lazy environment variable loading
  - No side effects at module import time
  - Priority loading: `.env` → `.env.local` → custom path
  - `loadEnv()` - Load environment variables on demand
  - `getFigmaToken()` - Helper to get Figma access token
- **Path System Refactoring**:
  - Converted all path constants to context-aware functions
  - Pattern: `getBaselinePath(ctx?)`, `getTokensDir(ctx?)`, etc.
  - Removed all hard-coded `'figma-sync/'` references
  - Support for custom paths via configuration

#### Phase 1B: Enhanced Configuration System
- **Configuration Discovery**:
  - `findConfigFile()` - Checks multiple config file names
  - Supports: `tokensrc.json`, `.synkiorc`, `synkio.config.json`
- **Environment Variable Interpolation**:
  - `${VAR_NAME}` pattern in config files
  - Secure token handling via environment variables
- **Configuration Validation**:
  - Field-specific validation with helpful error messages
  - `validateConfig()` - Comprehensive schema validation
- **Smart Defaults**:
  - `getDefaultConfig()` - Zero-config defaults for quick setup
  - Sensible paths for data, tokens, and reports

#### Phase 1C: Modern CLI Experience
- **Interactive Setup**: `synkio init`
  - Welcome screen with beautiful formatting (boxen)
  - Figma URL validation and extraction
  - Figma connection validation before saving
  - Display found collections and modes
  - Template support: `--template nextjs|tailwind|css`
  - Non-interactive mode: `--yes` flag for CI/CD
- **Sync Command**: `synkio sync`
  - Progress spinners with ora
  - Colored diff tables with cli-table3
  - Flags: `--dry-run`, `--no-backup`, `--no-build`
  - Backup creation before sync
  - Optional build command execution
- **Diff Command**: `synkio diff`
  - Compare Figma with local baseline
  - Compare local baselines: `--local` flag
  - Output formats: table (default) or JSON
- **Rollback Command**: `synkio rollback`
  - Interactive confirmation with change preview
  - Force rollback: `--force` flag
  - Restore previous baseline safely
- **CLI Utilities**:
  - `formatSuccess()`, `formatError()`, `formatInfo()` - Boxed messages
  - `createSpinner()` - Ora spinner wrapper
  - `createTable()` - CLI table wrapper
  - Consistent colored output across commands

#### Phase 1D: Programmatic API & Package Build
- **Public API Export**: `@synkio/core/api`
  - Context: `init()`, `getContext()`, `createContext()`
  - Environment: `loadEnv()`, `getFigmaToken()`
  - Figma: `fetchFigmaData()`
  - Files: `loadConfig()`, `saveConfig()`, `loadBaseline()`, etc.
  - Comparison: `compareBaselines()`, `hasChanges()`, `getChangeCounts()`
  - Tokens: `splitTokens()`
  - All TypeScript types exported
- **JSDoc Documentation**:
  - Comprehensive examples for Next.js, Remix, custom scripts
  - API route examples
  - Loader function examples
  - Build script examples
- **Package Configuration**:
  - Dual exports: `.` (main) and `./api` (programmatic)
  - Binary: `synkio` command available globally
  - TypeScript declarations for all exports
  - Templates included in published package
  - Node.js >= 18.0.0 requirement

#### Phase 1E: Testing & Validation
- **Integration Tests**:
  - Context system integration (monorepo scenarios)
  - Programmatic API integration
  - Configuration system integration
  - Error handling integration
  - Multi-framework support validation
- **Test Coverage**:
  - 65 tests across 10 test files
  - Context tests (6 tests)
  - Path tests (7 tests)
  - Config tests (7 tests)
  - Environment tests (4 tests)
  - API tests (11 tests)
  - Integration tests (10 tests)
  - CLI command tests (20 tests)
- **Build Validation**:
  - TypeScript type checking (zero errors)
  - 43 `.d.ts` type definition files generated
  - Executable CLI binary
  - All templates included
- **Documentation**:
  - Comprehensive README with examples
  - CLI commands reference
  - Programmatic API guide
  - Configuration schema documentation
  - Troubleshooting guide
  - Migration guide from `figma-sync/`

### Changed

- **Breaking**: Moved from `figma-sync/` directory structure to NPM package
- **Breaking**: Changed import paths:
  - Old: `import { fetchFigmaData } from './figma-sync/lib/figma'`
  - New: `import { fetchFigmaData } from '@synkio/core/api'`
- **Breaking**: Changed default paths:
  - Old: `figma-sync/baseline.json`
  - New: `.synkio/data/baseline.json`
- **Improved**: All functions now accept optional `Context` parameter for monorepo support
- **Improved**: Environment variables loaded lazily instead of at module import time
- **Improved**: Better error messages with actionable suggestions

### Deprecated

- Legacy path constants (kept for backward compatibility, marked with `@deprecated`)
  - `LEGACY_BASELINE_FILE`
  - `LEGACY_BASELINE_PREV_FILE`
  - `LEGACY_SNAPSHOT_FILE`
  - etc.

### Migration Guide

To migrate from the old `figma-sync/` structure to `@synkio/core`:

1. Install the package: `npm install @synkio/core`
2. Run `npx synkio init` to generate `tokensrc.json`
3. Update import paths from local files to `@synkio/core/api`
4. Update any scripts that reference `figma-sync/` paths to use `.synkio/data/`
5. Move Figma access token to `.env` file: `FIGMA_ACCESS_TOKEN=your-token`
6. Remove old `figma-sync/` directory after confirming everything works

### Technical Details

- **Language**: TypeScript (strict mode)
- **Module System**: ESM (ES Modules)
- **Target**: ES2022
- **Node.js**: >= 18.0.0
- **Framework Support**: Framework-agnostic (Next.js, Remix, Vite, etc.)

### Dependencies

- `commander` ^12.0.0 - CLI framework
- `inquirer` ^9.0.0 - Interactive prompts
- `chalk` ^5.0.0 - Terminal colors
- `ora` ^8.0.0 - Spinners
- `boxen` ^7.0.0 - Boxed messages
- `cli-table3` ^0.6.0 - Tables
- `dotenv` ^17.0.0 - Environment variables
- `glob` ^11.0.0 - File globbing
- `style-dictionary` ^4.0.0 - Token transformation

[0.1.0]: https://github.com/rgehrkedk/synkio/releases/tag/v0.1.0
