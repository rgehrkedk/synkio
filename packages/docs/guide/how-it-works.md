# How It Works

Synkio uses a unique approach to sync Figma variables without requiring Enterprise access.

## The Challenge

Figma's [Variables REST API](https://www.figma.com/developers/api#variables) is only available on Enterprise plans. This means teams on Professional or other plans can't programmatically access their design tokens.

## Synkio's Solution

Synkio works around this limitation by using:

1. **`sharedPluginData`** — A Figma API that's available on all plans
2. **A Figma plugin** — Reads variables and writes them to `sharedPluginData`
3. **The standard Files API** — Reads the plugin data from your file

```
Variables → Plugin → sharedPluginData → Files API → CLI → Token Files
```

## The Baseline System

Synkio maintains a `baseline.json` file that stores the normalized state of your tokens. This enables:

### 1. Intelligent Diffing

Every Figma variable has a permanent ID (like `VariableID:123:456`). When a variable is renamed, its ID stays the same. Synkio uses these IDs to detect:

- **Renamed tokens** — Same ID, different path
- **Deleted tokens** — ID no longer exists
- **New tokens** — New ID added

### 2. Breaking Change Detection

When pulling changes, Synkio reports changes that could break your code:

```
Breaking changes detected:

  Path changes: 1
    colors.primary -> colors.brand.primary

  Deleted variables: 2
    colors.accent
    spacing.small
```

### 3. Offline Builds

The `build` command works entirely from `baseline.json` — no Figma API calls needed. This enables:

- CI/CD builds without Figma credentials
- Faster iteration during development
- Git-based version control of token state

## Pull vs Build

Synkio separates fetching and file generation:

### `synkio pull`

- Fetches data from Figma API
- Compares with existing baseline
- Reports changes and breaking changes
- Updates `baseline.json`

### `synkio build`

- Reads `baseline.json` (no API calls)
- Splits tokens per your config
- Writes token files
- Generates CSS if enabled
- Runs custom build scripts

This separation means you can:

- Pull frequently to check for changes
- Build only when ready to commit
- Review changes before building
- Run builds offline in CI

## File Structure

After running Synkio, your project will have:

```
your-project/
├── synkio/
│   ├── baseline.json      # Token state from Figma
│   ├── baseline.prev.json # Previous state for rollback
│   └── reports/           # Markdown diff reports
├── tokens/                # Generated token files
│   ├── theme.light.json
│   ├── theme.dark.json
│   └── primitives.json
└── synkio.config.json     # Configuration
```

## Token Format

Synkio outputs [DTCG format](https://design-tokens.github.io/community-group/format/) by default:

```json
{
  "colors": {
    "primary": {
      "$value": "#0066cc",
      "$type": "color"
    },
    "secondary": {
      "$value": "{colors.primary}",
      "$type": "color"
    }
  }
}
```

- `$value` — The token value (or alias reference)
- `$type` — The token type (color, dimension, etc.)
- `$description` — Optional description from Figma
- `$extensions` — Additional metadata (scopes, variable IDs)
