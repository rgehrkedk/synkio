const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

// HTML template that will include the bundled UI
const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

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

      --color-added: var(--figma-color-text-success);
      --color-added-bg: var(--figma-color-bg-success-tertiary);
      --color-modified: var(--figma-color-text-warning);
      --color-modified-bg: var(--figma-color-bg-warning-tertiary);
      --color-deleted: var(--figma-color-text-danger);
      --color-deleted-bg: var(--figma-color-bg-danger-tertiary);
      --color-renamed: var(--figma-color-text-component);
      --color-renamed-bg: var(--figma-color-bg-component-tertiary);

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

    body {
      font-family: var(--font-family);
      font-size: var(--font-size-md);
      color: var(--color-text);
      background: var(--color-bg);
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }

    #app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
  __UI_SCRIPT__
  </script>
</body>
</html>`;

async function build() {
  // Build the plugin code (runs in Figma's sandbox)
  const codeResult = await esbuild.build({
    entryPoints: ['src/code.ts'],
    bundle: true,
    outfile: 'dist/code.js',
    format: 'iife',
    target: 'es2017',
    minify: !isWatch,
    sourcemap: isWatch ? 'inline' : false,
    logLevel: 'info',
    loader: { '.css': 'text' },
  });

  // Build the UI code
  const uiResult = await esbuild.build({
    entryPoints: ['src/ui/main.ts'],
    bundle: true,
    outfile: 'dist/ui.js',
    format: 'iife',
    target: 'es2017',
    minify: !isWatch,
    sourcemap: isWatch ? 'inline' : false,
    logLevel: 'info',
    loader: { '.css': 'text' },
    write: false,
  });

  // Get the bundled UI script
  const uiScript = uiResult.outputFiles[0].text;

  // Inject into HTML template
  const html = htmlTemplate.replace('__UI_SCRIPT__', uiScript);

  // Write the final HTML
  fs.writeFileSync('dist/ui.html', html);

  console.log('Build complete!');
}

if (isWatch) {
  // Watch mode
  const chokidar = require('chokidar') || null;

  console.log('Watching for changes...');

  // Initial build
  build().catch(console.error);

  // Simple polling-based watch since chokidar may not be available
  let lastBuild = Date.now();
  const srcDir = path.join(__dirname, 'src');

  const checkForChanges = async () => {
    try {
      const files = getAllFiles(srcDir);
      const latestMtime = Math.max(...files.map(f => fs.statSync(f).mtimeMs));

      if (latestMtime > lastBuild) {
        lastBuild = Date.now();
        console.log('\\nRebuilding...');
        await build();
      }
    } catch (e) {
      // Ignore errors during watch
    }
  };

  function getAllFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else if (entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  setInterval(checkForChanges, 500);
} else {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
