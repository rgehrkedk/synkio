const esbuild = require('esbuild');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

// No file copying needed - lib/ contains source code directly

const buildOptions = {
  entryPoints: ['code.ts', 'ui.ts'],
  bundle: true,
  outdir: '.',
  target: 'es2015',
  logLevel: 'info',
};

async function build() {
  await esbuild.build(buildOptions);

  // Inline ui.js into ui.html (read from template, write to ui.html)
  const template = fs.readFileSync('ui.template.html', 'utf8');
  const uiJs = fs.readFileSync('ui.js', 'utf8');

  const inlinedHtml = template.replace(
    '<script src="ui.js"></script>',
    `<script>${uiJs}</script>`
  );

  fs.writeFileSync('ui.html', inlinedHtml);
  console.log('Built ui.html from template');
}

if (isWatch) {
  esbuild.context(buildOptions).then(ctx => ctx.watch());
} else {
  build().catch(() => process.exit(1));
}
