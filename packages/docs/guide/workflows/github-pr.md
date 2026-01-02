# GitHub PR Workflow

The GitHub PR workflow enables designers to propose token changes that developers can review before applying.

## Overview

**Key Benefits:**

- Designers can create PRs directly from Figma without developer help
- Team reviews changes before applying to codebase
- Breaking changes are visible in human-readable format
- Complete audit trail in git history
- No config duplication (plugin only needs GitHub repo info)

## Setup

1. **Configure GitHub in Figma plugin:**
   - Repository: `owner/repo`
   - Branch: `main` (or your default branch)
   - Token: GitHub personal access token (for private repos)

2. **Ensure `synkio.config.json` exists in your repository**

## Workflow Steps

### 1. Designer: Create PR from Figma

1. Make changes to variables/styles in Figma
2. Open Synkio plugin
3. Click "Create PR"

The plugin creates a PR with:

- `synkio/baseline.json` — Token data in baseline format
- `synkio/SYNC_REPORT.md` — Human-readable change summary

**SYNC_REPORT.md includes:**

- Summary counts (new, changed, renamed, deleted tokens)
- Breaking changes section
- New tokens list
- Value changes list
- Mode changes
- Style changes

### 2. Team: Review PR

Review the `SYNC_REPORT.md` to see:

- New tokens
- Changed values
- Deleted tokens (breaking)
- Renamed tokens (breaking)
- Mode changes
- Style changes

Approve or request changes.

### 3. Developer: Apply Changes

After merging the PR:

```bash
# Build token files from the baseline
npx synkio build
```

This will:

- Read `synkio/baseline.json` (updated by the PR)
- Split tokens into files per your config
- Run `build.script` if configured
- Show warnings for breaking changes

## Comparison: Pull vs PR Workflow

| Aspect | `synkio pull` + `build` | GitHub PR Workflow |
|--------|-------------------------|-------------------|
| **Source** | Figma API (direct) | Pre-reviewed PR |
| **Review** | At CLI execution | In PR before merge |
| **Breaking** | pull reports, build warns | Visible in PR |
| **Audit Trail** | Baseline in `synkio/` | PR + SYNC_REPORT.md |
| **Designer Autonomy** | Requires developer | Designer creates PR |
| **Best for** | Solo dev, quick sync | Team workflow, auditing |

## Best Practices

### 1. Review Breaking Changes Carefully

- Check `SYNC_REPORT.md` for deletions and renames
- Search codebase for deleted token references before merging
- Update code to use new token names if needed

### 2. Use Meaningful PR Titles

The plugin uses the default title:

```
chore: Sync design tokens from Figma
```

Customize to provide more context (e.g., "feat: Add dark mode tokens").

### 3. Automate with GitHub Actions

Automatically apply changes when PR is merged:

```yaml
# .github/workflows/synkio-build.yml
name: Apply Design Tokens

on:
  push:
    branches: [main]
    paths: ['synkio/baseline.json']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx synkio build
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: Build design tokens"
          file_pattern: "tokens/**/*.json"
```

### 4. Handle Merge Conflicts

If two PRs modify `baseline.json`:

- Last merge wins (baseline is source of truth)
- Re-run plugin to create new PR with latest state
- Consider using branch protection rules

### 5. Test Locally Before Merging

```bash
# Check if token files match baseline
npx synkio diff
```
