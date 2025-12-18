# Synkio Demo App

This is a reference implementation showing how to use Synkio with a real project.

## What's included

- `synkio.config.json` - Synkio configuration
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

# Make sure .env exists with your Figma token
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

# 4. Make sure .env exists with your Figma token
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

## Configuration

The `synkio.config.json` configures:

- **Token output**: JSON files in DTCG format to `tokens/`
- **CSS output**: Built-in CSS generation with utility classes
- **Documentation**: Token documentation site in `.synkio/docs/`

### Using Style Dictionary

Synkio outputs standard DTCG-format JSON files that can be consumed by Style Dictionary.
To use Style Dictionary for advanced transforms:

1. Install Style Dictionary: `npm install -D style-dictionary`
2. Create your own `sd.config.js` that reads from `tokens/`
3. Add a build script to `synkio.config.json`:

```json
{
  "build": {
    "script": "npx style-dictionary build"
  }
}
```

This approach gives you full control over Style Dictionary configuration while
keeping Synkio focused on syncing tokens from Figma.

## Intermediate Token Format

Synkio generates `.tokens-source.json` with:
- Clean DTCG tokens (`$value`, `$type`)
- Output configuration metadata
- CSS variable naming conventions

The docs use this metadata to display token information.

## Live Demo

The documentation site is deployed at: [View Demo](https://rgehrkedk.github.io/synkio/demo/)
