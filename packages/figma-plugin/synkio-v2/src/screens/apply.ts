// =============================================================================
// Apply Screen - Code to Figma
// =============================================================================

import { PluginState, ComparisonResult, RemoteSettings } from '../lib/types';
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
  EmptyState,
  Input,
} from '../ui/components';
import {
  createPageLayout,
  createContentArea,
  createFooter,
  createColumn,
  createRow,
  createText,
  createDivider,
} from '../ui/router';

type ApplyView = 'source' | 'preview';

let currentView: ApplyView = 'source';

export function ApplyScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { isLoading, loadingMessage, codeBaseline, codeDiff, settings } = state;
  const remoteSettings = settings.remote;

  // Header
  const header = Header({
    title: 'APPLY FROM CODE',
    showBack: true,
    onBack: () => {
      currentView = 'source';
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
  return buildSourceView(state, actions, header);
}

function buildSourceView(state: PluginState, actions: RouterActions, header: HTMLElement): HTMLElement {
  const { settings, codeBaseline } = state;
  const remoteSettings = settings.remote;
  const isGitHubConfigured = remoteSettings.github?.owner && remoteSettings.github?.repo;

  let contentChildren: HTMLElement[] = [];

  // Source selection card
  const sourceCard = Card({ padding: 'lg' });

  const sourceTitle = el('div', { style: 'font-weight: 500; margin-bottom: var(--spacing-md);' }, 'SOURCE');

  // GitHub option
  const githubOption = buildSourceOption({
    selected: remoteSettings.source === 'github',
    icon: '\uD83D\uDCE6',
    title: 'GitHub Repository',
    description: isGitHubConfigured
      ? `${remoteSettings.github?.owner}/${remoteSettings.github?.repo} \u00B7 ${remoteSettings.github?.branch || 'main'}`
      : 'Connect to fetch token updates',
    configured: !!isGitHubConfigured,
    lastFetch: remoteSettings.lastFetch,
    onClick: () => {
      if (!isGitHubConfigured) {
        actions.navigate('settings');
      }
    },
  });

  // Import option
  const importOption = buildSourceOption({
    selected: false,
    icon: '\uD83D\uDCC1',
    title: 'Import JSON File',
    description: 'Manually select export-baseline.json',
    configured: true,
    onClick: () => {
      // Trigger file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) {
          const text = await file.text();
          actions.send({ type: 'import-baseline', data: text });
        }
      };
      input.click();
    },
  });

  sourceCard.appendChild(sourceTitle);
  sourceCard.appendChild(githubOption);
  sourceCard.appendChild(importOption);
  contentChildren.push(sourceCard);

  // Fetch button
  if (isGitHubConfigured) {
    contentChildren.push(Button({
      label: 'FETCH FROM GITHUB',
      variant: 'primary',
      fullWidth: true,
      onClick: () => {
        currentView = 'preview';
        actions.send({ type: 'fetch-remote' });
      },
    }));
  } else {
    contentChildren.push(Button({
      label: 'CONNECT GITHUB',
      variant: 'primary',
      fullWidth: true,
      onClick: () => actions.navigate('settings'),
    }));
  }

  // Divider
  contentChildren.push(createDivider());

  // Last fetch info or hint
  if (codeBaseline) {
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

  // Diff sections grouped by collection
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

// Component helpers

interface SourceOptionProps {
  selected: boolean;
  icon: string;
  title: string;
  description: string;
  configured: boolean;
  lastFetch?: string;
  onClick?: () => void;
}

function buildSourceOption(props: SourceOptionProps): HTMLElement {
  const { selected, icon, title, description, configured, lastFetch, onClick } = props;

  const option = el('div', {
    style: `
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      border: 1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'};
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-sm);
      cursor: pointer;
      transition: border-color 0.15s ease;
    `,
  });

  if (onClick) {
    option.addEventListener('click', onClick);
    option.addEventListener('mouseenter', () => {
      if (!selected) option.style.borderColor = 'var(--color-border-strong)';
    });
    option.addEventListener('mouseleave', () => {
      if (!selected) option.style.borderColor = 'var(--color-border)';
    });
  }

  // Radio indicator
  const radio = el('div', {
    style: `
      width: 16px;
      height: 16px;
      border: 2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `,
  });
  if (selected) {
    radio.appendChild(el('div', {
      style: 'width: 8px; height: 8px; background: var(--color-primary); border-radius: 50%;',
    }));
  }

  // Content
  const content = el('div', { style: 'flex: 1; min-width: 0;' });
  content.appendChild(el('div', { style: 'font-weight: 500; font-size: var(--font-size-sm);' }, title));
  content.appendChild(el('div', { style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: 2px;' }, description));

  // Status
  if (!configured) {
    const badge = el('span', {
      style: 'font-size: var(--font-size-xs); padding: 2px 6px; background: var(--color-bg-tertiary); border-radius: 4px; color: var(--color-text-secondary);',
    }, 'Setup');
    option.appendChild(radio);
    option.appendChild(content);
    option.appendChild(badge);
  } else {
    option.appendChild(radio);
    option.appendChild(content);
  }

  return option;
}

// Diff helpers (same as sync.ts)

interface GroupedChanges {
  added: Array<{ path: string; value: unknown; type: string }>;
  modified: Array<{ path: string; oldValue: unknown; newValue: unknown; type: string }>;
  deleted: Array<{ path: string; value: unknown; type: string }>;
  renamed: Array<{ oldPath: string; newPath: string; value: unknown; type: string }>;
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

function countChanges(diff: ComparisonResult): number {
  return (
    diff.valueChanges.length +
    diff.pathChanges.length +
    diff.newVariables.length +
    diff.deletedVariables.length
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
