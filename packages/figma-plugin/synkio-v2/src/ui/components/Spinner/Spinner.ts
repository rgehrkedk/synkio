import { el } from '../helpers';
import { registerCSS } from '../../styles';
import css from './Spinner.css';

registerCSS('spinner', css);

export function Spinner(message?: string): HTMLDivElement {
  const spinner = el('div', { class: 'spinner' });
  spinner.appendChild(el('div', { class: 'spinner__icon' }));
  if (message) {
    spinner.appendChild(el('div', { class: 'spinner__message' }, message));
  }
  return spinner;
}
