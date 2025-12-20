# Synkio User Guide

Complete reference for Synkio CLI commands, configuration, and features.

## Table of Contents

- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Commands](#commands)
  - [init](#init)
  - [sync](#sync)
  - [import](#import)
  - [rollback](#rollback)
  - [validate](#validate)
  - [tokens](#tokens)
  - [docs](#docs)
- [Configuration](#configuration)
  - [Basic Config](#basic-config)
  - [Tokens Options](#tokens-options)
  - [Build Options](#build-options)
  - [CSS Options](#css-options)
  - [Docs Options](#docs-options)
  - [Sync Options](#sync-options)
  - [Collection Options](#collection-options)
  - [Styles Options](#styles-options)
  - [Import Options](#import-options)
- [Output Formats](#output-formats)
  - [DTCG Format](#dtcg-format)
  - [Variable IDs](#variable-ids)
  - [Metadata Extensions](#metadata-extensions)
- [Features](#features)
  - [Breaking Change Protection](#breaking-change-protection)
  - [Watch Mode](#watch-mode)
  - [Selective Sync](#selective-sync)
  - [Rollback Preview](#rollback-preview)
- [Using Style Dictionary](#using-style-dictionary)
- [Hosting Documentation](#hosting-your-documentation)
- [Figma Setup](#figma-setup)

---

## How It Works

1. **Configure** — Provide Synkio with your Figma file URL and output directory
2. **Plugin** — Run the Synkio Figma plugin to export variables
3. **Sync** — CLI fetches token data and generates JSON files
4. **Repeat** — Re-run sync whenever tokens change

---

## Getting Started

### 1. Install

```bash
npm install synkio --save-dev
```

### 2. Initialize

```bash
npx synkio init
```

The CLI will ask for:
- **Figma file URL** — The file containing your design tokens

This creates:
- `synkio.config.json` — Configuration file
- `.env.example` — Template for your `FIGMA_TOKEN`

> **Note:** Legacy `tokensrc.json` files are still supported but deprecated.

### 3. Run the Figma Plugin

1. Open your Figma file
2. Run **Plugins > Synkio**
3. Click "Sync" to export variables

### 4. Sync

```bash
npx synkio sync
```

Your tokens are now in your project!

---

## Commands

### --version

Show the CLI version.

```bash
npx synkio --version
```

---

### init

Initialize a new Synkio project.

```bash
npx synkio init
```

**Options:**
| Flag | Description |
|------|-------------|
| `--figma-url=<url>` | Figma file URL |
| `--base-url=<url>` | Custom Figma API URL (enterprise) |

---

### sync

Fetch tokens from Figma and save to your project.

```bash
npx synkio sync
```

**Options:**
| Flag | Description |
|------|-------------|
| `--preview` | Show changes without applying |
| `--force` | Bypass breaking change protection |
| `--report` | Generate markdown report |
| `--no-report` | Skip report generation |
| `--watch` | Poll Figma for changes |
| `--interval=<s>` | Watch interval in seconds (default: 30) |
| `--collection=<name>` | Sync specific collection(s), comma-separated |
| `--regenerate` | Regenerate files from existing baseline (no Figma fetch) |
| `--build` | Force run build without prompting |
| `--no-build` | Skip build entirely |
| `--open` | Open docs folder after sync (if docs enabled) |
| `--timeout=<s>` | Figma API timeout in seconds (default: 120) |
| `--config=<file>` | Path to config file |

**Examples:**

```bash
# Preview changes (dry run)
npx synkio sync --preview

# Force sync past breaking changes
npx synkio sync --force

# Watch mode with 60s interval
npx synkio sync --watch --interval=60

# Sync only theme collection
npx synkio sync --collection=theme

# Sync multiple collections
npx synkio sync --collection=theme,base

# Regenerate files after config change (no Figma fetch)
npx synkio sync --regenerate
```

---

### import

Import tokens from Figma's native JSON export files — **no plugin required**.

This is useful when:
- You don't want to use the Figma plugin
- Designers export JSON files manually
- You need an offline workflow
- You want to version control Figma exports in git

```bash
# Config-based (recommended)
npx synkio import

# Or with CLI arguments
npx synkio import <path> --collection=<name>
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<path>` | Path to JSON file or directory (optional if using config) |

**Options:**
| Flag | Description |
|------|-------------|
| `--collection=<name>` | Collection name (required if not using config) |
| `--mode=<name>` | Override mode name from file |
| `--preview` | Show changes without applying |
| `--force` | Import even with breaking changes |
| `--config=<file>` | Path to config file |

**Examples:**

```bash
# Import using config (recommended)
npx synkio import

# Preview what would change
npx synkio import --preview

# Import a single file
npx synkio import ./light.tokens.json --collection=theme

# Import all JSON files from a directory
npx synkio import ./figma-exports/ --collection=theme

# Force import past breaking changes
npx synkio import --force
```

**Config-Based Import (Recommended):**

Add `import` config to your `synkio.config.json`:

```json
{
  "import": {
    "dir": "figma-exports",
    "sources": {
      "theme": {
        "files": ["light.tokens.json", "dark.tokens.json"]
      },
      "primitives": {
        "dir": "figma-exports/primitives",
        "files": ["colors.json", "spacing.json"]
      }
    }
  }
}
```

Then run:

```bash
npx synkio import
```

See [Import Options](#import-options) for full configuration details.

**How Figma Native Export Works:**

1. In Figma, select your variable collection
2. Go to **File > Export > Variables > JSON**
3. Save the JSON file(s) to your project
4. Run `synkio import`

The exported JSON includes `com.figma.variableId` which Synkio uses for intelligent diffing — the same ID-based protection as the plugin workflow.

**Typical Workflow:**

```bash
# Designer exports from Figma and commits to repo
git pull

# Developer imports the new tokens
npx synkio import

# Generate output files (auto-runs if config has css/docs enabled)
npx synkio sync --regenerate
```

---

### rollback

Revert to the previous sync state.

```bash
npx synkio rollback
```

**Options:**
| Flag | Description |
|------|-------------|
| `--preview` | Show what would be restored without applying |

**Examples:**

```bash
# Preview rollback
npx synkio rollback --preview

# Perform rollback
npx synkio rollback
```

---

### validate

Check configuration and Figma connection.

```bash
npx synkio validate
```

---

### tokens

Debug utility to view current baseline.

```bash
npx synkio tokens
```

---

### docs

Generate a static documentation site for your design tokens.

```bash
npx synkio docs
```

**Options:**
| Flag | Description |
|------|-------------|
| `--output=<dir>` | Output directory (default: `.synkio/docs`) |
| `--open` | Open in browser after generating |

**Examples:**

```bash
# Generate documentation
npx synkio docs

# Generate and open in browser
npx synkio docs --open

# Custom output directory
npx synkio docs --output=styleguide
```

The generated site includes:
- Color palettes with visual swatches
- Typography scales with previews
- Spacing tokens
- CSS custom properties reference
- Copy-to-clipboard functionality

### Hosting Your Documentation

The generated docs are static HTML and can be hosted anywhere. For plug-and-play deployment:

**GitHub Pages (recommended):**
```bash
# Copy the workflow to your project
mkdir -p .github/workflows
curl -o .github/workflows/deploy-docs.yml \
  https://raw.githubusercontent.com/rgehrkedk/synkio/main/.github/workflows/deploy-docs.yml
```

Then enable GitHub Pages in your repository settings (Source: GitHub Actions).

**Other options:**
- Netlify: Connect repo, set build command to `npm ci && npx synkio docs`
- Vercel: Connect repo, set output directory to `.synkio/docs`
- Docker: See hosting guide for Dockerfile

See the full [Hosting Guide](../../docs/HOSTING.md) for detailed setup instructions.

---

## Configuration

Configuration is stored in `synkio.config.json` in your project root.

> **Note:** Legacy `tokensrc.json` files are still supported but deprecated. You'll see a warning when using the old filename.

### Basic Config

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

| Field | Description |
|-------|-------------|
| `version` | Config schema version (`1.0.0`) |
| `figma.fileId` | Figma file ID (from URL) |
| `figma.accessToken` | Token placeholder (uses `.env`) |
| `figma.baseUrl` | Custom API URL (enterprise only) |
| `tokens.dir` | Token output directory |

### Tokens Options

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
    "collections": {
      "theme": { "splitBy": "mode" },
      "globals": { "splitBy": "group" }
    },
    "styles": {
      "enabled": true
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `dir` | required | Output directory for token files |
| `dtcg` | `true` | Use DTCG format (`$value`, `$type`) |
| `includeVariableId` | `false` | Include Figma variable IDs |
| `splitBy` | `"mode"` | Split strategy: `"mode"` (per mode), `"group"` (per top-level group), `"none"` (single file) |
| `includeMode` | `false` | Include mode name as first-level key in JSON output |
| `extensions.description` | `false` | Include variable descriptions |
| `extensions.scopes` | `false` | Include usage scopes |
| `extensions.codeSyntax` | `false` | Include platform code names |
| `collections` | - | Per-collection configuration (can override `splitBy` and `includeMode`) |
| `styles` | - | Figma styles configuration (paint, text, effect) |

### Build Options

Configure custom build scripts that run after sync:

```json
{
  "build": {
    "autoRun": false,
    "script": "npm run build:tokens",
    "css": {
      "enabled": true,
      "file": "tokens.css"
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `autoRun` | `false` | Run build without prompting |
| `script` | - | Custom build command to run after sync |
| `css` | - | Built-in CSS output options |

The `build.script` option lets you integrate any build tool (Style Dictionary, Token Transformer, etc.) into your sync workflow.

### CSS Options

Generate CSS custom properties and utility classes:

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

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Generate CSS custom properties |
| `dir` | `tokens.dir` | CSS output directory |
| `file` | `tokens.css` | CSS output filename |
| `utilities` | `false` | Generate utility classes |
| `utilitiesFile` | `utilities.css` | Utilities filename |
| `transforms.useRem` | `false` | Use rem units instead of px |
| `transforms.basePxFontSize` | `16` | Base font size for rem calculations |

**Transform Examples:**

With `useRem: false` (default):
```css
--spacing-md: 16px;
--font-size-lg: 24px;
```

With `useRem: true`:
```css
--spacing-md: 1rem;
--font-size-lg: 1.5rem;
```

### Docs Options

Generate a static documentation site:

```json
{
  "docsPages": {
    "enabled": true,
    "dir": ".synkio/docs",
    "title": "Design Tokens"
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Generate documentation site |
| `dir` | `.synkio/docs` | Documentation output directory |
| `title` | `Design Tokens` | Site title |

### Sync Options

```json
{
  "sync": {
    "report": true,
    "reportHistory": false
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `report` | `true` | Generate markdown report on sync |
| `reportHistory` | `false` | Keep timestamped report history |

### Collection Options

Configure per-collection output behavior. Collection-level settings override the parent-level `tokens.splitBy` and `tokens.includeMode` defaults:

```json
{
  "tokens": {
    "dir": "tokens",
    "splitBy": "mode",
    "includeMode": false,
    "collections": {
      "colors": {
        "dir": "src/styles/tokens/colors",
        "splitBy": "none"
      },
      "primitives": {
        "dir": "src/styles/tokens/primitives",
        "splitBy": "group"
      },
      "theme": {
        "splitBy": "mode",
        "includeMode": true
      }
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `dir` | `tokens.dir` | Custom output directory for this collection |
| `file` | collection name | Custom filename pattern (without extension) |
| `splitBy` | inherits from `tokens.splitBy` | `"mode"` (per mode), `"group"` (per top-level group), `"none"` (single file) |
| `includeMode` | inherits from `tokens.includeMode` | Include mode as first-level key in JSON |
| `names` | - | Rename modes or groups in output files (e.g., `{ "light": "day" }`) |

**splitBy options:**

- `"mode"` — One file per mode: `theme.light.json`, `theme.dark.json`
- `"group"` — One file per top-level group: `globals.colors.json`, `globals.spacing.json`
- `"none"` — Single file for entire collection: `theme.json`

After changing collection config, run `npx synkio sync --regenerate` to regenerate files without fetching from Figma.

### Styles Options

Configure Figma styles sync (paint, text, effect styles). Styles are distinct from Figma variables.

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

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `true` | Master toggle for all styles sync |
| `paint` | - | Paint styles (solid colors, gradients) |
| `text` | - | Text styles (typography) |
| `effect` | - | Effect styles (shadows, blurs) |

**Per-style-type options:**

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `true` | Enable this style type |
| `dir` | `tokens.dir` | Output directory for this style type |
| `file` | style type name | Custom filename (without extension) |
| `mergeInto.collection` | - | Merge into an existing variable collection output |
| `mergeInto.group` | - | Target group (required if collection uses `splitBy: "group"`) |

> **Note:** Styles sync requires the Synkio Figma plugin v3.0.0+ which captures style data alongside variables.

### Import Options

Configure import sources for Figma's native JSON export workflow:

```json
{
  "import": {
    "dir": "figma-exports",
    "sources": {
      "theme": {
        "files": ["light.tokens.json", "dark.tokens.json"]
      },
      "primitives": {
        "dir": "figma-exports/primitives",
        "files": ["colors.json", "spacing.json"]
      },
      "icons": {}
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `dir` | `figma-exports` | Default directory for Figma export files |
| `sources` | - | Map collection names to source files |
| `sources.<name>.dir` | `import.dir` | Override directory for this collection |
| `sources.<name>.files` | all `.json` | List of JSON files to import |

**How it works:**

1. Each key in `sources` becomes a collection name
2. Files are loaded from the specified `dir` or the default `import.dir`
3. If `files` is omitted, all `.json` files in the directory are imported
4. Mode names are extracted from each file's `$extensions.com.figma.modeName`

**Example with multiple collections:**

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
        "files": ["colors.json", "spacing.json", "typography.json"]
      },
      "components": {
        "dir": "figma-exports/components"
      }
    }
  }
}
```

This config will:
- Import `theme` collection from `figma-exports/light.tokens.json` and `dark.tokens.json`
- Import `primitives` collection from `figma-exports/foundation/colors.json`, etc.
- Import `components` collection from all `.json` files in `figma-exports/components/`

---

## Output Formats

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

To use legacy format, set `dtcg: false`:

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

Include Figma variable IDs for debugging or tooling:

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

### Metadata Extensions

Include additional Figma metadata:

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

Output:

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

> **Note:** Re-run the Figma plugin after updating it to capture new metadata fields.

---

## Features

### Breaking Change Protection

Synkio detects changes that could break your code:

- **Path changes** — Token renamed (e.g., `colors.primary` -> `colors.brand.primary`)
- **Deleted variables** — Token removed entirely
- **Deleted modes** — Mode removed from collection
- **New modes** — New mode added to collection
- **Mode renames** — Mode renamed (e.g., `Mode 1` -> `light`)

When detected, sync is blocked:

```
BREAKING CHANGES DETECTED

  Path changes: 1
    colors.primary -> colors.brand.primary

  These changes may break your code.

  Run 'synkio sync --force' to apply anyway.
  Run 'synkio sync --preview' to see full details.
```

### Watch Mode

Continuously poll Figma for changes:

```bash
npx synkio sync --watch
npx synkio sync --watch --interval=60  # 60 second interval
npx synkio sync --watch --force        # Auto-apply breaking changes
```

Output:

```
Watching for changes (every 30s)

  Press Ctrl+C to stop

  [10:30:30] Checking Figma... No changes
  [10:31:00] Checking Figma... Changes detected!

  Sync complete. Wrote 5 token files.
```

### Selective Sync

Sync specific collections only:

```bash
npx synkio sync --collection=theme
npx synkio sync --collection=theme,base,icons
```

Useful for large design systems where you only need certain collections.

### Rollback Preview

Preview what would be restored before rolling back:

```bash
npx synkio rollback --preview
```

Output:

```
Rollback Preview - showing changes if restored:

  Value changes (3):
    colors.primary: #0066cc -> #0055aa

  Tokens that would be removed (1):
    - colors.accent

  Tokens that would be restored (2):
    + colors.secondary
```

---

## Using Style Dictionary

Synkio outputs standard DTCG-format JSON files that can be consumed by Style Dictionary or any other token build tool.

### Setting Up Style Dictionary

1. Install Style Dictionary:

```bash
npm install style-dictionary --save-dev
```

2. Create a Style Dictionary config (`sd.config.js`):

```javascript
export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables'
      }]
    },
    scss: {
      transformGroup: 'scss',
      buildPath: 'dist/',
      files: [{
        destination: '_tokens.scss',
        format: 'scss/variables'
      }]
    }
  }
};
```

3. Add a build script to your `package.json`:

```json
{
  "scripts": {
    "build:tokens": "style-dictionary build --config sd.config.js"
  }
}
```

4. Configure Synkio to run the build after sync:

```json
{
  "build": {
    "script": "npm run build:tokens"
  }
}
```

Now when you run `synkio sync`, it will:
1. Fetch tokens from Figma
2. Write DTCG JSON files to `tokens/`
3. Run your Style Dictionary build
4. Output CSS/SCSS/etc. to `dist/`

### Advanced Style Dictionary Configuration

For TypeScript configs, factory functions, and advanced setups, see the [Style Dictionary documentation](https://styledictionary.com/).

---

## Figma Setup

### Getting a Figma Access Token

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Scroll to **Personal access tokens**
3. Click **Generate new token**
4. Copy and save the token (shown only once)

### Finding Your File ID

From your Figma URL:

```
https://www.figma.com/design/ABC123xyz/My-Design-System
                            ^^^^^^^^^^
                            This is your fileId
```

### Figma Enterprise

For Figma Enterprise with custom domains, set `baseUrl`:

```json
{
  "figma": {
    "fileId": "ABC123xyz",
    "accessToken": "${FIGMA_TOKEN}",
    "baseUrl": "https://api.figma.your-company.com/v1"
  }
}
```
