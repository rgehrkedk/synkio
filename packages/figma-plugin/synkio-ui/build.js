const esbuild = require('esbuild');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

// Inline shared code directly (avoiding external dependencies)
const sharedCode = `
// Inlined from @synkio/shared
${fs.readFileSync('../../shared/src/types.ts', 'utf8')}
${fs.readFileSync('../../shared/src/chunking.ts', 'utf8')}
${fs.readFileSync('../../shared/src/history.ts', 'utf8')}
${fs.readFileSync('../../shared/src/compare.ts', 'utf8')}
`;

// Write temporary bundled shared code
fs.writeFileSync('shared.ts', sharedCode);

const buildOptions = {
  entryPoints: ['code.ts', 'ui.ts'],
  bundle: true,
  outdir: '.',
  target: 'es2015',
  logLevel: 'info',
};

async function build() {
  await esbuild.build(buildOptions);

  // Inline ui.js into ui.html
  const html = fs.readFileSync('ui.html', 'utf8');
  const uiJs = fs.readFileSync('ui.js', 'utf8');

  const inlinedHtml = html.replace(
    '<script src="ui.js"></script>',
    `<script>${uiJs}</script>`
  );

  fs.writeFileSync('ui.html', inlinedHtml);
  console.log('✓ Inlined ui.js into ui.html');
}

if (isWatch) {
  esbuild.context(buildOptions).then(ctx => ctx.watch());
} else {
  build().catch(() => process.exit(1));
}
