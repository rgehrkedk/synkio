# Output Formats

Synkio supports multiple output formats for different use cases.

## DTCG Format

By default, tokens use [DTCG](https://design-tokens.github.io/community-group/format/) format:

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

Disable with `dtcg: false` for legacy format:

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

## Token Types

| Type | Example |
|------|---------|
| `color` | `#0066cc`, `rgba(0, 102, 204, 1)` |
| `dimension` | `16px`, `1rem` |
| `number` | `1.5`, `400` |
| `string` | `"Inter"`, `"bold"` |
| `boolean` | `true`, `false` |
| `typography` | Font family, size, weight, etc. |
| `shadow` | Offset, blur, spread, color |

## Alias References

References use curly brace syntax:

```json
{
  "colors": {
    "brand": {
      "$value": "#0066cc",
      "$type": "color"
    },
    "primary": {
      "$value": "{colors.brand}",
      "$type": "color"
    }
  }
}
```

## Variable IDs

Include Figma variable IDs for tooling:

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

## Metadata Extensions

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

### Description

Variable description from Figma:

```json
{
  "$description": "Primary brand color used for CTAs"
}
```

### Scopes

Usage scopes restrict where the token can be applied:

```json
{
  "$extensions": {
    "com.figma": {
      "scopes": ["ALL_FILLS", "STROKE_COLOR"]
    }
  }
}
```

Available scopes:

- `ALL_FILLS` — All fill properties
- `STROKE_COLOR` — Stroke colors
- `TEXT_FILL` — Text colors
- `FRAME_FILL` — Frame backgrounds
- `EFFECT_COLOR` — Effect colors
- `SHAPE_FILL` — Shape fills

### Code Syntax

Platform-specific code names:

```json
{
  "$extensions": {
    "com.figma": {
      "codeSyntax": {
        "WEB": "--color-primary",
        "iOS": "colorPrimary",
        "Android": "color_primary"
      }
    }
  }
}
```

## CSS Output

Generate CSS custom properties:

```json
{
  "build": {
    "css": {
      "enabled": true
    }
  }
}
```

Output:

```css
:root {
  --color-primary: #0066cc;
  --spacing-md: 16px;
}

[data-theme="dark"] {
  --color-primary: #4d9fff;
}
```

## Full Example

Complete token with all extensions:

```json
{
  "colors": {
    "primary": {
      "$value": "#0066cc",
      "$type": "color",
      "$description": "Primary brand color",
      "$extensions": {
        "com.figma": {
          "variableId": "VariableID:10:11",
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
