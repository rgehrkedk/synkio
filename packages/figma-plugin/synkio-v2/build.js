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
      --color-bg: #ffffff;
      --color-bg-secondary: #f5f5f5;
      --color-bg-tertiary: #e8e8e8;
      --color-border: #e0e0e0;
      --color-border-strong: #c0c0c0;
      --color-text: #1a1a1a;
      --color-text-secondary: #666666;
      --color-text-tertiary: #999999;
      --color-primary: #0d99ff;
      --color-primary-hover: #0b85e0;
      --color-success: #14ae5c;
      --color-warning: #f59e0b;
      --color-error: #ef4444;
      --color-added: #14ae5c;
      --color-modified: #f59e0b;
      --color-deleted: #ef4444;
      --color-renamed: #8b5cf6;
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
      --shadow-md: 0 2px 4px rgba(0,0,0,0.1);
      --font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-size-xs: 11px;
      --font-size-sm: 12px;
      --font-size-md: 13px;
      --font-size-lg: 14px;
      --font-size-xl: 16px;
      --font-size-2xl: 20px;
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
