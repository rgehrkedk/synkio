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
} from '../ui/layout/index';
import {
  groupByCollection,
  groupStylesByType,
  buildDiffItems,
  buildStyleDiffItems,
} from '../lib/diff-utils';
import { countChanges, countStyleChanges } from '../lib/compare';

export function SyncScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { isLoading, loadingMessage, syncDiff, syncBaseline } = state;

  // Header
  const header = Header({
    title: 'SYNC TO CODE',
    showBack: true,
    onBack: () => actions.navigate('home'),
  });

  // Loading state
  if (isLoading) {
    const content = createContentArea([Spinner(loadingMessage || 'Analyzing changes...')]);
    return createPageLayout([header, content]);
  }

  // No baseline yet - first time
  if (!syncBaseline) {
    const content = createContentArea([
      EmptyState({
        icon: 'rocket',
        title: 'Ready to sync',
        description: 'Click the button below to create your first sync. This will save your Figma variables so the CLI can fetch them.',
      }),
    ]);

    const footer = createFooter([
      Button({
        label: 'Create Initial Sync',
        variant: 'primary',
        fullWidth: true,
        onClick: () => actions.send({ type: 'sync' }),
      }),
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

  // Diff sections grouped by collection (variables)
  if (syncDiff && hasChanges) {
    const groupedDiffs = groupByCollection(syncDiff);

    for (const [collection, changes] of Object.entries(groupedDiffs)) {
      const diffItems = buildDiffItems(changes);
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
        const diffItems = buildStyleDiffItems(changes);
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

  // Footer with sync button
  const footer = createFooter([
    createColumn([
      Button({
        label: hasChanges ? 'SYNC TO CODE' : 'SYNC ANYWAY',
        variant: hasChanges ? 'primary' : 'secondary',
        fullWidth: true,
        onClick: () => actions.send({ type: 'sync' }),
      }),
      el('div', { class: 'text-xs text-tertiary text-center' },
        hasChanges ? 'Saves baseline for CLI to fetch' : 'Force refresh the baseline'
      ),
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
