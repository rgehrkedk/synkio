import { resolve, join } from 'path';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { loadConfig } from '../../core/config.js';
import { readBaseline } from '../../core/baseline.js';
import { generateDocs } from '../../core/docs/index.js';
import { createLogger } from '../../utils/logger.js';
import chalk from 'chalk';
import ora from 'ora';

export interface DocsOptions {
  output?: string;      // Output directory (default: 'docs')
  title?: string;       // Documentation title
  open?: boolean;       // Open in browser after generating
  watch?: boolean;      // Watch for changes and regenerate
}

export async function docsCommand(options: DocsOptions = {}) {
  const logger = createLogger();
  const spinner = ora('Generating documentation...').start();

  try {
    // 1. Load config (skip Figma auth since we only need local baseline)
    spinner.text = 'Loading configuration...';
    const config = loadConfig('tokensrc.json', { skipFigmaAuth: true });
    
    // 2. Read baseline data
    spinner.text = 'Reading token data...';
    const baseline = await readBaseline();
    
    if (!baseline) {
      spinner.fail(chalk.red('No token data found. Run "synkio sync" first.'));
      process.exit(1);
    }

    // 3. Determine output directory
    const outputDir = resolve(process.cwd(), options.output || '.synkio/docs');
    
    // 4. Generate documentation
    spinner.text = 'Building documentation...';
    const result = await generateDocs(baseline, {
      outputDir,
      title: options.title || 'Design Tokens',
      config,
    });

    // 5. Write files
    spinner.text = 'Writing files...';
    await mkdir(outputDir, { recursive: true });
    await mkdir(join(outputDir, 'assets'), { recursive: true });
    
    for (const [filename, content] of Object.entries(result.files)) {
      const filePath = join(outputDir, filename);
      // Ensure directory exists for nested files
      await mkdir(join(outputDir, filename.split('/').slice(0, -1).join('/')), { recursive: true }).catch(() => {});
      await writeFile(filePath, content, 'utf-8');
    }

    spinner.succeed(chalk.green('Documentation generated successfully!'));
    
    // Summary
    console.log('');
    console.log(chalk.dim('  Output:'), outputDir);
    console.log(chalk.dim('  Files:'));
    for (const filename of Object.keys(result.files)) {
      console.log(chalk.dim('    -'), filename);
    }
    console.log('');
    console.log(chalk.cyan('  To view locally:'));
    console.log(chalk.dim(`    open ${outputDir}/index.html`));
    console.log('');
    console.log(chalk.cyan('  To deploy:'));
    console.log(chalk.dim('    Copy the folder to GitHub Pages, Netlify, or Vercel'));
    console.log('');

    // Open in browser if requested
    if (options.open) {
      const { exec } = await import('child_process');
      const filePath = join(outputDir, 'index.html');
      const cmd = process.platform === 'darwin' ? `open "${filePath}"` :
                  process.platform === 'win32' ? `start "" "${filePath}"` :
                  `xdg-open "${filePath}"`;
      exec(cmd);
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to generate documentation'));
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
    logger.debug('Full error:', error);
    process.exit(1);
  }
}
