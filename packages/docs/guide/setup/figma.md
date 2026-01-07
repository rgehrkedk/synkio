# Figma Setup

Set up your Figma environment for Synkio.

## Getting a Figma Access Token

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Scroll to **Personal access tokens**
3. Click **Generate new token**
4. Give it a descriptive name (e.g., "Synkio CLI")
5. Copy and save the token (shown only once)

Add to your `.env`:

```bash
FIGMA_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxx
```

::: warning
Never commit your Figma token to git. Add `.env` to your `.gitignore`.
:::

## Finding Your File ID

From your Figma URL:

```
https://www.figma.com/design/ABC123xyz/My-Design-System
                            ^^^^^^^^^^
                            This is your fileId
```

The file ID is the alphanumeric string between `/design/` and the file name.

## Installing the Plugin

1. Open your Figma file
2. Go to **Resources → Plugins**
3. Search for "Synkio"
4. Click **Run**

Or install from the [Figma Community](https://www.figma.com/community).

## Running the Plugin

1. Open your Figma file with variables
2. Run **Plugins → Synkio**
3. Click "Sync" to export variables

The plugin writes token data to `sharedPluginData`, which the CLI reads via the standard Files API.

## Plugin Features

- **Sync** — Export all variables to sharedPluginData
- **Diff View** — See changes before syncing
- **History** — View previous sync states
- **Create PR** — Create GitHub PR directly from Figma

## Without the Plugin

You can use Synkio without the plugin by importing Figma's native JSON exports:

1. In Figma, go to **File → Export → Variables → JSON**
2. Save the JSON file(s) to your project
3. Run `synkio import`

See [import command](/guide/commands/import) for details.

## Figma Enterprise

For Figma Enterprise with custom domains, set `baseUrl`:

```json
{
  "figma": {
    "fileId": "ABC123xyz",
    "accessToken": "${FIGMA_TOKEN}",
    "baseUrl": "https://api.figma.your-company.com/v1"
  }
}
```

## Troubleshooting

Quick fixes for common issues:

| Error | Solution |
|-------|----------|
| "FIGMA_TOKEN not set" | Add token to `.env` file in project root |
| "403 Forbidden" | Verify token access, regenerate if needed |
| "404 Not Found" | Check fileId in config matches your URL |
| "Plugin data not found" | Run Synkio plugin in Figma, or use `synkio import` |

For detailed error messages and solutions, see the [Troubleshooting Guide](/guide/troubleshooting#figma-connection-issues).
