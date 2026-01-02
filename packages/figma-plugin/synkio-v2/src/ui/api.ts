// =============================================================================
// UI API - Functions that can be called from components
// =============================================================================

import { GitHubSettings } from '../lib/types';

// Router reference - set by main.ts after router creation
let routerRef: {
  getState: () => any;
  updateState: (partial: any) => void;
} | null = null;

export function setRouterRef(router: { getState: () => any; updateState: (partial: any) => void }) {
  routerRef = router;
}

// =============================================================================
// Test Path (tests if a specific file/repo exists)
// =============================================================================

export async function testPath(
  github: GitHubSettings,
  path: string,
  testType: 'repo' | 'exportPath' | 'prPath'
) {
  try {
    const { owner, repo, branch, token } = github;

    // For 'repo' test, just check if the branch exists (no specific file needed)
    if (testType === 'repo') {
      const url = `https://api.github.com/repos/${owner}/${repo}/branches/${branch || 'main'}`;
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) headers['Authorization'] = `token ${token}`;

      const response = await fetch(url, { headers });
      if (response.ok) {
        updatePathTestResult(testType, true);
      } else {
        let errorMsg = response.status === 404
          ? (token ? 'Repository or branch not found' : 'Not found or private')
          : `HTTP ${response.status}`;
        updatePathTestResult(testType, false, errorMsg);
      }
      return;
    }

    // For file paths, check if the file exists
    const url = token
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch || 'main'}`
      : `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}/${path}`;

    const headers: Record<string, string> = {
      'Accept': token ? 'application/vnd.github.v3+json' : 'application/json',
    };
    if (token) headers['Authorization'] = `token ${token}`;

    const response = await fetch(url, { headers, method: 'HEAD' });

    if (response.ok) {
      updatePathTestResult(testType, true);
    } else if (response.status === 404) {
      // 404 means file doesn't exist yet - show as warning
      updatePathTestResult(testType, false, 'File not found. Run CLI to generate.', true);
    } else {
      updatePathTestResult(testType, false, `HTTP ${response.status}`);
    }
  } catch (error) {
    updatePathTestResult(testType, false, String(error));
  }
}

// Helper to update path test result in router state
function updatePathTestResult(
  testType: 'repo' | 'exportPath' | 'prPath',
  success: boolean,
  error?: string,
  warning?: boolean
) {
  if (!routerRef) {
    console.error('Router not initialized');
    return;
  }

  const currentState = routerRef.getState();
  const currentFormState = currentState.setupFormState || {
    editingSource: null,
    githubForm: {},
    urlForm: {},
    connectionStatus: { tested: false },
  };

  routerRef.updateState({
    setupFormState: {
      ...currentFormState,
      pathTests: {
        ...currentFormState.pathTests,
        [testType]: { tested: true, success, warning, error },
      },
    },
  });
}
