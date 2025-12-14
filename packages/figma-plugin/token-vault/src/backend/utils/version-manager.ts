/**
 * Version management and SemVer bump detection
 *
 * Detects changes between baselines and calculates appropriate version bumps
 * following Semantic Versioning 2.0.0 rules.
 *
 * Version Bump Rules:
 * - MAJOR (x.0.0): Breaking changes (token deleted, renamed, type changed)
 * - MINOR (0.y.0): Additions (new token, collection, mode)
 * - PATCH (0.0.z): Updates (value changed, description updated, alias changed)
 */

export type ChangeType = 'breaking' | 'addition' | 'patch';
export type ChangeSeverity = 'critical' | 'warning' | 'info';

export interface TokenChange {
  type: ChangeType;
  severity: ChangeSeverity;
  category: 'token-deleted' | 'token-added' | 'token-renamed' |
            'type-changed' | 'value-changed' | 'alias-changed' |
            'collection-deleted' | 'collection-added' |
            'mode-deleted' | 'mode-added' | 'description-changed';
  path: string;
  description: string;
  before?: any;
  after?: any;
}

export interface VersionBump {
  current: string;
  suggested: string;
  changeType: 'major' | 'minor' | 'patch' | 'none';
  changes: TokenChange[];
  breakingCount: number;
  additionCount: number;
  patchCount: number;
  summary: string;
}

/**
 * Calculate version bump by comparing two baselines
 *
 * @param currentVersion - Current version string (e.g., "1.0.0")
 * @param previousBaseline - Previous baseline data object
 * @param newBaseline - New baseline data object
 * @returns Version bump result with suggested version and changes
 */
export function calculateVersionBump(
  currentVersion: string,
  previousBaseline: any,
  newBaseline: any
): VersionBump {
  const changes = detectChanges(previousBaseline, newBaseline);

  // Count by type
  const breaking = changes.filter(c => c.type === 'breaking');
  const additions = changes.filter(c => c.type === 'addition');
  const patches = changes.filter(c => c.type === 'patch');

  // Determine bump type (breaking > addition > patch)
  let changeType: 'major' | 'minor' | 'patch' | 'none';
  if (breaking.length > 0) {
    changeType = 'major';
  } else if (additions.length > 0) {
    changeType = 'minor';
  } else if (patches.length > 0) {
    changeType = 'patch';
  } else {
    changeType = 'none';
  }

  const suggested = bumpVersion(currentVersion, changeType);
  const summary = generateSummary(breaking.length, additions.length, patches.length);

  return {
    current: currentVersion,
    suggested,
    changeType,
    changes,
    breakingCount: breaking.length,
    additionCount: additions.length,
    patchCount: patches.length,
    summary
  };
}

/**
 * Detect all changes between two baselines
 *
 * Compares token-level changes (deletions, additions, modifications)
 * and collection-level changes (collections, modes)
 *
 * @param prev - Previous baseline object
 * @param next - New baseline object
 * @returns Array of detected changes
 */
function detectChanges(prev: any, next: any): TokenChange[] {
  const changes: TokenChange[] = [];

  // Handle empty or invalid baselines
  const prevBaseline = prev?.baseline || {};
  const nextBaseline = next?.baseline || {};

  const prevTokens = new Map(Object.entries(prevBaseline));
  const nextTokens = new Map(Object.entries(nextBaseline));

  // Detect deletions (breaking)
  Array.from(prevTokens.entries()).forEach(([key, token]) => {
    if (!nextTokens.has(key)) {
      const t = token as any;
      changes.push({
        type: 'breaking',
        severity: 'critical',
        category: 'token-deleted',
        path: t.path || key,
        description: `Token deleted: ${t.path || key}`,
        before: token
      });
    }
  });

  // Detect additions (minor)
  Array.from(nextTokens.entries()).forEach(([key, token]) => {
    if (!prevTokens.has(key)) {
      const t = token as any;
      changes.push({
        type: 'addition',
        severity: 'info',
        category: 'token-added',
        path: t.path || key,
        description: `Token added: ${t.path || key}`,
        after: token
      });
    }
  });

  // Detect modifications
  Array.from(nextTokens.entries()).forEach(([key, nextToken]) => {
    const prevToken = prevTokens.get(key);
    if (!prevToken) return;

    const prev = prevToken as any;
    const next = nextToken as any;

    // Path change = rename (breaking)
    if (prev.path !== next.path) {
      changes.push({
        type: 'breaking',
        severity: 'critical',
        category: 'token-renamed',
        path: prev.path,
        description: `Token renamed: ${prev.path} → ${next.path}`,
        before: prev,
        after: next
      });
    }
    // Type change (breaking)
    else if (prev.type !== next.type) {
      changes.push({
        type: 'breaking',
        severity: 'critical',
        category: 'type-changed',
        path: next.path,
        description: `Type changed: ${prev.type} → ${next.type}`,
        before: prev,
        after: next
      });
    }
    // Value change (patch)
    else if (prev.value !== next.value) {
      // Check if alias changed
      const prevIsAlias = typeof prev.value === 'string' && prev.value.startsWith('{');
      const nextIsAlias = typeof next.value === 'string' && next.value.startsWith('{');

      if (prevIsAlias || nextIsAlias) {
        changes.push({
          type: 'patch',
          severity: 'info',
          category: 'alias-changed',
          path: next.path,
          description: `Alias changed: ${prev.value} → ${next.value}`,
          before: prev,
          after: next
        });
      } else {
        changes.push({
          type: 'patch',
          severity: 'info',
          category: 'value-changed',
          path: next.path,
          description: `Value updated: ${prev.value} → ${next.value}`,
          before: prev,
          after: next
        });
      }
    }
    // Description change (patch)
    else if (prev.description !== next.description) {
      changes.push({
        type: 'patch',
        severity: 'info',
        category: 'description-changed',
        path: next.path,
        description: `Description updated: ${prev.description || '(empty)'} → ${next.description || '(empty)'}`,
        before: prev,
        after: next
      });
    }
  });

  // Detect collection and mode changes
  changes.push(...detectCollectionChanges(prevBaseline, nextBaseline));

  return changes;
}

/**
 * Detect collection and mode additions and deletions
 *
 * Extracts unique collections and modes from token data
 * and compares them to detect structural changes
 *
 * @param prevBaseline - Previous baseline tokens
 * @param nextBaseline - New baseline tokens
 * @returns Array of collection/mode changes
 */
function detectCollectionChanges(prevBaseline: any, nextBaseline: any): TokenChange[] {
  const changes: TokenChange[] = [];

  const prevCollections = new Set<string>();
  const nextCollections = new Set<string>();
  const prevModes = new Map<string, Set<string>>();
  const nextModes = new Map<string, Set<string>>();

  // Extract collections and modes from previous baseline
  Object.values(prevBaseline).forEach((token: any) => {
    if (token.collection) {
      prevCollections.add(token.collection);
      if (!prevModes.has(token.collection)) {
        prevModes.set(token.collection, new Set());
      }
      if (token.mode) {
        prevModes.get(token.collection)!.add(token.mode);
      }
    }
  });

  // Extract collections and modes from new baseline
  Object.values(nextBaseline).forEach((token: any) => {
    if (token.collection) {
      nextCollections.add(token.collection);
      if (!nextModes.has(token.collection)) {
        nextModes.set(token.collection, new Set());
      }
      if (token.mode) {
        nextModes.get(token.collection)!.add(token.mode);
      }
    }
  });

  // Collection deletions (breaking)
  Array.from(prevCollections).forEach(collection => {
    if (!nextCollections.has(collection)) {
      changes.push({
        type: 'breaking',
        severity: 'critical',
        category: 'collection-deleted',
        path: collection,
        description: `Collection deleted: ${collection}`
      });
    }
  });

  // Collection additions (minor)
  Array.from(nextCollections).forEach(collection => {
    if (!prevCollections.has(collection)) {
      changes.push({
        type: 'addition',
        severity: 'info',
        category: 'collection-added',
        path: collection,
        description: `Collection added: ${collection}`
      });
    }
  });

  // Mode deletions (breaking)
  Array.from(prevModes.entries()).forEach(([collection, modes]) => {
    const nextCollectionModes = nextModes.get(collection);
    if (!nextCollectionModes) return;

    Array.from(modes).forEach(mode => {
      if (!nextCollectionModes.has(mode)) {
        changes.push({
          type: 'breaking',
          severity: 'critical',
          category: 'mode-deleted',
          path: `${collection}.${mode}`,
          description: `Mode deleted: ${mode} from collection ${collection}`
        });
      }
    });
  });

  // Mode additions (minor)
  Array.from(nextModes.entries()).forEach(([collection, modes]) => {
    const prevCollectionModes = prevModes.get(collection);
    if (!prevCollectionModes) return;

    Array.from(modes).forEach(mode => {
      if (!prevCollectionModes.has(mode)) {
        changes.push({
          type: 'addition',
          severity: 'info',
          category: 'mode-added',
          path: `${collection}.${mode}`,
          description: `Mode added: ${mode} to collection ${collection}`
        });
      }
    });
  });

  return changes;
}

/**
 * Bump version according to SemVer rules
 *
 * @param version - Current version string (e.g., "1.0.0")
 * @param type - Type of bump (major, minor, patch, none)
 * @returns New version string
 */
function bumpVersion(version: string, type: 'major' | 'minor' | 'patch' | 'none'): string {
  const [major, minor, patch] = version.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'none':
      return version;
  }
}

/**
 * Generate human-readable summary of changes
 *
 * @param breaking - Number of breaking changes
 * @param additions - Number of additions
 * @param patches - Number of patches
 * @returns Summary string
 */
function generateSummary(breaking: number, additions: number, patches: number): string {
  const parts: string[] = [];

  if (breaking > 0) {
    parts.push(`${breaking} breaking change${breaking > 1 ? 's' : ''}`);
  }
  if (additions > 0) {
    parts.push(`${additions} addition${additions > 1 ? 's' : ''}`);
  }
  if (patches > 0) {
    parts.push(`${patches} update${patches > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'No changes detected';
  }

  return parts.join(', ');
}

/**
 * Parse version string to components
 *
 * @param version - Version string (e.g., "1.2.3")
 * @returns Version components
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

/**
 * Compare two versions
 *
 * @param a - First version string
 * @param b - Second version string
 * @returns Negative if a < b, 0 if equal, positive if a > b
 */
export function compareVersions(a: string, b: string): number {
  const vA = parseVersion(a);
  const vB = parseVersion(b);

  if (vA.major !== vB.major) return vA.major - vB.major;
  if (vA.minor !== vB.minor) return vA.minor - vB.minor;
  return vA.patch - vB.patch;
}
