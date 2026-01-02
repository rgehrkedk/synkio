/**
 * QuickStart Component
 * Terminal-style code block showing CLI commands
 */

import { icons } from '../shared/icons';

// Helper to create icon element
function createIconElement(name: keyof typeof icons, size: number = 24): HTMLElement {
  const span = document.createElement('span');
  span.className = 'icon';
  span.innerHTML = icons[name];
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  span.style.justifyContent = 'center';
  if (size !== 24) {
    const svg = span.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
    }
  }
  return span;
}
import styles from './QuickStart.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

const cliCommands = `npm install -g synkio
synkio init
synkio pull
synkio build`;

export function QuickStart(): HTMLElement {
  const section = document.createElement('section');
  section.className = getStyle('section');
  section.id = 'quickstart';

  const container = document.createElement('div');
  container.className = getStyle('container');

  // Section header
  const header = document.createElement('div');
  header.className = getStyle('header');

  const title = document.createElement('h2');
  title.className = getStyle('title');
  title.textContent = 'Quick start';

  const subtitle = document.createElement('p');
  subtitle.className = getStyle('subtitle');
  subtitle.textContent = 'Copy, paste, done.';

  header.appendChild(title);
  header.appendChild(subtitle);

  // Code block container
  const codeContainer = document.createElement('div');
  codeContainer.className = getStyle('codeContainer');

  // Terminal header
  const terminalHeader = document.createElement('div');
  terminalHeader.className = getStyle('terminalHeader');

  const dots = document.createElement('div');
  dots.className = getStyle('terminalDots');
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.className = getStyle('dot');
    dots.appendChild(dot);
  }

  const terminalTitle = document.createElement('span');
  terminalTitle.className = getStyle('terminalTitle');
  terminalTitle.textContent = 'Terminal';

  terminalHeader.appendChild(dots);
  terminalHeader.appendChild(terminalTitle);

  // Code block
  const pre = document.createElement('pre');
  pre.className = getStyle('pre');

  const code = document.createElement('code');
  code.className = getStyle('code');

  // Parse and highlight the code
  const lines = cliCommands.split('\n');
  lines.forEach((line, index) => {
    const lineSpan = document.createElement('span');
    lineSpan.className = getStyle('line');

    if (line.startsWith('#')) {
      // Comment line
      const commentSpan = document.createElement('span');
      commentSpan.className = getStyle('comment');
      commentSpan.textContent = line;
      lineSpan.appendChild(commentSpan);
    } else if (line.trim()) {
      // Command line
      const promptSpan = document.createElement('span');
      promptSpan.className = getStyle('prompt');
      promptSpan.textContent = '$ ';
      lineSpan.appendChild(promptSpan);

      const parts = line.split(' ');
      const cmdSpan = document.createElement('span');
      cmdSpan.className = getStyle('command');
      cmdSpan.textContent = parts[0];
      lineSpan.appendChild(cmdSpan);

      if (parts.length > 1) {
        const argsSpan = document.createElement('span');
        argsSpan.className = getStyle('args');
        argsSpan.textContent = ' ' + parts.slice(1).join(' ');
        lineSpan.appendChild(argsSpan);
      }
    }

    code.appendChild(lineSpan);
    if (index < lines.length - 1) {
      code.appendChild(document.createTextNode('\n'));
    }
  });

  pre.appendChild(code);

  codeContainer.appendChild(terminalHeader);
  codeContainer.appendChild(pre);

  // Documentation link
  const linkWrapper = document.createElement('div');
  linkWrapper.className = getStyle('linkWrapper');

  const link = document.createElement('a');
  link.className = getStyle('docsLink');
  link.href = '#'; // Replace with actual docs URL
  link.textContent = 'Read the docs';

  const arrow = createIconElement('arrow-right', 16);
  arrow.className = getStyle('linkIcon');
  link.appendChild(arrow);

  linkWrapper.appendChild(link);

  container.appendChild(header);
  container.appendChild(codeContainer);
  container.appendChild(linkWrapper);
  section.appendChild(container);

  return section;
}
