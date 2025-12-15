# Hosting Design Tokens Documentation

Synkio generates static HTML documentation that can be hosted anywhere. This guide covers the most popular plug-and-play options.

## Quick Start

```bash
# Generate docs
npx synkio docs

# Output is in .synkio/docs/ by default
```

---

## Option 1: GitHub Pages (Recommended)

The easiest way to host your design tokens documentation with automatic updates.

### Automatic Deployment with GitHub Actions

1. **Copy the workflow file** to your project:

```bash
mkdir -p .github/workflows
curl -o .github/workflows/deploy-docs.yml \
  https://raw.githubusercontent.com/rgehrkedk/synkio/main/.github/workflows/deploy-docs.yml
```

Or create `.github/workflows/deploy-docs.yml` manually:

```yaml
name: Deploy Design Tokens Docs

on:
  push:
    branches: [main]
    paths:
      - '**/tokens/**'
      - '**/baseline.json'
      - '**/.synkio/baseline.json'
      - 'tokensrc.json'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx synkio docs
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .synkio/docs

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

2. **Enable GitHub Pages**:
   - Go to your repository's **Settings** > **Pages**
   - Set **Source** to **GitHub Actions**
   - Save

3. **Push and deploy**:
```bash
git add .github/workflows/deploy-docs.yml
git commit -m "Add design tokens docs deployment"
git push
```

Your docs will be available at: `https://<username>.github.io/<repo>/`

### Manual Deployment (gh-pages branch)

If you prefer using the `gh-pages` branch:

```bash
# Install gh-pages
npm install gh-pages --save-dev

# Add deploy script to package.json
npm pkg set scripts.deploy:docs="synkio docs && gh-pages -d .synkio/docs"

# Deploy
npm run deploy:docs
```

---

## Option 2: Netlify

### One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

### Manual Setup

1. Create `netlify.toml` in your project root:

```toml
[build]
  command = "npm run build && npx synkio docs"
  publish = ".synkio/docs"

[build.environment]
  NODE_VERSION = "20"

# Redirect all 404s to index for SPA-like behavior
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. Connect your repository to Netlify
3. Deploy!

### Auto-deploy on Token Changes

Netlify will auto-deploy when any file changes. To deploy only on token changes, use build ignore:

```toml
[build]
  command = "npm ci && npx synkio docs"
  publish = ".synkio/docs"
  ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- tokens/ .synkio/baseline.json"
```

---

## Option 3: Vercel

1. Create `vercel.json`:

```json
{
  "buildCommand": "npm ci && npx synkio docs",
  "outputDirectory": ".synkio/docs",
  "installCommand": "npm ci"
}
```

2. Deploy:
```bash
npx vercel
```

Or connect your GitHub repo for automatic deployments.

---

## Option 4: Cloudflare Pages

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Connect your repository
3. Configure build settings:
   - **Build command**: `npm ci && npx synkio docs`
   - **Build output directory**: `.synkio/docs`

---

## Option 5: Docker / Self-Hosted

For internal hosting or custom infrastructure:

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx synkio docs

FROM nginx:alpine
COPY --from=builder /app/.synkio/docs /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Build and run:

```bash
docker build -t design-tokens-docs .
docker run -p 8080:80 design-tokens-docs
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  docs:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

---

## Option 6: Static File Server

For simple local hosting or intranet:

```bash
# Generate docs
npx synkio docs

# Serve with any static server
npx serve .synkio/docs

# Or with Python
python -m http.server 8000 -d .synkio/docs

# Or with PHP
php -S localhost:8000 -t .synkio/docs
```

---

## Custom Domain Setup

### GitHub Pages
1. Go to **Settings** > **Pages**
2. Add your custom domain
3. Create a `CNAME` file in `.synkio/docs/` with your domain

Add to your workflow:
```yaml
- name: Add CNAME
  run: echo "tokens.example.com" > .synkio/docs/CNAME
```

### Netlify/Vercel
Configure custom domain in their dashboards.

---

## Embedding in Existing Sites

### iframe

```html
<iframe
  src="https://your-tokens-site.com"
  width="100%"
  height="800px"
  frameborder="0">
</iframe>
```

### Subdirectory

Deploy docs to a subdirectory of your main site:

```bash
# Build docs to specific directory
npx synkio docs --output=public/design-tokens

# Or in your build process
cp -r .synkio/docs ./public/design-tokens
```

---

## CI/CD Best Practices

### Only Deploy on Token Changes

```yaml
# GitHub Actions - only run when tokens change
on:
  push:
    paths:
      - 'tokens/**'
      - '.synkio/baseline.json'
      - 'tokensrc.json'
```

### Add Version/Commit Info

```yaml
- name: Add build info
  run: |
    echo "{\"commit\":\"$GITHUB_SHA\",\"date\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
      > .synkio/docs/build-info.json
```

### Notify on Deploy

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {"text": "Design tokens docs deployed: ${{ steps.deployment.outputs.page_url }}"}
```

---

## Troubleshooting

### Build fails: "No baseline found"

Make sure you have a `.synkio/baseline.json` file committed:

```bash
npx synkio sync
git add .synkio/baseline.json
git commit -m "Add baseline"
```

### Docs not updating

1. Check if workflow is triggered (Actions tab)
2. Verify paths in workflow match your structure
3. Check if Pages source is set to "GitHub Actions"

### Custom styles not applied

The generated docs are self-contained. To customize:
1. Fork/copy the docs after generation
2. Modify `assets/docs.css`
3. Consider contributing custom themes upstream

---

## Summary

| Platform | Ease | Custom Domain | Auto-deploy | Free Tier |
|----------|------|---------------|-------------|-----------|
| GitHub Pages | Easy | Yes | Yes | Yes |
| Netlify | Easy | Yes | Yes | Yes (100GB/mo) |
| Vercel | Easy | Yes | Yes | Yes (100GB/mo) |
| Cloudflare Pages | Easy | Yes | Yes | Yes (unlimited) |
| Docker | Medium | Yes | Manual | N/A |

**Recommended**: GitHub Pages for open source, Netlify/Vercel for teams, Docker for enterprise/internal.
