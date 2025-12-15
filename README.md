# Synkio

**Sync Figma design tokens to code in seconds.**

Synkio is a lightweight CLI that bridges Figma variables and your codebase. No complex setup, no plugins to configure—just run and sync.

[![npm version](https://img.shields.io/npm/v/synkio.svg)](https://www.npmjs.com/package/synkio)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **⚡ One-command setup** — Get started in under 2 minutes
- **🔒 Breaking change protection** — Prevents accidental breakage from design changes
- **👀 Preview mode** — Review changes before applying (like a designer's PR)
- **↩️ Rollback** — Instantly revert to previous token state
- **📊 DTCG format** — Standards-compliant output with `$value` and `$type`
- **🎯 Selective sync** — Sync specific collections only
- **👁️ Watch mode** — Auto-sync when Figma changes

## Quick Start

### 1. Install

```bash
npm install synkio --save-dev
```

### 2. Initialize

```bash
npx synkio init
```

This creates `tokensrc.json` and `.env` with your Figma credentials.

### 3. Run the Figma Plugin

Open your Figma file and run the **Synkio** plugin to prepare your variables.

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
| `synkio sync --watch` | Watch for Figma changes |
| `synkio sync --collection=<name>` | Sync specific collection(s) |
| `synkio rollback` | Revert to previous sync |
| `synkio rollback --preview` | Preview rollback changes |
| `synkio validate` | Check config and connection |

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

## Breaking Change Protection

Synkio automatically detects changes that could break your code:

- **Path changes** — Token renamed
- **Deleted variables** — Token removed  
- **Deleted modes** — Theme mode removed
- **New modes** — New theme mode added

When detected, sync is blocked until you review with `--preview` or force with `--force`.

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
│   │   ├── USER_GUIDE.md    # Full documentation
│   │   └── ROADMAP.md       # Planned features
│   └── figma-plugin/
│       └── synkio-sync/     # Figma plugin
└── README.md
```

## License

MIT © [Synkio](https://github.com/rgehrkedk/synkio)
