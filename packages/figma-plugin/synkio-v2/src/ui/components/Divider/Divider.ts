import { el } from '../helpers';
import { registerCSS } from '../../styles';
import css from './Divider.css';

registerCSS('divider', css);

export interface DividerProps {
  text?: string;
  variant?: 'solid' | 'dashed';
}

export function Divider(props: DividerProps = {}): HTMLDivElement {
  const { text, variant = 'solid' } = props;

  if (text) {
    const divider = el('div', { class: 'divider-with-text' });
    divider.appendChild(el('div', { class: `divider-with-text__line divider-with-text__line--${variant}` }));
    divider.appendChild(el('span', { class: 'divider-with-text__text' }, text));
    divider.appendChild(el('div', { class: `divider-with-text__line divider-with-text__line--${variant}` }));
    return divider;
  }

  return el('hr', { class: `divider divider--${variant}` }) as unknown as HTMLDivElement;
}
