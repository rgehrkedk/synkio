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
    // Container for logo + title side by side
    const brandGroup = el('div', { class: 'hero-header__brand' });

    const logoWrapper = el('div', { class: 'hero-header__logo' });

    // Add SVG gradient definition for colored strokes (works in dark/light mode)
    const gradientSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    gradientSvg.setAttribute('width', '0');
    gradientSvg.setAttribute('height', '0');
    gradientSvg.style.position = 'absolute';
    gradientSvg.innerHTML = `
      <defs>
        <linearGradient id="synkio-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#10b981"/>
          <stop offset="50%" style="stop-color:#14b8a6"/>
          <stop offset="100%" style="stop-color:#06b6d4"/>
        </linearGradient>
      </defs>
    `;
    logoWrapper.appendChild(gradientSvg);
    logoWrapper.appendChild(Icon('synkio-logo', 'xxl'));

    brandGroup.appendChild(logoWrapper);

    // Create animated "YNKIO" text with individual letter spans
    const titleEl = el('div', { class: 'hero-header__title' });
    const letters = 'YNKIO';
    letters.split('').forEach((letter, index) => {
      const span = el('span', { class: 'hero-header__letter' });
      span.textContent = letter;
      span.style.animationDelay = `${index * 0.5}s`;
      titleEl.appendChild(span);
    });
    brandGroup.appendChild(titleEl);

    header.appendChild(brandGroup);
  } else {
    header.appendChild(el('div', { class: 'hero-header__title' }, title));
  }

  if (subtitle) {
    header.appendChild(el('div', { class: 'hero-header__subtitle' }, subtitle));
  }

  return header;
}
