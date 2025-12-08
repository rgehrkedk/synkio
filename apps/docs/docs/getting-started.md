---
sidebar_position: 2
---

# Getting Started

This guide will walk you through setting up Synkio in your project in under 10 minutes.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** version 20.0 or higher
- **pnpm**, **npm**, or **yarn** package manager
- A **Figma** account with a file containing Variables
- A **Figma Access Token** ([generate one here](https://www.figma.com/developers/api#access-tokens))

## Installation

Install Synkio globally or as a dev dependency in your project:

```bash
# Global installation
npm install -g @synkio/core

# Or as a dev dependency
npm install --save-dev @synkio/core
```

## Step 1: Initialize Synkio

Run the interactive setup wizard:

```bash
synkio init
```

The wizard will guide you through:

1. **Figma Connection**: Enter your Figma Access Token and File Key
2. **Collection Setup**: Select which Figma Variable collections to sync
3. **Organization Strategy**: Choose how to split tokens (by mode or by group)
4. **Output Configuration**: Set the output directory for token files
5. **Build Integration**: Optionally integrate with Style Dictionary or custom build commands

### Non-interactive mode

Skip prompts with flags:

```bash
synkio init --yes \
  --figma-token=$FIGMA_TOKEN \
  --figma-file=$FIGMA_FILE_KEY \
  --output=./tokens \
  --split=byMode
```

## Step 2: Configure Environment Variables

Create a `.figma/.env` file with your credentials:

```bash
FIGMA_ACCESS_TOKEN=figd_...
FIGMA_FILE_KEY=abc123...
```

:::tip
Add `.figma/.env` to your `.gitignore` to keep credentials secure.
:::

## Step 3: Sync Tokens

Fetch tokens from Figma:

```bash
synkio sync
```

This will:
1. Fetch variables from the Figma REST API
2. Save a baseline snapshot to `.figma/data/baseline.json`
3. Split tokens into organized files in your output directory
4. Optionally run your build command (e.g., Style Dictionary)

### What gets created?

After running `sync`, you'll see:

```
your-project/
├── .figma/
│   └── data/
│       ├── baseline.json        # Source of truth
│       ├── baseline-prev.json   # Backup for rollback
│       └── token-map.json       # Usage tracking
├── tokens/                      # Your output directory
│   ├── light.json               # Token files (split by mode/group)
│   └── dark.json
└── tokensrc.json                # Synkio configuration
```

## Step 4: Use Your Tokens

Tokens are now ready to use in your application. If you're using Style Dictionary, it will transform them into your target formats (CSS, SCSS, etc.).

### Example: CSS Variables

```css
:root {
  --color-primary: #3b82f6;
  --spacing-md: 16px;
}

.button {
  background: var(--color-primary);
  padding: var(--spacing-md);
}
```

### Example: Tailwind Config

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
      },
      spacing: {
        md: 'var(--spacing-md)',
      },
    },
  },
};
```

## What's Next?

- Learn about the [CLI commands](./cli)
- Explore [token migrations](./migrations)
- Set up [Style Dictionary integration](./style-dictionary)
- Configure [organization strategies](./organization)

## Troubleshooting

### "Figma API Error: 403 Forbidden"

Your access token is invalid or expired. Generate a new one in Figma settings.

### "Collection not found"

The File Key or Collection ID is incorrect. Double-check your `tokensrc.json` configuration.

### "No variables found"

Your Figma file doesn't have any Variables defined. Create some in Figma first.

For more issues, check the [Troubleshooting Guide](./troubleshooting) or [open an issue](https://github.com/synkio/synkio/issues).
