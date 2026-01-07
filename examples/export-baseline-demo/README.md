# Export Baseline Demo

This example demonstrates the **Code → Figma** workflow using Synkio's `export-baseline` command with **multi-mode design tokens**.

## Overview

This directory contains handcrafted DTCG token files organized into two collections:
- **Primitives**: Base design tokens (colors, spacing) without modes
- **Semantic**: Contextual tokens with Light and Dark modes

## Token Structure

```
tokens/
├── primitives/
│   └── primitives.json       # Base colors and spacing (32 tokens)
└── semantic/
    ├── semantic.light.json   # Light mode semantic tokens (16 tokens)
    └── semantic.dark.json    # Dark mode semantic tokens (16 tokens)
```

### Primitives Collection (Single Mode)

**Brand Colors** (`brand.*`)
- Blue scale: 500, 600, 700
- Green scale: 500, 600
- Orange scale: 500, 600
- Red scale: 500, 600

**Neutral Scale** (`neutral.*`)
- 12-step grayscale from white (0) to black (1000)

**Spacing Scale** (`spacing.*`)
- 11 spacing values: 0px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px

### Semantic Collection (Light + Dark Modes)

**Background Colors** (`color.background.*`)
- Primary, secondary, tertiary
- Light mode: White to light grays
- Dark mode: Dark grays to black

**Text Colors** (`color.text.*`)
- Primary, secondary, tertiary, inverse
- Light mode: Dark text on light backgrounds
- Dark mode: Light text on dark backgrounds

**Border Colors** (`color.border.*`)
- Default, strong, subtle
- Context-aware for each theme

**Brand Colors** (`color.brand.*`)
- Primary (blue), secondary (green)
- Same across both modes

**Status Colors** (`color.status.*`)
- Success, warning, error, info
- Same across both modes

## Configuration

The `synkio.config.json` defines two collections with different split strategies:

```json
{
  "collections": {
    "Primitives": {
      "dir": "tokens/primitives",
      "splitBy": "none"          // Single file, single mode
    },
    "Semantic": {
      "dir": "tokens/semantic",
      "splitBy": "mode"          // Multiple files, one per mode
    }
  }
}
```

## Usage

### Step 1: Generate Baseline Export

Run the `export-baseline` command from this directory:

```bash
cd examples/export-baseline-demo
npx synkio export-baseline --verbose
```

**Output:**
```
✔ Baseline exported successfully!

  Output: .synkio/export-baseline.json
  Tokens: 64
  Collections: Primitives, Semantic
```

### Step 2: Import into Figma

1. Open your Figma file
2. Install and run the **Synkio UI** plugin
3. Click **Import Baseline**
4. Select `.synkio/export-baseline.json`
5. Review the diff showing:
   - **Primitives** collection with 32 tokens (1 mode: "value")
   - **Semantic** collection with 32 tokens (2 modes: "light" and "dark")
6. Click **Apply to Figma**

The plugin will create two variable collections in Figma with all your tokens!

### Step 3: Sync Back (Optional)

After importing to Figma:

1. Update `synkio.config.json` with your actual Figma file key
2. Set your `FIGMA_TOKEN` environment variable
3. Run `npx synkio pull && npx synkio build` to enable bi-directional syncing

## Expected Output

The baseline export contains:

### Primitives Collection
- **Mode**: `value` (single mode)
- **Tokens**: 32
  - Brand colors: 8
  - Neutral scale: 12
  - Spacing: 11
  - 1 zero value

### Semantic Collection
- **Modes**: `light`, `dark` (multi-mode)
- **Tokens per mode**: 16
  - Background: 3
  - Text: 4
  - Border: 3
  - Brand: 2
  - Status: 4

**Total**: 64 tokens across 2 collections

## Key Features Demonstrated

✅ **Multi-collection setup** - Separate primitives and semantic tokens
✅ **Multi-mode tokens** - Light and dark theme variations
✅ **Dimension normalization** - `"16px"` → `16` for Figma compatibility
✅ **DTCG format** - Standards-compliant `$type` and `$value`
✅ **Code-first workflow** - Start with JSON, end up in Figma

## Notes

- The `.env` file contains a placeholder FIGMA_TOKEN (required for config validation)
- The `figmaFileKey` is a placeholder since we're starting from code
- After importing to Figma, replace both with actual values for syncing
- The export command automatically detects modes from filenames (`.light.json`, `.dark.json`)
- Semantic tokens use the same token paths in both modes, allowing Figma to switch themes seamlessly
