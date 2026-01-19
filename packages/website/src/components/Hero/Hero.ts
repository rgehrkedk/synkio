/**
 * Hero Component
 * Centered stack layout with animated SYNKIO wordmark
 */

import { SynkioLogo } from '../shared/SynkioLogo';
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

  // Animated SYNKIO wordmark - the hero
  const logoContainer = document.createElement('div');
  logoContainer.className = getStyle('logoContainer');
  logoContainer.setAttribute('data-hero-logo', 'true');
  logoContainer.appendChild(SynkioLogo({
    animated: true,
    layout: 'inline',
    letterGaps: {
      S: '1em',
      Y: '1em',
      N: '2em',
      K: '1.5em',
      I: '1.5em',
    }
  }));
  content.appendChild(logoContainer);

  // Text content
  const textContent = document.createElement('div');
  textContent.className = getStyle('textContent');

  // Tagline - Bidirectional sync message
  const tagline = document.createElement('h1');
  tagline.className = getStyle('tagline');

  tagline.innerHTML = `
    <span class="${getStyle('taglineWord')}">Figma</span>
    <span class="${getStyle('taglineIcon')}">⇄</span>
    <span class="${getStyle('taglineWord')}">Code</span>
  `;
  textContent.appendChild(tagline);

  // Subhead
  const subhead = document.createElement('p');
  subhead.className = getStyle('subhead');
  subhead.textContent = "Two-way sync for Figma variables. No costs.";
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
