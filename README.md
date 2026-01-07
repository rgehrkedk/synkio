# Synkio

**Sync Figma variables to code. No Enterprise plan required.**

[![npm version](https://img.shields.io/npm/v/synkio.svg)](https://www.npmjs.com/package/synkio)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

Synkio is a developer-friendly CLI that bridges the gap between Figma design variables and your codebase. It bypasses the need for Figma's Enterprise REST API by utilizing the Plugin API, giving you a powerful sync workflow on any Figma plan.

---

## Table of Contents

- [Why Synkio?](#why-synkio)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Configuration](#configuration)
- [Example Output](#example-output)
- [Smart Safety Checks](#smart-safety-checks)
- [Documentation Site](#documentation-site)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)
- [Development](#development)
- [Documentation](#documentation)
- [Repository Structure](#repository-structure)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Why Synkio?

Most token sync tools require expensive Figma Enterprise licenses to access variables via the REST API. Synkio takes a smarter approach:

- **No Enterprise Needed** — Works with Free, Professional, and Organization plans
- **GitHub PR Workflow** — Designers create PRs directly from Figma that teams can review before applying
- **Breaking Change Protection** — Intelligent diffing based on permanent Variable IDs prevents accidental production breaks
- **Developer Experience** — A simple CLI workflow that lives in your terminal, not a 3rd party dashboard
- **Standard Output** — Generates W3C DTCG-compliant tokens ready for Style Dictionary or direct use

### Comparison

| Feature | Synkio | Tokens Studio | SaaS Platforms | Figma Enterprise API |
|---------|:------:|:-------------:|:--------------:|:--------------------:|
| **Any Figma Plan** | ✓ | ✓ | Varies | ✗ |
| **Free & Open Source** | ✓ | ✗ | ✗ | N/A |
| **Native Figma Variables** | ✓ | ✗ | ✗ | ✓ |
| **ID-based Diffing** | ✓ | ✗ | ✗ | ✗ |
| **CLI-first UX** | ✓ | ✗ | ✗ | ✗ |
| **Setup Time** | < 5 min | High | Medium | Varies |

---

## How It Works

Synkio uses a "Hybrid Sync" method:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Figma File    │      │   Figma API     │      │  Your Project   │
│                 │      │                 │      │                 │
│  ┌───────────┐  │      │                 │      │  tokens/        │
│  │  Plugin   │──┼──────┼─► sharedData ───┼──────┼─► *.json        │
│  └───────────┘  │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
     Run once              CLI fetches             DTCG-compliant
                           via standard API        token files
```

1. **The Plugin** — Runs inside Figma to read variables and store them in the file's `sharedPluginData`
2. **The CLI** — Fetches this data via the standard Figma API, compares it with your local tokens, and generates output files

This gives you the accuracy of an internal plugin with the automation speed of a CLI.

### Workflows

Synkio supports two workflows:

**Direct Sync** (traditional):
```bash
# Designer runs plugin in Figma
# Developer pulls and builds
npx synkio pull   # Fetch from Figma, update baseline
npx synkio build  # Generate token files
```

**GitHub PR Workflow** (team-friendly):
```bash
# 1. Designer creates PR from Figma plugin
# 2. Team reviews SYNC_REPORT.md in PR
# 3. Merge PR
# 4. Developer applies changes
npx synkio build --from synkio/export-baseline.json
```

The PR workflow enables:
- Designer autonomy (create PRs without developer help)
- Team review before applying changes
- Breaking change visibility in human-readable format
- Complete audit trail in git history

See the [User Guide - GitHub PR Workflow](packages/cli/USER_GUIDE.md#github-pr-workflow) for detailed setup and best practices.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18.0.0 or higher** — [Download Node.js](https://nodejs.org/)
- **Figma Account** — Free, Professional, or Organization plan
- **Figma Personal Access Token** — [Generate one here](https://www.figma.com/developers/api#access-tokens)

---

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
- `.env.example` - Template for your `FIGMA_TOKEN`

**Important:** Copy `.env.example` to `.env` and add your Figma token.

### 3. Prepare Figma File

1. Open your Figma file
2. Run **Plugins > Synkio**
3. Click **"Prepare for Sync"**

This snapshots your variables so the CLI can access them.

### 4. Pull and Build

```bash
npx synkio pull   # Fetch from Figma, update baseline
npx synkio build  # Generate token files
```

Your tokens are now in your project!

---

## Commands

| Command | Description |
|---------|-------------|
| `synkio init` | Initialize project with Figma credentials |
| `synkio pull` | Fetch tokens from Figma, update baseline |
| `synkio pull --preview` | Preview changes without updating baseline |
| `synkio pull --watch` | Poll for changes automatically |
| `synkio pull --collection=<name>` | Pull specific collection(s) |
| `synkio build` | Generate token files from baseline |
| `synkio build --force` | Apply changes despite breaking change warnings |
| `synkio build --rebuild` | Regenerate all files from existing baseline |
| `synkio build --from <path>` | Build from custom baseline path |
| `synkio import` | Import from Figma's native JSON export (no plugin) |
| `synkio export-baseline` | Generate baseline from existing token files |
| `synkio diff` | Compare baseline with token files on disk |
| `synkio docs` | Generate documentation site |
| `synkio docs --open` | Generate and open docs in browser |
| `synkio rollback` | Revert to previous sync |
| `synkio rollback --preview` | Preview what rollback would restore |
| `synkio validate` | Check config and connection |
| `synkio tokens` | Debug utility to view current baseline |
| `synkio --version` | Show CLI version |

See the [User Guide](packages/cli/USER_GUIDE.md) for full command options and examples.

---

## Configuration

Synkio is configured via `synkio.config.json`:

```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "your-file-id",
    "accessToken": "${FIGMA_TOKEN}"
  },
  "tokens": {
    "dir": "tokens",
    "splitBy": "mode"
  }
}
```

### Build Pipeline

Synkio focuses on syncing tokens. For build pipelines, use the `build.script` option:

```json
{
  "build": {
    "script": "npm run build:tokens"
  }
}
```

This runs your custom build command after sync, letting you integrate Style Dictionary or any other tool.

See the [User Guide](packages/cli/USER_GUIDE.md) for full configuration options including:
- Per-collection splitting strategies (`mode`, `group`, `none`)
- CSS custom properties generation
- Figma styles (paint, text, effect) sync
- Import/export configuration

---

## Example Output

After running `synkio pull` and `synkio build`, your token files will look like this (DTCG format):

```json
{
  "colors": {
    "primary": {
      "$value": "#0066cc",
      "$type": "color"
    },
    "secondary": {
      "$value": "#6b7280",
      "$type": "color"
    }
  },
  "spacing": {
    "sm": {
      "$value": "8px",
      "$type": "dimension"
    },
    "md": {
      "$value": "16px",
      "$type": "dimension"
    }
  }
}
```

---

## Smart Safety Checks

Synkio acts as a gatekeeper for your design system. Unlike simple exporters, it understands the difference between a rename and a deletion:

- **Renames** — If a designer changes `Brand Blue` to `Primary Blue`, Synkio sees the ID match and reports it as a **rename**, not a deletion
- **Deletions** — Blocks sync if a variable used in your code has been deleted in Figma
- **Mode Changes** — Detects if a theme mode (e.g., "Dark Mode") was added or removed

Use `npx synkio pull --preview` to see a full report of changes without updating baseline.

```
BREAKING CHANGES DETECTED

  Path changes: 1
    colors.primary → colors.brand.primary

  These changes may break your code.

  Run 'synkio build --force' to apply anyway.
```

---

## Documentation Site

Generate a static documentation site for your design tokens:

```bash
npx synkio docs --open
```

The generated site includes:
- Color palettes with visual swatches
- Typography scales with previews
- Spacing tokens visualization
- CSS custom properties reference
- Copy-to-clipboard functionality

Output directory: `synkio/docs/` (configurable)

See the [Hosting Guide](docs/HOSTING.md) for deployment options (GitHub Pages, Netlify, Vercel).

---

## Troubleshooting

### "FIGMA_TOKEN environment variable is not set"

Make sure your `.env` file is in the **project root** (where you run `npx synkio pull`), not in subdirectories:

```
my-project/
├── .env              ✓ Correct
├── synkio.config.json
└── tokens/
```

### "No plugin data found"

Run the Synkio Figma plugin and click "Prepare for Sync" before running the CLI.

### "Cannot find module" or ESM errors

Synkio requires Node.js 18+. Check your version:

```bash
node --version
```

### Debug mode

Enable verbose logging for troubleshooting:

```bash
DEBUG=synkio npx synkio pull
```

---

## Examples

The repository includes working examples to help you get started:

| Example | Description |
|---------|-------------|
| [demo-app](examples/demo-app/) | Full integration example with CSS generation |
| [import-demo](examples/import-demo/) | Import workflow using Figma's native JSON export |
| [export-baseline-demo](examples/export-baseline-demo/) | Code-to-Figma roundtrip workflow |
| [starter-app](examples/starter-app/) | Minimal starter template |

---

## Development

If you're cloning this repo for development:

### 1. Install dependencies

```bash
cd packages/cli
npm install
npm run build
```

### 2. Link the CLI locally

```bash
npm link
```

### 3. Build the Figma plugin

```bash
cd ../figma-plugin/synkio-sync
npm install
npm run build
```

### 4. Run tests

```bash
cd ../../cli
npm run test
npm run test:watch  # Watch mode
```

**Note:** When developing locally, `npx synkio` fetches from npm. Use one of these instead:

```bash
synkio pull                              # After npm link
node packages/cli/dist/cli/bin.js pull   # Direct execution
```

---

## Documentation

- [User Guide](packages/cli/USER_GUIDE.md) — Complete reference for all commands and options
- [Configuration Guide](docs/CONFIGURATION.md) — Detailed configuration options
- [Hosting Guide](docs/HOSTING.md) — Deploy your documentation site
- [CLI Package](packages/cli/) — npm package source
- [Figma Plugin](packages/figma-plugin/) — Figma plugin source

---

## Repository Structure

```
synkio/
├── packages/
│   ├── cli/                    # npm package (synkio)
│   │   ├── src/                # TypeScript source
│   │   │   ├── cli/            # Command implementations
│   │   │   ├── core/           # Business logic (sync, compare, tokens)
│   │   │   ├── types/          # Zod schemas and TypeScript types
│   │   │   └── utils/          # Shared utilities
│   │   └── USER_GUIDE.md       # Full documentation
│   └── figma-plugin/
│       ├── synkio-sync/        # Minimal sync plugin
│       └── synkio-ui/          # UI plugin with diff view
├── examples/                   # Working example projects
├── docs/                       # Additional documentation
└── README.md
```

---

## Contributing

Synkio is an open source project built to solve a specific frustration: the lack of easy variable syncing for non-Enterprise teams.

Contributions are welcome! If there's a way to make the TypeScript cleaner, the CLI faster, or the tests more robust, please open a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Security

- **Local-only tokens** — Your Figma access token is stored in your local `.env` file and never sent to third-party servers
- **Standard Figma API** — Synkio only communicates with official Figma API endpoints
- **No telemetry** — The CLI does not collect any usage data or analytics

Report security vulnerabilities via [GitHub Issues](https://github.com/rgehrkedk/synkio/issues).

---

## License

MIT © [rgehrkedk](https://github.com/rgehrkedk)
