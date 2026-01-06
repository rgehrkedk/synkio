# Concerns

> Technical debt, known issues, and areas for improvement

**Generated:** 2026-01-06

---

## Critical Issues

### 1. Missing Async/Await in Command Entry Point

**File:** `packages/cli/src/cli/bin.ts` (lines 257-395)

**Issue:** Async command functions are called without `await`, causing potential race conditions where the process may exit before async operations complete.

```typescript
// Current (BROKEN):
case 'pull': {
    pullCommand({...});  // Returns promise, but not awaited
    break;
}
```

**Impact:** Commands may not complete before Node.js exits. Silent failures possible.

**Locations:**
- `packages/cli/src/cli/bin.ts:281` - initCommand
- `packages/cli/src/cli/bin.ts:289` - initBaselineCommand
- `packages/cli/src/cli/bin.ts:299-312` - pullCommand/pullWatchCommand
- `packages/cli/src/cli/bin.ts:318` - diffCommand
- `packages/cli/src/cli/bin.ts:325` - buildCommand
- (and more...)

**Fix:** Wrap switch statement in async IIFE and await all command calls.

---

### 2. Hardcoded Legacy Plugin ID

**File:** `packages/cli/src/core/figma.ts` (line 95)

**Issue:** Hardcoded Token Vault plugin ID `'1234567890'` creates vendor lock-in.

**Fix:** Externalize to configuration or environment variable.

---

## High Severity

### 3. Excessive Type Assertions

**File:** `packages/cli/src/cli/bin.ts`

37+ instances of `as string` / `as boolean` type assertions bypass TypeScript safety.

### 4. Unvalidated JSON Parsing

**Files:**
- `packages/cli/src/cli/commands/init-baseline.ts:87`
- `packages/cli/src/cli/commands/export-baseline.ts:296`
- `packages/cli/src/core/sync/pipeline.ts:217`

JSON.parse without granular error handling.

---

## Medium Severity

### 5. Large Functions

Functions exceeding 400 lines are difficult to test and maintain:

| File | Lines | Purpose |
|------|-------|---------|
| `src/core/sync/pipeline.ts` | 817 | Sync orchestration |
| `src/core/docs/css-generator.ts` | 791 | CSS generation |
| `src/cli/commands/pull.ts` | 579 | Pull logic |
| `src/core/tokens.ts` | 570 | Token normalization |
| `src/core/compare/collection-matcher.ts` | 450 | Matching |
| `src/core/config.ts` | 436 | Config |

### 6. Missing .env.example

No `.env.example` despite code using environment variables. New developers don't know `FIGMA_TOKEN` is required.

---

## Low Severity

### 7. TODO in Plugin Documentation

**File:** `docs/specs/CODE_SYNC_STATUS_PLUGIN.md:539`

```typescript
// TODO: Show "Copied!" feedback
```

### 8. Silent Error Suppression

**Files:** `src/core/import/source-resolver.ts:57, 112, 135`

`.catch(() => null)` patterns don't distinguish error types.

---

## Test Coverage Gaps

~40% test coverage (29 test files / 73 source files)

**Critical untested areas:**
- `packages/cli/src/cli/bin.ts` - Command routing
- `packages/cli/src/core/sync/pipeline.ts` - Orchestration
- `packages/cli/src/core/docs/css-generator.ts` - CSS generation

---

## Documentation Gaps

1. No `.env.example` file
2. Large functions lack detailed comments
3. No documented error handling strategy
4. No documented approach for reducing `any` usage

---

## Security Notes

**Protected:**
- ✅ Build script validation in `packages/cli/src/core/sync/build-runner.ts`
- ✅ Environment variable handling via `dotenv`

**Potential concern:**
- Config file auto-modification (`updateConfigWithCollections`, `updateConfigWithCollectionRenames`) could be issue in multi-user environments

---

## Performance

### N+1 Pattern
**File:** `packages/cli/src/core/sync/pipeline.ts`

Sequential file processing without batching.

### CSS Generation
**File:** `packages/cli/src/core/docs/css-generator.ts`

791-line function with nested loops and string concatenation.

---

## Dependency Status

✅ All dependencies current:
- typescript@^5.0.0
- zod@^3.25.76
- vitest@^2.0.0
- chalk@^5.0.0

No deprecated or vulnerable dependencies detected.

---

## Actionable Recommendations

### Immediate
1. Fix missing async/await in `bin.ts`
2. Add `.env.example`
3. Externalize hardcoded plugin ID

### Short Term
1. Reduce `any` type usage (start with `bin.ts`)
2. Add tests for `bin.ts` command routing
3. Break down 400+ line functions

### Ongoing
1. Implement granular error handling for JSON parsing
2. Document error handling philosophy
3. Increase test coverage to >60%
