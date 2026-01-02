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
    title: 'W3C DTCG',
    description: 'Standard format. Works with Style Dictionary and friends.',
  },
  {
    id: 'diffing',
    icon: 'sync' as IconName,
    title: 'Smart diffing',
    description: 'Renames don\'t break things. We track by ID, not name.',
  },
  {
    id: 'css',
    icon: 'terminal' as IconName,
    title: 'CSS output',
    description: 'Custom properties. Utility classes. Ready to use.',
  },
  {
    id: 'modes',
    icon: 'palette' as IconName,
    title: 'Modes',
    description: 'Light, dark, brand variants. All supported.',
  },
  {
    id: 'split',
    icon: 'grid' as IconName,
    title: 'Flexible output',
    description: 'Split by collection, mode, or group. Your call.',
  },
  {
    id: 'styles',
    icon: 'brush' as IconName,
    title: 'Styles too',
    description: 'Paint, text, effect styles. Not just variables.',
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
  title.textContent = 'What you get';

  const subtitle = document.createElement('p');
  subtitle.className = getStyle('subtitle');
  subtitle.textContent = 'No surprises. Just the essentials.';

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
