# LetterLogo Component

Animated "synkio" wordmark with a color wave effect on the "S" letter.

## Overview

The "S" is composed of 3 SVG paths (top, middle, bottom strokes). Each path uses a vertical gradient with 6 color stops. The animation creates a traveling color wave by sequentially fading each stop in and out.

```
    ┌─────────────┐
    │  TOP STROKE │  ← Phases 1 & 6
    └──────┬──────┘
           │
    ┌──────┴──────┐
    │   MIDDLE    │  ← Phases 2 & 5
    └──────┬──────┘
           │
    ┌──────┴──────┐
    │   BOTTOM    │  ← Phases 3 & 4 (turnaround)
    └─────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `LetterLogo.ts` | Main component, creates SVG with gradients |
| `LetterLogo.animation.ts` | Animation logic using Motion |
| `LetterLogo.module.css` | Styles and color variables |

---

## Tweaking Guide

### 1. Animation Speed

**Location:** `LetterLogo.ts` line ~121

```typescript
animationControls = createLogoAnimation({
  svg: sSvg,
  id: uniqueId,
  duration: 24,  // ← Change this
});
```

| Value | Effect |
|-------|--------|
| `12` | Fast, energetic (2s per phase) |
| `24` | Balanced, default (4s per phase) |
| `36` | Slow, ambient (6s per phase) |

---

### 2. Wave Colors

**Location:** `LetterLogo.module.css` lines 11-21

```css
:root {
  --wave-active: #d4614a;   /* The "lit up" color */
  --wave-inactive: #faf9f7; /* Base color (matches text) */
}

[data-theme="light"] {
  --wave-active: #c4513a;
  --wave-inactive: #18160f;
}
```

The animation reads these CSS variables at the start of each phase, so theme switching works instantly.

---

### 3. Wave Width / Overlap

**Location:** `LetterLogo.animation.ts` line ~212

```typescript
const stepDelay = (phaseDuration / stops.length) * 0.7;  // ← Change 0.7
```

| Value | Effect |
|-------|--------|
| `0.5` | Wide, soft wave (heavy overlap) |
| `0.7` | Balanced (default) |
| `0.9` | Sharp, narrow wave (minimal overlap) |
| `1.0` | No overlap, stops animate sequentially |

---

### 4. Fade Speed

**Location:** `LetterLogo.animation.ts` line ~222

```typescript
const fadeDuration = phaseDuration * 0.2;  // ← Change 0.2
```

| Value | Effect |
|-------|--------|
| `0.1` | Snappy, quick color pop |
| `0.2` | Balanced (default) |
| `0.3` | Gradual fade |
| `0.4` | Very slow, smooth transition |

---

### 5. Easing

**Location:** `LetterLogo.animation.ts` line ~232

```typescript
const easing = 'easeInOut';  // ← Change this
```

| Value | Effect |
|-------|--------|
| `'linear'` | Constant speed, mechanical |
| `'easeIn'` | Slow start, fast end |
| `'easeOut'` | Fast start, slow end |
| `'easeInOut'` | Smooth both ends (default) |
| `[0.42, 0, 0.58, 1]` | Custom cubic-bezier |

---

### 6. Phase Order

**Location:** `LetterLogo.animation.ts` lines ~275-284

```typescript
const getPhaseConfig = (): [SVGStopElement[], boolean] => {
  switch (currentPhase) {
    case 0: return [topStops, true];      // Top, down ↓
    case 1: return [middleStops, false];  // Middle, up ↑
    case 2: return [bottomStops, true];   // Bottom, down ↓
    case 3: return [bottomStops, false];  // Bottom, up ↑ (bounce)
    case 4: return [middleStops, true];   // Middle, down ↓
    case 5: return [topStops, false];     // Top, up ↑
    default: return [topStops, true];
  }
};
```

- First value: which gradient (`topStops`, `middleStops`, `bottomStops`)
- Second value: direction (`true` = down, `false` = up)

**Example: Simple top-to-bottom sweep (no bounce)**
```typescript
case 0: return [topStops, true];
case 1: return [middleStops, true];
case 2: return [bottomStops, true];
case 3: return [topStops, true];      // Loop back
case 4: return [middleStops, true];
case 5: return [bottomStops, true];
```

---

### 7. Number of Gradient Stops

**Location:** `LetterLogo.ts` lines ~57-84

Each gradient has 6 stops by default. More stops = smoother wave, fewer = chunkier.

```html
<linearGradient id="${uniqueId}-gradientTop" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" style="stop-color: var(--wave-inactive)" />
  <stop offset="20%" style="stop-color: var(--wave-inactive)" />
  <stop offset="40%" style="stop-color: var(--wave-inactive)" />
  <stop offset="60%" style="stop-color: var(--wave-inactive)" />
  <stop offset="80%" style="stop-color: var(--wave-inactive)" />
  <stop offset="100%" style="stop-color: var(--wave-inactive)" />
</linearGradient>
```

---

## API

### Props

```typescript
interface LetterLogoProps {
  animated?: boolean;  // Default: true
}
```

### Usage

```typescript
import { LetterLogo } from './components/shared/LetterLogo';

// Animated (default)
container.appendChild(LetterLogo());

// Static
container.appendChild(LetterLogo({ animated: false }));
```

### Cleanup

The component stores a cleanup function for proper unmounting:

```typescript
const logo = LetterLogo();
container.appendChild(logo);

// On unmount:
(logo as any).__cleanupAnimation?.();
```

---

## Dependencies

- **motion** (framer-motion) - Used for color interpolation animation
- CSS variables for theme reactivity

## Accessibility

- Respects `prefers-reduced-motion: reduce`
- Animation stops automatically if user enables reduced motion mid-session
