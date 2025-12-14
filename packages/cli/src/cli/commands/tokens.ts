import { readBaseline } from '../../core/baseline.js';
import chalk from 'chalk';

export async function tokensCommand() {
  try {
    const baseline = await readBaseline();

    if (!baseline) {
      console.log(chalk.yellow('No local token baseline found. Run "synkio sync" first.'));
      return;
    }

    console.log(chalk.bold('Current local token baseline:'));
    console.log(JSON.stringify(baseline, null, 2));

  } catch (error: any) {
    console.error(chalk.red(`Failed to read tokens: ${error.message}`));
    process.exit(1);
  }
}
