// =============================================================================
// Logo Component
// Synkio brand logo with SYNKIO text and optional hero key visual
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
  showKeyVisual?: boolean; // Show SVG S as hero key visual (hero size only)
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

// New S logo paths from S.svg - viewBox="0 0 31 36"
// Path 1: Solid S letter (will be animated with sweep, 30% opacity)
const solidSPath = `<path d="M15.4774 33.4876C13.5761 33.4876 11.6747 33.2396 9.77341 32.7436C7.87208 32.2476 6.09474 31.5656 4.44141 30.6976C2.82941 29.8296 1.46541 28.8376 0.349411 27.7216L6.73541 21.1496C7.72741 22.1416 8.90541 22.927 10.2694 23.5056C11.6747 24.0843 13.1421 24.3736 14.6714 24.3736C15.3741 24.3736 15.9114 24.291 16.2834 24.1256C16.6967 23.919 16.9034 23.6503 16.9034 23.3196C16.9034 22.741 16.5521 22.307 15.8494 22.0176C15.1881 21.7283 14.3201 21.4596 13.2454 21.2116C12.2121 20.9636 11.0961 20.6536 9.89741 20.2816C8.74008 19.8683 7.62408 19.331 6.54941 18.6696C5.47474 17.967 4.60674 17.0163 3.94541 15.8176C3.28408 14.5776 2.95341 13.007 2.95341 11.1056C2.95341 9.16297 3.49074 7.44764 4.56541 5.95963C5.68141 4.4303 7.23141 3.23163 9.21541 2.36363C11.2407 1.4543 13.5761 0.999634 16.2214 0.999634C18.9081 0.999634 21.5121 1.4543 24.0334 2.36363C26.5547 3.27297 28.5594 4.63697 30.0474 6.45563L23.5994 13.0276C22.5661 11.8703 21.4294 11.1056 20.1894 10.7336C18.9494 10.3203 17.9161 10.1136 17.0894 10.1136C16.3041 10.1136 15.7461 10.2376 15.4154 10.4856C15.1261 10.6923 14.9814 10.961 14.9814 11.2916C14.9814 11.7463 15.3121 12.1183 15.9734 12.4076C16.6347 12.697 17.4821 12.9656 18.5154 13.2136C19.5901 13.4616 20.7061 13.7923 21.8634 14.2056C23.0207 14.619 24.1161 15.1976 25.1494 15.9416C26.2241 16.6856 27.0921 17.6776 27.7534 18.9176C28.4147 20.1163 28.7454 21.687 28.7454 23.6296C28.7454 26.647 27.5467 29.0443 25.1494 30.8216C22.7521 32.599 19.5281 33.4876 15.4774 33.4876Z"/>`;

// Paths 2-6: Dashed outline elements (static, the unique logo mark)
const dashedOutlinePaths = `
  <path d="M3.75516 5.37402C2.55002 7.04267 1.95343 8.96568 1.9534 11.1055C1.9534 13.1155 2.30186 14.8613 3.06277 16.2881L3.06668 16.2949L3.06961 16.3008L3.94559 15.8174C3.28429 14.5774 2.9534 13.0067 2.9534 11.1055C2.95343 9.1629 3.49111 7.4479 4.5657 5.95996C5.68168 4.43066 7.23118 3.23128 9.21512 2.36328C11.2403 1.454 13.5758 1.00005 16.221 1L16.7239 1.00488C19.2331 1.05814 21.6697 1.51076 24.0335 2.36328L24.3723 1.42285C21.742 0.474257 19.0229 0 16.221 0C13.465 4.93659e-05 10.9889 0.472868 8.81473 1.44727C6.69236 2.3758 4.99269 3.67835 3.75809 5.37012L3.75516 5.37402Z"/>
  <path d="M28.7688 18.7002L28.6292 18.4346L27.7532 18.918L27.8733 19.1465C28.4547 20.3139 28.7454 21.8085 28.7454 23.6299L28.7317 24.1885C28.5912 26.9443 27.3969 29.1551 25.1497 30.8213L24.6907 31.1445C22.3464 32.7067 19.2753 33.4872 15.4778 33.4873L14.7639 33.4756C13.1005 33.4213 11.4372 33.1771 9.77371 32.7432L9.52078 33.7109C11.5018 34.2277 13.4885 34.4873 15.4778 34.4873C19.6673 34.4872 23.1237 33.5686 25.7454 31.625C28.4002 29.6567 29.7453 26.9596 29.7454 23.6299C29.7454 21.7127 29.4414 20.0504 28.7688 18.7002Z"/>
  <path d="M29.4344 7.08063L23.5999 13.0274C22.5666 11.8701 21.4296 11.1055 20.1897 10.7334C18.9497 10.3201 17.9158 10.1133 17.0891 10.1133V11.1133C17.7646 11.1133 18.6832 11.2859 19.8733 11.6826L19.888 11.6875L19.9016 11.6914C20.835 11.9715 21.73 12.5292 22.5852 13.4092L23.5999 14.4239L24.3128 13.7276L30.1415 7.78778L29.4344 7.08063Z"/>
  <path d="M6.73563 21.1494C7.72762 22.1414 8.90581 22.9272 10.2698 23.5058C11.4994 24.0121 12.7764 24.297 14.1009 24.3603L14.6712 24.374V23.374C13.2751 23.374 11.9413 23.111 10.6604 22.5849C9.40795 22.0536 8.33879 21.3385 7.44266 20.4424L7.17313 20.1738L6.72041 19.7136L6.59598 19.8574L0 26.6462L0.707455 27.3536L6.73563 21.1494Z"/>
`;

// Legacy S paths for backward compatibility (old sync icon)
const sPathsRaw = `
  <path d="M17.0093 11.7864C16.9651 11.5246 16.8188 11.2962 16.5953 11.1531C16.3723 11.0099 16.0904 10.9637 15.8188 11.0231C15.5473 11.0824 15.3104 11.2421 15.1674 11.4653C15.0241 11.6886 14.9864 11.9572 15.0555 12.2136C15.0555 12.2136 15.0555 12.2136 15.0555 12.2136C15.1059 12.3957 15.1466 12.5763 15.1784 12.7615C15.8821 16.0544 12.6733 19.7078 8.95131 19.2204C8.87163 19.2123 8.79195 19.2042 8.71227 19.196C8.49339 19.1737 8.27451 19.1514 8.05563 19.1291C7.96115 19.1196 7.86473 19.1491 7.78798 19.2086C7.71121 19.2683 7.66039 19.3531 7.64631 19.4469C7.63223 19.5408 7.65594 19.6368 7.71183 19.7163C7.76774 19.7958 7.85124 19.8523 7.94437 19.8709C7.94437 19.8709 7.94437 19.8709 7.94437 19.8709C8.16016 19.9138 8.37596 19.9567 8.59175 19.9996C8.6703 20.0152 8.74885 20.0308 8.82741 20.0464C12.9664 21.0333 17.5669 17.148 17.1033 12.5404C17.0846 12.2869 17.0536 12.0381 17.0093 11.7864Z"/>
  <path d="M0.990666 9.21358C1.03486 9.4754 1.1812 9.70376 1.40467 9.84687C1.62773 9.99008 1.90962 10.0363 2.18117 9.97693C2.45272 9.91756 2.68961 9.75792 2.83256 9.53471C2.97592 9.3114 3.01361 9.0428 2.94452 8.78642C2.94452 8.78642 2.94452 8.78642 2.94452 8.78642C2.89409 8.60432 2.85338 8.42374 2.82158 8.23853C2.11785 4.94557 5.32669 1.29222 9.04869 1.7796C9.12837 1.78772 9.20805 1.79584 9.28773 1.80395C9.50661 1.82625 9.72549 1.84855 9.94437 1.87085C10.0389 1.88041 10.1353 1.85089 10.212 1.79136C10.2888 1.73169 10.3396 1.6469 10.3537 1.55305C10.3678 1.45921 10.3441 1.36324 10.2882 1.28367C10.2323 1.20424 10.1488 1.14773 10.0556 1.12915C10.0556 1.12915 10.0556 1.12915 10.0556 1.12915C9.83984 1.08625 9.62404 1.04334 9.40825 1.00044C9.3297 0.984826 9.25115 0.969208 9.17259 0.953591C5.03358 -0.033339 0.433112 3.85202 0.896733 8.45957C0.915421 8.71314 0.946357 8.96188 0.990666 9.21358Z"/>
  <path d="M2.21875 20C2.23186 20.0678 2.26358 20.1328 2.31493 20.1807C2.36623 20.2287 2.43206 20.2556 2.5 20.2556C2.56794 20.2556 2.63377 20.2287 2.68507 20.1807C2.73642 20.1328 2.76814 20.0678 2.78125 20C2.78125 20 2.78125 20 2.78125 20C2.8125 19.8369 2.84219 19.6738 2.87031 19.5107C3.10086 18.1738 3.22642 16.8369 3.24698 15.5C3.24983 15.5621 3.22215 15.6328 3.17678 15.6768C3.13277 15.7221 3.06212 15.7498 3 15.747C4.33691 15.7264 5.67382 15.6009 7.01073 15.3703C7.17382 15.3422 7.33691 15.3125 7.5 15.2812C7.56779 15.2681 7.6328 15.2364 7.68073 15.1851C7.72866 15.1338 7.75559 15.0679 7.75559 15C7.75559 14.9321 7.72866 14.8662 7.68073 14.8149C7.6328 14.7636 7.56779 14.7319 7.5 14.7188C7.33691 14.6875 7.17382 14.6578 7.01073 14.6297C5.67382 14.3991 4.33691 14.2736 3 14.253C2.67562 14.2488 2.34474 14.3847 2.11612 14.6161C1.88466 14.8447 1.74884 15.1756 1.75302 15.5C1.77358 16.8369 1.89914 18.1738 2.12969 19.5107C2.15781 19.6738 2.1875 19.8369 2.21875 20Z"/>
  <path d="M15.7812 2C15.7681 1.93221 15.7364 1.8672 15.6851 1.81927C15.6338 1.77134 15.5679 1.74441 15.5 1.74441C15.4321 1.74441 15.3662 1.77134 15.3149 1.81927C15.2636 1.8672 15.2319 1.93221 15.2188 2C15.2188 2 15.2188 2 15.2188 2C15.1875 2.16309 15.1578 2.32618 15.1297 2.48927C14.8991 3.82618 14.7736 5.16309 14.753 6.5C14.7502 6.43788 14.7779 6.36723 14.8232 6.32322C14.8672 6.27785 14.9379 6.25017 15 6.25302C13.6631 6.27358 12.3262 6.39914 10.9893 6.62969C10.8262 6.65781 10.6631 6.6875 10.5 6.71875C10.4322 6.73186 10.3672 6.76358 10.3193 6.81493C10.2713 6.86623 10.2444 6.93206 10.2444 7C10.2444 7.06794 10.2713 7.13377 10.3193 7.18507C10.3672 7.23642 10.4322 7.26814 10.5 7.28125C10.6631 7.3125 10.8262 7.34219 10.9893 7.37031C12.3262 7.60086 13.6631 7.72642 15 7.74698C15.3244 7.75116 15.6553 7.61534 15.8839 7.38388C16.1153 7.15526 16.2512 6.82438 16.247 6.5C16.2264 5.16309 16.1009 3.82618 15.8703 2.48927C15.8422 2.32618 15.8125 2.16309 15.7812 2Z"/>
`;

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

  // Shadow layer - grouped paths that animate together
  const shadowLayer = animated ? `<g class="logo__shadow">${sPathsRaw}</g>` : '';

  return `
  ${shadowLayer}
  <path class="${arcClass1}" d="M17.0093 11.7864C16.9651 11.5246 16.8188 11.2962 16.5953 11.1531C16.3723 11.0099 16.0904 10.9637 15.8188 11.0231C15.5473 11.0824 15.3104 11.2421 15.1674 11.4653C15.0241 11.6886 14.9864 11.9572 15.0555 12.2136C15.0555 12.2136 15.0555 12.2136 15.0555 12.2136C15.1059 12.3957 15.1466 12.5763 15.1784 12.7615C15.8821 16.0544 12.6733 19.7078 8.95131 19.2204C8.87163 19.2123 8.79195 19.2042 8.71227 19.196C8.49339 19.1737 8.27451 19.1514 8.05563 19.1291C7.96115 19.1196 7.86473 19.1491 7.78798 19.2086C7.71121 19.2683 7.66039 19.3531 7.64631 19.4469C7.63223 19.5408 7.65594 19.6368 7.71183 19.7163C7.76774 19.7958 7.85124 19.8523 7.94437 19.8709C7.94437 19.8709 7.94437 19.8709 7.94437 19.8709C8.16016 19.9138 8.37596 19.9567 8.59175 19.9996C8.6703 20.0152 8.74885 20.0308 8.82741 20.0464C12.9664 21.0333 17.5669 17.148 17.1033 12.5404C17.0846 12.2869 17.0536 12.0381 17.0093 11.7864Z"/>
  <path class="${arcClass2}" d="M0.990666 9.21358C1.03486 9.4754 1.1812 9.70376 1.40467 9.84687C1.62773 9.99008 1.90962 10.0363 2.18117 9.97693C2.45272 9.91756 2.68961 9.75792 2.83256 9.53471C2.97592 9.3114 3.01361 9.0428 2.94452 8.78642C2.94452 8.78642 2.94452 8.78642 2.94452 8.78642C2.89409 8.60432 2.85338 8.42374 2.82158 8.23853C2.11785 4.94557 5.32669 1.29222 9.04869 1.7796C9.12837 1.78772 9.20805 1.79584 9.28773 1.80395C9.50661 1.82625 9.72549 1.84855 9.94437 1.87085C10.0389 1.88041 10.1353 1.85089 10.212 1.79136C10.2888 1.73169 10.3396 1.6469 10.3537 1.55305C10.3678 1.45921 10.3441 1.36324 10.2882 1.28367C10.2323 1.20424 10.1488 1.14773 10.0556 1.12915C10.0556 1.12915 10.0556 1.12915 10.0556 1.12915C9.83984 1.08625 9.62404 1.04334 9.40825 1.00044C9.3297 0.984826 9.25115 0.969208 9.17259 0.953591C5.03358 -0.033339 0.433112 3.85202 0.896733 8.45957C0.915421 8.71314 0.946357 8.96188 0.990666 9.21358Z"/>
  <path class="${bracketClass1}" d="M2.21875 20C2.23186 20.0678 2.26358 20.1328 2.31493 20.1807C2.36623 20.2287 2.43206 20.2556 2.5 20.2556C2.56794 20.2556 2.63377 20.2287 2.68507 20.1807C2.73642 20.1328 2.76814 20.0678 2.78125 20C2.78125 20 2.78125 20 2.78125 20C2.8125 19.8369 2.84219 19.6738 2.87031 19.5107C3.10086 18.1738 3.22642 16.8369 3.24698 15.5C3.24983 15.5621 3.22215 15.6328 3.17678 15.6768C3.13277 15.7221 3.06212 15.7498 3 15.747C4.33691 15.7264 5.67382 15.6009 7.01073 15.3703C7.17382 15.3422 7.33691 15.3125 7.5 15.2812C7.56779 15.2681 7.6328 15.2364 7.68073 15.1851C7.72866 15.1338 7.75559 15.0679 7.75559 15C7.75559 14.9321 7.72866 14.8662 7.68073 14.8149C7.6328 14.7636 7.56779 14.7319 7.5 14.7188C7.33691 14.6875 7.17382 14.6578 7.01073 14.6297C5.67382 14.3991 4.33691 14.2736 3 14.253C2.67562 14.2488 2.34474 14.3847 2.11612 14.6161C1.88466 14.8447 1.74884 15.1756 1.75302 15.5C1.77358 16.8369 1.89914 18.1738 2.12969 19.5107C2.15781 19.6738 2.1875 19.8369 2.21875 20Z"/>
  <path class="${bracketClass2}" d="M15.7812 2C15.7681 1.93221 15.7364 1.8672 15.6851 1.81927C15.6338 1.77134 15.5679 1.74441 15.5 1.74441C15.4321 1.74441 15.3662 1.77134 15.3149 1.81927C15.2636 1.8672 15.2319 1.93221 15.2188 2C15.2188 2 15.2188 2 15.2188 2C15.1875 2.16309 15.1578 2.32618 15.1297 2.48927C14.8991 3.82618 14.7736 5.16309 14.753 6.5C14.7502 6.43788 14.7779 6.36723 14.8232 6.32322C14.8672 6.27785 14.9379 6.25017 15 6.25302C13.6631 6.27358 12.3262 6.39914 10.9893 6.62969C10.8262 6.65781 10.6631 6.6875 10.5 6.71875C10.4322 6.73186 10.3672 6.76358 10.3193 6.81493C10.2713 6.86623 10.2444 6.93206 10.2444 7C10.2444 7.06794 10.2713 7.13377 10.3193 7.18507C10.3672 7.23642 10.4322 7.26814 10.5 7.28125C10.6631 7.3125 10.8262 7.34219 10.9893 7.37031C12.3262 7.60086 13.6631 7.72642 15 7.74698C15.3244 7.75116 15.6553 7.61534 15.8839 7.38388C16.1153 7.15526 16.2512 6.82438 16.247 6.5C16.2264 5.16309 16.1009 3.82618 15.8703 2.48927C15.8422 2.32618 15.8125 2.16309 15.7812 2Z"/>
`;
};

export function Logo(props: LogoProps): HTMLElement {
  const { size = 'md', color = 'brand', animated = true, showText = true, showKeyVisual = false } = props;

  const colorConf = colorConfig[color];

  const container = document.createElement('div');
  container.className = cx(
    getStyle('logo'),
    getStyle(`logo--${size}`),
    getStyle(`logo--${color}`),
    animated && getStyle('logo--animated')
  );

  // Logo text (SYNKIO - S is SVG, rest are text letters)
  if (showText) {
    const textContainer = document.createElement('div');
    textContainer.className = getStyle('logo__text');

    // First letter "S" as SVG with dashed outline (static) and solid S (animated sweep)
    const sContainer = document.createElement('span');
    sContainer.className = cx(getStyle('logo__letter'), getStyle('logo__letterS'));

    const sSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sSvg.setAttribute('viewBox', '0 0 31 36');
    sSvg.classList.add(getStyle('logo__sSvg') || '');
    if (animated) {
      sSvg.classList.add(getStyle('logo__sSvg--animated') || '');
    }

    // Build SVG content: dashed outline only (static, the unique logo mark)
    // S uses vermillion accent color to match the strikethrough
    const sFillColor = color === 'brand' ? 'var(--accent-vermillion)' : colorConf.solidColor;
    sSvg.innerHTML = `
      <g class="logo__dashedOutline" fill="${sFillColor}">
        ${dashedOutlinePaths}
      </g>
    `;

    sContainer.appendChild(sSvg);
    textContainer.appendChild(sContainer);

    // Remaining letters "YNKIO" as text
    const letters = ['y', 'n', 'k', 'i', 'o'];
    letters.forEach((letter, index) => {
      if (letter === 'i') {
        // Special handling for "i" - separate dot that sweeps in vermillion
        const iContainer = document.createElement('span');
        iContainer.className = cx(getStyle('logo__letter'), getStyle('logo__letterI'));

        // The dot
        const dot = document.createElement('span');
        dot.className = getStyle('logo__iDot');
        iContainer.appendChild(dot);

        // The stem (ı - dotless i)
        const stem = document.createElement('span');
        stem.className = getStyle('logo__iStem');
        stem.textContent = 'ı';
        iContainer.appendChild(stem);

        if (color !== 'brand') {
          iContainer.style.color = colorConf.textColor;
        }
        if (color === 'brand') {
          const delay = `${(index + 1) * 0.5}s`;
          iContainer.style.animationDelay = delay;
          dot.style.animationDelay = delay;
        }
        textContainer.appendChild(iContainer);
      } else {
        const span = document.createElement('span');
        span.className = getStyle('logo__letter');
        span.textContent = letter;
        // Set text color based on color config (only if not brand - brand uses CSS animation)
        if (color !== 'brand') {
          span.style.color = colorConf.textColor;
        }
        // Stagger animation delay for each letter (only for brand color)
        // Index + 1 because S is index 0
        if (color === 'brand') {
          span.style.animationDelay = `${(index + 1) * 0.5}s`;
        }
        textContainer.appendChild(span);
      }
    });

    container.appendChild(textContainer);
  }

  // Hero key visual (SVG S) - only shown when explicitly requested
  // Uses raw paths without shadow layer for clean rotation only
  if (showKeyVisual && size === 'hero') {
    const keyVisualContainer = document.createElement('div');
    keyVisualContainer.className = getStyle('logo__keyVisual');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 18 21');
    svg.classList.add(getStyle('logo__keyVisualSvg') || '');
    svg.setAttribute('fill', colorConf.solidColor!);
    // Use raw paths only - no shadow layer for key visual
    svg.innerHTML = sPathsRaw;

    keyVisualContainer.appendChild(svg);
    container.appendChild(keyVisualContainer);
  }

  return container;
}

/**
 * Create a simple logo icon without text
 * @param skipShadow - When true, uses raw paths without shadow layer (for key visual)
 */
export function LogoIcon(size: number = 32, animated: boolean = true, color: LogoColor = 'brand', skipShadow: boolean = false): SVGSVGElement {
  const gradientId = `synkio-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const colorConf = colorConfig[color];

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(Math.round(size * 21 / 18))); // Maintain aspect ratio (18x21)
  svg.setAttribute('viewBox', '0 0 18 21');

  if (animated && !skipShadow) {
    const svgClass = getStyle('logo__svg');
    const animatedClass = getStyle('logo__svg--animated');
    if (svgClass) svg.classList.add(svgClass);
    if (animatedClass) svg.classList.add(animatedClass);
  }

  // Get paths - use raw paths without shadow when skipShadow is true
  const logoPaths = skipShadow ? sPathsRaw : createLogoPaths(animated);

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

/**
 * Create the new S logo icon with dashed outline (static) and solid S (animated sweep)
 * Used for hero key visual
 */
export function NewSLogoIcon(size: number = 400, animated: boolean = true, color: LogoColor = 'brand'): SVGSVGElement {
  const colorConf = colorConfig[color];

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(Math.round(size * 36 / 31))); // Maintain aspect ratio (31x36)
  svg.setAttribute('viewBox', '0 0 31 36');

  const svgClass = getStyle('logo__newS');
  if (svgClass) svg.classList.add(svgClass);
  if (animated) {
    const animatedClass = getStyle('logo__newS--animated');
    if (animatedClass) svg.classList.add(animatedClass);
  }

  // Build SVG content:
  // 1. Solid S (animated with sweep, 30% opacity) - rendered first so it's behind
  // 2. Dashed outline (static, full opacity) - rendered on top
  svg.innerHTML = `
    <g class="logo__solidS" fill="${colorConf.solidColor}" fill-opacity="0.3">
      ${solidSPath}
    </g>
    <g class="logo__dashedOutline" fill="${colorConf.solidColor}">
      ${dashedOutlinePaths}
    </g>
  `;

  return svg;
}
