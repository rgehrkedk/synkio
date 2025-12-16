/**
 * Lightweight, anonymous telemetry for tracking CLI usage.
 *
 * Privacy-first design:
 * - Generates a random anonymous UUID (no personal data)
 * - Only tracks: command name, Node.js version, OS platform, CLI version
 * - Fire-and-forget: never blocks CLI execution
 * - Respects SYNKIO_NO_TRACK environment variable
 *
 * Opt-out: Set SYNKIO_NO_TRACK=1 or SYNKIO_NO_TRACK=true
 */

import { homedir } from 'os';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

// PostHog public project API key (safe to expose - it's a write-only key)
// To set up your own PostHog project:
// 1. Sign up at https://posthog.com (free tier: 1M events/month)
// 2. Create a new project
// 3. Copy the project API key and replace below
const POSTHOG_API_KEY = 'phc_REPLACE_WITH_YOUR_PROJECT_API_KEY';
const POSTHOG_HOST = 'https://us.i.posthog.com';

// Telemetry config stored in user's home directory
const TELEMETRY_CONFIG_DIR = join(homedir(), '.synkio');
const TELEMETRY_CONFIG_FILE = join(TELEMETRY_CONFIG_DIR, 'telemetry.json');

// Timeout for telemetry requests (ms) - short to never block CLI
const REQUEST_TIMEOUT_MS = 3000;

interface TelemetryConfig {
  anonymousId: string;
  createdAt: string;
}

/**
 * Check if telemetry is disabled via environment variable.
 */
function isOptedOut(): boolean {
  const envValue = process.env.SYNKIO_NO_TRACK;
  if (!envValue) return false;
  return envValue === '1' || envValue.toLowerCase() === 'true';
}

/**
 * Get or create the anonymous user ID.
 * Stored locally so we can count unique users vs total runs.
 */
function getAnonymousId(): string {
  try {
    // Try to read existing config
    if (existsSync(TELEMETRY_CONFIG_FILE)) {
      const config: TelemetryConfig = JSON.parse(
        readFileSync(TELEMETRY_CONFIG_FILE, 'utf-8')
      );
      if (config.anonymousId) {
        return config.anonymousId;
      }
    }

    // Create new anonymous ID
    const anonymousId = randomUUID();
    const config: TelemetryConfig = {
      anonymousId,
      createdAt: new Date().toISOString(),
    };

    // Ensure directory exists
    if (!existsSync(TELEMETRY_CONFIG_DIR)) {
      mkdirSync(TELEMETRY_CONFIG_DIR, { recursive: true });
    }

    // Save config (fail silently if we can't write)
    try {
      writeFileSync(TELEMETRY_CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch {
      // Ignore write errors - use in-memory ID this session
    }

    return anonymousId;
  } catch {
    // If anything fails, generate a temporary ID for this session
    return randomUUID();
  }
}

interface TrackEventOptions {
  command: string;
  cliVersion: string;
  properties?: Record<string, string | number | boolean>;
}

/**
 * Track a CLI command execution.
 *
 * This is a fire-and-forget function - it will never throw or block.
 * If the request fails (no internet, timeout, etc.), it fails silently.
 *
 * @param options.command - The CLI command being executed (e.g., 'sync', 'init')
 * @param options.cliVersion - The CLI version from package.json
 * @param options.properties - Optional additional properties to track
 */
export function trackEvent(options: TrackEventOptions): void {
  // Early return if opted out - do absolutely nothing
  if (isOptedOut()) {
    return;
  }

  // Skip if PostHog key not configured
  if (POSTHOG_API_KEY.includes('REPLACE_WITH_YOUR')) {
    return;
  }

  // Run async logic without blocking
  const sendEvent = async () => {
    try {
      const anonymousId = getAnonymousId();

      // PostHog capture event payload
      // See: https://posthog.com/docs/api/capture
      const payload = {
        api_key: POSTHOG_API_KEY,
        event: `cli_${options.command}`,
        distinct_id: anonymousId,
        properties: {
          // Core properties
          $lib: 'synkio-cli',
          $lib_version: options.cliVersion,

          // Tracked data (anonymous)
          command: options.command,
          cli_version: options.cliVersion,
          node_version: process.version,
          os_platform: process.platform,
          os_arch: process.arch,

          // Tell PostHog to not store IP address
          $ip: null,

          // Additional properties
          ...options.properties,
        },
        timestamp: new Date().toISOString(),
      };

      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      await fetch(`${POSTHOG_HOST}/capture/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch {
      // Silently ignore all errors - this is fire-and-forget
    }
  };

  // Execute without awaiting - truly fire-and-forget
  // This ensures the CLI never waits for telemetry
  sendEvent();
}

/**
 * Track CLI startup with the executed command.
 * Convenience wrapper for the most common use case.
 */
export function trackCommand(command: string, cliVersion: string): void {
  trackEvent({
    command,
    cliVersion,
  });
}
