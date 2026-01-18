/**
 * Hero Component
 * Main hero section with animated logo, tagline, and CTAs
 */

import { Logo } from '../shared/Logo';
import { LetterLogo } from '../shared/LetterLogo';
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

  // Logo (left column)
  const logoContainer = document.createElement('div');
  logoContainer.className = getStyle('logoContainer');
  logoContainer.appendChild(Logo({ size: 'hero', animated: true }));

  // Letter logo (Monoton wordmark) below the main logo
  const letterLogoContainer = document.createElement('div');
  letterLogoContainer.className = getStyle('letterLogoContainer');
  letterLogoContainer.setAttribute('data-hero-logo', 'true');
  letterLogoContainer.appendChild(LetterLogo({ animated: true }));
  logoContainer.appendChild(letterLogoContainer);

  content.appendChild(logoContainer);

  // Right column - contains all text content, install section, and CTAs
  const rightColumn = document.createElement('div');
  rightColumn.className = getStyle('rightColumn');

  // Text content
  const textContent = document.createElement('div');
  textContent.className = getStyle('textContent');

  // Tagline - Clear value proposition
  const tagline = document.createElement('h1');
  tagline.className = getStyle('tagline');
  tagline.innerHTML = `Sync Figma variables<br>to code`;
  textContent.appendChild(tagline);

  // Subhead
  const subhead = document.createElement('p');
  subhead.className = getStyle('subhead');
  subhead.textContent = "Export design tokens with one command. Works with any Figma plan—no Enterprise required.";
  textContent.appendChild(subhead);

  rightColumn.appendChild(textContent);

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

  rightColumn.appendChild(installSection);

  // CTA buttons - Primary action + text link
  const actions = document.createElement('div');
  actions.className = getStyle('actions');

  const pluginButton = Button({
    label: 'Get Started',
    variant: 'primary',
    size: 'lg',
    href: 'https://www.figma.com/community/plugin/synkio',
  });
  actions.appendChild(pluginButton);

  // Documentation as text link (demoted from button)
  const docsLink = document.createElement('a');
  docsLink.className = getStyle('docsLink');
  docsLink.href = '/docs';
  docsLink.textContent = 'Read the docs';
  const arrow = document.createElement('span');
  arrow.className = getStyle('docsLinkArrow');
  arrow.innerHTML = '→';
  docsLink.appendChild(arrow);
  actions.appendChild(docsLink);

  rightColumn.appendChild(actions);

  content.appendChild(rightColumn);

  section.appendChild(content);

  return section;
}

export default Hero;
