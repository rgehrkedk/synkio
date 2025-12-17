# Synkio Import Demo

This demo shows how to use Synkio's **import** feature to sync design tokens from Figma's native JSON export — **without needing the Synkio Figma plugin**.

## How It Works

1. Designer exports variables from Figma via **File → Export → Variables → JSON**
2. JSON files are placed in `figma-exports/` folder
3. Developer runs `npm run import` to import tokens
4. Synkio generates CSS, token files, and documentation

## Quick Start

```bash
# Install dependencies
npm install

# Preview what would be imported
npm run import:preview

# Import tokens from Figma exports (uses config)
npm run import

# Generate output files (CSS, docs)
npm run regenerate

# View documentation
npm run docs
```

## Project Structure

```
import-demo/
├── figma-exports/           # Figma native JSON exports go here
│   ├── light.tokens.json    # Light mode export
│   └── dark.tokens.json     # Dark mode export
├── tokens/                  # Generated token files (after import)
├── .synkio/                 # Synkio data
│   ├── baseline.json        # Token baseline for diffing
│   └── docs/                # Generated documentation
├── synkio.config.json       # Synkio configuration
└── package.json
```

## Workflow

### Initial Import

```bash
# Import using config (recommended)
npm run import

# Or import manually with CLI args:
npx synkio import ./figma-exports --collection=theme
```

### Updating Tokens

When designers export updated tokens:

```bash
# 1. Replace JSON files in figma-exports/
# 2. Preview changes
npm run import:preview

# 3. Import (will show breaking changes if any)
npm run import

# 4. Regenerate output files
npm run regenerate
```

### Breaking Change Protection

Synkio uses Figma's `variableId` from the exported JSON to detect:
- **Renames** — Variable renamed but ID unchanged → safe
- **Deletions** — Variable removed → blocks import (use `--force` to override)
- **Path changes** — Token path changed → blocks import

This is the same protection as the plugin-based workflow.

## Configuration

See `synkio.config.json` for options:

```json
{
  "import": {
    "dir": "figma-exports",
    "sources": {
      "theme": {
        "files": ["light.tokens.json", "dark.tokens.json"]
      }
    }
  },
  "output": {
    "dir": "tokens",
    "dtcg": true
  },
  "css": {
    "enabled": true,
    "utilities": true
  },
  "docs": {
    "enabled": true
  }
}
```

### Import Config Options

| Option | Description |
|--------|-------------|
| `import.dir` | Default directory for Figma exports (default: `figma-exports`) |
| `import.sources` | Map collection names to source files |
| `import.sources.<name>.dir` | Override directory for this collection |
| `import.sources.<name>.files` | List of JSON files to import (optional, defaults to all .json in dir) |

### Multiple Collections Example

```json
{
  "import": {
    "dir": "figma-exports",
    "sources": {
      "theme": {
        "files": ["light.tokens.json", "dark.tokens.json"]
      },
      "primitives": {
        "dir": "figma-exports/primitives",
        "files": ["colors.json", "spacing.json"]
      }
    }
  }
}
```

## Figma Export Instructions

1. Open your Figma file
2. Go to **File → Export → Variables → JSON**
3. Select the collection to export (e.g., "theme")
4. Export each mode as a separate file:
   - `light.tokens.json`
   - `dark.tokens.json`
5. Place files in `figma-exports/` folder

The exported JSON includes `com.figma.variableId` which enables intelligent diffing.
