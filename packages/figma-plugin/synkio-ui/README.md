# Synkio - Figma Plugin

**Sync Figma variables and styles to code. No Enterprise plan required.**

Synkio is the companion plugin for the [Synkio CLI](https://www.npmjs.com/package/synkio). It bridges the gap between Figma design variables and your codebase by storing variable data in `sharedPluginData`, making it accessible via the standard Figma API.

## Features

### Diff View
See exactly what's changed since your last sync:
- **Added** - New variables or styles
- **Modified** - Changed values
- **Deleted** - Removed items
- **Renamed** - Path changes detected via permanent IDs

### Sync History
Track the last 5 sync events with:
- User who performed the sync
- Timestamp
- Number of changes
- Expandable change details

### Collection Management
Control what gets synced:
- Include/exclude specific variable collections
- Include/exclude style types (paint, text, effect)
- Settings persist across sessions

### Style Support
Full support for Figma styles:
- **Paint styles** - Solid colors and gradients
- **Text styles** - Typography with DTCG composite format
- **Effect styles** - Shadows and blurs

## How It Works

Synkio uses a "Hybrid Sync" approach:

1. **This plugin** reads your Figma variables and styles, storing them in the file's `sharedPluginData`
2. **The CLI** fetches this data via the standard Figma REST API and generates output files

This gives you the accuracy of an internal plugin with the automation of a CLI - no Enterprise plan needed.

## Usage

### Initial Setup

1. Install the Synkio CLI in your project:
   ```bash
   npm install synkio --save-dev
   npx synkio init
   ```

2. Open this plugin in Figma

3. Review the Diff tab to see current variables

4. Click **"Prepare for Sync"** to snapshot your data

5. Run the CLI:
   ```bash
   npx synkio sync
   ```

### Ongoing Workflow

1. Make changes to your Figma variables or styles
2. Open the plugin to review changes in the Diff tab
3. Optionally exclude collections you don't want synced
4. Click **"Prepare for Sync"**
5. Run `npx synkio sync` in your project

## Plugin Tabs

### Diff Tab
Shows pending changes between the last sync and current state. Changes are categorized by type and show before/after values for easy review.

### History Tab
View your recent sync history. Click on any entry to see detailed change paths.

### Collections Tab
Manage which collections and style types to include in sync. At least one collection must remain included.

## Data Storage

The plugin stores data in `figma.root.sharedPluginData` under the `synkio` namespace:

| Key | Purpose |
|-----|---------|
| `chunk_*` | Current snapshot (CLI-readable) |
| `baseline_chunk_*` | Previous sync baseline (diff comparison) |
| `excludedCollections` | Collections to skip |
| `excludedStyleTypes` | Style types to skip |
| `history` | Last 5 sync events |

## Requirements

- Figma desktop app (any plan: Free, Professional, Organization, or Enterprise)
- [Synkio CLI](https://www.npmjs.com/package/synkio) installed in your project
- A Figma personal access token (for CLI)

## Support

- [Documentation](https://github.com/rgehrkedk/synkio)
- [Report Issues](https://github.com/rgehrkedk/synkio/issues)
- [npm Package](https://www.npmjs.com/package/synkio)

## License

MIT - See [LICENSE](LICENSE) for details.
