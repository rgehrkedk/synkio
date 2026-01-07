# serve

Start a local HTTP server to serve the baseline file for the Figma plugin.

```bash
synkio serve [options]
```

## Overview

The `serve` command enables local development workflows by hosting your export-baseline file on a local HTTP server. The Figma plugin can then fetch this baseline directly from your machine instead of requiring manual file imports.

This is particularly useful when:
- Developing and testing the roundtrip workflow (code → Figma → code)
- Making frequent updates to your token files
- Working in a team without a deployed baseline server

## Options

| Option | Description |
|--------|-------------|
| `--port=<number>` | Port to listen on (default: 3847) |
| `--token=<string>` | Custom access token for authentication |
| `--no-token` | Disable token authentication (not recommended) |

## Usage

### Basic Usage

```bash
# Generate export baseline first
synkio export-baseline

# Start the server
synkio serve
```

Output:
```
  Synkio baseline server running

  Token:   a1b2c3d4e5f6789...
  URL:     http://localhost:3847/baseline?token=a1b2c3d4e5f6789...
  Health:  http://localhost:3847/health

  In the Figma plugin:
    1. Go to Settings
    2. Select "Local Server"
    3. Port: 3847
    4. Token: a1b2c3d4e5f6789...

  Press Ctrl+C to stop
```

### Custom Port

```bash
synkio serve --port=8080
```

### Custom Token

```bash
synkio serve --token=my-secret-token
```

### Disable Authentication

```bash
# Not recommended for shared networks
synkio serve --no-token
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` or `/baseline` | Returns the export-baseline.json content |
| `/health` | Health check endpoint (returns `{ "status": "ok" }`) |

## Authentication

By default, the server generates a random access token on each start. Requests must include this token via:

- **Header**: `X-Synkio-Token: <token>`
- **Query parameter**: `?token=<token>`

Unauthorized requests receive a `401 Unauthorized` response.

## Security

The server includes several security measures:

- **Token authentication** by default
- **CORS headers** for Figma plugin access
- **No-cache headers** to prevent stale data
- **Content-Security-Policy** headers

::: warning
Only run this server on trusted networks. The `--no-token` flag should only be used in isolated development environments.
:::

## Connecting from Figma Plugin

1. Start the server with `synkio serve`
2. In Figma, open the Synkio plugin
3. Go to **Settings** → **Source**
4. Select **Local Server**
5. Enter the port number (default: 3847)
6. Enter the access token shown in the terminal

The plugin will now fetch baseline data from your local machine.

## Workflow Example

```bash
# 1. Make changes to your token files
vim tokens/colors.light.json

# 2. Generate export baseline
synkio export-baseline

# 3. Start server (keep running)
synkio serve

# 4. In Figma, use plugin to fetch and compare
# 5. After making changes in Figma, run pull
synkio pull

# 6. Regenerate export baseline if needed
synkio export-baseline
# Server automatically serves updated file
```

## Troubleshooting

### "Port already in use"

Another process is using the default port.

```bash
# Use a different port
synkio serve --port=3848
```

### "Baseline file not found"

The export-baseline.json doesn't exist.

```bash
# Generate it first
synkio export-baseline
synkio serve
```

### Plugin can't connect

1. Verify the server is running
2. Check the port matches plugin settings
3. Ensure the token is correct
4. Check firewall settings if on a restricted network

## See Also

- [export-baseline](/guide/commands/export) - Generate the baseline file
- [pull](/guide/commands/pull) - Fetch changes from Figma
- [Troubleshooting](/guide/troubleshooting) - Common issues and solutions
