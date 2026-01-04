// =============================================================================
// Apply Screen - Code to Figma
// =============================================================================

import { PluginState } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Header,
  Button,
  Card,
  Section,
  Alert,
  Spinner,
  Divider,
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

type ApplyView = 'source' | 'preview';

let currentView: ApplyView = 'source';

export function resetApplyScreen() {
  currentView = 'source';
}

export function ApplyScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { isLoading, loadingMessage, codeBaseline, codeDiff, settings, error } = state;
  const remoteSettings = settings.remote;

  // Header
  const header = Header({
    title: 'Apply',
    showBack: true,
    onBack: () => {
      currentView = 'source';
      // Clear error when navigating away
      actions.updateState({ error: undefined });
      actions.navigate('main');
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
  const isGitHubConfigured = remoteSettings.source === 'github' && remoteSettings.github?.owner && remoteSettings.github?.repo;
  const isUrlConfigured = remoteSettings.source === 'url' && remoteSettings.url?.baselineUrl;
  const isRemoteConfigured = isGitHubConfigured || isUrlConfigured;

  let contentChildren: HTMLElement[] = [];

  // Show error if present
  if (error) {
    contentChildren.push(Alert({
      type: 'error',
      message: error,
    }));
  }

  // Remote source section
  if (isGitHubConfigured) {
    // Show configured GitHub info
    const githubCard = Card({ padding: 'md' });

    const githubHeader = el('div', { class: 'github-header' });
    githubHeader.appendChild(Icon('github', 'md'));
    githubHeader.appendChild(el('span', { class: 'font-medium' }, 'GitHub Repository'));
    githubCard.appendChild(githubHeader);

    const repoInfo = el('div', {
      class: 'text-sm text-secondary mb-md',
    }, `${remoteSettings.github?.owner}/${remoteSettings.github?.repo} · ${remoteSettings.github?.branch || 'main'}`);
    githubCard.appendChild(repoInfo);

    const pathInfo = el('div', {
      class: 'text-xs text-tertiary font-mono',
    }, remoteSettings.github?.path || 'synkio/baseline.json');
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
  } else if (isUrlConfigured) {
    // Show configured URL info
    const urlCard = Card({ padding: 'md' });

    const urlHeader = el('div', { class: 'flex items-center gap-sm mb-sm' });
    urlHeader.appendChild(el('span', { class: 'font-medium' }, 'Remote URL'));
    urlCard.appendChild(urlHeader);

    const urlInfo = el('div', {
      class: 'text-xs text-tertiary font-mono break-all',
    }, remoteSettings.url?.baselineUrl || '');
    urlCard.appendChild(urlInfo);

    contentChildren.push(urlCard);

    // Fetch button
    contentChildren.push(Button({
      label: 'FETCH FROM URL',
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

    const setupHeader = el('div', { class: 'flex items-center gap-sm mb-sm' });
    setupHeader.appendChild(el('span', { class: 'font-medium' }, 'Remote Source'));
    setupCard.appendChild(setupHeader);

    const setupDesc = el('div', {
      class: 'text-sm text-secondary',
    }, 'Configure GitHub or a custom URL to fetch token updates from your repository.');
    setupCard.appendChild(setupDesc);

    contentChildren.push(setupCard);

    contentChildren.push(Button({
      label: 'CONFIGURE SOURCE',
      variant: 'primary',
      fullWidth: true,
      onClick: () => actions.navigate('settings'),
    }));
  }

  // Divider with "or" text
  contentChildren.push(Divider({ text: 'or' }));

  // Import file section
  const importSection = el('div', { class: 'flex flex-col gap-xs' });

  importSection.appendChild(Button({
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

  importSection.appendChild(el('div', { class: 'text-xs text-tertiary text-center' },
    'Upload export-baseline.json from synkio export-baseline'
  ));

  contentChildren.push(importSection);

  // Divider
  contentChildren.push(Divider({}));

  // Last fetch info or hint
  if (codeBaseline && codeBaseline.baseline) {
    const lastFetchCard = Card({ padding: 'md' });
    const fetchInfo = el('div', { class: 'text-xs text-secondary' });

    if (remoteSettings.lastFetch) {
      const date = new Date(remoteSettings.lastFetch);
      fetchInfo.textContent = `Last fetched: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
    } else {
      fetchInfo.textContent = 'Baseline imported from file';
    }

    lastFetchCard.appendChild(fetchInfo);

    const tokenCount = Object.keys(codeBaseline.baseline).length;
    const countInfo = el('div', { class: 'text-sm font-medium mt-xs' }, `${tokenCount} tokens in code baseline`);
    lastFetchCard.appendChild(countInfo);

    contentChildren.push(lastFetchCard);
  } else {
    contentChildren.push(
      el('div', { class: 'text-center p-lg text-tertiary text-sm' },
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
  const summaryBar = el('div', { class: 'summary-bar' });
  summaryBar.appendChild(el('span', { class: 'text-sm' }, 'PREVIEW'));
  summaryBar.appendChild(el('span', { class: 'font-semibold text-brand' }, `${changeCount} change${changeCount === 1 ? '' : 's'} to apply`));
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
      el('div', { class: 'text-xs text-tertiary text-center' },
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
