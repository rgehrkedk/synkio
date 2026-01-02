# Build Options

Configure build scripts, CSS generation, and automation for the `synkio build` command.

## Full Configuration

```json
{
  "build": {
    "autoRun": false,
    "script": "npm run build:tokens",
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

## Options Reference

| Option | Default | Description |
|--------|---------|-------------|
| `autoRun` | `false` | Run build script without prompting |
| `script` | - | Custom build command to run after token generation |
| `css` | - | Built-in CSS custom properties generation |

## Custom Build Scripts

The `build.script` option integrates any build tool into your workflow:

```json
{
  "build": {
    "script": "npm run build:tokens"
  }
}
```

### Common Integrations

**Style Dictionary:**

```json
{
  "build": {
    "script": "npx style-dictionary build --config sd.config.js"
  }
}
```

**Token Transformer:**

```json
{
  "build": {
    "script": "npx token-transformer tokens build/tokens.json"
  }
}
```

**Chained Commands:**

```json
{
  "build": {
    "script": "npm run tokens:process && npm run tokens:validate"
  }
}
```

## Auto-Run

By default, Synkio prompts before running the build script. Enable auto-run for CI environments:

```json
{
  "build": {
    "autoRun": true,
    "script": "npm run build:tokens"
  }
}
```

::: tip CI Usage
Always set `autoRun: true` in CI/CD pipelines where interactive prompts aren't available.
:::

## CSS Generation

Generate CSS custom properties directly from Synkio without external tools.

### Basic CSS Output

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

### CSS Options

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Enable CSS generation |
| `dir` | `tokens.dir` | Output directory for CSS files |
| `file` | `tokens.css` | Main CSS filename |
| `utilities` | `false` | Generate utility classes |
| `utilitiesFile` | `utilities.css` | Utilities filename |
| `transforms.useRem` | `false` | Convert px to rem units |
| `transforms.basePxFontSize` | `16` | Base font size for rem conversion |

### Custom Output Location

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

### Rem Transforms

Convert pixel values to rem for better accessibility:

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

**Output with `useRem: false` (default):**

```css
--spacing-md: 16px;
--font-size-lg: 24px;
```

**Output with `useRem: true`:**

```css
--spacing-md: 1rem;
--font-size-lg: 1.5rem;
```

### Utility Classes

Generate utility classes alongside custom properties:

```json
{
  "build": {
    "css": {
      "enabled": true,
      "utilities": true,
      "utilitiesFile": "utilities.css"
    }
  }
}
```

**Generated utilities.css:**

```css
/* Color utilities */
.text-primary { color: var(--color-primary); }
.bg-primary { background-color: var(--color-primary); }

/* Spacing utilities */
.p-sm { padding: var(--spacing-sm); }
.m-md { margin: var(--spacing-md); }
```

### Theme Support

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

Toggle themes in your application:

```js
document.documentElement.dataset.theme = 'dark';
```

## Build Pipeline

The complete build pipeline runs these steps in order:

```
baseline.json
     │
     ├──▶ Split tokens by mode/group/none
     │
     ├──▶ Merge styles (if configured)
     │
     ├──▶ Write token JSON files
     │
     ├──▶ Generate CSS (if build.css.enabled)
     │
     ├──▶ Generate docs (if docsPages.enabled)
     │
     └──▶ Run build.script (if configured)
```

## Example: Complete Setup with Style Dictionary

1. **Install Style Dictionary:**

```bash
npm install style-dictionary --save-dev
```

2. **Create Style Dictionary config:**

```js
// sd.config.js
export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables'
      }]
    },
    scss: {
      transformGroup: 'scss',
      buildPath: 'dist/',
      files: [{
        destination: '_tokens.scss',
        format: 'scss/variables'
      }]
    }
  }
}
```

3. **Add npm script:**

```json
{
  "scripts": {
    "build:tokens": "style-dictionary build --config sd.config.js"
  }
}
```

4. **Configure Synkio:**

```json
{
  "build": {
    "autoRun": true,
    "script": "npm run build:tokens"
  }
}
```

Now `synkio build` will:
1. Generate DTCG JSON token files
2. Run Style Dictionary to output CSS/SCSS

## Choosing: Built-in CSS vs Style Dictionary

| Feature | `build.css` | Style Dictionary |
|---------|-------------|------------------|
| Setup | Zero config | Requires config file |
| Platforms | CSS only | CSS, SCSS, iOS, Android, etc. |
| Customization | Limited | Highly customizable |
| Dependencies | None | Additional package |
| Best for | Simple projects | Multi-platform, complex needs |

::: tip
Start with `build.css` for simple projects. Migrate to Style Dictionary when you need multi-platform output or custom transforms.
:::
