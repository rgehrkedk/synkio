/**
 * Footer Component
 * Simple footer with logo, license, and social links
 */

import { icons } from '../shared/icons';

type IconName = keyof typeof icons;

// Helper to create icon element
function createIconElement(name: IconName, size: number = 24): HTMLElement {
  const span = document.createElement('span');
  span.className = 'icon';
  span.innerHTML = icons[name];
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  span.style.justifyContent = 'center';
  if (size !== 24) {
    const svg = span.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
    }
  }
  return span;
}
import styles from './Footer.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

interface SocialLink {
  icon: IconName;
  href: string;
  label: string;
}

const socialLinks: SocialLink[] = [
  {
    icon: 'github',
    href: 'https://github.com/rgehrkedk/synkio',
    label: 'GitHub',
  },
  {
    icon: 'npm',
    href: 'https://www.npmjs.com/package/synkio',
    label: 'npm',
  },
  {
    icon: 'coffee',
    href: 'https://ko-fi.com/rgehrkedk',
    label: 'Ko-fi',
  },
];

export function Footer(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = getStyle('footer');

  const container = document.createElement('div');
  container.className = getStyle('container');

  // Left side - Logo and license
  const left = document.createElement('div');
  left.className = getStyle('left');

  const logo = document.createElement('span');
  logo.className = getStyle('logo');
  logo.textContent = 'synkio';

  const separator = document.createElement('span');
  separator.className = getStyle('separator');
  separator.textContent = '/';

  const license = document.createElement('span');
  license.className = getStyle('license');
  license.textContent = 'MIT License';

  left.appendChild(logo);
  left.appendChild(separator);
  left.appendChild(license);

  // Right side - Social links and credit
  const right = document.createElement('div');
  right.className = getStyle('right');

  const socialNav = document.createElement('nav');
  socialNav.className = getStyle('socialNav');
  socialNav.setAttribute('aria-label', 'Social links');

  socialLinks.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.className = getStyle('socialLink');
    anchor.href = link.href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('aria-label', link.label);

    const icon = createIconElement(link.icon, 20);
    anchor.appendChild(icon);

    socialNav.appendChild(anchor);
  });

  const credit = document.createElement('span');
  credit.className = getStyle('credit');
  credit.textContent = 'Built by ';

  const authorLink = document.createElement('a');
  authorLink.className = getStyle('authorLink');
  authorLink.href = 'https://github.com/rgehrkedk';
  authorLink.target = '_blank';
  authorLink.rel = 'noopener noreferrer';
  authorLink.textContent = '@rgehrkedk';

  credit.appendChild(authorLink);

  right.appendChild(socialNav);
  right.appendChild(credit);

  container.appendChild(left);
  container.appendChild(right);
  footer.appendChild(container);

  return footer;
}
