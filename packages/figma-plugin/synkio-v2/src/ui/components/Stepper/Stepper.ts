import { el } from '../helpers';
import { registerCSS } from '../../styles';
import css from './Stepper.css';

registerCSS('stepper', css);

export interface StepperProps {
  steps: string[];
  currentStep: number;
  variant?: 'dots' | 'bar';
}

export function Stepper(props: StepperProps): HTMLElement {
  const { steps, currentStep, variant = 'dots' } = props;

  if (variant === 'bar') {
    return buildBarStepper(steps, currentStep);
  }

  return buildDotsStepper(steps, currentStep);
}

function buildDotsStepper(steps: string[], currentStep: number): HTMLElement {
  const stepper = el('div', { class: 'stepper' });

  steps.forEach((step, index) => {
    const isCompleted = index < currentStep;
    const isCurrent = index === currentStep;
    const isLast = index === steps.length - 1;

    const stepEl = el('div', { class: 'stepper__step' });

    // Dot row with lines
    const dotRow = el('div', { class: 'stepper__dot-row' });

    // Dot
    const dotClasses = ['stepper__dot'];
    if (isCompleted) dotClasses.push('stepper__dot--completed');
    if (isCurrent) dotClasses.push('stepper__dot--current');
    dotRow.appendChild(el('div', { class: dotClasses.join(' ') }));

    // Line after dot (except for last step)
    if (!isLast) {
      const lineClasses = ['stepper__line'];
      if (isCompleted) lineClasses.push('stepper__line--completed');
      dotRow.appendChild(el('div', { class: lineClasses.join(' ') }));
    }

    stepEl.appendChild(dotRow);

    // Label
    const labelClasses = ['stepper__label'];
    if (isCurrent) labelClasses.push('stepper__label--current');
    if (isCompleted) labelClasses.push('stepper__label--completed');
    stepEl.appendChild(el('div', { class: labelClasses.join(' ') }, step));

    stepper.appendChild(stepEl);
  });

  return stepper;
}

function buildBarStepper(steps: string[], currentStep: number): HTMLElement {
  const stepper = el('div', { class: 'stepper stepper--bar' });

  // Current step label
  const currentLabel = steps[currentStep] || '';
  stepper.appendChild(el('div', { class: 'stepper__current-label' }, currentLabel));

  // Progress bar container
  const barContainer = el('div', { class: 'stepper__bar-container' });

  // Progress track
  const track = el('div', { class: 'stepper__bar-track' });
  const fill = el('div', { class: 'stepper__bar-fill' });
  const progress = ((currentStep + 1) / steps.length) * 100;
  fill.style.width = `${progress}%`;
  track.appendChild(fill);
  barContainer.appendChild(track);

  // Step counter
  barContainer.appendChild(
    el('div', { class: 'stepper__bar-text' }, `Step ${currentStep + 1} of ${steps.length}`)
  );

  stepper.appendChild(barContainer);

  return stepper;
}
