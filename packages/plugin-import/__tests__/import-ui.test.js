/**
 * Import UI Tests - Task Group 6
 * Tests for Import tab UI in the Figma Token Sync Plugin
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Import UI', () => {
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

  test('File upload displays metadata after valid file selection', () => {
    // Verify the file input exists and accepts JSON
    const fileInput = document.getElementById('import-file-input');
    expect(fileInput).not.toBeNull();
    expect(fileInput.getAttribute('accept')).toBe('.json');

    // Verify metadata display element exists but is hidden initially
    const metadataDisplay = document.getElementById('import-metadata');
    expect(metadataDisplay).not.toBeNull();

    // Simulate receiving a file-validated message from the plugin
    const mockMetadata = {
      version: '2.0.0',
      exportedAt: '2025-11-29T10:00:00.000Z',
      pluginVersion: '1.0.0',
      fileKey: 'test-file-key',
      fileName: 'Design Tokens Library'
    };

    // Trigger the message handler
    const event = new MessageEvent('message', {
      data: {
        pluginMessage: {
          type: 'file-validated',
          metadata: mockMetadata
        }
      }
    });
    window.dispatchEvent(event);

    // Check that metadata is now displayed
    expect(metadataDisplay.classList.contains('visible')).toBe(true);
    expect(metadataDisplay.textContent).toContain('Design Tokens Library');
    expect(metadataDisplay.textContent).toContain('2.0.0');

    // Check that error is not visible
    const errorDisplay = document.getElementById('import-file-error');
    expect(errorDisplay.classList.contains('visible')).toBe(false);
  });

  test('Analysis summary shows correct counts', () => {
    // Get the analysis summary element
    const analysisSummary = document.getElementById('import-analysis-summary');
    expect(analysisSummary).not.toBeNull();

    // Simulate receiving analysis-complete message
    const mockAnalysis = {
      toUpdate: new Array(25).fill({ path: 'test.path', value: '#000' }),
      toCreate: new Array(10).fill({ path: 'new.path', value: '#fff' }),
      unmatched: new Array(5).fill('VariableID:xxx'),
      missingCollections: ['newbrand'],
      missingModes: [{ collection: 'brand', mode: 'newmode' }]
    };

    const event = new MessageEvent('message', {
      data: {
        pluginMessage: {
          type: 'analysis-complete',
          analysis: mockAnalysis
        }
      }
    });
    window.dispatchEvent(event);

    // Check that analysis summary is visible and shows correct counts
    expect(analysisSummary.classList.contains('visible')).toBe(true);

    // Verify counts are displayed
    const summaryText = analysisSummary.textContent;
    expect(summaryText).toContain('25');  // to update
    expect(summaryText).toContain('10');  // to create
    expect(summaryText).toContain('5');   // unmatched
  });

  test('Apply Import button enables only after analysis complete', () => {
    // Get the Apply Import button
    const applyBtn = document.getElementById('import-apply-btn');
    expect(applyBtn).not.toBeNull();

    // Button should be disabled initially
    expect(applyBtn.disabled).toBe(true);

    // Simulate file upload but no analysis yet
    const fileValidatedEvent = new MessageEvent('message', {
      data: {
        pluginMessage: {
          type: 'file-validated',
          metadata: {
            version: '2.0.0',
            exportedAt: '2025-11-29T10:00:00.000Z',
            fileName: 'Test File'
          }
        }
      }
    });
    window.dispatchEvent(fileValidatedEvent);

    // Button should still be disabled (analysis not complete)
    expect(applyBtn.disabled).toBe(true);

    // Now simulate analysis complete
    const analysisEvent = new MessageEvent('message', {
      data: {
        pluginMessage: {
          type: 'analysis-complete',
          analysis: {
            toUpdate: [{ path: 'test', value: '#000' }],
            toCreate: [],
            unmatched: [],
            missingCollections: [],
            missingModes: []
          }
        }
      }
    });
    window.dispatchEvent(analysisEvent);

    // Button should now be enabled
    expect(applyBtn.disabled).toBe(false);

    // Click the button should trigger apply-import message
    postMessageMock.mockClear();
    applyBtn.click();

    // Find the apply-import call
    const applyCall = postMessageMock.mock.calls.find(
      call => call[0]?.pluginMessage?.type === 'apply-import'
    );
    expect(applyCall).toBeDefined();
  });
});
