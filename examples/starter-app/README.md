# Synkio Starter App

A minimal starter template with Synkio pre-installed. Use this to quickly set up a new project with Figma design token syncing.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up your Figma token

Create a `.env` file with your Figma personal access token:

```bash
cp .env.example .env
# Edit .env and add your token: FIGMA_TOKEN=your_token_here
```

Get your token from: https://www.figma.com/developers/api#access-tokens

### 3. Initialize Synkio

```bash
npm run init
# or
npx synkio init
```

This will guide you through:
- Entering your Figma file URL
- Configuring token output options
- Creating `synkio.config.json`

### 4. Install the Figma plugin

Before syncing, install the **Synkio Sync** plugin in Figma:
1. Open your Figma file
2. Go to Resources → Plugins → Search "Synkio Sync"
3. Run the plugin to prepare your variables for syncing

### 5. Sync your tokens

```bash
npm run sync
# or
npx synkio pull   # Fetch from Figma
npx synkio build  # Generate token files
```

### 6. Generate documentation (optional)

```bash
npm run docs
# or
npx synkio docs --open
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run init` | Initialize Synkio configuration |
| `npm run pull` | Fetch tokens from Figma (updates baseline) |
| `npm run build:tokens` | Generate token files from baseline |
| `npm run sync` | Pull and build in one command |
| `npm run docs` | Generate token documentation |
| `npm run validate` | Validate config and Figma connection |
| `npm run dev` | Start local dev server |

## Next Steps

After initialization, you'll have:
- `synkio.config.json` - Your Synkio configuration
- `tokens/` - Design tokens in DTCG JSON format
- `baseline.json` - Snapshot for detecting changes

See the [Synkio documentation](https://github.com/rgehrkedk/synkio) for more configuration options.
