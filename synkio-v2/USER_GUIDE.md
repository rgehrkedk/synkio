# Synkio v2 User Guide

This guide provides a comprehensive overview of the Synkio v2 CLI, its commands, and how to configure it to sync your design tokens from Figma.

## How it Works

Synkio v2 works by connecting to your Figma file, locating a specific node you designate, and extracting design token data from it. This data is then processed and saved as JSON files in your project.

The process is as follows:

1.  **Configuration**: You provide Synkio with access to your Figma file and specify an output directory via the `tokensrc.json` file.
2.  **Figma Plugin**: You use the Synkio Figma plugin to select the exact layer (frame, component, etc.) that contains your tokens and get a **Node ID**. This tells Synkio precisely where to look for your tokens.
3.  **Syncing**: The `sync` command connects to Figma, finds the node by its ID, and reads the token data.
4.  **File Generation**: Synkio processes the data and generates a set of JSON files, neatly organized in your specified output directory.

This approach ensures that you have full control over what gets synced and that the process is predictable and repeatable.

## Getting Started

Follow these steps to get Synkio v2 up and running in your project.

### 1. Installation

Install the Synkio CLI as a development dependency in your project:

```bash
npm install @synkio/cli --save-dev
```

### 2. Initialization

Run the `init` command to set up your project:

```bash
npx synkio-v2 init
```

The CLI will guide you through the setup process, asking for:

- **Figma file URL**: The URL of the Figma file containing your design tokens.
- **Figma access token**: Your personal access token for the Figma API.
- **Output directory**: The local directory where your token files will be saved.

This creates two important files:

- `tokensrc.json`: The main configuration file for Synkio.
- `.env`: Stores your Figma access token securely.

### 3. Get the Figma Node ID

To sync your tokens, you need to tell Synkio exactly where to find them.

1.  Open your design file in Figma.
2.  Run the **Synkio Figma plugin**.
3.  Select the specific layer (frame, group, or component) that contains your design tokens.
4.  In the plugin, click **"Sync to Node"**.
5.  The plugin will display a **Node ID**. Copy it.

### 4. Update Configuration

Paste the copied Node ID into the `nodeId` field in your `tokensrc.json` file:

```json
{
  "version": "2.0.0",
  "figma": {
    "fileId": "your-file-id",
    "nodeId": "PASTE_NODE_ID_HERE", // <-- Paste the ID here
    "accessToken": "${FIGMA_TOKEN}"
  },
  "output": {
    "dir": "tokens",
    "format": "json"
  }
}
```

### 5. Run the Sync

You're all set! Run the `sync` command to fetch your tokens:

```bash
npx synkio-v2 sync
```

Synkio will connect to Figma, download your tokens, and save them in the directory you configured.

## Configuration (`tokensrc.json`)

The `tokensrc.json` file defines how Synkio behaves.

```json
{
  "version": "2.0.0",
  "figma": {
    "fileId": "your-figma-file-id",
    "nodeId": "your-figma-node-id",
    "accessToken": "${FIGMA_TOKEN}",
    "baseUrl": "https://api.figma.com/v1"
  },
  "output": {
    "dir": "tokens",
    "format": "json"
  }
}
```

- `version`: The configuration schema version. Must be `"2.0.0"`.
- `figma.fileId`: The ID of your Figma file, extracted from its URL.
- `figma.nodeId`: The unique ID of the Figma node that contains your tokens.
- `figma.accessToken`: A placeholder for your Figma token, which is loaded from your `.env` file (`FIGMA_TOKEN`).
- `figma.baseUrl` (optional): For Figma Enterprise users, this allows you to specify a custom API endpoint.
- `output.dir`: The destination directory for your generated token files.
- `output.format`: The file format for the tokens. Currently, only `"json"` is supported.

## Commands

### `init`

Initializes your project by creating `tokensrc.json` and `.env` files.

**Usage:**
```bash
npx synkio-v2 init
```

**Options:**
- `--figmaUrl <url>`: Set the Figma file URL.
- `--token <token>`: Set the Figma access token.
- `--outputDir <dir>`: Set the output directory for tokens.
- `--baseUrl <url>`: Set a custom Figma API base URL.

### `sync`

Fetches the latest tokens from Figma, processes them, and saves them to your output directory.

**Usage:**
```bash
npx synkio-v2 sync
```

### `diff`

Compares your local tokens with the ones in Figma and shows a summary of the differences. This is useful for reviewing changes before syncing.

**Usage:**
```bash
npx synkio-v2 diff
```

### `rollback`

Reverts the last sync, restoring your local tokens to their previous state.

**Usage:**
```bash
npx synkio-v2 rollback
```

### `validate`

Checks your `tokensrc.json` file for correctness and verifies the connection to the Figma API.

**Usage:**
```bash
npx synkio-v2 validate
```

### `tokens`

A debug utility that prints the contents of your current local token baseline.

**Usage:**
```bash
npx synkio-v2 tokens
```
