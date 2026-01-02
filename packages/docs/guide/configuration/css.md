# CSS Options

Generate CSS custom properties and utility classes.

## Options

```json
{
  "build": {
    "css": {
      "enabled": true,
      "dir": "src/styles",
      "file": "tokens.css",
      "utilities": true,
      "utilitiesFile": "utilities.css",
      "transforms": {
        "useRem": true,
        "basePxFontSize": 16
      }
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Generate CSS custom properties |
| `dir` | `tokens.dir` | CSS output directory |
| `file` | `tokens.css` | CSS output filename |
| `utilities` | `false` | Generate utility classes |
| `utilitiesFile` | `utilities.css` | Utilities filename |
| `transforms.useRem` | `false` | Use rem units instead of px |
| `transforms.basePxFontSize` | `16` | Base font size for rem calculations |

## Basic Usage

Enable CSS generation:

```json
{
  "build": {
    "css": {
      "enabled": true
    }
  }
}
```

This generates `tokens.css` in your tokens directory:

```css
:root {
  --color-primary: #0066cc;
  --color-secondary: #00cc66;
  --spacing-sm: 8px;
  --spacing-md: 16px;
}
```

## Custom Output Location

Specify output directory and filename:

```json
{
  "build": {
    "css": {
      "enabled": true,
      "dir": "src/styles",
      "file": "design-tokens.css"
    }
  }
}
```

## Rem Transforms

Convert pixel values to rem:

```json
{
  "build": {
    "css": {
      "enabled": true,
      "transforms": {
        "useRem": true,
        "basePxFontSize": 16
      }
    }
  }
}
```

With `useRem: false` (default):

```css
--spacing-md: 16px;
--font-size-lg: 24px;
```

With `useRem: true`:

```css
--spacing-md: 1rem;
--font-size-lg: 1.5rem;
```

## Utility Classes

Generate utility classes for common properties:

```json
{
  "build": {
    "css": {
      "enabled": true,
      "utilities": true
    }
  }
}
```

This generates `utilities.css`:

```css
/* Color utilities */
.text-primary { color: var(--color-primary); }
.bg-primary { background-color: var(--color-primary); }

/* Spacing utilities */
.p-sm { padding: var(--spacing-sm); }
.m-md { margin: var(--spacing-md); }
```

## Theme Support

CSS output includes theme variants based on your modes:

```css
:root {
  /* Default (first mode) */
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
}

[data-theme="dark"] {
  --color-bg: #1a1a1a;
  --color-text: #ffffff;
}
```

Toggle themes in your app:

```js
document.documentElement.dataset.theme = 'dark';
```

## Full Example

```json
{
  "build": {
    "css": {
      "enabled": true,
      "dir": "src/styles",
      "file": "tokens.css",
      "utilities": true,
      "utilitiesFile": "utilities.css",
      "transforms": {
        "useRem": true,
        "basePxFontSize": 16
      }
    }
  }
}
```

Output:

```
src/styles/
├── tokens.css       # CSS custom properties
└── utilities.css    # Utility classes
```
