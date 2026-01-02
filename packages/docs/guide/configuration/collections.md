# Collections

Configure per-collection output behavior.

## Options

Collection-level settings override the parent-level `tokens.splitBy` and `tokens.includeMode` defaults.

```json
{
  "tokens": {
    "dir": "tokens",
    "splitBy": "mode",
    "includeMode": false,
    "collections": {
      "theme": {
        "splitBy": "mode",
        "includeMode": true
      },
      "primitives": {
        "dir": "src/styles/tokens/primitives",
        "splitBy": "none"
      },
      "icons": {
        "splitBy": "group"
      }
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `dir` | `tokens.dir` | Custom output directory |
| `file` | collection name | Custom filename (without extension) |
| `splitBy` | inherits | Split strategy for this collection |
| `includeMode` | inherits | Include mode as first-level key |
| `names` | - | Rename modes or groups |

## Split Strategy Examples

### Split by Mode

```json
{
  "collections": {
    "theme": {
      "splitBy": "mode"
    }
  }
}
```

Output:

```
tokens/
├── theme.light.json
└── theme.dark.json
```

### Split by Group

```json
{
  "collections": {
    "primitives": {
      "splitBy": "group"
    }
  }
}
```

Output:

```
tokens/
├── primitives.colors.json
├── primitives.spacing.json
└── primitives.typography.json
```

### No Splitting

```json
{
  "collections": {
    "brand": {
      "splitBy": "none"
    }
  }
}
```

Output:

```
tokens/
└── brand.json
```

## Custom Directories

Put collections in different locations:

```json
{
  "collections": {
    "theme": {
      "dir": "src/styles/theme"
    },
    "primitives": {
      "dir": "src/styles/primitives"
    }
  }
}
```

## Custom Filenames

Override the default naming:

```json
{
  "collections": {
    "theme": {
      "file": "colors",
      "splitBy": "mode"
    }
  }
}
```

Output:

```
tokens/
├── colors.light.json
└── colors.dark.json
```

## Renaming Modes/Groups

Rename modes or groups in output files:

```json
{
  "collections": {
    "theme": {
      "splitBy": "mode",
      "names": {
        "Mode 1": "light",
        "Mode 2": "dark"
      }
    }
  }
}
```

This converts `theme.Mode 1.json` → `theme.light.json`.

## Include Mode in Output

Include mode name as first-level key in JSON:

```json
{
  "collections": {
    "theme": {
      "includeMode": true
    }
  }
}
```

With `includeMode: false`:

```json
{
  "colors": {
    "primary": { "$value": "#0066cc" }
  }
}
```

With `includeMode: true`:

```json
{
  "light": {
    "colors": {
      "primary": { "$value": "#0066cc" }
    }
  }
}
```

## Rebuild After Config Changes

After changing collection config, regenerate all files:

```bash
npx synkio build --rebuild
```

This regenerates output without fetching from Figma.
