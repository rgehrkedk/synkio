# GitHub Integration - Automatic PR Creation

This document describes the GitHub integration added to the Figma Token Sync Plugin to enable automatic pull request creation.

## Overview

The plugin can now automatically create GitHub Pull Requests when exporting design tokens, eliminating the need for manual file uploads.

## What Was Changed

### 1. Manifest (`manifest.json`)
- **Added**: `networkAccess` permissions for `https://api.github.com`
- **Purpose**: Allows the plugin to trigger GitHub Actions workflows

### 2. Plugin Code (`src/code.ts`)
- **Added**: Message handlers for saving/loading GitHub configuration
- **Storage**: Uses Figma's `clientStorage` API to persist GitHub token
- **Handlers**:
  - `save-github-config` - Saves GitHub token and repo info
  - `load-github-config` - Loads saved configuration on plugin init

### 3. UI (`src/ui.html`)
- **Added**: GitHub Integration section in Export tab with:
  - GitHub token input field
  - Save/Test configuration buttons
  - Auto-create PR checkbox
  - Status messages
- **Added**: JavaScript functions:
  - `triggerGitHubWorkflow()` - Calls GitHub Actions workflow_dispatch API
  - `showGitHubStatus()` - Shows status messages
  - `updateExportButtonText()` - Updates button text based on checkbox
- **Modified**: Export complete handler to:
  - Check if auto-create PR is enabled
  - Call GitHub API to trigger workflow
  - Show success/error messages with workflow URL
  - Fall back to file download if PR creation fails

### 4. GitHub Actions Workflow (`.github/workflows/figma-sync-create-pr.yml`)
- **New file**: Workflow that creates PRs when triggered
- **Inputs**:
  - `baseline_content` - Base64-encoded baseline snapshot JSON
  - `commit_message` - Commit message for the PR
- **Actions**:
  - Creates new branch (`figma-sync-{timestamp}`)
  - Commits baseline changes
  - Creates pull request with labels
  - Uses built-in `GITHUB_TOKEN` (no secrets needed!)

## How It Works

```
┌──────────────────────┐
│   Figma Plugin       │
│   Designer exports   │
│   tokens             │
└───────────┬──────────┘
            │
            │ 1. User clicks "Export & Create PR"
            │ 2. Plugin encodes baseline as base64
            │ 3. Calls GitHub API workflow_dispatch
            ↓
┌──────────────────────┐
│   GitHub Actions     │
│   Workflow           │
│   (.github/          │
│    workflows/        │
│    figma-sync-       │
│    create-pr.yml)    │
└───────────┬──────────┘
            │
            │ 4. Creates branch
            │ 5. Commits baseline
            │ 6. Creates PR
            ↓
┌──────────────────────┐
│   Pull Request       │
│   Created! 🎉        │
│                      │
│   Ready for review   │
└──────────────────────┘
```

## Setup Instructions

### For You (Repo Admin)

1. **Commit the workflow file**:
   ```bash
   git add .github/workflows/figma-sync-create-pr.yml
   git commit -m "feat: add Figma sync PR creation workflow"
   git push
   ```

2. **Generate a Personal Access Token**:
   - Go to https://github.com/settings/personal-access-tokens/new
   - Token name: `Figma Plugin Workflow Trigger`
   - Repository access: Only `token-vault-eboks`
   - Permissions:
     - Actions: Read and write
     - Contents: Read and write
     - Pull requests: Read and write
     - Workflows: Read and write
   - Generate token and copy it

3. **Share token with designers** (or use it yourself)

### For Designers

1. **Open the Figma plugin** in your Figma file
2. **Go to Export tab**
3. **Paste the GitHub token** in the "GitHub Token" field
4. **Click "Save Configuration"**
5. **Test it** by clicking "Test Connection"
6. **Done!** Now "Export & Create PR" will automatically create PRs

## Token Security

- Token is stored in Figma's encrypted `clientStorage`
- Token never appears in plugin code or logs
- Token only works for the specified repository
- Can be revoked anytime from GitHub settings

## Features

### Automatic PR Creation
- ✅ Creates branch automatically
- ✅ Commits baseline changes
- ✅ Creates PR with descriptive title and body
- ✅ Adds labels: `design-tokens`, `figma-sync`
- ✅ Links to workflow run

### Fallback Behavior
- ⚠️ If PR creation fails → downloads JSON file instead
- ⚠️ If network error → downloads JSON file
- ⚠️ If token not configured → downloads JSON file
- ⚠️ If checkbox unchecked → downloads JSON file

### User Experience
- Button text changes: "Export & Create PR" or "Export & Download"
- Status messages show success/error
- Link to workflow run after success
- Clear error messages if something fails

## Testing

### Test the workflow manually:
```bash
.github/scripts/test-figma-sync-workflow.sh
```

### Test in Figma plugin:
1. Configure GitHub token
2. Click "Test Connection" → should show ✓ Connection successful
3. Export tokens with PR creation enabled
4. Check GitHub for new PR

## Troubleshooting

### "Invalid GitHub token"
- Token might be expired
- Token might not have correct scopes
- Regenerate token with correct permissions

### "Repository not found or no access"
- Token doesn't have access to the repo
- Check repository access in token settings

### "GitHub API error: 404"
- Workflow file doesn't exist in the repo
- Push the workflow file first

### PR not created
- Check workflow runs: https://github.com/e-Boks-com/token-vault-eboks/actions
- Look for errors in workflow logs

## Benefits

### Before (Manual Process):
1. Export from Figma → downloads JSON
2. Open terminal
3. Run `pnpm upload-baseline -i`
4. Enter file path
5. Confirm commit
6. Confirm push
**Total time: 2-3 minutes**

### After (Automated):
1. Export from Figma → clicks "Export & Create PR"
2. Done! ✅
**Total time: 10 seconds**

### Time Savings:
- **90% faster** per sync
- **Zero context switching** (no terminal needed)
- **Zero manual errors** (no typos in commands)
- **Full audit trail** (every change is a PR)

## Next Steps

After PR is created:
1. Review changes in GitHub
2. Merge PR when ready
3. Existing `process-tokens.yml` workflow runs automatically
4. Tokens are processed, built, and released

No changes to existing workflows needed! 🎉
