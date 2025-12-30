import { el, text } from '../helpers';
import { registerCSS } from '../../styles';
import css from './Card.css';

registerCSS('card', css);

export interface CardProps {
  children?: (Node | string)[];
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onClick?: () => void;
}

export function Card(props: CardProps): HTMLDivElement {
  const { children = [], padding = 'md', clickable = false, onClick } = props;

  const classes = [
    'card',
    `card--pad-${padding}`,
    clickable ? 'card--clickable' : '',
  ].filter(Boolean).join(' ');

  const card = el('div', { class: classes });

  for (const child of children) {
    if (typeof child === 'string') {
      card.appendChild(text(child));
    } else {
      card.appendChild(child);
    }
  }

  if (onClick) {
    card.addEventListener('click', onClick);
  }

  return card;
}
