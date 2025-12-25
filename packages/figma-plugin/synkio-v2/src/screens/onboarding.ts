// =============================================================================
// Onboarding Screen - First-time setup
// =============================================================================

import { PluginState, CollectionInfo } from '../lib/types';
import { RouterActions } from '../ui/router';
import {
  el,
  Button,
  Card,
  Checkbox,
  Input,
  Spinner,
  Icon,
} from '../ui/components';
import {
  createPageLayout,
  createContentArea,
  createColumn,
  createFooter,
} from '../ui/router';

type OnboardingStep = 'welcome' | 'scanning' | 'setup' | 'complete';

let currentStep: OnboardingStep = 'welcome';
let githubRepo = '';

export function OnboardingScreen(state: PluginState, actions: RouterActions): HTMLElement {
  const { isLoading, collections } = state;

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
  const content = createContentArea([]);

  // Logo and title
  const hero = el('div', {
    style: 'text-align: center; padding: var(--spacing-2xl) 0;',
  });

  const logoWrapper = el('div', {
    style: 'display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: var(--color-primary); border-radius: 16px; margin-bottom: var(--spacing-md); color: white;',
  });
  logoWrapper.appendChild(Icon('sync', 'xl'));
  hero.appendChild(logoWrapper);

  hero.appendChild(el('div', {
    style: 'font-size: var(--font-size-2xl); font-weight: 600; margin-bottom: var(--spacing-xs);',
  }, 'Welcome to Synkio'));

  hero.appendChild(el('div', {
    style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary);',
  }, 'Sync Figma variables with your codebase'));

  content.appendChild(hero);

  // Workflow explanation
  const workflowCard = Card({ padding: 'lg' });

  // Sync to Code
  const syncSection = el('div', { style: 'margin-bottom: var(--spacing-lg);' });
  syncSection.appendChild(el('div', {
    style: 'font-weight: 600; margin-bottom: var(--spacing-xs);',
  }, '1. SYNC TO CODE'));
  syncSection.appendChild(el('div', {
    style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);',
  }, 'Create variables in Figma, then sync them to your code as design tokens.'));
  syncSection.appendChild(el('div', {
    style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); font-family: "SF Mono", monospace;',
  }, 'Figma \u2192 Plugin \u2192 CLI \u2192 Token files'));

  // Apply from Code
  const applySection = el('div');
  applySection.appendChild(el('div', {
    style: 'font-weight: 600; margin-bottom: var(--spacing-xs);',
  }, '2. APPLY FROM CODE'));
  applySection.appendChild(el('div', {
    style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);',
  }, 'Import tokens from code and create or update Figma variables.'));
  applySection.appendChild(el('div', {
    style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); font-family: "SF Mono", monospace;',
  }, 'Token files \u2192 CLI \u2192 Plugin \u2192 Figma'));

  workflowCard.appendChild(syncSection);
  workflowCard.appendChild(applySection);
  content.appendChild(workflowCard);

  // Footer with Get Started button
  const footer = createFooter([
    createColumn([
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
        style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); text-align: center;',
      }, 'Scan your file for collections'),
    ], 'var(--spacing-sm)'),
  ]);

  // Link to docs
  const docsLink = el('div', {
    style: 'text-align: center; padding: var(--spacing-md) 0; font-size: var(--font-size-xs); color: var(--color-text-tertiary);',
  }, 'Learn more at github.com/synkio/synkio');
  content.appendChild(docsLink);

  return createPageLayout([content, footer]);
}

function buildScanningStep(): HTMLElement {
  const content = createContentArea([
    Spinner('Scanning your file for collections...'),
  ]);

  return createPageLayout([content]);
}

function buildSetupStep(state: PluginState, actions: RouterActions): HTMLElement {
  const { collections, styleTypes } = state;

  const content = createContentArea([]);

  // Success message
  const successBanner = el('div', {
    style: 'text-align: center; padding: var(--spacing-lg) 0;',
  });
  const checkWrapper = el('div', {
    style: 'display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: color-mix(in srgb, var(--color-success) 15%, transparent); border-radius: 50%; margin-bottom: var(--spacing-sm); color: var(--color-success);',
  });
  checkWrapper.appendChild(Icon('check', 'lg'));
  successBanner.appendChild(checkWrapper);
  successBanner.appendChild(el('div', {
    style: 'font-size: var(--font-size-lg); font-weight: 500;',
  }, 'File scanned!'));
  content.appendChild(successBanner);

  // Collections found
  const collectionsCard = Card({ padding: 'md' });

  const totalVars = collections.reduce((sum, c) => sum + c.variableCount, 0);
  const totalStyles = styleTypes.reduce((sum, s) => sum + s.count, 0);

  collectionsCard.appendChild(el('div', {
    style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-md);',
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
  githubCard.appendChild(el('div', {
    style: 'font-weight: 500; margin-bottom: var(--spacing-xs);',
  }, 'OPTIONAL: Connect to GitHub'));
  githubCard.appendChild(el('div', {
    style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--spacing-md);',
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
  const footer = createFooter([
    createColumn([
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
        style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); text-align: center;',
      }, 'Saves baseline so CLI can fetch tokens'),
    ], 'var(--spacing-sm)'),
  ]);

  // Skip option
  const skipLink = el('div', {
    style: 'text-align: center; margin-top: var(--spacing-sm);',
  });
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

  return createPageLayout([content, footer]);
}

function buildCompleteStep(actions: RouterActions): HTMLElement {
  const content = createContentArea([]);

  // Success message
  const successSection = el('div', {
    style: 'text-align: center; padding: var(--spacing-2xl) 0;',
  });

  const successIconWrapper = el('div', {
    style: 'display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: color-mix(in srgb, var(--color-success) 15%, transparent); border-radius: 50%; margin-bottom: var(--spacing-md); color: var(--color-success);',
  });
  successIconWrapper.appendChild(Icon('check', 'xl'));
  successSection.appendChild(successIconWrapper);

  successSection.appendChild(el('div', {
    style: 'font-size: var(--font-size-xl); font-weight: 600; margin-bottom: var(--spacing-xs);',
  }, 'Synced!'));

  successSection.appendChild(el('div', {
    style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary);',
  }, 'Your variables are saved and ready for the CLI'));

  content.appendChild(successSection);

  // Next steps
  const nextStepsCard = Card({ padding: 'lg' });

  nextStepsCard.appendChild(el('div', {
    style: 'font-weight: 500; margin-bottom: var(--spacing-md);',
  }, 'NEXT STEP'));

  nextStepsCard.appendChild(el('div', {
    style: 'font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-md);',
  }, 'Run this command in your project:'));

  // Command box
  const commandBox = el('div', {
    style: `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: "SF Mono", Menlo, monospace;
      font-size: var(--font-size-sm);
    `,
  });

  commandBox.appendChild(el('span', {}, 'npx synkio sync'));

  const copyBtn = el('button', {
    style: 'background: none; border: none; padding: 6px; cursor: pointer; border-radius: var(--radius-sm); color: var(--color-text-secondary); display: flex; align-items: center; justify-content: center;',
  });
  copyBtn.appendChild(Icon('copy', 'sm'));
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText('npx synkio sync');
    // Visual feedback
    copyBtn.innerHTML = '';
    copyBtn.appendChild(Icon('check', 'sm'));
    copyBtn.style.color = 'var(--color-success)';
    setTimeout(() => {
      copyBtn.innerHTML = '';
      copyBtn.appendChild(Icon('copy', 'sm'));
      copyBtn.style.color = 'var(--color-text-secondary)';
    }, 1500);
  });
  copyBtn.addEventListener('mouseenter', () => {
    copyBtn.style.background = 'var(--color-bg-tertiary)';
  });
  copyBtn.addEventListener('mouseleave', () => {
    copyBtn.style.background = 'none';
  });
  commandBox.appendChild(copyBtn);

  nextStepsCard.appendChild(commandBox);

  content.appendChild(nextStepsCard);

  // Footer
  const footer = createFooter([
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

  return createPageLayout([content, footer]);
}

// Export function to reset onboarding state
export function resetOnboarding() {
  currentStep = 'welcome';
  githubRepo = '';
}
