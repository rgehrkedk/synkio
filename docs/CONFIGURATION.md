# Configuration Reference

Complete reference for all Synkio configuration options.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Complete Working Example](#complete-working-example)
- [Full Configuration Example](#full-configuration-example)
- [Configuration Sections](#configuration-sections)
  - [`version`](#version-required) - Config schema version
  - [`figma`](#figma-required) - Figma connection settings
    - [Finding Your File ID](#finding-your-file-id)
    - [Using Environment Variables](#using-environment-variables)
    - [Figma Enterprise](#figma-enterprise)
  - [`tokens`](#tokens-required) - Token output configuration
    - [`tokens.dtcg`](#dtcg-format) - DTCG vs legacy format
    - [`tokens.includeVariableId`](#variable-ids) - Include Figma variable IDs
    - [`tokens.splitBy`](#splitby-behavior) - File splitting behavior
    - [`tokens.includeMode`](#includemode-behavior) - Mode wrapper in output
    - [`tokens.extensions`](#tokensextensions) - Metadata extensions
    - [`tokens.collections`](#tokenscollections) - Per-collection configuration
    - [`tokens.styles`](#tokensstyles) - Figma styles configuration
  - [`build`](#build) - Build configuration
    - [`build.script`](#custom-build-script) - Custom build command
    - [`build.autoRun`](#auto-run) - Skip build prompt
    - [`build.css`](#buildcss) - Built-in CSS generation
  - [`docsPages`](#docspages) - Documentation site generation
    - [`docsPages.platforms`](#platforms) - Platform naming conventions
  - [`sync`](#sync) - Sync behavior
  - [`import`](#import) - Figma native JSON import
- [Environment Variables](#environment-variables)
- [Config File Discovery](#config-file-discovery)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)
- [Migration from Legacy Config](#migration-from-legacy-config)

---

## Overview

Synkio is configured via `synkio.config.json` in your project root.

> **Note:** Legacy `tokensrc.json` files are still supported but deprecated. You'll see a warning when using the old filename.

> **Tip:** After manually editing your config file, run `npx synkio validate` to check for JSON syntax errors and missing required fields.

---

## Quick Start

The absolute minimum required configuration:

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

| Field | Required | Description |
|-------|----------|-------------|
| `version` | **Yes** | Always `"1.0.0"` |
| `figma.fileId` | **Yes** | Your Figma file ID from the URL |
| `figma.accessToken` | **Yes** | Use `${FIGMA_TOKEN}` to read from `.env` file |
| `tokens.dir` | **Yes** | Directory where token JSON files are written |

That's it! With this minimal config, Synkio will:
- Fetch all variable collections from your Figma file
- Output them to the `tokens/` directory
- Use default settings (DTCG format, split by mode, no mode wrapper)

---

## Complete Working Example

A practical starting configuration with common collection settings:

```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "YOUR_FILE_ID",
    "accessToken": "${FIGMA_TOKEN}"
  },
  "tokens": {
    "dir": "tokens",
    "collections": {
      "theme": {
        "splitBy": "mode"
      },
      "brand": {
        "splitBy": "mode"
      },
      "globals": {
        "splitBy": "none"
      }
    }
  }
}
```

> **Important: Collection Name Matching**
>
> Collection names in config must match your Figma variable collection names **exactly** (case-sensitive).
>
> To find your collection names:
> 1. Open Figma and check the Variables panel
> 2. Or run `npx synkio sync --preview` to see detected collections
>
> If a collection name in your config doesn't match any Figma collection, it will be silently ignored.

---

## Full Configuration Example

Complete configuration showing all available options:

```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "ABC123xyz",
    "nodeId": "0:0",
    "accessToken": "${FIGMA_TOKEN}",
    "baseUrl": "https://api.figma.com/v1",
    "timeout": 60000
  },
  "tokens": {
    "dir": "tokens",
    "dtcg": true,
    "includeVariableId": false,
    "splitBy": "mode",
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
        "splitBy": "none",
        "includeMode": false
      },
      "theme": {
        "splitBy": "mode",
        "includeMode": true
      },
      "globals": {
        "splitBy": "group"
      }
    },
    "styles": {
      "enabled": true,
      "paint": {
        "file": "colors"
      },
      "text": {
        "file": "typography"
      },
      "effect": {
        "file": "effects"
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
    "dir": "synkio/docs",
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

---

### `version` (required)

Config schema version. Currently only `"1.0.0"` is supported.

```json
{
  "version": "1.0.0"
}
```

| Option | Type | Required | Values | Description |
|--------|------|----------|--------|-------------|
| `version` | string | **Yes** | `"1.0.0"` | Schema version identifier |

---

## `figma` (required)

Figma connection settings for fetching design tokens.

```json
{
  "figma": {
    "fileId": "ABC123xyz",
    "nodeId": "0:0",
    "accessToken": "${FIGMA_TOKEN}",
    "baseUrl": "https://api.figma.com/v1",
    "timeout": 60000
  }
}
```

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `fileId` | string | **Yes** | - | Figma file ID extracted from the file URL |
| `nodeId` | string | No | `"0:0"` | Specific node ID to fetch (defaults to document root) |
| `accessToken` | string | **Yes** | - | Figma API token. Use `${FIGMA_TOKEN}` to read from `.env` |
| `baseUrl` | string | No | `https://api.figma.com/v1` | Custom API URL for Figma Enterprise |
| `timeout` | number | No | `60000` | API request timeout in milliseconds |

### Finding Your File ID

Extract the file ID from your Figma URL:

```
https://www.figma.com/design/ABC123xyz/My-Design-System
                            ^^^^^^^^^^
                            This is your fileId
```

Supported URL formats:
- `https://figma.com/file/ABC123xyz/...`
- `https://figma.com/design/ABC123xyz/...`
- `https://figma.com/board/ABC123xyz/...`
- `https://figma.com/proto/ABC123xyz/...`

### Using Environment Variables

The `${VAR_NAME}` syntax reads values from environment variables. Currently, only `FIGMA_TOKEN` is supported.

**Step 1:** Create a `.env` file in your project root:

```bash
# .env
FIGMA_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxx
```

**Step 2:** Add `.env` to your `.gitignore`:

```bash
echo ".env" >> .gitignore
```

**Step 3:** Get your token from [Figma Account Settings](https://www.figma.com/settings) → Personal access tokens → Generate new token

> **What happens if the variable is missing?**
>
> If `FIGMA_TOKEN` is not set in your environment or `.env` file, Synkio will show an error:
> ```
> Error: FIGMA_TOKEN environment variable is not set
> ```
> The config file will contain the literal string `${FIGMA_TOKEN}` until the variable is set.

> **Security:** Never commit your actual token to version control. The `${FIGMA_TOKEN}` pattern keeps secrets out of your config file.

### Figma Enterprise

For organizations using Figma Enterprise with custom domains:

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

Token output configuration. Controls where and how design tokens are written.

```json
{
  "tokens": {
    "dir": "tokens",
    "dtcg": true,
    "includeVariableId": false,
    "splitBy": "mode",
    "includeMode": false,
    "extensions": {
      "description": false,
      "scopes": false,
      "codeSyntax": false
    },
    "collections": {},
    "styles": {}
  }
}
```

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `dir` | string | **Yes** | - | Output directory for token JSON files |
| `dtcg` | boolean | No | `true` | Use DTCG format (`$value`, `$type`) vs legacy (`value`, `type`) |
| `includeVariableId` | boolean | No | `false` | Include Figma variable ID in `$extensions.com.figma.variableId` |
| `splitBy` | string | No | `"mode"` | Default split strategy: `"mode"` (per mode), `"group"` (per top-level group), `"none"` (single file) |
| `includeMode` | boolean | No | `false` | Default for all collections: include mode name as first-level wrapper key in JSON output |
| `extensions` | object | No | `{}` | Metadata extensions to include (see [tokens.extensions](#tokensextensions)) |
| `collections` | object | No | `{}` | Per-collection configuration (see [tokens.collections](#tokenscollections)) |
| `styles` | object | No | `{}` | Figma styles configuration (see [tokens.styles](#tokensstyles)) |

### DTCG Format

By default, tokens use [DTCG (Design Tokens Community Group)](https://design-tokens.github.io/community-group/format/) format with `$` prefixed keys:

**With `dtcg: true` (default):**

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

**With `dtcg: false`:**

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

> **Recommendation:** Use DTCG format for compatibility with modern design token tools like Style Dictionary v4.

### Variable IDs

Include Figma variable IDs for debugging, custom tooling, or tracking token origins:

```json
{
  "tokens": {
    "includeVariableId": true
  }
}
```

**Output:**

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

### splitBy Behavior

Controls how token files are split. Three strategies are available:

| Value | Description |
|-------|-------------|
| `"mode"` | One file per mode (default). `theme` with light/dark → `theme.light.json`, `theme.dark.json` |
| `"group"` | One file per top-level group. `globals` with colors/spacing → `globals.colors.json`, `globals.spacing.json` |
| `"none"` | Single file for entire collection. `theme` → `theme.json` |

**With `splitBy: "mode"` (default):**

A collection named `theme` with `light` and `dark` modes outputs:

```
tokens/
├── theme.light.json
└── theme.dark.json
```

**With `splitBy: "group"`:**

A collection named `globals` with top-level groups `colors` and `spacing` outputs:

```
tokens/
├── globals.colors.json
└── globals.spacing.json
```

This is useful for primitive/foundation collections organized by category.

**With `splitBy: "none"`:**

All modes are combined into a single file:

```
tokens/
└── theme.json
```

> **Use Case:** Use `"none"` for single-mode collections or when you want all modes in one file. Use `"group"` for foundation collections organized by category (colors, spacing, typography).

### includeMode Behavior

Controls whether the mode name appears as a wrapper key in the JSON output.

**With `includeMode: false` (default):**

```json
{
  "colors": {
    "primary": { "$value": "#0066cc", "$type": "color" }
  }
}
```

**With `includeMode: true`:**

```json
{
  "light": {
    "colors": {
      "primary": { "$value": "#0066cc", "$type": "color" }
    }
  }
}
```

> **Use Case:** Enable `includeMode` when you need to distinguish which mode the tokens belong to within the file, especially when `splitModes: false`.

---

## `tokens.extensions`

Include additional Figma metadata in token output. These require the metadata to be captured by the Figma plugin.

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
| `description` | boolean | `false` | Include variable descriptions from Figma as `$description` |
| `scopes` | boolean | `false` | Include usage scopes (e.g., `FRAME_FILL`, `TEXT_FILL`, `STROKE_COLOR`) |
| `codeSyntax` | boolean | `false` | Include platform code syntax (`WEB`, `ANDROID`, `iOS`) |

**Output with all extensions enabled:**

```json
{
  "colors": {
    "primary": {
      "$value": "#0066cc",
      "$type": "color",
      "$description": "Primary brand color used for CTAs and links",
      "$extensions": {
        "com.figma": {
          "scopes": ["ALL_FILLS", "STROKE_COLOR"],
          "codeSyntax": {
            "WEB": "--color-primary",
            "iOS": "colorPrimary",
            "ANDROID": "@color/primary"
          }
        }
      }
    }
  }
}
```

> **Note:** After enabling extensions in your config, re-run the Figma plugin to capture the additional metadata fields.

---

## `tokens.collections`

Per-collection output configuration. Settings here override the parent-level `tokens.splitBy` and `tokens.includeMode` defaults.

> **Important:** Collection names must match your Figma variable collection names **exactly** (case-sensitive).

```json
{
  "tokens": {
    "dir": "tokens",
    "splitBy": "mode",
    "includeMode": false,
    "collections": {
      "colors": {
        "dir": "src/styles/tokens/colors",
        "file": "colors",
        "splitBy": "none",
        "includeMode": false
      },
      "primitives": {
        "dir": "src/styles/tokens/foundation",
        "splitBy": "group"
      },
      "theme": {
        "splitBy": "mode",
        "includeMode": true
      },
      "typography": {
        "dir": "tokens/typography",
        "file": "typography.tokens"
      }
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dir` | string | inherits `tokens.dir` | Custom output directory for this collection's files |
| `file` | string | collection name | Custom filename pattern (without extension) |
| `splitBy` | string | inherits `tokens.splitBy` | Override: `"mode"`, `"group"`, or `"none"` |
| `includeMode` | boolean | inherits `tokens.includeMode` | Override: include mode name as first-level wrapper key |
| `names` | object | - | Rename modes or groups in output files (e.g., `{ "light": "day" }`) |

### Directory Inheritance Explained

When you omit `dir` in a collection config, it inherits from `tokens.dir` directly—it does NOT create a subfolder with the collection name.

**Example 1: Omitting `dir` (inherits parent)**

```json
{
  "tokens": {
    "dir": "tokens",
    "collections": {
      "colors": {
        "splitModes": false
      }
    }
  }
}
```

Output: `tokens/colors.json` (file is in `tokens/` directory)

**Example 2: Custom `dir` (override)**

```json
{
  "tokens": {
    "dir": "tokens",
    "collections": {
      "colors": {
        "dir": "src/styles/colors",
        "splitModes": false
      }
    }
  }
}
```

Output: `src/styles/colors/colors.json` (file is in custom directory)

**Example 3: Subfolder of parent**

```json
{
  "tokens": {
    "dir": "tokens",
    "collections": {
      "colors": {
        "dir": "tokens/colors",
        "splitModes": false
      }
    }
  }
}
```

Output: `tokens/colors/colors.json` (file is in subfolder)

### Collection Configuration Examples

**Example 1: Custom directory and filename**

```json
{
  "tokens": {
    "dir": "tokens",
    "collections": {
      "typography": {
        "dir": "tokens/typography",
        "file": "typography.tokens"
      }
    }
  }
}
```

Output: `tokens/typography/typography.tokens.json`

**Example 2: Single file (no splitting)**

```json
{
  "tokens": {
    "collections": {
      "primitives": {
        "splitBy": "none"
      }
    }
  }
}
```

Output: `tokens/primitives.json` (all modes combined)

**Example 3: Split by top-level group**

```json
{
  "tokens": {
    "collections": {
      "globals": {
        "splitBy": "group"
      }
    }
  }
}
```

Output (for a collection with `colors` and `spacing` groups):

```
tokens/
├── globals.colors.json
└── globals.spacing.json
```

**Example 4: Multi-mode with mode wrapper**

```json
{
  "tokens": {
    "collections": {
      "theme": {
        "splitBy": "mode",
        "includeMode": true
      }
    }
  }
}
```

Output files `theme.light.json` and `theme.dark.json`, each with mode wrapper:

```json
{
  "light": {
    "colors": {
      "background": { "$value": "#ffffff", "$type": "color" }
    }
  }
}
```

### Inheritance Behavior

Collection settings use nullish coalescing (`??`) to inherit from parent:

1. If collection setting is explicitly set → use collection value
2. If collection setting is `undefined` → inherit from `tokens.*` parent level
3. Parent defaults: `splitBy: "mode"`, `includeMode: false`

```json
{
  "tokens": {
    "splitBy": "none",          // Parent default: no splitting
    "includeMode": true,        // Parent default: include mode wrapper
    "collections": {
      "theme": {
        "splitBy": "mode"       // Override: split this collection by mode
        // includeMode: inherited as true from parent
      },
      "colors": {
        // Both inherited: splitBy: "none", includeMode: true
      }
    }
  }
}
```

### Regenerating After Config Changes

After modifying collection configuration, regenerate files without fetching from Figma:

```bash
npx synkio sync --regenerate
```

This re-processes the existing baseline using your updated configuration.

---

## `tokens.styles`

Configuration for syncing Figma styles (paint, text, effect). Styles are distinct from Figma variables and include colors, gradients, typography, shadows, and blurs.

```json
{
  "tokens": {
    "styles": {
      "enabled": true,
      "paint": {
        "enabled": true,
        "file": "colors",
        "mergeInto": {
          "collection": "globals",
          "group": "colors"
        }
      },
      "text": {
        "enabled": true,
        "file": "typography"
      },
      "effect": {
        "enabled": true,
        "file": "effects"
      }
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Master toggle for all styles sync |
| `paint` | object | - | Paint styles (solid colors, gradients) |
| `text` | object | - | Text styles (typography) |
| `effect` | object | - | Effect styles (shadows, blurs) |

### Style Type Configuration

Each style type (`paint`, `text`, `effect`) accepts the same options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable this style type |
| `dir` | string | `tokens.dir` | Output directory for this style type |
| `file` | string | style type name | Custom filename (without extension) |
| `mergeInto` | object | - | Merge into an existing variable collection file |

### Merge Into Collection

Instead of creating separate style files, you can merge styles into an existing variable collection output. This is useful when your paint styles should live alongside your color variables.

```json
{
  "tokens": {
    "styles": {
      "paint": {
        "mergeInto": {
          "collection": "globals",
          "group": "colors"
        }
      }
    }
  }
}
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `collection` | string | **Yes** | Target collection name (must match a variable collection) |
| `group` | string | No | Target group (required if collection uses `splitBy: "group"`) |

### Style Output Formats

**Paint styles** output as DTCG color or gradient tokens:

```json
{
  "brand": {
    "primary": {
      "$type": "color",
      "$value": "#0066cc"
    }
  }
}
```

**Text styles** output as DTCG typography composite tokens:

```json
{
  "heading": {
    "h1": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Inter",
        "fontSize": "32px",
        "fontWeight": 700,
        "lineHeight": 1.2,
        "letterSpacing": "-0.02em"
      }
    }
  }
}
```

**Effect styles** output as shadow or blur tokens:

```json
{
  "elevation": {
    "md": {
      "$type": "shadow",
      "$value": {
        "offsetX": "0px",
        "offsetY": "4px",
        "blur": "8px",
        "spread": "0px",
        "color": "rgba(0, 0, 0, 0.1)"
      }
    }
  }
}
```

> **Note:** Styles sync requires the Synkio Figma plugin v3.0.0+ which captures style data alongside variables.

---

## `build`

Build configuration for post-sync processing. Run custom build scripts or use built-in CSS generation.

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
| `autoRun` | boolean | `false` | Run build automatically without prompting after sync |
| `script` | string | - | Custom build command to execute after sync |
| `css` | object | - | Built-in CSS custom properties generation (see [build.css](#buildcss)) |

### Custom Build Script

Integrate any build tool (Style Dictionary, Token Transformer, custom scripts):

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

**Sync workflow:**

1. Tokens are fetched from Figma
2. JSON files are written to `tokens.dir`
3. You're prompted to run the build script
4. If confirmed, your build script executes

### Auto-Run

Skip the build confirmation prompt and run automatically:

```json
{
  "build": {
    "autoRun": true,
    "script": "npm run build:tokens"
  }
}
```

**CLI overrides:**

```bash
# Force build (override autoRun: false)
npx synkio sync --build

# Skip build entirely (override autoRun: true)
npx synkio sync --no-build
```

---

## `build.css`

Built-in CSS custom properties generation. Alternative to using external tools like Style Dictionary.

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
| `enabled` | boolean | `false` | Enable CSS custom properties generation |
| `dir` | string | `tokens.dir` | Output directory for CSS files |
| `file` | string | `"tokens.css"` | Main CSS output filename |
| `utilities` | boolean | `false` | Generate utility classes (`.bg-primary`, `.text-sm`, etc.) |
| `utilitiesFile` | string | `"utilities.css"` | Utilities CSS filename |
| `transforms` | object | `{}` | Value transformation options |

### CSS Transforms

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useRem` | boolean | `false` | Convert px values to rem for dimensions |
| `basePxFontSize` | number | `16` | Base font size for rem calculations (16px = 1rem) |

**With `useRem: false` (default):**

```css
:root {
  --spacing-md: 16px;
  --font-size-lg: 24px;
}
```

**With `useRem: true`:**

```css
:root {
  --spacing-md: 1rem;
  --font-size-lg: 1.5rem;
}
```

### CSS Output Example

Input tokens:

```json
{
  "colors": {
    "primary": { "$value": "#0066cc", "$type": "color" }
  },
  "spacing": {
    "md": { "$value": "16px", "$type": "dimension" }
  }
}
```

Output `tokens.css`:

```css
:root {
  --colors-primary: #0066cc;
  --spacing-md: 16px;
}
```

---

## `docsPages`

Generate a static documentation site for your design tokens.

```json
{
  "docsPages": {
    "enabled": true,
    "dir": "synkio/docs",
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
| `enabled` | boolean | `false` | Enable documentation site generation |
| `dir` | string | `"synkio/docs"` | Output directory for documentation files |
| `title` | string | `"Design Tokens"` | Site title shown in the header |
| `platforms` | array | `[]` | Custom platform definitions for variable name display (optional) |

### platforms

The `platforms` array is **optional**. If omitted, docs will show token names in their original format. When provided, the docs display how variable names should be written for each platform.

**Common platform configurations:**

```json
{
  "docsPages": {
    "enabled": true,
    "platforms": [
      {
        "name": "CSS",
        "prefix": "--",
        "case": "kebab"
      },
      {
        "name": "JavaScript",
        "case": "camel"
      },
      {
        "name": "SCSS",
        "prefix": "$",
        "case": "kebab"
      },
      {
        "name": "Swift",
        "prefix": "k",
        "case": "pascal"
      },
      {
        "name": "Kotlin",
        "case": "camel"
      },
      {
        "name": "Android XML",
        "prefix": "@color/",
        "case": "snake"
      }
    ]
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | **required** | Display name for this platform |
| `prefix` | string | `""` | Prefix added to variable names (e.g., `"--"` for CSS) |
| `suffix` | string | `""` | Suffix appended to variable names |
| `case` | string | - | Name casing transformation |
| `separator` | string | - | Custom separator (overrides case default) |

### Case Transformations

For a token path `colors.brand.primary`:

| Case | Output | Separator |
|------|--------|-----------|
| `kebab` | `colors-brand-primary` | `-` |
| `camel` | `colorsBrandPrimary` | (none) |
| `snake` | `colors_brand_primary` | `_` |
| `pascal` | `ColorsBrandPrimary` | (none) |
| `constant` | `COLORS_BRAND_PRIMARY` | `_` |

### Generate Documentation

```bash
# Generate docs
npx synkio docs

# Generate and open in browser
npx synkio docs --open

# Custom output directory (overrides config)
npx synkio docs --output=styleguide
```

---

## `sync`

Configure sync behavior and reporting.

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

### Sync Report

When `report: true`, a sync report is generated at `synkio/sync-report.md` containing:

- **Added tokens** - New tokens from Figma
- **Modified tokens** - Changed values or properties
- **Removed tokens** - Deleted from Figma
- **Breaking changes** - Renames or deletions that may break code

### Report History

When `reportHistory: true`, each sync creates a timestamped report:

```
synkio/
├── sync-report.md              # Latest report
├── sync-report.2024-01-15.md   # Historical
└── sync-report.2024-01-10.md   # Historical
```

Useful for tracking changes over time and debugging regressions.

---

## `import`

Configuration for importing from Figma's native JSON variable exports (File → Export → Variables → JSON).

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
| `sources` | object | `{}` | Map collection names to source file configurations |

### sources.\<collection\>

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dir` | string | `import.dir` | Override directory for this collection's source files |
| `files` | array | all `.json` in dir | Specific JSON files to import for this collection |

### Import Behavior

1. Each key in `sources` becomes a collection name in the output
2. Files are loaded from the specified `dir` or the default `import.dir`
3. If `files` is omitted, all `.json` files in the directory are imported
4. Mode names are extracted from each file's `$extensions.com.figma.modeName`

### Import Workflow Example

```bash
# 1. Export from Figma: File → Export → Variables → JSON
# 2. Save exported files to figma-exports/

# 3. Import using config
npx synkio import

# Or import specific files via CLI
npx synkio import ./light.tokens.json --collection=theme
```

See the [User Guide](../packages/cli/USER_GUIDE.md#import) for detailed import workflows.

---

## Environment Variables

### FIGMA_TOKEN

Your Figma personal access token for API authentication.

**Getting your token:**

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Scroll to **Personal access tokens**
3. Click **Generate new token**
4. Give it a descriptive name (e.g., "Synkio CLI")
5. Copy the token immediately (it won't be shown again)

**Setup:**

```bash
# Create .env file
echo "FIGMA_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxx" > .env

# Add to .gitignore (if not already)
echo ".env" >> .gitignore
```

**Team setup:**

Commit a `.env.example` file (without the actual token) so team members know which variables are needed:

```bash
# .env.example (safe to commit)
FIGMA_TOKEN=
```

---

## Config File Discovery

Synkio searches for configuration files in order:

1. `synkio.config.json` (recommended)
2. `tokensrc.json` (deprecated, shows warning)

### Custom Config Path

Specify a custom configuration file:

```bash
npx synkio sync --config=./config/synkio.config.json
npx synkio sync --config=/absolute/path/to/config.json
```

---

## Validation

Validate your configuration before syncing:

```bash
npx synkio validate
```

**Checks performed:**

- Config file exists and is valid JSON
- Required fields are present (`version`, `figma.fileId`, `figma.accessToken`, `tokens.dir`)
- Schema validation passes
- `FIGMA_TOKEN` environment variable is set
- Figma API connection works

**Example output:**

```
✓ Config file found: synkio.config.json
✓ FIGMA_TOKEN environment variable set
✓ Schema validation passed
✓ Figma connection successful (file: "My Design System")
```

> **Tip:** Always run `npx synkio validate` after manually editing your config file to catch JSON syntax errors early.

---

## Troubleshooting

### Common Errors

#### "Config file not found"

```
Error: Config file not found
```

**Solution:** Create a `synkio.config.json` file in your project root, or run `npx synkio init` to generate one.

#### "Invalid JSON syntax"

```
Error: Failed to parse config file: Unexpected token...
```

**Solution:** Your config file has a JSON syntax error. Common causes:
- Missing closing braces `}` or brackets `]`
- Trailing commas after the last item in an object/array
- Missing commas between properties
- Using single quotes instead of double quotes

Run `npx synkio validate` to see the exact error location, or use a JSON validator.

#### "FIGMA_TOKEN environment variable is not set"

```
Error: FIGMA_TOKEN environment variable is not set
```

**Solution:**
1. Create a `.env` file with `FIGMA_TOKEN=your_token_here`
2. Or set the environment variable directly: `export FIGMA_TOKEN=your_token`
3. Ensure the `.env` file is in your project root (same directory as `synkio.config.json`)

#### "Figma API error: 403 Forbidden"

```
Error: Figma API returned 403: Forbidden
```

**Solution:** Your token doesn't have access to the file. Check:
1. The token is correct and hasn't expired
2. You have view access to the Figma file
3. For Figma Enterprise, ensure `baseUrl` is set correctly

#### "Collection not found" / No tokens synced

If your config has collection settings but no tokens are being generated for that collection:

**Cause:** Collection names are case-sensitive and must match exactly.

**Solution:**
1. Check your Figma file's Variables panel for exact collection names
2. Run `npx synkio sync --preview` to see detected collections
3. Update your config to match the exact names (including spaces and capitalization)

Example: If Figma has `Brand Colors`, your config must use `"Brand Colors"`, not `"brand-colors"` or `"brandColors"`.

#### "No plugin data found"

```
Warning: No Synkio plugin data found in file
```

**Solution:** Run the Synkio Figma plugin on your file first to prepare the variable data for export.

### Debug Mode

For detailed logging, set the `DEBUG` environment variable:

```bash
DEBUG=synkio:* npx synkio sync
```

---

## Migration from Legacy Config

If you're using the old `tokensrc.json` format:

**Step 1:** Rename the file:

```bash
mv tokensrc.json synkio.config.json
```

**Step 2:** Update the schema (if needed):

| Old Format | New Format |
|------------|------------|
| `output.dir` | `tokens.dir` |
| `output.mode` | Removed. Use `build.script` for Style Dictionary |
| `collections` (top-level) | `tokens.collections` |
| `splitModes: true/false` | `splitBy: "mode"` / `splitBy: "none"` |
| `css` (top-level) | `build.css` |
| `docs` | `docsPages` |

**Example migration:**

```json
// Old format (tokensrc.json)
{
  "figma": { "fileId": "ABC123" },
  "output": { "dir": "tokens", "mode": "style-dictionary" },
  "collections": { "theme": { "splitModes": true } }
}

// New format (synkio.config.json)
{
  "version": "1.0.0",
  "figma": { "fileId": "ABC123", "accessToken": "${FIGMA_TOKEN}" },
  "tokens": {
    "dir": "tokens",
    "collections": { "theme": { "splitBy": "mode" } }
  },
  "build": {
    "script": "npx style-dictionary build"
  }
}
```
