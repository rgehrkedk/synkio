/**
 * Serve Command
 *
 * Starts a local HTTP server to serve the baseline file for the Figma plugin to fetch.
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import chalk from 'chalk';

export interface ServeOptions {
  port?: string | number;
  token?: string;    // User-provided token
  noToken?: boolean; // Disable token requirement
}

const DEFAULT_PORT = 3847;
const DEFAULT_BASELINE_PATH = 'synkio/baseline.json';
const MIN_PORT = 1;
const MAX_PORT = 65535;
const PRIVILEGED_PORT = 1024;

/**
 * Format timestamp for request logging
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
}

/**
 * Validate and parse port number
 */
function validatePort(port: string | number | undefined): number {
  if (port === undefined) {
    return DEFAULT_PORT;
  }

  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;

  if (isNaN(portNum)) {
    throw new Error(`Invalid port: "${port}" is not a number`);
  }

  if (portNum < MIN_PORT || portNum > MAX_PORT) {
    throw new Error(`Invalid port: ${portNum}. Must be between ${MIN_PORT} and ${MAX_PORT}`);
  }

  if (portNum < PRIVILEGED_PORT) {
    console.warn(chalk.yellow(`  Warning: Port ${portNum} is privileged and may require elevated permissions\n`));
  }

  return portNum;
}

/**
 * Generate a random access token
 */
function generateToken(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Synkio-Token');
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(res: ServerResponse): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking (shouldn't be embedded)
  res.setHeader('X-Frame-Options', 'DENY');

  // CSP - only allow JSON responses
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

  // Disable caching for security
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
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

    // Validate JSON before serving
    try {
      JSON.parse(content);
    } catch (e) {
      addCorsHeaders(res);
      addSecurityHeaders(res);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({
        error: 'Invalid JSON in baseline file',
        message: 'The baseline file contains invalid JSON. Re-run export-baseline.',
      }));
      return;
    }

    addCorsHeaders(res);
    addSecurityHeaders(res);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.writeHead(200);
    res.end(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      addCorsHeaders(res);
      addSecurityHeaders(res);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(404);
      res.end(JSON.stringify({
        error: 'Baseline file not found',
        message: 'Run synkio pull or synkio export-baseline first to create synkio/baseline.json',
      }));
    } else {
      addCorsHeaders(res);
      addSecurityHeaders(res);
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
  let port: number;

  try {
    port = validatePort(options.port);
  } catch (error: any) {
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
    process.exit(1);
  }

  const baselinePath = resolve(process.cwd(), DEFAULT_BASELINE_PATH);

  // Generate or use provided token
  const accessToken = options.noToken ? null : (options.token || generateToken());

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const timestamp = formatTimestamp();
    const method = req.method || 'GET';
    const url = req.url || '/';

    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
      handleOptions(res);
      return;
    }

    // Validate token if required
    if (accessToken) {
      const providedToken = req.headers['x-synkio-token'] as string | undefined ||
        new URL(req.url!, `http://localhost`).searchParams.get('token');

      if (providedToken !== accessToken) {
        console.log(chalk.dim(`[${timestamp}]`), chalk.red('401 Unauthorized'), url);
        addCorsHeaders(res);
        addSecurityHeaders(res);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Invalid or missing token' }));
        return;
      }
    }

    // Log request
    console.log(chalk.dim(`[${timestamp}]`), chalk.cyan(method), url);

    // Route requests
    if (url === '/' || url === '/baseline' || url.startsWith('/baseline?')) {
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

    if (accessToken) {
      console.log(chalk.dim('  Token:  '), chalk.yellow(accessToken));
      console.log(chalk.dim('  URL:    '), chalk.blue(`http://localhost:${port}/baseline?token=${accessToken}`));
    } else {
      console.log(chalk.dim('  URL:    '), chalk.blue(`http://localhost:${port}/baseline`));
      console.log(chalk.yellow('  Warning: Token authentication disabled'));
    }

    console.log(chalk.dim('  Health: '), chalk.blue(`http://localhost:${port}/health`));
    console.log('');
    console.log(chalk.cyan('  In the Figma plugin:'));
    console.log(chalk.dim('    1. Go to Settings'));
    console.log(chalk.dim('    2. Select "Local Server"'));
    console.log(chalk.dim(`    3. Port: ${port}`));
    if (accessToken) {
      console.log(chalk.dim(`    4. Token: ${accessToken}`));
    }
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
