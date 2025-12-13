/**
 * Main build script for the plugin
 * Builds both backend and UI
 */

const { build } = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function buildPlugin() {
  console.log('Building Token Vault plugin...\n');

  // Build backend (code.ts)
  console.log('[1/3] Building backend...');
  await build({
    entryPoints: ['src/code.ts'],
    bundle: true,
    outfile: 'code.js',
    target: 'es2017',
    format: 'esm',
    sourcemap: 'inline',  // Inline to avoid CSP issues
    external: ['figma']
  });
  console.log('✓ Backend built: code.js\n');

  // Build UI using build-ui.js
  console.log('[2/3] Building UI...');
  try {
    execSync('node scripts/build-ui.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('UI build failed:', error.message);
    process.exit(1);
  }

  // Copy manifest
  console.log('[3/3] Copying manifest...');
  if (fs.existsSync('manifest.json')) {
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist');
    }
    fs.copyFileSync('manifest.json', 'dist/manifest.json');
    console.log('✓ Manifest copied\n');
  }

  console.log('Build complete!');
}

buildPlugin().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
