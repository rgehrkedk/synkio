import { el } from '../helpers';
import { registerCSS } from '../../styles';
import { Icon, IconName } from '../../icons';
import { CommandBox } from '../CommandBox/CommandBox';
import css from './WorkflowItem.css';

registerCSS('workflow-item', css);

export interface WorkflowItemProps {
  icon?: IconName;
  title: string;
  steps?: string[];
  commands?: string[];
}

export function WorkflowItem(props: WorkflowItemProps): HTMLDivElement {
  const { icon, title, steps, commands } = props;

  const item = el('div', { class: 'workflow-item' });

  // Header with icon and title
  const header = el('div', { class: 'workflow-item__header' });
  if (icon) {
    const iconWrapper = el('span', { class: 'workflow-item__icon' });
    iconWrapper.appendChild(Icon(icon, 'sm'));
    header.appendChild(iconWrapper);
  }
  header.appendChild(el('span', { class: 'workflow-item__title' }, title));
  item.appendChild(header);

  // Optional steps list
  if (steps && steps.length > 0) {
    const stepsList = el('ol', { class: 'workflow-item__steps' });
    for (const step of steps) {
      stepsList.appendChild(el('li', { class: 'workflow-item__step' }, step));
    }
    item.appendChild(stepsList);
  }

  // Optional command boxes
  if (commands && commands.length > 0) {
    const commandsContainer = el('div', { class: 'workflow-item__commands' });
    for (const command of commands) {
      commandsContainer.appendChild(CommandBox({ command }));
    }
    item.appendChild(commandsContainer);
  }

  return item;
}
