# Synkio Installation & Setup Guide

**Version:** 1.0.0  
**Last Updated:** December 7, 2025

This guide helps you install and set up Synkio for syncing Figma design tokens to your codebase.

---

## Prerequisites

### Required
- **Node.js:** v18 or higher
- **npm or pnpm:** Latest version
- **Figma Account:** With access to your design file
- **Figma Access Token:** Personal access token from Figma settings

### Recommended
- **Style Dictionary:** v4.x (optional, but recommended)
- **VS Code:** For JSON Schema autocomplete support

---

## Quick Start (5 minutes)

### 1. Install Synkio

```bash
# Using npm
npm install -g @synkio/core

# Using pnpm
pnpm add -g @synkio/core

# Verify installation
synkio --version
```

### 2. Get Figma Access Token

1. Go to [figma.com/settings](https://figma.com/settings)
2. Scroll to "Personal access tokens"
3. Click "Create new token"
4. Name it (e.g., "Synkio Development")
5. Copy the token (starts with `figd_`)

### 3. Run Setup Wizard

```bash
cd your-project
synkio init
```

The wizard will:
- ✨ Detect your existing setup (Style Dictionary, etc.)
- 🔗 Connect to your Figma file
- 📦 Configure how collections should be organized
- 🔧 Set up build integration
- 🔄 Optionally configure code migration

**Expected time:** 5-10 minutes, 12-20 questions

### 4. Create .env File

```bash
# Create .env in your project root
echo "FIGMA_ACCESS_TOKEN=your_token_here" > .env
```

⚠️ **Important:** Add `.env` to your `.gitignore`!

### 5. First Sync

```bash
synkio sync
```

Done! 🎉 Your tokens are now synced.

---

## Detailed Installation

### Option 1: Global Installation (Recommended)

Best for CLI usage across multiple projects.

```bash
npm install -g @synkio/core

# Verify
which synkio
synkio --version
```

### Option 2: Project-Local Installation

Best for team projects with package.json scripts.

```bash
# Install as dev dependency
npm install --save-dev @synkio/core

# Or with pnpm
pnpm add -D @synkio/core

# Add scripts to package.json
{
  "scripts": {
    "tokens:init": "synkio init",
    "tokens:sync": "synkio sync",
    "tokens:diff": "synkio diff"
  }
}

# Use via npm scripts
npm run tokens:init
```

### Option 3: Run Without Installing (npx)

```bash
npx @synkio/core init
npx @synkio/core sync
```

---

## Configuration Wizard Guide

When you run `synkio init`, here's what to expect:

### Step 1: Project Detection (Automatic)
The wizard detects:
- ✓ Style Dictionary setup (if present)
- ✓ Token directories
- ✓ Build scripts

**You'll see:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Project Detection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Style Dictionary v4 detected
  Config: style-dictionary.config.mjs
  Build: npm run tokens:build
```

### Step 2: Figma Connection
**Questions:**
1. **Figma file URL or file ID:**
   ```
   https://figma.com/file/abc123xyz/My-Design
   ```
   Or just: `abc123xyz`

2. **Figma access token:**
   ```
   figd_your_token_here
   ```

3. **Figma node ID (optional):**
   Press Enter to skip, or enter node ID from plugin

**Retry on failure:**
If connection fails, you get up to 3 attempts with helpful error messages.

### Step 3: Collection Analysis (Automatic)
Shows what collections were found:
```
Found 2 collection(s):
- Theme (2 modes)
- Primitives (1 mode)
```

### Step 4: Collection Configuration
For each collection, choose how to organize:

**Example: Theme Collection (Multiple Modes)**
```
────────────────────────────────────────────────────────────
Collection: Theme
────────────────────────────────────────────────────────────

Modes (2):
  - light (45 tokens)
  - dark (45 tokens)

✓ Strategy: Create separate files for each mode (2 files)

Files to be created:
  - tokens/theme/light.json
  - tokens/theme/dark.json
```

**Example: Primitives Collection (Single Mode)**
```
────────────────────────────────────────────────────────────
Collection: Primitives
────────────────────────────────────────────────────────────

Modes (1):
  - default (120 tokens)

Groups (5):
  - color (40 tokens)
  - spacing (20 tokens)
  - typography (30 tokens)
  - radius (15 tokens)
  - shadow (15 tokens)

How should this collection be organized?
  1. Split by group - Create separate files for each group (5 files)
  2. Single file - All tokens in one file
  3. Skip this collection - Don't include in configuration

Choose strategy (1-3): 1

Files to be created:
  - tokens/primitives/color.json
  - tokens/primitives/spacing.json
  - tokens/primitives/typography.json
  - tokens/primitives/radius.json
  - tokens/primitives/shadow.json
```

### Step 5: Build Integration (Automatic if Style Dictionary detected)
```
✓ Style Dictionary integration configured automatically
```

**Or if not detected:**
```
Add a build command to run after sync? (y/N): y
Build command: [npm run tokens:build]: npm run build:tokens
```

### Step 6: Migration (Optional)
```
Optional: Configure automatic migration for breaking token changes? (y/N): n
```

If you choose yes:
1. Select platforms (CSS, SCSS, TypeScript, Swift, Kotlin)
2. Auto-generated configuration for each platform
3. Strip segments calculated from your collections

---

## Configuration File

After setup, you'll have a `tokensrc.json`:

```json
{
  "$schema": "https://unpkg.com/@synkio/core/schemas/tokensrc.schema.json",
  "version": "1.0.0",
  "figma": {
    "fileId": "abc123xyz",
    "accessToken": "${FIGMA_ACCESS_TOKEN}"
  },
  "paths": {
    "root": ".",
    "data": "figma-sync/.figma/data",
    "baseline": "figma-sync/.figma/data/baseline.json",
    "baselinePrev": "figma-sync/.figma/data/baseline.prev.json",
    "reports": "figma-sync/.figma/reports",
    "tokens": "tokens",
    "styles": "styles/tokens"
  },
  "split": {
    "theme": {
      "collection": "theme",
      "strategy": "byMode",
      "output": "tokens/theme",
      "files": {
        "light": "tokens/theme/light.json",
        "dark": "tokens/theme/dark.json"
      }
    },
    "primitives": {
      "collection": "primitives",
      "strategy": "byGroup",
      "output": "tokens/primitives",
      "files": {
        "color": "tokens/primitives/color.json",
        "spacing": "tokens/primitives/spacing.json",
        "typography": "tokens/primitives/typography.json",
        "radius": "tokens/primitives/radius.json",
        "shadow": "tokens/primitives/shadow.json"
      }
    }
  },
  "build": {
    "command": "npm run tokens:build",
    "styleDictionary": {
      "enabled": true,
      "config": "style-dictionary.config.mjs",
      "version": "v4"
    }
  }
}
```

### IDE Support (VS Code)

The `$schema` property enables:
- ✨ Autocomplete for all fields
- 📝 Inline documentation on hover
- ✅ Real-time validation
- 💡 Suggestions for valid values

---

## Environment Variables

Create a `.env` file in your project root:

```bash
# Required
FIGMA_ACCESS_TOKEN=figd_your_token_here

# Optional
FIGMA_FILE_URL=https://figma.com/file/abc123xyz/My-Design
FIGMA_NODE_ID=123:456
```

**Security Best Practices:**
1. ✅ Add `.env` to `.gitignore`
2. ✅ Never commit tokens to version control
3. ✅ Use environment variables in CI/CD
4. ✅ Rotate tokens regularly

---

## Common Workflows

### Daily Development
```bash
# Sync tokens from Figma
synkio sync

# Preview changes without applying
synkio sync --dry-run

# Compare with current baseline
synkio diff
```

### CI/CD Pipeline
```yaml
# .github/workflows/sync-tokens.yml
name: Sync Tokens
on:
  schedule:
    - cron: '0 9 * * *' # Daily at 9 AM
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          
      - run: npm install -g @synkio/core
      
      - run: synkio sync
        env:
          FIGMA_ACCESS_TOKEN: ${{ secrets.FIGMA_ACCESS_TOKEN }}
          
      - uses: peter-evans/create-pull-request@v5
        with:
          title: 'Update design tokens'
          commit-message: 'sync: update tokens from Figma'
```

### Team Setup
```bash
# 1. Clone repo
git clone your-repo
cd your-repo

# 2. Install dependencies
npm install

# 3. Get token from team lead or Figma settings

# 4. Create .env
echo "FIGMA_ACCESS_TOKEN=your_token" > .env

# 5. Sync (config already exists in repo)
npm run tokens:sync
```

---

## Troubleshooting

### Issue: "Access denied" (403)
**Solutions:**
1. Check token is valid and not expired
2. Verify you have at least "can view" access to the file
3. Generate a new token if needed

### Issue: "File not found" (404)
**Solutions:**
1. Verify file ID is correct
2. Check file hasn't been deleted
3. Ensure URL is from figma.com (not figjam.com)

### Issue: "Network connection failed"
**Solutions:**
1. Check internet connection
2. Verify firewall/proxy settings
3. Try again in a few moments

### Issue: Schema autocomplete not working in VS Code
**Solutions:**
1. Install "JSON" extension
2. Reload VS Code window
3. Verify `$schema` property is first in config file

### Issue: Tokens not building after sync
**Solutions:**
1. Check Style Dictionary config is valid
2. Run build command manually to see errors
3. Verify token paths in config match SD config

---

## Getting Help

### Documentation
- **Spec:** `agent-os/specs/.../spec.md`
- **Tasks:** `agent-os/specs/.../tasks.md`
- **Implementation:** `agent-os/specs/.../implementation/`

### Commands
```bash
# Show help for any command
synkio --help
synkio init --help
synkio sync --help

# Check version
synkio --version
```

### Support Channels
- GitHub Issues: [github.com/rgehrkedk/synkio/issues](https://github.com/rgehrkedk/synkio/issues)
- Discussions: [github.com/rgehrkedk/synkio/discussions](https://github.com/rgehrkedk/synkio/discussions)

---

## Next Steps

After successful installation:

1. **Run first sync:** `synkio sync`
2. **Set up Style Dictionary** (if not already)
3. **Configure CI/CD** for automated syncs
4. **Share .env.example** with team (without actual token)
5. **Document your workflow** for team members

---

## Upgrading from 0.x

If upgrading from version 0.x:

```bash
# 1. Update package
npm install -g @synkio/core@latest

# 2. Backup old config
cp tokensrc.json tokensrc.json.backup

# 3. Run init again (will show existing config warning)
synkio init

# 4. Or manually add new fields to existing config:
# - Add $schema property
# - Add split configuration
# - Update build.styleDictionary section
```

See CHANGELOG.md for breaking changes.

---

**Installation complete!** 🎉  
You're ready to sync design tokens from Figma to your codebase.
