/**
 * FeatureCard Component
 * Displays a single feature with icon, title, and description
 */

import { icons } from '../shared/icons';

// Re-export IconName type from shared
type IconName = keyof typeof icons;

// Helper to create icon element (matching the expected signature)
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
import styles from './Features.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

export interface FeatureCardProps {
  icon: IconName;
  title: string;
  description: string;
  link?: string;
}

export function FeatureCard(props: FeatureCardProps): HTMLElement {
  const { icon, title, description, link } = props;

  const card = document.createElement('div');
  card.className = getStyle('card');

  // Icon container
  const iconContainer = document.createElement('div');
  iconContainer.className = getStyle('iconContainer');
  const iconElement = createIconElement(icon, 24);
  iconElement.className = getStyle('icon');
  iconContainer.appendChild(iconElement);

  // Title
  const titleEl = document.createElement('h3');
  titleEl.className = getStyle('cardTitle');
  titleEl.textContent = title;

  // Description
  const descEl = document.createElement('p');
  descEl.className = getStyle('cardDescription');
  descEl.textContent = description;

  // Read more link (revealed on hover)
  const linkEl = document.createElement('a');
  linkEl.className = getStyle('cardLink');
  linkEl.href = link || '#';
  linkEl.textContent = 'Read more';
  // Add arrow icon
  const arrow = document.createElement('span');
  arrow.className = getStyle('cardLinkArrow');
  arrow.innerHTML = '→';
  linkEl.appendChild(arrow);

  card.appendChild(iconContainer);
  card.appendChild(titleEl);
  card.appendChild(descEl);
  card.appendChild(linkEl);

  return card;
}
