/**
 * Export UI Tests - Task Group 4
 * Tests for Export tab UI in the Figma Token Sync Plugin
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Export UI', () => {
  let postMessageMock;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';

    // Mock parent.postMessage for Figma plugin communication BEFORE loading HTML
    postMessageMock = jest.fn();

    // Mock window.parent
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessageMock },
      writable: true,
      configurable: true
    });

    // Mock alert
    window.alert = jest.fn();

    // Mock URL.createObjectURL for blob download
    URL.createObjectURL = jest.fn(() => 'blob:mock-url');

    // Load the ui.html file and set up DOM
    const htmlPath = path.join(__dirname, '../src/ui.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Extract just the body content by parsing the HTML
    const bodyMatch = htmlContent.match(/<body>([\s\S]*)<\/body>/);
    const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;

    document.body.innerHTML = bodyContent;

    // Execute inline scripts to initialize functionality
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script) => {
      if (script.textContent) {
        const fn = new Function(script.textContent);
        fn.call(window);
      }
    });
  });

  test('Collection list renders with correct badges', () => {
    // Sample collection data matching the structure from code.ts
    const collectionsData = [
      {
        id: 'coll-1',
        name: 'brand',
        parsed: { type: 'brand', brand: null },
        modeCount: 3,
        modeNames: 'eboks, nykredit, postnl',
        variableCount: 150
      },
      {
        id: 'coll-2',
        name: 'theme',
        parsed: { type: 'theme', brand: null },
        modeCount: 2,
        modeNames: 'light, dark',
        variableCount: 75
      },
      {
        id: 'coll-3',
        name: 'globals',
        parsed: { type: 'globals', brand: null },
        modeCount: 1,
        modeNames: 'default',
        variableCount: 30
      }
    ];

    // Call renderCollections function (exposed globally in ui.html)
    expect(typeof window.renderCollections).toBe('function');
    window.renderCollections(collectionsData);

    // Check that collections list is populated
    const collectionsList = document.getElementById('export-collections-list');
    expect(collectionsList).not.toBeNull();

    const collectionItems = collectionsList.querySelectorAll('.collection-item');
    expect(collectionItems.length).toBe(3);

    // Check brand collection has correct badge
    const brandItem = collectionItems[0];
    const brandBadge = brandItem.querySelector('.collection-type.brand');
    expect(brandBadge).not.toBeNull();
    expect(brandBadge.textContent).toBe('brand');

    // Check theme collection has correct badge
    const themeItem = collectionItems[1];
    const themeBadge = themeItem.querySelector('.collection-type.theme');
    expect(themeBadge).not.toBeNull();
    expect(themeBadge.textContent).toBe('theme');

    // Check globals collection has correct badge
    const globalsItem = collectionItems[2];
    const globalsBadge = globalsItem.querySelector('.collection-type.globals');
    expect(globalsBadge).not.toBeNull();
    expect(globalsBadge.textContent).toBe('globals');

    // Check variable counts are displayed
    expect(brandItem.textContent).toContain('150 variables');
    expect(themeItem.textContent).toContain('75 variables');
    expect(globalsItem.textContent).toContain('30 variables');

    // Check mode information is displayed for multi-mode collections
    expect(brandItem.textContent).toContain('modes:');
    expect(brandItem.textContent).toContain('eboks, nykredit, postnl');

    // Loading should be hidden, main content visible
    const loadingEl = document.getElementById('export-loading');
    const mainContentEl = document.getElementById('export-main-content');
    expect(loadingEl.style.display).toBe('none');
    expect(mainContentEl.style.display).toBe('block');
  });

  test('Export button triggers export with selected collections', () => {
    // Set up collections
    const collectionsData = [
      {
        id: 'coll-1',
        name: 'brand',
        parsed: { type: 'brand', brand: null },
        modeCount: 3,
        modeNames: 'eboks, nykredit, postnl',
        variableCount: 150
      },
      {
        id: 'coll-2',
        name: 'theme',
        parsed: { type: 'theme', brand: null },
        modeCount: 2,
        modeNames: 'light, dark',
        variableCount: 75
      }
    ];

    window.renderCollections(collectionsData);

    // Get export button
    const exportBtn = document.getElementById('export-btn');
    expect(exportBtn).not.toBeNull();

    // All collections should be selected by default
    const checkboxes = document.querySelectorAll('.collection-checkbox');
    expect(checkboxes.length).toBe(2);
    checkboxes.forEach(cb => expect(cb.checked).toBe(true));

    // Reset mock to check for export call (clear any previous calls from tab switching)
    postMessageMock.mockClear();

    // Click export button
    exportBtn.click();

    // Verify postMessage was called with export-tokens type
    expect(postMessageMock).toHaveBeenCalled();

    // Find the export-tokens call
    const exportCall = postMessageMock.mock.calls.find(
      call => call[0]?.pluginMessage?.type === 'export-tokens'
    );
    expect(exportCall).toBeDefined();

    const message = exportCall[0].pluginMessage;
    expect(message.type).toBe('export-tokens');
    expect(message.selectedCollectionIds).toContain('coll-1');
    expect(message.selectedCollectionIds).toContain('coll-2');
    expect(message.selectedCollectionIds.length).toBe(2);

    // Export button should be disabled during export
    expect(exportBtn.disabled).toBe(true);

    // Test with one collection deselected
    // First re-enable button and clear mock
    exportBtn.disabled = false;
    checkboxes[1].checked = false;
    postMessageMock.mockClear();

    exportBtn.click();

    // Should only contain the still-selected collection
    const exportCall2 = postMessageMock.mock.calls.find(
      call => call[0]?.pluginMessage?.type === 'export-tokens'
    );
    expect(exportCall2).toBeDefined();

    const message2 = exportCall2[0].pluginMessage;
    expect(message2.selectedCollectionIds).toContain('coll-1');
    expect(message2.selectedCollectionIds).not.toContain('coll-2');
    expect(message2.selectedCollectionIds.length).toBe(1);
  });
});
