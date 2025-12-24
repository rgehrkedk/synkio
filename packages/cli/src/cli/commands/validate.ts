import { loadConfig, findConfigFile } from '../../core/config.js';
import { FigmaClient } from '../../core/figma.js';
import { createLogger } from '../../utils/logger.js';
import chalk from 'chalk';
import ora from 'ora';

export async function validateCommand() {
  const logger = createLogger();
  const spinner = ora('Validating configuration and Figma connection...').start();

  try {
    // 1. Find and validate config
    const configPath = findConfigFile();
    const configFileName = configPath?.split('/').pop() || 'config';
    spinner.text = `Validating ${configFileName}...`;
    const config = loadConfig();
    spinner.succeed(`${configFileName} is valid.`);

    // 2. Validate Figma connection
    spinner.start('Connecting to Figma...');
    const figmaClient = new FigmaClient({ ...config.figma, logger });
    
    // We don't need the data, we just want to see if it throws.
    // This will validate fileId, nodeId, and accessToken.
    await figmaClient.fetchData();
    spinner.succeed('Figma connection successful.');
    
    console.log(chalk.green('\n✓ Configuration and connection are valid!'));

  } catch (error: any) {
    spinner.fail(chalk.red(`Validation failed: ${error.message}`));
    logger.error('Validation failed', { error });
    process.exit(1);
  }
}
