import { writeFile, readFile, access } from 'fs/promises';
import { resolve } from 'path';
import { detectProject } from '../../core/detect.js';
import { prompt } from '../utils.js';
import { FigmaClient } from '../../core/figma.js';
import { createLogger } from '../../utils/logger.js';
import chalk from 'chalk';
import ora from 'ora';

// Extracts the file ID from a Figma URL
// Supports: /file/, /design/, /board/, /proto/
function extractFileId(url: string): string | undefined {
    const match = url.match(/(?:file|design|board|proto)\/([a-zA-Z0-9]+)/);
    return match?.[1];
}

// Check if a file exists
async function fileExists(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

// Append to .env file or create it
async function ensureEnvToken(token: string): Promise<void> {
    const envPath = resolve(process.cwd(), '.env');
    
    if (await fileExists(envPath)) {
        const content = await readFile(envPath, 'utf-8');
        if (content.includes('FIGMA_TOKEN=')) {
            // Already has a token, don't overwrite
            return;
        }
        // Append to existing .env
        await writeFile(envPath, content + (content.endsWith('\n') ? '' : '\n') + `FIGMA_TOKEN=${token}\n`);
    } else {
        // Create new .env
        await writeFile(envPath, `FIGMA_TOKEN=${token}\n`);
    }
}

// Check if .gitignore includes .env
async function ensureGitignore(): Promise<boolean> {
    const gitignorePath = resolve(process.cwd(), '.gitignore');
    
    if (await fileExists(gitignorePath)) {
        const content = await readFile(gitignorePath, 'utf-8');
        if (content.includes('.env')) {
            return false; // Already ignored
        }
        // Append .env to gitignore
        await writeFile(gitignorePath, content + (content.endsWith('\n') ? '' : '\n') + '.env\n');
        return true;
    } else {
        // Create .gitignore with .env
        await writeFile(gitignorePath, '.env\n');
        return true;
    }
}

export interface InitOptions {
    figmaUrl?: string;
    token?: string;
    outputDir?: string;
    baseUrl?: string;
}

export async function initCommand(options: InitOptions = {}) {
    console.log(chalk.bold('Initializing Synkio v2...'));

    const detected = detectProject();
    if (detected.framework) {
        console.log(chalk.green(`✓ Detected framework: ${detected.framework}`));
    }
    
    const figmaUrl = options.figmaUrl || await prompt('? Figma file URL?');
    const fileId = extractFileId(figmaUrl);

    if (!fileId) {
        console.error(chalk.red('Error: Invalid Figma file URL. Could not extract file ID.'));
        process.exit(1);
    }
    console.log(chalk.green(`✓ Extracted file ID: ${fileId}`));

    // Check for token: CLI option > env var
    const figmaToken = options.token || process.env.FIGMA_TOKEN;
    
    // Validate Figma connection if token is available
    if (figmaToken) {
        const spinner = ora('Validating Figma connection...').start();
        try {
            const figmaClient = new FigmaClient({ 
                fileId, 
                accessToken: figmaToken,
                baseUrl: options.baseUrl,
                logger: createLogger({ silent: true }) 
            });
            await figmaClient.validateConnection();
            spinner.succeed('Figma connection validated.');
        } catch (error: any) {
            spinner.fail(`Figma connection failed: ${error.message}`);
            console.log(chalk.yellow('Check your FIGMA_TOKEN and try again with: synkio validate'));
        }
    }
    
    const outputDir = options.outputDir || await prompt('? Output directory for tokens?', detected.tokensDir || 'tokens');

    // Ask about CSS output
    const generateCss = await prompt('? Generate CSS custom properties? (y/n)', 'y');
    const cssEnabled = generateCss.toLowerCase() === 'y' || generateCss.toLowerCase() === 'yes';
    
    let cssUtilities = false;
    if (cssEnabled) {
        const utilitiesAnswer = await prompt('? Also generate utility classes? (y/n)', 'y');
        cssUtilities = utilitiesAnswer.toLowerCase() === 'y' || utilitiesAnswer.toLowerCase() === 'yes';
    }

    // Ask about documentation dashboard
    const generateDocs = await prompt('? Generate documentation dashboard? (y/n)', 'y');
    const docsEnabled = generateDocs.toLowerCase() === 'y' || generateDocs.toLowerCase() === 'yes';
    
    let docsTitle = 'Design Tokens';
    if (docsEnabled) {
        docsTitle = await prompt('? Documentation title?', 'Design Tokens');
    }

    // Create minimal tokensrc.json - no nodeId needed (defaults to document root)
    const config: any = {
        version: '1.0.0',
        figma: {
            fileId: fileId,
            accessToken: '${FIGMA_TOKEN}'
        },
        output: {
            dir: outputDir,
            format: 'json'
        },
        css: {
            enabled: cssEnabled,
            file: 'tokens.css',
            utilities: cssUtilities,
            utilitiesFile: 'utilities.css'
        },
        docs: {
            enabled: docsEnabled,
            dir: '.synkio/docs',
            title: docsTitle
        }
    };
    
    if (options.baseUrl) {
        config.figma.baseUrl = options.baseUrl;
    }

    const configPath = resolve(process.cwd(), 'tokensrc.json');
    await writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green('✓ Created tokensrc.json'));

    // Handle token storage if provided via CLI
    if (options.token) {
        await ensureEnvToken(options.token);
        console.log(chalk.green('✓ Added FIGMA_TOKEN to .env'));
        
        if (await ensureGitignore()) {
            console.log(chalk.green('✓ Added .env to .gitignore'));
        }
    }

    console.log(chalk.bold('\nNext steps:'));
    
    // Show token setup step if no token was found
    if (!figmaToken) {
        console.log(`1. Add your Figma token to ${chalk.cyan('.env')}:`);
        console.log(chalk.gray('   FIGMA_TOKEN=your-token-here'));
        console.log('2. Run the Synkio plugin in Figma');
        console.log('3. Run: synkio validate');
        console.log('4. Run: synkio sync');
    } else {
        console.log('1. Run the Synkio plugin in Figma');
        console.log('2. Run: synkio sync');
    }
}
