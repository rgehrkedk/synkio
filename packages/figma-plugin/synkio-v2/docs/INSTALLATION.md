# Installation Guide

This guide walks you through setting up the Synkio Figma plugin from source for development or private use.

## Prerequisites

- [Node.js](https://nodejs.org/) 18.0.0 or later
- [Figma Desktop App](https://www.figma.com/downloads/)
- A GitHub account (for GitHub integration features)

## Step 1: Clone the Repository

```bash
git clone https://github.com/rgehrkedk/synkio.git
cd synkio/packages/figma-plugin/synkio-v2
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Get a Figma Plugin ID

Every Figma plugin needs a unique ID. Here's how to get one:

1. Open [figma.com/developers/plugins](https://www.figma.com/developers/plugins)
2. Sign in with your Figma account
3. Click **Create new plugin**
4. Fill in the details:
   - **Name**: Synkio (or any name you prefer)
   - **Type**: Select "Figma design"
5. Click **Create plugin**
6. Copy the **Plugin ID** (a long numeric string like `1234567890123456789`)

## Step 4: Update the Manifest

Open `manifest.json` and replace the placeholder ID:

```json
{
  "name": "Synkio",
  "id": "1234567890123456789",  // ← Your Plugin ID here
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": ["https://api.github.com", "https://*.githubusercontent.com"]
  }
}
```

## Step 5: Build the Plugin

```bash
# Build once
npm run build

# Or watch for changes during development
npm run watch
```

This creates the `dist/` folder with:
- `code.js` — Plugin backend code
- `ui.html` — Plugin UI (HTML + CSS + JS bundled)

## Step 6: Load the Plugin in Figma

1. Open **Figma Desktop** (not the web version)
2. Open any Figma file
3. Go to **Plugins** → **Development** → **Import plugin from manifest...**
4. Navigate to `packages/figma-plugin/synkio-v2/`
5. Select `manifest.json`
6. Click **Open**

The plugin is now available in your Development plugins.

## Step 7: Run the Plugin

1. In any Figma file, go to **Plugins** → **Development** → **Synkio**
2. The plugin UI will open
3. Follow the onboarding flow to set up your connection

## Updating the Plugin

After making changes to the source code:

1. If using `npm run watch`, changes rebuild automatically
2. If using `npm run build`, run it again after changes
3. In Figma, close and reopen the plugin to see changes

## Troubleshooting Installation

### "Plugin failed to load"

- Ensure `npm run build` completed without errors
- Check that `dist/code.js` and `dist/ui.html` exist
- Verify the Plugin ID in `manifest.json` is valid

### "Network request failed"

- Figma Desktop is required for network access
- Check that `networkAccess.allowedDomains` includes the domains you're fetching from

### "Cannot read properties of undefined"

- Run `npm run build` to regenerate the dist files
- Check the browser console in Figma (Plugins → Development → Show/Hide Console)

## Next Steps

- Read the [README](../README.md) for usage instructions
- Configure GitHub integration (see [SECURITY.md](SECURITY.md) for token setup)
- Set up the CLI for full workflow: `npm install -g synkio`

## Uninstalling

To remove the development plugin:

1. Go to **Plugins** → **Development** → **Manage plugins in development...**
2. Find Synkio in the list
3. Click the **×** to remove it
