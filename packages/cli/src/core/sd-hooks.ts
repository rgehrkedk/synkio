/**
 * Style Dictionary Hooks Integration
 *
 * Dynamically imports Style Dictionary (if available) to access its built-in
 * transform groups and transforms. This uses SD's actual transform functions
 * rather than reimplementing them, ensuring we stay in sync with SD's behavior.
 *
 * SD is an optional peer dependency - if not installed, we fall back to
 * showing only Synkio's native outputs (JSON nested, CSS variables).
 */

export interface SDPlatformInfo {
  /** The name transform used (e.g., 'name/camel', 'name/snake') */
  nameTransform: string;
  /** All transforms in this group */
  transforms: string[];
}

export interface SDHooks {
  transformGroups: Record<string, string[]>;
  // Using 'any' for transforms since we dynamically call them with a minimal token object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transforms: Record<string, { type: string; transform: (token: any, ...args: any[]) => any }>;
  formats: Record<string, unknown>;
}

let cachedHooks: SDHooks | null = null;
let sdAvailable: boolean | null = null;

/**
 * Attempt to load Style Dictionary hooks
 * Returns null if SD is not installed
 */
export async function getSDHooks(): Promise<SDHooks | null> {
  if (sdAvailable === false) {
    return null;
  }

  if (cachedHooks) {
    return cachedHooks;
  }

  try {
    const StyleDictionary = (await import('style-dictionary')).default;
    cachedHooks = {
      transformGroups: StyleDictionary.hooks.transformGroups,
      transforms: StyleDictionary.hooks.transforms,
      formats: StyleDictionary.hooks.formats,
    };
    sdAvailable = true;
    return cachedHooks;
  } catch {
    sdAvailable = false;
    return null;
  }
}

/**
 * Get platform info for a given transform group
 */
export async function getSDPlatformInfo(transformGroup: string): Promise<SDPlatformInfo | null> {
  const hooks = await getSDHooks();
  if (!hooks) {
    return null;
  }

  const transforms = hooks.transformGroups[transformGroup];
  if (!transforms) {
    return null;
  }

  const nameTransform = transforms.find(t => t.startsWith('name/'));
  if (!nameTransform) {
    return null;
  }

  return {
    nameTransform,
    transforms,
  };
}

/**
 * Get platform info for multiple transform groups
 */
export async function getSDPlatformsInfo(
  platforms: Record<string, { transformGroup?: string }>
): Promise<Record<string, SDPlatformInfo>> {
  const result: Record<string, SDPlatformInfo> = {};

  for (const [platformName, platformConfig] of Object.entries(platforms)) {
    // Use explicit transformGroup, or fall back to platform name as the group
    const transformGroup = platformConfig.transformGroup || platformName;
    const info = await getSDPlatformInfo(transformGroup);
    if (info) {
      result[platformName] = info;
    }
  }

  return result;
}

/**
 * Apply a name transform to a token path using SD's actual transform function
 * Returns null if SD is not available or transform not found
 */
export async function applySDNameTransform(
  tokenPath: string,
  nameTransform: string,
  prefix?: string
): Promise<string | null> {
  const hooks = await getSDHooks();
  if (!hooks) {
    return null;
  }

  const transform = hooks.transforms[nameTransform];
  if (!transform || typeof transform.transform !== 'function') {
    return null;
  }

  // Create a mock token object with the path array that SD expects
  const mockToken = {
    path: tokenPath.split('.'),
  };

  // SD transforms expect a config object with optional prefix
  const mockConfig = {
    prefix: prefix || '',
  };

  return transform.transform(mockToken, mockConfig);
}

/**
 * Check if Style Dictionary is available
 */
export async function isSDAvailable(): Promise<boolean> {
  if (sdAvailable !== null) {
    return sdAvailable;
  }
  await getSDHooks();
  return sdAvailable === true;
}
