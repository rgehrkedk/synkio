// =============================================================================
// Onboarding Screen - First-time setup
// =============================================================================

import { PluginState } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Button,
  Card,
  Checkbox,
  Input,
  Spinner,
  CommandBox,
} from '../ui/components/index';
import { Icon } from '../ui/icons';
import {
  PageLayout,
  ContentArea,
  Footer,
  Column,
} from '../ui/layout/index';

type OnboardingStep = 'welcome' | 'scanning' | 'setup' | 'complete';

let currentStep: OnboardingStep = 'welcome';
let githubRepo = '';

export function OnboardingScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { collections } = state;

  // If we have collections and we're past scanning, show setup
  if (collections.length > 0 && currentStep === 'scanning') {
    currentStep = 'setup';
  }

  switch (currentStep) {
    case 'welcome':
      return buildWelcomeStep(actions);
    case 'scanning':
      return buildScanningStep();
    case 'setup':
      return buildSetupStep(state, actions);
    case 'complete':
      return buildCompleteStep(actions);
    default:
      return buildWelcomeStep(actions);
  }
}

function buildWelcomeStep(actions: RouterActions): HTMLElement {
  const content = ContentArea([]);

  // Logo and title - using .hero class
  const hero = el('div', { class: 'hero' });

  const logoWrapper = el('div', { class: 'hero__logo' });
  logoWrapper.appendChild(Icon('sync', 'xl'));
  hero.appendChild(logoWrapper);

  hero.appendChild(el('div', { class: 'hero__title' }, 'Welcome to Synkio'));
  hero.appendChild(el('div', { class: 'hero__subtitle' }, 'Sync Figma variables with your codebase'));

  content.appendChild(hero);

  // Workflow explanation
  const workflowCard = Card({ padding: 'lg' });

  // Sync to Code
  const syncSection = el('div', { class: 'mb-lg' });
  syncSection.appendChild(el('div', { class: 'font-semibold mb-xs' }, '1. SYNC TO CODE'));
  syncSection.appendChild(el('div', {
    class: 'text-sm text-secondary mb-sm',
  }, 'Create variables in Figma, then sync them to your code as design tokens.'));
  syncSection.appendChild(el('div', {
    class: 'text-xs text-tertiary font-mono',
  }, 'Figma \u2192 Plugin \u2192 CLI \u2192 Token files'));

  // Apply from Code
  const applySection = el('div');
  applySection.appendChild(el('div', { class: 'font-semibold mb-xs' }, '2. APPLY FROM CODE'));
  applySection.appendChild(el('div', {
    class: 'text-sm text-secondary mb-sm',
  }, 'Import tokens from code and create or update Figma variables.'));
  applySection.appendChild(el('div', {
    class: 'text-xs text-tertiary font-mono',
  }, 'Token files \u2192 CLI \u2192 Plugin \u2192 Figma'));

  workflowCard.appendChild(syncSection);
  workflowCard.appendChild(applySection);
  content.appendChild(workflowCard);

  // Footer with Get Started button
  const footer = Footer([
    Column([
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
      el('div', {
        class: 'text-xs text-tertiary text-center',
      }, 'Scan your file for collections'),
    ], 'var(--spacing-sm)'),
  ]);

  // Link to docs
  const docsLink = el('div', {
    class: 'text-center py-md text-xs text-tertiary',
  }, 'Learn more at github.com/synkio/synkio');
  content.appendChild(docsLink);

  return PageLayout([content, footer]);
}

function buildScanningStep(): HTMLElement {
  const content = ContentArea([
    Spinner('Scanning your file for collections...'),
  ]);

  return PageLayout([content]);
}

function buildSetupStep(state: PluginState, actions: RouterActions): HTMLElement {
  const { collections, styleTypes } = state;

  const content = ContentArea([]);

  // Success message
  const successBanner = el('div', { class: 'text-center py-lg' });
  const checkWrapper = el('div', { class: 'success-icon-wrapper' });
  checkWrapper.appendChild(Icon('check', 'lg'));
  successBanner.appendChild(checkWrapper);
  successBanner.appendChild(el('div', { class: 'text-lg font-medium' }, 'File scanned!'));
  content.appendChild(successBanner);

  // Collections found
  const collectionsCard = Card({ padding: 'md' });

  const totalVars = collections.reduce((sum, c) => sum + c.variableCount, 0);
  const totalStyles = styleTypes.reduce((sum, s) => sum + s.count, 0);

  collectionsCard.appendChild(el('div', {
    class: 'text-sm text-secondary mb-md',
  }, `Found ${collections.length} collection${collections.length === 1 ? '' : 's'} with ${totalVars} variables${totalStyles > 0 ? ` and ${totalStyles} styles` : ''}`));

  for (const collection of collections) {
    const modeNames = collection.modes.map(m => m.name).join(' \u00B7 ');

    const checkbox = Checkbox({
      label: collection.name,
      sublabel: `${modeNames} \u00B7 ${collection.variableCount} variables`,
      checked: true,
      onChange: () => {
        // Toggle will be handled on save
      },
    });
    collectionsCard.appendChild(checkbox);
  }

  content.appendChild(collectionsCard);

  // Optional GitHub connection
  const githubCard = Card({ padding: 'md' });
  githubCard.appendChild(el('div', { class: 'font-medium mb-xs' }, 'OPTIONAL: Connect to GitHub'));
  githubCard.appendChild(el('div', {
    class: 'text-xs text-tertiary mb-md',
  }, 'Skip this step if you\'ll import files manually'));

  const repoInput = Input({
    placeholder: 'owner/repo (e.g., acme/design-system)',
    value: githubRepo,
    onChange: (value) => {
      githubRepo = value;
    },
  });
  githubCard.appendChild(repoInput);

  content.appendChild(githubCard);

  // Footer
  const footer = Footer([
    Column([
      Button({
        label: 'CREATE INITIAL SYNC',
        variant: 'primary',
        fullWidth: true,
        onClick: () => {
          // Save GitHub if provided
          if (githubRepo && githubRepo.includes('/')) {
            const [owner, repo] = githubRepo.split('/');
            actions.send({
              type: 'save-settings',
              settings: {
                enabled: true,
                source: 'github',
                github: {
                  owner: owner.trim(),
                  repo: repo.trim(),
                  branch: 'main',
                  path: '.synkio/export-baseline.json',
                },
              },
            });
          }

          // Perform initial sync
          actions.send({ type: 'sync' });
          currentStep = 'complete';
          actions.updateState({});
        },
      }),
      el('div', {
        class: 'text-xs text-tertiary text-center',
      }, 'Saves baseline so CLI can fetch tokens'),
    ], 'var(--spacing-sm)'),
  ]);

  // Skip option
  const skipLink = el('div', { class: 'text-center mt-sm' });
  const skipBtn = Button({
    label: 'Skip and configure later',
    variant: 'ghost',
    size: 'sm',
    onClick: () => {
      currentStep = 'welcome'; // Reset for next time
      actions.navigate('home');
    },
  });
  skipLink.appendChild(skipBtn);
  footer.appendChild(skipLink);

  return PageLayout([content, footer]);
}

function buildCompleteStep(actions: RouterActions): HTMLElement {
  const content = ContentArea([]);

  // Success message
  const successSection = el('div', { class: 'hero' });

  const successIconWrapper = el('div', { class: 'success-icon-wrapper success-icon-wrapper--lg' });
  successIconWrapper.appendChild(Icon('check', 'xl'));
  successSection.appendChild(successIconWrapper);

  successSection.appendChild(el('div', { class: 'text-xl font-semibold mb-xs' }, 'Synced!'));
  successSection.appendChild(el('div', { class: 'text-sm text-secondary' }, 'Your variables are saved and ready for the CLI'));

  content.appendChild(successSection);

  // Next steps
  const nextStepsCard = Card({ padding: 'lg' });

  nextStepsCard.appendChild(el('div', { class: 'font-medium mb-md' }, 'NEXT STEP'));
  nextStepsCard.appendChild(el('div', { class: 'text-sm text-secondary mb-md' }, 'Run this command in your project:'));

  // Use CommandBox component
  nextStepsCard.appendChild(CommandBox({ command: 'npx synkio sync' }));

  content.appendChild(nextStepsCard);

  // Footer
  const footer = Footer([
    Button({
      label: 'DONE',
      variant: 'primary',
      fullWidth: true,
      onClick: () => {
        currentStep = 'welcome'; // Reset for next time
        actions.updateState({ isFirstTime: false });
        actions.navigate('home');
      },
    }),
  ]);

  return PageLayout([content, footer]);
}

// Export function to reset onboarding state
export function resetOnboarding() {
  currentStep = 'welcome';
  githubRepo = '';
}
