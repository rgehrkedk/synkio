/**
 * Hero Component
 * Main hero section with animated logo, tagline, and CTAs
 */

import { Logo } from '../shared/Logo';
import { Button } from '../shared/Button';
import { CodeBlock } from '../shared/CodeBlock';
import styles from './Hero.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

export function Hero(): HTMLElement {
  const section = document.createElement('section');
  section.className = getStyle('hero');

  // Decorative enso circle - zen accent
  const enso = document.createElement('div');
  enso.className = getStyle('ensoDecor');
  section.appendChild(enso);

  const content = document.createElement('div');
  content.className = getStyle('content');

  // Small logo above tagline (mobile and context)
  const logoContainer = document.createElement('div');
  logoContainer.className = getStyle('logoContainer');
  logoContainer.appendChild(Logo({ size: 'hero', animated: true }));
  content.appendChild(logoContainer);

  // Text content
  const textContent = document.createElement('div');
  textContent.className = getStyle('textContent');

  // Tagline
  const tagline = document.createElement('h1');
  tagline.className = getStyle('tagline');
  tagline.innerHTML = `Design tokens shouldn't<br>cost <span class="${getStyle('taglineGradient')}">$75/seat</span>`;
  textContent.appendChild(tagline);

  // Subhead
  const subhead = document.createElement('p');
  subhead.className = getStyle('subhead');
  subhead.textContent = 'Sync Figma variables to code. Works with any plan.';
  textContent.appendChild(subhead);

  content.appendChild(textContent);

  // Install section
  const installSection = document.createElement('div');
  installSection.className = getStyle('installSection');

  const installLabel = document.createElement('span');
  installLabel.className = getStyle('installLabel');
  installLabel.textContent = 'Get started';
  installSection.appendChild(installLabel);

  const codeBlockWrapper = document.createElement('div');
  codeBlockWrapper.className = getStyle('codeBlockWrapper');
  codeBlockWrapper.appendChild(
    CodeBlock({ code: 'npm install synkio', language: 'bash' })
  );
  installSection.appendChild(codeBlockWrapper);

  content.appendChild(installSection);

  // CTA buttons
  const actions = document.createElement('div');
  actions.className = getStyle('actions');

  const pluginButton = Button({
    label: 'Install Plugin',
    variant: 'primary',
    size: 'lg',
    href: 'https://www.figma.com/community/plugin/synkio',
  });
  actions.appendChild(pluginButton);

  const docsButton = Button({
    label: 'Documentation',
    variant: 'secondary',
    size: 'lg',
    href: '/docs',
  });
  actions.appendChild(docsButton);

  content.appendChild(actions);

  section.appendChild(content);

  return section;
}

export default Hero;
