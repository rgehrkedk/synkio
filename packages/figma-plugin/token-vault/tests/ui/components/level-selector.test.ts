/**
 * Level Selector Component Tests
 * Tests for level configuration UI and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderLevelSelector, getCurrentConfiguration, type AnalyzedLevel } from '../../../src/ui/components/level-selector';
import type { LevelConfiguration } from '../../../src/types/level-config.types';
import * as state from '../../../src/ui/state';

// Mock state module
vi.mock('../../../src/ui/state', () => ({
  updateLevelConfiguration: vi.fn(),
}));

describe('Level Selector Component', () => {
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '<div id="levelSelectorContainer"></div>';
    vi.clearAllMocks();
  });

  it('renders radio buttons for each analyzed level', () => {
    const levels: AnalyzedLevel[] = [
      { depth: 1, exampleKeys: ['colors', 'spacing'], keyCount: 2 },
      { depth: 2, exampleKeys: ['light', 'dark'], keyCount: 2 },
    ];

    renderLevelSelector(levels);

    const container = document.getElementById('levelSelectorContainer');
    expect(container).toBeTruthy();

    // Check that both levels are rendered
    const levelOptions = container!.querySelectorAll('.level-option');
    expect(levelOptions.length).toBe(2);

    // Check radio buttons exist for Level 1
    const level1Radios = container!.querySelectorAll('input[name="level-1"]');
    expect(level1Radios.length).toBe(3); // Collection, Mode, Token Path

    // Check radio buttons exist for Level 2
    const level2Radios = container!.querySelectorAll('input[name="level-2"]');
    expect(level2Radios.length).toBe(3);
  });

  it('shows validation error when no collection is selected', () => {
    const levels: AnalyzedLevel[] = [
      { depth: 1, exampleKeys: ['colors'], keyCount: 1 },
    ];

    renderLevelSelector(levels);

    // Initially all levels are 'token-path', so no collection exists
    // Validation should show error
    const container = document.getElementById('levelSelectorContainer');
    const errorEl = container!.querySelector('.validation-error');

    expect(errorEl).toBeTruthy();
    expect(errorEl!.textContent).toContain('At least one level must be mapped as Collection');
  });

  it('shows warning when no mode is selected', () => {
    const levels: AnalyzedLevel[] = [
      { depth: 1, exampleKeys: ['colors'], keyCount: 1 },
      { depth: 2, exampleKeys: ['primary', 'secondary'], keyCount: 2 },
    ];

    renderLevelSelector(levels);

    const container = document.getElementById('levelSelectorContainer');

    // Change Level 1 to Collection by clicking and dispatching change event
    const collectionRadio = container!.querySelector('input[name="level-1"][value="collection"]') as HTMLInputElement;
    collectionRadio.checked = true;
    collectionRadio.dispatchEvent(new Event('change', { bubbles: true }));

    // Should show warning about no mode
    const warningEl = container!.querySelector('.validation-warning');
    expect(warningEl).toBeTruthy();
    expect(warningEl!.textContent).toContain('default mode will be created');
  });

  it('updates state when user changes radio selection', () => {
    const levels: AnalyzedLevel[] = [
      { depth: 1, exampleKeys: ['colors'], keyCount: 1 },
    ];

    renderLevelSelector(levels);

    const container = document.getElementById('levelSelectorContainer');
    const collectionRadio = container!.querySelector('input[name="level-1"][value="collection"]') as HTMLInputElement;

    // Set checked and dispatch change event
    collectionRadio.checked = true;
    collectionRadio.dispatchEvent(new Event('change', { bubbles: true }));

    // Verify state was updated
    expect(state.updateLevelConfiguration).toHaveBeenCalled();
    const calls = (state.updateLevelConfiguration as any).mock.calls;
    const lastCall = calls[calls.length - 1];
    const config: LevelConfiguration[] = lastCall[0];

    expect(config[0].role).toBe('collection');
  });

  it('emits custom event when configuration changes', () => {
    const levels: AnalyzedLevel[] = [
      { depth: 1, exampleKeys: ['colors'], keyCount: 1 },
    ];

    renderLevelSelector(levels);

    // Listen for event
    let eventDetail: any = null;
    const handler = (event: Event) => {
      eventDetail = (event as CustomEvent).detail;
    };
    document.addEventListener('level-configuration-changed', handler);

    const container = document.getElementById('levelSelectorContainer');
    const modeRadio = container!.querySelector('input[name="level-1"][value="mode"]') as HTMLInputElement;

    // Set checked and dispatch change event
    modeRadio.checked = true;
    modeRadio.dispatchEvent(new Event('change', { bubbles: true }));

    // Verify event was fired with correct data
    expect(eventDetail).toBeTruthy();
    expect(eventDetail.configuration).toBeTruthy();
    expect(eventDetail.validation).toBeTruthy();

    // Clean up
    document.removeEventListener('level-configuration-changed', handler);
  });

  it('disables collection and mode options for last level', () => {
    const levels: AnalyzedLevel[] = [
      { depth: 1, exampleKeys: ['colors'], keyCount: 1 },
      { depth: 2, exampleKeys: ['primary', 'secondary'], keyCount: 2 },
    ];

    renderLevelSelector(levels);

    const container = document.getElementById('levelSelectorContainer');

    // Level 2 (last level) should have Collection and Mode disabled
    const level2Collection = container!.querySelector('input[name="level-2"][value="collection"]') as HTMLInputElement;
    const level2Mode = container!.querySelector('input[name="level-2"][value="mode"]') as HTMLInputElement;
    const level2TokenPath = container!.querySelector('input[name="level-2"][value="token-path"]') as HTMLInputElement;

    expect(level2Collection.disabled).toBe(true);
    expect(level2Mode.disabled).toBe(true);
    expect(level2TokenPath.disabled).toBe(false);
  });

  it('displays example keys for each level', () => {
    const levels: AnalyzedLevel[] = [
      { depth: 1, exampleKeys: ['semantic', 'primitives', 'responsive'], keyCount: 3 },
    ];

    renderLevelSelector(levels);

    const container = document.getElementById('levelSelectorContainer');
    const keysDisplay = container!.querySelector('.level-option-keys');

    expect(keysDisplay).toBeTruthy();
    expect(keysDisplay!.textContent).toContain('semantic');
    expect(keysDisplay!.textContent).toContain('primitives');
    expect(keysDisplay!.textContent).toContain('responsive');
  });

  it('retrieves current configuration correctly', () => {
    const levels: AnalyzedLevel[] = [
      { depth: 1, exampleKeys: ['colors'], keyCount: 1 },
      { depth: 2, exampleKeys: ['light', 'dark'], keyCount: 2 },
    ];

    renderLevelSelector(levels);

    const container = document.getElementById('levelSelectorContainer')!;

    // Change selections by setting checked and dispatching events
    const collectionRadio = container.querySelector('input[name="level-1"][value="collection"]') as HTMLInputElement;
    const modeRadio = container.querySelector('input[name="level-2"][value="mode"]') as HTMLInputElement;

    collectionRadio.checked = true;
    collectionRadio.dispatchEvent(new Event('change', { bubbles: true }));

    modeRadio.checked = true;
    modeRadio.dispatchEvent(new Event('change', { bubbles: true }));

    // Get current configuration
    const config = getCurrentConfiguration(container);

    expect(config).toBeTruthy();
    expect(config![0].role).toBe('collection');
    expect(config![1].role).toBe('mode');
  });
});
