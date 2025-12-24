# Code Review: Redundant & Legacy Code Analysis

This document summarizes the code review findings for redundant, overkill, or legacy code in the Synkio CLI.

## Changes Applied

### 1. Removed: `tokensrc.json` Support ✅

**Files changed:**
- `src/core/config.ts` - Removed from CONFIG_FILES, simplified `findConfigFile()` return type
- `src/cli/commands/init.ts` - Updated to use `CONFIG_FILE`
- `src/cli/commands/validate.ts` - Updated for new return type
- `src/cli/commands/docs.ts` - Fixed comment
- `src/index.ts` - Updated exports
- `README.md`, `USER_GUIDE.md` - Removed legacy notes

**Impact:** -29 lines, cleaner config loading logic.

---

### 2. Fixed: `require()` in ESM Codebase ✅

**File:** `src/core/sync/pipeline.ts`

**Before:**
```typescript
if (hasStyleChanges(styleResult)) {
  const { printStyleDiffSummary } = require('../compare.js');
  printStyleDiffSummary(styleResult);
}
```

**After:**
```typescript
// Added to imports at top of file
import { ..., printStyleDiffSummary } from '../compare.js';

// In code
if (hasStyleChanges(styleResult)) {
  printStyleDiffSummary(styleResult);
}
```

**Impact:** Proper ESM imports, no CommonJS mixing.

---

## Reviewed & Kept (No Action Needed)

### 3. `token_vault` Legacy Namespace — KEEP

**Location:** `src/core/figma.ts:31-32`, `src/core/tokens.ts:198-210`

**Purpose:** Backward compatibility for users with old Figma files that haven't re-run the Synkio plugin.

**Reasoning:**
- Only ~15 lines of code
- Low maintenance burden
- Breaking change for users with legacy data
- Could add deprecation warning in future

**Recommendation:** Keep for now. Consider deprecation warning when `token_vault` data is detected.

---

### 4. Duplicate Style Comparison Functions — ACCEPTABLE

**Location:** `src/core/compare.ts:188-297` (~110 lines)

**Functions:**
| Style Function | Token Function |
|----------------|----------------|
| `hasStyleChanges()` | `hasChanges()` |
| `hasBreakingStyleChanges()` | `hasBreakingChanges()` |
| `getStyleChangeCounts()` | `getChangeCounts()` |
| `printStyleDiffSummary()` | `printDiffSummary()` |

**Reasoning:**
- `ComparisonResult` and `StyleComparisonResult` have fundamentally different shapes
- Tokens have modes/collections; styles don't
- Generic abstraction would add complexity for minimal benefit
- Each function is simple and explicit

**Recommendation:** Keep as-is. The duplication is acceptable for clarity.

---

### 5. Duplicate `ParsedToken` Interfaces — DIFFERENT PURPOSES

**Locations:**
- `src/core/export/token-parser.ts:13-26` — For parsing token files
- `src/core/docs/index.ts:27-41` — For documentation rendering

**Analysis:**
| Field | export/token-parser | docs/index |
|-------|---------------------|------------|
| path, value, type | ✓ | ✓ |
| variableId | ✓ | - |
| description | ✓ | ✓ |
| scopes | ✓ | - |
| collection, mode | - | ✓ |
| cssVariable | - | ✓ |
| referencePath, resolvedValue | - | ✓ |
| platformVariables | - | ✓ |

**Reasoning:** Different contexts require different data. Same name is confusing but implementations are correct.

**Recommendation:** Optional: rename for clarity (`TokenFileEntry`, `DocsTokenEntry`).

---

### 6. Removed CLI Flags Handling — KEEP (Migration Helpers)

**Location:** `src/cli/bin.ts:210-228`

**Purpose:** Helpful error messages when users try deprecated `--token` or `--output-dir` flags.

**Reasoning:**
- Good UX for migrating users
- Provides clear instructions for new approach
- Minimal code (~18 lines)

**Recommendation:** Keep. These are intentional migration helpers, not dead code.

---

## Summary

| Finding | Status | Lines Changed |
|---------|--------|---------------|
| `tokensrc.json` support | ✅ Removed | -29 |
| `require()` in ESM | ✅ Fixed | -2 |
| `token_vault` namespace | ⏸️ Keep | 0 |
| Duplicate style functions | ⏸️ Keep | 0 |
| `ParsedToken` interfaces | ⏸️ Keep | 0 |
| Removed CLI flags | ⏸️ Keep | 0 |

**Total lines removed:** 31

---

## Future Considerations

1. **`token_vault` deprecation timeline:** Consider adding a deprecation warning and setting a removal date (e.g., v2.0.0).

2. **Interface naming:** If confusion arises, rename `ParsedToken` interfaces:
   - `export/token-parser.ts` → `TokenFileEntry`
   - `docs/index.ts` → `DocsTokenEntry`

3. **Style comparison abstraction:** If more comparison types are added, consider a generic pattern. Current duplication is acceptable for 2 types.
