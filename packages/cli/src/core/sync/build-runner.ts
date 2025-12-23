/**
 * Build Runner Module
 *
 * Handles build script execution and the build pipeline
 * (script, CSS generation, etc.)
 *
 * Security Note: Build scripts are executed in a shell context.
 * Only run scripts from trusted configuration files.
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import chalk from 'chalk';
import type { BaselineData } from '../../types/index.js';
import {
  generateCssFromBaseline,
  hasBuildConfig,
  getBuildStepsSummary,
} from '../output.js';
import { confirmPrompt } from '../../cli/utils.js';

/**
 * Dangerous patterns that should not appear in build scripts.
 * These patterns indicate potential command injection attempts.
 */
const DANGEROUS_PATTERNS = [
  /\$\(.*\)/,           // Command substitution $(...)
  /`.*`/,               // Backtick command substitution
  /\$\{.*\}/,           // Variable expansion ${...}
  /[;&|]\s*\w+\s*=/,    // Variable assignment after command separator
  />\s*\/etc\//,        // Writing to /etc/
  />\s*\/usr\//,        // Writing to /usr/
  /rm\s+(-rf?|--)\s+\//, // Dangerous rm commands
  /curl\s+.*\|\s*sh/,   // Piping curl to shell
  /wget\s+.*\|\s*sh/,   // Piping wget to shell
  /eval\s+/,            // eval command
  /source\s+/,          // source command (could load arbitrary scripts)
  /\.\s+\//,            // dot-sourcing
];

/**
 * Allowed script prefixes for common build tools.
 * Scripts must start with one of these patterns to be considered safe.
 */
const ALLOWED_SCRIPT_PREFIXES = [
  /^npm\s+run\s+/,      // npm run <script>
  /^npm\s+exec\s+/,     // npm exec
  /^npx\s+/,            // npx <command>
  /^yarn\s+/,           // yarn commands
  /^pnpm\s+/,           // pnpm commands
  /^node\s+/,           // node <script>
  /^tsx\s+/,            // tsx <script>
  /^ts-node\s+/,        // ts-node <script>
  /^bun\s+/,            // bun commands
  /^deno\s+/,           // deno commands
  /^make\s*/,           // make commands
  /^gradle\s+/,         // gradle commands
  /^mvn\s+/,            // maven commands
  /^cargo\s+/,          // cargo commands
  /^go\s+/,             // go commands
  /^python\s+/,         // python scripts
  /^python3\s+/,        // python3 scripts
  /^ruby\s+/,           // ruby scripts
  /^bash\s+/,           // bash scripts (explicit file)
  /^sh\s+/,             // sh scripts (explicit file)
  /^\.\/[\w-]+/,        // Local scripts starting with ./
];

/**
 * Validation result for build scripts
 */
export interface ScriptValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a build script for security concerns.
 *
 * @param script - The build script to validate
 * @returns Validation result with error message if invalid
 */
export function validateBuildScript(script: unknown): ScriptValidationResult {
  // Must be a non-empty string
  if (typeof script !== 'string') {
    return { valid: false, error: 'Build script must be a string' };
  }

  const trimmedScript = script.trim();

  if (trimmedScript.length === 0) {
    return { valid: false, error: 'Build script cannot be empty' };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmedScript)) {
      return {
        valid: false,
        error: `Build script contains potentially dangerous pattern: ${pattern.source}`,
      };
    }
  }

  // Check if script starts with an allowed prefix
  const hasAllowedPrefix = ALLOWED_SCRIPT_PREFIXES.some(pattern =>
    pattern.test(trimmedScript)
  );

  if (!hasAllowedPrefix) {
    return {
      valid: false,
      error:
        `Build script must start with a recognized command (npm, yarn, pnpm, node, etc.). ` +
        `Got: "${trimmedScript.split(/\s+/)[0]}"`,
    };
  }

  return { valid: true };
}

/**
 * Result of running a build script
 */
export interface ScriptResult {
  ran: boolean;
  success: boolean;
}

/**
 * Result of the build pipeline
 */
export interface BuildResult {
  scriptRan: boolean;
  cssFilesWritten: number;
}

/**
 * Options for sync command
 */
export interface SyncOptions {
  build?: boolean;
  noBuild?: boolean;
  [key: string]: any;
}

/**
 * Spinner interface (ora-compatible)
 */
export interface Spinner {
  text: string;
  stop: () => void;
  start: (text?: string) => void;
  fail: (text: string) => void;
}

/**
 * Execute a validated build script safely using spawnSync.
 *
 * Uses the system shell but with validated input to prevent injection.
 *
 * @param script - The validated build script
 * @param cwd - Working directory for execution
 * @returns Object with status code and any error
 */
function executeScript(
  script: string,
  cwd: string
): { status: number | null; error?: Error } {
  // Resolve to absolute path to prevent directory traversal
  const safeCwd = resolve(cwd);

  // Determine the shell based on platform
  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'cmd.exe' : '/bin/sh';
  const shellArgs = isWindows ? ['/c', script] : ['-c', script];

  const result = spawnSync(shell, shellArgs, {
    cwd: safeCwd,
    stdio: 'inherit',
    // Inherit environment but don't allow script to modify parent
    env: { ...process.env },
    // Set reasonable timeout (5 minutes)
    timeout: 5 * 60 * 1000,
    // Kill entire process group on timeout
    killSignal: 'SIGTERM',
  });

  if (result.error) {
    return { status: null, error: result.error };
  }

  return { status: result.status };
}

/**
 * Run the build script if configured
 *
 * Validates the script for security concerns before execution.
 *
 * @param config - The loaded configuration
 * @param spinner - Ora spinner instance
 * @returns Result with ran and success status
 */
export async function runBuildScript(
  config: any,
  spinner: Spinner
): Promise<ScriptResult> {
  const buildScript = config.build?.script;

  if (!buildScript) {
    return { ran: false, success: true };
  }

  // Validate the build script before execution
  const validation = validateBuildScript(buildScript);
  if (!validation.valid) {
    spinner.fail(chalk.red(`Invalid build script: ${validation.error}`));
    return { ran: false, success: false };
  }

  spinner.text = `Running build script: ${buildScript}`;

  const { status, error } = executeScript(buildScript, process.cwd());

  if (error) {
    spinner.fail(chalk.red(`Build script failed: ${error.message}`));
    return { ran: true, success: false };
  }

  if (status !== 0) {
    spinner.fail(chalk.red(`Build script exited with code ${status}`));
    return { ran: true, success: false };
  }

  return { ran: true, success: true };
}

/**
 * Determine if build should run
 *
 * Decision logic:
 * 1. --no-build flag: always skip
 * 2. No build config: nothing to run
 * 3. --build flag: always run without prompting
 * 4. config.build.autoRun: run without prompting
 * 5. Otherwise: prompt user
 *
 * @param config - The loaded configuration
 * @param options - Sync command options
 * @returns true if build should run
 */
export async function shouldRunBuild(
  config: any,
  options: SyncOptions
): Promise<boolean> {
  // --no-build flag: always skip
  if (options.noBuild) {
    return false;
  }

  // No build config: nothing to run
  if (!hasBuildConfig(config)) {
    return false;
  }

  // --build flag: always run without prompting
  if (options.build) {
    return true;
  }

  // config.build.autoRun: run without prompting
  if (config.build?.autoRun) {
    return true;
  }

  // Show what build steps would run and ask for confirmation
  const steps = getBuildStepsSummary(config);
  console.log(chalk.cyan('\n  Build configuration detected:'));
  for (const step of steps) {
    console.log(chalk.dim(`    - ${step}`));
  }

  return await confirmPrompt('\n  Run build after sync? (y/n): ');
}

/**
 * Run the complete build pipeline
 *
 * Executes:
 * 1. Build script (if configured)
 * 2. CSS generation (if enabled)
 *
 * @param baseline - The baseline data
 * @param config - The loaded configuration
 * @param spinner - Ora spinner instance
 * @returns Build result with script and CSS status
 */
export async function runBuildPipeline(
  baseline: BaselineData,
  config: any,
  spinner: Spinner
): Promise<BuildResult> {
  let scriptRan = false;
  let cssFilesWritten = 0;

  // 1. Run build script if configured
  if (config.build?.script) {
    spinner.stop();
    console.log(chalk.cyan(`\n  Running build script: ${config.build.script}\n`));

    const buildResult = await runBuildScript(config, spinner);
    scriptRan = buildResult.ran;

    if (!buildResult.success) {
      throw new Error('Build script failed');
    }

    spinner.start('Running build pipeline...');
  }

  // 2. Generate CSS if enabled
  if (config.build?.css?.enabled) {
    spinner.text = 'Generating CSS output...';
    const cssResult = await generateCssFromBaseline(baseline, config);
    cssFilesWritten = cssResult.files.length;
  }

  return { scriptRan, cssFilesWritten };
}
