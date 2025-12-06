/**
 * CLI Prompt Utilities
 *
 * Functions for interactive command-line prompts.
 */

import * as readline from 'readline';

/**
 * Create readline interface for CLI prompts
 */
export function createPrompt(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask a yes/no question
 *
 * @param rl - Readline interface
 * @param question - Question to ask
 * @param defaultValue - Default value if user presses Enter (default: false)
 * @returns Promise resolving to boolean
 */
export async function askYesNo(
  rl: readline.Interface,
  question: string,
  defaultValue: boolean = false
): Promise<boolean> {
  const defaultStr = defaultValue ? 'Y/n' : 'y/N';
  return new Promise((resolve) => {
    rl.question(`${question} (${defaultStr}): `, (answer) => {
      if (!answer.trim()) {
        resolve(defaultValue);
      } else {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      }
    });
  });
}

/**
 * Ask for text input
 *
 * @param rl - Readline interface
 * @param question - Question to ask
 * @param defaultValue - Default value if user presses Enter (default: '')
 * @returns Promise resolving to string
 */
export async function askText(
  rl: readline.Interface,
  question: string,
  defaultValue: string = ''
): Promise<string> {
  const defaultStr = defaultValue ? ` [${defaultValue}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${defaultStr}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Ask for multiple choice selection
 *
 * @param rl - Readline interface
 * @param question - Question to ask
 * @param choices - Array of choices to display
 * @param defaults - Default selections if user presses Enter
 * @returns Promise resolving to array of selected choices
 */
export async function askMultipleChoice(
  rl: readline.Interface,
  question: string,
  choices: string[],
  defaults: string[] = []
): Promise<string[]> {
  console.log(`\n${question}`);
  choices.forEach((choice, i) => {
    const isDefault = defaults.includes(choice);
    console.log(`  ${i + 1}. ${choice}${isDefault ? ' (default)' : ''}`);
  });

  return new Promise((resolve) => {
    rl.question(`Enter numbers separated by commas (e.g., 1,2,3) or press Enter for defaults: `, (answer) => {
      if (!answer.trim()) {
        resolve(defaults.length > 0 ? defaults : [choices[0]]);
      } else {
        const indices = answer.split(',').map(s => parseInt(s.trim()) - 1);
        const selected = indices
          .filter(i => i >= 0 && i < choices.length)
          .map(i => choices[i]);
        resolve(selected.length > 0 ? selected : defaults);
      }
    });
  });
}

/**
 * Simple prompt function (doesn't require readline interface)
 */
export function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Ask for single choice selection (numbered list)
 *
 * @param rl - Readline interface
 * @param question - Question to ask
 * @param choices - Array of { value, label, description? } objects
 * @param defaultIndex - Default selection index (0-based, default: 0)
 * @returns Promise resolving to selected value
 */
export async function askChoice<T extends string>(
  rl: readline.Interface,
  question: string,
  choices: Array<{ value: T; label: string; description?: string }>,
  defaultIndex: number = 0
): Promise<T> {
  console.log(`\n${question}\n`);
  choices.forEach((choice, i) => {
    const marker = i === defaultIndex ? ' (default)' : '';
    if (choice.description) {
      console.log(`  ${i + 1}. ${choice.label}${marker}`);
      console.log(`     ${choice.description}`);
    } else {
      console.log(`  ${i + 1}. ${choice.label}${marker}`);
    }
  });

  return new Promise((resolve) => {
    rl.question(`\nChoose (1-${choices.length}) [${defaultIndex + 1}]: `, (answer) => {
      if (!answer.trim()) {
        resolve(choices[defaultIndex].value);
      } else {
        const index = parseInt(answer.trim()) - 1;
        if (index >= 0 && index < choices.length) {
          resolve(choices[index].value);
        } else {
          resolve(choices[defaultIndex].value);
        }
      }
    });
  });
}

/**
 * Ask for multiple choice with toggle-style selection
 * Shows checkboxes and allows toggling until user presses Enter
 *
 * @param rl - Readline interface
 * @param question - Question to ask
 * @param choices - Array of { value, label, description? } objects
 * @param defaults - Default selected values
 * @returns Promise resolving to array of selected values
 */
export async function askMultipleChoiceToggle<T extends string>(
  rl: readline.Interface,
  question: string,
  choices: Array<{ value: T; label: string; description?: string }>,
  defaults: T[] = []
): Promise<T[]> {
  const selected = new Set<T>(defaults);

  const displayChoices = () => {
    console.log(`\n${question}\n`);
    choices.forEach((choice, i) => {
      const checked = selected.has(choice.value) ? '[x]' : '[ ]';
      if (choice.description) {
        console.log(`  ${checked} ${i + 1}. ${choice.label}`);
        console.log(`       ${choice.description}`);
      } else {
        console.log(`  ${checked} ${i + 1}. ${choice.label}`);
      }
    });
    console.log();
  };

  displayChoices();

  return new Promise((resolve) => {
    const askToggle = () => {
      rl.question('Toggle (1-' + choices.length + '), Enter when done: ', (answer) => {
        if (!answer.trim()) {
          resolve(Array.from(selected));
        } else {
          const index = parseInt(answer.trim()) - 1;
          if (index >= 0 && index < choices.length) {
            const value = choices[index].value;
            if (selected.has(value)) {
              selected.delete(value);
            } else {
              selected.add(value);
            }
            displayChoices();
          }
          askToggle();
        }
      });
    };
    askToggle();
  });
}
