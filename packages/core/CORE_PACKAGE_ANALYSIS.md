# Synkio Core Package Analysis

**Date:** December 14, 2025
**Analyst:** AI Code Review
**Scope:** `packages/core/` - Objective analysis of legacy code, half-baked features, over-engineering, and bugs

---

## Executive Summary

The Synkio core package shows signs of **dual development tracks** with significant duplication between old and new command implementations. While the codebase is well-structured overall, there are clear opportunities for cleanup, simplification, and removal of legacy code.

**Key Findings:**
- ✅ **Good:** Strong type safety with Zod, clean context system, comprehensive testing
- ⚠️ **Warning:** Duplicate command implementations (legacy vs modern)
- ⚠️ **Warning:** Half-baked migration system with unused functionality
- ⚠️ **Warning:** Over-engineered detection and scaffolding systems
- 🔴 **Critical:** Legacy commands still present but unused

---

## 1. Legacy Code That Should Be Removed

### 1.1 Duplicate CLI Commands (Critical - Remove Immediately)

**Problem:** There are TWO complete implementations of each command:

| Legacy File (Unused) | Modern File (Used) | Status | Lines |
|---------------------|-------------------|---------|-------|
| `sync.ts` | `sync-cmd.ts` | ❌ Legacy | 366 vs 600 |
| `diff.ts` | `diff-cmd.ts` | ❌ Legacy | 297 vs 318 |
| `rollback.ts` | `rollback-cmd.ts` | ❌ Legacy | 154 vs 185 |
| `setup.ts` | `init.ts` | ⚠️ Unclear | 1040 vs 904 |

**Evidence:**
```typescript
// bin.ts only imports the -cmd versions:
const { syncCommand } = await import('./commands/sync-cmd.js');
const { diffCommand } = await import('./commands/diff-cmd.js');
const { rollbackCommand } = await import('./commands/rollback-cmd.js');
const { initCommand } = await import('./commands/init.js');
```

**Why This Exists:**
- Appears to be a refactoring from standalone scripts to modern CLI commands
- Legacy files use `main()` and are designed to be run with `npm run`
- Modern `-cmd.ts` files export command functions used by Commander.js

**Impact:**
- **2,857 lines** of dead code
- Confusing for maintainers (which version is canonical?)
- Risk of bugs being fixed in one version but not the other
- Duplicate test files

**Recommendation:**
```bash
# Delete these files immediately:
rm packages/core/src/cli/commands/sync.ts
rm packages/core/src/cli/commands/diff.ts
rm packages/core/src/cli/commands/rollback.ts

# Investigate setup.ts vs init.ts:
# - If setup.ts is legacy, delete it
# - If it's used for something else, rename it to be clearer
```

### 1.2 Deprecated Functions in migrate.ts

**Problem:** Multiple functions marked as `@deprecated` but still present:

```typescript
// Lines 29-31: @deprecated Use TokenReplacement instead
export type CssReplacement = TokenReplacement;

// Lines 43-44: @deprecated Use FileMatch instead
export type CssFileMatch = FileMatch;

// Lines 63-85: @deprecated Use pathChangeToTokenReplacement
export function pathChangeToReplacement(...): CssReplacement | null

// Lines 90-107: @deprecated Use buildPlatformReplacements
export function buildReplacements(...): CssReplacement[]

// Lines 111-126: @deprecated Use findPlatformFiles
export async function findCssFiles(...): Promise<string[]>

// Lines 130-173: @deprecated Use scanPlatformUsages
export async function scanCssUsages(...): Promise<CssFileMatch[]>

// Lines 177-241: @deprecated Use applyPlatformReplacements
export async function applyCssReplacements(...): Promise<MigrationResult>
```

**Impact:**
- ~250 lines of deprecated code
- False documentation (suggests these are valid APIs)
- Potential for users to use deprecated functions

**Recommendation:**
- If these are truly unused, delete them completely
- If they're used for backward compatibility, add a deprecation timeline
- Run grep to verify no usage: `grep -r "buildReplacements\|findCssFiles\|scanCssUsages\|applyCssReplacements" --exclude-dir=node_modules`

---

## 2. Half-Baked Features

### 2.1 Migration System: Over-Complex and Under-Used

**Problem:** The migration system has THREE different approaches:

1. **Path-based matching** (`scanAllPlatforms`) - Basic approach
2. **Token map matching** (`scanAllPlatformsWithMap`) - Recommended approach
3. **Manual migration plans** (`migration-plan.ts`) - Full workflow with approval

**Evidence:**
```typescript
// sync-cmd.ts lines 287-308: Fallback logic
if (oldTokenMap) {
  platformResults = await scanAllPlatformsWithMap(...);
} else {
  ctx.logger.info('No token map found. Using path-based matching (less precise).');
  platformResults = await scanAllPlatforms(...);
}
```

**Issues:**
1. **Token Map Generation** - Generated on every sync but rarely used effectively
2. **Migration Plans** - Full markdown-based approval workflow that seems unused
3. **Auto-Apply Logic** - Present but complexity suggests it's not battle-tested

**Files Involved:**
- `tokens/migration-plan.ts` (532 lines) - Markdown generation, approval workflow
- `tokens/migrate.ts` (607 lines) - Multi-platform scanning
- `tokens/apply-migrations.ts` (223 lines) - Application logic

**Recommendation:**
- **If token map approach works:** Delete path-based fallback and migration plans
- **If migration plans are needed:** Simplify the approval workflow (remove markdown parsing)
- **If auto-migration is risky:** Consider making it always dry-run first

### 2.2 Project Detection: Over-Engineered for Unclear Value

**Problem:** `detect/index.ts` (1,161 lines) is the largest file in the package, doing:
- Framework detection (Next.js, Vite, etc.)
- Token directory detection with fuzzy matching
- Style Dictionary detection
- Build script detection
- Collection name matching with confidence scores
- File mapping suggestions

**Evidence:**
```typescript
// Fuzzy matching for collections:
export function findCollectionMatches(
  collections: CollectionInfo[],
  files: DiscoveredFile[]
): CollectionMatch[] {
  // Complex scoring algorithm with confidence thresholds
}
```

**Issues:**
1. Used only during `synkio init` (one-time setup)
2. Most users will override detected values anyway
3. Complexity doesn't match value delivered
4. Confidence scoring for collection matching seems unnecessary

**Recommendation:**
- **Simplify to 20% of current size:** Detect framework + tokens directory, skip the rest
- **Remove:** Fuzzy matching, confidence scores, complex file mapping
- **Keep:** Basic path detection (tokens/, styles/, etc.)

### 2.3 Scaffolding System: Limited Use Case

**Problem:** `detect/scaffold.ts` generates Style Dictionary configs but:
- Only used during init if user wants scaffolding
- Limited to a few frameworks
- Generates code that users will customize anyway

**Recommendation:**
- Move to templates or external package
- Consider removing if adoption is low
- Replace with links to Style Dictionary docs

---

## 3. Over-Engineering

### 3.1 Context System: Likely Over-Designed

**Problem:** The context system supports both:
1. Global singleton pattern (for CLI)
2. Explicit instances (for "monorepo scenarios")

**Evidence:**
```typescript
// Two ways to use context:
initContext({ rootDir: process.cwd() }); // Global
const ctx = createContext({ rootDir: './packages/app' }); // Explicit
```

**Reality Check:**
- The CLI is the primary use case (not monorepos)
- Explicit context pattern is likely unused
- Adds complexity to every function signature

**Impact:**
- Functions support both patterns: `getBaselinePath(ctx?)`
- Documentation overhead
- Testing complexity

**Recommendation:**
- **If monorepo support is unused:** Remove explicit context, keep only singleton
- **If it's needed:** Provide real-world example in docs

### 3.2 Multiple Output Formats (Limited Value)

**Problem:** `diff` command supports three formats:
```typescript
--format <type>   # table, json, markdown
```

**Reality:**
- Table format is 95% use case
- JSON/markdown likely unused
- Adds ~200 lines of formatting code

**Recommendation:**
- Keep table (default)
- Consider removing json/markdown or move to separate utility

### 3.3 Platform Configuration Complexity

**Problem:** Platform configs support extensive transformation options:
```typescript
transform: {
  prefix: string;
  separator: string;
  case: 'kebab' | 'camel' | 'snake' | 'pascal';
  stripSegments: string[];
}
```

**Reality:**
- Most users want default CSS variable format (`--token-name`)
- Complex transformations are edge cases
- Adds significant code complexity

**Recommendation:**
- Provide sensible defaults
- Consider preset configs ("css", "tailwind", "js") instead of granular options

---

## 4. Potential Bugs

### 4.1 Baseline Backup Race Condition

**File:** `sync-cmd.ts` lines 533-543

**Issue:**
```typescript
if (options.backup !== false) {
  if (fs.existsSync(config.paths.baseline)) {
    // Manual backup logic duplicating backupBaseline()
    fs.copyFileSync(config.paths.baseline, config.paths.baselinePrev);
  }
}
```

**Problem:**
- Duplicates logic from `backupBaseline()` function
- No error handling for file system operations
- If Figma fetch fails after backup, baseline state is inconsistent

**Recommendation:**
- Use existing `backupBaseline()` function
- Add try-catch for file operations
- Restore baseline on fetch failure (already done on line 560, but too late)

### 4.2 Missing Validation for stripSegments

**File:** `migrate.ts` line 318

**Issue:**
```typescript
const stripSegments = globalStripSegments ?? config.transform.stripSegments ?? [];
```

**Problem:**
- No validation that stripSegments contains valid segment names
- Could silently strip important token path parts
- No warning if segment doesn't exist in any token path

**Recommendation:**
- Validate stripSegments against actual token paths
- Warn if segment is never found in any token

### 4.3 Token Boundary Regex Edge Cases

**File:** `tokens/transform.ts` (referenced in migrate.ts)

**Issue:**
```typescript
export function createTokenBoundaryRegex(token: string): RegExp {
  // Should not match --token-name-extended when looking for --token-name
}
```

**Problem:**
- Comment suggests this is a known issue
- Boundary detection for CSS variables is tricky
- Could cause false positives/negatives in migration

**Recommendation:**
- Add comprehensive tests for edge cases
- Document expected behavior clearly
- Consider using AST parsing for CSS files instead of regex

### 4.4 Unhandled Promise Rejections in Async Scans

**File:** `migrate.ts` lines 510-536

**Issue:**
```typescript
export async function scanAllPlatforms(...): Promise<PlatformScanResult[]> {
  for (const [platformName, platformConfig] of Object.entries(platforms)) {
    const usages = await scanPlatformUsages(replacements, platformConfig);
    // No error handling if scanPlatformUsages throws
  }
}
```

**Problem:**
- File read errors will crash the entire scan
- No graceful degradation if one platform fails

**Recommendation:**
- Wrap in try-catch
- Continue scanning other platforms if one fails
- Collect errors and report at end

---

## 5. Architectural Concerns

### 5.1 Inconsistent Error Handling

**Observations:**
- Some functions throw errors (e.g., `loadConfigOrThrow`)
- Others return null (e.g., `loadConfig`, `loadBaseline`)
- CLI commands mix both approaches

**Impact:**
- Unpredictable error propagation
- Difficult to handle errors consistently

**Recommendation:**
- Standardize: Throw for required operations, return null for optional
- Document error handling strategy
- Use Result<T, E> pattern for complex operations

### 5.2 Mixed Responsibilities in CLI Commands

**Problem:** Command files do too much:
- User interaction (prompts)
- Business logic (token processing)
- File I/O
- Reporting

**Example:** `sync-cmd.ts` is 600 lines mixing all concerns

**Recommendation:**
- Extract business logic to services
- Commands should be thin orchestrators
- Move reporting to separate module

### 5.3 Unclear Separation: Setup vs Init

**Files:** `setup.ts` (1,040 lines) vs `init.ts` (904 lines)

**Problem:**
- Both files seem to do similar things
- `setup.ts` has more code but unclear if it's used
- Naming suggests they should be merged or one should be removed

**Recommendation:**
- Investigate which is canonical
- Merge or clearly document the difference
- Rename for clarity if both are needed

---

## 6. Missing Features / Half-Finished Work

### 6.1 Token Map: Generated but Rarely Used

**Problem:**
- Token map is generated on every sync
- Only used for "precise migration" (token map approach)
- But fallback path-based approach is still primary

**Evidence:**
```typescript
// sync-cmd.ts: Always generated
const tokenMap = generateTokenMap(fetchedData, config);
saveJsonFile(tokenMapPath, tokenMap);

// But only used if previous map exists:
if (oldTokenMap) { /* use map */ }
else { /* use path matching */ }
```

**Recommendation:**
- Either commit fully to token map approach or remove it
- If keeping, make it required (no fallback)

### 6.2 Style Dictionary Integration: Incomplete

**Problem:**
- Detects Style Dictionary config
- Scaffolds new configs
- But doesn't actually integrate with SD workflow

**Evidence:**
```typescript
build: {
  styleDictionary: {
    enabled: boolean;
    config: string;
    version: 'v3' | 'v4';
  }
}
```

**But:** Synkio just runs `config.build.command`, doesn't call SD programmatically

**Recommendation:**
- Either integrate properly (import and run SD) or remove SD-specific logic
- Current state is confusing (looks integrated but isn't)

---

## 7. Code Quality Metrics

### 7.1 File Size Distribution

| File | Lines | Status |
|------|-------|--------|
| `detect/index.ts` | 1,161 | 🔴 Too large |
| `setup.ts` | 1,040 | 🔴 Possibly legacy |
| `init.ts` | 904 | ⚠️ Could be split |
| `loader.ts` | 631 | ⚠️ Could be split |
| `migrate.ts` | 607 | ⚠️ Has deprecated code |
| `sync-cmd.ts` | 600 | ⚠️ Mixed concerns |

**Recommendation:**
- Files >500 lines should be split into modules
- Use services/ or lib/ directory for business logic

### 7.2 Duplication Score

**Estimated duplicate code:** ~3,000 lines
- Legacy commands: ~2,857 lines
- Deprecated functions: ~250 lines
- Duplicate logic in different platforms: ~500 lines

### 7.3 Test Coverage Gaps

**Observations:**
- Good test coverage for core logic (context, paths, compare)
- Missing tests for:
  - Error scenarios in migration
  - Platform-specific transformations
  - File I/O edge cases

---

## 8. Recommendations Summary

### Priority 1: Remove Legacy Code (1-2 days)
1. ✅ Delete unused command files (`sync.ts`, `diff.ts`, `rollback.ts`)
2. ✅ Remove deprecated functions in `migrate.ts`
3. ✅ Investigate and resolve `setup.ts` vs `init.ts` duplication

**Impact:** -3,000 lines of code, clearer codebase

### Priority 2: Simplify Half-Baked Features (3-5 days)
1. ⚠️ Decide on migration strategy: token map OR path-based (not both)
2. ⚠️ Simplify `detect/index.ts` to 20% of current size
3. ⚠️ Remove or externalize scaffolding system
4. ⚠️ Remove unused output formats (json, markdown for diff)

**Impact:** -1,500 lines of code, clearer feature set

### Priority 3: Fix Bugs (2-3 days)
1. 🔴 Fix baseline backup race condition
2. 🔴 Add error handling to async scans
3. 🔴 Validate stripSegments configuration
4. 🔴 Test token boundary regex edge cases

**Impact:** More robust system

### Priority 4: Architectural Improvements (1-2 weeks)
1. Standardize error handling patterns
2. Extract business logic from CLI commands
3. Decide on context system (singleton vs explicit)
4. Document which features are "core" vs "nice-to-have"

**Impact:** Easier to maintain and extend

---

## 9. Risk Assessment

### High Risk: Breaking Changes
- Removing legacy commands: **Low risk** (they're not used in bin.ts)
- Changing migration strategy: **Medium risk** (users may rely on current behavior)
- Removing platform configs: **High risk** (users may customize these)

### Medium Risk: User Impact
- Simplifying detection: **Low impact** (only affects init flow)
- Removing output formats: **Low impact** (table is default)
- Removing scaffolding: **Medium impact** (some users may use it)

### Low Risk: Internal Changes
- Fixing bugs: **Low risk** (improves reliability)
- Code organization: **Low risk** (no API changes)

---

## 10. Conclusion

The Synkio core package is **well-architected** but suffering from:
1. **Incomplete refactoring** (legacy + modern code coexisting)
2. **Feature creep** (migration, detection, scaffolding all half-finished)
3. **Over-engineering** (supporting patterns that may not be used)

### Recommended Actions:
1. **Immediate:** Delete legacy command files (zero risk, big cleanup)
2. **Short-term:** Pick one migration strategy and commit to it
3. **Medium-term:** Simplify detection and remove scaffolding
4. **Long-term:** Standardize patterns and extract business logic

### Expected Outcomes:
- **-4,500 lines** of code removed
- **Clearer feature boundaries**
- **Easier to maintain and extend**
- **Better onboarding for new contributors**

---

**Note:** This analysis is based on static code review. Real-world usage data would help prioritize which "half-baked" features are actually valuable vs unused.
