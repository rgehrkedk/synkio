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
