/**
 * Build Runner Module
 *
 * Handles build script execution and the build pipeline
 * (script, CSS generation, etc.)
 */

import { execSync } from 'node:child_process';
import chalk from 'chalk';
import type { BaselineData } from '../../types/index.js';
import {
  generateCssFromBaseline,
  hasBuildConfig,
  getBuildStepsSummary,
} from '../output.js';
import { confirmPrompt } from '../../cli/utils.js';

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
 * Run the build script if configured
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

  spinner.text = `Running build script: ${buildScript}`;

  try {
    execSync(buildScript, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    return { ran: true, success: true };
  } catch (error: any) {
    spinner.fail(chalk.red(`Build script failed: ${error.message}`));
    return { ran: true, success: false };
  }
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
