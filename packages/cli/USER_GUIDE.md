# Synkio User Guide

Complete reference for Synkio CLI commands, configuration, and features.

## Table of Contents

- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Commands](#commands)
  - [init](#init)
  - [pull](#pull)
  - [build](#build)
  - [diff](#diff)
  - [import](#import)
  - [export](#export)
  - [rollback](#rollback)
  - [validate](#validate)
  - [tokens](#tokens)
  - [docs](#docs)
- [GitHub PR Workflow](#github-pr-workflow)
  - [Overview](#overview)
  - [Setup](#setup)
  - [Workflow Steps](#workflow-steps)
  - [Comparison Table](#comparison-pull-vs-pr-workflow)
  - [Best Practices](#best-practices)
- [Configuration](#configuration)
  - [Basic Config](#basic-config)
  - [Tokens Options](#tokens-options)
  - [Build Options](#build-options)
  - [CSS Options](#css-options)
  - [Docs Options](#docs-options)
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
  - [Selective Pull](#selective-pull)
  - [Rollback Preview](#rollback-preview)
- [Using Style Dictionary](#using-style-dictionary)
- [Hosting Documentation](#hosting-your-documentation)
- [Figma Setup](#figma-setup)

---

## How It Works

1. **Configure** — Provide Synkio with your Figma file URL and output directory
2. **Plugin** — Run the Synkio Figma plugin to export variables
3. **Pull** — CLI fetches token data and updates baseline.json
4. **Build** — CLI generates token files from baseline
5. **Repeat** — Re-run pull + build whenever tokens change

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

### 3. Run the Figma Plugin

1. Open your Figma file
2. Run **Plugins > Synkio**
3. Click "Sync" to export variables

### 4. Pull and Build

```bash
# Fetch tokens from Figma
npx synkio pull

# Generate token files
npx synkio build
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

### pull

Fetch tokens from Figma and update baseline.json.

The `pull` command fetches token data from Figma and updates your local baseline. It does NOT write token files — run `synkio build` after pulling to generate output files.

```bash
npx synkio pull
```

**Options:**
| Flag | Description |
|------|-------------|
| `--preview` | Show changes without updating baseline |
| `--collection=<name>` | Pull specific collection(s), comma-separated |
| `--watch` | Poll Figma for changes continuously |
| `--interval=<s>` | Watch interval in seconds (default: 30) |
| `--timeout=<s>` | Figma API timeout in seconds (default: 120) |
| `--config=<file>` | Path to config file |

**Exit codes:**
| Code | Meaning |
|------|---------|
| `0` | Success (no breaking changes) |
| `1` | Breaking changes detected |
| `2` | Error (config, network, etc.) |

**Examples:**

```bash
# Fetch from Figma, update baseline
npx synkio pull

# Preview changes without updating
npx synkio pull --preview

# Watch mode with 60s interval
npx synkio pull --watch --interval=60

# Pull only theme collection
npx synkio pull --collection=theme

# Pull multiple collections
npx synkio pull --collection=theme,base
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

# Generate output files
npx synkio build
```

---

### build

Generate token files from baseline.json.

The `build` command generates token files from your baseline. It works entirely offline — no Figma API calls required.

```bash
npx synkio build
```

**Options:**
| Flag | Description |
|------|-------------|
| `--force` | Bypass breaking change confirmation |
| `--rebuild` | Regenerate all files (skip comparison) |
| `--backup` | Create timestamped backup before overwriting files |
| `--report` | Generate markdown diff report |
| `--no-report` | Skip report generation |
| `--open` | Open docs folder after build (if docs enabled) |
| `--config=<file>` | Path to config file |

**Examples:**

```bash
# Build token files from baseline
npx synkio build

# Regenerate all files (after config change)
npx synkio build --rebuild

# Build with backup for safety
npx synkio build --backup

# Force build past breaking changes
npx synkio build --force
```

**How it works:**

1. Reads `synkio/baseline.json`
2. Splits tokens according to config strategy
3. Processes styles if configured
4. Writes token files to output directory
5. Generates CSS if enabled
6. Generates docs if enabled
7. Runs `build.script` if configured

**Breaking Change Warning:**

When baseline contains breaking changes (deletions/renames) compared to existing files, build will show a warning. Use `--force` to proceed.

See [GitHub PR Workflow](#github-pr-workflow) for typical usage.

---

### diff

Compare baseline.json with current token files on disk.

This is a read-only command that shows what would change if you ran `synkio build`. Useful for CI/CD to detect drift between baseline and files.

```bash
npx synkio diff
```

**Options:**
| Flag | Description |
|------|-------------|
| `--config=<file>` | Path to config file |

**Exit codes:**
| Code | Meaning |
|------|---------|
| `0` | No differences (baseline and files are in sync) |
| `1` | Differences detected |
| `2` | Error (config, missing files, etc.) |

**Examples:**

```bash
# Compare baseline with token files
npx synkio diff
```

**Use in CI:**

```yaml
# .github/workflows/check-tokens.yml
- run: npx synkio diff
  # Fails if token files don't match baseline
```

---

### export

Export token files to baseline format for Figma import — enables code-first and roundtrip workflows.

This command reads your existing token files and converts them to the baseline format that the Synkio Figma plugin can import. This enables two workflows:

- **Code-first** — Write tokens in code, export to baseline, import into Figma
- **Roundtrip** — Modify tokens in code, sync back to Figma with ID preservation

```bash
npx synkio export
```

**Options:**
| Flag | Description |
|------|-------------|
| `--output=<path>` | Output file path (default: `synkio/export-baseline.json`) |
| `--config=<file>` | Path to config file |
| `--preview` | Print output to console without writing file |
| `--verbose` | Show detailed processing information |

**Examples:**

```bash
# Export to default location
npx synkio export

# Custom output path
npx synkio export --output ./for-figma.json

# Preview without writing
npx synkio export --preview

# Show detailed parsing information
npx synkio export --verbose
```

**How it works:**

1. Reads token files from all configured collections
2. Parses tokens and extracts mode information
3. Builds baseline format compatible with Figma plugin
4. Outputs JSON that can be imported into Figma

**Typical workflow:**

```bash
# 1. Modify tokens in your codebase
# Edit tokens/theme.light.json, tokens/theme.dark.json, etc.

# 2. Export to baseline format
npx synkio export

# 3. Import into Figma
# Open Synkio plugin > Import > Select export-baseline.json
# Review diff and click "Apply to Figma"
```

The exported baseline preserves Figma variable IDs (if present in your token files), enabling intelligent diffing and preventing breaking changes when syncing back to Figma.

**Note:** The legacy command `synkio export-baseline` is deprecated but still supported. Use `synkio export` instead.

---

### rollback

Revert to the previous token state.

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
| `--output=<dir>` | Output directory (default: `synkio/docs`) |
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
- Vercel: Connect repo, set output directory to `synkio/docs`
- Docker: See hosting guide for Dockerfile

See the full [Hosting Guide](../../docs/HOSTING.md) for detailed setup instructions.

---

## GitHub PR Workflow

### Overview

The GitHub PR workflow enables designers to propose token changes that developers can review before applying. This provides a more collaborative approach compared to the direct sync workflow.

**Key Benefits:**
- Designers can create PRs directly from Figma without developer help
- Team reviews changes before applying to codebase
- Breaking changes are visible in human-readable format
- Complete audit trail in git history
- No config duplication (plugin only needs GitHub repo info)

### Setup

1. **Configure GitHub in Figma plugin:**
   - Repository: `owner/repo`
   - Branch: `main` (or your default branch)
   - Token: GitHub personal access token (for private repos)

2. **Ensure `synkio.config.json` exists in your repository**

### Workflow Steps

#### 1. Designer: Create PR from Figma

1. Make changes to variables/styles in Figma
2. Open Synkio plugin
3. Click "Create PR"
4. Plugin creates PR with:
   - `synkio/export-baseline.json` - Token data in baseline format
   - `synkio/SYNC_REPORT.md` - Human-readable change summary

**SYNC_REPORT.md includes:**
- Summary counts (new, changed, renamed, deleted tokens)
- Breaking changes section (deletions, renames)
- New tokens list
- Value changes list
- Mode changes
- Style changes

#### 2. Team: Review PR

Review the `SYNC_REPORT.md` to see:
- New tokens
- Changed values
- Deleted tokens (breaking)
- Renamed tokens (breaking)
- Mode changes
- Style changes

Approve or request changes.

#### 3. Developer: Apply Changes

After merging the PR:

```bash
# Build token files from the baseline
npx synkio build
```

This will:
- Read `synkio/baseline.json` (updated by the PR)
- Split tokens into files per your config
- Run `build.script` if configured (e.g., Style Dictionary)
- Show warnings for breaking changes

**Example output:**

```
Building tokens from baseline...

Built 24 token files from baseline.
  + 2 style files, ran build script

  Report: synkio/reports/build-2025-01-15T10-30-00.md
```

### Comparison: Pull vs PR Workflow

| Aspect | synkio pull + build | GitHub PR Workflow |
|--------|---------------------|-------------------|
| **Source** | Figma API (direct) | Pre-reviewed PR |
| **Review** | At CLI execution | In PR before merge |
| **Breaking** | pull reports, build warns | Visible in PR |
| **Audit Trail** | Baseline in `synkio/` | PR + SYNC_REPORT.md in git history |
| **Designer Autonomy** | Requires developer to run pull | Designer creates PR independently |
| **Best for** | Solo dev, quick sync | Team workflow, compliance, auditing |

### Best Practices

#### 1. Review Breaking Changes Carefully

- Check `SYNC_REPORT.md` for deletions and renames
- Search codebase for deleted token references before merging
- Update code to use new token names if needed
- Consider creating separate PRs for breaking vs non-breaking changes

#### 2. Use Meaningful PR Titles

The plugin uses the default title:
```
chore: Sync design tokens from Figma
```

Customize if needed to provide more context (e.g., "feat: Add dark mode tokens").

#### 3. Decide on SYNC_REPORT.md Persistence

**Option A: Commit to git** (recommended)
- Provides permanent record of changes
- Useful for understanding history
- Keep in repository for audit trail

**Option B: Add to .gitignore**
- Remove after PR merge
- Regenerated on each PR
- Keeps repository cleaner

#### 4. Automate with GitHub Actions (Optional)

Automatically apply changes when PR is merged:

```yaml
# .github/workflows/synkio-build.yml
name: Apply Design Tokens
on:
  push:
    branches: [main]
    paths: ['synkio/baseline.json']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx synkio build
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: Build design tokens"
          file_pattern: "tokens/**/*.json"
```

#### 5. Handle Merge Conflicts

If two PRs modify `export-baseline.json`:
- Last merge wins (baseline is source of truth)
- Re-run plugin to create new PR with latest state
- Consider using branch protection rules to prevent conflicts

#### 6. Test Locally Before Merging

```bash
# Check if token files match baseline
npx synkio diff
```

---

## Configuration

Configuration is stored in `synkio.config.json` in your project root.

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

Configure custom build scripts that run after `synkio build`:

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
| `autoRun` | `false` | Run build script without prompting |
| `script` | - | Custom build command to run after build |
| `css` | - | Built-in CSS output options |

The `build.script` option lets you integrate any build tool (Style Dictionary, Token Transformer, etc.) into your build workflow.

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
    "dir": "synkio/docs",
    "title": "Design Tokens"
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Generate documentation site |
| `dir` | `synkio/docs` | Documentation output directory |
| `title` | `Design Tokens` | Site title |

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

After changing collection config, run `npx synkio build --rebuild` to regenerate all files without fetching from Figma.

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

### Backup Protection

Create timestamped backups before overwriting files:

```bash
npx synkio build --backup
```

Backups are stored in `synkio/backups/{timestamp}/` with full directory structure preserved:

```
synkio/backups/
  └── 2025-12-22T10-29-55/
      └── tokens/
          ├── primitives/primitives.json
          └── semantic/
              ├── semantic.light.json
              └── semantic.dark.json
```

### Breaking Change Protection

Synkio detects changes that could break your code:

- **Path changes** — Token renamed (e.g., `colors.primary` -> `colors.brand.primary`)
- **Deleted variables** — Token removed entirely
- **Deleted modes** — Mode removed from collection
- **New modes** — New mode added to collection
- **Mode renames** — Mode renamed (e.g., `Mode 1` -> `light`)

When detected during pull, changes are reported but baseline is still updated (exit code 1):

```
Breaking changes detected:

  Path changes: 1
    colors.primary -> colors.brand.primary

  Run 'synkio build' to apply to token files.
```

During build, you can use `--force` to proceed despite warnings.

### Watch Mode

Continuously poll Figma for changes:

```bash
npx synkio pull --watch
npx synkio pull --watch --interval=60  # 60 second interval
```

Output:

```
Watching for changes (every 30s)

  Press Ctrl+C to stop

  [10:30:30] Checking Figma... No changes
  [10:31:00] Checking Figma... Changes detected!

  Baseline updated.
  Run 'synkio build' to generate token files.
```

### Selective Pull

Pull specific collections only:

```bash
npx synkio pull --collection=theme
npx synkio pull --collection=theme,base,icons
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

4. Configure Synkio to run the build after generating tokens:

```json
{
  "build": {
    "script": "npm run build:tokens"
  }
}
```

Now when you run `synkio build`, it will:
1. Read baseline.json
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
