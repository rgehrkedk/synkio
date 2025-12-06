# Design Token Importer for Figma

Import JSON design tokens as Figma Variables with full control over collections and modes.

## Features

- 📁 **Flexible File Upload** - Drag & drop or browse for JSON token files
- 🎨 **Collection Configuration** - Organize tokens into Variable Collections
- 🔄 **Mode Support** - Each file can be a separate mode, or merge files into single mode
- ⚡ **Clarity Preset** - Quick setup for three-tier token systems (Primitives, Brands, Themes)
- 🎯 **Agnostic** - Works with any JSON token format following `{ "value": ..., "type": "..." }` structure
- 📤 **Export Baseline** - Export all Figma variables as JSON snapshot
- 🔄 **Sync to Node** - Store data in Figma for remote access via REST API

## Installation

1. **Install dependencies:**
   ```bash
   cd figma-token-importer
   npm install
   ```

2. **Build the plugin:**
   ```bash
   npm run build
   ```

3. **Import in Figma:**
   - Open Figma Desktop
   - Go to Plugins → Development → Import plugin from manifest
   - Select `figma-token-importer/manifest.json`

## Usage

### 1. Upload Token Files

Drag and drop or click to browse for JSON files. All files should follow this structure:

```json
{
  "token": {
    "name": {
      "value": "#ff0000",
      "type": "color"
    }
  }
}
```

### 2. Configure Collections

Choose a preset or create custom collections:

#### **Clarity Preset** (Recommended for Clarity Design System)

Automatically creates three collections:

- **Primitives** (Single mode)
  - Files: colors.json, spacing.json, typography.json, radius.json, shadows.json, transitions.json
  - All primitive tokens in one mode

- **Brand** (Multi-mode)
  - Modes: clarity, velocity, zenith, neon, bolt, chill, odd, dunno
  - Each brand file becomes a separate mode

- **Theme** (Multi-mode)
  - Modes: light, dark
  - Each theme file becomes a separate mode

#### **Custom Setup**

1. Click "Add Collection"
2. Name your collection
3. Check "Each file is a separate mode" if needed
4. Select which files belong to this collection

### 3. Import

Click "Import to Figma" and watch your tokens become Figma Variables!

## Export & Sync

### Export Baseline Snapshot

Export all Figma variables to a local JSON file:

1. Click **Export Baseline Snapshot** in the plugin
2. Copy the JSON output
3. Save as `.baseline-export.json` in your project root

The export format:
```json
{
  "primitives": {
    "colors": { "token-name": { "value": "#ff0000", "type": "color" } }
  },
  "brands": {
    "clarity": { "brand-specific-token": { ... } }
  },
  "themes": {
    "light": { "theme-token": { ... } }
  }
}
```

### Sync to Node (Remote Access)

Enable remote fetching via Figma REST API:

1. **In Figma Plugin:**
   - Click **🔄 Sync to Node**
   - Data is stored in file's `sharedPluginData`

2. **On Your Machine:**
   ```bash
   # Set environment variables
   export FIGMA_FILE_KEY=your-figma-file-key
   export FIGMA_ACCESS_TOKEN=figd_your_token

   # Fetch synced data
   npm run figma:fetch
   ```

3. **Output:**
   - Creates `.baseline-export.json` with synced data
   - Identical format to manual export

**Environment Setup:**

Create `.env` file:
```env
FIGMA_FILE_KEY=abc123xyz456
FIGMA_ACCESS_TOKEN=figd_xxxxxxxxxxxx
```

**Get Your Credentials:**
- File Key: Extract from Figma URL `https://www.figma.com/design/FILE_KEY/...`
- Access Token: Generate at https://www.figma.com/settings → Personal Access Tokens

## Token Format Support

Supported token types:

| Type | Figma Variable Type | Example |
|------|-------------------|---------|
| `color` | COLOR | `"#ff0000"` or `"rgba(255,0,0,1)"` |
| `dimension` | FLOAT | `"16px"` or `16` |
| `spacing` | FLOAT | `"8px"` or `8` |
| `fontSize` | FLOAT | `"14px"` or `14` |
| `fontFamily` | STRING | `"Inter, sans-serif"` |
| `fontWeight` | STRING | `400` or `"Medium"` |
| `string` | STRING | Any string value |
| `boolean` | BOOLEAN | `true` or `false` |
| `shadow` | STRING | CSS shadow syntax |
| `gradient` | STRING | CSS gradient syntax |

## Alias References

Tokens can reference other tokens using `{path.to.token}` syntax:

```json
{
  "brand": {
    "primary": {
      "value": "{color.blue.500}",
      "type": "color"
    }
  }
}
```

**Note:** Aliases are currently skipped in first import. Run import twice or use Figma's alias feature manually after import.

## Development

### Watch mode

```bash
npm run watch
```

### Project Structure

```
figma-token-importer/
├── manifest.json          # Figma plugin manifest
├── package.json           # npm dependencies
├── tsconfig.json          # TypeScript config
├── src/
│   ├── code.ts           # Plugin backend (Figma API)
│   └── ui.html           # Plugin UI (browser)
└── code.js               # Compiled output
```

## Troubleshooting

### "Import failed" error

- Check that all JSON files are valid
- Ensure token values match their declared types
- Verify color values are in `#hex` or `rgba()` format

### Tokens not appearing

- Make sure at least one file is assigned to each collection
- Check that collection names are unique
- Verify token paths don't have special characters

### Aliases not working

- Aliases require a second pass (run import twice)
- Or manually set alias in Figma after first import
- Ensure referenced tokens exist

## License

MIT

## Credits

Built for the Clarity Design System multi-brand token architecture.
