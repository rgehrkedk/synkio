// =============================================================================
// AppFooter Component - Persistent footer with links
// =============================================================================

import { el } from '../helpers';
import { Icon } from '../../icons';

export interface AppFooterProps {
  version: string;
  onDocsClick: () => void;
  onFeedbackClick: () => void;
  onSupportClick: () => void;
  onDataClick: () => void;
}

export function AppFooter({
  version,
  onDocsClick,
  onFeedbackClick,
  onSupportClick,
  onDataClick,
}: AppFooterProps): HTMLElement {
  const footer = el('div', { class: 'app-footer' });

  // Left side links
  const leftLinks = el('div', { class: 'app-footer-links' });

  // Docs link
  const docsLink = createFooterLink('book', 'Docs', onDocsClick);
  leftLinks.appendChild(docsLink);

  // Data/Settings link
  const dataLink = createFooterLink('trash', 'Data', onDataClick);
  leftLinks.appendChild(dataLink);

  footer.appendChild(leftLinks);

  // Right side: Ko-fi, Feedback, Version
  const rightSide = el('div', { class: 'app-footer-right' });

  // Support link (Ko-fi)
  const supportLink = createFooterLink('kofi', 'Support', onSupportClick);
  rightSide.appendChild(supportLink);

  // Feedback link
  const feedbackLink = createFooterLink('message-circle', 'Feedback', onFeedbackClick);
  rightSide.appendChild(feedbackLink);

  // Version
  const versionEl = el('div', { class: 'app-footer-version' }, `v${version}`);
  rightSide.appendChild(versionEl);

  footer.appendChild(rightSide);

  return footer;
}

function createFooterLink(
  icon: 'book' | 'message-circle' | 'kofi' | 'trash',
  label: string,
  onClick: () => void
): HTMLElement {
  const link = el('button', {
    class: 'app-footer-link',
    title: label,
  });

  link.appendChild(Icon(icon, 'sm'));

  link.addEventListener('click', onClick);

  return link;
}
