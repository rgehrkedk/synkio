/**
 * Features Component
 * Grid of feature cards showcasing Synkio capabilities
 */

import { icons } from '../shared/icons';

type IconName = keyof typeof icons;
import { FeatureCard, FeatureCardProps } from './FeatureCard';
import styles from './Features.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

interface Feature extends FeatureCardProps {
  id: string;
}

const features: Feature[] = [
  {
    id: 'dtcg',
    icon: 'code' as IconName,
    title: 'W3C DTCG Format',
    description:
      'Industry-standard token format. Works with Style Dictionary, Tokens Studio, and more.',
  },
  {
    id: 'diffing',
    icon: 'sync' as IconName,
    title: 'ID-Based Diffing',
    description:
      "Renames don't break. Smart change detection using Figma's permanent variable IDs.",
  },
  {
    id: 'css',
    icon: 'terminal' as IconName,
    title: 'CSS Generation',
    description:
      'Auto-generate CSS custom properties and utility classes from your tokens.',
  },
  {
    id: 'modes',
    icon: 'palette' as IconName,
    title: 'Modes & Themes',
    description:
      'Full support for light/dark modes, brand variants, and responsive breakpoints.',
  },
  {
    id: 'split',
    icon: 'grid' as IconName,
    title: 'Split Strategies',
    description:
      'Split by collection, mode, or group. Organize tokens however your codebase needs.',
  },
  {
    id: 'styles',
    icon: 'brush' as IconName,
    title: 'Style Support',
    description:
      'Sync Figma paint, text, and effect styles alongside your variables.',
  },
];

export function Features(): HTMLElement {
  const section = document.createElement('section');
  section.className = getStyle('section');
  section.id = 'features';

  // Container
  const container = document.createElement('div');
  container.className = getStyle('container');

  // Section header
  const header = document.createElement('div');
  header.className = getStyle('header');

  const title = document.createElement('h2');
  title.className = getStyle('title');
  title.textContent = 'Built for Design Systems';

  const subtitle = document.createElement('p');
  subtitle.className = getStyle('subtitle');
  subtitle.textContent =
    'Everything you need to keep design and code in sync, without the enterprise price tag.';

  header.appendChild(title);
  header.appendChild(subtitle);

  // Feature grid
  const grid = document.createElement('div');
  grid.className = getStyle('grid');

  features.forEach((feature) => {
    const card = FeatureCard(feature);
    grid.appendChild(card);
  });

  container.appendChild(header);
  container.appendChild(grid);
  section.appendChild(container);

  return section;
}
