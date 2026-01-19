// =============================================================================
// AnimatedLetter Component
// Renders individual letters with standalone animation (when not in SynkioLogo)
// =============================================================================

import gsap from 'gsap';
import { LetterDefinition } from './letters';
import styles from './SynkioLogo.module.css';
import {
  DIM_OPACITY,
  BRIGHT_OPACITY,
  STANDALONE,
} from './animation.config';
import { setupHoverEvents } from './hover.animation';

const getStyle = (key: string): string => (styles && styles[key]) || '';

export interface AnimatedLetterProps {
  letter: LetterDefinition;
  name: string;
  animated?: boolean;
}

export interface AnimatedLetterControls {
  play: () => void;
  pause: () => void;
  cleanup: () => void;
  getTimeline: () => gsap.core.Timeline | null;
}

// =============================================================================
// Unique ID Generator
// =============================================================================

let idCounter = 0;
function generateUniqueId(name: string): string {
  return `letter-${name}-${++idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

// =============================================================================
// Reduced Motion Detection
// =============================================================================

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// =============================================================================
// Create SVG Element
// =============================================================================

function createSvg(
  letter: LetterDefinition,
  uniqueId: string,
  name: string
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', letter.viewBox);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', name);
  const letterSvgClass = getStyle('letterSvg');
  if (letterSvgClass) {
    svg.classList.add(letterSvgClass);
  }

  const pathsHtml = letter.shapes.map((shape, index) => {
    return `<path id="${uniqueId}-path-${index}" class="${getStyle('shape')}" d="${shape.path}"/>`;
  }).join('\n');

  svg.innerHTML = pathsHtml;
  return svg;
}

// =============================================================================
// Create Animation
// Uses config from animation.config.ts for consistency
// =============================================================================

function createAnimation(
  svg: SVGSVGElement,
  name: string
): gsap.core.Timeline {
  const paths = svg.querySelectorAll('path');
  if (paths.length === 0) return gsap.timeline({ paused: true });

  const timeline = gsap.timeline({ paused: true });

  gsap.set(paths, { opacity: DIM_OPACITY });

  // Get config based on letter type
  const config = name === 'O' ? STANDALONE.O : STANDALONE.default;

  if (name === 'O') {
    // O letter: Pulse from inner to outer (reverse order for outward expansion)
    const pathsArray = Array.from(paths).reverse();

    pathsArray.forEach((path, index) => {
      const startTime = index * config.stagger;

      // Pulse up
      timeline.to(path, {
        opacity: BRIGHT_OPACITY,
        duration: config.duration * config.timing.rise,
        ease: config.ease.rise
      }, startTime);

      // Pulse down
      timeline.to(path, {
        opacity: DIM_OPACITY,
        duration: config.duration * config.timing.fade,
        ease: config.ease.fade
      }, startTime + config.duration * config.timing.rise);

      // Spread to neighbors
      for (let distance = 1; distance <= config.neighborOpacities.length; distance++) {
        const opacity = config.neighborOpacities[distance - 1];
        const prevPath = pathsArray[index - distance];
        const nextPath = pathsArray[index + distance];

        if (prevPath) {
          timeline.to(prevPath, {
            opacity,
            duration: config.duration * config.neighborTiming.rise,
            ease: config.ease.rise
          }, startTime);
          timeline.to(prevPath, {
            opacity: DIM_OPACITY,
            duration: config.duration * config.neighborTiming.fade,
            ease: config.ease.fade
          }, startTime + config.duration * config.neighborTiming.rise);
        }

        if (nextPath) {
          timeline.to(nextPath, {
            opacity,
            duration: config.duration * config.neighborTiming.rise,
            ease: config.ease.rise
          }, startTime);
          timeline.to(nextPath, {
            opacity: DIM_OPACITY,
            duration: config.duration * config.neighborTiming.fade,
            ease: config.ease.fade
          }, startTime + config.duration * config.neighborTiming.rise);
        }
      }
    });
  } else {
    // Default letters (S, Y, N, K, I): Fast sequential pulse wave
    paths.forEach((path, index) => {
      const startTime = index * config.stagger;

      // Pulse up
      timeline.to(path, {
        opacity: BRIGHT_OPACITY,
        duration: config.duration * config.timing.rise,
        ease: config.ease.rise
      }, startTime);

      // Pulse down
      timeline.to(path, {
        opacity: DIM_OPACITY,
        duration: config.duration * config.timing.fade,
        ease: config.ease.fade
      }, startTime + config.duration * config.timing.rise);

      // Spread to neighbors
      for (let distance = 1; distance <= config.neighborOpacities.length; distance++) {
        const opacity = config.neighborOpacities[distance - 1];
        const prevPath = paths[index - distance];
        const nextPath = paths[index + distance];

        if (prevPath) {
          timeline.to(prevPath, {
            opacity,
            duration: config.duration * config.neighborTiming.rise,
            ease: config.ease.rise
          }, startTime);
          timeline.to(prevPath, {
            opacity: DIM_OPACITY,
            duration: config.duration * config.neighborTiming.fade,
            ease: config.ease.fade
          }, startTime + config.duration * config.neighborTiming.rise);
        }

        if (nextPath) {
          timeline.to(nextPath, {
            opacity,
            duration: config.duration * config.neighborTiming.rise,
            ease: config.ease.rise
          }, startTime);
          timeline.to(nextPath, {
            opacity: DIM_OPACITY,
            duration: config.duration * config.neighborTiming.fade,
            ease: config.ease.fade
          }, startTime + config.duration * config.neighborTiming.rise);
        }
      }
    });
  }

  return timeline;
}

// =============================================================================
// Component
// =============================================================================

export function AnimatedLetter(props: AnimatedLetterProps): HTMLElement {
  const { letter, name, animated = true } = props;
  const uniqueId = generateUniqueId(name);

  const container = document.createElement('span');
  const letterClass = getStyle(`letter--${name}`);
  container.className = [getStyle('letter'), letterClass].filter(Boolean).join(' ');
  container.setAttribute('data-letter', name);

  const svg = createSvg(letter, uniqueId, name);
  container.appendChild(svg);

  // Animation setup
  let timeline: gsap.core.Timeline | null = null;
  let cleanedUp = false;

  if (animated && !prefersReducedMotion()) {
    requestAnimationFrame(() => {
      if (cleanedUp) return;
      timeline = createAnimation(svg, name);
    });
  }

  // Control functions
  const controls: AnimatedLetterControls = {
    play: () => timeline?.play(),
    pause: () => timeline?.pause(),
    cleanup: () => {
      cleanedUp = true;
      timeline?.kill();
      timeline = null;
    },
    getTimeline: () => timeline
  };

  (container as any).__animatedLetterControls = controls;

  // Reduced motion listener
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handleChange = (e: MediaQueryListEvent) => {
    if (e.matches) {
      controls.pause();
      svg.querySelectorAll('path').forEach(p => {
        gsap.set(p, { opacity: 1 });
      });
    }
  };
  mediaQuery.addEventListener('change', handleChange);

  // Hover animation setup
  let cleanupHover: (() => void) | null = null;
  if (!prefersReducedMotion()) {
    requestAnimationFrame(() => {
      if (cleanedUp) return;
      const paths = svg.querySelectorAll('path');
      cleanupHover = setupHoverEvents({
        letterEl: container,
        paths,
        perPathHover: true // Each stroke triggers its own animation
      });
    });
  }

  (container as any).__cleanup = () => {
    controls.cleanup();
    cleanupHover?.();
    mediaQuery.removeEventListener('change', handleChange);
  };

  return container;
}

export default AnimatedLetter;
