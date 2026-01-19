// =============================================================================
// SynkioLogo Component
// Animated "SYNKIO" wordmark using SVG shapes with fill-based glow animation
// Features coordinated animated glow across all letters using GSAP
// =============================================================================

import gsap from 'gsap';
import styles from './SynkioLogo.module.css';
import { AnimatedLetter } from './AnimatedLetter';
import { LETTERS, LetterName } from './letters';
import {
  DIM_OPACITY,
  BRIGHT_OPACITY,
  NEIGHBOR_OPACITIES,
  TIMELINE,
  WARMUP,
  MAIN_PULSE,
  O_LETTER,
  REVERSE_PULSE,
} from './animation.config';
import { setupHoverEvents, HOVER_CONFIG } from './hover.animation';

const getStyle = (key: string): string => (styles && styles[key]) || '';

export interface SynkioLogoProps {
  animated?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  layout?: 'stacked' | 'inline';
  gap?: string;
  letterGaps?: {
    S?: string;
    Y?: string;
    N?: string;
    K?: string;
    I?: string;
  };
}

// =============================================================================
// Component
// =============================================================================

export function SynkioLogo(props: SynkioLogoProps = {}): HTMLElement {
  const { animated = true, size = 'hero', layout = 'stacked', gap, letterGaps } = props;

  const container = document.createElement('div');

  if (gap) {
    container.style.setProperty('--letter-gap', gap);
  }

  if (letterGaps) {
    container.style.setProperty('--letter-gap', '0');
  }

  const sizeClass = getStyle(`synkioLogo--${size}`);
  const layoutClass = getStyle(`synkioLogo--${layout}`);
  const animatedClass = animated ? getStyle('synkioLogo--animated') : '';
  container.className = [getStyle('synkioLogo'), sizeClass, layoutClass, animatedClass].filter(Boolean).join(' ');

  const ALL_LETTERS: LetterName[] = ['S', 'Y', 'N', 'K', 'I', 'O'];
  const ROW1_LETTERS: LetterName[] = ['S', 'Y', 'N'];
  const ROW2_LETTERS: LetterName[] = ['K', 'I', 'O'];

  const letterElements: HTMLElement[] = [];

  const applyLetterGap = (letterEl: HTMLElement, name: LetterName) => {
    if (!letterGaps || name === 'O') return;
    const gapValue = letterGaps[name as keyof typeof letterGaps];
    if (gapValue !== undefined) {
      letterEl.style.setProperty('margin-right', gapValue, 'important');
    }
  };

  if (layout === 'inline') {
    const row = document.createElement('div');
    row.className = getStyle('row');

    ALL_LETTERS.forEach((name) => {
      const letterDef = LETTERS[name];
      const letterEl = AnimatedLetter({
        letter: letterDef,
        name,
        animated
      });
      applyLetterGap(letterEl, name);
      letterElements.push(letterEl);
      row.appendChild(letterEl);
    });

    container.appendChild(row);
  } else {
    const row1 = document.createElement('div');
    row1.className = getStyle('row');
    const row2 = document.createElement('div');
    row2.className = getStyle('row');

    ROW1_LETTERS.forEach((name) => {
      const letterDef = LETTERS[name];
      const letterEl = AnimatedLetter({
        letter: letterDef,
        name,
        animated
      });
      applyLetterGap(letterEl, name);
      letterElements.push(letterEl);
      row1.appendChild(letterEl);
    });

    ROW2_LETTERS.forEach((name) => {
      const letterDef = LETTERS[name];
      const letterEl = AnimatedLetter({
        letter: letterDef,
        name,
        animated
      });
      applyLetterGap(letterEl, name);
      letterElements.push(letterEl);
      row2.appendChild(letterEl);
    });

    container.appendChild(row1);
    container.appendChild(row2);
  }

  // Coordinate animations: unified animation across all letters with cross-letter glow spread
  let masterTimeline: gsap.core.Timeline | null = null;

  if (animated) {
    requestAnimationFrame(() => {
      // Collect all paths across all letters in order
      const allPaths: SVGPathElement[] = [];
      const letterBoundaries: number[] = [];

      letterElements.forEach((el) => {
        letterBoundaries.push(allPaths.length);
        const svg = el.querySelector('svg');
        if (svg) {
          const paths = svg.querySelectorAll('path');
          paths.forEach(p => allPaths.push(p as SVGPathElement));
        }
      });

      if (allPaths.length === 0) return;

      // Set initial state
      gsap.set(allPaths, { opacity: DIM_OPACITY });

      // Create master timeline
      masterTimeline = gsap.timeline({
        repeat: TIMELINE.repeat ? -1 : 0,
        repeatDelay: TIMELINE.repeat ? TIMELINE.repeatDelay : 0,
        delay: TIMELINE.initialDelay
      });

      // Letter boundaries
      const oStartIdx = letterBoundaries[5] || allPaths.length - 3;
      const oPathCount = allPaths.length - oStartIdx;
      const sPathCount = letterBoundaries[1] || 3;

      let currentTime = 0;

      // =========================================================================
      // PHASE 1: S Letter Warm-up
      // =========================================================================
      for (let i = 0; i < sPathCount; i++) {
        const path = allPaths[i];
        const warmUpDelay = i * WARMUP.strokeStagger;

        // Gentle rise
        masterTimeline.to(path, {
          opacity: WARMUP.peakOpacity,
          duration: WARMUP.duration * WARMUP.timing.rise,
          ease: 'power1.inOut'
        }, warmUpDelay);

        // Subtle pulse at peak
        masterTimeline.to(path, {
          opacity: WARMUP.peakOpacity - 0.1,
          duration: WARMUP.duration * WARMUP.timing.pulse,
          ease: 'sine.inOut'
        }, warmUpDelay + WARMUP.duration * WARMUP.timing.rise);

        // Back to dim before main animation
        masterTimeline.to(path, {
          opacity: DIM_OPACITY,
          duration: WARMUP.duration * WARMUP.timing.fade,
          ease: 'power1.in'
        }, warmUpDelay + WARMUP.duration * (WARMUP.timing.rise + WARMUP.timing.pulse));
      }

      // Start main animation after warm-up
      currentTime = WARMUP.duration + WARMUP.gapBeforeMain;

      // =========================================================================
      // PHASE 2: Main Pulse Wave (S, Y, N, K, I) with Scatter
      // =========================================================================
      for (let i = 0; i < oStartIdx; i++) {
        const path = allPaths[i];
        const startTime = currentTime;

        // Main pulse up
        masterTimeline.to(path, {
          opacity: BRIGHT_OPACITY,
          duration: MAIN_PULSE.duration * MAIN_PULSE.timing.rise,
          ease: MAIN_PULSE.ease.rise
        }, startTime);

        // Main pulse down
        masterTimeline.to(path, {
          opacity: DIM_OPACITY,
          duration: MAIN_PULSE.duration * MAIN_PULSE.timing.fade,
          ease: MAIN_PULSE.ease.fade
        }, startTime + MAIN_PULSE.duration * MAIN_PULSE.timing.rise);

        // Spread to neighbors with scatter effect
        for (let distance = 1; distance <= NEIGHBOR_OPACITIES.length; distance++) {
          const opacity = NEIGHBOR_OPACITIES[distance - 1];
          const prevPath = allPaths[i - distance];
          const nextPath = allPaths[i + distance];

          // Calculate scatter amount (only for nearby neighbors)
          const scatterAmount = distance <= HOVER_CONFIG.scatterSpread
            ? HOVER_CONFIG.scatterDistance * (1 - (distance - 1) / HOVER_CONFIG.scatterSpread)
            : 0;

          if (prevPath) {
            masterTimeline.to(prevPath, {
              opacity,
              duration: MAIN_PULSE.duration * MAIN_PULSE.neighborTiming.rise,
              ease: MAIN_PULSE.ease.rise
            }, startTime);
            masterTimeline.to(prevPath, {
              opacity: DIM_OPACITY,
              duration: MAIN_PULSE.duration * MAIN_PULSE.neighborTiming.fade,
              ease: MAIN_PULSE.ease.fade
            }, startTime + MAIN_PULSE.duration * MAIN_PULSE.neighborTiming.rise);

            // Scatter out (move left)
            if (scatterAmount > 0) {
              masterTimeline.to(prevPath, {
                x: -scatterAmount,
                duration: HOVER_CONFIG.scatterOutDuration,
                ease: HOVER_CONFIG.ease.out
              }, startTime);
              // Return to original position
              masterTimeline.to(prevPath, {
                x: 0,
                duration: HOVER_CONFIG.scatterReturnDuration,
                ease: HOVER_CONFIG.ease.return
              }, startTime + HOVER_CONFIG.scatterOutDuration);
            }
          }
          if (nextPath) {
            masterTimeline.to(nextPath, {
              opacity,
              duration: MAIN_PULSE.duration * MAIN_PULSE.neighborTiming.rise,
              ease: MAIN_PULSE.ease.rise
            }, startTime);
            masterTimeline.to(nextPath, {
              opacity: DIM_OPACITY,
              duration: MAIN_PULSE.duration * MAIN_PULSE.neighborTiming.fade,
              ease: MAIN_PULSE.ease.fade
            }, startTime + MAIN_PULSE.duration * MAIN_PULSE.neighborTiming.rise);

            // Scatter out (move right)
            if (scatterAmount > 0) {
              masterTimeline.to(nextPath, {
                x: scatterAmount,
                duration: HOVER_CONFIG.scatterOutDuration,
                ease: HOVER_CONFIG.ease.out
              }, startTime);
              // Return to original position
              masterTimeline.to(nextPath, {
                x: 0,
                duration: HOVER_CONFIG.scatterReturnDuration,
                ease: HOVER_CONFIG.ease.return
              }, startTime + HOVER_CONFIG.scatterOutDuration);
            }
          }
        }

        currentTime += MAIN_PULSE.stagger;
      }

      // =========================================================================
      // PHASE 3: O Letter (Dramatic Finish)
      // =========================================================================
      for (let j = 0; j < oPathCount; j++) {
        const path = allPaths[oStartIdx + j];
        const startTime = currentTime;

        // O pulse up
        masterTimeline.to(path, {
          opacity: BRIGHT_OPACITY,
          duration: O_LETTER.duration * O_LETTER.timing.rise,
          ease: O_LETTER.ease.rise
        }, startTime);

        // O pulse down
        masterTimeline.to(path, {
          opacity: DIM_OPACITY,
          duration: O_LETTER.duration * O_LETTER.timing.fade,
          ease: O_LETTER.ease.fade
        }, startTime + O_LETTER.duration * O_LETTER.timing.rise);

        currentTime += O_LETTER.stagger;
      }

      // =========================================================================
      // PHASE 4: Reverse Pulse (O back to Y - stops before S) with Scatter
      // =========================================================================
      currentTime += REVERSE_PULSE.gapAfterO;

      // Animate in reverse order, but stop before S (index >= sPathCount)
      for (let i = allPaths.length - 1; i >= sPathCount; i--) {
        const path = allPaths[i];
        const startTime = currentTime;

        // Reverse pulse up
        masterTimeline.to(path, {
          opacity: BRIGHT_OPACITY,
          duration: REVERSE_PULSE.duration * REVERSE_PULSE.timing.rise,
          ease: REVERSE_PULSE.ease.rise
        }, startTime);

        // Reverse pulse down
        masterTimeline.to(path, {
          opacity: DIM_OPACITY,
          duration: REVERSE_PULSE.duration * REVERSE_PULSE.timing.fade,
          ease: REVERSE_PULSE.ease.fade
        }, startTime + REVERSE_PULSE.duration * REVERSE_PULSE.timing.rise);

        // Spread to neighbors (in reverse direction) with scatter
        for (let distance = 1; distance <= NEIGHBOR_OPACITIES.length; distance++) {
          const opacity = NEIGHBOR_OPACITIES[distance - 1];
          const prevPath = allPaths[i + distance]; // Note: reversed direction
          const nextPath = allPaths[i - distance];

          // Calculate scatter amount (only for nearby neighbors)
          const scatterAmount = distance <= HOVER_CONFIG.scatterSpread
            ? HOVER_CONFIG.scatterDistance * (1 - (distance - 1) / HOVER_CONFIG.scatterSpread)
            : 0;

          if (prevPath) {
            masterTimeline.to(prevPath, {
              opacity,
              duration: REVERSE_PULSE.duration * REVERSE_PULSE.neighborTiming.rise,
              ease: REVERSE_PULSE.ease.rise
            }, startTime);
            masterTimeline.to(prevPath, {
              opacity: DIM_OPACITY,
              duration: REVERSE_PULSE.duration * REVERSE_PULSE.neighborTiming.fade,
              ease: REVERSE_PULSE.ease.fade
            }, startTime + REVERSE_PULSE.duration * REVERSE_PULSE.neighborTiming.rise);

            // Scatter out (move right - reversed direction)
            if (scatterAmount > 0) {
              masterTimeline.to(prevPath, {
                x: scatterAmount,
                duration: HOVER_CONFIG.scatterOutDuration,
                ease: HOVER_CONFIG.ease.out
              }, startTime);
              masterTimeline.to(prevPath, {
                x: 0,
                duration: HOVER_CONFIG.scatterReturnDuration,
                ease: HOVER_CONFIG.ease.return
              }, startTime + HOVER_CONFIG.scatterOutDuration);
            }
          }
          if (nextPath && i - distance >= sPathCount) {
            // Only animate next path if it's not part of S
            masterTimeline.to(nextPath, {
              opacity,
              duration: REVERSE_PULSE.duration * REVERSE_PULSE.neighborTiming.rise,
              ease: REVERSE_PULSE.ease.rise
            }, startTime);
            masterTimeline.to(nextPath, {
              opacity: DIM_OPACITY,
              duration: REVERSE_PULSE.duration * REVERSE_PULSE.neighborTiming.fade,
              ease: REVERSE_PULSE.ease.fade
            }, startTime + REVERSE_PULSE.duration * REVERSE_PULSE.neighborTiming.rise);

            // Scatter out (move left - reversed direction)
            if (scatterAmount > 0) {
              masterTimeline.to(nextPath, {
                x: -scatterAmount,
                duration: HOVER_CONFIG.scatterOutDuration,
                ease: HOVER_CONFIG.ease.out
              }, startTime);
              masterTimeline.to(nextPath, {
                x: 0,
                duration: HOVER_CONFIG.scatterReturnDuration,
                ease: HOVER_CONFIG.ease.return
              }, startTime + HOVER_CONFIG.scatterOutDuration);
            }
          }
        }

        currentTime += REVERSE_PULSE.stagger;
      }

      // =========================================================================
      // PHASE 5: S Letter Cool-down (mirrors warm-up) with Scatter
      // =========================================================================
      currentTime += WARMUP.gapBeforeMain; // Small gap before S cool-down

      // Animate S strokes in reverse order (last stroke first)
      for (let i = sPathCount - 1; i >= 0; i--) {
        const path = allPaths[i];
        const coolDownDelay = (sPathCount - 1 - i) * WARMUP.strokeStagger;
        const startTime = currentTime + coolDownDelay;

        // Gentle rise
        masterTimeline.to(path, {
          opacity: WARMUP.peakOpacity,
          duration: WARMUP.duration * WARMUP.timing.rise,
          ease: 'power1.inOut'
        }, startTime);

        // Subtle pulse at peak
        masterTimeline.to(path, {
          opacity: WARMUP.peakOpacity - 0.1,
          duration: WARMUP.duration * WARMUP.timing.pulse,
          ease: 'sine.inOut'
        }, startTime + WARMUP.duration * WARMUP.timing.rise);

        // Fade back to dim
        masterTimeline.to(path, {
          opacity: DIM_OPACITY,
          duration: WARMUP.duration * WARMUP.timing.fade,
          ease: 'power1.in'
        }, startTime + WARMUP.duration * (WARMUP.timing.rise + WARMUP.timing.pulse));

        // Scatter neighbors (in reverse direction since we're going backward)
        for (let distance = 1; distance <= HOVER_CONFIG.scatterSpread; distance++) {
          const scatterAmount = HOVER_CONFIG.scatterDistance * (1 - (distance - 1) / HOVER_CONFIG.scatterSpread);
          const prevPath = allPaths[i + distance]; // Paths after current (toward Y)
          const nextPath = allPaths[i - distance]; // Paths before current (toward start of S)

          // Scatter path toward Y (move right)
          if (prevPath) {
            masterTimeline.to(prevPath, {
              x: scatterAmount,
              duration: HOVER_CONFIG.scatterOutDuration,
              ease: HOVER_CONFIG.ease.out
            }, startTime);
            masterTimeline.to(prevPath, {
              x: 0,
              duration: HOVER_CONFIG.scatterReturnDuration,
              ease: HOVER_CONFIG.ease.return
            }, startTime + HOVER_CONFIG.scatterOutDuration);
          }

          // Scatter path toward start of S (move left)
          if (nextPath) {
            masterTimeline.to(nextPath, {
              x: -scatterAmount,
              duration: HOVER_CONFIG.scatterOutDuration,
              ease: HOVER_CONFIG.ease.out
            }, startTime);
            masterTimeline.to(nextPath, {
              x: 0,
              duration: HOVER_CONFIG.scatterReturnDuration,
              ease: HOVER_CONFIG.ease.return
            }, startTime + HOVER_CONFIG.scatterOutDuration);
          }
        }
      }

      // =========================================================================
      // HOVER ANIMATION SETUP (cross-letter glow)
      // =========================================================================
      const hoverCleanups: (() => void)[] = [];

      letterElements.forEach((letterEl) => {
        const svg = letterEl.querySelector('svg');
        if (!svg) return;

        const paths = svg.querySelectorAll('path');
        const cleanup = setupHoverEvents({
          letterEl,
          paths,
          allPaths, // Pass all paths for cross-letter glow spread
          perPathHover: true // Each stroke triggers its own animation
        });
        hoverCleanups.push(cleanup);
      });

      // Store hover cleanups for later
      (container as any).__hoverCleanups = hoverCleanups;
    });
  }

  // Cleanup function
  (container as any).__cleanupAnimation = () => {
    masterTimeline?.kill();
    masterTimeline = null;

    // Clean up hover animations
    const hoverCleanups = (container as any).__hoverCleanups as (() => void)[] | undefined;
    hoverCleanups?.forEach(cleanup => cleanup());

    letterElements.forEach(el => {
      const cleanup = (el as any).__cleanup;
      if (cleanup) cleanup();
    });
  };

  return container;
}

export default SynkioLogo;
