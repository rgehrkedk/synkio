# Styles

Configure Figma styles sync (paint, text, effect styles).

Styles are distinct from Figma variables — they represent reusable visual properties like colors, typography, and effects.

## Options

```json
{
  "tokens": {
    "styles": {
      "enabled": true,
      "paint": {
        "enabled": true,
        "file": "colors",
        "mergeInto": {
          "collection": "globals",
          "group": "colors"
        }
      },
      "text": {
        "enabled": true,
        "file": "typography"
      },
      "effect": {
        "enabled": true,
        "file": "effects"
      }
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `true` | Master toggle for all styles |
| `paint` | - | Paint styles (solid colors, gradients) |
| `text` | - | Text styles (typography) |
| `effect` | - | Effect styles (shadows, blurs) |

## Per-Style Options

Each style type supports:

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `true` | Enable this style type |
| `dir` | `tokens.dir` | Output directory |
| `file` | style type | Custom filename |
| `mergeInto.collection` | - | Merge into variable collection |
| `mergeInto.group` | - | Target group (for `splitBy: "group"`) |

## Basic Usage

Enable all styles with defaults:

```json
{
  "tokens": {
    "styles": {
      "enabled": true
    }
  }
}
```

Output:

```
tokens/
├── paint.json
├── text.json
└── effect.json
```

## Custom Filenames

```json
{
  "tokens": {
    "styles": {
      "enabled": true,
      "paint": { "file": "colors" },
      "text": { "file": "typography" },
      "effect": { "file": "shadows" }
    }
  }
}
```

## Merge Into Collections

Merge styles into an existing variable collection output:

```json
{
  "tokens": {
    "styles": {
      "paint": {
        "mergeInto": {
          "collection": "globals",
          "group": "colors"
        }
      }
    }
  }
}
```

If `globals` uses `splitBy: "group"`, paint styles will merge into `globals.colors.json`.

## Disable Specific Types

Only sync paint styles:

```json
{
  "tokens": {
    "styles": {
      "enabled": true,
      "paint": { "enabled": true },
      "text": { "enabled": false },
      "effect": { "enabled": false }
    }
  }
}
```

## Style Output Format

### Paint Styles

```json
{
  "brand": {
    "primary": {
      "$value": "#0066cc",
      "$type": "color"
    }
  }
}
```

### Text Styles

```json
{
  "heading": {
    "h1": {
      "$value": {
        "fontFamily": "Inter",
        "fontSize": "32px",
        "fontWeight": 700,
        "lineHeight": 1.2
      },
      "$type": "typography"
    }
  }
}
```

### Effect Styles

```json
{
  "shadow": {
    "sm": {
      "$value": {
        "offsetX": "0px",
        "offsetY": "1px",
        "blur": "2px",
        "spread": "0px",
        "color": "rgba(0, 0, 0, 0.05)"
      },
      "$type": "shadow"
    }
  }
}
```

::: warning Plugin Version
Styles sync requires the Synkio Figma plugin v3.0.0+ which captures style data alongside variables.
:::
