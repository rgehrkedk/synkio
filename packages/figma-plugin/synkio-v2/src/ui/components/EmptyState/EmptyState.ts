import { el } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon } from '../../icons';
import type { IconName } from '../../icons';
import { Button } from '../Button/Button';
import css from './EmptyState.css';

registerCSS('empty-state', css);

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState(props: EmptyStateProps): HTMLDivElement {
  const { icon, title, description, action } = props;

  const empty = el('div', { class: 'empty-state' });

  if (icon) {
    const iconWrapper = el('div', { class: 'empty-state__icon' });
    iconWrapper.appendChild(Icon(icon, 'xl'));
    empty.appendChild(iconWrapper);
  }
  empty.appendChild(el('div', { class: 'empty-state__title' }, title));
  if (description) {
    empty.appendChild(el('div', { class: 'empty-state__description' }, description));
  }
  if (action) {
    empty.appendChild(Button({ label: action.label, onClick: action.onClick }));
  }

  return empty;
}
