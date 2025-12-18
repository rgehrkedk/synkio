import { writeFile, readFile, access } from 'fs/promises';
import { resolve, basename } from 'path';
import { existsSync } from 'fs';
import { detectProject, findStyleDictionaryConfig, hasStyleDictionary, findPackageJsonFiles, packageHasStyleDictionary, PackageJsonResult, detectBuildScript, SDSourcePattern } from '../../core/detect.js';
import { DEFAULT_CONFIG_FILE, CollectionConfigInput } from '../../core/config.js';
import { prompt } from '../utils.js';
import { FigmaClient } from '../../core/figma.js';
import { createLogger } from '../../utils/logger.js';
import chalk from 'chalk';
import ora from 'ora';

// Extracts the file ID from a Figma URL
// Supports: /file/, /design/, /board/, /proto/
export function extractFileId(url: string): string | undefined {
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
            splitModes?: boolean;
            dir?: string;
            file?: string;
        }>;
    };
    build?: {
        script?: string;
        styleDictionary?: {
            configFile: string;
        };
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
 * Match SD source patterns to collection configs
 * Maps collection names to their output dir/file patterns
 */
function matchSDPatternsToCollections(patterns: SDSourcePattern[]): Map<string, { dir: string; file: string; splitModes: boolean }> {
    const collectionConfigs = new Map<string, { dir: string; file: string; splitModes: boolean }>();

    for (const pattern of patterns) {
        collectionConfigs.set(pattern.collection, {
            dir: pattern.dir,
            file: pattern.file,
            splitModes: pattern.hasDynamicMode,
        });
    }

    return collectionConfigs;
}

/**
 * Generate config object based on project detection
 * - When SD factory function detected: use build.script + SD source patterns for collection configs
 * - When static SD config detected: set build.styleDictionary.configFile
 * - When no SD: set build.css with enabled=true, file="tokens.css", utilities=true
 * - Always include docsPages with defaults
 */
export async function generateConfig(fileId: string, baseUrl?: string): Promise<GeneratedConfig> {
    const detected = detectProject();
    const sdConfig = findStyleDictionaryConfig();
    const hasSD = hasStyleDictionary();
    const buildScript = detectBuildScript();

    // Determine tokens directory
    let tokensDir = 'tokens'; // Default

    if (sdConfig?.tokensDir) {
        // Use directory from SD config source patterns
        tokensDir = sdConfig.tokensDir;
    } else if (detected.sdTokensDir) {
        tokensDir = detected.sdTokensDir;
    } else if (detected.tokensDir) {
        // Use existing tokens directory
        tokensDir = detected.tokensDir;
    }

    // Build the config object
    const config: GeneratedConfig = {
        version: '1.0.0',
        figma: {
            fileId,
            accessToken: '${FIGMA_TOKEN}',
        },
        tokens: {
            dir: tokensDir,
        },
        docsPages: {
            enabled: true,
            dir: '.synkio/docs',
            title: 'Design Tokens',
        },
    };

    // Add base URL if provided (for Figma enterprise)
    if (baseUrl) {
        config.figma.baseUrl = baseUrl;
    }

    // Configure build section based on SD detection
    if (hasSD && sdConfig) {
        // Check if it's a factory function config
        if (sdConfig.isFactoryFunction && buildScript) {
            // Factory function - use build.script instead of direct SD integration
            config.build = {
                script: buildScript,
            };

            // Add collection configs from SD source patterns if available
            if (sdConfig.sourcePatterns && sdConfig.sourcePatterns.length > 0) {
                const collectionConfigs = matchSDPatternsToCollections(sdConfig.sourcePatterns);
                config.tokens.collections = {};
                for (const [name, cfg] of collectionConfigs) {
                    config.tokens.collections[name] = {
                        splitModes: cfg.splitModes,
                        dir: cfg.dir,
                        file: cfg.file,
                    };
                }
            }
        } else {
            // Static SD config - use direct integration
            config.build = {
                styleDictionary: {
                    configFile: sdConfig.configFile,
                },
            };
        }
    } else if (buildScript) {
        // No SD but has a build script - use it
        config.build = {
            script: buildScript,
        };
    } else {
        // No Style Dictionary - enable CSS output
        config.build = {
            css: {
                enabled: true,
                file: 'tokens.css',
                utilities: true,
                utilitiesFile: 'utilities.css',
            },
        };
    }

    return config;
}

/**
 * Find the best project directory to initialize
 * Searches for package.json files up to 2 levels deep and prompts user if found in subdirectory
 */
async function findProjectDirectory(): Promise<{ dir: string; relativePath: string } | null> {
    const cwd = process.cwd();
    const packageJsonFiles = findPackageJsonFiles(cwd);

    // If there's a package.json in root, use it
    const rootPkg = packageJsonFiles.find(p => p.isRoot);
    if (rootPkg) {
        return { dir: cwd, relativePath: '.' };
    }

    // No root package.json, check subdirectories
    if (packageJsonFiles.length === 0) {
        // No package.json found anywhere
        return null;
    }

    // Found package.json in subdirectory - prompt user
    if (packageJsonFiles.length === 1) {
        const pkg = packageJsonFiles[0];
        const hasSD = packageHasStyleDictionary(pkg.path);
        console.log(chalk.yellow(`\n  No package.json found in current directory.`));
        console.log(chalk.green(`  Found package.json in ${chalk.cyan(pkg.relativePath)}${hasSD ? ' (has Style Dictionary)' : ''}`));

        const answer = await prompt(`  Initialize in ${pkg.relativePath}? (y/n):`);
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            return { dir: pkg.dir, relativePath: pkg.relativePath };
        }
        return null;
    }

    // Multiple subdirectories found - let user choose
    console.log(chalk.yellow(`\n  No package.json found in current directory.`));
    console.log(chalk.green(`  Found ${packageJsonFiles.length} package.json files in subdirectories:\n`));

    // Sort: prefer those with style-dictionary installed
    const sorted = [...packageJsonFiles].sort((a, b) => {
        const aHasSD = packageHasStyleDictionary(a.path);
        const bHasSD = packageHasStyleDictionary(b.path);
        if (aHasSD && !bHasSD) return -1;
        if (!aHasSD && bHasSD) return 1;
        return 0;
    });

    sorted.forEach((pkg, i) => {
        const hasSD = packageHasStyleDictionary(pkg.path);
        const sdLabel = hasSD ? chalk.cyan(' (has Style Dictionary)') : '';
        console.log(`    ${i + 1}. ${pkg.relativePath}${sdLabel}`);
    });

    console.log(`    0. Initialize in current directory anyway`);
    console.log('');

    const answer = await prompt('  Select directory (0-' + sorted.length + '):');
    const choice = parseInt(answer, 10);

    if (choice === 0) {
        return { dir: cwd, relativePath: '.' };
    }

    if (choice >= 1 && choice <= sorted.length) {
        const selected = sorted[choice - 1];
        return { dir: selected.dir, relativePath: selected.relativePath };
    }

    return null;
}

export async function initCommand(options: InitOptions = {}) {
    console.log(chalk.bold('\nInitializing Synkio...\n'));

    // Find the project directory (may prompt user if package.json in subdirectory)
    const projectDir = await findProjectDirectory();

    let workingDir = process.cwd();
    let initPath = '.';

    if (projectDir) {
        workingDir = projectDir.dir;
        initPath = projectDir.relativePath;

        if (initPath !== '.') {
            console.log(chalk.green(`\n  Initializing in ${chalk.cyan(initPath)}\n`));
            process.chdir(workingDir);
        }
    }

    // Run project detection (now in the correct directory)
    const detected = detectProject();
    const hasSD = hasStyleDictionary();
    const sdConfig = findStyleDictionaryConfig();

    // Detect build script
    const buildScript = detectBuildScript();

    // Display detection results
    console.log('Detected:');

    if (detected.framework) {
        console.log(chalk.green(`  ✓ Framework: ${detected.framework}`));
    }

    if (hasSD) {
        console.log(chalk.green('  ✓ Style Dictionary installed'));
        if (sdConfig) {
            console.log(chalk.green(`  ✓ Style Dictionary config: ${sdConfig.configFile}`));
            if (sdConfig.isFactoryFunction) {
                console.log(chalk.yellow(`    -> Factory function config detected`));
            }
            if (sdConfig.tokensDir) {
                console.log(chalk.gray(`    -> tokens directory: ${sdConfig.tokensDir}`));
            }
            if (sdConfig.sourcePatterns && sdConfig.sourcePatterns.length > 0) {
                console.log(chalk.gray(`    -> ${sdConfig.sourcePatterns.length} source pattern(s) found`));
            }
        }
    }

    if (buildScript) {
        console.log(chalk.green(`  ✓ Build script: ${buildScript}`));
    }

    // Check for FIGMA_TOKEN in environment
    const figmaToken = process.env.FIGMA_TOKEN;
    if (figmaToken) {
        console.log(chalk.green('  ✓ FIGMA_TOKEN found in environment'));
    } else {
        console.log(chalk.yellow('  ✗ FIGMA_TOKEN not found'));
    }

    console.log('');

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
            spinner.succeed('Connection validated');
        } catch (error: any) {
            spinner.fail(`Figma connection failed: ${error.message}`);
            console.log(chalk.yellow('  Check your token and try: npx synkio validate'));
        }
    }

    console.log('');

    // Generate config
    const config = await generateConfig(fileId, options.baseUrl);

    // Write config file
    const configPath = resolve(process.cwd(), DEFAULT_CONFIG_FILE);
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');

    console.log('Created:');
    console.log(chalk.green(`  ✓ ${DEFAULT_CONFIG_FILE}`));

    // Create .env.example (not .env)
    await ensureEnvExample();
    console.log(chalk.green('  ✓ .env.example'));

    // Ensure .env is in .gitignore
    if (await ensureGitignore()) {
        console.log(chalk.green('  ✓ Added .env to .gitignore'));
    }

    // Show next steps
    console.log(chalk.bold('\nNext steps:'));

    if (!figmaToken) {
        console.log(`  1. Copy ${chalk.cyan('.env.example')} to ${chalk.cyan('.env')} and add your FIGMA_TOKEN`);
        console.log(chalk.gray('     (Get token from your team lead or secrets manager)'));
        console.log('  2. Run the Synkio plugin in Figma');
        console.log(`  3. Run: ${chalk.cyan('npx synkio sync')}`);
    } else {
        console.log('  1. Run the Synkio plugin in Figma');
        console.log(`  2. Run: ${chalk.cyan('npx synkio sync')}`);
    }

    console.log('');
}
