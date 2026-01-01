import { writeFile, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CONFIG_FILE } from '../../core/config.js';
import { prompt } from '../utils.js';
import { FigmaClient } from '../../core/figma.js';
import { createLogger } from '../../utils/logger.js';
import chalk from 'chalk';
import ora from 'ora';

// Extracts the file ID from a Figma URL
// Supports: /file/, /design/, /board/, /proto/
export function extractFileId(url: string): string | undefined {
    const match = /(?:file|design|board|proto)\/([a-zA-Z0-9]+)/.exec(url);
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

/**
 * Create .env.example file with FIGMA_TOKEN placeholder
 * This is the recommended pattern for team onboarding:
 * - .env.example is committed to git (safe, contains no secrets)
 * - Team members copy to .env and add their token
 */
export async function ensureEnvExample(): Promise<void> {
    const envExamplePath = resolve(process.cwd(), '.env.example');

    if (await fileExists(envExamplePath)) {
        const content = await readFile(envExamplePath, 'utf-8');
        if (content.includes('FIGMA_TOKEN=')) {
            // Already has the placeholder
            return;
        }
        // Append to existing .env.example
        await writeFile(envExamplePath, content + (content.endsWith('\n') ? '' : '\n') + 'FIGMA_TOKEN=\n');
    } else {
        // Create new .env.example
        await writeFile(envExamplePath, 'FIGMA_TOKEN=\n');
    }
}

/**
 * Ensure .env is in .gitignore
 * This prevents accidental commits of the real .env file with secrets
 */
export async function ensureGitignore(): Promise<boolean> {
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

/**
 * InitOptions - options for the init command
 * Note: --token flag has been removed for security reasons
 * (CLI arguments are visible in shell history)
 */
export interface InitOptions {
    figmaUrl?: string;
    baseUrl?: string;
    github?: boolean;  // GitHub workflow mode - skip FIGMA_TOKEN requirement
}

/**
 * Generated config structure - matches new schema
 * This is the shape of the JSON file we write to disk
 */
export interface GeneratedConfig {
    version: '1.0.0';
    figma: {
        fileId: string;
        accessToken: string;
        baseUrl?: string;
    };
    tokens: {
        dir: string;
        collections?: Record<string, {
            splitBy?: 'mode' | 'group' | 'none';
            dir?: string;
            file?: string;
        }>;
    };
    build?: {
        script?: string;
        css?: {
            enabled: boolean;
            file: string;
            utilities: boolean;
            utilitiesFile: string;
        };
    };
    docsPages?: {
        enabled: boolean;
        dir: string;
        title: string;
    };
}

/**
 * Generate minimal config object
 * Creates a simple starting point - users configure build options as needed
 */
export function generateConfig(fileId: string, baseUrl?: string): GeneratedConfig {
    const config: GeneratedConfig = {
        version: '1.0.0',
        figma: {
            fileId,
            accessToken: '${FIGMA_TOKEN}',
        },
        tokens: {
            dir: 'tokens',
        },
        // Docs and build are not enabled by default
        // Users opt-in by adding these sections to their config
    };

    // Add base URL if provided (for Figma enterprise)
    if (baseUrl) {
        config.figma.baseUrl = baseUrl;
    }

    return config;
}

export async function initCommand(options: InitOptions = {}) {
    const isGitHubWorkflow = options.github === true;

    console.log(chalk.bold('\nInitializing Synkio...\n'));

    if (isGitHubWorkflow) {
        console.log(chalk.cyan('  GitHub workflow mode'));
        console.log(chalk.dim('  (No Figma token required - using plugin → GitHub → build)\n'));
    }

    // Check for FIGMA_TOKEN in environment (only matters for CLI workflow)
    const figmaToken = process.env.FIGMA_TOKEN;
    if (!isGitHubWorkflow) {
        if (figmaToken) {
            console.log(chalk.green('  ✓ FIGMA_TOKEN found in environment'));
        } else {
            console.log(chalk.yellow('  ✗ FIGMA_TOKEN not found'));
        }
        console.log('');
    }

    // Get Figma URL - the only required user input
    const figmaUrl = options.figmaUrl || await prompt('? Figma file URL:');
    const fileId = extractFileId(figmaUrl);

    if (!fileId) {
        console.error(chalk.red('\nError: Invalid Figma file URL. Could not extract file ID.'));
        console.error(chalk.gray('Supported formats:'));
        console.error(chalk.gray('  - https://figma.com/file/ABC123/...'));
        console.error(chalk.gray('  - https://figma.com/design/ABC123/...'));
        console.error(chalk.gray('  - https://figma.com/board/ABC123/...'));
        console.error(chalk.gray('  - https://figma.com/proto/ABC123/...'));
        process.exit(1);
    }
    console.log(chalk.green(`  ✓ File ID: ${fileId}`));

    // Validate Figma connection if token is available (only for CLI workflow)
    if (!isGitHubWorkflow && figmaToken) {
        const spinner = ora('Validating Figma connection...').start();
        try {
            const figmaClient = new FigmaClient({
                fileId,
                accessToken: figmaToken,
                baseUrl: options.baseUrl,
                logger: createLogger({ silent: true })
            });
            await figmaClient.validateConnection();
            spinner.succeed('Connection validated');
        } catch (error: any) {
            spinner.fail(`Figma connection failed: ${error.message}`);
            console.log(chalk.yellow('  Check your token and try: npx synkio validate'));
        }
    }

    console.log('');

    // Generate config
    const config = generateConfig(fileId, options.baseUrl);

    // Write config file
    const configPath = resolve(process.cwd(), CONFIG_FILE);
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');

    console.log('Created:');
    console.log(chalk.green(`  ✓ ${CONFIG_FILE}`));

    // Create .env.example only if no FIGMA_TOKEN found (skip if user already has .env set up)
    if (!isGitHubWorkflow && !figmaToken) {
        await ensureEnvExample();
        console.log(chalk.green('  ✓ .env.example'));

        // Ensure .env is in .gitignore
        if (await ensureGitignore()) {
            console.log(chalk.green('  ✓ Added .env to .gitignore'));
        }
    }

    // Show next steps - different based on workflow
    console.log(chalk.bold('\nNext steps:'));

    if (isGitHubWorkflow) {
        // GitHub workflow - no token needed
        console.log('  1. Open the Synkio plugin in Figma');
        console.log('  2. Click "Create PR" to push tokens to GitHub');
        console.log('  3. Merge the PR on GitHub');
        console.log(`  4. Run: ${chalk.cyan('npx synkio build')}`);
        console.log('');
        console.log(chalk.dim('  Tip: You can also use "synkio pull" if you add FIGMA_TOKEN later.'));
    } else if (figmaToken) {
        console.log('  1. Run the Synkio plugin in Figma');
        console.log(`  2. Run: ${chalk.cyan('npx synkio pull')}`);
        console.log(`  3. Run: ${chalk.cyan('npx synkio build')}`);
    } else {
        console.log(`  1. Copy ${chalk.cyan('.env.example')} to ${chalk.cyan('.env')} and add your FIGMA_TOKEN`);
        console.log(chalk.gray('     (Get token from your team lead or secrets manager)'));
        console.log('  2. Run the Synkio plugin in Figma');
        console.log(`  3. Run: ${chalk.cyan('npx synkio pull')}`);
        console.log(`  4. Run: ${chalk.cyan('npx synkio build')}`);
    }

    // Show configuration guidance
    console.log(chalk.bold('\nConfiguration options:'));
    console.log(chalk.dim('  tokens.dir       - Directory for token JSON files (default: "tokens")'));
    console.log(chalk.dim('  build.script     - Custom build command (e.g., "npm run build:tokens")'));
    console.log(chalk.dim('  build.css        - Built-in CSS generation { enabled: true }'));
    console.log(chalk.dim('  docsPages        - Token documentation site { enabled: true }'));
    console.log(chalk.dim('\n  See: https://github.com/rgehrkedk/synkio/blob/main/docs/CONFIGURATION.md'));

    console.log('');
}
