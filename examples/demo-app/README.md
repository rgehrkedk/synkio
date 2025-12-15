# Synkio Demo App

This is a reference implementation showing how to use Synkio with a real project.

## What's included

- `tokensrc.json` - Synkio configuration
- `tokens/` - Design tokens synced from Figma (JSON + CSS)
- `.synkio/docs/` - Generated documentation site
- `src/` - Simple demo app using the tokens

## Try it yourself

```bash
# From the demo-app directory
cd examples/demo-app

# Install dependencies
npm install

# Sync tokens (requires FIGMA_TOKEN)
npx synkio sync

# Generate documentation
npx synkio docs --open

# Start the demo app
npm run dev
```

## Configuration

See `tokensrc.json` for the full configuration. Key features enabled:

- ✅ JSON token output (DTCG format)
- ✅ CSS custom properties (`tokens.css`)
- ✅ Utility classes (`utilities.css`)
- ✅ Documentation dashboard

## Live Demo

The documentation site is deployed at: [View Demo](https://rgehrkedk.github.io/synkio/demo/)
