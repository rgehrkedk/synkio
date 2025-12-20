# SonarQube/SonarLint Analysis Report

**Generated:** 2025-12-20
**Package:** `@synkio/cli`
**Status:** Quick wins completed, refactoring items documented

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Quick Wins Fixed | 62+ | ✅ Complete |
| Refactoring Required | 12 | 📋 Documented |
| Build | Passing | ✅ |
| Tests | 129/129 | ✅ |

---

## Phase 1: Core Comparison Module

### File: `src/core/compare.ts`

#### Fixed (Quick Wins)
| Rule | Description | Fix Applied |
|------|-------------|-------------|
| S1128 | 11 unused imports | Removed unused type imports |
| S6606 | Nullish coalescing suggestion | Changed `if (!x) x = {}` to `x ??= {}` |

#### Requires Refactoring
| Rule | Location | Complexity | Description |
|------|----------|------------|-------------|
| S3776 | `compareBaselines()` | 146 | Cognitive complexity far exceeds threshold of 15 |
| S3776 | `hasBreakingChanges()` | 25 | Cognitive complexity exceeds threshold |
| S3776 | `printDiffSummary()` | 23 | Cognitive complexity exceeds threshold |
| S3776 | `generateDiffReport()` | 16 | Cognitive complexity slightly exceeds threshold |

**Refactoring Recommendation:**
Extract comparison logic into smaller, focused functions:
- `compareVariables()` - Handle variable-level comparisons
- `compareModes()` - Handle mode-level comparisons
- `compareCollections()` - Handle collection-level comparisons
- `detectRenames()` - Separate rename detection logic

---

## Phase 2: Core Modules

### File: `src/core/baseline.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Changed `'fs/promises'` → `'node:fs/promises'` |
| S7772 | Changed `'path'` → `'node:path'` |
| S2486 | Changed `catch (error)` → `catch {}` for intentionally ignored errors |

---

### File: `src/core/config.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Changed `'fs/promises'` → `'node:fs/promises'` |
| S7772 | Changed `'path'` → `'node:path'` |
| S2486 | Empty catch blocks updated |

---

### File: `src/core/figma.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Node.js built-in module prefixes |
| S2933 | Added `readonly` to class members |

---

### File: `src/core/figma-native.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Node.js built-in module prefixes |
| S4325 | Removed unnecessary type assertion at line 104 |

#### Requires Refactoring
| Rule | Location | Complexity | Description |
|------|----------|------------|-------------|
| S3776 | `parseFigmaNativeFiles()` | 16 | Cognitive complexity slightly exceeds threshold |

---

### File: `src/core/intermediate-tokens.ts`

#### Requires Refactoring
| Rule | Location | Complexity | Description |
|------|----------|------------|-------------|
| S3776 | `baselineToIntermediate()` | 19 | Cognitive complexity exceeds threshold |

**Refactoring Recommendation:**
Split token transformation into type-specific handlers:
- `transformColorToken()`
- `transformDimensionToken()`
- `transformTypographyToken()`

---

### File: `src/core/tokens.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Node.js built-in module prefixes |
| S4323 | Created `StyleType` alias for repeated `'paint' | 'text' | 'effect'` union |
| S4325 | Removed unnecessary type assertion (entry.type already typed) |
| S7773 | Used `Number.parseInt()` instead of `parseInt()` |
| S7787 | Used `.at(-1)` instead of `[length-1]` |
| S7746 | Used `localeCompare()` for string sorting |

#### Requires Refactoring
| Rule | Location | Complexity | Description |
|------|----------|------------|-------------|
| S3776 | `splitTokens()` | 61 | Cognitive complexity far exceeds threshold |
| S3776 | `normalizePluginData()` | 22 | Cognitive complexity exceeds threshold |

**Refactoring Recommendation:**
`splitTokens()` should be decomposed into:
- `determineFileKey()` - Calculate output file key
- `buildNestedPath()` - Construct nested token path
- `resolveTokenValue()` - Handle reference resolution
- `buildTokenObject()` - Construct DTCG token object

---

### File: `src/core/output.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Node.js built-in module prefixes |
| S2486 | Empty catch blocks |

---

## Phase 3: CSS Module

### File: `src/core/css/index.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7778 | Consolidated multiple `push()` calls using spread operator |
| S7781 | Changed `replace()` → `replaceAll()` for global replacements |
| S7773 | Changed `parseFloat()` → `Number.parseFloat()` |
| S7773 | Changed `isNaN()` → `Number.isNaN()` |
| S5850 | Added regex grouping for explicit precedence |
| S7735 | Simplified negated condition with `??` |

#### Requires Refactoring
| Rule | Location | Complexity | Description |
|------|----------|------------|-------------|
| S3776 | `transformDimension()` | 16 | Cognitive complexity slightly exceeds threshold |

---

## Phase 4: Documentation Generator

### File: `src/core/docs/index.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Changed `'fs/promises'` → `'node:fs/promises'` |
| S7772 | Changed `'path'` → `'node:path'` |
| S7781 | Changed `replace()` → `replaceAll()` |
| S7735 | Flipped negated condition for clarity |
| S6353 | Used `\W` instead of `[^a-zA-Z0-9_]` |
| S1854 | Removed useless assignment (unused `key` variable) |
| S2486 | Changed `catch (error)` → `catch {}` |

---

### File: `src/core/docs/html-generator.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7763 | Changed to `type` import + `export type { ... } from` re-export pattern |

#### Requires Refactoring
| Rule | Location | Description |
|------|----------|-------------|
| S3776 | `generateIndexHTML()` | Cognitive complexity 16 |
| S3358 | Lines 103, 118, 124, 138, 144, 148 | Nested ternary operations |

**Refactoring Recommendation:**
Extract nested ternaries into helper functions:
- `renderMetadataCard()`
- `renderOutputFormatCard()`
- `renderCssOutputCard()`

---

## Phase 5: CLI Commands

### File: `src/cli/bin.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Changed `'module'` → `'node:module'` |
| S7773 | Changed `parseInt()` → `Number.parseInt()` |
| S1119 | Added braces around case blocks with lexical declarations |

---

### File: `src/cli/commands/sync.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Node.js built-in module prefixes |
| S4removal | Changed array to Set for `.has()` instead of `.includes()` |
| S7735 | Flipped negated conditions |
| S template | Extracted nested template literals to variables |

#### Requires Refactoring
| Rule | Location | Complexity | Description |
|------|----------|------------|-------------|
| S3776 | `syncCommand()` | 336 | Extremely high cognitive complexity |

**Refactoring Recommendation:**
This is the highest priority refactoring. Decompose into:
- `fetchAndNormalizeTokens()` - Figma API + normalization
- `compareAndValidate()` - Baseline comparison + breaking change detection
- `generateOutputFiles()` - Token file generation
- `runBuildPipeline()` - Build script execution
- `generateReports()` - Report generation

---

### File: `src/cli/commands/import.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Node.js built-in module prefixes |

#### Requires Refactoring
| Rule | Location | Complexity | Description |
|------|----------|------------|-------------|
| S3776 | `importCommand()` | 85 | Cognitive complexity far exceeds threshold |

---

### File: `src/cli/commands/init.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Node.js built-in module prefixes |
| S regex | Changed `String.match()` → `RegExp.exec()` |

---

### File: `src/cli/commands/rollback.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Node.js built-in module prefixes |

---

### File: `src/cli/commands/docs.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Node.js built-in module prefixes |

---

### File: `src/cli/utils.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Changed `'readline'` → `'node:readline'` |

---

## Phase 6: Utilities & Test Infrastructure

### File: `src/utils/logger.ts`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S2933 | Added `readonly` to `silent` class member |
| S1186 | Added comments to intentionally empty methods in `SilentLogger` |

---

### File: `test-utils/mock-figma-server.cjs`

#### Fixed (Quick Wins)
| Rule | Fix Applied |
|------|-------------|
| S7772 | Changed `'http'` → `'node:http'` |
| S7772 | Changed `'fs'` → `'node:fs'` |
| S7772 | Changed `'path'` → `'node:path'` |

---

### Test Files

#### Fixed (Quick Wins)
| File | Fix Applied |
|------|-------------|
| `sync.test.ts` | Node.js prefixes, removed unused imports |
| `init.test.ts` | Fixed TypeScript error (accessing type as runtime value) |
| `integration.test.ts` | Node.js prefixes |
| `config.test.ts` | Node.js prefixes |

---

## Refactoring Priority Matrix

| Priority | File | Function | Complexity | Impact |
|----------|------|----------|------------|--------|
| 🔴 Critical | sync.ts | `syncCommand()` | 336 | Core sync flow |
| 🔴 Critical | compare.ts | `compareBaselines()` | 146 | Core comparison logic |
| 🟠 High | import.ts | `importCommand()` | 85 | Import flow |
| 🟠 High | tokens.ts | `splitTokens()` | 61 | Token output generation |
| 🟡 Medium | compare.ts | `hasBreakingChanges()` | 25 | Breaking change detection |
| 🟡 Medium | compare.ts | `printDiffSummary()` | 23 | Diff display |
| 🟡 Medium | tokens.ts | `normalizePluginData()` | 22 | Plugin data normalization |
| 🟢 Low | intermediate-tokens.ts | `baselineToIntermediate()` | 19 | Intermediate format |
| 🟢 Low | figma-native.ts | `parseFigmaNativeFiles()` | 16 | Native export parsing |
| 🟢 Low | css/index.ts | `transformDimension()` | 16 | CSS dimension transform |
| 🟢 Low | html-generator.ts | `generateIndexHTML()` | 16 | Docs index page |
| 🟢 Low | compare.ts | `generateDiffReport()` | 16 | Report generation |

---

## Rule Reference

| Rule ID | Name | Category |
|---------|------|----------|
| S1128 | Unused imports | Code Smell |
| S1186 | Empty function body | Code Smell |
| S1854 | Useless assignment | Bug |
| S2486 | Empty catch block | Code Smell |
| S2933 | Non-readonly field | Code Smell |
| S3358 | Nested ternary | Code Smell |
| S3776 | Cognitive Complexity | Code Smell |
| S4323 | Repeated union type | Code Smell |
| S4325 | Unnecessary assertion | Code Smell |
| S5850 | Regex precedence | Code Smell |
| S6353 | Regex shorthand | Code Smell |
| S6606 | Nullish coalescing | Code Smell |
| S7735 | Negated condition | Code Smell |
| S7763 | Re-export pattern | Code Smell |
| S7772 | Node.js built-in prefix | Code Smell |
| S7773 | Number static methods | Code Smell |
| S7778 | Multiple array push | Code Smell |
| S7781 | String replaceAll | Code Smell |
| S7787 | Array at() method | Code Smell |

---

## Why `node:` Prefix?

The `node:` prefix for built-in modules (e.g., `node:fs`, `node:path`) is recommended for:

1. **Security**: Prevents supply-chain attacks where a malicious npm package uses the same name as a built-in module
2. **Clarity**: Makes intent explicit - this is a Node.js built-in, not an npm package
3. **Performance**: Slightly faster module resolution (Node.js knows to skip npm lookup)

Supported in Node.js 16+ and required for some newer built-in modules.

---

## Next Steps

1. **Immediate**: All quick wins are complete. Build passes, all 129 tests pass.
2. **Short-term**: Refactor `syncCommand()` - highest complexity, core functionality
3. **Medium-term**: Refactor `compareBaselines()` and `importCommand()`
4. **Long-term**: Address remaining complexity issues in order of priority
