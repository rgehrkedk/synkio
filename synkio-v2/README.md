# Synkio CLI v2

**The simplest way to sync design tokens from Figma to your codebase.**

Synkio is a lightweight, zero-configuration CLI that bridges the gap between your design system in Figma and your code. It's built for modern development teams who value speed, simplicity, and convention over configuration.

- **One-Command Setup**: Get started in under 2 minutes.
- **Designer-First Workflow**: Sync tokens when you're ready, directly from Figma.
- **Framework Agnostic**: Works with any project (Next.js, Vite, Remix, etc.).
- **Safe & Predictable**: Preview changes with `diff` and undo mistakes with `rollback`.

---

## Getting Started

### 1. Installation

Install the Synkio CLI in your project:

```bash
npm install @synkio/cli
```

### 2. Initializing Your Project

Run the `init` command in the root of your project:

```bash
npx synkio-v2 init
```

This will ask you a few questions:

1.  **Figma file URL?**: Paste the URL of your Figma file.
2.  **Figma access token?**: Provide your personal access token.
3.  **Output directory for tokens?**: The directory where your token files will be saved (e.g., `tokens/`).

The `init` command will create two files:
- `tokensrc.json`: Your Synkio configuration file.
- `.env`: To securely store your `FIGMA_TOKEN`.

### 3. Syncing from Figma

To perform the first sync, you need to get a **Node ID** from the Synkio Figma plugin.

1.  **Open your design file in Figma.**
2.  **Run the Synkio Figma plugin.**
3.  **Select the layer** that contains your design tokens (a frame, group, or component).
4.  With the layer selected, click **"Sync to Node"** in the plugin. This will store your token data on a hidden node in your Figma file.
5.  The plugin will give you a **Node ID**. Copy it.
6.  **Paste the Node ID** into the `nodeId` field in your `tokensrc.json` file.

Now, you can run the `sync` command:

```bash
npx synkio-v2 sync
```

Your tokens will be fetched from Figma and saved as JSON files in your output directory!

---

## Commands

### `synkio init`

Initializes a new project. Can be run interactively or with flags for automated setups.

**Usage:**
```bash
npx synkio-v2 init
```

**Options:**
- `--figma-url=<url>`: The URL of the Figma file.
- `--token=<token>`: Your Figma personal access token.
- `--output-dir=<dir>`: The directory to save tokens in.

### `synkio sync`

Fetches the latest tokens from Figma, compares them with your local baseline, and saves them to your output directory.

**Built-in breaking change protection:** If breaking changes are detected (path changes, deleted variables, or deleted modes), the sync will be blocked and you'll see a summary of what would break. This prevents accidental breakage from "small changes" that aren't small.

**Usage:**
```bash
npx synkio-v2 sync
```

**Options:**
- `--preview`: Show what would change without syncing. Use this to review changes before applying them (like a designer's PR).
- `--force`: Bypass breaking change protection and sync anyway.
- `--report`: Generate a markdown report (`.synkio/sync-report.md`) after syncing.
- `--no-report`: Skip report generation even if enabled in config.

**Examples:**
```bash
# Preview changes before syncing
npx synkio-v2 sync --preview

# Force sync even with breaking changes
npx synkio-v2 sync --force

# Sync and generate a report for your commit
npx synkio-v2 sync --report

# Sync without generating a report
npx synkio-v2 sync --no-report
```

### `synkio rollback`

Reverts the last `sync`, restoring your local tokens to their previous state.

**Usage:**
```bash
npx synkio-v2 rollback
```

### `synkio validate`

Checks your `tokensrc.json` file for correctness and verifies the connection to the Figma API.

**Usage:**
```bash
npx synkio-v2 validate
```

### `synkio tokens`

A debug utility that prints the contents of your current local token baseline (`.synkio/baseline.json`).

**Usage:**
```bash
npx synkio-v2 tokens
```

---

## Configuration

### `tokensrc.json`

This file is the heart of your Synkio configuration.

```json
{
  "version": "2.0.0",
  "figma": {
    "fileId": "your-figma-file-id",
    "nodeId": "your-figma-node-id",
    "accessToken": "${FIGMA_TOKEN}"
  },
  "output": {
    "dir": "tokens",
    "format": "json"
  },
  "sync": {
    "report": true,
    "reportHistory": false
  },
  "collections": {
    "theme": {
      "splitModes": false
    }
  }
}
```

- **`figma.fileId`**: The ID of your Figma file, extracted from the URL.
- **`figma.nodeId`**: The ID of the node containing your token data, provided by the plugin.
- **`figma.accessToken`**: A placeholder for your Figma token. Should be `${FIGMA_TOKEN}`.
- **`output.dir`**: The directory where your token files will be written.
- **`sync`**: (Optional) Sync behavior configuration.
  - **`report`**: Auto-generate markdown reports after sync. Default is `true`.
  - **`reportHistory`**: Keep timestamped report history (e.g., `sync-report-2025-01-15T10-30-00.md`). Default is `false`.
- **`collections`**: (Optional) Per-collection configuration for how tokens are processed.
  - **`splitModes`**: Controls whether multi-mode collections are split into separate files. Default is `true`.

### Collection Mode Splitting

By default, Figma collections with multiple modes (e.g., light/dark) are split into separate files:

| Collection | Modes | Default Output |
|------------|-------|----------------|
| `theme` | light, dark | `theme.light.json`, `theme.dark.json` |

You can disable this behavior per collection to get a single file with modes nested:

```json
{
  "collections": {
    "theme": {
      "splitModes": false
    }
  }
}
```

This produces a single `theme.json` with the structure:
```json
{
  "light": { "bg": { "value": "#ffffff" }, ... },
  "dark": { "bg": { "value": "#000000" }, ... }
}
```

### `.env`

The `.env` file should contain your Figma personal access token. The `init` command creates this for you.

```
FIGMA_TOKEN=your-secret-token
```

---

## How to get a Figma Access Token

1.  Go to your Figma account settings.
2.  In the "Personal access tokens" section, create a new token.
3.  Copy the token and provide it to the `synkio init` command.