import * as readline from 'readline';

export function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let promptText = question;
  if (defaultValue) {
    promptText += ` (${defaultValue})`;
  }
  promptText += ' ';

  return new Promise(resolve => {
    rl.question(promptText, answer => {
      rl.close();
      resolve(answer || defaultValue || '');
    });
  });
}

/**
 * Prompt for yes/no confirmation
 * Returns true for 'y' or 'yes', false otherwise
 */
export async function confirmPrompt(question: string): Promise<boolean> {
  const answer = await prompt(question);
  const normalized = answer.toLowerCase().trim();
  return normalized === 'y' || normalized === 'yes';
}
