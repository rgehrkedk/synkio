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
    gradient: false,
    solidColor: 'var(--text-primary, #1a1814)',
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
  sm: { icon: 24, fontSize: 16, letterSpacing: '1px' },
  md: { icon: 32, fontSize: 20, letterSpacing: '1.5px' },
  lg: { icon: 48, fontSize: 32, letterSpacing: '2px' },
  xl: { icon: 64, fontSize: 42, letterSpacing: '3px' },
  hero: { icon: 80, fontSize: 64, letterSpacing: '6px' },
};

// Synkio logo SVG paths (v3 - filled) with individual classes for animation
// Path 1: Top-right sync arc (curves down)
// Path 2: Bottom-left sync arc (curves up)
// Path 3: Bottom-left corner bracket
// Path 4: Top-right corner bracket
const createLogoPaths = (animated: boolean) => {
  const arcClass1 = animated ? 'logo__arc logo__arc--1' : '';
  const arcClass2 = animated ? 'logo__arc logo__arc--2' : '';
  const bracketClass1 = animated ? 'logo__bracket logo__bracket--1' : '';
  const bracketClass2 = animated ? 'logo__bracket logo__bracket--2' : '';

  return `
  <path class="${arcClass1}" d="M17.0093 11.7864C16.9651 11.5246 16.8188 11.2962 16.5953 11.1531C16.3723 11.0099 16.0904 10.9637 15.8188 11.0231C15.5473 11.0824 15.3104 11.2421 15.1674 11.4653C15.0241 11.6886 14.9864 11.9572 15.0555 12.2136C15.0555 12.2136 15.0555 12.2136 15.0555 12.2136C15.1059 12.3957 15.1466 12.5763 15.1784 12.7615C15.8821 16.0544 12.6733 19.7078 8.95131 19.2204C8.87163 19.2123 8.79195 19.2042 8.71227 19.196C8.49339 19.1737 8.27451 19.1514 8.05563 19.1291C7.96115 19.1196 7.86473 19.1491 7.78798 19.2086C7.71121 19.2683 7.66039 19.3531 7.64631 19.4469C7.63223 19.5408 7.65594 19.6368 7.71183 19.7163C7.76774 19.7958 7.85124 19.8523 7.94437 19.8709C7.94437 19.8709 7.94437 19.8709 7.94437 19.8709C8.16016 19.9138 8.37596 19.9567 8.59175 19.9996C8.6703 20.0152 8.74885 20.0308 8.82741 20.0464C12.9664 21.0333 17.5669 17.148 17.1033 12.5404C17.0846 12.2869 17.0536 12.0381 17.0093 11.7864Z"/>
  <path class="${arcClass2}" d="M0.990666 9.21358C1.03486 9.4754 1.1812 9.70376 1.40467 9.84687C1.62773 9.99008 1.90962 10.0363 2.18117 9.97693C2.45272 9.91756 2.68961 9.75792 2.83256 9.53471C2.97592 9.3114 3.01361 9.0428 2.94452 8.78642C2.94452 8.78642 2.94452 8.78642 2.94452 8.78642C2.89409 8.60432 2.85338 8.42374 2.82158 8.23853C2.11785 4.94557 5.32669 1.29222 9.04869 1.7796C9.12837 1.78772 9.20805 1.79584 9.28773 1.80395C9.50661 1.82625 9.72549 1.84855 9.94437 1.87085C10.0389 1.88041 10.1353 1.85089 10.212 1.79136C10.2888 1.73169 10.3396 1.6469 10.3537 1.55305C10.3678 1.45921 10.3441 1.36324 10.2882 1.28367C10.2323 1.20424 10.1488 1.14773 10.0556 1.12915C10.0556 1.12915 10.0556 1.12915 10.0556 1.12915C9.83984 1.08625 9.62404 1.04334 9.40825 1.00044C9.3297 0.984826 9.25115 0.969208 9.17259 0.953591C5.03358 -0.033339 0.433112 3.85202 0.896733 8.45957C0.915421 8.71314 0.946357 8.96188 0.990666 9.21358Z"/>
  <path class="${bracketClass1}" d="M2.21875 20C2.23186 20.0678 2.26358 20.1328 2.31493 20.1807C2.36623 20.2287 2.43206 20.2556 2.5 20.2556C2.56794 20.2556 2.63377 20.2287 2.68507 20.1807C2.73642 20.1328 2.76814 20.0678 2.78125 20C2.78125 20 2.78125 20 2.78125 20C2.8125 19.8369 2.84219 19.6738 2.87031 19.5107C3.10086 18.1738 3.22642 16.8369 3.24698 15.5C3.24983 15.5621 3.22215 15.6328 3.17678 15.6768C3.13277 15.7221 3.06212 15.7498 3 15.747C4.33691 15.7264 5.67382 15.6009 7.01073 15.3703C7.17382 15.3422 7.33691 15.3125 7.5 15.2812C7.56779 15.2681 7.6328 15.2364 7.68073 15.1851C7.72866 15.1338 7.75559 15.0679 7.75559 15C7.75559 14.9321 7.72866 14.8662 7.68073 14.8149C7.6328 14.7636 7.56779 14.7319 7.5 14.7188C7.33691 14.6875 7.17382 14.6578 7.01073 14.6297C5.67382 14.3991 4.33691 14.2736 3 14.253C2.67562 14.2488 2.34474 14.3847 2.11612 14.6161C1.88466 14.8447 1.74884 15.1756 1.75302 15.5C1.77358 16.8369 1.89914 18.1738 2.12969 19.5107C2.15781 19.6738 2.1875 19.8369 2.21875 20Z"/>
  <path class="${bracketClass2}" d="M15.7812 2C15.7681 1.93221 15.7364 1.8672 15.6851 1.81927C15.6338 1.77134 15.5679 1.74441 15.5 1.74441C15.4321 1.74441 15.3662 1.77134 15.3149 1.81927C15.2636 1.8672 15.2319 1.93221 15.2188 2C15.2188 2 15.2188 2 15.2188 2C15.1875 2.16309 15.1578 2.32618 15.1297 2.48927C14.8991 3.82618 14.7736 5.16309 14.753 6.5C14.7502 6.43788 14.7779 6.36723 14.8232 6.32322C14.8672 6.27785 14.9379 6.25017 15 6.25302C13.6631 6.27358 12.3262 6.39914 10.9893 6.62969C10.8262 6.65781 10.6631 6.6875 10.5 6.71875C10.4322 6.73186 10.3672 6.76358 10.3193 6.81493C10.2713 6.86623 10.2444 6.93206 10.2444 7C10.2444 7.06794 10.2713 7.13377 10.3193 7.18507C10.3672 7.23642 10.4322 7.26814 10.5 7.28125C10.6631 7.3125 10.8262 7.34219 10.9893 7.37031C12.3262 7.60086 13.6631 7.72642 15 7.74698C15.3244 7.75116 15.6553 7.61534 15.8839 7.38388C16.1153 7.15526 16.2512 6.82438 16.247 6.5C16.2264 5.16309 16.1009 3.82618 15.8703 2.48927C15.8422 2.32618 15.8125 2.16309 15.7812 2Z"/>
`;
};

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
  svg.setAttribute('height', String(Math.round(sizeConf.icon * 21 / 18))); // Maintain aspect ratio (18x21)
  svg.setAttribute('viewBox', '0 0 18 21');
  const svgClass = getStyle('logo__svg');
  if (svgClass) svg.classList.add(svgClass);

  // Get paths with animation classes if animated
  const logoPaths = createLogoPaths(animated);

  // Set fill based on color config
  if (colorConf.gradient && colorConf.stops) {
    svg.setAttribute('fill', `url(#${gradientId})`);
    const gradientStops = colorConf.stops.map(s =>
      `<stop offset="${s.offset}" stop-color="${s.color}" />`
    ).join('\n        ');
    svg.innerHTML = `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        ${gradientStops}
      </linearGradient>
    </defs>
    ${logoPaths}
  `;
  } else {
    svg.setAttribute('fill', colorConf.solidColor!);
    svg.innerHTML = logoPaths;
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
  svg.setAttribute('height', String(Math.round(size * 21 / 18))); // Maintain aspect ratio (18x21)
  svg.setAttribute('viewBox', '0 0 18 21');

  if (animated) {
    const svgClass = getStyle('logo__svg');
    const animatedClass = getStyle('logo__svg--animated');
    if (svgClass) svg.classList.add(svgClass);
    if (animatedClass) svg.classList.add(animatedClass);
  }

  // Get paths with animation classes if animated
  const logoPaths = createLogoPaths(animated);

  // Set fill based on color config
  if (colorConf.gradient && colorConf.stops) {
    svg.setAttribute('fill', `url(#${gradientId})`);
    const gradientStops = colorConf.stops.map(s =>
      `<stop offset="${s.offset}" stop-color="${s.color}" />`
    ).join('\n        ');
    svg.innerHTML = `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        ${gradientStops}
      </linearGradient>
    </defs>
    ${logoPaths}
  `;
  } else {
    svg.setAttribute('fill', colorConf.solidColor!);
    svg.innerHTML = logoPaths;
  }

  return svg;
}
