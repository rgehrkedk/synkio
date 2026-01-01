import { el } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon } from '../../icons';
import css from './WelcomeFeature.css';

registerCSS('welcome-feature', css);

export interface WelcomeFeatureProps {
  title: string;
  description: string;
}

/**
 * Welcome Feature Card - Shows bi-directional sync visualization
 */
export function WelcomeFeature(props: WelcomeFeatureProps): HTMLElement {
  const { title, description } = props;

  const card = el('div', { class: 'welcome-feature' });

  // Flow visualization: Figma <-> Code
  const flow = el('div', { class: 'welcome-feature__flow' });

  // Figma endpoint
  const figmaEndpoint = el('div', { class: 'welcome-feature__endpoint' });
  const figmaIcon = el('div', { class: 'welcome-feature__endpoint-icon' });
  figmaIcon.appendChild(Icon('figma', 'sm'));
  figmaEndpoint.appendChild(figmaIcon);
  figmaEndpoint.appendChild(el('span', { class: 'welcome-feature__endpoint-label' }, 'Figma'));
  flow.appendChild(figmaEndpoint);

  // Animated arrows
  const arrows = el('div', { class: 'welcome-feature__arrows' });
  arrows.appendChild(el('span', { class: 'welcome-feature__arrow welcome-feature__arrow--right' }, '\u2192'));
  arrows.appendChild(el('span', { class: 'welcome-feature__arrow welcome-feature__arrow--left' }, '\u2190'));
  flow.appendChild(arrows);

  // Code endpoint
  const codeEndpoint = el('div', { class: 'welcome-feature__endpoint' });
  const codeIcon = el('div', { class: 'welcome-feature__endpoint-icon' });
  codeIcon.appendChild(Icon('code', 'sm'));
  codeEndpoint.appendChild(codeIcon);
  codeEndpoint.appendChild(el('span', { class: 'welcome-feature__endpoint-label' }, 'Code'));
  flow.appendChild(codeEndpoint);

  card.appendChild(flow);

  // Title and description
  card.appendChild(el('div', { class: 'welcome-feature__title' }, title));
  card.appendChild(el('div', { class: 'welcome-feature__description' }, description));

  return card;
}

export interface WelcomeLinksProps {
  onWebsiteClick?: () => void;
  onDocsClick?: () => void;
}

/**
 * Welcome Links - External links to website and docs
 */
export function WelcomeLinks(props: WelcomeLinksProps): HTMLElement {
  const { onWebsiteClick, onDocsClick } = props;

  const container = el('div', { class: 'welcome-links' });

  // Website link
  const websiteLink = el('a', {
    class: 'welcome-link',
    href: 'https://synkio.io',
    target: '_blank',
    rel: 'noopener noreferrer',
  });
  const globeIcon = el('span', { class: 'welcome-link__icon' });
  globeIcon.appendChild(Icon('globe', 'xs'));
  websiteLink.appendChild(globeIcon);
  websiteLink.appendChild(document.createTextNode('synkio.io'));

  if (onWebsiteClick) {
    websiteLink.addEventListener('click', (e) => {
      e.preventDefault();
      onWebsiteClick();
    });
  }

  container.appendChild(websiteLink);

  // Separator
  container.appendChild(el('span', { class: 'welcome-links__separator' }));

  // Docs link
  const docsLink = el('a', {
    class: 'welcome-link',
    href: 'https://synkio.io/docs',
    target: '_blank',
    rel: 'noopener noreferrer',
  });
  const bookIcon = el('span', { class: 'welcome-link__icon' });
  bookIcon.appendChild(Icon('book', 'xs'));
  docsLink.appendChild(bookIcon);
  docsLink.appendChild(document.createTextNode('Documentation'));

  if (onDocsClick) {
    docsLink.addEventListener('click', (e) => {
      e.preventDefault();
      onDocsClick();
    });
  }

  container.appendChild(docsLink);

  return container;
}
