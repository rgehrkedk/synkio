# Synkio

**Sync Figma variables to code. No Enterprise plan required.**

[![npm version](https://img.shields.io/npm/v/synkio.svg)](https://www.npmjs.com/package/synkio)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Synkio is a developer-friendly CLI that bridges the gap between Figma design variables and your codebase. It bypasses the need for Figma's Enterprise REST API by utilizing the Plugin API, giving you a powerful sync workflow on any Figma plan.

## Requirements

- **Figma Plugin**: [Synkio Sync](https://github.com/rgehrkedk/synkio/tree/main/packages/figma-plugin/synkio-sync) *(required to export variables)*
- **Node.js**: v18 or later

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

This creates `tokensrc.json` and adds `.env` to your `.gitignore`.

### 3. Prepare Figma File

1. Open your Figma file
2. Run the [Synkio plugin](https://github.com/rgehrkedk/synkio/tree/main/packages/figma-plugin/synkio-sync)
3. Click **"Prepare for Sync"**

This snapshots your variables so the CLI can access them.

### 4. Sync

```bash
npx synkio sync
```

Your tokens are now in your project! 🎉

## Commands

| Command | Description |
|---------|-------------|
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

See the [User Guide](USER_GUIDE.md) for all options and configuration.

## Smart Safety Checks

Synkio acts as a gatekeeper for your design system. Unlike simple exporters, it understands the difference between a rename and a deletion:

- **Renames** — If a designer changes `Brand Blue` to `Primary Blue`, Synkio sees the ID match and reports it as a **rename**, not a deletion
- **Deletions** — Blocks sync if a variable used in your code has been deleted in Figma
- **Mode Changes** — Detects if a theme mode (e.g., "Dark Mode") was added or removed

Use `npx synkio sync --preview` to see a full report of changes without writing any files.

## Configuration

Synkio is configured via `tokensrc.json`:

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

## Documentation

- [User Guide](USER_GUIDE.md) — Complete reference for all commands and options
- [Hosting Guide](../../docs/HOSTING.md) — Deploy your design tokens docs to GitHub Pages, Netlify, Vercel, and more

## License

MIT © [rgehrkedk](https://github.com/rgehrkedk)
