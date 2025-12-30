# GitHub PR Workflow - Implementation Spec

**Status:** In Development
**Version:** 1.0.0
**Date:** 2025-12-30

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Commands](#commands)
4. [Figma Plugin Changes](#figma-plugin-changes)
5. [Implementation Plan](#implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Documentation Updates](#documentation-updates)

---

## Overview

### Goal
Enable designers to create PRs directly from Figma that developers can review and apply to their codebase.

### User Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Designer updates Figma variables/styles              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Plugin: Click "Create PR"                            │
│    - Generates export-baseline.json                      │
│    - Generates SYNC_REPORT.md                           │
│    - Creates GitHub branch                              │
│    - Commits both files                                 │
│    - Creates PR with summary                            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Team reviews PR                                      │
│    - Reads SYNC_REPORT.md for changes                  │
│    - Reviews breaking changes                          │
│    - Approves or requests changes                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Merge PR                                             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Developer runs: synkio build                         │
│    $ synkio build --from synkio/export-baseline.json   │
│    - Splits baseline into token files                   │
│    - Updates synkio/baseline.json                      │
│    - Runs build.script (if configured)                  │
└─────────────────────────────────────────────────────────┘
```

### Benefits

- ✅ **Designer autonomy** - Designers can propose token changes without developer help
- ✅ **PR review process** - Team can review changes before applying
- ✅ **Breaking change visibility** - SYNC_REPORT.md shows deletions/renames
- ✅ **Audit trail** - Git history shows exactly what changed and when
- ✅ **No config duplication** - Plugin only needs GitHub repo info
- ✅ **Simple mental model** - Clear separation: fetch vs build

---

## Architecture

### Command Structure

```bash
# Existing commands (unchanged)
synkio sync              # Figma API → baseline + token files
  --force                # Override breaking changes

synkio export            # token files → export-baseline.json (rename from export-baseline)

# New command
synkio build             # baseline → token files (NEW)
  --from <path>          # Use custom baseline source (default: synkio/baseline.json)
```

### Files in PR

```
synkio/
├── export-baseline.json    # Baseline from Figma (structured data)
└── SYNC_REPORT.md          # Human-readable diff report
```

### Baseline Format

**export-baseline.json** (same format as baseline.json):
```json
{
  "baseline": {
    "VariableID:1:2:theme.light": {
      "variableId": "VariableID:1:2",
      "collectionId": "VariableCollectionId:1:1",
      "modeId": "1:0",
      "collection": "theme",
      "mode": "light",
      "path": "colors.primary",
      "value": "#FF0000",
      "type": "color",
      "description": "Primary brand color"
    }
  },
  "styles": {
    "S:123:paint": {
      "styleId": "S:123",
      "type": "paint",
      "path": "brand.primary",
      "value": { "$type": "color", "$value": "#FF0000" }
    }
  },
  "metadata": {
    "syncedAt": "2025-12-30T12:00:00.000Z",
    "source": "figma-plugin"
  }
}
```

### Report Format

**SYNC_REPORT.md**:
```markdown
# Design Token Sync Report

**Generated:** 2025-12-30 12:00:00
**Author:** John Designer
**Figma File:** [Design System](https://figma.com/file/...)

---

## Summary

- ✨ **5 new tokens**
- 🔄 **12 value changes**
- 📝 **2 renamed tokens**
- ❌ **3 deleted tokens**

---

## ⚠️ Breaking Changes

The following changes may break existing code:

### Deleted Tokens
- `colors.primary` (was: `#FF0000`)
- `spacing.large` (was: `24px`)

### Renamed Tokens
- `tokens.hero.title` → `tokens.hero.heading`

---

## New Tokens

- `colors.secondary` = `#00FF00`
- `colors.tertiary` = `#0000FF`
- `spacing.xl` = `32px`
- `spacing.2xl` = `48px`
- `typography.display` = `{ fontFamily: "Inter", ... }`

---

## Value Changes

- `colors.accent`: `#FF00FF` → `#FF0088`
- `spacing.small`: `8px` → `12px`
- `typography.body.fontSize`: `16px` → `18px`
...

---

## Mode Changes

- ✨ New mode: `theme.dark-high-contrast`

---

## Style Changes

### Paint Styles
- ✨ New: `brand.accent` = `#FF0088`
- 🔄 Updated: `brand.primary` = `#FF0000` → `#FF0011`

---

Generated by [Synkio](https://github.com/yourusername/synkio) Figma Plugin
```

---

## Commands

### 1. `synkio build`

**Purpose:** Build token files from a baseline file

**Implementation:**
- Extract logic from `sync --regenerate`
- Add `--from` option for custom baseline path
- Add comparison logic (show diff, warn on breaking)
- Never blocks (only warns)

**File:** `packages/cli/src/cli/commands/build.ts`

**Usage:**
```bash
# Build from default baseline
$ synkio build

✓ Built 24 token files from synkio/baseline.json

# Build from export-baseline (after PR merge)
$ synkio build --from synkio/export-baseline.json

Reading baseline from synkio/export-baseline.json...

Changes from current baseline:
  ✨ 5 new tokens
  🔄 12 value changes
  📝 2 renames
  ❌ 3 deleted tokens

⚠️  Breaking changes detected:
  - colors.primary (deleted)
  - spacing.large (deleted)

Review SYNC_REPORT.md for details.

✓ Built 24 token files
✓ Updated synkio/baseline.json
✓ Ran build.script: npm run build:tokens

# Build from custom source
$ synkio build --from /path/to/custom-baseline.json
```

**Options:**
```typescript
interface BuildOptions {
  from?: string;       // Custom baseline path (default: synkio/baseline.json)
  config?: string;     // Config file path
  verbose?: boolean;   // Show detailed output
  preview?: boolean;   // Show what would change without applying
}
```

**Breaking Change Behavior:**
- Shows diff comparison
- Warns if breaking changes detected
- Does NOT block (assumes already reviewed in PR)
- References SYNC_REPORT.md if it exists

---

### 2. `synkio export` (rename from `export-baseline`)

**Purpose:** Export token files to baseline format for Figma plugin

**Changes:**
- Rename command from `export-baseline` to `export`
- Keep alias for backwards compatibility
- No functional changes

**Usage:**
```bash
# New command
$ synkio export

# Old command (deprecated, shows warning)
$ synkio export-baseline
⚠️  "export-baseline" is deprecated. Use "export" instead.
```

---

## Figma Plugin Changes

### New Features

1. **PR Creation UI**
2. **Report Generator**
3. **GitHub API Integration**

---

### 1. PR Creation UI

**Location:** Add "Create PR" button to Home screen

**UI Flow:**
```
┌────────────────────────────────────────┐
│ HOME SCREEN                            │
├────────────────────────────────────────┤
│ Sync Status: Pending changes (15)     │
│                                        │
│ [Sync to Code]  [Create PR] ← NEW     │
│                                        │
│ Last sync: 2 days ago                  │
└────────────────────────────────────────┘
        ↓ Click "Create PR"
┌────────────────────────────────────────┐
│ CREATE PULL REQUEST                    │
├────────────────────────────────────────┤
│ Repository: owner/repo                 │
│ Branch: main                           │
│                                        │
│ PR Title:                              │
│ [chore: Sync design tokens from Figma] │
│                                        │
│ Changes Summary:                       │
│ • 5 new tokens                         │
│ • 12 value changes                     │
│ • 3 deleted tokens ⚠️                  │
│                                        │
│ [Cancel]  [Create PR]                  │
└────────────────────────────────────────┘
        ↓ Success
┌────────────────────────────────────────┐
│ PR CREATED                             │
├────────────────────────────────────────┤
│ ✓ Pull request created successfully    │
│                                        │
│ PR #123: chore: Sync design tokens     │
│ https://github.com/owner/repo/pull/123 │
│                                        │
│ [View on GitHub]  [Done]               │
└────────────────────────────────────────┘
```

**Files to modify:**
- `packages/figma-plugin/synkio-v2/src/screens/home.ts`
- `packages/figma-plugin/synkio-v2/src/ui/components/Button/Button.ts`

---

### 2. Report Generator

**Purpose:** Generate SYNC_REPORT.md from comparison result

**File:** `packages/figma-plugin/synkio-v2/src/lib/report-generator.ts` (NEW)

**Function Signature:**
```typescript
export function generateSyncReport(
  diff: ComparisonResult,
  metadata: {
    author: string;
    figmaFileUrl: string;
    timestamp: string;
  }
): string;
```

**Output:** Markdown string (see Report Format above)

**Implementation:**
```typescript
export function generateSyncReport(
  diff: ComparisonResult,
  metadata: { author: string; figmaFileUrl: string; timestamp: string }
): string {
  const { valueChanges, pathChanges, newVariables, deletedVariables,
          newModes, deletedModes, modeRenames, collectionRenames,
          styleValueChanges, stylePathChanges, newStyles, deletedStyles } = diff;

  const totalChanges =
    newVariables.length +
    valueChanges.length +
    pathChanges.length +
    deletedVariables.length;

  const hasBreaking =
    deletedVariables.length > 0 ||
    pathChanges.length > 0 ||
    deletedModes.length > 0 ||
    deletedStyles.length > 0;

  let md = `# Design Token Sync Report\n\n`;
  md += `**Generated:** ${metadata.timestamp}\n`;
  md += `**Author:** ${metadata.author}\n`;
  md += `**Figma File:** [View in Figma](${metadata.figmaFileUrl})\n\n`;
  md += `---\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `- ✨ **${newVariables.length} new tokens**\n`;
  md += `- 🔄 **${valueChanges.length} value changes**\n`;
  md += `- 📝 **${pathChanges.length} renamed tokens**\n`;
  md += `- ❌ **${deletedVariables.length} deleted tokens**\n\n`;

  if (newStyles.length > 0) {
    md += `- ✨ **${newStyles.length} new styles**\n`;
  }
  if (styleValueChanges.length > 0) {
    md += `- 🔄 **${styleValueChanges.length} style value changes**\n`;
  }
  if (deletedStyles.length > 0) {
    md += `- ❌ **${deletedStyles.length} deleted styles**\n`;
  }

  md += `\n---\n\n`;

  // Breaking changes section
  if (hasBreaking) {
    md += `## ⚠️ Breaking Changes\n\n`;
    md += `The following changes may break existing code:\n\n`;

    if (deletedVariables.length > 0) {
      md += `### Deleted Tokens\n\n`;
      deletedVariables.forEach(v => {
        md += `- \`${v.path}\` (was: \`${formatValue(v.value)}\`)\n`;
      });
      md += `\n`;
    }

    if (pathChanges.length > 0) {
      md += `### Renamed Tokens\n\n`;
      pathChanges.forEach(c => {
        md += `- \`${c.oldPath}\` → \`${c.newPath}\`\n`;
      });
      md += `\n`;
    }

    if (deletedModes.length > 0) {
      md += `### Deleted Modes\n\n`;
      deletedModes.forEach(m => {
        md += `- \`${m.collection}.${m.mode}\`\n`;
      });
      md += `\n`;
    }

    if (deletedStyles.length > 0) {
      md += `### Deleted Styles\n\n`;
      deletedStyles.forEach(s => {
        md += `- \`${s.path}\` (${s.styleType})\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
  }

  // New tokens
  if (newVariables.length > 0) {
    md += `## New Tokens\n\n`;
    newVariables.slice(0, 20).forEach(v => {
      md += `- \`${v.path}\` = \`${formatValue(v.value)}\`\n`;
    });
    if (newVariables.length > 20) {
      md += `\n...and ${newVariables.length - 20} more\n`;
    }
    md += `\n---\n\n`;
  }

  // Value changes
  if (valueChanges.length > 0) {
    md += `## Value Changes\n\n`;
    valueChanges.slice(0, 20).forEach(v => {
      md += `- \`${v.path}\`: \`${formatValue(v.oldValue)}\` → \`${formatValue(v.newValue)}\`\n`;
    });
    if (valueChanges.length > 20) {
      md += `\n...and ${valueChanges.length - 20} more\n`;
    }
    md += `\n---\n\n`;
  }

  // Mode changes
  if (newModes.length > 0 || deletedModes.length > 0 || modeRenames.length > 0) {
    md += `## Mode Changes\n\n`;

    if (newModes.length > 0) {
      md += `### New Modes\n\n`;
      newModes.forEach(m => {
        md += `- ✨ \`${m.collection}.${m.mode}\`\n`;
      });
      md += `\n`;
    }

    if (modeRenames.length > 0) {
      md += `### Renamed Modes\n\n`;
      modeRenames.forEach(m => {
        md += `- \`${m.collection}.${m.oldMode}\` → \`${m.collection}.${m.newMode}\`\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
  }

  // Style changes
  if (newStyles.length > 0 || styleValueChanges.length > 0 || stylePathChanges.length > 0) {
    md += `## Style Changes\n\n`;

    if (newStyles.length > 0) {
      md += `### New Styles\n\n`;
      newStyles.slice(0, 10).forEach(s => {
        md += `- ✨ \`${s.path}\` (${s.styleType})\n`;
      });
      if (newStyles.length > 10) {
        md += `\n...and ${newStyles.length - 10} more\n`;
      }
      md += `\n`;
    }

    if (styleValueChanges.length > 0) {
      md += `### Updated Styles\n\n`;
      styleValueChanges.slice(0, 10).forEach(s => {
        md += `- 🔄 \`${s.path}\` (${s.styleType})\n`;
      });
      if (styleValueChanges.length > 10) {
        md += `\n...and ${styleValueChanges.length - 10} more\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }

  // Footer
  md += `Generated by [Synkio](https://github.com/yourusername/synkio) Figma Plugin\n`;

  return md;
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object' && '$ref' in value) {
    return `{${(value as any).$ref}}`;
  }
  return JSON.stringify(value);
}
```

---

### 3. GitHub API Integration

**Purpose:** Create branch, commit files, create PR

**File:** `packages/figma-plugin/synkio-v2/src/handlers/pr-handlers.ts` (NEW)

**Functions:**

```typescript
/**
 * Create a pull request with baseline and report
 */
export async function handleCreatePR(send: SendMessage): Promise<void> {
  try {
    // 1. Get current state
    const settings = await loadClientStorage<PluginSettings>('settings');
    const github = settings.remote.github;

    if (!github?.owner || !github?.repo) {
      throw new Error('GitHub repository not configured');
    }

    // 2. Collect current Figma data
    const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
    const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];

    const tokens = await collectVariables({ excludedCollections });
    const styles = await collectStyles({ excludedStyleTypes });
    const currentBaseline = buildBaseline(tokens, styles);

    // 3. Compare with existing baseline
    const syncBaseline = loadChunked<BaselineData>(KEYS.SYNC_BASELINE);
    const diff = syncBaseline
      ? compareBaselines(syncBaseline, currentBaseline)
      : null;

    if (!diff || !hasAnyChanges(diff)) {
      send({ type: 'pr-error', error: 'No changes to create PR for' });
      return;
    }

    // 4. Generate export-baseline.json
    const exportBaseline = {
      ...currentBaseline,
      metadata: {
        syncedAt: new Date().toISOString(),
        source: 'figma-plugin'
      }
    };

    // 5. Generate SYNC_REPORT.md
    const report = generateSyncReport(diff, {
      author: figma.currentUser?.name || 'Unknown',
      figmaFileUrl: `https://figma.com/file/${figma.fileKey}`,
      timestamp: new Date().toISOString()
    });

    // 6. Send to UI to make network requests
    send({
      type: 'do-create-pr',
      github,
      files: {
        'synkio/export-baseline.json': JSON.stringify(exportBaseline, null, 2),
        'synkio/SYNC_REPORT.md': report
      },
      prTitle: 'chore: Sync design tokens from Figma',
      prBody: generatePRBody(diff)
    });

  } catch (error) {
    send({ type: 'pr-error', error: String(error) });
  }
}

function hasAnyChanges(diff: ComparisonResult): boolean {
  return diff.newVariables.length > 0 ||
         diff.valueChanges.length > 0 ||
         diff.pathChanges.length > 0 ||
         diff.deletedVariables.length > 0 ||
         diff.newModes.length > 0 ||
         diff.deletedModes.length > 0 ||
         diff.styleValueChanges.length > 0 ||
         diff.newStyles.length > 0 ||
         diff.deletedStyles.length > 0;
}

function generatePRBody(diff: ComparisonResult): string {
  const totalChanges =
    diff.newVariables.length +
    diff.valueChanges.length +
    diff.pathChanges.length +
    diff.deletedVariables.length;

  const hasBreaking =
    diff.deletedVariables.length > 0 ||
    diff.pathChanges.length > 0 ||
    diff.deletedModes.length > 0;

  let body = `## Design Token Sync from Figma\n\n`;
  body += `This PR updates design tokens with **${totalChanges} changes** from Figma.\n\n`;

  body += `### Summary\n\n`;
  body += `- ✨ ${diff.newVariables.length} new tokens\n`;
  body += `- 🔄 ${diff.valueChanges.length} value updates\n`;
  body += `- 📝 ${diff.pathChanges.length} renames\n`;
  body += `- ❌ ${diff.deletedVariables.length} deletions\n\n`;

  if (hasBreaking) {
    body += `### ⚠️ Breaking Changes\n\n`;
    body += `This PR contains breaking changes. Review [SYNC_REPORT.md](synkio/SYNC_REPORT.md) carefully.\n\n`;
  }

  body += `### How to Apply\n\n`;
  body += `After merging this PR, run:\n\n`;
  body += `\`\`\`bash\n`;
  body += `synkio build --from synkio/export-baseline.json\n`;
  body += `\`\`\`\n\n`;
  body += `This will update your token files according to \`synkio.config.json\`.\n\n`;

  body += `---\n\n`;
  body += `See [SYNC_REPORT.md](synkio/SYNC_REPORT.md) for detailed changes.\n`;

  return body;
}
```

**GitHub API calls** (in UI, not plugin sandbox):

**File:** `packages/figma-plugin/synkio-v2/src/ui/main.ts`

Add handler for `do-create-pr`:

```typescript
async function handleCreatePR(data: {
  github: GitHubSettings;
  files: Record<string, string>;
  prTitle: string;
  prBody: string;
}) {
  try {
    const { owner, repo, branch, token } = data.github;
    const baseBranch = branch || 'main';

    // 1. Get base branch SHA
    const baseSha = await getBaseBranchSha(owner, repo, baseBranch, token);

    // 2. Create new branch
    const prBranch = `synkio/sync-${Date.now()}`;
    await createBranch(owner, repo, prBranch, baseSha, token);

    // 3. Commit files using Git Tree API (atomic multi-file commit)
    await commitFiles(owner, repo, prBranch, data.files, 'chore: Sync design tokens from Figma', token);

    // 4. Create PR
    const pr = await createPullRequest(
      owner,
      repo,
      {
        title: data.prTitle,
        body: data.prBody,
        head: prBranch,
        base: baseBranch
      },
      token
    );

    // 5. Send success back to plugin
    parent.postMessage({
      pluginMessage: {
        type: 'pr-created',
        prUrl: pr.html_url,
        prNumber: pr.number
      }
    }, '*');

  } catch (error) {
    parent.postMessage({
      pluginMessage: {
        type: 'pr-error',
        error: String(error)
      }
    }, '*');
  }
}

async function getBaseBranchSha(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to get base branch: ${response.statusText}`);
  }

  const data = await response.json();
  return data.object.sha;
}

async function createBranch(
  owner: string,
  repo: string,
  branch: string,
  sha: string,
  token?: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create branch: ${response.statusText}`);
  }
}

async function commitFiles(
  owner: string,
  repo: string,
  branch: string,
  files: Record<string, string>,
  message: string,
  token?: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  // 1. Get current commit SHA
  const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`;
  const refResponse = await fetch(refUrl, { headers });
  const refData = await refResponse.json();
  const currentCommitSha = refData.object.sha;

  // 2. Get current commit tree
  const commitUrl = `https://api.github.com/repos/${owner}/${repo}/git/commits/${currentCommitSha}`;
  const commitResponse = await fetch(commitUrl, { headers });
  const commitData = await commitResponse.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file
  const tree = [];
  for (const [path, content] of Object.entries(files)) {
    const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs`;
    const blobResponse = await fetch(blobUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content,
        encoding: 'utf-8'
      })
    });
    const blobData = await blobResponse.json();

    tree.push({
      path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha
    });
  }

  // 4. Create tree
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees`;
  const treeResponse = await fetch(treeUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree
    })
  });
  const treeData = await treeResponse.json();

  // 5. Create commit
  const newCommitUrl = `https://api.github.com/repos/${owner}/${repo}/git/commits`;
  const newCommitResponse = await fetch(newCommitUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [currentCommitSha]
    })
  });
  const newCommitData = await newCommitResponse.json();

  // 6. Update branch ref
  const updateRefUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;
  await fetch(updateRefUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: newCommitData.sha
    })
  });
}

async function createPullRequest(
  owner: string,
  repo: string,
  pr: { title: string; body: string; head: string; base: string },
  token?: string
): Promise<{ html_url: string; number: number }> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(pr)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create PR: ${errorData.message || response.statusText}`);
  }

  return response.json();
}
```

**Update message types:**

**File:** `packages/figma-plugin/synkio-v2/src/lib/types.ts`

```typescript
export type MessageToCode =
  | ... existing messages
  | { type: 'create-pr' };

export type MessageToUI =
  | ... existing messages
  | { type: 'do-create-pr'; github: GitHubSettings; files: Record<string, string>; prTitle: string; prBody: string }
  | { type: 'pr-created'; prUrl: string; prNumber: number }
  | { type: 'pr-error'; error: string };
```

---

## Implementation Plan

### Phase 1: CLI Command (~3 hours)

**Task 1.1: Extract regenerate logic**
- Create `packages/cli/src/cli/commands/build.ts`
- Extract `regenerateFromBaseline` from sync pipeline
- Add CLI command handler in `bin.ts`

**Task 1.2: Add --from option**
- Accept custom baseline path
- Default to `synkio/baseline.json`
- Validate file exists and is valid JSON

**Task 1.3: Add comparison logic**
- Load current baseline (if exists)
- Compare with new baseline
- Show diff summary
- Warn on breaking changes (don't block)

**Task 1.4: Update baseline after build**
- Copy export-baseline.json to baseline.json
- Or update baseline.json with new data

**Files to create/modify:**
- `packages/cli/src/cli/commands/build.ts` (NEW)
- `packages/cli/src/cli/bin.ts` (add command handler)
- `packages/cli/src/core/sync/regenerate.ts` (extract reusable logic)

---

### Phase 2: Plugin PR Creation (~6 hours)

**Task 2.1: Report generator**
- Create `report-generator.ts`
- Implement `generateSyncReport()`
- Add value formatting helpers
- Test with sample diffs

**Task 2.2: PR handler (plugin side)**
- Create `pr-handlers.ts`
- Implement `handleCreatePR()`
- Generate export-baseline.json
- Generate report
- Send to UI for network requests

**Task 2.3: GitHub API (UI side)**
- Add PR creation flow in `ui/main.ts`
- Implement GitHub API calls:
  - Get base branch SHA
  - Create branch
  - Commit files (Git Tree API)
  - Create PR
- Add retry logic
- Add error handling

**Task 2.4: UI updates**
- Add "Create PR" button to Home screen
- Add PR creation modal/dialog
- Show success message with PR URL
- Handle errors gracefully

**Files to create/modify:**
- `packages/figma-plugin/synkio-v2/src/lib/report-generator.ts` (NEW)
- `packages/figma-plugin/synkio-v2/src/handlers/pr-handlers.ts` (NEW)
- `packages/figma-plugin/synkio-v2/src/ui/main.ts` (add GitHub API calls)
- `packages/figma-plugin/synkio-v2/src/screens/home.ts` (add button)
- `packages/figma-plugin/synkio-v2/src/lib/types.ts` (add message types)

---

### Phase 3: Documentation (~2 hours)

**Task 3.1: Update USER_GUIDE.md**
- Document `synkio build` command
- Add GitHub PR workflow section
- Add examples for both workflows (sync vs PR)
- Update command reference

**Task 3.2: Update README**
- Add GitHub PR workflow overview
- Update quick start if needed

**Task 3.3: Add workflow examples**
- Create example PR template
- Create example SYNC_REPORT.md
- Document best practices

**Files to modify:**
- `packages/cli/USER_GUIDE.md`
- `README.md`
- Add `examples/pr-workflow/` (optional)

---

## Testing Strategy

### CLI Testing

**Manual tests:**
```bash
# Test 1: Build from default baseline
$ synkio build

# Test 2: Build from export-baseline
$ synkio build --from synkio/export-baseline.json

# Test 3: Build with breaking changes
# (delete a token from export-baseline.json, then build)

# Test 4: Build with invalid path
$ synkio build --from /non/existent/path.json

# Test 5: Build after config change
# (change splitBy, then synkio build)
```

**Unit tests:**
```typescript
// packages/cli/src/cli/commands/build.test.ts
describe('build command', () => {
  it('should build from default baseline', async () => {
    // Test logic
  });

  it('should build from custom baseline', async () => {
    // Test logic
  });

  it('should warn on breaking changes', async () => {
    // Test logic
  });

  it('should update baseline after build', async () => {
    // Test logic
  });
});
```

---

### Plugin Testing

**Manual tests:**
1. **PR Creation Happy Path**
   - Make changes in Figma
   - Click "Create PR"
   - Verify PR created with correct files
   - Check SYNC_REPORT.md format
   - Check export-baseline.json structure

2. **No Changes**
   - Click "Create PR" without changes
   - Should show error

3. **Breaking Changes**
   - Delete a variable
   - Create PR
   - Verify breaking changes section in report

4. **GitHub Auth**
   - Test with token (private repo)
   - Test without token (public repo)
   - Test with invalid token

5. **Network Errors**
   - Simulate network failure
   - Verify error handling

---

### Integration Testing

**Full workflow test:**
1. Make changes in Figma
2. Create PR via plugin
3. Review PR on GitHub
4. Merge PR
5. Run `synkio build --from synkio/export-baseline.json`
6. Verify token files updated
7. Verify baseline.json updated
8. Verify build.script ran (if configured)

---

## Documentation Updates

### USER_GUIDE.md

Add new section:

```markdown
## GitHub PR Workflow

### Overview

The GitHub PR workflow enables designers to propose token changes that developers can review before applying.

### Setup

1. Configure GitHub in the Figma plugin:
   - Repository: `owner/repo`
   - Branch: `main`
   - Token: (for private repos)

2. Ensure `synkio.config.json` exists in your repository

### Workflow

#### 1. Designer: Create PR from Figma

1. Make changes to variables/styles in Figma
2. Open Synkio plugin
3. Click "Create PR"
4. Plugin creates PR with:
   - `synkio/export-baseline.json` - Token data
   - `synkio/SYNC_REPORT.md` - Human-readable changes

#### 2. Team: Review PR

Review the SYNC_REPORT.md to see:
- New tokens
- Changed values
- Deleted tokens (⚠️ breaking)
- Renamed tokens (⚠️ breaking)

Approve or request changes.

#### 3. Developer: Apply Changes

After merging the PR:

\`\`\`bash
# Apply the baseline to your token files
synkio build --from synkio/export-baseline.json
\`\`\`

This will:
- Split the baseline into token files per your config
- Update `synkio/baseline.json`
- Run `build.script` if configured

### Commands

#### synkio build

Build token files from a baseline.

\`\`\`bash
# Build from default baseline
synkio build

# Build from export-baseline (after PR)
synkio build --from synkio/export-baseline.json

# Preview changes without applying
synkio build --from synkio/export-baseline.json --preview
\`\`\`

**Options:**
- `--from <path>` - Custom baseline path (default: `synkio/baseline.json`)
- `--preview` - Show changes without applying
- `--verbose` - Show detailed output

**Breaking Changes:**
- Shows warnings for deletions/renames
- Does NOT block (assumes PR already reviewed)

### Comparison: Sync vs PR Workflow

| Aspect | synkio sync | GitHub PR Workflow |
|--------|-------------|-------------------|
| **Source** | Figma API | Pre-reviewed PR |
| **Review** | At CLI execution | In PR before merge |
| **Breaking** | Blocks (use --force) | Warns (already reviewed) |
| **Best for** | Solo dev, quick sync | Team workflow, auditing |

### Best Practices

1. **Review breaking changes carefully**
   - Check SYNC_REPORT.md for deletions
   - Search codebase for deleted token references
   - Update code before merging PR

2. **Use meaningful PR titles**
   - Default: "chore: Sync design tokens from Figma"
   - Customize if needed

3. **Add SYNC_REPORT.md to .gitignore?**
   - Optional: some teams prefer to keep it
   - Others regenerate on each PR

4. **Automate with GitHub Actions** (optional)
   - See [Automation](#automation) section
```

---

### README.md

Update features section:

```markdown
## Features

- ✅ **GitHub PR Workflow** - Designers create PRs directly from Figma
- ✅ **Breaking Change Detection** - Warns about deletions and renames
- ✅ **Human-Readable Reports** - SYNC_REPORT.md shows all changes
- ... existing features
```

---

## Future Enhancements (Phase 2)

### 1. GitHub Actions Automation

**Config option:**
```json
{
  "automation": {
    "enabled": true,
    "autoBuildOnMerge": true
  }
}
```

**CLI command:**
```bash
$ synkio init --with-github-action

✓ Created .github/workflows/synkio-build.yml
```

**Workflow file:**
```yaml
name: Apply Design Tokens
on:
  push:
    branches: [main]
    paths: ['synkio/export-baseline.json']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx synkio build --from synkio/export-baseline.json
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: Build design tokens"
          file_pattern: "tokens/**/*.json synkio/baseline.json"
```

---

### 2. PR Templates

**Add `.github/PULL_REQUEST_TEMPLATE/synkio-sync.md`:**

```markdown
## Design Token Sync

**SYNC_REPORT:** [View Report](synkio/SYNC_REPORT.md)

### Review Checklist

- [ ] Reviewed SYNC_REPORT.md
- [ ] No unexpected breaking changes
- [ ] Searched codebase for deleted token references
- [ ] Updated code if needed

### After Merging

Run: `synkio build --from synkio/export-baseline.json`
```

---

### 3. Slack/Discord Notifications

**Config option:**
```json
{
  "notifications": {
    "slack": {
      "webhookUrl": "https://hooks.slack.com/...",
      "channel": "#design-tokens"
    }
  }
}
```

**Plugin sends notification when PR created:**
- Link to PR
- Summary of changes
- Breaking changes alert

---

## Migration Guide

### For Existing Users

**Before (current):**
```bash
$ synkio sync --regenerate
```

**After (new):**
```bash
$ synkio build
```

**Deprecation timeline:**
- v1.0.0: Add `synkio build`, keep `sync --regenerate` with deprecation warning
- v2.0.0: Remove `sync --regenerate` support

**Migration steps:**
1. Update scripts: `synkio sync --regenerate` → `synkio build`
2. Update CI/CD pipelines
3. Update documentation

---

## Rollout Plan

### Week 1: CLI Command
- Implement `synkio build` command
- Add tests
- Update documentation
- Beta release

### Week 2: Plugin PR Creation
- Implement report generator
- Implement GitHub API integration
- Add UI for PR creation
- Internal testing

### Week 3: Integration Testing
- Test full workflow end-to-end
- Fix bugs
- Refine UX
- Documentation review

### Week 4: Release
- Release CLI v1.x with `synkio build`
- Release plugin v2.x with PR creation
- Blog post / announcement
- User guide updates

---

## Success Metrics

### Adoption
- % of users using PR workflow vs direct sync
- Number of PRs created via plugin
- Feedback from teams

### Quality
- Bug reports related to PR workflow
- GitHub API error rates
- User satisfaction (survey)

### Performance
- Average PR creation time
- Average `synkio build` execution time
- Baseline file size distribution

---

## Risks & Mitigations

### Risk 1: GitHub API Rate Limits
- **Limit:** 60 req/hr unauthenticated, 5000/hr authenticated
- **Mitigation:** Require token for PR creation, check rate limit headers

### Risk 2: Large Baseline Files
- **Issue:** export-baseline.json could be >1MB for large design systems
- **Mitigation:** Git handles this fine, warn if >5MB

### Risk 3: Merge Conflicts
- **Issue:** If two PRs modify export-baseline.json
- **Mitigation:** Document workflow (one PR at a time), last merge wins

### Risk 4: Breaking Changes Missed in Review
- **Issue:** Team approves PR without reading SYNC_REPORT.md
- **Mitigation:**
  - Make breaking changes very visible in report
  - Add PR template with checklist
  - Consider requiring `--force` on `synkio build` if breaking

### Risk 5: User Confusion (sync vs build)
- **Issue:** When to use which command?
- **Mitigation:**
  - Clear documentation
  - Error messages guide user
  - Examples in USER_GUIDE.md

---

## Open Questions

1. **Should `synkio build` block on breaking changes?**
   - Current spec: No (warns only)
   - Alternative: Add `--force` flag like `sync`
   - Decision: Warns only (already reviewed in PR)

2. **Should export-baseline.json be committed or .gitignored?**
   - Current spec: Committed in PR
   - Alternative: Ephemeral (only in PR, deleted after build)
   - Decision: Committed (useful for history/rollback)

3. **Should SYNC_REPORT.md be committed or .gitignored?**
   - Current spec: Committed in PR
   - Alternative: Regenerated each time
   - Decision: Committed (provides context in git history)

4. **Should we validate that synkio.config.json exists before creating PR?**
   - Current spec: No validation
   - Alternative: Fetch config from repo, validate
   - Decision: No validation (trust user setup, avoid complexity)

5. **What if user runs `synkio build` without merging PR?**
   - Current spec: Works fine (applies baseline locally)
   - Alternative: Warn if export-baseline.json not on main branch
   - Decision: No warning (user may test locally before merging)

---

## Appendix

### Example SYNC_REPORT.md

See [Report Format](#report-format) section above.

### Example PR Description

See `generatePRBody()` function in [GitHub API Integration](#3-github-api-integration) section above.

### File Structure

```
synkio/
├── packages/
│   ├── cli/
│   │   └── src/
│   │       └── cli/
│   │           └── commands/
│   │               ├── build.ts (NEW)
│   │               ├── sync.ts (updated)
│   │               └── export-baseline.ts (rename to export.ts)
│   └── figma-plugin/
│       └── synkio-v2/
│           └── src/
│               ├── handlers/
│               │   └── pr-handlers.ts (NEW)
│               ├── lib/
│               │   ├── report-generator.ts (NEW)
│               │   └── types.ts (updated)
│               ├── screens/
│               │   └── home.ts (updated)
│               └── ui/
│                   └── main.ts (updated)
```

---

## Version History

- **v1.0.0** (2025-12-30) - Initial spec

---

**END OF SPECIFICATION**
