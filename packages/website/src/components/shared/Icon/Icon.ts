// =============================================================================
// Icon Component
// SVG icon library with size variants
// =============================================================================

import styles from './Icon.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

export type IconName =
  | 'github'
  | 'npm'
  | 'kofi'
  | 'figma'
  | 'code'
  | 'sync'
  | 'arrow-right'
  | 'check'
  | 'lock'
  | 'unlock'
  | 'terminal'
  | 'download'
  | 'copy'
  | 'x'
  | 'external-link'
  | 'chevron-down'
  | 'chevron-right'
  | 'play'
  | 'pause'
  | 'star'
  | 'heart'
  | 'synkio-logo';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

// SVG path definitions (24x24 viewBox)
const iconPaths: Record<IconName, string> = {
  github: `<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>`,

  npm: `<path d="M4 4h16v16H4V4z"/><path fill="currentColor" d="M7 7h3v10h2V10h2v7h3V7H7z"/>`,

  kofi: `<g transform="translate(0, 0.5) scale(0.115) translate(-12, 0)"><path d="M96.1344 193.911C61.1312 193.911 32.6597 178.256 15.9721 149.829C1.19788 124.912 -0.00585938 97.9229 -0.00585938 67.7662C-0.00585938 49.8876 5.37293 34.3215 15.5413 22.7466C24.8861 12.1157 38.1271 5.22907 52.8317 3.35378C70.2858 1.14271 91.9848 0.958984 114.545 0.958984C151.259 0.958984 161.63 1.4088 176.075 2.85328C195.29 4.76026 211.458 11.932 222.824 23.5955C234.368 35.4428 240.469 51.2624 240.469 69.3627V72.9994C240.469 103.885 219.821 129.733 191.046 136.759C188.898 141.827 186.237 146.871 183.089 151.837L183.006 151.964C172.869 167.632 149.042 193.918 103.401 193.918H96.1281L96.1344 193.911Z" fill="currentColor"/><path d="M174.568 17.9772C160.927 16.6151 151.38 16.1589 114.552 16.1589C90.908 16.1589 70.9008 16.387 54.7644 18.4334C33.3949 21.164 15.2058 37.5285 15.2058 67.7674C15.2058 98.0066 16.796 121.422 29.0741 142.107C42.9425 165.751 66.1302 178.707 96.1412 178.707H103.414C140.242 178.707 160.25 159.156 170.253 143.698C174.574 136.874 177.754 130.058 179.801 123.234C205.947 120.96 225.27 99.3624 225.27 72.9941V69.3577C225.27 40.9432 206.631 21.164 174.574 17.9772H174.568Z" fill="var(--bg-primary, #09090b)"/><path d="M15.1975 67.7674C15.1975 37.5285 33.3866 21.164 54.7559 18.4334C70.8987 16.387 90.906 16.1589 114.544 16.1589C151.372 16.1589 160.919 16.6151 174.559 17.9772C206.617 21.1576 225.255 40.937 225.255 69.3577V72.9941C225.255 99.3687 205.932 120.966 179.786 123.234C177.74 130.058 174.559 136.874 170.238 143.698C160.235 159.156 140.228 178.707 103.4 178.707H96.1264C66.1155 178.707 42.9277 165.751 29.0595 142.107C16.7814 121.422 15.1912 98.4563 15.1912 67.7674" fill="var(--text-primary, #fafafa)"/><path d="M32.2469 67.9899C32.2469 97.3168 34.0654 116.184 43.6127 133.689C54.5225 153.924 74.3018 161.653 96.8117 161.653H103.857C133.411 161.653 147.736 147.329 155.693 134.829C159.558 128.462 162.966 121.417 164.784 112.547L166.147 106.864H174.332C192.521 106.864 208.208 92.09 208.208 73.2166V69.8082C208.208 48.6669 195.024 37.5228 172.058 34.7987C159.102 33.6646 151.372 33.2084 114.538 33.2084C89.7602 33.2084 72.0272 33.4364 58.6152 35.4828C39.7483 38.2134 32.2407 48.8951 32.2407 67.9899" fill="var(--bg-primary, #09090b)"/><path d="M166.158 83.6801C166.158 86.4107 168.204 88.4572 171.841 88.4572C183.435 88.4572 189.802 81.8619 189.802 70.9523C189.802 60.0427 183.435 53.2195 171.841 53.2195C168.204 53.2195 166.158 55.2657 166.158 57.9963V83.6866V83.6801Z" fill="var(--text-primary, #fafafa)"/><path d="M54.5321 82.3198C54.5321 95.732 62.0332 107.326 71.5807 116.424C77.9478 122.562 87.9515 128.93 94.7685 133.022C96.8147 134.157 98.8611 134.841 101.136 134.841C103.866 134.841 106.134 134.157 107.959 133.022C114.782 128.93 124.779 122.562 130.919 116.424C140.694 107.332 148.195 95.7383 148.195 82.3198C148.195 67.7673 137.286 54.8115 121.599 54.8115C112.28 54.8115 105.912 59.5882 101.136 66.1772C96.8147 59.582 90.2259 54.8115 80.9001 54.8115C64.9855 54.8115 54.5256 67.7673 54.5256 82.3198" fill="#FF5E5B"/></g>`,

  figma: `<path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/><path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/><path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"/><path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"/><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/>`,

  code: `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`,

  sync: `<path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2.5 12c0-2.5 1-4.5 2.5-6l3-3"/><path d="M21.5 12c0 2.5-1 4.5-2.5 6l-3 3"/>`,

  'arrow-right': `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`,

  check: `<polyline points="20 6 9 17 4 12"/>`,

  lock: `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,

  unlock: `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>`,

  terminal: `<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>`,

  download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,

  copy: `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`,

  x: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,

  'external-link': `<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>`,

  'chevron-down': `<polyline points="6 9 12 15 18 9"/>`,

  'chevron-right': `<polyline points="9 18 15 12 9 6"/>`,

  play: `<polygon points="5 3 19 12 5 21 5 3"/>`,

  pause: `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`,

  star: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,

  heart: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,

  'synkio-logo': `<path d="M22 2V7C22 7.55228 21.5523 8 21 8H15"/><path d="M2 22V17C2 16.4477 2.44772 16 3 16H9"/><path d="M2 11C2 5.47715 6.47715 1 12 1H15"/><path d="M22 13C22 18.5228 17.5228 23 12 23H9"/>`,
};

// Icons that should be filled instead of stroked
const filledIcons: IconName[] = ['figma', 'npm', 'star', 'heart'];

// Icons that need special handling (no stroke, inline fills)
const specialIcons: IconName[] = ['kofi'];

/**
 * Create an SVG icon element
 */
export function Icon(
  name: IconName,
  size: IconSize = 'md',
  color?: string
): SVGSVGElement {
  const px = sizeMap[size];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('width', String(px));
  svg.setAttribute('height', String(px));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const iconClass = getStyle('icon');
  const sizeClass = getStyle(`icon--${size}`);
  if (iconClass) svg.classList.add(iconClass);
  if (sizeClass) svg.classList.add(sizeClass);

  // Set default stroke attributes
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', color || 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  // Handle filled icons
  if (filledIcons.includes(name)) {
    svg.setAttribute('fill', color || 'currentColor');
    svg.setAttribute('stroke', 'none');
  }

  // Handle special icons (kofi, etc.)
  if (specialIcons.includes(name)) {
    svg.setAttribute('stroke', 'none');
    svg.setAttribute('stroke-width', '0');
  }

  svg.innerHTML = iconPaths[name];

  return svg;
}

/**
 * Create an icon wrapper element with the icon inside
 */
export function IconWrapper(
  name: IconName,
  size: IconSize = 'md',
  color?: string
): HTMLSpanElement {
  const wrapper = document.createElement('span');
  wrapper.className = getStyle('iconWrapper');
  wrapper.appendChild(Icon(name, size, color));
  return wrapper;
}
