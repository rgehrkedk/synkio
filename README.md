# Synkio

**Sync Figma variables to code. No Enterprise plan required.**

[![npm version](https://img.shields.io/npm/v/synkio.svg)](https://www.npmjs.com/package/synkio)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Synkio is a developer-friendly CLI that bridges the gap between Figma design variables and your codebase. It bypasses the need for Figma's Enterprise REST API by utilizing the Plugin API, giving you a powerful sync workflow on any Figma plan.

## Why Synkio?

Most token sync tools require expensive Figma Enterprise licenses to access variables via the REST API. Synkio takes a smarter approach:

- 🔓 **No Enterprise Needed** — Works with Free, Professional, and Organization plans
- 🛡️ **Breaking Change Protection** — Intelligent diffing based on permanent Variable IDs prevents accidental production breaks
- ⚡ **Developer Experience** — A simple CLI workflow that lives in your terminal, not a 3rd party dashboard
- 📦 **Standard Output** — Generates W3C DTCG-compliant tokens ready for Style Dictionary or direct use

### Comparison

| Feature | Synkio | Tokens Studio | SaaS Platforms | Figma Enterprise API |
|---------|--------|---------------|----------------|----------------------|
| **Figma Plan** | Any (Free, Pro, Org) | Any | Varies | Enterprise Only |
| **Cost** | Free (Open Source) | Freemium | Subscription ($$$) | Included in Ent. Plan |
| **Data Source** | Native Figma Variables | Proprietary JSON | Cloud Database | Native Figma Variables |
| **Sync Method** | Hybrid (Plugin + CLI) | Plugin (Git Sync) | Cloud Connector | Direct REST API |
| **Safety Logic** | ID-based Diffing | Git Diff (File-based) | Version Control | Manual (Custom Code) |
| **Setup Time** | < 5 min | High (Figma config heavy) | Medium (Account setup) | Depends (Custom Scripting) |
| **Developer UX** | CLI / Terminal | GUI / Plugin | Web Dashboard | Custom |

## How It Works

Synkio uses a "Hybrid Sync" method:

1. **The Plugin** — Runs inside Figma to read variables and store them in the file's `sharedPluginData`
2. **The CLI** — Fetches this data via the standard Figma API, compares it with your local tokens, and generates output files

This gives you the accuracy of an internal plugin with the automation speed of a CLI.

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
2. Run the [Synkio plugin](packages/figma-plugin/synkio-sync/)
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
| `synkio sync --force` | Overwrite local files, ignoring safety warnings |
| `synkio rollback` | Revert to previous sync |
| `synkio rollback --preview` | Preview rollback changes |
| `synkio validate` | Check config and connection |

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
  }
}
```

See the [User Guide](packages/cli/USER_GUIDE.md) for full configuration options.

## Documentation

- [User Guide](packages/cli/USER_GUIDE.md) — Complete reference for all commands and options
- [CLI Package](packages/cli/) — npm package source
- [Figma Plugin](packages/figma-plugin/synkio-sync/) — Figma plugin source

## Repository Structure

```
synkio/
├── packages/
│   ├── cli/                 # npm package (synkio)
│   │   ├── src/             # TypeScript source
│   │   └── USER_GUIDE.md    # Full documentation
│   └── figma-plugin/
│       └── synkio-sync/     # Figma plugin
└── README.md
```

## Contributing

Synkio is an open source project built to solve a specific frustration: the lack of easy variable syncing for non-Enterprise teams.

Contributions are welcome! If there's a way to make the TypeScript cleaner, the CLI faster, or the tests more robust, please open a Pull Request.

## License

MIT © [rgehrkedk](https://github.com/rgehrkedk)
