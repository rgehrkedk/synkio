/**
 * Sync Changes Diff Component Tests
 *
 * Tests for the changes detection and version bump UI.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderSyncChangesDiff, hideSyncChangesDiff } from '../../../src/ui/components/sync-changes-diff.js';
import type { VersionBump, TokenChange } from '../../../src/backend/utils/version-manager.js';

describe('renderSyncChangesDiff', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="syncChangesSection"></div>';
  });

  it('should render the sync changes section', () => {
    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '2.0.0',
      changeType: 'major',
      changes: [],
      breakingCount: 0,
      additionCount: 0,
      patchCount: 0,
      summary: 'No changes'
    };

    renderSyncChangesDiff(versionBump);

    const container = document.getElementById('syncChangesSection');
    expect(container?.style.display).toBe('block');
    expect(container?.innerHTML).toContain('Changes Detected');
  });

  it('should display breaking changes section', () => {
    const changes: TokenChange[] = [
      {
        type: 'breaking',
        severity: 'critical',
        category: 'token-deleted',
        path: 'colors/primary',
        description: 'Token deleted: colors/primary'
      },
      {
        type: 'breaking',
        severity: 'critical',
        category: 'token-renamed',
        path: 'spacing/base',
        description: 'Token renamed: spacing/base → spacing/default'
      }
    ];

    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '2.0.0',
      changeType: 'major',
      changes,
      breakingCount: 2,
      additionCount: 0,
      patchCount: 0,
      summary: '2 breaking changes'
    };

    renderSyncChangesDiff(versionBump);

    const container = document.getElementById('syncChangesSection');
    expect(container?.innerHTML).toContain('Breaking Changes');
    expect(container?.innerHTML).toContain('(2)');
    expect(container?.innerHTML).toContain('MAJOR');
    expect(container?.innerHTML).toContain('Token deleted: colors/primary');
    expect(container?.innerHTML).toContain('Token renamed: spacing/base → spacing/default');
  });

  it('should display addition changes section', () => {
    const changes: TokenChange[] = [
      {
        type: 'addition',
        severity: 'info',
        category: 'token-added',
        path: 'colors/accent',
        description: 'Token added: colors/accent'
      },
      {
        type: 'addition',
        severity: 'info',
        category: 'mode-added',
        path: 'theme.high-contrast',
        description: 'Mode added: high-contrast'
      }
    ];

    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '1.1.0',
      changeType: 'minor',
      changes,
      breakingCount: 0,
      additionCount: 2,
      patchCount: 0,
      summary: '2 additions'
    };

    renderSyncChangesDiff(versionBump);

    const container = document.getElementById('syncChangesSection');
    expect(container?.innerHTML).toContain('New Additions');
    expect(container?.innerHTML).toContain('(2)');
    expect(container?.innerHTML).toContain('MINOR');
    expect(container?.innerHTML).toContain('Token added: colors/accent');
    expect(container?.innerHTML).toContain('Mode added: high-contrast');
  });

  it('should display patch changes section', () => {
    const changes: TokenChange[] = [
      {
        type: 'patch',
        severity: 'info',
        category: 'value-changed',
        path: 'colors/secondary',
        description: 'Value updated: #6c757d → #5a6268'
      },
      {
        type: 'patch',
        severity: 'info',
        category: 'value-changed',
        path: 'spacing/sm',
        description: 'Value updated: 8px → 6px'
      }
    ];

    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '1.0.1',
      changeType: 'patch',
      changes,
      breakingCount: 0,
      additionCount: 0,
      patchCount: 2,
      summary: '2 updates'
    };

    renderSyncChangesDiff(versionBump);

    const container = document.getElementById('syncChangesSection');
    expect(container?.innerHTML).toContain('Value Updates');
    expect(container?.innerHTML).toContain('(2)');
    expect(container?.innerHTML).toContain('PATCH');
    expect(container?.innerHTML).toContain('Value updated: #6c757d → #5a6268');
    expect(container?.innerHTML).toContain('Value updated: 8px → 6px');
  });

  it('should show all three change sections when mixed changes exist', () => {
    const changes: TokenChange[] = [
      {
        type: 'breaking',
        severity: 'critical',
        category: 'token-deleted',
        path: 'colors/primary',
        description: 'Token deleted: colors/primary'
      },
      {
        type: 'addition',
        severity: 'info',
        category: 'token-added',
        path: 'colors/accent',
        description: 'Token added: colors/accent'
      },
      {
        type: 'patch',
        severity: 'info',
        category: 'value-changed',
        path: 'spacing/sm',
        description: 'Value updated: 8px → 6px'
      }
    ];

    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '2.0.0',
      changeType: 'major',
      changes,
      breakingCount: 1,
      additionCount: 1,
      patchCount: 1,
      summary: '1 breaking change, 1 addition, 1 update'
    };

    renderSyncChangesDiff(versionBump);

    const container = document.getElementById('syncChangesSection');
    expect(container?.innerHTML).toContain('Breaking Changes');
    expect(container?.innerHTML).toContain('New Additions');
    expect(container?.innerHTML).toContain('Value Updates');
  });

  it('should display version bump correctly', () => {
    const versionBump: VersionBump = {
      current: '2.3.1',
      suggested: '3.0.0',
      changeType: 'major',
      changes: [],
      breakingCount: 0,
      additionCount: 0,
      patchCount: 0,
      summary: 'No changes'
    };

    renderSyncChangesDiff(versionBump);

    const container = document.getElementById('syncChangesSection');
    expect(container?.innerHTML).toContain('2.3.1');
    expect(container?.innerHTML).toContain('3.0.0');
    expect(container?.innerHTML).toContain('MAJOR');
  });

  it('should populate version override inputs with suggested version', () => {
    const versionBump: VersionBump = {
      current: '1.2.3',
      suggested: '2.0.0',
      changeType: 'major',
      changes: [],
      breakingCount: 0,
      additionCount: 0,
      patchCount: 0,
      summary: 'No changes'
    };

    renderSyncChangesDiff(versionBump);

    const majorInput = document.getElementById('versionMajor') as HTMLInputElement;
    const minorInput = document.getElementById('versionMinor') as HTMLInputElement;
    const patchInput = document.getElementById('versionPatch') as HTMLInputElement;

    expect(majorInput.value).toBe('2');
    expect(minorInput.value).toBe('0');
    expect(patchInput.value).toBe('0');
  });

  it('should update sync button text when version inputs change', () => {
    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '2.0.0',
      changeType: 'major',
      changes: [],
      breakingCount: 0,
      additionCount: 0,
      patchCount: 0,
      summary: 'No changes'
    };

    renderSyncChangesDiff(versionBump);

    const majorInput = document.getElementById('versionMajor') as HTMLInputElement;
    const syncBtn = document.getElementById('syncNowBtn') as HTMLButtonElement;

    expect(syncBtn.textContent).toContain('v2.0.0');

    majorInput.value = '3';
    majorInput.dispatchEvent(new Event('input'));

    expect(syncBtn.textContent).toContain('v3.0.0');
  });

  it('should truncate long change lists to 5 items', () => {
    const changes: TokenChange[] = Array.from({ length: 10 }, (_, i) => ({
      type: 'patch' as const,
      severity: 'info' as const,
      category: 'value-changed' as const,
      path: `token-${i}`,
      description: `Change ${i}`
    }));

    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '1.0.1',
      changeType: 'patch',
      changes,
      breakingCount: 0,
      additionCount: 0,
      patchCount: 10,
      summary: '10 updates'
    };

    renderSyncChangesDiff(versionBump);

    const container = document.getElementById('syncChangesSection');
    expect(container?.innerHTML).toContain('Change 0');
    expect(container?.innerHTML).toContain('Change 4');
    expect(container?.innerHTML).not.toContain('Change 5');
    expect(container?.innerHTML).toContain('... and 5 more');
  });

  it('should not show "more" message when exactly 5 changes', () => {
    const changes: TokenChange[] = Array.from({ length: 5 }, (_, i) => ({
      type: 'patch' as const,
      severity: 'info' as const,
      category: 'value-changed' as const,
      path: `token-${i}`,
      description: `Change ${i}`
    }));

    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '1.0.1',
      changeType: 'patch',
      changes,
      breakingCount: 0,
      additionCount: 0,
      patchCount: 5,
      summary: '5 updates'
    };

    renderSyncChangesDiff(versionBump);

    const container = document.getElementById('syncChangesSection');
    expect(container?.innerHTML).not.toContain('... and');
  });

  it('should render cancel and sync buttons', () => {
    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '2.0.0',
      changeType: 'major',
      changes: [],
      breakingCount: 0,
      additionCount: 0,
      patchCount: 0,
      summary: 'No changes'
    };

    renderSyncChangesDiff(versionBump);

    const cancelBtn = document.getElementById('cancelSyncBtn');
    const syncBtn = document.getElementById('syncNowBtn');

    expect(cancelBtn).toBeTruthy();
    expect(syncBtn).toBeTruthy();
    expect(cancelBtn?.textContent).toBe('Cancel');
    expect(syncBtn?.textContent).toContain('Sync Now');
  });

  it('should escape HTML in change descriptions', () => {
    const changes: TokenChange[] = [
      {
        type: 'patch',
        severity: 'info',
        category: 'value-changed',
        path: 'test',
        description: '<script>alert("xss")</script>'
      }
    ];

    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '1.0.1',
      changeType: 'patch',
      changes,
      breakingCount: 0,
      additionCount: 0,
      patchCount: 1,
      summary: '1 update'
    };

    renderSyncChangesDiff(versionBump);

    const container = document.getElementById('syncChangesSection');
    expect(container?.innerHTML).toContain('&lt;script&gt;');
    expect(container?.innerHTML).not.toContain('<script>alert');
  });

  it('should return early if container does not exist', () => {
    document.body.innerHTML = '';

    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '2.0.0',
      changeType: 'major',
      changes: [],
      breakingCount: 0,
      additionCount: 0,
      patchCount: 0,
      summary: 'No changes'
    };

    expect(() => renderSyncChangesDiff(versionBump)).not.toThrow();
  });
});

describe('hideSyncChangesDiff', () => {
  it('should hide the sync changes section', () => {
    document.body.innerHTML = '<div id="syncChangesSection" style="display: block;"><p>Content</p></div>';

    hideSyncChangesDiff();

    const container = document.getElementById('syncChangesSection');
    expect(container?.style.display).toBe('none');
    expect(container?.innerHTML).toBe('');
  });

  it('should handle missing container gracefully', () => {
    document.body.innerHTML = '';

    expect(() => hideSyncChangesDiff()).not.toThrow();
  });
});

describe('event handlers', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="syncChangesSection"></div>';
  });

  it('should call hideSyncChangesDiff when cancel button is clicked', () => {
    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '2.0.0',
      changeType: 'major',
      changes: [],
      breakingCount: 0,
      additionCount: 0,
      patchCount: 0,
      summary: 'No changes'
    };

    renderSyncChangesDiff(versionBump);

    const container = document.getElementById('syncChangesSection');
    expect(container?.style.display).toBe('block');

    const cancelBtn = document.getElementById('cancelSyncBtn') as HTMLButtonElement;
    cancelBtn.click();

    expect(container?.style.display).toBe('none');
  });

  it('should handle version override inputs for all three fields', () => {
    const versionBump: VersionBump = {
      current: '1.0.0',
      suggested: '2.0.0',
      changeType: 'major',
      changes: [],
      breakingCount: 0,
      additionCount: 0,
      patchCount: 0,
      summary: 'No changes'
    };

    renderSyncChangesDiff(versionBump);

    const majorInput = document.getElementById('versionMajor') as HTMLInputElement;
    const minorInput = document.getElementById('versionMinor') as HTMLInputElement;
    const patchInput = document.getElementById('versionPatch') as HTMLInputElement;
    const syncBtn = document.getElementById('syncNowBtn') as HTMLButtonElement;

    majorInput.value = '3';
    majorInput.dispatchEvent(new Event('input'));
    expect(syncBtn.textContent).toContain('v3.0.0');

    minorInput.value = '5';
    minorInput.dispatchEvent(new Event('input'));
    expect(syncBtn.textContent).toContain('v3.5.0');

    patchInput.value = '7';
    patchInput.dispatchEvent(new Event('input'));
    expect(syncBtn.textContent).toContain('v3.5.7');
  });
});
