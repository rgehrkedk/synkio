# Phase 1A Requirements: Context System

## Goal

Transform @synkio/core from a Clarity-specific package with hard-coded paths into a standalone, framework-agnostic NPM package that can work in any project.

## Critical Requirements

### CR-1: Zero Hard-Coded Paths
**Requirement:** No file paths may be hard-coded in the source code.

**Current State:**
- `src/files/paths.ts` has 12+ hard-coded path constants
- All start with `'figma-sync/'` prefix
- Used by ~33 files across the codebase

**Target State:**
- All paths resolved dynamically via context system
- Paths configurable via `tokensrc.json`
- Defaults work for new projects without config

**Acceptance Criteria:**
- [ ] Search for `'figma-sync'` returns 0 results in `src/` directory
- [ ] Search for hard-coded paths in `paths.ts` returns 0 results
- [ ] All path constants replaced with functions

### CR-2: Lazy Environment Loading
**Requirement:** Environment variables must NOT be loaded at module import time.

**Current Problem:**
```typescript
// src/figma/constants.ts
import { config } from 'dotenv';

// ❌ SIDE EFFECT - loads at import time
config();
config({ path: '.env.local' });
```

**Target State:**
- Create `src/env.ts` with `loadEnv()` function
- Functions that need env vars call `loadEnv()` first
- No side effects at module import

**Acceptance Criteria:**
- [ ] `src/figma/constants.ts` has no top-level `config()` calls
- [ ] `src/env.ts` exists with lazy loading
- [ ] Environment variables only loaded when needed

### CR-3: Context Initialization
**Requirement:** Support both CLI and programmatic API usage patterns.

**CLI Pattern:**
```typescript
// src/cli/index.ts
import { initContext } from '../context';

// Initialize once at CLI entry point
initContext({ rootDir: process.cwd() });

// All subsequent code uses getContext()
```

**API Pattern:**
```typescript
// User's Next.js app
import { init, fetchFigmaData } from '@synkio/core/api';

// User must call init() before using API
init({ rootDir: process.cwd() });

const data = await fetchFigmaData({ fileUrl, accessToken });
```

**Acceptance Criteria:**
- [ ] CLI initializes context automatically
- [ ] API requires explicit `init()` call
- [ ] Clear error message if context not initialized

### CR-4: Backward Compatibility
**Requirement:** Package must support existing `tokensrc.json` configs.

**Current Config:**
```json
{
  "paths": {
    "data": "figma-sync/.figma/data",
    "tokens": "tokens"
  }
}
```

**New Config (optional):**
```json
{
  "paths": {
    "root": ".",
    "data": "./.figma",
    "tokens": "./tokens"
  }
}
```

**Acceptance Criteria:**
- [ ] Old configs with `figma-sync/` prefix still work
- [ ] New configs with `.figma/` prefix work
- [ ] Config loader normalizes paths correctly

## Functional Requirements

### FR-1: Context System
**File:** `packages/core/src/context.ts`

**Functions Required:**

1. `initContext(options?: Partial<PackageContext>): PackageContext`
   - Initialize global context singleton
   - Accept custom paths or use defaults
   - Return initialized context object

2. `getContext(): PackageContext`
   - Get current context
   - Auto-initialize with defaults if not set
   - Never throw (safe to call anytime)

3. `resolvePath(...segments: string[]): string`
   - Resolve path relative to rootDir
   - Accept multiple segments
   - Return absolute path

**Interface:**
```typescript
export interface PackageContext {
  rootDir: string;      // Where tokensrc.json lives
  dataDir: string;      // Where baselines/reports go (.figma/)
  configPath: string;   // Path to tokensrc.json
}
```

### FR-2: Path Functions
**File:** `packages/core/src/files/paths.ts`

**Functions to Create:**

```typescript
// Directories
export function getDataDir(): string;
export function getConfigDir(): string;
export function getReportsDir(): string;
export function getTokensDir(): string;  // From config
export function getStylesDir(): string;  // From config

// Config files
export function getConfigPath(): string;

// Data files
export function getBaselinePath(): string;
export function getBaselinePrevPath(): string;

// Report files
export function getDiffReportPath(): string;
export function getMigrationReportPath(): string;

// Legacy support
export function getLegacyBaselinePath(): string;
export function getLegacyConfigPath(): string;
```

**Remove These Constants:**
```typescript
// ❌ DELETE ALL OF THESE
export const FIGMA_SYNC_DIR = 'figma-sync';
export const FIGMA_DIR = 'figma-sync/.figma';
export const BASELINE_FILE = 'figma-sync/.figma/data/baseline.json';
// ... etc
```

### FR-3: Environment Loading
**File:** `packages/core/src/env.ts`

**Functions Required:**

1. `loadEnv(options?: { envPath?: string }): void`
   - Load .env files in priority order
   - Only load once (idempotent)
   - Support custom env path

2. `getFigmaToken(): string | undefined`
   - Get FIGMA_ACCESS_TOKEN from env
   - Auto-call loadEnv() if needed
   - Return undefined if not found

**Priority Order:**
1. `.env` in project root
2. `.env.local` in project root
3. `.figma/.env` in data directory (highest priority)

### FR-4: Config Loader Updates
**File:** `packages/core/src/files/loader.ts`

**Updates Required:**

1. `loadConfig()` must:
   - Use `getContext().configPath` for config location
   - Resolve relative paths from config directory
   - Interpolate environment variables (`${VAR_NAME}`)
   - Merge with defaults if config incomplete

2. Update `PathsConfig` interface to support:
   - Root directory
   - Data directory
   - All file paths

## Non-Functional Requirements

### NFR-1: Performance
- Context initialization < 1ms
- Path resolution < 0.1ms per call
- No impact on CLI startup time

### NFR-2: Error Messages
All errors must be actionable:

**Good:**
```
Error: Config not found: /Users/me/project/tokensrc.json
Run 'synkio init' to create a config file.
```

**Bad:**
```
Error: ENOENT
```

### NFR-3: Type Safety
- Full TypeScript strict mode compliance
- Export all types from `src/context.ts`
- No `any` types allowed

### NFR-4: Documentation
- JSDoc comments on all exported functions
- Examples in comments
- Clear parameter descriptions

## Implementation Constraints

### IC-1: No New Dependencies
- Use only Node.js built-ins (`path`, `fs`)
- No additional npm packages for this feature

### IC-2: No Breaking Changes to Config
- Existing `tokensrc.json` files must work
- Only add new optional fields
- Provide migration helper if needed

### IC-3: Monorepo Context
- Package is in `packages/core/`
- Must work when installed as dependency
- Must work when linked locally with `pnpm link`

## Testing Requirements

### Unit Tests Required

1. **`src/context.test.ts`**
   ```typescript
   describe('Context System', () => {
     it('should initialize with default paths');
     it('should accept custom rootDir');
     it('should resolve paths relative to root');
     it('should auto-initialize on first getContext()');
     it('should return same instance on multiple calls');
   });
   ```

2. **`src/files/paths.test.ts`**
   ```typescript
   describe('Path Functions', () => {
     it('should return correct baseline path');
     it('should return correct config path');
     it('should use context dataDir');
     it('should handle custom context');
   });
   ```

3. **`src/env.test.ts`**
   ```typescript
   describe('Environment Loading', () => {
     it('should load .env files');
     it('should only load once');
     it('should respect priority order');
     it('should get Figma token');
   });
   ```

### Integration Tests Required

1. **Build Test**
   ```bash
   pnpm build
   # Should succeed with no errors
   ```

2. **Import Test**
   ```typescript
   // Test in standalone project
   import { init, fetchFigmaData } from '@synkio/core/api';
   init({ rootDir: process.cwd() });
   // Should work without errors
   ```

## Files to Update

### High Priority (Core Infrastructure)
1. `src/context.ts` - CREATE NEW
2. `src/env.ts` - CREATE NEW
3. `src/files/paths.ts` - MAJOR REFACTOR
4. `src/figma/constants.ts` - UPDATE (remove side effects)
5. `src/files/loader.ts` - UPDATE (use context)

### Medium Priority (CLI Commands)
6. `src/cli/commands/setup.ts` - UPDATE imports
7. `src/cli/commands/sync.ts` - UPDATE imports
8. `src/cli/commands/diff.ts` - UPDATE imports
9. `src/cli/commands/rollback.ts` - UPDATE imports
10. `src/cli/index.ts` - ADD context init

### Medium Priority (Core Logic)
11. `src/tokens/split.ts` - UPDATE imports
12. `src/tokens/apply.ts` - UPDATE imports
13. `src/tokens/migrate.ts` - UPDATE imports
14. `src/compare/diff.ts` - UPDATE imports
15. `src/figma/api.ts` - UPDATE (use lazy env)
16. `src/detect/index.ts` - UPDATE imports

### Lower Priority (Remaining Files)
17-33. All other files that import from `paths.ts`

## Success Metrics

### Code Quality
- [ ] 0 hard-coded paths in src/
- [ ] 0 ESLint errors
- [ ] 0 TypeScript errors
- [ ] 100% of path functions tested

### Functionality
- [ ] Package builds successfully
- [ ] CLI commands work with new context
- [ ] Existing configs still work
- [ ] New configs work

### Documentation
- [ ] All exported functions have JSDoc
- [ ] README updated with new usage
- [ ] Migration guide created

## Risks & Mitigations

### Risk 1: Missing Path References
**Impact:** Some files still use old constants
**Mitigation:**
- Search for `BASELINE_FILE` etc. before committing
- Use TypeScript to catch import errors

### Risk 2: Breaking Existing Clarity Integration
**Impact:** Clarity project breaks when using new package
**Mitigation:**
- Test with actual Clarity codebase
- Keep old constants as deprecated exports temporarily

### Risk 3: Environment Loading Issues
**Impact:** Tokens not found due to env loading bugs
**Mitigation:**
- Extensive logging during development
- Clear error messages when token missing
- Test with different .env locations

## Out of Scope

The following are NOT part of this spec:
- ❌ CLI upgrade to commander/inquirer (Phase 1B)
- ❌ Programmatic API exports (Phase 1C)
- ❌ Config templates (Phase 1D)
- ❌ NPM publishing (Phase 1E)

These will be separate specs after context system is complete.
