// =============================================================================
// SYNKIO Logo Hover Animation
// =============================================================================
// Handles hover interactions on individual letters, creating a glow effect
// with neighbor spread. Strokes stay active while hovering and fade on leave.
// =============================================================================

import gsap from 'gsap';
import {
  DIM_OPACITY,
  BRIGHT_OPACITY,
} from './animation.config';

// -----------------------------------------------------------------------------
// HOVER CONFIGURATION
// -----------------------------------------------------------------------------

export const HOVER_CONFIG = {
  /** How far strokes scatter (pixels) */
  scatterDistance: 1,

  /** How far the scatter effect spreads (number of strokes) */
  scatterSpread: 4,

  /** Duration of scatter out animation (seconds) */
  scatterOutDuration: 0.9,

  /** Duration of scatter return animation (seconds) */
  scatterReturnDuration: 0.9,

  /** Delay before return starts (ms) - prevents flicker between strokes */
  returnDelay: 1000,

  /** Easing functions */
  ease: {
    out: 'power2.out',
    return: 'elastic.out(1, 0.5)',
  },

  /** Opacity boost for hovered stroke */
  opacity: {
    dim: DIM_OPACITY,
    bright: BRIGHT_OPACITY,
  },
};

// -----------------------------------------------------------------------------
// HOVER ANIMATION CONTROLLER
// -----------------------------------------------------------------------------

export interface HoverAnimationController {
  /** Trigger hover in - strokes light up and stay active */
  hoverIn: () => void;
  /** Trigger hover out - strokes fade back to dim */
  hoverOut: () => void;
  /** Cleanup and destroy */
  destroy: () => void;
}

/**
 * Creates a hover animation controller for a letter's SVG paths.
 * Strokes stay bright while hovering and fade out on mouse leave.
 */
export function createHoverAnimation(
  paths: NodeListOf<SVGPathElement> | SVGPathElement[],
  allPaths?: SVGPathElement[], // Optional: all paths across all letters for cross-letter glow
  sharedState?: { pendingFadeOut: number | null } // Shared state for coordinating between stroke controllers
): HoverAnimationController {
  const pathArray = Array.from(paths);
  let activeTimeline: gsap.core.Timeline | null = null;
  let pendingFadeOutTimeout: number | null = null;

  const config = HOVER_CONFIG;

  // Find the start index of this letter's paths in allPaths
  const getStartIndex = (): number => {
    if (!allPaths || pathArray.length === 0) return 0;
    const firstPath = pathArray[0];
    return allPaths.indexOf(firstPath);
  };

  return {
    hoverIn() {
      // Cancel any pending return animation
      if (sharedState?.pendingFadeOut) {
        clearTimeout(sharedState.pendingFadeOut);
        sharedState.pendingFadeOut = null;
      }
      if (pendingFadeOutTimeout) {
        clearTimeout(pendingFadeOutTimeout);
        pendingFadeOutTimeout = null;
      }

      // Cancel any existing animation
      activeTimeline?.kill();
      activeTimeline = gsap.timeline();

      const targetPaths = allPaths || pathArray;
      const startIndex = getStartIndex();

      // Scatter effect: strokes move away from hovered stroke
      pathArray.forEach((path, i) => {
        const pathIndex = startIndex + i;

        // Brighten the hovered stroke
        activeTimeline!.to(path, {
          opacity: config.opacity.bright,
          duration: config.scatterOutDuration,
          ease: config.ease.out
        }, 0);

        // Scatter neighbors outward
        for (let distance = 1; distance <= config.scatterSpread; distance++) {
          // Distance falloff for scatter amount
          const scatterAmount = config.scatterDistance * (1 - (distance - 1) / config.scatterSpread);
          const prevPath = targetPaths[pathIndex - distance];
          const nextPath = targetPaths[pathIndex + distance];

          // Move previous neighbor to the left (negative X)
          if (prevPath) {
            activeTimeline!.to(prevPath, {
              x: -scatterAmount,
              duration: config.scatterOutDuration,
              ease: config.ease.out
            }, 0);
          }

          // Move next neighbor to the right (positive X)
          if (nextPath) {
            activeTimeline!.to(nextPath, {
              x: scatterAmount,
              duration: config.scatterOutDuration,
              ease: config.ease.out
            }, 0);
          }
        }
      });
    },

    hoverOut() {
      // Delay the return to prevent flicker when moving between strokes
      const performReturn = () => {
        // Cancel any existing animation
        activeTimeline?.kill();
        activeTimeline = gsap.timeline();

        const targetPaths = allPaths || pathArray;
        const startIndex = getStartIndex();

        // Return all affected paths to original position
        pathArray.forEach((path, i) => {
          const pathIndex = startIndex + i;

          // Dim the main path
          activeTimeline!.to(path, {
            opacity: config.opacity.dim,
            duration: config.scatterReturnDuration,
            ease: config.ease.return
          }, 0);

          // Return neighbors to original position
          for (let distance = 1; distance <= config.scatterSpread; distance++) {
            const prevPath = targetPaths[pathIndex - distance];
            const nextPath = targetPaths[pathIndex + distance];

            if (prevPath) {
              activeTimeline!.to(prevPath, {
                x: 0,
                duration: config.scatterReturnDuration,
                ease: config.ease.return
              }, 0);
            }

            if (nextPath) {
              activeTimeline!.to(nextPath, {
                x: 0,
                duration: config.scatterReturnDuration,
                ease: config.ease.return
              }, 0);
            }
          }
        });
      };

      // Use shared state if available, otherwise local timeout
      const timeoutId = window.setTimeout(performReturn, config.returnDelay);
      if (sharedState) {
        sharedState.pendingFadeOut = timeoutId;
      } else {
        pendingFadeOutTimeout = timeoutId;
      }
    },

    destroy() {
      if (pendingFadeOutTimeout) {
        clearTimeout(pendingFadeOutTimeout);
        pendingFadeOutTimeout = null;
      }
      if (sharedState?.pendingFadeOut) {
        clearTimeout(sharedState.pendingFadeOut);
        sharedState.pendingFadeOut = null;
      }
      activeTimeline?.kill();
      activeTimeline = null;
    }
  };
}

// -----------------------------------------------------------------------------
// HOVER EVENT SETUP HELPER
// -----------------------------------------------------------------------------

export interface HoverEventOptions {
  /** The letter container element */
  letterEl: HTMLElement;
  /** All paths in this letter */
  paths: NodeListOf<SVGPathElement> | SVGPathElement[];
  /** Optional: all paths across all letters for cross-letter glow */
  allPaths?: SVGPathElement[];
  /** Whether to animate on individual path hover (default: false, whole letter) */
  perPathHover?: boolean;
}

/**
 * Sets up hover event listeners for a letter element.
 * Returns a cleanup function to remove listeners.
 */
export function setupHoverEvents(options: HoverEventOptions): () => void {
  const { letterEl, paths, allPaths, perPathHover = false } = options;
  const pathArray = Array.from(paths);

  const controller = createHoverAnimation(paths, allPaths);

  if (perPathHover) {
    // Shared state to coordinate fade-out delays across all stroke controllers
    const sharedState = { pendingFadeOut: null as number | null };

    // Individual path hover - create controller per path
    const pathControllers = pathArray.map((_, index) => {
      const singlePathArray = [pathArray[index]];
      return createHoverAnimation(singlePathArray, allPaths, sharedState);
    });

    const handlePathEnter = (e: Event) => {
      const target = e.target as SVGPathElement;
      const index = pathArray.indexOf(target);
      if (index !== -1) {
        pathControllers[index].hoverIn();
      }
    };

    const handlePathLeave = (e: Event) => {
      const target = e.target as SVGPathElement;
      const index = pathArray.indexOf(target);
      if (index !== -1) {
        pathControllers[index].hoverOut();
      }
    };

    pathArray.forEach(path => {
      path.addEventListener('mouseenter', handlePathEnter);
      path.addEventListener('mouseleave', handlePathLeave);
    });

    return () => {
      pathArray.forEach(path => {
        path.removeEventListener('mouseenter', handlePathEnter);
        path.removeEventListener('mouseleave', handlePathLeave);
      });
      pathControllers.forEach(c => c.destroy());
    };
  } else {
    // Whole letter hover
    const handleEnter = () => {
      controller.hoverIn();
    };

    const handleLeave = () => {
      controller.hoverOut();
    };

    letterEl.addEventListener('mouseenter', handleEnter);
    letterEl.addEventListener('mouseleave', handleLeave);

    return () => {
      letterEl.removeEventListener('mouseenter', handleEnter);
      letterEl.removeEventListener('mouseleave', handleLeave);
      controller.destroy();
    };
  }
}
