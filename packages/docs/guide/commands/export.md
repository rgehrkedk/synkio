# export

Export token files to baseline format for Figma import — enables code-first and roundtrip workflows.

## When to Use

This command enables two workflows:

- **Code-first** — Write tokens in code, export to baseline, import into Figma
- **Roundtrip** — Modify tokens in code, sync back to Figma with ID preservation

## Usage

```bash
npx synkio export
```

## Options

| Flag | Description |
|------|-------------|
| `--output=<path>` | Output file path (default: `synkio/export-baseline.json`) |
| `--config=<file>` | Path to config file |
| `--preview` | Print output to console without writing file |
| `--verbose` | Show detailed processing information |

## Examples

```bash
# Export to default location
npx synkio export

# Custom output path
npx synkio export --output ./for-figma.json

# Preview without writing
npx synkio export --preview

# Show detailed parsing information
npx synkio export --verbose
```

## How It Works

1. Reads token files from all configured collections
2. Parses tokens and extracts mode information
3. Builds baseline format compatible with Figma plugin
4. Outputs JSON that can be imported into Figma

## Typical Workflow

```bash
# 1. Modify tokens in your codebase
# Edit tokens/theme.light.json, tokens/theme.dark.json, etc.

# 2. Export to baseline format
npx synkio export

# 3. Import into Figma
# Open Synkio plugin > Import > Select export-baseline.json
# Review diff and click "Apply to Figma"
```

## ID Preservation

The exported baseline preserves Figma variable IDs (if present in your token files), enabling:

- Intelligent diffing when importing back to Figma
- Preventing accidental token duplication
- Maintaining references between tokens

::: tip Legacy Command
The command `synkio export-baseline` is deprecated but still supported. Use `synkio export` instead.
:::
