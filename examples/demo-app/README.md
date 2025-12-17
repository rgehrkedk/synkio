# Synkio Demo App

This is a reference implementation showing how to use Synkio with a real project.

## What's included

- `tokensrc.json` - Synkio configuration
- `tokens/` - Design tokens synced from Figma (JSON + CSS)
- `.synkio/docs/` - Generated documentation site
- `src/` - Simple demo app using the tokens

## Try it yourself

### If using the published npm package:

```bash
# From the demo-app directory
cd examples/demo-app

# Install dependencies
npm install

# Make sure .env exists in this directory (not in .synkio/)
# It should contain: FIGMA_TOKEN=your_token_here

# Sync tokens
npx synkio sync

# Generate documentation
npx synkio docs --open

# Start the demo app
npm run dev
```

### If you cloned the repo for development:

```bash
# 1. Build the CLI first
cd ../../packages/cli
npm install
npm run build
npm link

# 2. Build the Figma plugin
cd ../figma-plugin/synkio-sync
npm install
npm run build

# 3. Return to demo-app
cd ../../../examples/demo-app
npm install

# 4. Make sure .env exists in this directory
# It should contain: FIGMA_TOKEN=your_token_here

# 5. Use the linked CLI
synkio sync

# Or run the built CLI directly
node ../../packages/cli/dist/cli/bin.js sync

# 6. Generate documentation
synkio docs --open

# 7. Start the demo app
npm run dev
```

## Configuration Files

This demo includes **four configuration files** to showcase different output modes:

### 1. `tokensrc.json` (Default - Web Platforms)
- **Mode**: Style Dictionary
- **Output**: `src/tokens-sd/`
- **Platforms**: CSS, SCSS, JavaScript
- **Docs**: `.synkio/docs-sd/`

```bash
# Use default config
synkio sync --regenerate
open .synkio/docs-sd/index.html
```

### 2. `tokensrc.css.json` (CSS-Only Mode)
- **Mode**: JSON (zero-dependency)
- **Output**: `src/tokens-css/`
- **Features**: CSS with rem units, utility classes
- **Docs**: `.synkio/docs-css/`

```bash
# Use CSS-only config
synkio sync --regenerate --config tokensrc.css.json
open .synkio/docs-css/index.html
```

### 3. `tokensrc.js.json` (CSS-in-JS / React)
- **Mode**: Style Dictionary
- **Output**: `src/tokens-js/`
- **Platforms**: JavaScript (flat + nested), TypeScript, JSON (nested)
- **Use cases**: styled-components, Emotion, CSS Modules, theme providers
- **Docs**: `.synkio/docs-js/`
- **Formats**:
  - `tokens.js` - Flat exports (`DefaultSpacingXs`)
  - `theme.js` - Nested object (Style Dictionary format)
  - `tokens.json` - Nested JSON (`{"default": {"spacing": {"xs": "4rem"}}}`)

```bash
# Use CSS-in-JS config
synkio sync --regenerate --config tokensrc.js.json
open .synkio/docs-js/index.html
```

### 4. `tokensrc.mobile.json` (Mobile Platforms)
- **Mode**: Style Dictionary
- **Output**: `src/tokens-mobile/`
- **Platforms**: iOS Swift, Android XML, Jetpack Compose, Flutter
- **Docs**: `.synkio/docs-mobile/`

```bash
# Use mobile config
synkio sync --regenerate --config tokensrc.mobile.json
open .synkio/docs-mobile/index.html
```

## Intermediate Token Format

All modes generate `.tokens-source.json` with:
- Clean DTCG tokens (`$value`, `$type`)
- Output configuration metadata
- CSS variable naming conventions
- Platform/transform information

The docs use this metadata to display mode-specific info. For example:
- **Web platforms** show CSS, SCSS, JS variable names
- **CSS-in-JS** shows JS (flat exports), TS (type declarations), and Object (nested path) formats
- **Mobile platforms** show iOS Swift, Android XML, Compose, Flutter variable names
- **CSS-only mode** shows CSS variables with rem unit transforms

## Live Demo

The documentation site is deployed at: [View Demo](https://rgehrkedk.github.io/synkio/demo/)
