# Synkio Figma Plugin

Sync Figma design variables to code without requiring Figma's Enterprise plan.

## Features

- **Two-way sync** — Push variables from Figma to code, or apply code changes back to Figma
- **ID-based diffing** — Intelligently detects renames vs deletions using Figma's permanent variable IDs
- **GitHub integration** — Fetch baselines directly from GitHub, create PRs with one click
- **Style support** — Sync paint styles, text styles, and effect styles alongside variables
- **DTCG compliant** — Generates W3C Design Tokens Community Group format

## Quick Start

1. Install the plugin from the Figma Community (or load from development)
2. Open a Figma file with variables
3. Click **Setup** to configure GitHub connection or URL source
4. Click **Sync to Code** to export your variables

## Plugin Setup for Development

### 1. Get a Plugin ID

Before running the plugin in development mode, you need a Figma Plugin ID:

1. Go to [figma.com/developers/plugins](https://www.figma.com/developers/plugins)
2. Click **Create new plugin**
3. Enter a name (e.g., "Synkio Dev")
4. Select **Development** as the type
5. Copy the generated Plugin ID (a long numeric string)

### 2. Update manifest.json

Open `manifest.json` and replace the placeholder:

```json
{
  "name": "Synkio",
  "id": "YOUR_PLUGIN_ID_HERE",  // ← Replace this
  "api": "1.0.0",
  ...
}
```

### 3. Build and Run

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Or watch for changes during development
npm run watch
```

### 4. Load in Figma

1. Open Figma Desktop
2. Go to **Plugins** → **Development** → **Import plugin from manifest...**
3. Select the `manifest.json` file from this directory
4. The plugin will appear in your Development plugins

## Configuration

### GitHub Source

Connect to a GitHub repository to:
- Fetch `export-baseline.json` for Code → Figma sync
- Create PRs with updated `baseline.json` for Figma → Code sync

Required settings:
- **Owner**: GitHub username or organization
- **Repository**: Repository name
- **Branch**: Branch to fetch from (default: `main`)
- **Path**: Path to export-baseline.json (default: `synkio/export-baseline.json`)
- **Token**: GitHub Personal Access Token (see [Security Guide](docs/SECURITY.md))

### URL Source

Alternatively, provide direct URLs to:
- **Export URL**: URL to fetch export-baseline.json
- **Baseline URL**: URL to check sync status

## How It Works

### Figma → Code (Sync to Code)

1. Plugin collects all variables and styles from your Figma file
2. Compares with the last saved baseline to detect changes
3. Saves the baseline to Figma's `sharedPluginData`
4. You run `synkio pull` in your CLI to fetch the baseline
5. CLI generates token files in W3C DTCG format

### Code → Figma (Apply from Code)

1. Make changes to token files in your codebase
2. Run `synkio export-baseline` to generate export-baseline.json
3. Commit and push to GitHub
4. In Figma, click **Fetch from Code**
5. Review changes and click **Apply to Figma**

### Creating Pull Requests

When Figma has changes that need to go to code:

1. Click **Sync to Code** to save the baseline
2. Click **Create PR** to push changes to GitHub
3. A new branch is created with updated `baseline.json`
4. A pull request is opened for review

## File Structure

```
synkio/
├── baseline.json           # Current state (Figma → Code)
├── export-baseline.json    # Exported state (Code → Figma)
└── tokens/
    ├── colors.json
    ├── spacing.json
    └── ...
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Toggle debug mode |

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues and solutions.

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for token security best practices.

## Development

```bash
# Build once
npm run build

# Watch mode (rebuild on changes)
npm run watch

# Run tests
npm test
```

## License

MIT
