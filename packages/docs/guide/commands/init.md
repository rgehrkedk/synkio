# init

Initialize a new Synkio project.

## Usage

```bash
npx synkio init
```

## Options

| Flag | Description |
|------|-------------|
| `--figma-url=<url>` | Figma file URL |
| `--base-url=<url>` | Custom Figma API URL (enterprise) |

## What It Creates

The init command creates:

- `synkio.config.json` — Configuration file
- `.env.example` — Template for your `FIGMA_TOKEN`

## Example

```bash
# Interactive mode (recommended)
npx synkio init

# With URL provided
npx synkio init --figma-url="https://www.figma.com/design/ABC123/Design-System"
```

## Finding Your File ID

From your Figma URL:

```
https://www.figma.com/design/ABC123xyz/My-Design-System
                            ^^^^^^^^^^
                            This is your fileId
```
