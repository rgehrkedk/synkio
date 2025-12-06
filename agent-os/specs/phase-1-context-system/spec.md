# Phase 1A: Context System Implementation

**Feature:** Create context system to eliminate hard-coded paths and make @synkio/core framework-agnostic

**Status:** 🔴 Not Started

**Priority:** P0 (Blocking - nothing else can proceed without this)

---

## Overview

The @synkio/core package currently has hard-coded paths to `figma-sync/.figma/` throughout the codebase, which prevents it from working as a standalone NPM package. This spec covers the implementation of a context system that will:

1. Eliminate all hard-coded paths
2. Make paths configurable via tokensrc.json
3. Support both CLI and programmatic API usage
4. Enable framework-agnostic usage

## Success Criteria

- ✅ Context system created at `packages/core/src/context.ts`
- ✅ All path constants in `src/files/paths.ts` converted to functions
- ✅ Environment variables lazy-loaded (no side effects at import)
- ✅ All 33 TypeScript files updated to use new path functions
- ✅ Package builds successfully with `pnpm build`
- ✅ No hard-coded references to `figma-sync/` anywhere in codebase

## Technical Requirements

### 1. Context System (`src/context.ts`)

Create a new file that manages:
- Project root directory resolution
- Data directory path (default: `.figma/`)
- Config file path (default: `tokensrc.json`)
- Path resolution relative to project root

**Key Functions:**
- `initContext(options?: Partial<PackageContext>): PackageContext` - Initialize context
- `getContext(): PackageContext` - Get current context (auto-init if needed)
- `resolvePath(...segments: string[]): string` - Resolve paths relative to root

### 2. Refactor `src/files/paths.ts`

Convert all path constants to functions that use the context system:

**Before (Constants):**
```typescript
export const FIGMA_SYNC_DIR = 'figma-sync';
export const BASELINE_FILE = 'figma-sync/.figma/data/baseline.json';
```

**After (Functions):**
```typescript
export function getDataDir(): string {
  return getContext().dataDir;
}

export function getBaselinePath(): string {
  return resolvePath(getDataDir(), 'data', 'baseline.json');
}
```

### 3. Fix Environment Variable Loading (`src/figma/constants.ts`)

**Current Problem:** Side effects at module import time
**Solution:** Lazy-load environment variables

Create `src/env.ts` with:
- `loadEnv(options?)` - Lazy load .env files
- `getFigmaToken()` - Get token with auto-load

Update `src/figma/constants.ts` to remove side effects.

### 4. Update All Imports

Find and replace across all files:
- `import { BASELINE_FILE }` → `import { getBaselinePath }`
- `BASELINE_FILE` → `getBaselinePath()`

**Files to Update (~33 files):**
- All files in `src/cli/commands/`
- All files in `src/files/`
- All files in `src/tokens/`
- All files in `src/compare/`
- All files in `src/detect/`

## Implementation Details

### Context Interface

```typescript
export interface PackageContext {
  /** Project root directory (where tokensrc.json lives) */
  rootDir: string;

  /** Data directory for baselines/reports (.figma/ by default) */
  dataDir: string;

  /** Config file path (tokensrc.json by default) */
  configPath: string;
}
```

### Default Paths

When no config exists, use these defaults:
- Root: `process.cwd()`
- Data: `{rootDir}/.figma`
- Config: `{rootDir}/tokensrc.json`
- Baseline: `{dataDir}/data/baseline.json`
- Reports: `{dataDir}/reports`

### Path Resolution Strategy

1. CLI: Initialize context with `process.cwd()` at entry point
2. API: Require explicit `init({ rootDir })` call before usage
3. All paths resolved relative to root directory
4. Support both absolute and relative paths in config

## Testing Strategy

### Unit Tests (Create these files)

1. `src/context.test.ts`
   - Test context initialization
   - Test path resolution
   - Test custom options

2. `src/files/paths.test.ts`
   - Test all path functions return correct values
   - Test with different context configurations

### Integration Testing

1. Build package: `pnpm build`
2. Check dist/ output has no hard-coded paths
3. Verify TypeScript types are correct

## Dependencies

**No new dependencies required** - uses existing:
- `path` (Node.js built-in)
- `fs` (Node.js built-in)

## Migration Impact

### Breaking Changes
- Anyone importing path constants will need to update to functions
- This is acceptable as package is 0.x (pre-1.0)

### Files Affected
Approximately 33 TypeScript files across:
- `src/cli/commands/` (4 files)
- `src/files/` (3 files)
- `src/tokens/` (8 files)
- `src/figma/` (4 files)
- `src/compare/` (2 files)
- `src/detect/` (2 files)
- Other files importing paths

## Rollout Plan

### Phase 1A.1: Create Infrastructure
1. Create `src/context.ts`
2. Create `src/env.ts`
3. Add unit tests

### Phase 1A.2: Refactor Paths
1. Update `src/files/paths.ts` to use context
2. Test path functions work correctly

### Phase 1A.3: Update Imports
1. Update `src/figma/constants.ts` to use lazy loading
2. Update all CLI commands
3. Update all other files
4. Verify build succeeds

### Phase 1A.4: Cleanup
1. Remove legacy hard-coded paths
2. Remove old constants
3. Update documentation

## Related Documents

- `docs/PHASE_1_DEEP_DIVE.md` - Full technical deep dive
- `docs/PRODUCT_PLAN.md` - Overall product roadmap
- `agent-os/standards/global/conventions.md` - Project conventions
- `agent-os/standards/global/tech-stack.md` - Current phase status

## Next Steps After This

Once context system is complete:
1. Create programmatic API (`src/api/index.ts`)
2. Upgrade CLI to use commander/inquirer
3. Add config templates
4. Test in standalone projects
5. Publish beta to NPM
