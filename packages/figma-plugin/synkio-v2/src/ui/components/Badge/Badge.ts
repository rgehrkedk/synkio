import { el } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon, IconName } from '../../icons';
import css from './Badge.css';

registerCSS('badge', css);

export interface BadgeProps {
  variant: 'sync' | 'apply' | 'success' | 'warning' | 'error';
  icon?: IconName;
  label: string;
}

export function Badge(props: BadgeProps): HTMLSpanElement {
  const { variant, icon, label } = props;
  const badge = el('span', { class: `badge badge--${variant}` });
  if (icon) badge.appendChild(Icon(icon, 'xs'));
  badge.appendChild(el('span', {}, label));
  return badge;
}
