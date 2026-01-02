# Quick Start

Get Synkio up and running in your project in under 5 minutes.

## Prerequisites

- Node.js 18+
- A Figma file with variables
- Figma personal access token

## Installation

```bash
npm install synkio --save-dev
```

## Initialize

Run the init command to set up your project:

```bash
npx synkio init
```

The CLI will ask for your Figma file URL and create:

- `synkio.config.json` — Configuration file
- `.env.example` — Template for your `FIGMA_TOKEN`

## Set Up Figma Token

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Scroll to **Personal access tokens**
3. Click **Generate new token**
4. Copy and add to your `.env`:

```bash
FIGMA_TOKEN=your_token_here
```

## Run the Figma Plugin

1. Open your Figma file
2. Run **Plugins → Synkio**
3. Click "Sync" to export variables

::: tip No Plugin?
You can also import Figma's native JSON exports. See [import command](/guide/commands/import).
:::

## Pull and Build

```bash
# Fetch tokens from Figma
npx synkio pull

# Generate token files
npx synkio build
```

Your tokens are now in your project!

## What's Next?

- **Customize output** — See [Configuration](/guide/configuration)
- **Set up Style Dictionary** — See [Style Dictionary workflow](/guide/workflows/style-dictionary)
- **Enable PR workflow** — See [GitHub PR Workflow](/guide/workflows/github-pr)
