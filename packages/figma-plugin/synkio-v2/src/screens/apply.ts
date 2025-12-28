// =============================================================================
// Apply Screen - Code to Figma
// =============================================================================

import { PluginState, ComparisonResult, StyleValueChange, StylePathChange, NewStyle, DeletedStyle } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Header,
  Button,
  Card,
  Section,
  DiffItem,
  Alert,
  Spinner,
  Icon,
} from '../ui/components';
import {
  createPageLayout,
  createContentArea,
  createFooter,
  createColumn,
  createRow,
  createDivider,
} from '../ui/router';

type ApplyView = 'source' | 'preview';

let currentView: ApplyView = 'source';

export function ApplyScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { isLoading, loadingMessage, codeBaseline, codeDiff, settings, error } = state;
  const remoteSettings = settings.remote;

  // Header
  const header = Header({
    title: 'APPLY FROM CODE',
    showBack: true,
    onBack: () => {
      currentView = 'source';
      // Clear error when navigating away
      actions.updateState({ error: undefined });
      actions.navigate('home');
    },
  });

  // Loading state
  if (isLoading) {
    const content = createContentArea([Spinner(loadingMessage || 'Fetching from repository...')]);
    return createPageLayout([header, content]);
  }

  // If we have a code baseline with changes, show preview
  if (codeBaseline && codeDiff && countChanges(codeDiff) > 0 && currentView === 'preview') {
    return buildPreviewView(state, actions, header);
  }

  // Show source selection view
  return buildSourceView(state, actions, header, error);
}

function buildSourceView(state: PluginState, actions: RouterActions, header: HTMLElement, error?: string): HTMLElement {
  const { settings, codeBaseline } = state;
  const remoteSettings = settings.remote;
  const isGitHubConfigured = remoteSettings.github?.owner && remoteSettings.github?.repo;

  let contentChildren: HTMLElement[] = [];

  // Show error if present
  if (error) {
    contentChildren.push(Alert({
      type: 'error',
      message: error,
    }));
  }

  // GitHub section
  if (isGitHubConfigured) {
    // Show configured GitHub info
    const githubCard = Card({ padding: 'md' });

    const githubHeader = el('div', {
      style: 'display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);',
    });
    githubHeader.appendChild(Icon('github', 'md'));
    githubHeader.appendChild(el('span', { style: 'font-weight: 500;' }, 'GitHub Repository'));
    githubCard.appendChild(githubHeader);

    const repoInfo = el('div', {
      style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-md);',
    }, `${remoteSettings.github?.owner}/${remoteSettings.github?.repo} · ${remoteSettings.github?.branch || 'main'}`);
    githubCard.appendChild(repoInfo);

    const pathInfo = el('div', {
      style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); font-family: monospace;',
    }, remoteSettings.github?.path || '.synkio/export-baseline.json');
    githubCard.appendChild(pathInfo);

    contentChildren.push(githubCard);

    // Fetch button
    contentChildren.push(Button({
      label: 'FETCH FROM GITHUB',
      variant: 'primary',
      fullWidth: true,
      onClick: () => {
        currentView = 'preview';
        actions.updateState({ error: undefined });
        actions.send({ type: 'fetch-remote' });
      },
    }));
  } else {
    // Show setup prompt
    const setupCard = Card({ padding: 'md' });

    const setupHeader = el('div', {
      style: 'display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);',
    });
    setupHeader.appendChild(Icon('github', 'md'));
    setupHeader.appendChild(el('span', { style: 'font-weight: 500;' }, 'GitHub Repository'));
    setupCard.appendChild(setupHeader);

    const setupDesc = el('div', {
      style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary);',
    }, 'Connect to automatically fetch token updates from your repository.');
    setupCard.appendChild(setupDesc);

    contentChildren.push(setupCard);

    contentChildren.push(Button({
      label: 'CONNECT GITHUB',
      variant: 'primary',
      fullWidth: true,
      onClick: () => actions.navigate('settings'),
    }));
  }

  // Divider with "or" text
  const dividerRow = el('div', {
    style: 'display: flex; align-items: center; gap: var(--spacing-md); margin: var(--spacing-sm) 0;',
  });
  dividerRow.appendChild(el('div', { style: 'flex: 1; height: 1px; background: var(--color-border);' }));
  dividerRow.appendChild(el('span', { style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary);' }, 'or'));
  dividerRow.appendChild(el('div', { style: 'flex: 1; height: 1px; background: var(--color-border);' }));
  contentChildren.push(dividerRow);

  // Import file button
  contentChildren.push(Button({
    label: 'IMPORT JSON FILE',
    variant: 'secondary',
    fullWidth: true,
    onClick: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) {
          const text = await file.text();
          currentView = 'preview';
          actions.updateState({ error: undefined });
          actions.send({ type: 'import-baseline', data: text });
        }
      };
      input.click();
    },
  }));

  // Divider
  contentChildren.push(createDivider());

  // Last fetch info or hint
  if (codeBaseline && codeBaseline.baseline) {
    const lastFetchCard = Card({ padding: 'md' });
    const fetchInfo = el('div', { style: 'font-size: var(--font-size-xs); color: var(--color-text-secondary);' });

    if (remoteSettings.lastFetch) {
      const date = new Date(remoteSettings.lastFetch);
      fetchInfo.textContent = `Last fetched: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
    } else {
      fetchInfo.textContent = 'Baseline imported from file';
    }

    lastFetchCard.appendChild(fetchInfo);

    const tokenCount = Object.keys(codeBaseline.baseline).length;
    const countInfo = el('div', { style: 'font-size: var(--font-size-sm); font-weight: 500; margin-top: var(--spacing-xs);' }, `${tokenCount} tokens in code baseline`);
    lastFetchCard.appendChild(countInfo);

    contentChildren.push(lastFetchCard);
  } else {
    contentChildren.push(
      el('div', { style: 'text-align: center; padding: var(--spacing-lg); color: var(--color-text-tertiary); font-size: var(--font-size-sm);' },
        'Fetch or import a baseline to compare with Figma'
      )
    );
  }

  const content = createContentArea(contentChildren);
  return createPageLayout([header, content]);
}

function buildPreviewView(state: PluginState, actions: RouterActions, header: HTMLElement): HTMLElement {
  const { codeDiff } = state;

  if (!codeDiff) {
    return buildSourceView(state, actions, header);
  }

  let contentChildren: HTMLElement[] = [];

  const changeCount = countChanges(codeDiff);

  // Summary bar
  const summaryBar = el('div', {
    style: 'display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-sm) var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);'
  });
  summaryBar.appendChild(el('span', { style: 'font-size: var(--font-size-sm);' }, 'PREVIEW'));
  summaryBar.appendChild(el('span', { style: 'font-weight: 600; color: var(--color-primary);' }, `${changeCount} change${changeCount === 1 ? '' : 's'} to apply`));
  contentChildren.push(summaryBar);

  // Info alert
  contentChildren.push(Alert({
    type: 'info',
    message: 'These changes will be applied to Figma variables in this file.',
  }));

  // Diff sections grouped by collection (variables)
  const groupedDiffs = groupByCollection(codeDiff);

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
  if (countStyleChanges(codeDiff) > 0) {
    const groupedStyles = groupStylesByType(codeDiff);

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

  const content = createContentArea(contentChildren);

  // Footer with apply button
  const footer = createFooter([
    createColumn([
      createRow([
        Button({
          label: 'Cancel',
          variant: 'secondary',
          onClick: () => {
            currentView = 'source';
            actions.updateState({});
          },
        }),
        Button({
          label: `APPLY ${changeCount} CHANGES`,
          variant: 'primary',
          onClick: () => actions.send({ type: 'apply-to-figma' }),
        }),
      ], 'var(--spacing-sm)'),
      el('div', { style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); text-align: center;' },
        'Creates/updates variables in this file'
      ),
    ], 'var(--spacing-sm)'),
  ]);

  // Make buttons flex
  const buttonRow = footer.querySelector('div > div') as HTMLElement;
  if (buttonRow) {
    const buttons = buttonRow.querySelectorAll('button');
    buttons.forEach((btn, i) => {
      (btn as HTMLElement).style.flex = i === 0 ? '0 0 auto' : '1';
    });
  }

  return createPageLayout([header, content, footer]);
}

// Diff helpers (same as sync.ts)

interface GroupedChanges {
  added: Array<{ path: string; value: unknown; type: string }>;
  modified: Array<{ path: string; oldValue: unknown; newValue: unknown; type: string }>;
  deleted: Array<{ path: string; value: unknown; type: string }>;
  renamed: Array<{ oldPath: string; newPath: string; value: unknown; type: string }>;
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

function buildDiffItems(changes: GroupedChanges): HTMLElement[] {
  const items: HTMLElement[] = [];

  for (const item of changes.added) {
    items.push(DiffItem({
      type: 'added',
      path: item.path,
      value: formatValue(item.value),
      colorPreview: item.type === 'color' ? String(item.value) : undefined,
    }));
  }

  for (const item of changes.modified) {
    items.push(DiffItem({
      type: 'modified',
      path: item.path,
      value: formatValue(item.newValue),
      oldValue: formatValue(item.oldValue),
      colorPreview: item.type === 'color' ? String(item.newValue) : undefined,
    }));
  }

  for (const item of changes.renamed) {
    items.push(DiffItem({
      type: 'renamed',
      path: item.newPath,
      oldPath: item.oldPath,
      value: formatValue(item.value),
    }));
  }

  for (const item of changes.deleted) {
    items.push(DiffItem({
      type: 'deleted',
      path: item.path,
      value: `was ${formatValue(item.value)}`,
    }));
  }

  return items;
}

function buildStyleDiffItems(changes: GroupedStyleChanges): HTMLElement[] {
  const items: HTMLElement[] = [];

  for (const item of changes.added) {
    items.push(DiffItem({
      type: 'added',
      path: item.path,
      value: formatValue(item.value),
    }));
  }

  for (const item of changes.modified) {
    items.push(DiffItem({
      type: 'modified',
      path: item.path,
      value: formatValue(item.newValue),
      oldValue: formatValue(item.oldValue),
    }));
  }

  for (const item of changes.renamed) {
    items.push(DiffItem({
      type: 'renamed',
      path: item.newPath,
      oldPath: item.oldPath,
      value: formatValue(item.value),
    }));
  }

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
