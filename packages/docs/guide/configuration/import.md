# Import Configuration

Configure import sources for Figma's native JSON export workflow.

## Options

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
      },
      "icons": {}
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `dir` | `figma-exports` | Default directory for export files |
| `sources` | - | Map collection names to source files |
| `sources.<name>.dir` | `import.dir` | Override directory for collection |
| `sources.<name>.files` | all `.json` | Specific files to import |

## How It Works

1. Each key in `sources` becomes a collection name
2. Files are loaded from the specified `dir` or default `import.dir`
3. If `files` is omitted, all `.json` files in the directory are imported
4. Mode names are extracted from each file's `$extensions.com.figma.modeName`

## Basic Example

Import all JSON files from a directory:

```json
{
  "import": {
    "dir": "figma-exports",
    "sources": {
      "theme": {}
    }
  }
}
```

This imports all `.json` files from `figma-exports/` as the `theme` collection.

## Specific Files

Import only specific files:

```json
{
  "import": {
    "sources": {
      "theme": {
        "files": ["light.tokens.json", "dark.tokens.json"]
      }
    }
  }
}
```

## Multiple Collections

```json
{
  "import": {
    "dir": "figma-exports",
    "sources": {
      "theme": {
        "files": ["light.tokens.json", "dark.tokens.json"]
      },
      "primitives": {
        "dir": "figma-exports/foundation",
        "files": ["colors.json", "spacing.json", "typography.json"]
      },
      "components": {
        "dir": "figma-exports/components"
      }
    }
  }
}
```

This config will:

- Import `theme` from `figma-exports/light.tokens.json` and `dark.tokens.json`
- Import `primitives` from `figma-exports/foundation/colors.json`, etc.
- Import `components` from all `.json` files in `figma-exports/components/`

## Exporting from Figma

1. In Figma, select your variable collection
2. Go to **File → Export → Variables → JSON**
3. Save the JSON file(s) to your project
4. Run `synkio import`

## Mode Detection

Mode names are extracted from Figma's export format:

```json
{
  "$extensions": {
    "com.figma": {
      "modeName": "Light"
    }
  },
  "colors": {
    "primary": {
      "$value": "#0066cc"
    }
  }
}
```

## Typical Workflow

```bash
# 1. Designer exports from Figma
#    File → Export → Variables → JSON

# 2. Designer commits to repo
git add figma-exports/
git commit -m "Update design tokens"
git push

# 3. Developer imports tokens
git pull
npx synkio import

# 4. Generate output files
npx synkio build
```

::: tip ID Preservation
Figma's native export includes `com.figma.variableId`, providing the same ID-based breaking change protection as the plugin workflow.
:::
