/**
 * Tab Navigation Tests - Task Group 3
 * Tests for UI tab navigation in the Figma Token Sync Plugin
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Tab Navigation', () => {
  beforeEach(() => {
    // Load the ui.html file and set up DOM
    const htmlPath = path.join(__dirname, '../src/ui.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Extract just the body content by parsing the HTML
    const bodyMatch = htmlContent.match(/<body>([\s\S]*)<\/body>/);
    const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;

    document.body.innerHTML = bodyContent;

    // Execute inline scripts to initialize tab functionality
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script) => {
      if (script.textContent) {
        // Execute the script in window context
        const fn = new Function(script.textContent);
        fn.call(window);
      }
    });
  });

  test('Tab click switches active tab state', () => {
    // Get tab elements
    const importTab = document.querySelector('[data-tab="import"]');
    const exportTab = document.querySelector('[data-tab="export"]');

    // Verify initial state - Import tab should be active by default
    expect(importTab.classList.contains('active')).toBe(true);
    expect(exportTab.classList.contains('active')).toBe(false);

    // Click Export tab
    exportTab.click();

    // Verify Export tab is now active
    expect(exportTab.classList.contains('active')).toBe(true);
    expect(importTab.classList.contains('active')).toBe(false);

    // Click Import tab
    importTab.click();

    // Verify Import tab is now active again
    expect(importTab.classList.contains('active')).toBe(true);
    expect(exportTab.classList.contains('active')).toBe(false);
  });

  test('Tab content panel visibility toggles correctly', () => {
    // Get panel elements
    const importPanel = document.getElementById('import-panel');
    const exportPanel = document.getElementById('export-panel');
    const importTab = document.querySelector('[data-tab="import"]');
    const exportTab = document.querySelector('[data-tab="export"]');

    // Verify initial state - Import panel visible, Export panel hidden
    expect(importPanel.classList.contains('active')).toBe(true);
    expect(exportPanel.classList.contains('active')).toBe(false);

    // Click Export tab
    exportTab.click();

    // Verify Export panel is now visible, Import panel hidden
    expect(exportPanel.classList.contains('active')).toBe(true);
    expect(importPanel.classList.contains('active')).toBe(false);

    // Click Import tab
    importTab.click();

    // Verify Import panel is visible again, Export panel hidden
    expect(importPanel.classList.contains('active')).toBe(true);
    expect(exportPanel.classList.contains('active')).toBe(false);

    // Test programmatic tab switching via switchToTab function
    if (typeof window.switchToTab === 'function') {
      window.switchToTab('export');
      expect(exportPanel.classList.contains('active')).toBe(true);
      expect(importPanel.classList.contains('active')).toBe(false);

      window.switchToTab('import');
      expect(importPanel.classList.contains('active')).toBe(true);
      expect(exportPanel.classList.contains('active')).toBe(false);
    }
  });
});
