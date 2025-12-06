# Spec Requirements: Phase 1A Context System

## Initial Description

Create a context system to eliminate hard-coded paths in @synkio/core package and make it framework-agnostic. This is the critical first step (Phase 1A) for extracting the package from Clarity codebase.

**Current Blocker:**
All file paths are hard-coded to `figma-sync/.figma/` which prevents the package from working as a standalone NPM package.

**Goal:**
Implement a context system that allows dynamic path resolution based on configuration, supporting both CLI and programmatic API usage.

**Key Components:**
1. Context system (`src/context.ts`)
2. Environment variable lazy loading (`src/env.ts`)
3. Refactor path constants to functions (`src/files/paths.ts`)
4. Update all imports across ~33 TypeScript files

## Requirements Discussion

### Core Principle

**100% Framework Agnostic** - The package must make ZERO assumptions about project structure. Everything must be configurable.

### Question 1: Context Auto-Initialization Strategy

**Q:** How should the context system initialize when no explicit configuration is provided? Should it:
- Auto-initialize with sensible defaults (e.g., .figma/ folder, tokens/ folder)?
- Require explicit initialization and throw helpful errors if not configured?
- Support both modes (auto-init for convenience, explicit for control)?

**Answer:**
- **AUTO-INIT with zero assumptions**
- Only assume: `process.cwd()` as root
- Everything else: require config or fail with helpful error
- **No default folders** like `.figma/` or `tokens/`

**Implications:**
- Context system will auto-initialize on first use with only `rootDir: process.cwd()`
- All other paths (dataDir, configPath, etc.) must come from config file
- If config file doesn't exist, throw actionable error: "Run 'synkio init' to create configuration"
- No assumptions about folder structure whatsoever

### Question 2: Environment Variable Path Configuration

**Q:** Where should environment variables be loaded from? Should we:
- Support standard locations (.env, .env.local in project root)?
- Allow package-specific .env location (configurable in tokensrc.json)?
- Support both with clear priority order?

**Answer:**
- **FULLY CONFIGURABLE**
- Standard locations: `.env`, `.env.local` (universal convention)
- Package-specific: **only if explicitly configured in tokensrc.json**
- **No hard-coded package directories**

**Implications:**
- Load `.env` and `.env.local` from project root (standard Node.js convention)
- Support optional `envPath` in tokensrc.json for package-specific env file location
- Priority order: project `.env` → `.env.local` → custom path (if configured) → process.env
- No automatic checking of `figma-sync/.figma/.env` or similar patterns

### Question 3: Legacy Path Handling

**Q:** How should we handle migration from hard-coded paths? Should we:
- Keep legacy path constants with deprecation warnings?
- Remove them entirely and provide migration guide?
- Support automatic fallback to legacy paths (for backwards compatibility)?

**Answer:**
- **REMOVE from core, provide migration tool**
- Convert **ALL constants → functions** reading from config
- Legacy support via `synkio migrate` command, not baked into code
- Don't pollute core with backwards compatibility

**Implications:**
- No legacy path constants in `src/files/paths.ts`
- All path exports become functions that read from context
- Create separate migration utility: `synkio migrate --from clarity-figma-sync`
- Migration tool will:
  - Scan for hard-coded `figma-sync/` references
  - Generate tokensrc.json from detected structure
  - Provide migration report
- Keep core clean and future-proof

### Question 4: Import Update Strategy

**Q:** When refactoring from constants to functions, how should we handle imports? Should we:
- Add runtime validation that throws helpful errors if old imports are detected?
- Rely on TypeScript errors during build?
- Provide automated codemod/migration script?

**Answer:**
- **Validate with actionable errors**
- Follow existing pattern: `packages/core/src/files/loader.ts:61,109`
- Include next steps in error messages
- Fail fast if config missing/invalid

**Implications:**
- Path functions will validate context is initialized
- If context not initialized, throw error: "Context not initialized. Run 'synkio init' or call initContext() programmatically."
- If config file not found, throw error: "Config file not found at {path}. Run 'synkio init' to create one."
- Clear error messages with next steps
- No silent failures or undefined behavior

### Question 5: Configuration File Structure

**Q:** What should the file/folder structure look like for the context system? Should we:
- Follow convention-over-configuration (default folders like .figma/, tokens/)?
- Make everything explicitly configurable in tokensrc.json?
- Hybrid approach with conventions that can be overridden?

**Answer:**
- **Config-driven, not convention-driven**
- Let users choose: `design-tokens/`, `theme/`, `sync-data/` - whatever they want
- Config defines all paths
- Support multiple config file names: `tokensrc.json`, `.synkiorc`, `synkio.config.json`

**Implications:**
- No hardcoded folder names anywhere in the codebase
- tokensrc.json must explicitly define:
  - `paths.data` - where baselines/reports are stored
  - `paths.tokens` - where token files are output
  - `paths.config` - where config file itself is located (for multi-config support)
- Support config file discovery:
  1. Check `tokensrc.json` (preferred)
  2. Check `.synkiorc`
  3. Check `synkio.config.json`
  4. If none found, error with suggestion to run init
- All path resolution relative to config file location

### Question 6: Testing Strategy

**Q:** How should we test the context system and path resolution? Should we:
- Unit tests with mocked filesystem?
- Integration tests with real temporary directories?
- Test against multiple project structures?

**Answer:**
- As per ROADMAP split:
  - **Phase 1A: Unit tests (mock FS)**
  - **Phase 1E: Integration tests (real projects)**
- Test in multiple project structures, not just one convention

**Implications:**
- Create unit tests with mocked filesystem using Vitest
- Test scenarios:
  - No config file exists
  - Minimal config (only required fields)
  - Full config (all paths customized)
  - Invalid config (missing required fields)
  - Multiple config file names
- Mock `fs`, `path`, `process.cwd()` for predictable testing
- Integration tests (Phase 1E):
  - Next.js 15 project
  - Remix project
  - Vite + vanilla TypeScript
  - Each with different folder structures

### Question 7: Backwards Compatibility Requirements

**Q:** Do we need to maintain backwards compatibility with the existing Clarity implementation? Should we:
- Support automatic migration from old file structure?
- Provide dual mode (old + new paths)?
- Clean break with migration guide only?

**Answer:**
- **Migration guide + tool, not code**
- Create `synkio migrate --from clarity-figma-sync`
- Generates tokensrc.json from old structure
- Keep core clean

**Implications:**
- No backwards compatibility code in core package
- Create separate CLI command: `synkio migrate`
- Migration tool responsibilities:
  - Detect `figma-sync/.figma/` structure
  - Read existing config from `figma-sync/.figma/config/tokensrc.json`
  - Generate new root-level tokensrc.json with converted paths
  - Report what was migrated
  - Optionally move files to new locations
- Migration guide in README:
  - Step-by-step instructions
  - Before/after examples
  - Common pitfalls
- Core package stays clean, migration complexity isolated

### Question 8: Multi-Context Support

**Q:** Should we support multiple contexts (for monorepo usage)? Should we:
- Global singleton context only?
- Allow creating multiple context instances explicitly?
- Both (global convenience + explicit for advanced use cases)?

**Answer:**
- **Built-in from day 1**
- Support both global context (convenience) and explicit context (multi-project)
- Required for monorepo use case
- Not a future feature

**Implications:**
- Dual API design:
  ```typescript
  // Global context (singleton, convenience)
  initContext({ rootDir: process.cwd() });
  const path = getBaselinePath(); // uses global context

  // Explicit context (multi-project, monorepo)
  const ctx = createContext({ rootDir: './packages/app' });
  const path = getBaselinePath(ctx); // uses explicit context
  ```
- All path functions accept optional context parameter
- If no context provided, use global singleton
- If global not initialized, throw helpful error
- Monorepo example:
  ```typescript
  const projectA = createContext({ rootDir: './apps/web' });
  const projectB = createContext({ rootDir: './apps/mobile' });

  syncTokens(projectA);
  syncTokens(projectB);
  ```
- Context instances are isolated, no shared state

### Existing Code to Reference

**Current Problems in Codebase:**

The following files contain hard-coded paths that must be refactored:

**`packages/core/src/files/paths.ts` (Lines 9-40):**
- All constants hard-coded:
  - `FIGMA_SYNC_DIR = 'figma-sync'`
  - `FIGMA_DIR = 'figma-sync/.figma'`
  - `FIGMA_CONFIG_DIR = 'figma-sync/.figma/config'`
  - `FIGMA_DATA_DIR = 'figma-sync/.figma/data'`
  - `FIGMA_REPORTS_DIR = 'figma-sync/.figma/reports'`
  - `TOKENS_DIR = 'tokens'`
  - `STYLES_DIR = 'styles/tokens'`
  - `CONFIG_FILE = 'figma-sync/.figma/config/tokensrc.json'`
  - `BASELINE_FILE = 'figma-sync/.figma/data/baseline.json'`
- **Action:** Convert all exports from constants to functions
- **Pattern:** `export function getDataDir(ctx?: Context): string`

**`packages/core/src/files/loader.ts` (Throughout):**
- Uses `process.cwd()` everywhere without abstraction
- Examples:
  - Line 33: `path.join(process.cwd(), filePath || CONFIG_FILE)`
  - Line 82: `path.join(process.cwd(), filePath || BASELINE_FILE)`
  - Line 246: `path.join(process.cwd(), filePath)`
- **Action:** Replace all `process.cwd()` with `getContext().rootDir`
- **Pattern:** Follow existing error pattern at lines 61, 109 for validation

**`packages/core/src/figma/constants.ts` (Line 22):**
- Hard-coded path: `'figma-sync/.figma/.env'`
- Side effects at module import (lines 18-25):
  ```typescript
  config(); // .env
  config({ path: '.env.local' }); // .env.local
  const packageEnvPath = 'figma-sync/.figma/.env';
  if (existsSync(packageEnvPath)) {
    config({ path: packageEnvPath, override: true });
  }
  ```
- **Action:** Move env loading to lazy `loadEnv()` function
- **Action:** Remove side effects at import time
- **Action:** Read env path from config, not hardcoded

**Additional Files Affected:**

Based on imports of `paths.ts` constants, approximately 33 files need updates:
- All CLI commands: `src/cli/commands/*.ts`
- Token processing: `src/tokens/*.ts`
- Comparison logic: `src/compare/*.ts`
- File operations: `src/files/*.ts`
- Detection: `src/detect/*.ts`

**Existing Pattern to Follow:**

`packages/core/src/files/loader.ts` lines 61 and 109 show good error patterns:
```typescript
// Line 61
throw new Error(`Config file not found: ${filePath || CONFIG_FILE}\nRun 'npm run figma:setup' to create one.`);

// Line 109
throw new Error(`Baseline file not found: ${file}\nRun 'npm run figma:sync' to fetch from Figma.`);
```

This pattern should be replicated for context validation errors.

### Follow-up Questions

None required - user provided comprehensive answers covering all aspects.

## Visual Assets

### Files Provided:
No visual files found in `/Users/rasmus/synkio/agent-os/specs/2025-12-06-phase-1a-context-system/planning/visuals/`

### Visual Insights:
No visual assets provided. This is expected for a technical infrastructure feature focused on code architecture rather than user interface.

## Requirements Summary

### Functional Requirements

**Context System:**
- Create `src/context.ts` with dual API (global singleton + explicit instances)
- Auto-initialize on first use with only `rootDir: process.cwd()`
- Support multi-context for monorepo usage
- Throw actionable errors if config missing/invalid
- No default folder assumptions beyond process.cwd()

**Path Resolution:**
- Refactor `src/files/paths.ts` - convert ALL constants to functions
- All path functions accept optional `Context` parameter
- All paths derived from config file, not hardcoded
- Support multiple config file names: tokensrc.json, .synkiorc, synkio.config.json
- Resolve all paths relative to config file location

**Environment Variables:**
- Create `src/env.ts` for lazy environment loading
- Remove side effects from `src/figma/constants.ts`
- Load from standard locations: .env, .env.local
- Support optional custom env path via config
- Priority: .env → .env.local → custom (if configured) → process.env

**Configuration:**
- Config-driven, not convention-driven
- Required fields: figma.fileId, figma.nodeId (or configurable)
- Paths section with all directories explicitly defined
- Environment variable interpolation: `${FIGMA_ACCESS_TOKEN}`
- Support relative paths (resolved from config directory)
- Validation with clear error messages

**Migration:**
- Separate migration tool: `synkio migrate --from clarity-figma-sync`
- Detects old `figma-sync/.figma/` structure
- Generates new tokensrc.json
- Provides migration report
- No migration code in core package

**Error Handling:**
- Follow existing pattern from `loader.ts:61,109`
- Actionable errors with next steps
- Fail fast on missing config or invalid paths
- Clear messages: "Run 'synkio init' to create configuration"

### Non-Functional Requirements

**Framework Agnosticism:**
- Zero assumptions about project structure
- No hardcoded folder names or paths
- Works in Next.js, Remix, Vite, vanilla Node.js
- No framework-specific dependencies or patterns

**Testing:**
- Unit tests with mocked filesystem (Vitest)
- Test scenarios: no config, minimal config, full config, invalid config
- Integration tests in Phase 1E with real projects
- Test multiple project structures

**Maintainability:**
- Clean separation: core has no migration logic
- All path resolution through context system
- Single source of truth for configuration
- No legacy compatibility code

**Developer Experience:**
- Clear error messages with actionable next steps
- Support both CLI and programmatic API usage
- TypeScript types exported properly
- Works in monorepos with multiple contexts

### Scope Boundaries

**In Scope:**
- Context system implementation (`src/context.ts`)
- Environment loading system (`src/env.ts`)
- Path resolution refactor (`src/files/paths.ts` → functions)
- Update all ~33 TypeScript files using path constants
- Configuration file structure and loading
- Multi-context support for monorepos
- Validation and error handling
- Unit tests with mocked filesystem

**Out of Scope:**
- CLI modernization (commander/inquirer) - Phase 1C
- Enhanced config schema with build commands - Phase 1B
- Integration tests with real projects - Phase 1E
- Migration tool implementation - Separate feature
- Style Dictionary integration changes - Later phase
- NPM publishing - Phase 1E
- Documentation and README - Phase 1E

**Future Enhancements (Not Phase 1A):**
- Config file auto-discovery in monorepos
- Config validation with JSON schema
- Visual preview of token paths
- Watch mode for config changes
- Config merging/inheritance for monorepos

### Technical Considerations

**Integration Points:**
- Must work with existing CLI commands structure
- Must work with existing Figma API integration
- Must work with existing token processing logic
- Must integrate with existing file operations
- Must support programmatic API usage (Next.js, Remix)

**Technology Constraints:**
- Node.js >= 18.0.0
- TypeScript strict mode
- ES modules (import/export), no CommonJS
- No framework-specific dependencies
- Vitest for unit testing

**Existing Patterns to Follow:**
- Error messages: Pattern from `loader.ts:61,109`
- Lazy initialization: Similar to planned env loading
- Optional parameters: Follow TypeScript conventions
- File operations: Use existing `fs`, `path` patterns

**Dependencies:**
- No new dependencies required for context system
- Uses standard Node.js: `fs`, `path`, `process`
- Will integrate with existing: `dotenv` (for env loading)

**Performance Considerations:**
- Context initialization should be lazy (on-demand)
- Config file read only once and cached
- Path resolution should be fast (no I/O on every call)
- Environment variables loaded once per process

**Security Considerations:**
- Never commit tokens or secrets in config
- Environment variable interpolation for sensitive values
- No exposure of file paths in error messages (except in dev mode)
- Validate config paths don't escape project root

**Risks:**
1. **Breaking change impact**: Converting constants → functions breaks all imports
   - Mitigation: Clear migration guide, TypeScript will catch errors at compile time
2. **Missing path references**: May miss some hardcoded paths
   - Mitigation: Comprehensive grep for 'figma-sync', extensive testing
3. **Config file complexity**: Users may find config overwhelming
   - Mitigation: `synkio init` creates config, good defaults, clear docs
4. **Monorepo edge cases**: Multi-context may have unforeseen issues
   - Mitigation: Test explicitly with monorepo structure in Phase 1E

## Success Criteria

**Technical Success:**
- Zero hard-coded references to `figma-sync/` in entire codebase
- All path constants converted to functions using context
- Context system supports both global singleton and explicit instances
- Environment variables loaded lazily, no side effects at import
- All ~33 TypeScript files updated successfully
- Package builds without errors: `pnpm build`
- All unit tests passing (>80% coverage for context system)

**Functional Success:**
- Package can be installed in blank Next.js project and works
- Package can be installed in blank Remix project and works
- Package can be installed in blank Vite project and works
- Works with custom folder structure (e.g., `design-tokens/` instead of `tokens/`)
- Works with multiple config file names (tokensrc.json, .synkiorc, etc.)
- Clear error if config missing: "Run 'synkio init' to create configuration"
- Monorepo usage works with multiple explicit contexts

**Code Quality:**
- No TypeScript errors (`pnpm type-check`)
- No linting errors (`pnpm lint`)
- Code follows Agent OS standards (coding-style.md, conventions.md)
- Clear JSDoc comments on all public functions
- Unit tests for context system achieve >80% coverage

**Validation Checklist:**
- [ ] `src/context.ts` created with dual API (global + explicit)
- [ ] `src/env.ts` created with lazy loading
- [ ] `src/files/paths.ts` refactored (all exports are functions)
- [ ] `src/figma/constants.ts` refactored (no side effects)
- [ ] All ~33 files updated to use new path functions
- [ ] Unit tests written for context system
- [ ] Unit tests written for path resolution
- [ ] Unit tests written for env loading
- [ ] Package builds successfully
- [ ] All tests pass
- [ ] Works in standalone project (not just Clarity)
- [ ] Multi-context works for monorepo scenario
- [ ] Error messages are actionable and helpful

## Dependencies

**Required Before This Spec:**
- None - this is Phase 1A, the foundational blocker removal

**Blocking Other Specs:**
- Phase 1B: Enhanced Configuration (depends on context system)
- Phase 1C: Modern CLI Experience (depends on path resolution)
- Phase 1D: Programmatic API (depends on context system)
- Phase 1E: Testing & Publishing (depends on all above)

**Related Documentation:**
- `/Users/rasmus/synkio/docs/PHASE_1_DEEP_DIVE.md` - Technical implementation details
- `/Users/rasmus/synkio/docs/ROADMAP.md` - Full product roadmap
- `/Users/rasmus/synkio/agent-os/standards/` - Coding standards and conventions

**External Dependencies:**
- None (uses standard Node.js libraries)

## Implementation Notes

**Files to Create:**
1. `/Users/rasmus/synkio/packages/core/src/context.ts`
2. `/Users/rasmus/synkio/packages/core/src/env.ts`
3. `/Users/rasmus/synkio/packages/core/src/context.test.ts` (unit tests)
4. `/Users/rasmus/synkio/packages/core/src/env.test.ts` (unit tests)

**Files to Refactor:**
1. `/Users/rasmus/synkio/packages/core/src/files/paths.ts` (constants → functions)
2. `/Users/rasmus/synkio/packages/core/src/figma/constants.ts` (remove side effects)
3. `/Users/rasmus/synkio/packages/core/src/files/loader.ts` (use context)
4. All CLI commands in `/Users/rasmus/synkio/packages/core/src/cli/commands/`
5. All token processing files in `/Users/rasmus/synkio/packages/core/src/tokens/`
6. All comparison files in `/Users/rasmus/synkio/packages/core/src/compare/`

**Estimated Files Affected:** ~33-35 TypeScript files

**Estimated Effort:**
- Context system creation: 4-6 hours
- Path refactoring: 6-8 hours
- Environment loading refactor: 2-3 hours
- Update all imports: 4-6 hours
- Unit tests: 4-6 hours
- **Total: 20-29 hours** (approximately 1 week full-time)

**Order of Implementation:**
1. Create `src/context.ts` with basic structure
2. Create `src/env.ts` with lazy loading
3. Refactor `src/files/paths.ts` to use context
4. Update `src/figma/constants.ts` to remove side effects
5. Update `src/files/loader.ts` to use context
6. Update all CLI commands
7. Update all other files importing from paths.ts
8. Write unit tests
9. Validate builds and tests pass
10. Manual testing in standalone project

**Testing Strategy:**
- Unit tests first (mocked FS)
- Build validation
- Manual testing in blank Next.js project
- Integration tests later (Phase 1E)

**Next Steps After Completion:**
1. Spec-writer creates detailed implementation spec
2. Task-planner breaks down into granular tasks
3. Implementation begins with context system
4. Move to Phase 1B (Enhanced Configuration)
