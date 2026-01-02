// =============================================================================
// CodeBlock Component
// Displays code with optional copy button and line numbers
// =============================================================================

import styles from './CodeBlock.module.css';
import { Icon } from '../Icon';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

export interface CodeBlockProps {
  code: string;
  language?: string;
  showCopy?: boolean;
  showLineNumbers?: boolean;
}

export function CodeBlock(props: CodeBlockProps): HTMLElement {
  const {
    code,
    language = 'bash',
    showCopy = true,
    showLineNumbers = false,
  } = props;

  const container = document.createElement('div');
  container.className = getStyle('codeBlock');

  // Header with language label and copy button
  const header = document.createElement('div');
  header.className = getStyle('codeBlock__header');

  if (language) {
    const languageLabel = document.createElement('span');
    languageLabel.className = getStyle('codeBlock__language');
    languageLabel.textContent = language;
    header.appendChild(languageLabel);
  }

  if (showCopy) {
    const copyButton = document.createElement('button');
    copyButton.className = getStyle('codeBlock__copy');
    copyButton.type = 'button';
    copyButton.title = 'Copy to clipboard';

    const copyIcon = Icon('copy', 'sm');
    const checkIcon = Icon('check', 'sm');
    checkIcon.style.display = 'none';

    copyButton.appendChild(copyIcon);
    copyButton.appendChild(checkIcon);

    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code);
        copyIcon.style.display = 'none';
        checkIcon.style.display = 'block';
        const copiedClass = getStyle('codeBlock__copy--copied');
        if (copiedClass) copyButton.classList.add(copiedClass);

        setTimeout(() => {
          copyIcon.style.display = 'block';
          checkIcon.style.display = 'none';
          if (copiedClass) copyButton.classList.remove(copiedClass);
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });

    header.appendChild(copyButton);
  }

  container.appendChild(header);

  // Code content
  const pre = document.createElement('pre');
  pre.className = getStyle('codeBlock__pre');

  const codeElement = document.createElement('code');
  codeElement.className = getStyle('codeBlock__code');
  if (language) {
    codeElement.classList.add(`language-${language}`);
  }

  if (showLineNumbers) {
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      const lineWrapper = document.createElement('span');
      lineWrapper.className = getStyle('codeBlock__line');

      const lineNumber = document.createElement('span');
      lineNumber.className = getStyle('codeBlock__lineNumber');
      lineNumber.textContent = String(index + 1);
      lineWrapper.appendChild(lineNumber);

      const lineContent = document.createElement('span');
      lineContent.className = getStyle('codeBlock__lineContent');
      lineContent.textContent = line;
      lineWrapper.appendChild(lineContent);

      codeElement.appendChild(lineWrapper);
      if (index < lines.length - 1) {
        codeElement.appendChild(document.createTextNode('\n'));
      }
    });
  } else {
    codeElement.textContent = code;
  }

  pre.appendChild(codeElement);
  container.appendChild(pre);

  return container;
}
