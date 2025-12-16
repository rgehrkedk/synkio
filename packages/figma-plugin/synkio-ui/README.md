# Synkio UI Plugin

Figma plugin with UI for visualizing variable changes and sync history.

## Features

- **Diff View**: Shows pending changes (added/modified/deleted) since last sync
- **Sync History**: Shows last 5 sync events with user info
- **Prepare for Sync**: Snapshots current state and updates baseline

## Development

```bash
# Install dependencies
npm install

# Build plugin
npm run build

# Watch mode
npm run watch
```

## How it works

### Storage (Option 1 - Plugin Independent)

The plugin stores data in `figma.root.sharedPluginData`:

- `baseline_chunk_*` - Baseline snapshot for diff comparison
- `history` - Last 5 sync events (compact JSON)

The CLI continues to read from `chunk_*` keys (unchanged).

### Future: Option 2 Integration

When ready for CLI integration, the CLI can write to `baseline_*` keys after sync, keeping plugin and CLI in sync.

## Usage

1. Open plugin in Figma
2. View pending changes in Diff tab
3. Click "Prepare for Sync" to snapshot current state
4. View sync history in History tab
