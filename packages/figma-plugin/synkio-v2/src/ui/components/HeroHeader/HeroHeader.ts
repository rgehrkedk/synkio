import { el } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon } from '../../icons';
import css from './HeroHeader.css';

registerCSS('hero-header', css);

export interface HeroHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
}

export function HeroHeader(props: HeroHeaderProps): HTMLElement {
  const { title, subtitle, showLogo = true } = props;

  const header = el('div', { class: 'hero-header' });

  if (showLogo) {
    const logoWrapper = el('div', { class: 'hero-header__logo' });
    logoWrapper.appendChild(Icon('sync', 'lg'));
    header.appendChild(logoWrapper);
  }

  header.appendChild(el('div', { class: 'hero-header__title' }, title));

  if (subtitle) {
    header.appendChild(el('div', { class: 'hero-header__subtitle' }, subtitle));
  }

  return header;
}
