/**
 * Workflow Component
 * Shows bidirectional sync between Figma and Code with styled flow diagrams
 */

import { icons } from '../shared/icons';
import styles from './Workflow.module.css';

// Helper to safely get class names from CSS modules
const getStyle = (key: string): string => (styles && styles[key]) || '';

interface FlowNode {
  icon: keyof typeof icons;
  title: string;
  subtitle: string;
}

interface FlowArrow {
  label: string;
}

interface FlowDirection {
  id: string;
  label: string;
  title: string;
  description: string;
  nodes: [FlowNode, FlowNode, FlowNode];
  arrows: [FlowArrow, FlowArrow];
  command: string;
}

const figmaToCode: FlowDirection = {
  id: 'figma-to-code',
  label: 'Figma → Code',
  title: 'Design to Development',
  description: 'Pull design tokens from Figma into your codebase. The plugin stores variables in the file, the CLI fetches and transforms them.',
  nodes: [
    { icon: 'figma', title: 'Figma', subtitle: 'Variables & Collections' },
    { icon: 'download', title: 'Baseline', subtitle: 'Normalized data' },
    { icon: 'code', title: 'Output', subtitle: 'Tokens & CSS' },
  ],
  arrows: [
    { label: 'pull' },
    { label: 'build' },
  ],
  command: 'synkio pull && synkio build',
};

const codeToFigma: FlowDirection = {
  id: 'code-to-figma',
  label: 'Code → Figma',
  title: 'Development to Design',
  description: 'Push token changes back to Figma. Edit tokens in code, generate a baseline, and import via the plugin.',
  nodes: [
    { icon: 'code', title: 'Tokens', subtitle: 'Your edits' },
    { icon: 'download', title: 'Export', subtitle: 'Diff-ready baseline' },
    { icon: 'figma', title: 'Figma', subtitle: 'Variables updated' },
  ],
  arrows: [
    { label: 'export' },
    { label: 'import' },
  ],
  command: 'synkio export-baseline',
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

  // Flow header (label + title + description)
  const flowHeader = document.createElement('div');
  flowHeader.className = getStyle('flowHeader');

  const labelBadge = document.createElement('span');
  labelBadge.className = getStyle('flowLabel');
  labelBadge.textContent = flow.label;
  flowHeader.appendChild(labelBadge);

  const titleEl = document.createElement('h3');
  titleEl.className = getStyle('flowTitle');
  titleEl.textContent = flow.title;
  flowHeader.appendChild(titleEl);

  const descEl = document.createElement('p');
  descEl.className = getStyle('flowDescription');
  descEl.textContent = flow.description;
  flowHeader.appendChild(descEl);

  flowEl.appendChild(flowHeader);

  // Flow diagram with nodes and arrows
  const diagram = document.createElement('div');
  diagram.className = getStyle('diagram');

  // Create: Node -> Arrow -> Node -> Arrow -> Node
  flow.nodes.forEach((node, index) => {
    // Add node
    diagram.appendChild(createFlowNode(node));

    // Add arrow (except after last node)
    if (index < flow.arrows.length) {
      diagram.appendChild(createFlowArrow(flow.arrows[index]));
    }
  });

  flowEl.appendChild(diagram);

  // Command
  const commandContainer = document.createElement('div');
  commandContainer.className = getStyle('commandContainer');

  const commandCode = document.createElement('code');
  commandCode.className = getStyle('command');
  commandCode.textContent = flow.command;
  commandContainer.appendChild(commandCode);

  flowEl.appendChild(commandContainer);

  return flowEl;
}

function createFlowNode(node: FlowNode): HTMLElement {
  const nodeEl = document.createElement('div');
  nodeEl.className = getStyle('node');

  const iconWrapper = document.createElement('div');
  iconWrapper.className = getStyle('nodeIcon');
  iconWrapper.innerHTML = icons[node.icon];
  nodeEl.appendChild(iconWrapper);

  const nodeTitle = document.createElement('span');
  nodeTitle.className = getStyle('nodeTitle');
  nodeTitle.textContent = node.title;
  nodeEl.appendChild(nodeTitle);

  const nodeSubtitle = document.createElement('span');
  nodeSubtitle.className = getStyle('nodeSubtitle');
  nodeSubtitle.textContent = node.subtitle;
  nodeEl.appendChild(nodeSubtitle);

  return nodeEl;
}

function createFlowArrow(arrow: FlowArrow): HTMLElement {
  const arrowEl = document.createElement('div');
  arrowEl.className = getStyle('arrow');

  const line = document.createElement('div');
  line.className = getStyle('arrowLine');
  arrowEl.appendChild(line);

  const label = document.createElement('span');
  label.className = getStyle('arrowLabel');
  label.textContent = arrow.label;
  arrowEl.appendChild(label);

  return arrowEl;
}

export default Workflow;
