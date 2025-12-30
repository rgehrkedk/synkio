# Synkio

**Sync Figma variables to code. No Enterprise plan required.**

[![npm version](https://img.shields.io/npm/v/synkio.svg)](https://www.npmjs.com/package/synkio)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Synkio is a developer-friendly CLI that bridges the gap between Figma design variables and your codebase. It bypasses the need for Figma's Enterprise REST API by utilizing the Plugin API, giving you a powerful sync workflow on any Figma plan.

## Requirements

- **Node.js**: v18 or later
- **Figma Plugin**: [Synkio Sync](https://github.com/rgehrkedk/synkio/tree/main/packages/figma-plugin/synkio-sync) *(optional - see [Plugin-free Import](#plugin-free-import))*

## Why Synkio?

Most token sync tools require expensive Figma Enterprise licenses to access variables via the REST API. Synkio takes a smarter approach:

- 🔓 **No Enterprise Needed** — Works with Free, Professional, and Organization plans
- 🛡️ **Breaking Change Protection** — Intelligent diffing based on permanent Variable IDs prevents accidental production breaks
- ⚡ **Developer Experience** — A simple CLI workflow that lives in your terminal, not a 3rd party dashboard
- 📦 **Standard Output** — Generates W3C DTCG-compliant tokens ready for Style Dictionary or direct use

## Quick Start

### 1. Install

```bash
npm install synkio --save-dev
```

### 2. Initialize

```bash
npx synkio init
```

This creates:
- `synkio.config.json` - Configuration file with your Figma file ID
- `.env` - Contains your `FIGMA_TOKEN` (must be in project root)

The `.env` file is automatically added to your `.gitignore` to keep your token secure.

**Important:** The CLI loads `.env` from your current working directory (where you run the command). Do not place it in subdirectories like `synkio/`.

### 3. Install Style Dictionary (Optional)

If you're using Style Dictionary output mode (`output.mode: "style-dictionary"`), install it as a peer dependency:

```bash
npm install -D style-dictionary
```

For simple projects using JSON or CSS output, this is not required.

### 4. Prepare Figma File

1. Open your Figma file
2. Install and run the [Synkio Sync plugin](https://github.com/rgehrkedk/synkio/tree/main/packages/figma-plugin/synkio-sync)
3. Click **"Prepare for Sync"**

This snapshots your variables so the CLI can access them.

### 5. Sync

```bash
npx synkio sync
```

Your tokens are now in your project! 🎉

## Commands

| Command | Description |
|---------|-------------|
| `synkio --version` | Show CLI version |
| `synkio init` | Initialize project with Figma credentials |
| `synkio sync` | Fetch tokens from Figma |
| `synkio sync --preview` | Preview changes without applying |
| `synkio sync --watch` | Poll for changes automatically |
| `synkio sync --collection=<name>` | Sync specific collection(s) |
| `synkio sync --regenerate` | Regenerate files from existing baseline (no Figma fetch) |
| `synkio sync --force` | Overwrite local files, ignoring safety warnings |
| `synkio rollback` | Revert to previous sync |
| `synkio rollback --preview` | Preview rollback changes |
| `synkio validate` | Check config and connection |
| `synkio docs` | Generate documentation site |
| `synkio docs --open` | Generate and open in browser |
| `synkio import <path>` | Import from Figma native JSON export |

See the [User Guide](USER_GUIDE.md) for all options and configuration.

## Smart Safety Checks

Synkio acts as a gatekeeper for your design system. Unlike simple exporters, it understands the difference between a rename and a deletion:

- **Renames** — If a designer changes `Brand Blue` to `Primary Blue`, Synkio sees the ID match and reports it as a **rename**, not a deletion
- **Deletions** — Blocks sync if a variable used in your code has been deleted in Figma
- **Mode Changes** — Detects if a theme mode (e.g., "Dark Mode") was added or removed

Use `npx synkio sync --preview` to see a full report of changes without writing any files.

## Configuration

Synkio is configured via `synkio.config.json`:

```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "your-file-id",
    "accessToken": "${FIGMA_TOKEN}"
  },
  "output": {
    "dir": "tokens"
  },
  "css": {
    "enabled": true,
    "utilities": true,
    "transforms": { "useRem": true }
  },
  "docs": {
    "enabled": true
  }
}
```

### Output Modes

Synkio supports three output modes:

| Mode | Description |
|------|-------------|
| **JSON** (default) | W3C DTCG-compliant token files |
| **CSS** | Zero-dependency CSS custom properties |
| **Style Dictionary** | Full platform support (SCSS, JS, TS, iOS, Android, etc.) |

For simple projects, use `css.enabled: true`. For advanced needs, enable Style Dictionary mode:

```json
{
  "output": {
    "mode": "style-dictionary",
    "styleDictionary": {
      "configFile": "./sd.config.js"
    }
  }
}
```

Then install Style Dictionary as a peer dependency:

```bash
npm install style-dictionary --save-dev
```

### Per-Collection Configuration

You can configure each collection individually with custom output directories and mode splitting:

```json
{
  "output": {
    "dir": "tokens"
  },
  "collections": {
    "colors": {
      "dir": "src/styles/tokens/colors",
      "splitModes": false
    },
    "primitives": {
      "dir": "src/styles/tokens/primitives",
      "splitModes": false
    },
    "typography": {
      "dir": "src/styles/tokens/typography",
      "splitModes": true
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dir` | string | `output.dir` | Output directory for this collection |
| `splitModes` | boolean | `true` | Split modes into separate files (`colors.light.json`, `colors.dark.json`) |
| `includeMode` | boolean | `true` | Include mode as first-level key in output |

Use `synkio sync --regenerate` to regenerate files after changing collection config.

See the [User Guide](USER_GUIDE.md#configuration) for full configuration options.

## Plugin-free Import

Synkio can import tokens directly from Figma's native JSON export — **no plugin required**.

### How It Works

1. In Figma, select your variable collection
2. Export via **File → Export → Variables → JSON**
3. Import into Synkio:

```bash
npx synkio import ./figma-exports/ --collection=theme
```

This preserves Figma's `variableId` for full breaking change protection, just like the plugin workflow.

### When to Use Import vs Sync

| Workflow | Use Case |
|----------|----------|
| `synkio sync` | Automated CI/CD, real-time sync with Figma |
| `synkio import` | Manual handoff, offline workflows, no plugin needed |

Both workflows support the same breaking change detection and output generation.

See the [User Guide](USER_GUIDE.md#import) for detailed import options.

## Documentation

- [User Guide](USER_GUIDE.md) — Complete reference for all commands and options
- [Hosting Guide](../../docs/HOSTING.md) — Deploy your design tokens docs to GitHub Pages, Netlify, Vercel, and more

## License

MIT © [rgehrkedk](https://github.com/rgehrkedk)
