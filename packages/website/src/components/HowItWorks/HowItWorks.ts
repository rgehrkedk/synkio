/**
 * HowItWorks Component
 * Three-step flow showing the Synkio workflow
 */

import { createIcon, icons } from '../shared/icons';
import styles from './HowItWorks.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

interface StepData {
  number: number;
  icon: keyof typeof icons;
  title: string;
  description: string;
  code?: string;
}

const steps: StepData[] = [
  {
    number: 1,
    icon: 'figma',
    title: 'Sync',
    description: 'Run the plugin in Figma. Variables get stored in the file.',
  },
  {
    number: 2,
    icon: 'download',
    title: 'Pull',
    description: 'Fetch to your project.',
    code: 'synkio pull',
  },
  {
    number: 3,
    icon: 'code',
    title: 'Build',
    description: 'Generate tokens and CSS.',
    code: 'synkio build',
  },
];

export function HowItWorks(): HTMLElement {
  const section = document.createElement('section');
  section.className = getStyle('section');

  const container = document.createElement('div');
  container.className = getStyle('container');

  // Section header
  const header = document.createElement('div');
  header.className = getStyle('header');

  const title = document.createElement('h2');
  title.className = getStyle('title');
  title.textContent = 'Three commands';
  header.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = getStyle('subtitle');
  subtitle.textContent = 'That\'s the whole workflow.';
  header.appendChild(subtitle);

  container.appendChild(header);

  // Steps grid
  const stepsContainer = document.createElement('div');
  stepsContainer.className = getStyle('steps');

  steps.forEach((stepData) => {
    stepsContainer.appendChild(createStep(stepData));
  });

  container.appendChild(stepsContainer);
  section.appendChild(container);

  return section;
}

function createStep(data: StepData): HTMLElement {
  const step = document.createElement('div');
  step.className = getStyle('step');

  // Step number badge
  const stepNumber = document.createElement('div');
  stepNumber.className = getStyle('stepNumber');
  stepNumber.textContent = data.number.toString();
  step.appendChild(stepNumber);

  // Icon wrapper
  const iconWrapper = document.createElement('div');
  iconWrapper.className = getStyle('stepIconWrapper');
  iconWrapper.appendChild(createIcon(data.icon));
  step.appendChild(iconWrapper);

  // Content
  const content = document.createElement('div');
  content.className = getStyle('stepContent');

  const title = document.createElement('h3');
  title.className = getStyle('stepTitle');
  title.textContent = data.title;
  content.appendChild(title);

  const description = document.createElement('p');
  description.className = getStyle('stepDescription');

  if (data.code) {
    // Split description and add code element
    const textParts = data.description.split('.');
    description.textContent = textParts[0] + '.';

    const codeSpan = document.createElement('code');
    codeSpan.className = getStyle('stepCode');
    codeSpan.textContent = data.code;

    // Create a wrapper for description with code
    const descWrapper = document.createElement('div');
    descWrapper.style.cssText = 'display: flex; flex-direction: column; gap: var(--spacing-sm); align-items: inherit;';
    descWrapper.appendChild(description);
    descWrapper.appendChild(codeSpan);
    content.appendChild(descWrapper);
  } else {
    description.textContent = data.description;
    content.appendChild(description);
  }

  step.appendChild(content);

  return step;
}

export default HowItWorks;
