// =============================================================================
// Onboarding Screen - First-time setup (Redesigned)
// =============================================================================

import { PluginState, StyleType } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Button,
  Card,
  Checkbox,
  Spinner,
  Header,
  HeroHeader,
  Stepper,
  TwoColumnLayout,
  SegmentedControl,
  WelcomeFeature,
  WelcomeLinks,
} from '../ui/components/index';
import { Icon } from '../ui/icons';
import {
  PageLayout,
  ContentArea,
  Footer,
} from '../ui/layout/index';

// Step names for stepper (simplified: Welcome → Select → Guide)
const ONBOARDING_STEPS = ['Welcome', 'Select', 'Guide'];

type OnboardingStep = 'welcome' | 'scanning' | 'select' | 'guide';

let currentStep: OnboardingStep = 'welcome';
let excludedCollections: Set<string> = new Set();
let excludedStyleTypes: Set<StyleType> = new Set();

// Track which workflow to display in the Guide step (can be toggled)
let displayGitHubWorkflow = false; // What's currently shown in the Guide (can be toggled)
let guideInitialized = false; // Track if we've initialized the guide display

// Scanning state - track render count since entering scanning step
// After 2 renders (both collections-update and style-types-update received), we can advance
let scanningRenderCount = 0;

export function OnboardingScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { collections, styleTypes } = state;

  // Advance from scanning to select when we've received data
  // We need at least 2 renders while in scanning (one for each update message)
  // OR we have actual data (collections or styleTypes)
  if (currentStep === 'scanning') {
    scanningRenderCount++;
    if (collections.length > 0 || styleTypes.length > 0 || scanningRenderCount >= 2) {
      currentStep = 'select';
      scanningRenderCount = 0; // Reset for potential future scans
    }
  }

  switch (currentStep) {
    case 'welcome':
      return buildWelcomeStep(actions);
    case 'scanning':
      return buildScanningStep();
    case 'select':
      return buildSelectStep(state, actions);
    case 'guide':
      return buildGuideStep(actions);
    default:
      return buildWelcomeStep(actions);
  }
}

// =============================================================================
// Step 1: Welcome - Clean, professional first impression
// =============================================================================

function buildWelcomeStep(actions: RouterActions): HTMLElement {
  const content = ContentArea([]);

  // Hero header with logo and tagline
  content.appendChild(HeroHeader({
    title: 'SYNKIO',
    subtitle: 'Sync design tokens without Figma Enterprise.',
  }));

  // Single feature card - bi-directional sync visualization
  content.appendChild(WelcomeFeature({
    title: 'Bi-directional Sync',
    description: 'Keep your design tokens in sync between Figma and your codebase.',
  }));

  // Spacer to push footer down
  const spacer = el('div', { style: 'flex: 1;' });
  content.appendChild(spacer);

  // External links
  content.appendChild(WelcomeLinks({
    onWebsiteClick: () => {
      window.open('https://synkio.io', '_blank');
    },
    onDocsClick: () => {
      window.open('https://synkio.io/docs', '_blank');
    },
  }));

  // Footer with CTA
  const footer = Footer([
    Button({
      label: 'GET STARTED',
      variant: 'primary',
      fullWidth: true,
      onClick: () => {
        currentStep = 'scanning';
        actions.send({ type: 'get-collections' });
        actions.send({ type: 'get-style-types' });
        actions.updateState({});
      },
    }),
  ]);

  return PageLayout([content, footer]);
}

// =============================================================================
// Scanning (Loading State)
// =============================================================================

function buildScanningStep(): HTMLElement {
  const header = Header({});

  const content = ContentArea([
    Spinner('Scanning your file for collections...'),
  ]);

  return PageLayout([header, content]);
}

// =============================================================================
// Step 2: Select Collections
// =============================================================================

function buildSelectStep(state: PluginState, actions: RouterActions): HTMLElement {
  const { collections, styleTypes } = state;

  const header = Header({ title: 'Select' });

  const content = ContentArea([]);

  // Stepper
  content.appendChild(Stepper({
    steps: ONBOARDING_STEPS,
    currentStep: 1,
  }));

  // Compact status bar with inline check
  const totalVars = collections.reduce((sum, c) => sum + c.variableCount, 0);
  const totalStyles = styleTypes.reduce((sum, s) => sum + s.count, 0);

  const statusBar = el('div', {
    class: 'flex items-center gap-sm px-md py-sm bg-success-subtle rounded-md',
  });
  const checkIcon = el('span', { class: 'text-success flex-shrink-0' });
  checkIcon.appendChild(Icon('check', 'sm'));
  statusBar.appendChild(checkIcon);
  statusBar.appendChild(el('span', { class: 'text-sm font-medium' }, 'File scanned'));
  statusBar.appendChild(el('span', { class: 'text-xs text-secondary ml-auto' },
    `${collections.length} collections \u00B7 ${totalVars} vars${totalStyles > 0 ? ` \u00B7 ${totalStyles} styles` : ''}`
  ));
  content.appendChild(statusBar);

  // Collections card
  const collectionsCard = Card({ padding: 'md' });
  collectionsCard.appendChild(el('div', { class: 'font-medium mb-md text-xs' }, 'COLLECTIONS'));

  for (const collection of collections) {
    const modeNames = collection.modes.map(m => m.name).join(' \u00B7 ');
    const isExcluded = excludedCollections.has(collection.name);

    collectionsCard.appendChild(Checkbox({
      label: collection.name,
      sublabel: `${modeNames} \u00B7 ${collection.variableCount} variables`,
      checked: !isExcluded,
      onChange: (checked) => {
        if (checked) {
          excludedCollections.delete(collection.name);
        } else {
          excludedCollections.add(collection.name);
        }
        actions.updateState({});
      },
    }));
  }

  // Styles card (only if styles exist)
  let stylesCard: HTMLElement | null = null;
  if (styleTypes.length > 0) {
    stylesCard = Card({ padding: 'md' });
    stylesCard.appendChild(el('div', { class: 'font-medium mb-md text-xs' }, 'STYLES'));

    const labelMap: Record<StyleType, string> = {
      paint: 'Paint Styles',
      text: 'Text Styles',
      effect: 'Effect Styles',
    };

    for (const styleType of styleTypes) {
      const isExcluded = excludedStyleTypes.has(styleType.type);
      stylesCard.appendChild(Checkbox({
        label: labelMap[styleType.type] || styleType.type,
        sublabel: `${styleType.count} style${styleType.count === 1 ? '' : 's'}`,
        checked: !isExcluded,
        onChange: (checked) => {
          if (checked) {
            excludedStyleTypes.delete(styleType.type);
          } else {
            excludedStyleTypes.add(styleType.type);
          }
          actions.updateState({});
        },
      }));
    }
  }

  // Use two-column if styles exist, otherwise single column
  if (stylesCard) {
    content.appendChild(TwoColumnLayout({
      left: collectionsCard,
      right: stylesCard,
    }));
  } else {
    content.appendChild(collectionsCard);
  }

  // Helper text
  content.appendChild(el('div', { class: 'text-xs text-tertiary text-center mt-md' }, 'Uncheck items to exclude from sync'));

  // Footer
  const footer = Footer([
    Button({
      label: 'CONTINUE',
      variant: 'primary',
      fullWidth: true,
      onClick: () => {
        // Save exclusions
        if (excludedCollections.size > 0) {
          actions.send({
            type: 'save-excluded-collections',
            collections: Array.from(excludedCollections),
          });
        }
        if (excludedStyleTypes.size > 0) {
          actions.send({
            type: 'save-excluded-style-types',
            styleTypes: Array.from(excludedStyleTypes),
          });
        }
        currentStep = 'guide';
        actions.updateState({});
      },
    }),
  ]);

  return PageLayout([header, content, footer]);
}

// =============================================================================
// Step 3: Workflow Guide (Shows workflow-specific instructions)
// =============================================================================

function buildGuideStep(actions: RouterActions): HTMLElement {
  // Default to CLI workflow on first render (user can toggle to see GitHub)
  if (!guideInitialized) {
    displayGitHubWorkflow = false; // Start with CLI workflow (most common)
    guideInitialized = true;
  }

  const header = Header({ title: 'Guide' });

  const content = ContentArea([]);

  // Stepper
  content.appendChild(Stepper({
    steps: ONBOARDING_STEPS,
    currentStep: 2,
  }));

  // Page title
  const titleSection = el('div', { class: 'text-center py-sm' });
  titleSection.appendChild(el('div', { class: 'text-lg font-medium' }, 'How It Works'));
  titleSection.appendChild(el('div', { class: 'text-sm text-secondary' }, 'Choose your workflow'));
  content.appendChild(titleSection);

  // Workflow toggle (segment control)
  const toggleContainer = el('div', { class: 'flex justify-center mb-md' });
  toggleContainer.appendChild(SegmentedControl({
    options: [
      { value: 'cli', label: 'CLI', icon: Icon('terminal', 'xs') },
      { value: 'github', label: 'GitHub', icon: Icon('github', 'xs') },
    ],
    value: displayGitHubWorkflow ? 'github' : 'cli',
    onChange: (value) => {
      displayGitHubWorkflow = value === 'github';
      actions.updateState({});
    },
  }));
  content.appendChild(toggleContainer);

  // Helper to create a step card with description and location
  const createStepCard = (
    num: string,
    title: string,
    description: string,
    location: 'terminal' | 'plugin' | 'github',
    contentEl: HTMLElement
  ) => {
    const card = el('div', { class: 'bg-secondary rounded-md px-sm py-sm' });

    // Top row: badge + title + location tag
    const topRow = el('div', { class: 'flex items-center gap-sm mb-xs' });

    // Step badge
    const badge = el('div', {
      class: 'flex items-center justify-center rounded-full bg-brand text-inverse font-bold flex-shrink-0',
      style: 'width: 22px; height: 22px; font-size: 12px;'
    }, num);
    topRow.appendChild(badge);

    // Title
    topRow.appendChild(el('span', { class: 'font-bold text-sm flex-1' }, title));

    // Location tag with icon
    const locationStyles: Record<string, { bg: string; icon: 'terminal' | 'figma' | 'github'; label: string }> = {
      terminal: { bg: 'bg-tertiary text-secondary', icon: 'terminal', label: 'Terminal' },
      plugin: { bg: 'bg-brand-subtle text-brand', icon: 'figma', label: 'Plugin' },
      github: { bg: 'bg-tertiary text-secondary', icon: 'github', label: 'GitHub' },
    };
    const loc = locationStyles[location];
    const locationTag = el('span', {
      class: 'flex items-center gap-xxs text-xs px-xs py-xxs rounded ' + loc.bg
    });
    locationTag.appendChild(Icon(loc.icon, 'xs'));
    locationTag.appendChild(document.createTextNode(loc.label));
    topRow.appendChild(locationTag);

    card.appendChild(topRow);

    // Description
    card.appendChild(el('div', { class: 'text-xs text-secondary mb-sm', style: 'margin-left: 30px;' }, description));

    // Content (command or info)
    const contentWrapper = el('div', { style: 'margin-left: 30px;' });
    contentWrapper.appendChild(contentEl);
    card.appendChild(contentWrapper);

    return card;
  };

  // Helper for single command content
  const createCommandContent = (command: string) => {
    return el('code', { class: 'text-xs font-mono text-brand bg-tertiary px-sm py-xs rounded inline-block' }, command);
  };

  // Helper for info text (non-command)
  const createInfoContent = (text: string) => {
    return el('span', { class: 'text-xs text-secondary bg-tertiary px-sm py-xs rounded inline-block' }, text);
  };

  // Flow container
  const flowContainer = el('div', { class: 'flex flex-col', style: 'gap: 6px;' });

  // Helper for connector line
  const createConnector = () => el('div', {
    class: 'text-tertiary text-center',
    style: 'line-height: 0.8;'
  }, '↓');

  if (displayGitHubWorkflow) {
    // ===========================================
    // GITHUB WORKFLOW - No FIGMA_TOKEN needed!
    // ===========================================

    // ① INIT - Terminal (simplified - no token needed)
    flowContainer.appendChild(createStepCard(
      '1', 'Initialize Project', 'Run once in your codebase (no Figma token needed)',
      'terminal', createCommandContent('npx synkio init --github')
    ));
    flowContainer.appendChild(createConnector());

    // ② CREATE PR - Plugin
    flowContainer.appendChild(createStepCard(
      '2', 'Create PR', 'Push your design tokens directly to GitHub',
      'plugin', createInfoContent('Click "Create PR" in the Sync screen')
    ));
    flowContainer.appendChild(createConnector());

    // ③ MERGE - GitHub
    flowContainer.appendChild(createStepCard(
      '3', 'Review & Merge', 'Review the token changes and merge the PR',
      'github', createInfoContent('Merge the PR on GitHub')
    ));
    flowContainer.appendChild(createConnector());

    // ④ BUILD - Terminal
    flowContainer.appendChild(createStepCard(
      '4', 'Generate Output', 'Create token files from the merged baseline',
      'terminal', createCommandContent('npx synkio build')
    ));

    // Requirements callout
    const requirementsCard = el('div', { class: 'bg-tertiary rounded-md px-sm py-sm mt-md' });
    const requirementsHeader = el('div', { class: 'flex items-center gap-xs mb-xs' });
    requirementsHeader.appendChild(Icon('github', 'sm'));
    requirementsHeader.appendChild(el('span', { class: 'text-xs font-medium' }, 'GitHub Token Required'));
    requirementsCard.appendChild(requirementsHeader);
    requirementsCard.appendChild(el('div', { class: 'text-xs text-secondary mb-xs' },
      'For private repos, you\'ll need a GitHub personal access token with repo scope.'
    ));
    requirementsCard.appendChild(el('code', { class: 'text-xs font-mono text-brand' }, 'ghp_xxxxxxxxxxxx'));
    flowContainer.appendChild(requirementsCard);

    // Settings note for GitHub configuration
    const settingsNote = el('div', { class: 'text-xs text-tertiary text-center mt-sm' });
    settingsNote.appendChild(document.createTextNode('Configure your GitHub repository in '));
    const settingsLink = el('span', { class: 'text-brand font-medium' }, 'Settings');
    settingsNote.appendChild(settingsLink);
    flowContainer.appendChild(settingsNote);

  } else {
    // ===========================================
    // CLI WORKFLOW - Requires FIGMA_TOKEN
    // ===========================================

    // ① INIT - Terminal
    flowContainer.appendChild(createStepCard(
      '1', 'Initialize Project', 'Connect this Figma file to your codebase',
      'terminal', createCommandContent('npx synkio init')
    ));
    flowContainer.appendChild(createConnector());

    // ② SAVE - Plugin
    flowContainer.appendChild(createStepCard(
      '2', 'Save Tokens', 'Export your design tokens for the CLI',
      'plugin', createInfoContent('Click "Save" in the Sync screen')
    ));
    flowContainer.appendChild(createConnector());

    // ③ PULL - Terminal
    flowContainer.appendChild(createStepCard(
      '3', 'Pull Changes', 'Fetch tokens from Figma into your project',
      'terminal', createCommandContent('npx synkio pull')
    ));
    flowContainer.appendChild(createConnector());

    // ④ BUILD - Terminal
    flowContainer.appendChild(createStepCard(
      '4', 'Generate Output', 'Create token files for your app',
      'terminal', createCommandContent('npx synkio build')
    ));

    // Token setup reminder
    const tokenCard = el('div', { class: 'bg-tertiary rounded-md px-sm py-sm mt-md' });
    const tokenHeader = el('div', { class: 'flex items-center gap-xs mb-xs' });
    tokenHeader.appendChild(Icon('code', 'sm'));
    tokenHeader.appendChild(el('span', { class: 'text-xs font-medium' }, 'Figma Token Required'));
    tokenCard.appendChild(tokenHeader);
    tokenCard.appendChild(el('div', { class: 'text-xs text-secondary mb-xs' },
      'The CLI needs a Figma personal access token to fetch data from your file.'
    ));
    tokenCard.appendChild(el('code', { class: 'text-xs font-mono text-brand' }, 'FIGMA_TOKEN=figd_xxx'));
    flowContainer.appendChild(tokenCard);

    // Optional: Remote source note
    const remoteNote = el('div', { class: 'text-xs text-tertiary text-center mt-sm' });
    remoteNote.textContent = 'Optional: Configure GitHub or URL in Settings to check sync status and fetch code changes.';
    flowContainer.appendChild(remoteNote);
  }

  content.appendChild(flowContainer);

  // Footer - No auto-sync, just navigate to sync screen
  const footer = Footer([
    Button({
      label: 'START SYNCING',
      variant: 'primary',
      fullWidth: true,
      onClick: () => {
        currentStep = 'welcome'; // Reset for next time
        actions.send({ type: 'complete-onboarding' }); // Persist to storage
        actions.updateState({ isFirstTime: false });
        actions.navigate('home');
      },
    }),
  ]);

  return PageLayout([header, content, footer]);
}

// =============================================================================
// Export function to reset onboarding state
// =============================================================================

export function resetOnboarding() {
  currentStep = 'welcome';
  excludedCollections = new Set();
  excludedStyleTypes = new Set();
  displayGitHubWorkflow = false;
  guideInitialized = false;
  scanningRenderCount = 0;
}
