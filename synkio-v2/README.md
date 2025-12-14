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

Fetches the latest tokens from Figma, saves them to your output directory, and creates a local baseline for comparison.

**Usage:**
```bash
npx synkio-v2 sync
```

### `synkio diff`

Compares the tokens in your local output directory with the latest tokens from Figma and shows a summary of changes.

**Usage:**
```bash
npx synkio-v2 diff
```
**Options:**
- `--output=markdown`: Generates a `diff-report.md` file in the `.figma` directory.

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

A debug utility that prints the contents of your current local token baseline (`.figma/baseline.json`).

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
  }
}
```

- **`figma.fileId`**: The ID of your Figma file, extracted from the URL.
- **`figma.nodeId`**: The ID of the node containing your token data, provided by the plugin.
- **`figma.accessToken`**: A placeholder for your Figma token. Should be `${FIGMA_TOKEN}`.
- **`output.dir`**: The directory where your token files will be written.

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