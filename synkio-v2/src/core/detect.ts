import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Define the structure of the detected project settings
export interface DetectedProject {
  framework?: 'nextjs' | 'vite' | 'remix' | 'cra';
  tokensDir?: string;
  styleDictionary?: { config: string; version: 'v3' | 'v4' };
  buildCommand?: string;
}

// Function to safely read and parse a JSON file
function readJsonFile<T>(filePath: string): T | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    // Silently ignore errors (e.g., malformed JSON)
    return undefined;
  }
}

// Detects the project framework from package.json
function detectFramework(pkg: any): DetectedProject['framework'] {
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    if (dependencies.next) return 'nextjs';
    if (dependencies.vite) return 'vite';
    if (dependencies['@remix-run/dev']) return 'remix';
    if (dependencies['react-scripts']) return 'cra';
    return undefined;
}

// Detects the most likely tokens directory
function detectTokensDir(): string | undefined {
    const commonDirs = ['tokens', 'src/tokens', 'styles/tokens'];
    for (const dir of commonDirs) {
        if (existsSync(resolve(process.cwd(), dir))) {
            return dir;
        }
    }
    return undefined;
}

// Detects Style Dictionary config
function detectStyleDictionary(): DetectedProject['styleDictionary'] {
    const commonConfigs = [
        'style-dictionary.config.js',
        'style-dictionary.config.json',
        'sd.config.js',
        'sd.config.json',
    ];
    for (const config of commonConfigs) {
        if (existsSync(resolve(process.cwd(), config))) {
            // A simple version detection could be added here by reading the file
            // but for now we'll just return v4 as a default guess.
            return { config, version: 'v4' };
        }
    }
    return undefined;
}

// Detects a token build script in package.json
function detectBuildCommand(pkg: any): string | undefined {
    const scripts = pkg.scripts || {};
    const buildScripts = ['tokens:build', 'build:tokens', 'style-dictionary:build'];
    for (const script of buildScripts) {
        if (scripts[script]) {
            return `npm run ${script}`;
        }
    }
    return undefined;
}


/**
 * Analyzes the project structure to detect framework, token paths, and build tools.
 * This is a lightweight detection mechanism focusing on convention over configuration.
 */
export function detectProject(): DetectedProject {
  const project: DetectedProject = {};
  const pkgPath = resolve(process.cwd(), 'package.json');
  const pkg = readJsonFile<{ dependencies?: any; devDependencies?: any; scripts?: any }>(pkgPath);

  if (pkg) {
    project.framework = detectFramework(pkg);
    project.buildCommand = detectBuildCommand(pkg);
  }

  project.tokensDir = detectTokensDir();
  project.styleDictionary = detectStyleDictionary();

  return project;
}
