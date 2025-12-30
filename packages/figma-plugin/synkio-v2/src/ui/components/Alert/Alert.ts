import { el } from '../helpers';
import { registerCSS } from '../../styles';
import { StatusIcon } from '../../icons';
import css from './Alert.css';

registerCSS('alert', css);

export interface AlertProps {
  type: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message: string;
}

export function Alert(props: AlertProps): HTMLDivElement {
  const { type, title, message } = props;

  const alert = el('div', { class: `alert alert--${type}` });

  const iconWrapper = el('span', { class: 'alert__icon' });
  iconWrapper.appendChild(StatusIcon(type, 'sm'));
  alert.appendChild(iconWrapper);

  const content = el('div', { class: 'alert__content' });
  if (title) {
    content.appendChild(el('span', { class: 'alert__title' }, title));
  }
  content.appendChild(el('span', { class: 'alert__message' }, message));
  alert.appendChild(content);

  return alert;
}
