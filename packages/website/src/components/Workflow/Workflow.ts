/**
 * Workflow Component
 * Shows bidirectional sync between Figma and Code with ASCII diagrams
 */

import styles from './Workflow.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

interface FlowDirection {
  id: string;
  label: string;
  title: string;
  description: string;
  steps: string[];
  command: string;
  ascii: string;
}

const figmaToCode: FlowDirection = {
  id: 'figma-to-code',
  label: 'Figma → Code',
  title: 'Design to Development',
  description: 'Pull design tokens from Figma into your codebase. The plugin stores variables in the file, the CLI fetches and transforms them.',
  steps: [
    'Run plugin in Figma',
    'CLI pulls baseline',
    'Build generates tokens',
  ],
  command: 'synkio pull && synkio build',
  ascii: `
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│                 │          │                 │          │                 │
│     FIGMA       │  ─────>  │   BASELINE.JSON │  ─────>  │   TOKENS/       │
│                 │  plugin  │                 │  build   │   CSS/          │
│   Variables     │   sync   │   Normalized    │          │   DTCG JSON     │
│   Collections   │          │   token data    │          │                 │
│                 │          │                 │          │                 │
└─────────────────┘          └─────────────────┘          └─────────────────┘
`,
};

const codeToFigma: FlowDirection = {
  id: 'code-to-figma',
  label: 'Code → Figma',
  title: 'Development to Design',
  description: 'Push token changes back to Figma. Edit tokens in code, generate a baseline, and import via the plugin.',
  steps: [
    'Edit token files',
    'Generate export baseline',
    'Import via Figma plugin',
  ],
  command: 'synkio export-baseline',
  ascii: `
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│                 │          │                 │          │                 │
│   TOKENS/       │  ─────>  │  EXPORT-        │  ─────>  │     FIGMA       │
│   *.json        │  export  │  BASELINE.JSON  │  plugin  │                 │
│                 │          │                 │  import  │   Variables     │
│   Your edits    │          │   Diff-ready    │          │   Updated       │
│                 │          │                 │          │                 │
└─────────────────┘          └─────────────────┘          └─────────────────┘
`,
};

export function Workflow(): HTMLElement {
  const section = document.createElement('section');
  section.className = getStyle('section');
  section.id = 'workflow';

  const container = document.createElement('div');
  container.className = getStyle('container');

  // Section header
  const header = document.createElement('div');
  header.className = getStyle('header');

  const title = document.createElement('h2');
  title.className = getStyle('title');
  title.textContent = 'Bidirectional Sync';
  header.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = getStyle('subtitle');
  subtitle.textContent = 'Synkio works both ways. Pull from Figma or push from code.';
  header.appendChild(subtitle);

  container.appendChild(header);

  // Flow diagrams
  const flows = document.createElement('div');
  flows.className = getStyle('flows');

  flows.appendChild(createFlowDiagram(figmaToCode));
  flows.appendChild(createFlowDiagram(codeToFigma));

  container.appendChild(flows);
  section.appendChild(container);

  return section;
}

function createFlowDiagram(flow: FlowDirection): HTMLElement {
  const flowEl = document.createElement('div');
  flowEl.className = getStyle('flow');

  // Flow label badge
  const labelBadge = document.createElement('span');
  labelBadge.className = getStyle('flowLabel');
  labelBadge.textContent = flow.label;
  flowEl.appendChild(labelBadge);

  // Flow title
  const titleEl = document.createElement('h3');
  titleEl.className = getStyle('flowTitle');
  titleEl.textContent = flow.title;
  flowEl.appendChild(titleEl);

  // Description
  const descEl = document.createElement('p');
  descEl.className = getStyle('flowDescription');
  descEl.textContent = flow.description;
  flowEl.appendChild(descEl);

  // ASCII diagram
  const asciiContainer = document.createElement('div');
  asciiContainer.className = getStyle('asciiContainer');

  const pre = document.createElement('pre');
  pre.className = getStyle('ascii');
  pre.textContent = flow.ascii.trim();
  asciiContainer.appendChild(pre);

  flowEl.appendChild(asciiContainer);

  // Steps list
  const stepsContainer = document.createElement('div');
  stepsContainer.className = getStyle('stepsContainer');

  flow.steps.forEach((step, index) => {
    const stepEl = document.createElement('div');
    stepEl.className = getStyle('step');

    const stepNum = document.createElement('span');
    stepNum.className = getStyle('stepNumber');
    stepNum.textContent = (index + 1).toString();
    stepEl.appendChild(stepNum);

    const stepText = document.createElement('span');
    stepText.className = getStyle('stepText');
    stepText.textContent = step;
    stepEl.appendChild(stepText);

    stepsContainer.appendChild(stepEl);
  });

  flowEl.appendChild(stepsContainer);

  // Command
  const commandContainer = document.createElement('div');
  commandContainer.className = getStyle('commandContainer');

  const commandLabel = document.createElement('span');
  commandLabel.className = getStyle('commandLabel');
  commandLabel.textContent = 'Command:';
  commandContainer.appendChild(commandLabel);

  const commandCode = document.createElement('code');
  commandCode.className = getStyle('command');
  commandCode.textContent = flow.command;
  commandContainer.appendChild(commandCode);

  flowEl.appendChild(commandContainer);

  return flowEl;
}

export default Workflow;
