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

  // Bidirectional sync indicator - below actions
  const syncIndicator = document.createElement('div');
  syncIndicator.className = getStyle('syncIndicator');
  syncIndicator.innerHTML = `
    <span class="${getStyle('syncLabel')}">Figma</span>
    <svg viewBox="0 0 100 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 12 L85 12" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
      <path d="M80 8 L88 12 L80 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 8 L12 12 L20 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="${getStyle('syncLabel')}">Code</span>
  `;
  content.appendChild(syncIndicator);

  section.appendChild(content);

  // Scroll indicator
  const scrollIndicator = createScrollIndicator();
  section.appendChild(scrollIndicator);

  return section;
}

function createScrollIndicator(): HTMLElement {
  const indicator = document.createElement('div');
  indicator.className = getStyle('scrollIndicator');

  const text = document.createElement('span');
  text.textContent = 'Scroll';
  indicator.appendChild(text);

  indicator.innerHTML += `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <polyline points="19 12 12 19 5 12"></polyline>
    </svg>
  `;

  // Click to scroll
  indicator.style.cursor = 'pointer';
  indicator.addEventListener('click', () => {
    const nextSection = document.querySelector('section:nth-of-type(2)');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  });

  return indicator;
}

export default Hero;
