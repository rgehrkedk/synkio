/**
 * ProblemSolution Component
 * Two-column comparison showing the problem and solution
 */

import { createIcon } from '../shared/icons';
import styles from './ProblemSolution.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

interface CardData {
  type: 'problem' | 'solution';
  label: string;
  icon: 'lock' | 'unlock';
  title: string;
  badge: string;
  description: string;
}

const problemData: CardData = {
  type: 'problem',
  label: 'The Problem',
  icon: 'lock',
  title: 'Figma Variables REST API',
  badge: '$75/user/month',
  description: 'Accessing Figma design variables via API requires an Enterprise plan, pricing out most teams and individuals.',
};

const solutionData: CardData = {
  type: 'solution',
  label: 'The Solution',
  icon: 'unlock',
  title: 'Synkio Plugin + CLI',
  badge: 'Free',
  description: 'Works with any Figma plan. The plugin stores variable data in the file, and the CLI fetches it via the standard API.',
};

export function ProblemSolution(): HTMLElement {
  const section = document.createElement('section');
  section.className = getStyle('section');

  const container = document.createElement('div');
  container.className = getStyle('container');

  // Section header
  const header = document.createElement('div');
  header.className = getStyle('header');

  const title = document.createElement('h2');
  title.className = getStyle('title');
  title.textContent = 'Design tokens for everyone';
  header.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = getStyle('subtitle');
  subtitle.textContent = 'Synkio bridges the gap between Figma and code without the Enterprise price tag.';
  header.appendChild(subtitle);

  container.appendChild(header);

  // Comparison grid
  const comparison = document.createElement('div');
  comparison.className = getStyle('comparison');

  // Problem card
  comparison.appendChild(createCard(problemData));

  // Arrow connector
  const arrow = document.createElement('div');
  arrow.className = getStyle('arrow');
  arrow.appendChild(createIcon('arrowRight'));
  comparison.appendChild(arrow);

  // Solution card
  comparison.appendChild(createCard(solutionData));

  container.appendChild(comparison);
  section.appendChild(container);

  return section;
}

function createCard(data: CardData): HTMLElement {
  const card = document.createElement('div');
  card.className = [getStyle('card'), data.type === 'problem' ? getStyle('problemCard') : getStyle('solutionCard')].filter(Boolean).join(' ');

  // Card header with icon and label
  const cardHeader = document.createElement('div');
  cardHeader.className = getStyle('cardHeader');

  const iconWrapper = document.createElement('div');
  iconWrapper.className = getStyle('cardIcon');
  iconWrapper.appendChild(createIcon(data.icon));
  cardHeader.appendChild(iconWrapper);

  const label = document.createElement('span');
  label.className = getStyle('cardLabel');
  label.textContent = data.label;
  cardHeader.appendChild(label);

  card.appendChild(cardHeader);

  // Card body
  const cardBody = document.createElement('div');
  cardBody.className = getStyle('cardBody');

  const title = document.createElement('h3');
  title.className = getStyle('cardTitle');
  title.textContent = data.title;
  cardBody.appendChild(title);

  const badge = document.createElement('span');
  badge.className = getStyle('badge');
  badge.textContent = data.badge;
  cardBody.appendChild(badge);

  const description = document.createElement('p');
  description.className = getStyle('cardDescription');
  description.textContent = data.description;
  cardBody.appendChild(description);

  card.appendChild(cardBody);

  return card;
}

export default ProblemSolution;
