// =============================================================================
// Sync Screen - Figma to Code
// =============================================================================

import { PluginState, ComparisonResult, ValueChange, PathChange, NewVariable, DeletedVariable, StyleValueChange, StylePathChange, NewStyle, DeletedStyle } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Header,
  Button,
  Section,
  DiffItem,
  Alert,
  Spinner,
  EmptyState,
} from '../ui/components';
import {
  createPageLayout,
  createContentArea,
  createFooter,
  createColumn,
  createText,
} from '../ui/router';

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
    const summaryBar = el('div', {
      style: 'display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-sm) var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);'
    });
    summaryBar.appendChild(el('span', { style: 'font-size: var(--font-size-sm);' }, `Changes since last sync`));
    summaryBar.appendChild(el('span', { style: 'font-weight: 600; color: var(--color-warning);' }, `${changeCount} change${changeCount === 1 ? '' : 's'}`));
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
      el('div', { style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); text-align: center;' },
        hasChanges ? 'Saves baseline for CLI to fetch' : 'Force refresh the baseline'
      ),
    ], 'var(--spacing-sm)'),
  ]);

  return createPageLayout([header, content, footer]);
}

// Helpers

interface GroupedChanges {
  added: NewVariable[];
  modified: ValueChange[];
  deleted: DeletedVariable[];
  renamed: PathChange[];
}

interface GroupedStyleChanges {
  added: NewStyle[];
  modified: StyleValueChange[];
  deleted: DeletedStyle[];
  renamed: StylePathChange[];
}

function groupByCollection(diff: ComparisonResult): Record<string, GroupedChanges> {
  const grouped: Record<string, GroupedChanges> = {};

  const getOrCreate = (collection: string): GroupedChanges => {
    if (!grouped[collection]) {
      grouped[collection] = { added: [], modified: [], deleted: [], renamed: [] };
    }
    return grouped[collection];
  };

  for (const item of diff.newVariables) {
    getOrCreate(item.collection).added.push(item);
  }

  for (const item of diff.valueChanges) {
    getOrCreate(item.collection).modified.push(item);
  }

  for (const item of diff.deletedVariables) {
    getOrCreate(item.collection).deleted.push(item);
  }

  for (const item of diff.pathChanges) {
    getOrCreate(item.collection).renamed.push(item);
  }

  return grouped;
}

function groupStylesByType(diff: ComparisonResult): Record<string, GroupedStyleChanges> {
  const grouped: Record<string, GroupedStyleChanges> = {};

  const getOrCreate = (styleType: string): GroupedStyleChanges => {
    const label = styleType === 'paint' ? 'Paint Styles' : styleType === 'text' ? 'Text Styles' : 'Effect Styles';
    if (!grouped[label]) {
      grouped[label] = { added: [], modified: [], deleted: [], renamed: [] };
    }
    return grouped[label];
  };

  for (const item of diff.newStyles) {
    getOrCreate(item.styleType).added.push(item);
  }

  for (const item of diff.styleValueChanges) {
    getOrCreate(item.styleType).modified.push(item);
  }

  for (const item of diff.deletedStyles) {
    getOrCreate(item.styleType).deleted.push(item);
  }

  for (const item of diff.stylePathChanges) {
    getOrCreate(item.styleType).renamed.push(item);
  }

  return grouped;
}

function buildStyleDiffItems(changes: GroupedStyleChanges): HTMLElement[] {
  const items: HTMLElement[] = [];

  // Added
  for (const item of changes.added) {
    items.push(DiffItem({
      type: 'added',
      path: item.path,
      value: formatValue(item.value),
    }));
  }

  // Modified
  for (const item of changes.modified) {
    items.push(DiffItem({
      type: 'modified',
      path: item.path,
      value: formatValue(item.newValue),
      oldValue: formatValue(item.oldValue),
    }));
  }

  // Renamed
  for (const item of changes.renamed) {
    items.push(DiffItem({
      type: 'renamed',
      path: item.newPath,
      oldPath: item.oldPath,
      value: formatValue(item.value),
    }));
  }

  // Deleted
  for (const item of changes.deleted) {
    items.push(DiffItem({
      type: 'deleted',
      path: item.path,
      value: `was ${formatValue(item.value)}`,
    }));
  }

  return items;
}

function buildDiffItems(changes: GroupedChanges): HTMLElement[] {
  const items: HTMLElement[] = [];

  // Added
  for (const item of changes.added) {
    items.push(DiffItem({
      type: 'added',
      path: item.path,
      value: formatValue(item.value),
      colorPreview: item.type === 'color' ? String(item.value) : undefined,
    }));
  }

  // Modified
  for (const item of changes.modified) {
    items.push(DiffItem({
      type: 'modified',
      path: item.path,
      value: formatValue(item.newValue),
      oldValue: formatValue(item.oldValue),
      colorPreview: item.type === 'color' ? String(item.newValue) : undefined,
    }));
  }

  // Renamed
  for (const item of changes.renamed) {
    items.push(DiffItem({
      type: 'renamed',
      path: item.newPath,
      oldPath: item.oldPath,
      value: formatValue(item.value),
    }));
  }

  // Deleted
  for (const item of changes.deleted) {
    items.push(DiffItem({
      type: 'deleted',
      path: item.path,
      value: `was ${formatValue(item.value)}`,
    }));
  }

  return items;
}

function countChanges(diff: ComparisonResult): number {
  return (
    diff.valueChanges.length +
    diff.pathChanges.length +
    diff.newVariables.length +
    diff.deletedVariables.length +
    diff.styleValueChanges.length +
    diff.stylePathChanges.length +
    diff.newStyles.length +
    diff.deletedStyles.length
  );
}

function countBreakingChanges(diff: ComparisonResult): number {
  return (
    diff.pathChanges.length +
    diff.deletedVariables.length +
    diff.stylePathChanges.length +
    diff.deletedStyles.length
  );
}

function countStyleChanges(diff: ComparisonResult): number {
  return (
    diff.styleValueChanges.length +
    diff.stylePathChanges.length +
    diff.newStyles.length +
    diff.deletedStyles.length
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('$ref' in (value as Record<string, unknown>)) {
      return `{${(value as { $ref: string }).$ref}}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
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
