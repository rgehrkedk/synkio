import * as readline from 'node:readline';
import { exec } from 'node:child_process';

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

/**
 * Open a folder in the system file explorer
 * Uses platform-specific command: open (macOS), xdg-open (Linux), start (Windows)
 */
export function openFolder(folderPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const platform = process.platform;
    let command: string;

    if (platform === 'darwin') {
      command = `open "${folderPath}"`;
    } else if (platform === 'win32') {
      command = `start "" "${folderPath}"`;
    } else {
      command = `xdg-open "${folderPath}"`;
    }

    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
