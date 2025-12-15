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
| `synkio rollback` | Revert to previous sync |
| `synkio validate` | Check config and connection |

See the [User Guide](USER_GUIDE.md) for all options and configuration.

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

See the [User Guide](USER_GUIDE.md#configuration) for full configuration options.

## Breaking Change Protection

Synkio automatically detects changes that could break your code:

- **Path changes** — Token renamed
- **Deleted variables** — Token removed
- **Deleted modes** — Theme mode removed

When detected, sync is blocked until you review with `--preview` or force with `--force`.

## Documentation

- [User Guide](USER_GUIDE.md) — Complete reference for all commands and options

## License

MIT © [Synkio](https://github.com/rgehrkedk/synkio)
