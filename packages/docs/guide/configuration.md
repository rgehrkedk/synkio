# Configuration

Configuration is stored in `synkio.config.json` in your project root.

## Basic Config

```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "ABC123xyz",
    "accessToken": "${FIGMA_TOKEN}"
  },
  "tokens": {
    "dir": "tokens"
  }
}
```

| Field | Description |
|-------|-------------|
| `version` | Config schema version (`1.0.0`) |
| `figma.fileId` | Figma file ID (from URL) |
| `figma.accessToken` | Token placeholder (uses `.env`) |
| `figma.baseUrl` | Custom API URL (enterprise only) |
| `tokens.dir` | Token output directory |

## Full Example

```json
{
  "version": "1.0.0",
  "figma": {
    "fileId": "ABC123xyz",
    "accessToken": "${FIGMA_TOKEN}"
  },
  "tokens": {
    "dir": "tokens",
    "dtcg": true,
    "splitBy": "mode",
    "includeMode": false,
    "includeVariableId": false,
    "extensions": {
      "description": true,
      "scopes": false,
      "codeSyntax": false
    },
    "collections": {
      "theme": {
        "splitBy": "mode"
      },
      "primitives": {
        "splitBy": "none"
      }
    },
    "styles": {
      "enabled": true,
      "paint": { "enabled": true },
      "text": { "enabled": true },
      "effect": { "enabled": true }
    }
  },
  "build": {
    "autoRun": false,
    "script": "npm run build:tokens",
    "css": {
      "enabled": true,
      "file": "tokens.css"
    }
  },
  "docsPages": {
    "enabled": true,
    "dir": "synkio/docs",
    "title": "Design Tokens"
  }
}
```

## Configuration Sections

- [Tokens Options](/guide/configuration/tokens) — Output format and structure
- [Build Options](/guide/configuration/build) — Build scripts and automation
- [CSS Options](/guide/configuration/css) — CSS custom properties
- [Collections](/guide/configuration/collections) — Per-collection settings
- [Styles](/guide/configuration/styles) — Figma styles configuration
- [Import](/guide/configuration/import) — Native JSON import sources

## Environment Variables

Use `${VAR_NAME}` syntax to reference environment variables:

```json
{
  "figma": {
    "accessToken": "${FIGMA_TOKEN}"
  }
}
```

Then set in your `.env`:

```bash
FIGMA_TOKEN=your_token_here
```

## Legacy Config

The legacy `tokensrc.json` format is deprecated but still supported. Migrate to `synkio.config.json` for new features.
