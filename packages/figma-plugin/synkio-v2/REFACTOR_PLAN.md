# synkio-v2 UI Refactor Plan

## Goals

1. **Native Figma dark/light mode support** - Follow Figma's theme automatically
2. **Component-based architecture** - Each component in its own file with co-located CSS
3. **Zero inline styles** - All styling via CSS classes
4. **Maintainable codebase** - Clear separation of concerns

---

## Phase 1: Figma Native Theme Support

### Current State
- `build.js` defines hardcoded light-mode colors in the HTML template
- `themeColors: true` is already set in `code.ts:16`
- No dark mode support

### Changes

#### 1.1 Update `build.js` HTML template

Replace hardcoded color values with Figma variable mappings:

```css
:root {
  /* Map to Figma's native tokens - auto-updates with theme */
  --color-bg: var(--figma-color-bg);
  --color-bg-secondary: var(--figma-color-bg-secondary);
  --color-bg-tertiary: var(--figma-color-bg-tertiary);
  --color-bg-hover: var(--figma-color-bg-hover);
  --color-bg-pressed: var(--figma-color-bg-pressed);
  --color-bg-inverse: var(--figma-color-bg-inverse);

  --color-border: var(--figma-color-border);
  --color-border-strong: var(--figma-color-border-strong);
  --color-border-selected: var(--figma-color-border-selected);

  --color-text: var(--figma-color-text);
  --color-text-secondary: var(--figma-color-text-secondary);
  --color-text-tertiary: var(--figma-color-text-tertiary);
  --color-text-disabled: var(--figma-color-text-disabled);
  --color-text-onbrand: var(--figma-color-text-onbrand);
  --color-text-brand: var(--figma-color-text-brand);

  --color-icon: var(--figma-color-icon);
  --color-icon-secondary: var(--figma-color-icon-secondary);
  --color-icon-tertiary: var(--figma-color-icon-tertiary);

  --color-primary: var(--figma-color-bg-brand);
  --color-primary-hover: var(--figma-color-bg-brand-hover);
  --color-primary-pressed: var(--figma-color-bg-brand-pressed);
  --color-primary-tertiary: var(--figma-color-bg-brand-tertiary);

  --color-success: var(--figma-color-bg-success);
  --color-success-tertiary: var(--figma-color-bg-success-tertiary);
  --color-warning: var(--figma-color-bg-warning);
  --color-warning-tertiary: var(--figma-color-bg-warning-tertiary);
  --color-error: var(--figma-color-bg-danger);
  --color-error-tertiary: var(--figma-color-bg-danger-tertiary);

  /* Semantic colors for diffs */
  --color-added: var(--figma-color-text-success);
  --color-added-bg: var(--figma-color-bg-success-tertiary);
  --color-modified: var(--figma-color-text-warning);
  --color-modified-bg: var(--figma-color-bg-warning-tertiary);
  --color-deleted: var(--figma-color-text-danger);
  --color-deleted-bg: var(--figma-color-bg-danger-tertiary);
  --color-renamed: var(--figma-color-text-component);
  --color-renamed-bg: var(--figma-color-bg-component-tertiary);

  /* Non-color tokens remain as custom values */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 4px rgba(0,0,0,0.1);

  --font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', Menlo, monospace;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 13px;
  --font-size-lg: 14px;
  --font-size-xl: 16px;
  --font-size-2xl: 20px;

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
}
```

#### 1.2 Replace color-mix() with Figma tertiary tokens

| Current | Replacement |
|---------|-------------|
| `color-mix(in srgb, var(--color-primary) 30%, transparent)` | `var(--color-primary-tertiary)` |
| `color-mix(in srgb, var(--color-success) 15%, transparent)` | `var(--color-success-tertiary)` |
| `color-mix(in srgb, var(--color-warning) 15%, transparent)` | `var(--color-warning-tertiary)` |
| `color-mix(in srgb, var(--color-error) 15%, transparent)` | `var(--color-error-tertiary)` |
| `color-mix(in srgb, var(--color-renamed) 15%, transparent)` | `var(--color-renamed-bg)` |

---

## Phase 2: Directory Structure

### Target Structure

```
src/ui/
├── main.ts                    # Entry point (simplified)
├── router.ts                  # Router only (no layout helpers)
├── icons.ts                   # SVG icons (keep as-is)
│
├── styles/
│   ├── base.css               # Reset, body, scrollbars, focus, animations
│   ├── utilities.css          # Utility classes (text, flex, spacing, etc.)
│   └── index.ts               # CSS injection utility + base styles
│
├── components/
│   ├── index.ts               # Re-exports all components
│   ├── helpers.ts             # el(), text(), clear()
│   │
│   ├── Button/
│   │   ├── Button.ts
│   │   └── Button.css
│   │
│   ├── Card/
│   │   ├── Card.ts
│   │   └── Card.css
│   │
│   ├── Section/
│   │   ├── Section.ts
│   │   └── Section.css
│   │
│   ├── DiffItem/
│   │   ├── DiffItem.ts
│   │   └── DiffItem.css
│   │
│   ├── Checkbox/
│   │   ├── Checkbox.ts
│   │   └── Checkbox.css
│   │
│   ├── Input/
│   │   ├── Input.ts
│   │   └── Input.css
│   │
│   ├── StatusIndicator/
│   │   ├── StatusIndicator.ts
│   │   └── StatusIndicator.css
│   │
│   ├── Spinner/
│   │   ├── Spinner.ts
│   │   └── Spinner.css
│   │
│   ├── EmptyState/
│   │   ├── EmptyState.ts
│   │   └── EmptyState.css
│   │
│   ├── Alert/
│   │   ├── Alert.ts
│   │   └── Alert.css
│   │
│   ├── Header/
│   │   ├── Header.ts
│   │   └── Header.css
│   │
│   ├── IconButton/
│   │   ├── IconButton.ts
│   │   └── IconButton.css
│   │
│   ├── Badge/
│   │   ├── Badge.ts
│   │   └── Badge.css
│   │
│   ├── CommandBox/
│   │   ├── CommandBox.ts
│   │   └── CommandBox.css
│   │
│   └── Divider/
│       ├── Divider.ts
│       └── Divider.css
│
├── layout/
│   ├── index.ts
│   ├── layout.css             # All layout CSS
│   ├── PageLayout.ts
│   ├── ContentArea.ts
│   ├── Footer.ts
│   ├── Row.ts
│   └── Column.ts
│
└── screens/                   # Move screens here for co-location
    ├── index.ts
    ├── home/
    │   ├── HomeScreen.ts
    │   └── HomeScreen.css
    ├── sync/
    │   ├── SyncScreen.ts
    │   └── SyncScreen.css
    ├── apply/
    │   ├── ApplyScreen.ts
    │   └── ApplyScreen.css
    ├── history/
    │   ├── HistoryScreen.ts
    │   └── HistoryScreen.css
    ├── settings/
    │   ├── SettingsScreen.ts
    │   └── SettingsScreen.css
    └── onboarding/
        ├── OnboardingScreen.ts
        └── OnboardingScreen.css
```

---

## Phase 3: Utility CSS Classes

Create utility classes to replace all inline styles. This provides a consistent styling vocabulary.

### `styles/utilities.css`

```css
/* =============================================================================
   Text Utilities
   ============================================================================= */

/* Font sizes */
.text-xs { font-size: var(--font-size-xs); }
.text-sm { font-size: var(--font-size-sm); }
.text-md { font-size: var(--font-size-md); }
.text-lg { font-size: var(--font-size-lg); }
.text-xl { font-size: var(--font-size-xl); }
.text-2xl { font-size: var(--font-size-2xl); }

/* Font weights */
.font-normal { font-weight: var(--font-weight-normal); }
.font-medium { font-weight: var(--font-weight-medium); }
.font-semibold { font-weight: var(--font-weight-semibold); }

/* Font family */
.font-mono { font-family: var(--font-mono); }

/* Text colors */
.text-primary { color: var(--color-text); }
.text-secondary { color: var(--color-text-secondary); }
.text-tertiary { color: var(--color-text-tertiary); }
.text-disabled { color: var(--color-text-disabled); }
.text-brand { color: var(--color-text-brand); }
.text-success { color: var(--color-added); }
.text-warning { color: var(--color-modified); }
.text-error { color: var(--color-deleted); }

/* Text alignment */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }

/* Text decoration */
.line-through { text-decoration: line-through; }
.uppercase { text-transform: uppercase; }
.tracking-wide { letter-spacing: 0.5px; }

/* =============================================================================
   Flexbox Utilities
   ============================================================================= */

.flex { display: flex; }
.inline-flex { display: inline-flex; }
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.flex-wrap { flex-wrap: wrap; }
.flex-1 { flex: 1; }
.flex-shrink-0 { flex-shrink: 0; }
.flex-grow { flex-grow: 1; }

/* Alignment */
.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.items-stretch { align-items: stretch; }

.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }

.self-start { align-self: flex-start; }
.self-center { align-self: center; }
.self-end { align-self: flex-end; }

/* Gaps */
.gap-0 { gap: 0; }
.gap-xs { gap: var(--spacing-xs); }
.gap-sm { gap: var(--spacing-sm); }
.gap-md { gap: var(--spacing-md); }
.gap-lg { gap: var(--spacing-lg); }
.gap-xl { gap: var(--spacing-xl); }
.gap-2xl { gap: var(--spacing-2xl); }

/* =============================================================================
   Spacing Utilities
   ============================================================================= */

/* Margin */
.m-0 { margin: 0; }
.m-xs { margin: var(--spacing-xs); }
.m-sm { margin: var(--spacing-sm); }
.m-md { margin: var(--spacing-md); }
.m-lg { margin: var(--spacing-lg); }
.m-xl { margin: var(--spacing-xl); }

.mt-0 { margin-top: 0; }
.mt-xs { margin-top: var(--spacing-xs); }
.mt-sm { margin-top: var(--spacing-sm); }
.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mt-xl { margin-top: var(--spacing-xl); }

.mb-0 { margin-bottom: 0; }
.mb-xs { margin-bottom: var(--spacing-xs); }
.mb-sm { margin-bottom: var(--spacing-sm); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }
.mb-xl { margin-bottom: var(--spacing-xl); }

.ml-auto { margin-left: auto; }
.mr-auto { margin-right: auto; }
.mx-auto { margin-left: auto; margin-right: auto; }

/* Padding */
.p-0 { padding: 0; }
.p-xs { padding: var(--spacing-xs); }
.p-sm { padding: var(--spacing-sm); }
.p-md { padding: var(--spacing-md); }
.p-lg { padding: var(--spacing-lg); }
.p-xl { padding: var(--spacing-xl); }
.p-2xl { padding: var(--spacing-2xl); }

.px-sm { padding-left: var(--spacing-sm); padding-right: var(--spacing-sm); }
.px-md { padding-left: var(--spacing-md); padding-right: var(--spacing-md); }
.px-lg { padding-left: var(--spacing-lg); padding-right: var(--spacing-lg); }

.py-sm { padding-top: var(--spacing-sm); padding-bottom: var(--spacing-sm); }
.py-md { padding-top: var(--spacing-md); padding-bottom: var(--spacing-md); }
.py-lg { padding-top: var(--spacing-lg); padding-bottom: var(--spacing-lg); }
.py-xl { padding-top: var(--spacing-xl); padding-bottom: var(--spacing-xl); }
.py-2xl { padding-top: var(--spacing-2xl); padding-bottom: var(--spacing-2xl); }

.pt-sm { padding-top: var(--spacing-sm); }
.pt-md { padding-top: var(--spacing-md); }
.pb-sm { padding-bottom: var(--spacing-sm); }

/* =============================================================================
   Background Utilities
   ============================================================================= */

.bg-primary { background: var(--color-bg); }
.bg-secondary { background: var(--color-bg-secondary); }
.bg-tertiary { background: var(--color-bg-tertiary); }
.bg-brand { background: var(--color-primary); }
.bg-success { background: var(--color-success); }
.bg-success-subtle { background: var(--color-success-tertiary); }
.bg-warning { background: var(--color-warning); }
.bg-warning-subtle { background: var(--color-warning-tertiary); }
.bg-error { background: var(--color-error); }
.bg-error-subtle { background: var(--color-error-tertiary); }
.bg-transparent { background: transparent; }

/* =============================================================================
   Border Utilities
   ============================================================================= */

.border { border: 1px solid var(--color-border); }
.border-strong { border: 1px solid var(--color-border-strong); }
.border-t { border-top: 1px solid var(--color-border); }
.border-b { border-bottom: 1px solid var(--color-border); }
.border-dashed { border-style: dashed; }
.border-none { border: none; }

.rounded-sm { border-radius: var(--radius-sm); }
.rounded-md { border-radius: var(--radius-md); }
.rounded-lg { border-radius: var(--radius-lg); }
.rounded-xl { border-radius: var(--radius-xl); }
.rounded-full { border-radius: var(--radius-full); }

/* =============================================================================
   Size Utilities
   ============================================================================= */

.w-full { width: 100%; }
.w-auto { width: auto; }
.h-full { height: 100%; }
.min-h-screen { min-height: 100vh; }

/* Fixed sizes for icons/avatars */
.size-4 { width: 16px; height: 16px; }
.size-5 { width: 20px; height: 20px; }
.size-6 { width: 24px; height: 24px; }
.size-8 { width: 32px; height: 32px; }
.size-10 { width: 40px; height: 40px; }
.size-12 { width: 48px; height: 48px; }
.size-14 { width: 56px; height: 56px; }
.size-16 { width: 64px; height: 64px; }

/* =============================================================================
   Layout Utilities
   ============================================================================= */

.overflow-hidden { overflow: hidden; }
.overflow-auto { overflow: auto; }
.overflow-y-auto { overflow-y: auto; }

.sticky { position: sticky; }
.top-0 { top: 0; }
.z-10 { z-index: 10; }

/* =============================================================================
   Interaction Utilities
   ============================================================================= */

.cursor-pointer { cursor: pointer; }
.cursor-not-allowed { cursor: not-allowed; }
.select-none { user-select: none; }
.pointer-events-none { pointer-events: none; }

.opacity-50 { opacity: 0.5; }
.opacity-0 { opacity: 0; }

/* =============================================================================
   Visual Utilities
   ============================================================================= */

.shadow-sm { box-shadow: var(--shadow-sm); }
.shadow-md { box-shadow: var(--shadow-md); }

.transition { transition: all 0.15s ease; }
.transition-colors { transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease; }

/* =============================================================================
   Screen-specific Component Classes
   ============================================================================= */

/* Status card visual (home screen) */
.status-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xl);
  margin: var(--spacing-lg) 0;
}

.status-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.status-icon-box {
  width: 48px;
  height: 48px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-icon-secondary);
}

/* Workflow card (home screen) */
.workflow-card-title {
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--spacing-xs);
}

.workflow-card-divider {
  width: 40px;
  height: 2px;
  margin-bottom: var(--spacing-sm);
}

.workflow-card-divider--primary {
  background: var(--color-primary);
}

.workflow-card-divider--secondary {
  background: var(--color-renamed);
}

/* Activity item (home screen) */
.activity-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

/* Summary bar (sync/apply screens) */
.summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

/* Or divider (apply screen) */
.or-divider {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin: var(--spacing-sm) 0;
}

.or-divider__line {
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

/* Direction badge (history screen) */
.direction-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.direction-badge--sync {
  background: var(--color-primary-tertiary);
  color: var(--color-text-brand);
}

.direction-badge--apply {
  background: var(--color-renamed-bg);
  color: var(--color-renamed);
}

/* Hero section (onboarding) */
.hero {
  text-align: center;
  padding: var(--spacing-2xl) 0;
}

.hero__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: var(--color-primary);
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-md);
  color: var(--color-text-onbrand);
}

.hero__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-xs);
}

.hero__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* Success indicator */
.success-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--color-success-tertiary);
  border-radius: var(--radius-full);
  margin-bottom: var(--spacing-sm);
  color: var(--color-added);
}

.success-icon-wrapper--lg {
  width: 64px;
  height: 64px;
  margin-bottom: var(--spacing-md);
}

/* GitHub card */
.github-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

/* Date header (history) */
.date-header {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-sm);
}

/* Section title (settings) */
.section-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-md);
}
```

---

## Phase 4: Component Extraction

### Order of Extraction

1. **helpers.ts** - `el()`, `text()`, `clear()` from components.ts
2. **styles/index.ts** - CSS injection utility
3. **styles/base.css** - Move app-level styles from main.ts
4. **styles/utilities.css** - All utility classes
5. **Button/** - Most used component
6. **Card/**
7. **Section/**
8. **Header/**
9. **Input/** and **Checkbox/**
10. **Alert/** and **StatusIndicator/**
11. **Spinner/** and **EmptyState/**
12. **DiffItem/**
13. **IconButton/** - New component for icon-only buttons
14. **Badge/** - New component for direction badges
15. **CommandBox/** - New component for CLI command display
16. **Divider/** - New component for or-dividers
17. **layout/** - Extract from router.ts

### CSS Loading Strategy

Update `build.js` to use esbuild's text loader:

```js
// build.js
const uiResult = await esbuild.build({
  entryPoints: ['src/ui/main.ts'],
  bundle: true,
  loader: { '.css': 'text' },
  // ...
});
```

Each component imports its CSS:

```ts
// Button/Button.ts
import css from './Button.css';
import { registerCSS } from '../styles';

registerCSS('button', css);

export function Button(props: ButtonProps): HTMLButtonElement {
  // ...
}
```

The `registerCSS` utility ensures deduplication:

```ts
// styles/index.ts
const registered = new Set<string>();

export function registerCSS(id: string, css: string): void {
  if (registered.has(id)) return;
  registered.add(id);

  const style = document.createElement('style');
  style.setAttribute('data-component', id);
  style.textContent = css;
  document.head.appendChild(style);
}
```

---

## Phase 5: Screen Refactoring

### Files to Update

Each screen file needs to:
1. Update imports to use new component/layout paths
2. Replace all inline `style=` attributes with utility classes
3. Move screen-specific CSS to co-located `.css` file

### Screen-by-Screen Changes

#### home.ts → screens/home/HomeScreen.ts

**Inline styles to replace:**

| Current | Replacement |
|---------|-------------|
| `style: 'text-align: center;'` | `class: 'text-center'` |
| `style: 'font-size: var(--font-size-xs); color: var(--color-text-tertiary); ...'` | `class: 'text-xs text-tertiary uppercase tracking-wide mb-md'` |
| `style: 'display: flex; align-items: center; justify-content: center; gap: ...'` | `class: 'status-visual'` |
| `style: 'width: 48px; height: 48px; border: 2px solid ...'` | `class: 'status-icon-box'` |
| `style: 'font-weight: 500; margin-bottom: ...'` | `class: 'workflow-card-title'` |
| `style: 'width: 40px; height: 2px; background: var(--color-primary); ...'` | `class: 'workflow-card-divider workflow-card-divider--primary'` |
| Settings button inline styles | Use new `IconButton` component |
| Activity item styles | `class: 'activity-item'` |

#### sync.ts → screens/sync/SyncScreen.ts

**Inline styles to replace:**

| Current | Replacement |
|---------|-------------|
| `style: 'display: flex; align-items: center; justify-content: space-between; ...'` | `class: 'summary-bar'` |
| `style: 'font-size: var(--font-size-sm);'` | `class: 'text-sm'` |
| `style: 'font-weight: 600; color: var(--color-warning);'` | `class: 'font-semibold text-warning'` |
| Footer hint text styles | `class: 'text-xs text-tertiary text-center'` |

#### apply.ts → screens/apply/ApplyScreen.ts

**Inline styles to replace:**

| Current | Replacement |
|---------|-------------|
| GitHub header styles | `class: 'github-header'` |
| `style: 'font-weight: 500;'` | `class: 'font-medium'` |
| Repo info styles | `class: 'text-sm text-secondary mb-md'` |
| Path info styles | `class: 'text-xs text-tertiary font-mono'` |
| Or divider styles | Use new `Divider` component with `or` variant |
| Summary bar styles | `class: 'summary-bar'` |
| Hint styles | `class: 'text-xs text-tertiary text-center'` |

#### history.ts → screens/history/HistoryScreen.ts

**Inline styles to replace:**

| Current | Replacement |
|---------|-------------|
| Date header styles | `class: 'date-header'` |
| Events list styles | `class: 'flex flex-col gap-sm'` |
| Direction badge styles | Use new `Badge` component |
| Time label styles | `class: 'text-sm text-secondary'` |
| User label styles | `class: 'text-sm font-medium'` |
| Changes section styles | `class: 'mt-sm pt-sm border-t'` |
| Paths list styles | `class: 'flex flex-col gap-0 font-mono text-xs text-secondary'` |

#### settings.ts → screens/settings/SettingsScreen.ts

**Inline styles to replace:**

| Current | Replacement |
|---------|-------------|
| Empty collection text styles | `class: 'text-sm text-tertiary py-sm'` |
| Token help link styles | Move to SettingsScreen.css as `.token-help-link` |
| Status element margin | `class: 'mt-sm'` |
| Clear button margin | `class: 'mt-md'` |

#### onboarding.ts → screens/onboarding/OnboardingScreen.ts

**Inline styles to replace:**

| Current | Replacement |
|---------|-------------|
| Hero section styles | `class: 'hero'` |
| Logo wrapper styles | `class: 'hero__logo'` |
| Title styles | `class: 'hero__title'` |
| Subtitle styles | `class: 'hero__subtitle'` |
| Workflow section styles | `class: 'mb-lg'` for first section |
| Step labels | `class: 'font-semibold mb-xs'` |
| Step description | `class: 'text-sm text-secondary mb-sm'` |
| Step code | `class: 'text-xs text-tertiary font-mono'` |
| Success banner | `class: 'text-center py-lg'` |
| Success icon wrapper | `class: 'success-icon-wrapper'` |
| Command box | Use new `CommandBox` component |
| Copy button | Use new `IconButton` component |
| Docs link | `class: 'text-center py-md text-xs text-tertiary'` |

---

## Phase 6: New Components

### IconButton

For icon-only buttons (settings, copy, etc.):

```ts
interface IconButtonProps {
  icon: IconName;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'secondary';
  onClick?: () => void;
  ariaLabel?: string;
}
```

### Badge

For direction badges and status indicators:

```ts
interface BadgeProps {
  variant: 'sync' | 'apply' | 'success' | 'warning' | 'error';
  icon?: IconName;
  label: string;
}
```

### CommandBox

For displaying CLI commands with copy functionality:

```ts
interface CommandBoxProps {
  command: string;
  onCopy?: () => void;
}
```

### Divider

For separators with optional text:

```ts
interface DividerProps {
  text?: string;  // e.g., "or"
  variant?: 'solid' | 'dashed';
}
```

---

## Implementation Checklist

### Phase 1: Theme Support
- [ ] Update `build.js` with Figma variable mappings
- [ ] Remove all `color-mix()` calls, use Figma tertiary tokens
- [ ] Test in Figma with light and dark mode

### Phase 2: Setup Structure
- [ ] Create `src/ui/styles/` directory
- [ ] Create `src/ui/components/` directory
- [ ] Create `src/ui/layout/` directory
- [ ] Create `src/ui/screens/` directory structure
- [ ] Update `build.js` with CSS text loader

### Phase 3: Utilities
- [ ] Create `styles/base.css` from main.ts app styles
- [ ] Create `styles/utilities.css` with all utility classes
- [ ] Create `styles/index.ts` with `registerCSS` utility
- [ ] Test utility classes work correctly

### Phase 4: Extract Components
- [ ] Extract `helpers.ts` (el, text, clear)
- [ ] Extract `Button/`
- [ ] Extract `Card/`
- [ ] Extract `Section/`
- [ ] Extract `Header/`
- [ ] Extract `Input/`
- [ ] Extract `Checkbox/`
- [ ] Extract `Alert/`
- [ ] Extract `StatusIndicator/`
- [ ] Extract `Spinner/`
- [ ] Extract `EmptyState/`
- [ ] Extract `DiffItem/`
- [ ] Create `IconButton/` (new)
- [ ] Create `Badge/` (new)
- [ ] Create `CommandBox/` (new)
- [ ] Create `Divider/` (new)
- [ ] Create `components/index.ts` re-exports

### Phase 5: Extract Layout
- [ ] Create `layout/layout.css`
- [ ] Extract `PageLayout.ts`
- [ ] Extract `ContentArea.ts`
- [ ] Extract `Footer.ts`
- [ ] Extract `Row.ts`
- [ ] Extract `Column.ts`
- [ ] Create `layout/index.ts` re-exports
- [ ] Update `router.ts` (remove layout helpers)

### Phase 6: Refactor Screens
- [ ] Create `screens/home/HomeScreen.ts` and `.css`
- [ ] Create `screens/sync/SyncScreen.ts` and `.css`
- [ ] Create `screens/apply/ApplyScreen.ts` and `.css`
- [ ] Create `screens/history/HistoryScreen.ts` and `.css`
- [ ] Create `screens/settings/SettingsScreen.ts` and `.css`
- [ ] Create `screens/onboarding/OnboardingScreen.ts` and `.css`
- [ ] Create `screens/index.ts` re-exports
- [ ] Remove old `src/screens/` directory
- [ ] Update `main.ts` imports

### Phase 7: Cleanup
- [ ] Remove old `src/ui/components.ts`
- [ ] Verify no inline styles remain (grep for `style:`)
- [ ] Test all screens in Figma
- [ ] Test light/dark mode switching
- [ ] Final build verification

---

## Files Summary

### Files to Delete (after migration)
- `src/ui/components.ts`
- `src/screens/*.ts` (moved to `src/ui/screens/`)

### Files to Modify
- `build.js` - CSS variables + text loader
- `src/ui/main.ts` - Update imports, simplify
- `src/ui/router.ts` - Remove layout helpers

### New Files to Create
- `src/ui/styles/base.css`
- `src/ui/styles/utilities.css`
- `src/ui/styles/index.ts`
- `src/ui/components/helpers.ts`
- `src/ui/components/index.ts`
- `src/ui/components/*/` (15 component folders)
- `src/ui/layout/*.ts` (5 layout helpers)
- `src/ui/layout/layout.css`
- `src/ui/layout/index.ts`
- `src/ui/screens/*/` (6 screen folders with .ts and .css each)
- `src/ui/screens/index.ts`

---

## Testing

After each phase:
1. Run `npm run build` in synkio-v2
2. Open Figma and load the plugin from `manifest.json`
3. Test all screens (home, sync, apply, history, settings, onboarding)
4. Toggle Figma between light and dark mode (Figma menu → Preferences → Theme)
5. Verify all colors update correctly
6. Check for visual regressions

---

## References

- [Figma CSS Variables Documentation](https://developers.figma.com/docs/plugins/css-variables/)
- [Theme Colors Inspector Plugin](https://www.figma.com/community/plugin/1104533141442501061)
- [Full list of Figma color tokens](https://developers.figma.com/docs/plugins/css-variables/#list-of-all-available-color-tokens)
