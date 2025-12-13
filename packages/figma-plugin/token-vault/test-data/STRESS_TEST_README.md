# Stress Test Data for Token Vault Plugin

Advanced test files designed to push the plugin to its limits and test edge cases.

## Files Overview

### 07-complex-aliases-chain.json (Multi-Level Alias Chains)
**Purpose:** Test deep alias resolution with multiple levels of indirection
**Token Count:** ~25 tokens
**Complexity:** HIGH

**Features:**
- 3-4 level deep alias chains
- `button.primaryHover` → `ui.link.hover` → `semantic.primaryDark` → `base.blue.900`
- Tests alias resolution across semantic layers (base → semantic → ui → component)
- Nested color scales (blue.50, blue.100, etc.)

**Edge Cases Tested:**
- ✅ Multi-level alias chains (4 levels deep)
- ✅ Cross-category references
- ✅ Nested token groups
- ✅ Scale-based naming (50, 100, 500, 900)

**Expected Behavior:**
- All aliases should resolve correctly in pass 2
- No "alias target not found" errors
- Final values should trace back to base colors

---

### 08-deep-nesting.json (Extreme Nesting Depth)
**Purpose:** Test parser with deeply nested JSON structure
**Token Count:** ~40 tokens
**Complexity:** VERY HIGH

**Features:**
- 7-8 levels of nesting: `design.system.typography.font.size.heading.h1`
- Tests path generation for very long token names
- Multiple categories at deep levels (brand, layout, typography)

**Edge Cases Tested:**
- ✅ Deep nesting (up to 8 levels)
- ✅ Long variable names in Figma
- ✅ Path separator handling
- ✅ Numeric keys in nested structure ("0", "1", "2")

**Expected Behavior:**
- All tokens should be created despite depth
- Variable names should be readable: `design/system/typography/font/size/heading/h1`
- No path length issues

**Potential Issues:**
- Figma might have variable name length limits
- Very long paths might be hard to read in UI

---

### 09-large-scale-100-tokens.json (Volume Test)
**Purpose:** Test performance with large number of tokens
**Token Count:** 100 color tokens (10 color scales × 10 shades each)
**Complexity:** MEDIUM (structure is simple, volume is high)

**Features:**
- Tailwind-inspired color palette
- 10 color families (gray, blue, red, green, yellow, purple, pink, orange, teal, indigo)
- 10 shades per color (50-900)
- All tokens are simple (no aliases)

**Edge Cases Tested:**
- ✅ Large batch import (100 tokens at once)
- ✅ Import performance
- ✅ Variable collection organization
- ✅ Figma Variables panel performance with many tokens

**Expected Behavior:**
- Import completes in < 10 seconds
- All 100 variables created
- No memory issues
- Figma Variables panel remains responsive

**Performance Benchmarks:**
- Import time: Should be < 5 seconds
- Figma UI lag: Should be minimal
- Export size: ~8-10KB JSON

---

### 10-circular-reference-test.json (Circular Dependencies)
**Purpose:** Test error handling for circular alias references
**Token Count:** ~15 tokens
**Complexity:** HIGH (intentionally broken)

**Features:**
- Intentional circular references
- `actionHover` → `actionFocus` → `action` → `actionHover` (cycle!)
- `button.backgroundHover` ↔ `button.backgroundFocus` (mutual reference)
- Mixed with valid aliases

**Edge Cases Tested:**
- ❌ Circular alias chains (should fail gracefully)
- ✅ Error reporting for circular references
- ✅ Partial import (valid tokens succeed, invalid fail)

**Expected Behavior:**
- Import should complete for non-circular tokens
- Circular references should be detected
- Warning/error shown for unresolved aliases
- Plugin should NOT crash
- Console should show: "Alias target not found" for circular refs

**Success Criteria:**
- No infinite loops
- No plugin crash
- Clear error messages
- Valid tokens (base.primary, base.secondary, base.sm) import successfully

---

### 11-mixed-formats-w3c.json (Format Compatibility)
**Purpose:** Test mixing W3C and legacy token formats in same file
**Token Count:** ~12 tokens
**Complexity:** MEDIUM

**Features:**
- W3C format: `$value`, `$type`, `$description`
- Legacy format: `value`, `type`, `description`
- Mixed in same file, even same category
- Aliases across formats

**Edge Cases Tested:**
- ✅ W3C format support (`$value`, `$type`)
- ✅ Legacy format support (`value`, `type`)
- ✅ Mixed formats in same file
- ✅ Aliases across format boundaries
- ✅ Description field handling

**Expected Behavior:**
- Both formats should work identically
- Normalization should convert both to internal format
- Aliases should work regardless of source format
- Descriptions should be preserved (if supported)

---

### 12-special-characters.json (Edge Case Naming)
**Purpose:** Test token name parsing with special characters
**Token Count:** ~18 tokens
**Complexity:** LOW (structure simple, names complex)

**Features:**
- Dashes: `with-dashes`
- Underscores: `with_underscores`
- Dots: `with.dots` (potential path conflict!)
- Dollar signs: `with$dollar`
- Spaces: `with numbers 123`
- Different cases: UPPERCASE, camelCase, PascalCase, kebab-case, snake_case
- Size suffixes: `2xs`, `2xl`, `3xl`

**Edge Cases Tested:**
- ✅ Special characters in token names
- ⚠️ Dots in names (could conflict with path separators)
- ✅ Spaces in names
- ✅ Case sensitivity
- ✅ Numeric prefixes/suffixes

**Expected Behavior:**
- Most special characters should work
- Dots in names might need special handling
- Variable names should be sanitized if needed
- All tokens should import (possibly with name normalization)

**Potential Issues:**
- `with.dots` might be interpreted as nested path
- Spaces might need to be converted to underscores
- Figma might not allow certain characters

---

## Stress Test Scenarios

### Scenario 1: Alias Chain Torture Test
**Files:** `07-complex-aliases-chain.json`
**Steps:**
1. Import the file
2. Check console for alias resolution
3. Verify all aliases resolved (look for warnings)
4. Check `button.primaryHover` traces back to correct color

**Success Criteria:**
- ✅ All aliases resolve correctly
- ✅ No circular reference errors
- ✅ 4-level deep chains work

---

### Scenario 2: Deep Nesting Limit Test
**Files:** `08-deep-nesting.json`
**Steps:**
1. Import the file
2. Check variable names in Figma
3. Verify all ~40 tokens created
4. Test if you can find `design/system/typography/font/size/heading/h1`

**Success Criteria:**
- ✅ All deeply nested tokens import
- ✅ Variable names are readable (not truncated)
- ✅ No path parsing errors

---

### Scenario 3: Volume Performance Test
**Files:** `09-large-scale-100-tokens.json`
**Steps:**
1. Start timer
2. Import the file
3. Note import time
4. Check Figma Variables panel responsiveness
5. Try to export back to JSON

**Success Criteria:**
- ✅ Import completes in < 10 seconds
- ✅ All 100 variables created
- ✅ Figma UI remains responsive
- ✅ Export works without issues

**Performance Benchmarks:**
- Expected import time: 3-5 seconds
- Expected export time: 1-2 seconds

---

### Scenario 4: Circular Reference Handling
**Files:** `10-circular-reference-test.json`
**Steps:**
1. Import the file
2. Watch console for errors
3. Check which tokens succeeded
4. Verify error messages are clear

**Success Criteria:**
- ✅ Plugin doesn't crash
- ✅ Valid tokens import successfully
- ✅ Clear error messages for circular refs
- ✅ Console shows "Alias target not found" warnings

**Expected Warnings:**
```
Alias target not found: colors/semantic/actionFocus (referenced by colors/semantic/actionHover)
Alias target not found: colors/semantic/action (referenced by colors/semantic/actionFocus)
Alias target not found: colors/component/button/backgroundFocus (referenced by colors/component/button/backgroundHover)
Alias target not found: colors/component/button/backgroundHover (referenced by colors/component/button/backgroundFocus)
```

---

### Scenario 5: Format Compatibility Test
**Files:** `11-mixed-formats-w3c.json`
**Steps:**
1. Import the file
2. Verify both W3C and legacy tokens work
3. Check if alias from W3C → legacy works
4. Export and check output format

**Success Criteria:**
- ✅ W3C tokens ($value) import correctly
- ✅ Legacy tokens (value) import correctly
- ✅ Aliases work across formats
- ✅ Export normalizes to single format

---

### Scenario 6: Special Character Handling
**Files:** `12-special-characters.json`
**Steps:**
1. Import the file
2. Check variable names in Figma
3. Look for any name sanitization
4. Verify all tokens created

**Success Criteria:**
- ✅ Most special characters preserved
- ✅ Problematic characters sanitized (if needed)
- ✅ All tokens created with valid names
- ⚠️ `with.dots` might need special handling

**Expected Sanitization:**
- Spaces → underscores (maybe)
- Dots → slashes (maybe)
- Dollar signs → preserved or removed

---

## Combined Stress Test (Ultimate Test)

**Scenario:** Import ALL stress test files at once

**Files:**
- 07-complex-aliases-chain.json
- 08-deep-nesting.json
- 09-large-scale-100-tokens.json
- 11-mixed-formats-w3c.json
- 12-special-characters.json
- Skip: 10-circular-reference-test.json (will error)

**Steps:**
1. Upload all 5 files
2. Create 5 separate collections
3. Import all at once
4. Check total variable count (~200 variables)
5. Export all collections
6. Sync all collections to node

**Success Criteria:**
- ✅ All ~200 variables created
- ✅ Import completes in < 30 seconds
- ✅ No crashes
- ✅ Export works
- ✅ Sync works with chunking
- ✅ Registry node contains all data

---

## Known Issues to Watch For

### Issue 1: Circular References
**File:** 10-circular-reference-test.json
**Expected:** Warnings, partial success
**Fix:** Not a bug - by design, circular refs should fail

### Issue 2: Dots in Token Names
**File:** 12-special-characters.json → `with.dots`
**Potential Issue:** Might be interpreted as `with/dots`
**Watch For:** Variable name mismatch

### Issue 3: Deep Nesting Path Length
**File:** 08-deep-nesting.json
**Potential Issue:** Figma variable name length limit
**Watch For:** Truncated variable names

### Issue 4: Large Dataset Memory
**File:** 09-large-scale-100-tokens.json
**Potential Issue:** Memory usage with 100+ variables
**Watch For:** Slow import, Figma lag

---

## Performance Baselines

| Test | Expected Time | Max Acceptable Time |
|------|---------------|---------------------|
| 07 - Complex Aliases | 1-2s | 5s |
| 08 - Deep Nesting | 2-3s | 8s |
| 09 - 100 Tokens | 3-5s | 10s |
| 10 - Circular Refs | 1-2s + warnings | 5s |
| 11 - Mixed Formats | 1s | 3s |
| 12 - Special Chars | 1s | 3s |
| **All Combined** | 10-15s | 30s |

---

## Checklist

- [ ] Test 07: Complex alias chains resolve correctly
- [ ] Test 08: Deep nesting doesn't break parser
- [ ] Test 09: 100 tokens import in reasonable time
- [ ] Test 10: Circular refs handled gracefully (warnings, no crash)
- [ ] Test 11: W3C and legacy formats both work
- [ ] Test 12: Special characters handled correctly
- [ ] Combined test: All files import together
- [ ] Export all collections to JSON
- [ ] Sync all to registry node
- [ ] Verify chunking with large dataset

---

**Created for Token Vault Plugin Stress Testing**
**Last Updated:** December 2024
