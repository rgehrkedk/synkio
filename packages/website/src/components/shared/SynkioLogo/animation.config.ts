// =============================================================================
// SYNKIO Logo Animation Configuration
// =============================================================================
// Central configuration for all animation timing, opacity, and easing values.
// Both SynkioLogo (coordinated multi-letter) and AnimatedLetter (standalone)
// components consume these values for consistency.
// =============================================================================

// -----------------------------------------------------------------------------
// GLOBAL SETTINGS
// -----------------------------------------------------------------------------

/** Base opacity when a path is "dim" (not actively pulsing) */
export const DIM_OPACITY = 0.4;

/** Peak opacity when a path is fully "bright" (at pulse peak) */
export const BRIGHT_OPACITY = 1;

/**
 * Neighbor opacity falloff - how bright adjacent paths glow when a path pulses.
 * Index 0 = immediate neighbor, Index 7 = 8th neighbor away.
 * Creates the "glow spread" effect across paths.
 */
export const NEIGHBOR_OPACITIES = [0.85, 0.72, 0.6, 0.5, 0.42, 0.36, 0.32, 0.28];

// -----------------------------------------------------------------------------
// TIMELINE SETTINGS (SynkioLogo coordinated animation)
// -----------------------------------------------------------------------------

export const TIMELINE = {
  /** Delay before animation starts (seconds) */
  initialDelay: 1.2,

  /** Whether to repeat the animation (false = run once) */
  repeat: false,

  /** Delay between loop repetitions (seconds) - only used if repeat is true */
  repeatDelay: 10.5,
};

// -----------------------------------------------------------------------------
// S LETTER WARM-UP
// -----------------------------------------------------------------------------
// The "S" has a gentle glow build-up before the main pulse wave begins.
// This creates anticipation and draws attention to the start of the animation.
// -----------------------------------------------------------------------------

export const WARMUP = {
  /** Total duration of the warm-up phase (seconds) */
  duration: 0.8,

  /** Peak opacity during warm-up (softer than main pulse) */
  peakOpacity: 0.4,

  /** Stagger between each S stroke starting its warm-up (seconds) */
  strokeStagger: 0.1,

  /** Timing ratios for warm-up phases */
  timing: {
    /** Rise to peak (percentage of duration) */
    rise: 0.6,
    /** Subtle pulse at peak (percentage of duration) */
    pulse: 0.2,
    /** Fade back to dim (percentage of duration) */
    fade: 0.2,
  },

  /** Gap after warm-up before main animation starts (seconds) */
  gapBeforeMain: 0.15,
};

// -----------------------------------------------------------------------------
// MAIN PULSE (S, Y, N, K, I letters)
// -----------------------------------------------------------------------------
// Fast sequential pulse wave that travels through all paths.
// Creates a flowing "energy" effect across the wordmark.
// -----------------------------------------------------------------------------

export const MAIN_PULSE = {
  /** Duration of each individual path's pulse (seconds) */
  duration: 0.32,

  /** Time between each path starting its pulse (seconds) */
  stagger: 0.055,

  /** Timing ratios for pulse phases */
  timing: {
    /** Rise to bright (percentage of duration) */
    rise: 0.35,
    /** Fade back to dim (percentage of duration) */
    fade: 0.65,
  },

  /** Timing ratios for neighbor glow spread */
  neighborTiming: {
    /** Rise duration (percentage of main duration) */
    rise: 0.3,
    /** Fade duration (percentage of main duration) */
    fade: 0.5,
  },

  /** Easing functions */
  ease: {
    rise: 'sine.out',
    fade: 'sine.inOut',
  },
};

// -----------------------------------------------------------------------------
// O LETTER (Dramatic Finish)
// -----------------------------------------------------------------------------
// The "O" pulses from inner to outer rings with a slower, more dramatic timing.
// Serves as the visual "landing" of the animation.
// -----------------------------------------------------------------------------

export const O_LETTER = {
  /** Duration of each ring's pulse (seconds) */
  duration: 0.9,

  /** Time between each ring starting its pulse (seconds) */
  stagger: 0.08,

  /**
   * Custom neighbor opacities for O (can differ from global).
   * Slightly higher values for more visible glow on the circular rings.
   */
  neighborOpacities: [0.95, 0.82, 0.76, 0.65, 0.52, 0.46, 0.32, 0.28],

  /** Timing ratios for O pulse phases */
  timing: {
    /** Rise to bright (percentage of duration) */
    rise: 0.4,
    /** Fade back to dim (percentage of duration) */
    fade: 0.6,
  },

  /** Timing ratios for neighbor glow spread */
  neighborTiming: {
    /** Rise duration (percentage of main duration) */
    rise: 0.3,
    /** Fade duration (percentage of main duration) */
    fade: 0.5,
  },

  /** Easing functions */
  ease: {
    rise: 'power2.out',
    fade: 'power1.inOut',
  },
};

// -----------------------------------------------------------------------------
// REVERSE PULSE (O back to S)
// -----------------------------------------------------------------------------
// After the forward animation completes, the pulse travels back from O to S.
// Uses slightly different timing for visual variety.
// -----------------------------------------------------------------------------

export const REVERSE_PULSE = {
  /** Gap after O finishes before reverse starts (seconds) */
  gapAfterO: 0.3,

  /** Duration of each individual path's pulse (seconds) */
  duration: 0.28,

  /** Time between each path starting its pulse (seconds) */
  stagger: 0.045,

  /** Timing ratios for pulse phases */
  timing: {
    rise: 0.35,
    fade: 0.65,
  },

  /** Timing ratios for neighbor glow spread */
  neighborTiming: {
    rise: 0.3,
    fade: 0.5,
  },

  /** Easing functions */
  ease: {
    rise: 'sine.out',
    fade: 'sine.inOut',
  },
};

// -----------------------------------------------------------------------------
// STANDALONE LETTER ANIMATION (AnimatedLetter component)
// -----------------------------------------------------------------------------
// Used when letters are rendered individually (not in SynkioLogo).
// Slightly different timing since there's no cross-letter coordination.
// -----------------------------------------------------------------------------

export const STANDALONE = {
  /** Default letters (S, Y, N, K, I) - same as main pulse but with adjusted stagger */
  default: {
    duration: 0.12,
    stagger: 0.06, // Slightly slower since no cross-letter flow
    neighborOpacities: [0.95, 0.72, 0.6, 0.5, 0.42, 0.36, 0.32, 0.28],
    timing: {
      rise: 0.35,
      fade: 0.65,
    },
    neighborTiming: {
      rise: 0.3,
      fade: 0.5,
    },
    ease: {
      rise: 'sine.out',
      fade: 'sine.inOut',
    },
  },

  /** O letter standalone - uses O_LETTER config */
  O: O_LETTER,
};
