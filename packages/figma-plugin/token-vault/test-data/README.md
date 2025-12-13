# Test Data for Token Vault Plugin

This directory contains sample JSON token files for testing the Token Vault Figma plugin.

## Files Overview

### 1. `01-simple-colors.json` - Basic Colors
**Use case:** Testing basic color import without complexity
**Features:**
- Flat structure with 6 color tokens
- No aliases
- No nesting
- Perfect for first-time users

**Import as:** Single-mode collection named "Simple Colors"

---

### 2. `02-with-aliases.json` - Alias References
**Use case:** Testing two-pass alias resolution
**Features:**
- Nested structure (brand → semantic)
- Alias references using `{path.to.token}` syntax
- Chain aliases (link → primary → blue)
- Tests the critical alias resolver

**Import as:** Single-mode collection named "Design System"

**Expected behavior:**
- Pass 1: Create all variables with default values
- Pass 2: Resolve aliases to VARIABLE_ALIAS references

---

### 3. `03-spacing-dimensions.json` - Spacing & Dimensions
**Use case:** Testing dimension type inference and parsing
**Features:**
- Spacing scale (4px to 32px)
- Border radius scale
- Tests dimension parsing with "px" units
- Tests type inference from path ("spacing", "borderRadius")

**Import as:** Single-mode collection named "Spacing"

---

### 4. `04-typography.json` - Typography Tokens
**Use case:** Testing mixed types (dimensions + numbers)
**Features:**
- Font sizes (dimension type)
- Font weights (number type)
- Line heights (number type, unitless)
- Tests multiple token types in one file

**Import as:** Single-mode collection named "Typography"

---

### 5. `05-multi-mode-light.json` + `06-multi-mode-dark.json` - Multi-Mode Collection
**Use case:** Testing multi-mode collections (theme switching)
**Features:**
- Identical structure in both files
- Different values for light vs dark theme
- Nested color organization (background, text, border)
- Tests mode-based variable creation

**Import as:** Multi-mode collection named "Theme"
- Assign `05-multi-mode-light.json` to "light" mode
- Assign `06-multi-mode-dark.json` to "dark" mode

**Expected behavior:**
- Creates one collection with two modes
- Same variables exist in both modes with different values

---

## Testing Scenarios

### Scenario 1: Single-Mode Import
1. Upload `01-simple-colors.json`
2. Create collection "Colors"
3. Do NOT check "Each file is a mode"
4. Import

**Expected:**
- 1 collection with 1 mode
- 6 color variables
- All visible in Figma Variables panel

---

### Scenario 2: Alias Resolution
1. Upload `02-with-aliases.json`
2. Create collection "Design System"
3. Import

**Expected:**
- 5 color variables created
- `semantic/primary` references `brand/blue` (VARIABLE_ALIAS)
- `semantic/link` references `semantic/primary` (VARIABLE_ALIAS)
- No errors about missing references

---

### Scenario 3: Multi-Mode Import
1. Upload both `05-multi-mode-light.json` AND `06-multi-mode-dark.json`
2. Create collection "Theme"
3. CHECK "Each file is a mode"
4. Assign light.json to mode "light"
5. Assign dark.json to mode "dark"
6. Import

**Expected:**
- 1 collection with 2 modes: "light" and "dark"
- 9 color variables (background x3, text x3, border x2)
- Each variable has different values per mode
- Switching modes in Figma shows different colors

---

### Scenario 4: Mixed Types
1. Upload `04-typography.json`
2. Create collection "Typography"
3. Import

**Expected:**
- Font sizes created as FLOAT variables
- Font weights created as FLOAT variables
- Line heights created as FLOAT variables
- Type inference correctly identifies dimension vs number types

---

### Scenario 5: Bulk Import
1. Upload ALL 6 files at once
2. Create 4 collections:
   - "Colors" → `01-simple-colors.json`
   - "Design System" → `02-with-aliases.json`
   - "Spacing" → `03-spacing-dimensions.json`
   - "Typography" → `04-typography.json`
   - "Theme" (multi-mode) → `05` + `06`
3. Import

**Expected:**
- All 4 collections created
- ~30 total variables across all collections
- All aliases resolved correctly
- Multi-mode collection has 2 modes

---

## Edge Cases to Test

### Alias Chain
File: `02-with-aliases.json`
- `link` → `primary` → `blue`
- Tests: Multi-level alias resolution

### Nested Structure
File: `02-with-aliases.json`, `05`, `06`
- Tests: Path-based variable naming (`colors/background/primary`)

### Type Inference
File: `03-spacing-dimensions.json`
- Tests: Automatic type detection from path segments

### Value Parsing
File: `03-spacing-dimensions.json`
- Tests: Parsing "4px" → 4 (strip units)
- Tests: Parsing "9999px" for full border radius

### Font Weight Parsing
File: `04-typography.json`
- Tests: "400" → Regular weight mapping

---

## Common Issues & Solutions

### Issue: Aliases not resolving
**Solution:** Ensure alias path matches token structure exactly
- Use `/` separators: `{colors/brand/blue}`
- OR use `.` separators: `{colors.brand.blue}`
- Both formats supported

### Issue: Variables not appearing in Figma
**Solution:** Check Figma Variables panel (right sidebar)
- Variables grouped by collection
- Use search to find specific variables

### Issue: Mode switching not working
**Solution:** Ensure both mode files have IDENTICAL structure
- Same nested paths
- Same token names
- Only values should differ

---

## File Format Notes

All files use **legacy token format**:
```json
{
  "tokenName": {
    "value": "#0066cc",
    "type": "color"
  }
}
```

**W3C format** also supported:
```json
{
  "tokenName": {
    "$value": "#0066cc",
    "$type": "color"
  }
}
```

Both formats work identically in the plugin.

---

## Testing Checklist

- [ ] Import simple colors (file 01)
- [ ] Import with aliases (file 02)
- [ ] Import spacing (file 03)
- [ ] Import typography (file 04)
- [ ] Import multi-mode light+dark (files 05+06)
- [ ] Export all collections to JSON
- [ ] Sync all collections to registry node
- [ ] Verify aliases work in Figma
- [ ] Switch between light/dark modes
- [ ] Delete and re-import (should update existing)

---

**Created for Token Vault Plugin Testing**
**Version:** 2.0.0
**Last Updated:** December 2024
