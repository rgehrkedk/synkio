/**
 * Serve Command
 *
 * Starts a local HTTP server to serve the baseline file for the Figma plugin to fetch.
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';

export interface ServeOptions {
  port?: string | number;
}

const DEFAULT_PORT = 3847;
const DEFAULT_BASELINE_PATH = '.synkio/export-baseline.json';

/**
 * Format timestamp for request logging
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Handle OPTIONS preflight request
 */
function handleOptions(res: ServerResponse): void {
  addCorsHeaders(res);
  res.writeHead(204);
  res.end();
}

/**
 * Serve the baseline JSON file
 */
async function serveBaseline(res: ServerResponse, baselinePath: string): Promise<void> {
  try {
    const content = await readFile(baselinePath, 'utf-8');
    addCorsHeaders(res);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      addCorsHeaders(res);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(404);
      res.end(JSON.stringify({
        error: 'Baseline file not found',
        message: 'Run synkio export-baseline first',
      }));
    } else {
      addCorsHeaders(res);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }));
    }
  }
}

/**
 * Serve health check endpoint
 */
function serveHealth(res: ServerResponse): void {
  addCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.end(JSON.stringify({ status: 'ok' }));
}

/**
 * Handle 404 Not Found
 */
function serve404(res: ServerResponse): void {
  addCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(404);
  res.end(JSON.stringify({
    error: 'Not found',
    message: 'Valid endpoints: /, /baseline, /health',
  }));
}

/**
 * Serve command - starts HTTP server to serve baseline file
 */
export async function serveCommand(options: ServeOptions = {}): Promise<void> {
  const port = options.port ? Number(options.port) : DEFAULT_PORT;
  const baselinePath = resolve(process.cwd(), DEFAULT_BASELINE_PATH);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const timestamp = formatTimestamp();
    const method = req.method || 'GET';
    const url = req.url || '/';

    // Log request
    console.log(chalk.dim(`[${timestamp}]`), chalk.cyan(method), url);

    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
      handleOptions(res);
      return;
    }

    // Route requests
    if (url === '/' || url === '/baseline') {
      await serveBaseline(res, baselinePath);
    } else if (url === '/health') {
      serveHealth(res);
    } else {
      serve404(res);
    }
  });

  // Error handling
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(chalk.red(`\n  Error: Port ${port} is already in use\n`));
      console.error(chalk.dim('  Try a different port with --port=<number>\n'));
    } else {
      console.error(chalk.red(`\n  Server error: ${error.message}\n`));
    }
    process.exit(1);
  });

  // Start server
  server.listen(port, () => {
    console.log('');
    console.log(chalk.cyan.bold('  Synkio baseline server running'));
    console.log('');
    console.log(chalk.dim('  Local:  '), chalk.blue(`http://localhost:${port}/baseline`));
    console.log(chalk.dim('  Health: '), chalk.blue(`http://localhost:${port}/health`));
    console.log('');
    console.log(chalk.cyan('  In the Figma plugin:'));
    console.log(chalk.dim('    1. Go to Settings'));
    console.log(chalk.dim('    2. Select "Local Server"'));
    console.log(chalk.dim(`    3. Port: ${port}`));
    console.log('');
    console.log(chalk.dim('  Press Ctrl+C to stop'));
    console.log('');
  });

  // Graceful shutdown on SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    console.log('');
    console.log(chalk.yellow('  Shutting down server...'));
    server.close(() => {
      console.log(chalk.dim('  Server stopped'));
      console.log('');
      process.exit(0);
    });
  });
}
