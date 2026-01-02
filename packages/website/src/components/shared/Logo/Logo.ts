// =============================================================================
// Logo Component
// Synkio brand logo with animated S icon and YNKIO text
// =============================================================================

import styles from './Logo.module.css';

// Helper to safely get class names from CSS modules
const cx = (...classes: (string | undefined | false)[]): string =>
  classes.filter(Boolean).join(' ');

const getStyle = (key: string): string => (styles && styles[key]) || '';

export type LogoColor = 'brand' | 'white' | 'dark' | 'muted' | 'neutral';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  color?: LogoColor;
  animated?: boolean;
  showText?: boolean;
}

// Color configuration for logo variants
const colorConfig: Record<LogoColor, { gradient: boolean; stops?: { offset: string; color: string }[]; solidColor?: string; textColor: string }> = {
  brand: {
    gradient: true,
    stops: [
      { offset: '0%', color: 'var(--color-brand-emerald, #10b981)' },
      { offset: '50%', color: 'var(--color-brand-teal, #14b8a6)' },
      { offset: '100%', color: 'var(--color-brand-cyan, #06b6d4)' },
    ],
    textColor: 'var(--text-primary)',
  },
  white: {
    gradient: false,
    solidColor: '#ffffff',
    textColor: '#ffffff',
  },
  dark: {
    gradient: false,
    solidColor: 'var(--text-primary, #fafafa)',
    textColor: 'var(--text-primary, #fafafa)',
  },
  muted: {
    gradient: false,
    solidColor: 'var(--text-secondary, #a3a3a3)',
    textColor: 'var(--text-secondary, #a3a3a3)',
  },
  neutral: {
    gradient: false,
    solidColor: 'var(--text-primary)',
    textColor: 'var(--text-primary)',
  },
};

// Size configuration for logo variants
const sizeConfig = {
  sm: { icon: 24, fontSize: 16, letterSpacing: '1px', strokeWidth: 3.2 },
  md: { icon: 32, fontSize: 20, letterSpacing: '1.5px', strokeWidth: 2 },
  lg: { icon: 48, fontSize: 32, letterSpacing: '2px', strokeWidth: 2.5 },
  xl: { icon: 64, fontSize: 42, letterSpacing: '3px', strokeWidth: 2.5 },
  hero: { icon: 80, fontSize: 64, letterSpacing: '6px', strokeWidth: 2.5 },
};

// Synkio logo SVG path (S shape)
const synkioLogoPath = `
  <path d="M2.80299 10.9137C1.84128 6.20565 5.18636 1.70718 9.972 1.27283L12.9774 1.00006"/>
  <path d="M20.8616 13.824C21.8233 18.5321 18.4783 23.0306 13.6926 23.4649L10.6872 23.7377"/>
  <path d="M20.517 1.53824L20.3077 5.53276C20.2788 6.08429 19.8082 6.50796 19.2567 6.47905L14.2635 6.21737"/>
  <path d="M3.14763 23.1995L3.35697 19.205C3.38588 18.6535 3.85641 18.2298 4.40794 18.2587L9.40109 18.5204"/>
`;

export function Logo(props: LogoProps): HTMLElement {
  const { size = 'md', color = 'brand', animated = true, showText = true } = props;

  const sizeConf = sizeConfig[size];
  const colorConf = colorConfig[color];

  const container = document.createElement('div');
  container.className = cx(
    getStyle('logo'),
    getStyle(`logo--${size}`),
    getStyle(`logo--${color}`),
    animated && getStyle('logo--animated')
  );

  // Create SVG gradient definition (needs to be in the DOM)
  const gradientId = `synkio-gradient-${Math.random().toString(36).substr(2, 9)}`;

  // Logo icon container
  const iconContainer = document.createElement('div');
  iconContainer.className = getStyle('logo__icon');

  // Create SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(sizeConf.icon));
  svg.setAttribute('height', String(Math.round(sizeConf.icon * 26 / 24))); // Maintain aspect ratio (24x26)
  svg.setAttribute('viewBox', '0 0 24 26');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke-width', String(sizeConf.strokeWidth));
  svg.setAttribute('stroke-linecap', 'round');
  const svgClass = getStyle('logo__svg');
  if (svgClass) svg.classList.add(svgClass);

  // Set stroke based on color config
  if (colorConf.gradient && colorConf.stops) {
    svg.setAttribute('stroke', `url(#${gradientId})`);
    const gradientStops = colorConf.stops.map(s =>
      `<stop offset="${s.offset}" stop-color="${s.color}" />`
    ).join('\n        ');
    svg.innerHTML = `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        ${gradientStops}
      </linearGradient>
    </defs>
    ${synkioLogoPath}
  `;
  } else {
    svg.setAttribute('stroke', colorConf.solidColor!);
    svg.innerHTML = synkioLogoPath;
  }

  iconContainer.appendChild(svg);
  container.appendChild(iconContainer);

  // Logo text (YNKIO - the S is the icon)
  if (showText) {
    const textContainer = document.createElement('div');
    textContainer.className = getStyle('logo__text');
    // Font size and letter spacing controlled by CSS via .logo--{size} .logo__text

    const letters = ['Y', 'N', 'K', 'I', 'O'];
    letters.forEach((letter, index) => {
      const span = document.createElement('span');
      span.className = getStyle('logo__letter');
      span.textContent = letter;
      // Set text color based on color config (only if not brand - brand uses CSS animation)
      if (color !== 'brand') {
        span.style.color = colorConf.textColor;
      }
      // Stagger animation delay for each letter (only for brand color)
      if (color === 'brand') {
        span.style.animationDelay = `${(index + 1) * 0.5}s`;
      }
      textContainer.appendChild(span);
    });

    container.appendChild(textContainer);
  }

  return container;
}

/**
 * Create a simple logo icon without text
 */
export function LogoIcon(size: number = 32, animated: boolean = true, color: LogoColor = 'brand'): SVGSVGElement {
  const gradientId = `synkio-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const colorConf = colorConfig[color];

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(Math.round(size * 26 / 24))); // Maintain aspect ratio (24x26)
  svg.setAttribute('viewBox', '0 0 24 26');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');

  if (animated) {
    const svgClass = getStyle('logo__svg');
    const animatedClass = getStyle('logo__svg--animated');
    if (svgClass) svg.classList.add(svgClass);
    if (animatedClass) svg.classList.add(animatedClass);
  }

  // Set stroke based on color config
  if (colorConf.gradient && colorConf.stops) {
    svg.setAttribute('stroke', `url(#${gradientId})`);
    const gradientStops = colorConf.stops.map(s =>
      `<stop offset="${s.offset}" stop-color="${s.color}" />`
    ).join('\n        ');
    svg.innerHTML = `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        ${gradientStops}
      </linearGradient>
    </defs>
    ${synkioLogoPath}
  `;
  } else {
    svg.setAttribute('stroke', colorConf.solidColor!);
    svg.innerHTML = synkioLogoPath;
  }

  return svg;
}
