// =============================================================================
// PR Handlers - GitHub Pull Request Creation
// =============================================================================

import {
  BaselineData,
  PluginSettings,
  ComparisonResult,
  StyleType,
  GitHubSettings,
} from '../lib/types';

import {
  loadChunked,
  loadSimple,
  KEYS,
  loadClientStorage,
} from '../lib/storage';

import {
  collectVariables,
  collectStyles,
} from '../lib/collector';

import { compareBaselines } from '../lib/compare';
import { buildBaseline } from '../operations';
import { generateSyncReport } from '../lib/report-generator';
import { SendMessage } from './types';

/**
 * Handle PR creation request from UI
 */
export async function handleCreatePR(send: SendMessage): Promise<void> {
  try {
    // 1. Get settings
    const settings = await loadClientStorage<PluginSettings>('settings');
    const github = settings?.remote?.github;

    if (!github?.owner || !github?.repo) {
      throw new Error('GitHub repository not configured. Please configure in Settings.');
    }

    if (!github.token) {
      throw new Error('GitHub token is required to create pull requests. Please add a token in Settings.');
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

    // Note: We allow PRs even with no changes to establish baseline in repo

    // 4. Generate baseline data
    const exportBaseline: BaselineData = {
      ...currentBaseline,
      metadata: {
        syncedAt: new Date().toISOString(),
      },
    };

    // 5. Determine baseline path from GitHub settings (or use default)
    // Default is .synkio/baseline.json, but user can configure custom path
    const baselinePath = github.path || '.synkio/baseline.json';

    // 6. Build files to commit
    const files: Record<string, string> = {
      [baselinePath]: JSON.stringify(exportBaseline, null, 2),
    };

    // Add SYNC_REPORT.md in same directory as baseline (only if changes)
    if (diff && hasAnyChanges(diff)) {
      const reportPath = baselinePath.replace(/[^/]+$/, 'SYNC_REPORT.md');
      const report = generateSyncReport(diff, {
        author: figma.currentUser?.name || 'Unknown',
        figmaFileUrl: `https://figma.com/file/${figma.fileKey}`,
        timestamp: new Date().toISOString(),
      });
      files[reportPath] = report;
    }

    // 7. Generate PR body
    const prBody = generatePRBody(diff, baselinePath);

    // 8. Send to UI to make network requests
    send({
      type: 'do-create-pr',
      github,
      files,
      prTitle: 'chore: Sync design tokens from Figma',
      prBody,
    });

  } catch (error) {
    send({ type: 'pr-error', error: String(error) });
  }
}

/**
 * Check if comparison result has any changes
 */
function hasAnyChanges(diff: ComparisonResult): boolean {
  return (
    diff.newVariables.length > 0 ||
    diff.valueChanges.length > 0 ||
    diff.pathChanges.length > 0 ||
    diff.deletedVariables.length > 0 ||
    diff.newModes.length > 0 ||
    diff.deletedModes.length > 0 ||
    diff.styleValueChanges.length > 0 ||
    diff.newStyles.length > 0 ||
    diff.deletedStyles.length > 0 ||
    diff.stylePathChanges.length > 0
  );
}

/**
 * Generate PR body/description
 */
function generatePRBody(diff: ComparisonResult | null, baselinePath: string): string {
  let body = `## Design Token Sync from Figma\n\n`;

  // Derive report path (same directory as baseline)
  const reportPath = baselinePath.replace(/[^/]+$/, 'SYNC_REPORT.md');

  if (!diff || !hasAnyChanges(diff)) {
    body += `This PR establishes the baseline for design tokens from Figma.\n\n`;
    body += `No changes detected - this creates the initial baseline in the repository.\n\n`;
  } else {
    const totalChanges =
      diff.newVariables.length +
      diff.valueChanges.length +
      diff.pathChanges.length +
      diff.deletedVariables.length;

    const hasBreaking =
      diff.deletedVariables.length > 0 ||
      diff.pathChanges.length > 0 ||
      diff.deletedModes.length > 0 ||
      diff.deletedStyles.length > 0;

    body += `This PR updates design tokens with **${totalChanges} changes** from Figma.\n\n`;

    body += `### Summary\n\n`;
    body += `- ✨ ${diff.newVariables.length} new tokens\n`;
    body += `- 🔄 ${diff.valueChanges.length} value updates\n`;
    body += `- 📝 ${diff.pathChanges.length} renames\n`;
    body += `- ❌ ${diff.deletedVariables.length} deletions\n\n`;

    if (diff.newStyles.length > 0 || diff.styleValueChanges.length > 0 || diff.deletedStyles.length > 0) {
      body += `### Style Changes\n\n`;
      body += `- ✨ ${diff.newStyles.length} new styles\n`;
      body += `- 🔄 ${diff.styleValueChanges.length} style updates\n`;
      body += `- ❌ ${diff.deletedStyles.length} deleted styles\n\n`;
    }

    if (hasBreaking) {
      body += `### ⚠️ Breaking Changes\n\n`;
      body += `This PR contains breaking changes. Review [SYNC_REPORT.md](${reportPath}) carefully.\n\n`;
    }
  }

  body += `### How to Apply\n\n`;
  body += `After merging this PR, run:\n\n`;
  body += `\`\`\`bash\n`;

  // If using custom path, show explicit --from flag
  if (baselinePath !== '.synkio/baseline.json') {
    body += `synkio build --from ${baselinePath}\n`;
  } else {
    body += `synkio build\n`;
  }

  body += `\`\`\`\n\n`;
  body += `This will read \`${baselinePath}\` and update your token files according to \`synkio.config.json\`.\n\n`;

  if (diff && hasAnyChanges(diff)) {
    body += `---\n\n`;
    body += `See [SYNC_REPORT.md](${reportPath}) for detailed changes.\n`;
  }

  return body;
}
