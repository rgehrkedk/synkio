# import

Import tokens from Figma's native JSON export files — **no plugin required**.

## When to Use

This is useful when:

- You don't want to use the Figma plugin
- Designers export JSON files manually
- You need an offline workflow
- You want to version control Figma exports in git

## Usage

```bash
# Config-based (recommended)
npx synkio import

# Or with CLI arguments
npx synkio import <path> --collection=<name>
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<path>` | Path to JSON file or directory (optional if using config) |

## Options

| Flag | Description |
|------|-------------|
| `--collection=<name>` | Collection name (required if not using config) |
| `--mode=<name>` | Override mode name from file |
| `--preview` | Show changes without applying |
| `--force` | Import even with breaking changes |
| `--config=<file>` | Path to config file |

## Examples

```bash
# Import using config (recommended)
npx synkio import

# Preview what would change
npx synkio import --preview

# Import a single file
npx synkio import ./light.tokens.json --collection=theme

# Import all JSON files from a directory
npx synkio import ./figma-exports/ --collection=theme

# Force import past breaking changes
npx synkio import --force
```

## Config-Based Import

Add `import` config to your `synkio.config.json`:

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

Then run:

```bash
npx synkio import
```

See [Import Configuration](/guide/configuration/import) for full options.

## How Figma Native Export Works

1. In Figma, select your variable collection
2. Go to **File → Export → Variables → JSON**
3. Save the JSON file(s) to your project
4. Run `synkio import`

The exported JSON includes `com.figma.variableId` which Synkio uses for intelligent diffing — the same ID-based protection as the plugin workflow.

## Typical Workflow

```bash
# Designer exports from Figma and commits to repo
git pull

# Developer imports the new tokens
npx synkio import

# Generate output files
npx synkio build
```

::: tip ID Preservation
Figma's native export includes variable IDs, so you get the same breaking change protection as the plugin workflow.
:::
