import { el, text } from '../helpers';
import { registerCSS } from '../../styles';
import css from './StatusIndicator.css';

registerCSS('status-indicator', css);

export type StatusType = 'success' | 'warning' | 'error' | 'neutral';

export interface StatusIndicatorProps {
  type: StatusType;
  label: string;
}

export function StatusIndicator(props: StatusIndicatorProps): HTMLSpanElement {
  const { type, label } = props;

  const indicator = el('span', { class: 'status-indicator' });
  indicator.appendChild(el('span', { class: `status-indicator__dot status-indicator__dot--${type}` }));
  indicator.appendChild(text(label));

  return indicator;
}
