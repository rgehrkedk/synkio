# init-baseline

Create a baseline from existing token files without Figma IDs.

```bash
synkio init-baseline [options]
```

## Overview

The `init-baseline` command creates a `baseline.json` from your existing token files. Unlike `export-baseline`, this command does **not** include Figma variable IDs, making it ideal for bootstrap scenarios.

Use this command when:
- You have existing token files and want to start using Synkio
- You want meaningful diff detection on your first Figma pull
- You're migrating from another design token tool

## Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview what would be created without writing files |
| `--force` | Overwrite existing baseline.json |
| `--config=<path>` | Path to config file |

## How It Works

1. **Reads your config** - Uses `tokens.collections` to know where token files are
2. **Discovers token files** - Finds all `.json` files matching your config
3. **Parses tokens** - Extracts token paths and values
4. **Creates baseline** - Writes `synkio/baseline.json` without Figma IDs

The resulting baseline enables path-based comparison on your first `synkio pull`, so you can see exactly what's different between your code and Figma.

## Usage

### Prerequisites

You need a `synkio.config.json` with collections defined:

```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "YOUR_FILE_ID",
    "accessToken": "${FIGMA_TOKEN}"
  },
  "tokens": {
    "dir": "tokens",
    "collections": {
      "primitives": { "splitBy": "none" },
      "theme": { "splitBy": "mode" }
    }
  }
}
```

### Basic Usage

```bash
synkio init-baseline
```

Output:
```
Baseline initialized!

  Tokens: 156
  Collections: primitives, theme
  Source: init (no Figma IDs)

  Next step:
    Run "synkio pull" to sync with Figma
    The first pull will show a path-based comparison
```

### Dry Run

Preview what would be created:

```bash
synkio init-baseline --dry-run
```

Output:
```
  Dry run - would create baseline with:

  Tokens: 156
  Collections: primitives, theme

  No variableIds (will be added on first pull)
```

### Overwrite Existing

If a baseline already exists:

```bash
synkio init-baseline --force
```

## Comparison: init-baseline vs export-baseline

| Feature | init-baseline | export-baseline |
|---------|---------------|-----------------|
| **Purpose** | Bootstrap new projects | Roundtrip workflow |
| **Figma IDs** | Not included | Included from existing baseline |
| **Use case** | First-time setup | Code → Figma sync |
| **Output** | `synkio/baseline.json` | `synkio/export-baseline.json` |

## Example Workflow

### Migrating Existing Tokens to Synkio

```bash
# 1. Initialize project with your Figma file
synkio init

# 2. Configure collections in synkio.config.json
# (pointing to your existing token files)

# 3. Create baseline from existing tokens
synkio init-baseline

# 4. Pull from Figma to see differences
synkio pull

# 5. Review the comparison report
# The pull will show what's different between
# your token files and Figma variables

# 6. Build to apply Figma's values
synkio build
```

### What Happens on First Pull

After running `init-baseline`, your first `synkio pull` will:

1. Fetch current data from Figma
2. Compare paths (not IDs, since you don't have them yet)
3. Show you what's different:
   - Tokens in Figma but not in your files
   - Tokens in your files but not in Figma
   - Value differences for matching paths
4. Update baseline with Figma IDs for future comparison

## Troubleshooting

### "No synkio.config.json found"

Run `synkio init` first to create a config file.

### "No collections configured"

Add collections to your config:

```json
{
  "tokens": {
    "dir": "tokens",
    "collections": {
      "your-collection": { "splitBy": "mode" }
    }
  }
}
```

### "baseline.json already exists"

Use `--force` to overwrite, or delete the existing file:

```bash
rm synkio/baseline.json
synkio init-baseline
```

### "No token files found"

Verify your config matches your file structure:

```
tokens/
├── primitives.json        # For splitBy: "none"
├── theme.light.json       # For splitBy: "mode"
└── theme.dark.json
```

## See Also

- [export-baseline](/guide/commands/export) - Export with Figma IDs for roundtrip
- [pull](/guide/commands/pull) - Fetch from Figma
- [Configuration](/guide/configuration) - Config file options
