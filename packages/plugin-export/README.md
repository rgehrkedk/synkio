# Synkio Export Plugin

Figma plugin for exporting Variables to design tokens.

## Features

- Export all Figma Variables as JSON
- Store in shared plugin data (accessible via REST API)
- Support for collections, modes, and groups
- Chunked storage for large datasets

## Installation

This plugin will be published to Figma Community.

For development:

1. Run `npm run build`
2. In Figma: Plugins → Development → Import plugin from manifest
3. Select `manifest.json`

## Usage

1. Open any Figma file with Variables
2. Run "Synkio Export"
3. Click "Sync to Node"
4. Copy the node ID to share with developers

## License

MIT
