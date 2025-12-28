// =============================================================================
// SVG Icon Library
// Clean, open-source inspired icons (Lucide/Feather style)
// =============================================================================

export type IconName =
  | 'figma'
  | 'code'
  | 'sync'
  | 'upload'
  | 'download'
  | 'check'
  | 'x'
  | 'warning'
  | 'info'
  | 'settings'
  | 'chevron-down'
  | 'chevron-left'
  | 'arrow-right'
  | 'arrow-left-right'
  | 'plus'
  | 'minus'
  | 'edit'
  | 'github'
  | 'history'
  | 'rocket'
  | 'copy';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

// SVG path definitions (24x24 viewBox)
const iconPaths: Record<IconName, string> = {
  figma: `<path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/><path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/><path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"/><path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"/><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/>`,

  code: `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`,

  sync: `<path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2.5 12c0-2.5 1-4.5 2.5-6l3-3"/><path d="M21.5 12c0 2.5-1 4.5-2.5 6l-3 3"/>`,

  upload: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>`,

  download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,

  check: `<polyline points="20 6 9 17 4 12"/>`,

  x: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,

  warning: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,

  info: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`,

  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,

  'chevron-down': `<polyline points="6 9 12 15 18 9"/>`,

  'chevron-left': `<polyline points="15 18 9 12 15 6"/>`,

  'arrow-right': `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`,

  'arrow-left-right': `<polyline points="17 11 21 7 17 3"/><line x1="21" y1="7" x2="9" y2="7"/><polyline points="7 21 3 17 7 13"/><line x1="15" y1="17" x2="3" y2="17"/>`,

  plus: `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,

  minus: `<line x1="5" y1="12" x2="19" y2="12"/>`,

  edit: `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`,

  github: `<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>`,

  history: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,

  rocket: `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>`,

  copy: `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`,
};

/**
 * Create an SVG icon element
 */
export function Icon(name: IconName, size: IconSize = 'md', color?: string): SVGSVGElement {
  const px = sizeMap[size];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('width', String(px));
  svg.setAttribute('height', String(px));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', color || 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.style.flexShrink = '0';

  svg.innerHTML = iconPaths[name];

  // Handle filled icons
  if (name === 'figma') {
    svg.setAttribute('fill', color || 'currentColor');
    svg.setAttribute('stroke', 'none');
  }

  return svg;
}

/**
 * Create an icon with a circular background
 */
export function IconCircle(
  name: IconName,
  options: {
    size?: IconSize;
    bgColor?: string;
    iconColor?: string;
  } = {}
): HTMLDivElement {
  const { size = 'md', bgColor = 'var(--color-bg-secondary)', iconColor } = options;

  const sizeMapCircle: Record<IconSize, { container: number; icon: IconSize }> = {
    xs: { container: 24, icon: 'xs' },
    sm: { container: 32, icon: 'sm' },
    md: { container: 40, icon: 'md' },
    lg: { container: 48, icon: 'lg' },
    xl: { container: 56, icon: 'xl' },
  };

  const { container, icon: iconSize } = sizeMapCircle[size];

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${container}px;
    height: ${container}px;
    border-radius: 50%;
    background: ${bgColor};
    flex-shrink: 0;
  `;

  wrapper.appendChild(Icon(name, iconSize, iconColor));

  return wrapper;
}

/**
 * Create a status icon with appropriate styling
 */
export function StatusIcon(
  type: 'success' | 'warning' | 'error' | 'info',
  size: IconSize = 'sm'
): SVGSVGElement {
  const iconMap: Record<string, IconName> = {
    success: 'check',
    warning: 'warning',
    error: 'x',
    info: 'info',
  };

  const colorMap: Record<string, string> = {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    info: 'var(--color-primary)',
  };

  return Icon(iconMap[type], size, colorMap[type]);
}

/**
 * Create a diff type icon
 */
export function DiffIcon(type: 'added' | 'modified' | 'deleted' | 'renamed', size: IconSize = 'sm'): SVGSVGElement {
  const iconMap: Record<string, IconName> = {
    added: 'plus',
    modified: 'edit',
    deleted: 'minus',
    renamed: 'arrow-left-right',
  };

  return Icon(iconMap[type], size);
}
