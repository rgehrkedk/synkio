// =============================================================================
// LetterLogo Component
// Animated "synkio" wordmark using Monoton display font
// Features animated running glow on the "S" using GSAP (AnimatedS component)
// =============================================================================

import styles from './LetterLogo.module.css';
import { AnimatedS } from '../AnimatedS';

const getStyle = (key: string): string => (styles && styles[key]) || '';

export interface LetterLogoProps {
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

// =============================================================================
// Component
// =============================================================================

export function LetterLogo(props: LetterLogoProps = {}): HTMLElement {
  const { animated = true, size = 'hero' } = props;

  const container = document.createElement('div');
  const sizeClass = getStyle(`letterLogo--${size}`);
  container.className = `${getStyle('letterLogo')} ${sizeClass} ${animated ? getStyle('letterLogo--animated') : ''}`.trim();

  // Create the word "synkio" with special handling for "s"
  const word = document.createElement('div');
  word.className = getStyle('word');

  // Letter "s" - using the new AnimatedS component with GSAP animation
  const sContainer = document.createElement('span');
  sContainer.className = getStyle('letterS');
  const animatedS = AnimatedS({ animated });
  sContainer.appendChild(animatedS);
  word.appendChild(sContainer);

  // Remaining letters "ynkio"
  const letters = ['y', 'n', 'k', 'i', 'o'];
  letters.forEach((letter, index) => {
    const span = document.createElement('span');
    span.className = getStyle('letter');
    span.textContent = letter;
    span.style.animationDelay = `${(index + 1) * 0.1}s`;
    word.appendChild(span);
  });

  container.appendChild(word);

  // Store cleanup function on element for external access
  (container as any).__cleanupAnimation = () => {
    const cleanup = (animatedS as any).__cleanup;
    if (cleanup) cleanup();
  };

  return container;
}

export default LetterLogo;
