// =============================================================================
// Sync Screen - Figma to Code
// =============================================================================

import { PluginState, ComparisonResult } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Header,
  Button,
  Section,
  Alert,
  Spinner,
  EmptyState,
} from '../ui/components/index';
import { Icon } from '../ui/icons';
import {
  PageLayout as createPageLayout,
  ContentArea as createContentArea,
  Footer as createFooter,
  Column as createColumn,
  Row as createRow,
} from '../ui/layout/index';
import {
  groupByCollection,
  groupStylesByType,
  buildDiffItems,
  buildStyleDiffItems,
} from '../lib/diff-utils';
import { countChanges, countStyleChanges } from '../lib/compare';

export function SyncScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { isLoading, loadingMessage, syncDiff, syncBaseline, variableIdLookup } = state;

  // Header
  const header = Header({
    title: 'Sync',
    showBack: true,
    onBack: () => actions.navigate('main'),
  });

  // Loading state
  if (isLoading) {
    const content = createContentArea([Spinner(loadingMessage || 'Analyzing changes...')]);
    return createPageLayout([header, content]);
  }

  // No baseline yet - first time
  if (!syncBaseline) {
    const hasGitHubConfig = !!(state.settings?.remote?.github?.owner && state.settings?.remote?.github?.repo);

    const content = createContentArea([
      EmptyState({
        icon: 'rocket',
        title: 'Ready to sync',
        description: hasGitHubConfig
          ? 'Create a pull request to sync your Figma variables to code, or save for CLI to fetch later.'
          : 'Save your Figma variables so the CLI can fetch them with \'synkio pull\'.',
      }),
    ]);

    const footerButtons: HTMLElement[] = [];

    // Create PR button first when GitHub is configured (primary action)
    if (hasGitHubConfig) {
      footerButtons.push(
        Button({
          label: 'Create PR',
          variant: 'primary',
          fullWidth: true,
          onClick: () => {
            if (confirm('Create a pull request to establish the baseline in your repository?\n\nThis will create a branch, commit the current state, and open a PR.')) {
              actions.send({ type: 'create-pr' });
            }
          },
        })
      );
    }

    // Save for CLI button
    footerButtons.push(
      Button({
        label: hasGitHubConfig ? 'Save for CLI' : 'Save for CLI',
        variant: hasGitHubConfig ? 'secondary' : 'primary',
        fullWidth: true,
        onClick: () => actions.send({ type: 'sync' }),
      })
    );

    const footer = createFooter([
      createColumn([
        hasGitHubConfig ? createRow(footerButtons, 'var(--spacing-sm)') : footerButtons[0],
        el('div', { class: 'text-xs text-tertiary text-center' },
          hasGitHubConfig ? 'PR syncs directly · CLI requires \'synkio pull\'' : 'Run \'synkio pull\' to fetch tokens'
        ),
      ], 'var(--spacing-sm)'),
    ]);

    return createPageLayout([header, content, footer]);
  }

  // Has baseline, show diff
  const hasChanges = syncDiff && countChanges(syncDiff) > 0;
  const breakingChanges = syncDiff ? countBreakingChanges(syncDiff) : 0;

  let contentChildren: HTMLElement[] = [];

  // Summary bar
  if (hasChanges && syncDiff) {
    const changeCount = countChanges(syncDiff);
    const summaryBar = el('div', { class: 'summary-bar' });
    summaryBar.appendChild(el('span', { class: 'text-sm' }, `Changes since last sync`));
    summaryBar.appendChild(el('span', { class: 'font-semibold text-warning' }, `${changeCount} change${changeCount === 1 ? '' : 's'}`));
    contentChildren.push(summaryBar);
  }

  // Breaking changes warning
  if (breakingChanges > 0) {
    const warningParts: string[] = [];
    const totalRenames = syncDiff!.pathChanges.length + syncDiff!.stylePathChanges.length;
    const totalDeletions = syncDiff!.deletedVariables.length + syncDiff!.deletedStyles.length;
    if (totalRenames > 0) warningParts.push(`${totalRenames} rename${totalRenames === 1 ? '' : 's'}`);
    if (totalDeletions > 0) warningParts.push(`${totalDeletions} deletion${totalDeletions === 1 ? '' : 's'}`);

    contentChildren.push(Alert({
      type: 'warning',
      title: `${breakingChanges} breaking change${breakingChanges === 1 ? '' : 's'} detected`,
      message: `${warningParts.join(' \u00B7 ')}. The CLI will require --force to apply these.`,
    }));
  }

  // Convert lookup to Map for formatValue
  const lookupMap = variableIdLookup ? new Map(Object.entries(variableIdLookup)) : undefined;

  // Diff sections grouped by collection (variables)
  if (syncDiff && hasChanges) {
    const groupedDiffs = groupByCollection(syncDiff);

    for (const [collection, changes] of Object.entries(groupedDiffs)) {
      const diffItems = buildDiffItems(changes, lookupMap);
      const section = Section({
        title: collection,
        count: diffItems.length,
        collapsible: true,
        defaultExpanded: true,
        children: diffItems,
      });
      contentChildren.push(section);
    }

    // Style sections grouped by type
    if (countStyleChanges(syncDiff) > 0) {
      const groupedStyles = groupStylesByType(syncDiff);

      for (const [styleType, changes] of Object.entries(groupedStyles)) {
        const diffItems = buildStyleDiffItems(changes, lookupMap);
        const section = Section({
          title: styleType,
          count: diffItems.length,
          collapsible: true,
          defaultExpanded: true,
          children: diffItems,
        });
        contentChildren.push(section);
      }
    }
  }

  // No changes state
  if (!hasChanges) {
    contentChildren.push(
      EmptyState({
        icon: 'check',
        title: 'Everything is in sync!',
        description: syncBaseline?.metadata?.syncedAt
          ? `No changes since last sync on ${formatDate(syncBaseline.metadata.syncedAt)}`
          : 'No changes detected',
      })
    );
  }

  const content = createContentArea(contentChildren);

  // Footer with sync button and optional PR button
  const hasGitHubConfig = !!(state.settings?.remote?.github?.owner && state.settings?.remote?.github?.repo);
  const footerButtons: HTMLElement[] = [];
  const footerHelperTexts: string[] = [];

  // Save for CLI button (always present)
  footerButtons.push(
    Button({
      label: 'Save for CLI',
      variant: hasChanges ? 'primary' : 'secondary',
      fullWidth: true,
      onClick: () => actions.send({ type: 'sync' }),
    })
  );
  footerHelperTexts.push('Saves to plugin for \'synkio pull\' command');

  // Create PR button (only when GitHub is configured)
  if (hasGitHubConfig) {
    footerButtons.push(
      Button({
        label: 'Create PR',
        variant: 'secondary',
        fullWidth: true,
        onClick: () => {
          const changeCount = syncDiff ? countChanges(syncDiff) : 0;
          const message = changeCount > 0
            ? `Create a pull request with ${changeCount} change${changeCount === 1 ? '' : 's'}?\n\nThis will create a branch, commit the changes, and open a PR in your repository.`
            : 'Create a pull request to establish the baseline in your repository?\n\nThis will create a branch, commit the current state, and open a PR.';

          if (confirm(message)) {
            actions.send({ type: 'create-pr' });
          }
        },
      })
    );
    footerHelperTexts.push('Creates pull request with baseline file');
  }

  // Build helper text
  const helperText = footerHelperTexts.join(' · ');

  const footer = createFooter([
    createColumn([
      createRow(footerButtons, 'var(--spacing-sm)'),
      el('div', { class: 'text-xs text-tertiary text-center' }, helperText),
    ], 'var(--spacing-sm)'),
  ]);

  return createPageLayout([header, content, footer]);
}

// =============================================================================
// Local Helpers (specific to sync screen)
// =============================================================================

function countBreakingChanges(diff: ComparisonResult): number {
  return (
    diff.pathChanges.length +
    diff.deletedVariables.length +
    diff.stylePathChanges.length +
    diff.deletedStyles.length
  );
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
