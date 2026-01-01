import { el } from '../helpers';
import { registerCSS } from '../../styles';
import css from './TwoColumnLayout.css';

registerCSS('two-column-layout', css);

export interface TwoColumnLayoutProps {
  left: HTMLElement;
  right: HTMLElement;
  gap?: string;
}

export function TwoColumnLayout(props: TwoColumnLayoutProps): HTMLElement {
  const { left, right, gap } = props;

  const container = el('div', { class: 'two-column' });
  if (gap) {
    container.style.gap = gap;
  }

  const leftCol = el('div', { class: 'two-column__col' });
  leftCol.appendChild(left);
  container.appendChild(leftCol);

  const rightCol = el('div', { class: 'two-column__col' });
  rightCol.appendChild(right);
  container.appendChild(rightCol);

  return container;
}
