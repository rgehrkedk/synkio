# Hosting Documentation

The `synkio docs` command generates a static HTML site that can be hosted anywhere.

## GitHub Pages

The easiest option for GitHub-hosted projects.

### Automatic Deployment

Create `.github/workflows/deploy-docs.yml`:

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths:
      - 'tokens/**'
      - 'synkio/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx synkio docs

      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: 'synkio/docs'
      - uses: actions/deploy-pages@v4
```

Then enable GitHub Pages in your repository settings (Source: GitHub Actions).

## Netlify

### Option 1: Netlify UI

1. Connect your repository
2. Build command: `npm ci && npx synkio docs`
3. Publish directory: `synkio/docs`

### Option 2: netlify.toml

```toml
[build]
  command = "npm ci && npx synkio docs"
  publish = "synkio/docs"

[build.environment]
  NODE_VERSION = "20"
```

## Vercel

### Option 1: Vercel UI

1. Connect your repository
2. Framework Preset: Other
3. Build Command: `npm ci && npx synkio docs`
4. Output Directory: `synkio/docs`

### Option 2: vercel.json

```json
{
  "buildCommand": "npm ci && npx synkio docs",
  "outputDirectory": "synkio/docs"
}
```

## Cloudflare Pages

1. Connect your repository
2. Build command: `npm ci && npx synkio docs`
3. Build output directory: `synkio/docs`

## Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx synkio docs

FROM nginx:alpine
COPY --from=builder /app/synkio/docs /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:

```bash
docker build -t synkio-docs .
docker run -p 8080:80 synkio-docs
```

## Custom Output Directory

Change the docs output location:

```json
{
  "docsPages": {
    "enabled": true,
    "dir": "public/styleguide"
  }
}
```

Or via CLI:

```bash
npx synkio docs --output=public/styleguide
```

## Auto-Generate on Build

Enable docs generation during every build:

```json
{
  "docsPages": {
    "enabled": true
  }
}
```

Now `synkio build` will regenerate docs automatically.

## Serving Locally

For development, serve the docs locally:

```bash
npx synkio docs --open
```

Or use any static server:

```bash
npx serve synkio/docs
```
