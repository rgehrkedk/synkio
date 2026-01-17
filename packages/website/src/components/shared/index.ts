// =============================================================================
// Shared Components
// Export all shared components from a single entry point
// =============================================================================

// Button (from Button/ directory with CSS modules)
export { Button } from './Button';
export type { ButtonProps } from './Button';

// CodeBlock (from CodeBlock/ directory with CSS modules)
export { CodeBlock } from './CodeBlock';
export type { CodeBlockProps } from './CodeBlock';

// Icon (from Icon/ directory with CSS modules)
export { Icon, IconWrapper } from './Icon';
export type { IconName, IconSize } from './Icon';

// Logo (from Logo/ directory with CSS modules)
export { Logo, LogoIcon } from './Logo';
export type { LogoProps } from './Logo';

// LetterLogo (Monoton display wordmark with animated "s")
export { LetterLogo } from './LetterLogo';
export type { LetterLogoProps } from './LetterLogo';

// AnimatedS (GSAP-powered running glow animation on S letter)
export { AnimatedS } from './AnimatedS';
export type { AnimatedSProps, AnimatedSControls } from './AnimatedS';

// Icons (SVG string-based icons for inline use)
export { icons, createIcon } from './icons';
