// =============================================================================
// TabBadge Component - "X of 3" step indicator for onboarding
// =============================================================================

import { el } from '../helpers';

export interface TabBadgeProps {
  current: 1 | 2 | 3;
  total?: number;
}

export function TabBadge({ current, total = 3 }: TabBadgeProps): HTMLElement {
  const badge = el('div', { class: 'tab-badge' });
  badge.textContent = `${current} of ${total}`;
  return badge;
}
