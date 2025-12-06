const fs = require('fs');
const path = require('path');

// Read compiled TypeScript
const code = fs.readFileSync(path.join(__dirname, 'dist/code.js'), 'utf8');

// Read UI HTML
let html = fs.readFileSync(path.join(__dirname, 'src/ui.html'), 'utf8');

// Escape characters that would break template literals:
// - Backticks need to be escaped as \`
// - ${} template expressions need the $ escaped as \$
// - Backslashes that aren't already escaping something need escaping
html = html.replace(/\\/g, '\\\\');  // Escape backslashes first
html = html.replace(/`/g, '\\`');     // Escape backticks
html = html.replace(/\$\{/g, '\\${'); // Escape template expressions

// Create code.js with HTML embedded in template literal
const bundledCode = code.replace('__html__', '`' + html + '`');

// Write to root directory
fs.writeFileSync(path.join(__dirname, 'code.js'), bundledCode);

// Copy UI for reference
fs.writeFileSync(path.join(__dirname, 'ui.html'), fs.readFileSync(path.join(__dirname, 'src/ui.html'), 'utf8'));

console.log('Plugin bundled successfully!');
console.log('Files created:');
console.log('   - code.js');
console.log('   - ui.html');
console.log('\nReady to test in Figma!');
