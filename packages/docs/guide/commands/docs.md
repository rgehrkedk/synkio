# docs

Generate a static documentation site for your design tokens.

## Usage

```bash
npx synkio docs
```

## Options

| Flag | Description |
|------|-------------|
| `--output=<dir>` | Output directory (default: `synkio/docs`) |
| `--open` | Open in browser after generating |

## Examples

```bash
# Generate documentation
npx synkio docs

# Generate and open in browser
npx synkio docs --open

# Custom output directory
npx synkio docs --output=styleguide
```

## What's Generated

The generated site includes:

- **Color palettes** with visual swatches
- **Typography scales** with previews
- **Spacing tokens** with size references
- **CSS custom properties** reference
- **Copy-to-clipboard** functionality

## Configuration

Enable docs generation during build:

```json
{
  "docsPages": {
    "enabled": true,
    "dir": "synkio/docs",
    "title": "Design Tokens"
  }
}
```

## Hosting

The generated docs are static HTML and can be hosted anywhere.

### GitHub Pages

```yaml
# .github/workflows/deploy-docs.yml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths: ['tokens/**', 'synkio/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx synkio docs
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./synkio/docs
```

### Other Platforms

- **Netlify** — Connect repo, set build command to `npm ci && npx synkio docs`
- **Vercel** — Connect repo, set output directory to `synkio/docs`

See [Hosting Guide](/guide/setup/hosting) for detailed setup.
