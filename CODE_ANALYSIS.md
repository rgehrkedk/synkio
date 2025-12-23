# Synkio CLI Code Analysis Report

**Date:** 2024-12-23
**Scope:** Full codebase analysis for potential bugs, security issues, and code quality problems

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 4 |
| Medium | 6 |
| Low | 4 |
| **Total** | **15** |

---

## Critical Issues

### 1. Shell Injection Vulnerability in Build Runner

**File:** `packages/cli/src/core/sync/build-runner.ts:73`
**Severity:** CRITICAL

**Issue:** The `buildScript` string from config is passed directly to `execSync` without sanitization:

```typescript
execSync(buildScript, {
  stdio: 'inherit',
  cwd: process.cwd(),
});
```

A malicious `synkio.config.json` could execute arbitrary shell commands. While config files are typically under user control, this is still a security risk if:
- Config files are auto-generated or pulled from external sources
- The tool is used in CI/CD pipelines with untrusted input

**Suggested Fix:**
- Use `spawnSync` with explicit argument parsing instead of `execSync`
- Alternatively, validate that the script matches expected patterns
- At minimum, document the security implications in the config schema

---

## High Severity Issues

### 2. Unvalidated JSON.parse Without Error Handling

**Files:**
- `packages/cli/src/core/import/source-resolver.ts:73, 78, 141`

**Issue:** JSON parsing is not wrapped in try-catch blocks:

```typescript
const content = JSON.parse(await readFile(resolve(inputPath, filename), 'utf-8'));
```

If a file contains invalid JSON, the application crashes with an unhandled error instead of providing a user-friendly message.

**Suggested Fix:**
```typescript
try {
  const content = JSON.parse(await readFile(filePath, 'utf-8'));
} catch (error) {
  return { files: [], error: `Invalid JSON in ${filename}: ${(error as Error).message}` };
}
```

---

### 3. Non-null Assertions on Map.get() Operations

**Files:**
- `packages/cli/src/core/tokens.ts:290` - `.get(fileKey)!`
- `packages/cli/src/core/tokens.ts:361` - `.pop()!`
- `packages/cli/src/core/compare/variable-comparator.ts:45, 89, 98`

**Issue:** Non-null assertions (`!`) on Map lookups can throw `TypeError` if the key doesn't exist:

```typescript
const fileData = files.get(fileKey)!;
const baselineModes = baselineByVarId.get(varId)!;
```

**Suggested Fix:**
```typescript
const fileData = files.get(fileKey);
if (!fileData) {
  throw new Error(`Internal error: File data not found for key: ${fileKey}`);
}
```

---

### 4. Silent Error Suppression

**Files:**
- `packages/cli/src/core/import/source-resolver.ts:57, 112, 135`

**Issue:** Errors are silently suppressed, making debugging difficult:

```typescript
const inputStat = await stat(inputPath).catch(() => null);
```

This approach hides the actual error (permission denied, etc.) and makes it appear as if the path simply doesn't exist.

**Suggested Fix:**
```typescript
const inputStat = await stat(inputPath).catch((err) => {
  if (err.code === 'ENOENT') return null;
  throw err; // Re-throw unexpected errors
});
```

---

### 5. Prototype Pollution Vulnerability in deepMerge

**File:** `packages/cli/src/core/utils/deep-merge.ts:19-29`

**Issue:** The `deepMerge` function has multiple vulnerabilities:

```typescript
export function deepMerge(target: any, source: any): void {
  for (const key of Object.keys(source)) {
    // No protection against __proto__, constructor, or prototype keys
    // No circular reference detection
```

1. **Prototype pollution:** No filtering of dangerous keys (`__proto__`, `constructor`, `prototype`)
2. **Infinite recursion:** No circular reference detection
3. **Type unsafety:** Uses `any` types throughout

**Suggested Fix:**
```typescript
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function deepMerge(target: any, source: any, visited = new WeakSet()): void {
  if (visited.has(source)) {
    throw new Error('Circular reference detected');
  }
  if (source && typeof source === 'object') {
    visited.add(source);
  }

  for (const key of Object.keys(source)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    // ... rest of logic
  }
}
```

---

## Medium Severity Issues

### 6. Excessive Use of `any` Type

**Files:** Throughout the codebase, particularly:
- `packages/cli/src/types/index.ts:12, 36, 57, 58, 66, 73, 82`
- `packages/cli/src/core/tokens.ts:23, 118, 141, 176`
- `packages/cli/src/core/sync/pipeline.ts:90-95`

**Issue:** Extensive use of `any` defeats TypeScript's type safety and can hide bugs that would otherwise be caught at compile time.

**Suggested Fix:** Define proper types/interfaces. Use `unknown` if the type is truly dynamic, then perform runtime type checks.

---

### 7. Non-null Assertion in setNestedPath

**File:** `packages/cli/src/core/utils/nested-set.ts:26`

**Issue:**
```typescript
current[path.at(-1)!] = value;  // Crashes if path is empty
```

If `path` is an empty array, `path.at(-1)` returns `undefined`, and the assertion masks this.

**Suggested Fix:**
```typescript
if (path.length === 0) {
  throw new Error('Cannot set value on empty path');
}
```

---

### 8. Potential Race Condition in Watch Mode

**File:** `packages/cli/src/cli/commands/sync.ts:100-170`

**Issue:** The watch loop doesn't prevent concurrent sync operations:

```typescript
while (isRunning) {
  if (hasChanges(result)) {
    await syncCommand(options); // Could overlap with next iteration
  }
  await new Promise(resolve => setTimeout(resolve, interval));
}
```

If a sync takes longer than the interval, multiple syncs could run concurrently.

**Suggested Fix:**
```typescript
let isSyncing = false;
while (isRunning) {
  if (!isSyncing && hasChanges(result)) {
    isSyncing = true;
    try {
      await syncCommand(options);
    } finally {
      isSyncing = false;
    }
  }
  await new Promise(resolve => setTimeout(resolve, interval));
}
```

---

### 9. Unvalidated parseFloat Results

**Files:**
- `packages/cli/src/core/css/index.ts:254-255`
- `packages/cli/src/core/export/baseline-builder.ts:97`

**Issue:**
```typescript
const num = Number.parseFloat(value);
if (!Number.isNaN(num)) { /* use num */ }
```

While `isNaN` check exists, there's no validation for `Infinity` or extremely large numbers.

**Suggested Fix:**
```typescript
if (Number.isFinite(num)) { /* use num */ }
```

---

### 10. Mixed Module Import Styles

**File:** `packages/cli/src/cli/commands/sync.ts:322`

**Issue:**
```typescript
const { printStyleDiffSummary } = require('../compare.js');
```

Using CommonJS `require()` in an ES module context. Should use dynamic `import()` consistently.

---

### 11. Incomplete Value Comparison

**File:** `packages/cli/src/core/compare/variable-comparator.ts:113`

**Issue:**
```typescript
if (JSON.stringify(baselineEntry.value) !== JSON.stringify(fetchedEntry.value)) {
```

Using `JSON.stringify` for comparison has limitations:
- Object key order affects comparison (though typically stable)
- Cannot detect equivalent but differently structured values
- Special values like `undefined` become `null`

---

## Low Severity Issues

### 12. Redundant Collection Assignment

**File:** `packages/cli/src/core/figma-native.ts:268-280`

**Issue:**
```typescript
if (parts.length >= 2 && !inferredOptions.collection) {
  inferredOptions.collection = inferredOptions.collection || options.collection;  // Redundant
}
```

The right-hand side is redundant since `inferredOptions.collection` is already falsy.

---

### 13. Unsafe Type Assertion

**File:** `packages/cli/src/core/figma-native.ts:125`

**Issue:**
```typescript
return (value as any).value;
```

Using `as any` defeats type checking.

---

### 14. Missing Command Argument Validation

**File:** `packages/cli/src/cli/bin.ts:18, 28`

**Issue:**
```typescript
const command = args[0];  // No check if args[0] exists
const [key, value] = arg.slice(2).split('=');  // Could fail on malformed input
```

---

### 15. Missing Baseline Structure Validation

**File:** `packages/cli/src/core/compare.ts:60-61`

**Issue:**
```typescript
const baselineEntries = (rawBaseline as any).baseline || rawBaseline;
```

The fallback logic assumes `rawBaseline` is in the correct format if it doesn't have a `.baseline` property, but this could fail silently with malformed data.

---

## Recommendations

### Immediate Actions (Critical/High)
1. **Sanitize build script execution** - Add input validation or use safer execution methods
2. **Add JSON parsing error handling** - Wrap all `JSON.parse` calls in try-catch
3. **Replace non-null assertions** - Use proper null checks with informative errors
4. **Protect deepMerge from prototype pollution** - Filter dangerous keys

### Short-term Improvements (Medium)
1. **Reduce `any` usage** - Define proper types throughout the codebase
2. **Add race condition protection** - Implement mutex/flag for watch mode
3. **Validate numeric values** - Use `Number.isFinite()` instead of just `!isNaN()`

### Code Quality (Low)
1. **Clean up redundant code** - Fix the redundant collection assignment
2. **Consistent module imports** - Use ES module dynamic imports throughout
3. **Add input validation** - Validate CLI arguments before processing

---

## Testing Recommendations

Consider adding tests for:
1. Malformed JSON input handling
2. Empty/undefined path handling in nested set operations
3. Concurrent sync operation behavior
4. Edge cases for color value normalization (negative values, out-of-range values)
5. Baseline comparison with malformed data
