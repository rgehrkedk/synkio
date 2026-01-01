import { el } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon } from '../../icons';
import type { IconName } from '../../icons';
import css from './FeatureCard.css';

registerCSS('feature-card', css);

export interface FeatureCardItem {
  icon?: IconName;
  label: string;
  sublabel?: string;
}

export interface FeatureCardProps {
  icon?: IconName;
  title: string;
  description?: string;
  items: FeatureCardItem[];
}

export function FeatureCard(props: FeatureCardProps): HTMLDivElement {
  const { icon, title, description, items } = props;

  const card = el('div', { class: 'feature-card' });

  // Header section
  const header = el('div', { class: 'feature-card__header' });

  if (icon) {
    const iconWrapper = el('div', { class: 'feature-card__icon' });
    iconWrapper.appendChild(Icon(icon, 'lg'));
    header.appendChild(iconWrapper);
  }

  const titleEl = el('div', { class: 'feature-card__title' }, title);
  header.appendChild(titleEl);

  card.appendChild(header);

  // Description
  if (description) {
    const descEl = el('div', { class: 'feature-card__description' }, description);
    card.appendChild(descEl);
  }

  // Items list
  if (items.length > 0) {
    const itemsList = el('div', { class: 'feature-card__items' });

    for (const item of items) {
      const itemEl = el('div', { class: 'feature-card__item' });

      if (item.icon) {
        const itemIconWrapper = el('span', { class: 'feature-card__item-icon' });
        itemIconWrapper.appendChild(Icon(item.icon, 'sm'));
        itemEl.appendChild(itemIconWrapper);
      }

      const itemContent = el('div', { class: 'feature-card__item-content' });
      itemContent.appendChild(el('span', { class: 'feature-card__item-label' }, item.label));

      if (item.sublabel) {
        itemContent.appendChild(el('span', { class: 'feature-card__item-sublabel' }, item.sublabel));
      }

      itemEl.appendChild(itemContent);
      itemsList.appendChild(itemEl);
    }

    card.appendChild(itemsList);
  }

  return card;
}
