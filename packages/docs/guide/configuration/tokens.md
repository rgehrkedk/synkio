# Tokens Options

Configure token output format and structure.

## Options

```json
{
  "tokens": {
    "dir": "tokens",
    "dtcg": true,
    "includeVariableId": false,
    "splitBy": "mode",
    "includeMode": false,
    "extensions": {
      "description": false,
      "scopes": false,
      "codeSyntax": false
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `dir` | required | Output directory for token files |
| `dtcg` | `true` | Use DTCG format (`$value`, `$type`) |
| `includeVariableId` | `false` | Include Figma variable IDs |
| `splitBy` | `"mode"` | Split strategy (see below) |
| `includeMode` | `false` | Include mode name as first-level key |
| `extensions` | - | Metadata to include |

## Split Strategies

### `splitBy: "mode"`

One file per mode:

```
tokens/
├── theme.light.json
└── theme.dark.json
```

### `splitBy: "group"`

One file per top-level group:

```
tokens/
├── primitives.colors.json
├── primitives.spacing.json
└── primitives.typography.json
```

### `splitBy: "none"`

Single file for entire collection:

```
tokens/
└── theme.json
```

## DTCG Format

With `dtcg: true` (default):

```json
{
  "colors": {
    "primary": {
      "$value": "#0066cc",
      "$type": "color"
    }
  }
}
```

With `dtcg: false`:

```json
{
  "colors": {
    "primary": {
      "value": "#0066cc",
      "type": "color"
    }
  }
}
```

## Variable IDs

Include Figma variable IDs for debugging or tooling:

```json
{
  "tokens": {
    "includeVariableId": true
  }
}
```

Output:

```json
{
  "colors": {
    "primary": {
      "$value": "#0066cc",
      "$type": "color",
      "$extensions": {
        "com.figma": {
          "variableId": "VariableID:10:11"
        }
      }
    }
  }
}
```

## Extensions

Include additional Figma metadata:

```json
{
  "tokens": {
    "extensions": {
      "description": true,
      "scopes": true,
      "codeSyntax": true
    }
  }
}
```

| Extension | Description |
|-----------|-------------|
| `description` | Variable description from Figma |
| `scopes` | Usage scopes (ALL_FILLS, STROKE_COLOR, etc.) |
| `codeSyntax` | Platform code names (WEB, iOS, Android) |

Output with all extensions:

```json
{
  "colors": {
    "primary": {
      "$value": "#0066cc",
      "$type": "color",
      "$description": "Primary brand color",
      "$extensions": {
        "com.figma": {
          "scopes": ["ALL_FILLS", "STROKE_COLOR"],
          "codeSyntax": {
            "WEB": "--color-primary",
            "iOS": "colorPrimary"
          }
        }
      }
    }
  }
}
```

::: tip
Re-run the Figma plugin after updating it to capture new metadata fields.
:::
