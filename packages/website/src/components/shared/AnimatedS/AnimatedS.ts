// =============================================================================
// AnimatedS Component
// Animated "S" letter using SVG strokes + GSAP
// Features a running glow effect using stroke-dashoffset animation
// Based on reference prototype with 3 parallel S-curve strokes
// =============================================================================

import gsap from 'gsap';
import styles from './AnimatedS.module.css';

const getStyle = (key: string): string => (styles && styles[key]) || '';

export interface AnimatedSProps {
  animated?: boolean;
}

export interface AnimatedSControls {
  play: () => void;
  pause: () => void;
  cleanup: () => void;
}

// =============================================================================
// SVG Path Data from stroked-s.svg
// ViewBox: 0 0 44 47
// 3 parallel S-curve strokes (outer, middle, inner)
// =============================================================================

// Outer band (path 3 in stroked-s.svg - outermost S curve)
const strokeOuter = `M7.87549 33.4317C9.39688 34.5836 11.3205 35.4667 13.6463 36.0811C15.9721 36.6954 18.4903 37.0026 21.2008 37.0026C25.0655 37.0026 27.964 36.465 29.8964 35.3899C31.8287 34.3149 32.7949 32.9454 32.7949 31.2816C32.7949 27.5956 29.6341 25.7526 23.3124 25.7526H19.7975C14.5862 25.7526 10.5729 24.6476 7.75745 22.4377C4.93325 20.2278 3.52115 17.2372 3.52115 13.4659C3.52115 9.90785 5.16496 6.94283 8.45257 4.57082C11.7402 2.19027 16.265 1 22.0271 1C25.7694 1 29.2712 1.52475 32.5326 2.57423C35.8027 3.63226 38.5264 5.1169 40.7035 7.02816`;

// Middle band (path 2 in stroked-s.svg)
const strokeMiddle = `M4.25562 36.2475C6.22294 37.9113 8.68428 39.2039 11.6396 40.1254C14.595 41.0384 17.782 41.4949 21.2008 41.4949C26.3246 41.4949 30.3073 40.5222 33.149 38.5768C35.982 36.6314 37.3984 34.1997 37.3984 31.2816C37.3984 28.1587 36.1874 25.7056 33.7654 23.9224C31.3435 22.1391 27.8591 21.2475 23.3124 21.2475H19.7975C15.9328 21.2475 13.0211 20.5777 11.0625 19.2381C9.11272 17.8899 8.1378 15.9659 8.1378 13.4659C8.1378 11.1536 9.32693 9.25086 11.7052 7.75769C14.0835 6.25598 17.5241 5.50513 22.0271 5.50513C25.0874 5.50513 27.9378 5.88909 30.5784 6.657C33.2277 7.42492 35.4267 8.50854 37.1755 9.90786`;

// Inner band (path 1 in stroked-s.svg - innermost S curve)
const strokeInner = `M0.675087 39.0631C3.0621 41.2474 6.05243 42.9497 9.64608 44.1698C13.231 45.3899 17.0826 46 21.2008 46C24.4622 46 27.4307 45.6075 30.1062 44.8225C32.773 44.0461 34.9633 42.9838 36.6771 41.6357C38.3996 40.2961 39.7199 38.7389 40.638 36.9642C41.556 35.198 42.0151 33.3038 42.0151 31.2816C42.0151 26.8618 40.4019 23.3336 37.1755 20.6971C33.9578 18.0691 29.3805 16.7551 23.4436 16.7551H19.7975C17.1919 16.7551 15.3644 16.5034 14.3152 16C13.2659 15.4966 12.7413 14.6519 12.7413 13.4659C12.7413 12.4505 13.4889 11.6186 14.9841 10.9701C16.4792 10.3217 18.8269 9.99744 22.0271 9.99744C27.0285 9.99744 30.8626 10.8933 33.5294 12.6852`;

// =============================================================================
// Unique ID Generator
// =============================================================================

let idCounter = 0;
function generateUniqueId(): string {
  return `animated-s-${++idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

// =============================================================================
// Reduced Motion Detection
// =============================================================================

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// =============================================================================
// Component
// =============================================================================

export function AnimatedS(props: AnimatedSProps = {}): HTMLElement {
  const { animated = true } = props;
  const uniqueId = generateUniqueId();

  const container = document.createElement('span');
  container.className = getStyle('animatedS');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 44 47');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'S');
  svg.classList.add(getStyle('sSvg') || '');

  // Build SVG structure with base strokes + glow overlays
  // Uses stroke-dashoffset animation for the "traveling glow" effect
  svg.innerHTML = `
    <defs>
      <!-- Gradient for glow strokes - travels along the path -->
      <linearGradient id="${uniqueId}-glow-gradient" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="var(--accent-vermillion)"/>
        <stop offset="50%" stop-color="var(--accent-moss)"/>
        <stop offset="100%" stop-color="var(--accent-indigo)"/>
      </linearGradient>
    </defs>

    <!-- Base strokes - text color (always visible) -->
    <path id="${uniqueId}-s1" class="${getStyle('sStroke')}" d="${strokeOuter}"/>
    <path id="${uniqueId}-s2" class="${getStyle('sStroke')}" d="${strokeMiddle}"/>
    <path id="${uniqueId}-s3" class="${getStyle('sStroke')}" d="${strokeInner}"/>

    <!-- Glow overlays - animated with stroke-dashoffset -->
    <path id="${uniqueId}-g1" class="${getStyle('sGlow')}" d="${strokeOuter}" stroke="url(#${uniqueId}-glow-gradient)"/>
    <path id="${uniqueId}-g2" class="${getStyle('sGlow')}" d="${strokeMiddle}" stroke="url(#${uniqueId}-glow-gradient)"/>
    <path id="${uniqueId}-g3" class="${getStyle('sGlow')}" d="${strokeInner}" stroke="url(#${uniqueId}-glow-gradient)"/>
  `;

  container.appendChild(svg);

  // Animation setup
  let masterTimeline: gsap.core.Timeline | null = null;
  let cleanedUp = false;

  if (animated && !prefersReducedMotion()) {
    requestAnimationFrame(() => {
      if (cleanedUp) return;

      // Animation config - spotlight effect
      const config = {
        glowSize: 80,           // Wide spotlight segment
        duration: 3.0,          // Slower travel along path
        ease: 'none'            // Linear for smooth spotlight sweep
      };

      // Get glow elements
      const glows = [
        svg.querySelector(`#${uniqueId}-g1`) as SVGPathElement,
        svg.querySelector(`#${uniqueId}-g2`) as SVGPathElement,
        svg.querySelector(`#${uniqueId}-g3`) as SVGPathElement
      ];

      if (glows.some(g => !g)) return;

      // Get path lengths
      const lengths = glows.map(g => g.getTotalLength());

      // Initialize stroke-dasharray and hide glows
      glows.forEach((g, i) => {
        gsap.set(g, {
          strokeDasharray: `${config.glowSize} ${lengths[i]}`,
          strokeDashoffset: config.glowSize,
          opacity: 0
        });
      });

      // Animate a glow traveling along its stroke
      function travelStroke(index: number, direction: 'down' | 'up'): gsap.core.Timeline {
        const el = glows[index];
        const len = lengths[index];
        const tl = gsap.timeline();

        // Start and end positions for the dash offset
        const start = direction === 'down' ? config.glowSize : -len;
        const end = direction === 'down' ? -len : config.glowSize;

        tl.set(el, { strokeDashoffset: start, opacity: 1 });
        tl.to(el, {
          strokeDashoffset: end,
          duration: config.duration,
          ease: config.ease
        });
        tl.set(el, { opacity: 0 });

        return tl;
      }

      // Master Timeline: outer↓ → middle↑ → inner↓ → middle↑ → loop
      // Use negative offsets to overlap transitions (snappier switches)
      masterTimeline = gsap.timeline({ repeat: -1 });

      masterTimeline.add(travelStroke(0, 'down'));           // Outer band down
      masterTimeline.add(travelStroke(1, 'up'), '-=0.3');    // Middle band up (overlap)
      masterTimeline.add(travelStroke(2, 'down'), '-=0.3');  // Inner band down (overlap)
      masterTimeline.add(travelStroke(1, 'up'), '-=0.3');    // Middle band up (overlap)
    });
  }

  // Cleanup and control functions
  const controls: AnimatedSControls = {
    play: () => masterTimeline?.play(),
    pause: () => masterTimeline?.pause(),
    cleanup: () => {
      cleanedUp = true;
      masterTimeline?.kill();
      masterTimeline = null;
    }
  };

  // Store controls on element for external access
  (container as any).__animatedSControls = controls;

  // Listen for reduced motion changes
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handleChange = (e: MediaQueryListEvent) => {
    if (e.matches) {
      controls.pause();
    }
  };
  mediaQuery.addEventListener('change', handleChange);

  // Store cleanup reference
  (container as any).__cleanup = () => {
    controls.cleanup();
    mediaQuery.removeEventListener('change', handleChange);
  };

  return container;
}

export default AnimatedS;
