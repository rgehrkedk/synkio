# Configuration Reference

Complete reference for all Synkio configuration options.

## Overview

Synkio is configured via `synkio.config.json` in your project root.

> **Note:** Legacy `tokensrc.json` files are still supported but deprecated. You'll see a warning when using the old filename.

## Quick Start

Minimal configuration:

```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "ABC123xyz",
    "accessToken": "${FIGMA_TOKEN}"
  },
  "tokens": {
    "dir": "tokens"
  }
}
```

## Full Configuration Example

```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "ABC123xyz",
    "nodeId": "0:0",
    "accessToken": "${FIGMA_TOKEN}",
    "baseUrl": "https://api.figma.com/v1"
  },
  "tokens": {
    "dir": "tokens",
    "dtcg": true,
    "includeVariableId": false,
    "splitModes": true,
    "includeMode": false,
    "extensions": {
      "description": false,
      "scopes": false,
      "codeSyntax": false
    },
    "collections": {
      "colors": {
        "dir": "tokens/colors",
        "file": "colors",
        "splitModes": false
      },
      "theme": {
        "splitModes": true,
        "includeMode": true
      }
    }
  },
  "build": {
    "autoRun": false,
    "script": "npm run build:tokens",
    "css": {
      "enabled": true,
      "dir": "src/styles",
      "file": "tokens.css",
      "utilities": true,
      "utilitiesFile": "utilities.css",
      "transforms": {
        "useRem": true,
        "basePxFontSize": 16
      }
    }
  },
  "docsPages": {
    "enabled": true,
    "dir": ".synkio/docs",
    "title": "Design Tokens",
    "platforms": [
      {
        "name": "CSS",
        "prefix": "--",
        "case": "kebab"
      },
      {
        "name": "JavaScript",
        "case": "camel"
      }
    ]
  },
  "sync": {
    "report": true,
    "reportHistory": false
  },
  "import": {
    "dir": "figma-exports",
    "sources": {
      "theme": {
        "files": ["light.tokens.json", "dark.tokens.json"]
      },
      "primitives": {
        "dir": "figma-exports/foundation",
        "files": ["colors.json", "spacing.json"]
      }
    }
  }
}
```

---

## Configuration Sections

### `version` (required)

Config schema version. Currently only `"1.0.0"` is supported.

```json
{
  "version": "1.0.0"
}
```

---

## `figma` (required)

Figma connection settings.

```json
{
  "figma": {
    "fileId": "ABC123xyz",
    "nodeId": "0:0",
    "accessToken": "${FIGMA_TOKEN}",
    "baseUrl": "https://api.figma.com/v1"
  }
}
```

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `fileId` | string | Yes | - | Figma file ID from the URL |
| `nodeId` | string | No | `"0:0"` | Specific node to fetch (defaults to document root) |
| `accessToken` | string | Yes | - | Figma API token. Use `${FIGMA_TOKEN}` to read from `.env` |
| `baseUrl` | string | No | `https://api.figma.com/v1` | Custom API URL for Figma Enterprise |

### Finding Your File ID

From your Figma URL:

```
https://www.figma.com/design/ABC123xyz/My-Design-System
                            ^^^^^^^^^^
                            This is your fileId
```

### Using Environment Variables

The `${FIGMA_TOKEN}` placeholder is replaced with the `FIGMA_TOKEN` environment variable from your `.env` file:

```bash
# .env
FIGMA_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxx
```

Add `.env` to your `.gitignore` to keep your token secure.

### Figma Enterprise

For Figma Enterprise with custom domains:

```json
{
  "figma": {
    "fileId": "ABC123xyz",
    "accessToken": "${FIGMA_TOKEN}",
    "baseUrl": "https://api.figma.your-company.com/v1"
  }
}
```

---

## `tokens` (required)

Token output configuration.

```json
{
  "tokens": {
    "dir": "tokens",
    "dtcg": true,
    "includeVariableId": false,
    "splitModes": true,
    "includeMode": false,
    "extensions": {
      "description": false,
      "scopes": false,
      "codeSyntax": false
    },
    "collections": {}
  }
}
```

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `dir` | string | Yes | - | Output directory for token files |
| `dtcg` | boolean | No | `true` | Use DTCG format (`$value`, `$type`) vs legacy (`value`, `type`) |
| `includeVariableId` | boolean | No | `false` | Include Figma variable ID in `$extensions` |
| `splitModes` | boolean | No | `true` | Default for all collections: split multi-mode collections into separate files |
| `includeMode` | boolean | No | `false` | Default for all collections: include mode name as first-level key in output |
| `extensions` | object | No | - | Metadata extensions to include |
| `collections` | object | No | - | Per-collection configuration (can override `splitModes` and `includeMode`) |

### DTCG Format

By default, tokens use [DTCG](https://design-tokens.github.io/community-group/format/) format:

```json
{
  "colors": {
    "primary": {
      "$value": "#0066cc",
      "$type": "color"
    }
  }
}
```

With `dtcg: false`:

```json
{
  "colors": {
    "primary": {
      "value": "#0066cc",
      "type": "color"
    }
  }
}
```

### Variable IDs

Include Figma variable IDs for debugging or custom tooling:

```json
{
  "tokens": {
    "includeVariableId": true
  }
}
```

Output:

```json
{
  "colors": {
    "primary": {
      "$value": "#0066cc",
      "$type": "color",
      "$extensions": {
        "com.figma": {
          "variableId": "VariableID:10:11"
        }
      }
    }
  }
}
```

---

## `tokens.extensions`

Include additional Figma metadata in token output.

```json
{
  "tokens": {
    "extensions": {
      "description": true,
      "scopes": true,
      "codeSyntax": true
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `description` | boolean | `false` | Include variable descriptions from Figma |
| `scopes` | boolean | `false` | Include usage scopes (e.g., `FRAME_FILL`, `TEXT_FILL`) |
| `codeSyntax` | boolean | `false` | Include platform code syntax (`WEB`, `ANDROID`, `iOS`) |

Output with all extensions enabled:

```json
{
  "colors": {
    "primary": {
      "$value": "#0066cc",
      "$type": "color",
      "$description": "Primary brand color",
      "$extensions": {
        "com.figma": {
          "scopes": ["ALL_FILLS", "STROKE_COLOR"],
          "codeSyntax": {
            "WEB": "--color-primary",
            "iOS": "colorPrimary"
          }
        }
      }
    }
  }
}
```

> **Note:** Re-run the Figma plugin after updating to capture new metadata fields.

---

## `tokens.collections`

Per-collection output configuration. These settings override the parent-level `tokens.splitModes` and `tokens.includeMode` defaults.

```json
{
  "tokens": {
    "dir": "tokens",
    "splitModes": true,
    "includeMode": false,
    "collections": {
      "colors": {
        "dir": "src/styles/tokens/colors",
        "file": "colors",
        "splitModes": false
      },
      "theme": {
        "splitModes": true,
        "includeMode": true
      }
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dir` | string | `tokens.dir` | Custom output directory for this collection |
| `file` | string | collection name | Custom filename pattern |
| `splitModes` | boolean | inherits from `tokens.splitModes` | Split multi-mode collections into separate files per mode |
| `includeMode` | boolean | inherits from `tokens.includeMode` | Include mode as first-level key in JSON output |

### splitModes Behavior

When `splitModes: true` (default), a collection with `light` and `dark` modes outputs:

```
tokens/
├── theme.light.json
└── theme.dark.json
```

When `splitModes: false`, all modes are combined:

```
tokens/
└── theme.json
```

### includeMode Behavior

With `includeMode: false` (default):

```json
{
  "colors": {
    "primary": { "$value": "#0066cc", "$type": "color" }
  }
}
```

With `includeMode: true`:

```json
{
  "light": {
    "colors": {
      "primary": { "$value": "#0066cc", "$type": "color" }
    }
  }
}
```

### Regenerating After Config Changes

After modifying collection configuration, regenerate files without fetching from Figma:

```bash
npx synkio sync --regenerate
```

---

## `build`

Build configuration for post-sync processing.

```json
{
  "build": {
    "autoRun": false,
    "script": "npm run build:tokens",
    "css": {
      "enabled": true
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoRun` | boolean | `false` | Run build without prompting after sync |
| `script` | string | - | Custom build command to run after sync |
| `css` | object | - | Built-in CSS output options |

### Custom Build Script

Integrate any build tool (Style Dictionary, Token Transformer, etc.):

```json
{
  "build": {
    "script": "npm run build:tokens"
  }
}
```

Add the corresponding script to your `package.json`:

```json
{
  "scripts": {
    "build:tokens": "style-dictionary build --config sd.config.js"
  }
}
```

When you run `synkio sync`:
1. Tokens are fetched from Figma
2. JSON files are written to `tokens.dir`
3. Your build script is executed

### Auto-Run

Skip the build confirmation prompt:

```json
{
  "build": {
    "autoRun": true,
    "script": "npm run build:tokens"
  }
}
```

Or use the CLI flag:

```bash
npx synkio sync --build
```

To skip the build entirely:

```bash
npx synkio sync --no-build
```

---

## `build.css`

Built-in CSS custom properties generation.

```json
{
  "build": {
    "css": {
      "enabled": true,
      "dir": "src/styles",
      "file": "tokens.css",
      "utilities": true,
      "utilitiesFile": "utilities.css",
      "transforms": {
        "useRem": true,
        "basePxFontSize": 16
      }
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Generate CSS custom properties |
| `dir` | string | `tokens.dir` | CSS output directory |
| `file` | string | `"tokens.css"` | CSS output filename |
| `utilities` | boolean | `false` | Generate utility classes |
| `utilitiesFile` | string | `"utilities.css"` | Utilities filename |
| `transforms` | object | - | Value transformation options |

### transforms

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useRem` | boolean | `false` | Use rem units instead of px for dimensions |
| `basePxFontSize` | number | `16` | Base font size for rem calculations |

### Transform Examples

With `useRem: false` (default):

```css
:root {
  --spacing-md: 16px;
  --font-size-lg: 24px;
}
```

With `useRem: true`:

```css
:root {
  --spacing-md: 1rem;
  --font-size-lg: 1.5rem;
}
```

---

## `docsPages`

Documentation site generation.

```json
{
  "docsPages": {
    "enabled": true,
    "dir": ".synkio/docs",
    "title": "Design Tokens",
    "platforms": [
      {
        "name": "CSS",
        "prefix": "--",
        "case": "kebab"
      },
      {
        "name": "JavaScript",
        "case": "camel"
      }
    ]
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Generate documentation site |
| `dir` | string | `".synkio/docs"` | Documentation output directory |
| `title` | string | `"Design Tokens"` | Site title |
| `platforms` | array | - | Custom platform definitions for variable name display |

### platforms

Define how variable names are displayed for different platforms:

```json
{
  "docsPages": {
    "platforms": [
      {
        "name": "CSS",
        "prefix": "--",
        "case": "kebab",
        "separator": "-"
      },
      {
        "name": "JavaScript",
        "case": "camel"
      },
      {
        "name": "Swift",
        "prefix": "k",
        "case": "pascal"
      },
      {
        "name": "Kotlin",
        "case": "snake",
        "suffix": "_color"
      }
    ]
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | required | Display name for this platform |
| `prefix` | string | `""` | Variable prefix (e.g., `"--"` for CSS) |
| `case` | string | - | Name casing: `"kebab"`, `"camel"`, `"snake"`, `"pascal"`, `"constant"` |
| `separator` | string | - | Custom separator (overrides case default) |
| `suffix` | string | - | Optional suffix appended to names |

### Case Examples

For a token named `colors.brand.primary`:

| Case | Output |
|------|--------|
| `kebab` | `colors-brand-primary` |
| `camel` | `colorsBrandPrimary` |
| `snake` | `colors_brand_primary` |
| `pascal` | `ColorsBrandPrimary` |
| `constant` | `COLORS_BRAND_PRIMARY` |

### Generate Documentation

```bash
# Generate docs
npx synkio docs

# Generate and open in browser
npx synkio docs --open

# Custom output directory
npx synkio docs --output=styleguide
```

---

## `sync`

Sync behavior configuration.

```json
{
  "sync": {
    "report": true,
    "reportHistory": false
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `report` | boolean | `true` | Generate markdown report after sync |
| `reportHistory` | boolean | `false` | Keep timestamped reports as changelog |

### Report Output

When `report: true`, a sync report is generated at `.synkio/sync-report.md` showing:

- Added tokens
- Modified tokens
- Removed tokens
- Breaking changes

### Report History

When `reportHistory: true`, each sync creates a timestamped report:

```
.synkio/
├── sync-report.md              # Latest
├── sync-report.2024-01-15.md   # Historical
└── sync-report.2024-01-10.md
```

---

## `import`

Configuration for importing from Figma's native JSON exports.

```json
{
  "import": {
    "dir": "figma-exports",
    "sources": {
      "theme": {
        "files": ["light.tokens.json", "dark.tokens.json"]
      },
      "primitives": {
        "dir": "figma-exports/foundation",
        "files": ["colors.json", "spacing.json"]
      },
      "components": {
        "dir": "figma-exports/components"
      }
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dir` | string | `"figma-exports"` | Default directory for Figma export files |
| `sources` | object | - | Map collection names to source files |

### sources.<collection>

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dir` | string | `import.dir` | Override directory for this collection |
| `files` | array | all `.json` | Specific JSON files to import |

### How It Works

1. Each key in `sources` becomes a collection name
2. Files are loaded from the specified `dir` or the default `import.dir`
3. If `files` is omitted, all `.json` files in the directory are imported
4. Mode names are extracted from each file's `$extensions.com.figma.modeName`

### Example Workflow

```bash
# Export from Figma: File → Export → Variables → JSON
# Save to figma-exports/

# Import using config
npx synkio import

# Or import specific files via CLI
npx synkio import ./light.tokens.json --collection=theme
```

See the [User Guide](../packages/cli/USER_GUIDE.md#import) for detailed import workflows.

---

## Environment Variables

### FIGMA_TOKEN

Your Figma personal access token.

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Scroll to **Personal access tokens**
3. Click **Generate new token**
4. Copy and add to `.env`:

```bash
FIGMA_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxx
```

---

## Config File Discovery

Synkio searches for configuration files in order:

1. `synkio.config.json` (recommended)
2. `tokensrc.json` (deprecated)

You can also specify a custom path:

```bash
npx synkio sync --config=./config/synkio.config.json
```

---

## Validation

Validate your configuration:

```bash
npx synkio validate
```

This checks:
- Config file syntax
- Required fields
- Figma connection
- Environment variables

---

## Migration from Legacy Config

If you're using the old `tokensrc.json` format, rename it:

```bash
mv tokensrc.json synkio.config.json
```

Key changes in the new schema:

| Old | New |
|-----|-----|
| `output.dir` | `tokens.dir` |
| `output.mode` | removed (use `build.script` for Style Dictionary) |
| `collections` (top-level) | `tokens.collections` |
| `css` (top-level) | `build.css` |
| `docs` | `docsPages` |
