// =============================================================================
// Tokens Tab - Collection and style selection/exclusion
// =============================================================================

import { PluginState, CollectionInfo, StyleTypeInfo, StyleType } from '../../lib/types';
import { RouterActions } from '../../ui/router';
import {
  el,
  Card,
  Button,
  Checkbox,
  TwoColumnLayout,
} from '../../ui/components/index';
import { Icon } from '../../ui/icons';
import { ContentArea, Footer } from '../../ui/layout/index';
import { TabContent } from './SyncTab';

export function TokensTab(state: PluginState, actions: RouterActions): TabContent {
  const { isFirstTime, onboardingStep, collections, styleTypes, settings } = state;
  const isOnboarding = isFirstTime && onboardingStep === 2;

  // Build scan status bar
  const statusBar = buildScanStatusBar(collections, styleTypes);

  // Build collections card
  const collectionsCard = buildCollectionsCard(
    collections,
    settings.excludedCollections,
    actions
  );

  // Build styles card
  const stylesCard = buildStylesCard(
    styleTypes,
    settings.excludedStyleTypes,
    actions
  );

  // Layout: two-column if styles exist
  const layout = styleTypes.length > 0
    ? TwoColumnLayout({ left: collectionsCard, right: stylesCard })
    : collectionsCard;

  // Helper text
  const helperText = el('div', { class: 'text-xs text-tertiary text-center' },
    'Uncheck items to exclude from sync'
  );

  const content = ContentArea([statusBar, layout, helperText]);

  // Footer
  const footer = Footer([
    Button({
      label: isOnboarding ? 'NEXT: CONNECT CODE' : 'SAVE',
      variant: 'primary',
      fullWidth: true,
      onClick: () => {
        // Save exclusions
        actions.send({
          type: 'save-excluded-collections',
          collections: settings.excludedCollections,
        });
        actions.send({
          type: 'save-excluded-style-types',
          styleTypes: settings.excludedStyleTypes,
        });

        if (isOnboarding) {
          // Advance to step 3
          actions.updateState({ onboardingStep: 3 });
        }
      },
    }),
  ]);

  return { content, footer };
}

// =============================================================================
// Scan Status Bar
// =============================================================================

function buildScanStatusBar(
  collections: CollectionInfo[],
  styleTypes: StyleTypeInfo[]
): HTMLElement {
  const totalVars = collections.reduce((sum, c) => sum + c.variableCount, 0);
  const totalStyles = styleTypes.reduce((sum, s) => sum + s.count, 0);

  const statusBar = el('div', {
    class: 'flex items-center gap-sm px-md py-sm bg-success-subtle rounded-md',
  });

  const checkIcon = el('span', { class: 'text-success flex-shrink-0' });
  checkIcon.appendChild(Icon('check', 'sm'));
  statusBar.appendChild(checkIcon);

  statusBar.appendChild(el('span', { class: 'text-sm font-medium' }, 'File scanned'));

  const statsText = totalStyles > 0
    ? `${collections.length} collections \u00B7 ${totalVars} vars \u00B7 ${totalStyles} styles`
    : `${collections.length} collections \u00B7 ${totalVars} vars`;

  statusBar.appendChild(el('span', { class: 'text-xs text-secondary ml-auto' }, statsText));

  return statusBar;
}

// =============================================================================
// Collections Card
// =============================================================================

function buildCollectionsCard(
  collections: CollectionInfo[],
  excluded: string[],
  actions: RouterActions
): HTMLElement {
  const card = Card({ padding: 'md' });

  // Header with count
  const includedCount = collections.filter(c => !excluded.includes(c.name)).length;
  const headerRow = el('div', { class: 'flex items-center justify-between mb-md' });
  headerRow.appendChild(el('span', { class: 'font-medium text-xs' }, 'COLLECTIONS'));
  headerRow.appendChild(el('span', { class: 'text-xs text-secondary' }, `${includedCount} of ${collections.length}`));
  card.appendChild(headerRow);

  if (collections.length === 0) {
    card.appendChild(el('div', { class: 'text-sm text-tertiary' }, 'No variable collections found'));
  } else {
    const list = el('div', { class: 'flex flex-col gap-sm' });

    for (const collection of collections) {
      const isExcluded = excluded.includes(collection.name);
      const modeNames = collection.modes.map(m => m.name).join(' \u00B7 ');

      const checkbox = Checkbox({
        label: collection.name,
        sublabel: `${modeNames} \u00B7 ${collection.variableCount} vars`,
        checked: !isExcluded,
        onChange: (checked) => {
          const newExcluded = checked
            ? excluded.filter(n => n !== collection.name)
            : [...excluded, collection.name];
          actions.send({ type: 'save-excluded-collections', collections: newExcluded });
        },
      });

      list.appendChild(checkbox);
    }

    card.appendChild(list);
  }

  return card;
}

// =============================================================================
// Styles Card
// =============================================================================

function buildStylesCard(
  styleTypes: StyleTypeInfo[],
  excluded: StyleType[],
  actions: RouterActions
): HTMLElement {
  const card = Card({ padding: 'md' });

  const styleLabels: Record<string, string> = {
    paint: 'Paint Styles',
    text: 'Text Styles',
    effect: 'Effect Styles',
  };

  // Header with count
  const includedCount = styleTypes.filter(s => !excluded.includes(s.type)).length;
  const headerRow = el('div', { class: 'flex items-center justify-between mb-md' });
  headerRow.appendChild(el('span', { class: 'font-medium text-xs' }, 'STYLES'));
  headerRow.appendChild(el('span', { class: 'text-xs text-secondary' }, `${includedCount} of ${styleTypes.length}`));
  card.appendChild(headerRow);

  if (styleTypes.length === 0) {
    card.appendChild(el('div', { class: 'text-sm text-tertiary' }, 'No styles found'));
  } else {
    const list = el('div', { class: 'flex flex-col gap-sm' });

    for (const styleType of styleTypes) {
      const isExcluded = excluded.includes(styleType.type);

      const checkbox = Checkbox({
        label: styleLabels[styleType.type] || styleType.type,
        sublabel: `${styleType.count} styles`,
        checked: !isExcluded,
        onChange: (checked) => {
          const newExcluded = checked
            ? excluded.filter(t => t !== styleType.type)
            : [...excluded, styleType.type];
          actions.send({ type: 'save-excluded-style-types', styleTypes: newExcluded });
        },
      });

      list.appendChild(checkbox);
    }

    card.appendChild(list);
  }

  return card;
}

