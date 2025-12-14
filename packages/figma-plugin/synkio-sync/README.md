# Synkio Sync - Figma Plugin

A minimal Figma plugin that syncs local variables to a format the Synkio CLI can read.

## How it Works

1. Run the plugin in Figma
2. It reads all local variables
3. Stores them on the document root (`figma.root`)
4. The CLI can then fetch this data using just the file ID (no node ID needed)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch
```

## Installing in Figma

1. Open Figma Desktop
2. Go to Plugins → Development → Import plugin from manifest...
3. Select the `manifest.json` file from this directory

## Usage

1. Open a Figma file with local variables
2. Run "Synkio Sync" from the plugins menu
3. The plugin will sync and show a success message
4. Use the Synkio CLI: `synkio sync`
