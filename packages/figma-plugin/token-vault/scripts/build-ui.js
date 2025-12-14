/**
 * Build script for UI
 * Bundles UI JavaScript and CSS, then copies files to dist
 */

const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');

async function buildUI() {
  console.log('Building UI...');

  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  // Bundle UI JavaScript
  await build({
    entryPoints: ['src/ui/index.ts'],
    bundle: true,
    outfile: 'dist/ui.js',
    target: 'es2017',
    format: 'iife',
    sourcemap: 'inline',  // Inline to avoid CSP issues
  });

  console.log('✓ UI JavaScript bundled');

  // Read CSS files and concatenate - include all component CSS
  const cssFiles = [
    'src/ui/styles/base.css',
    'src/ui/styles/tabs.css',
    'src/ui/styles/components.css',
    'src/ui/styles/baseline-confirmation.css',
    'src/ui/styles/sync-changes.css',
    'src/ui/styles/import-changes.css',
    'src/ui/styles/structure-preview.css',
    'src/ui/styles/level-selector.css',
    'src/ui/styles/file-grouping.css',
    'src/ui/styles/live-preview.css'
  ];

  let cssContent = '';
  for (const file of cssFiles) {
    if (fs.existsSync(file)) {
      cssContent += fs.readFileSync(file, 'utf8') + '\n';
    } else {
      console.warn(`Warning: CSS file not found: ${file}`);
    }
  }

  // Write concatenated CSS to dist for reference
  fs.writeFileSync('dist/ui-styles.css', cssContent);

  console.log('✓ CSS concatenated and written to dist/ui-styles.css');

  // Read bundled JS
  const jsContent = fs.readFileSync('dist/ui.js', 'utf8');

  // Read HTML template
  let htmlContent = fs.readFileSync('src/ui.html', 'utf8');

  // Inline CSS - replace the link tag
  htmlContent = htmlContent.replace(
    '<link rel="stylesheet" href="dist/ui-styles.css">',
    `<style>\n${cssContent}\n  </style>`
  );

  // Remove any existing script tags
  htmlContent = htmlContent.replace(/<script[^>]*src=["']dist\/ui\.js["'][^>]*><\/script>/g, '');

  // Inline JS - add script tag before closing body
  htmlContent = htmlContent.replace(
    '</body>',
    `<script>\n${jsContent}\n  </script>\n</body>`
  );

  // Write final ui.html to root (Figma expects it at root)
  fs.writeFileSync('ui.html', htmlContent);

  console.log('✓ ui.html created with inlined CSS and JS');

  console.log('✓ UI built successfully');
}

buildUI().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
