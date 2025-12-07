# Known Issues & Limitations

## 1. Multi-value Token References

**Issue:** Tokens with multiple alias references like `"{space.1} {space.3}"` cannot be resolved as Figma Variable aliases.

**Example:**
```json
{
  "padding": {
    "sm": { "value": "{space.1} {space.3}", "type": "spacing" }
  }
}
```

**Current behavior:** These are imported as STRING types with the literal value `"{space.1} {space.3}"`.

**Workaround:** Split into separate tokens:
```json
{
  "padding": {
    "sm": {
      "x": { "value": "{space.1}", "type": "spacing" },
      "y": { "value": "{space.3}", "type": "spacing" }
    }
  }
}
```

## 2. CSS Variable References (Token Error)

**Issue:** Some token files contain CSS variable references instead of proper token aliases.

**Example (WRONG):**
```json
{
  "border": {
    "input-color": { "value": "var(--border-default)", "type": "string" }
  }
}
```

**Should be:**
```json
{
  "border": {
    "input-color": { "value": "{border.default}", "type": "color" }
  }
}
```

**Files affected:**
- `tokens/brands/*.json` - Several border and color tokens use `var(--...)` syntax

**Impact:**
- Type mismatch errors when trying to create aliases
- Tokens imported as STRING instead of COLOR

**Fix:** Update JSON files to use proper token references:
- Replace `"var(--border-default)"` with `"{border.default}"`
- Update type from `"string"` to `"color"` where appropriate

## 3. Token Type Mismatches

**Issue:** Some tokens reference different types (STRING trying to alias COLOR).

**Example:**
```json
{
  "border": {
    "input-color": { "value": "{brand.accent.default}", "type": "string" }
  }
}
```

When `brand.accent.default` is type `color`, but `border.input-color` is declared as `string`.

**Solution:** Ensure consistent types throughout token chain.

## 4. Dimension Token Units

**Issue:** Figma Variables FLOAT type doesn't preserve units.

**Example:**
```json
{ "value": "0.5rem", "type": "dimension" }
```

Is imported as `0.5` (number only, no "rem").

**Workaround:** Keep unit information in token descriptions or separate metadata.

## 5. Tokens Not Found in Primitives

**Missing tokens reported:**
- `radius/xs` - EXISTS in radii.json
- `radius/2xl` - EXISTS in radii.json
- `space/0-5` - EXISTS in spacing.json (note: hyphenated name)

**Cause:** These should all be found. If errors persist, check:
1. Primitives collection was imported first
2. All primitive files were selected in "Clarity Preset"
3. Token paths match exactly (case-sensitive, use `/` not `.`)

## Recommendations

### For Clean Import:

1. **Fix CSS variable references** in brand token files
2. **Split multi-value tokens** into separate x/y or individual tokens
3. **Ensure type consistency** across alias chains
4. **Use token references** (`{path.to.token}`) not CSS variables (`var(--name)`)

### Example Clean Token:

```json
{
  "brand": {
    "primary": {
      "default": { "value": "{color.blue.500}", "type": "color" },
      "hover": { "value": "{color.blue.600}", "type": "color" }
    },
    "spacing": {
      "button-x": { "value": "{space.4}", "type": "dimension" },
      "button-y": { "value": "{space.2}", "type": "dimension" }
    }
  }
}
```
