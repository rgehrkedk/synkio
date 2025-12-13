# Manual Testing Checklist

This checklist covers manual testing procedures for the Token Vault Figma plugin. Use this to verify functionality before release.

## Prerequisites
- Figma desktop app or browser with plugin development mode enabled
- Sample JSON token files for testing
- Test Figma file with at least one page

## Import Functionality

### Single-Mode Collection
- [ ] Open plugin in Figma
- [ ] Navigate to Import tab
- [ ] Upload single JSON file with tokens (e.g., colors, spacing)
- [ ] Create new collection (uncheck "Mode Collection" option)
- [ ] Assign uploaded file to collection
- [ ] Click "Import Tokens"
- [ ] Verify success notification appears
- [ ] Verify collection created in Figma with correct name
- [ ] Verify all variables exist with correct names
- [ ] Verify variable values match JSON file
- [ ] Verify variable types are correctly inferred (COLOR, FLOAT, STRING)

### Multi-Mode Collection
- [ ] Upload multiple JSON files (e.g., `light.json`, `dark.json`)
- [ ] Create new collection with "Mode Collection" enabled
- [ ] Assign both files to collection
- [ ] Click "Import Tokens"
- [ ] Verify collection created with multiple modes
- [ ] Verify mode names match file names
- [ ] Verify each mode has correct variable values
- [ ] Switch between modes in Figma and verify values change

### Alias Resolution
- [ ] Upload JSON with alias references (e.g., `{colors.primary}`)
- [ ] Import tokens
- [ ] Verify aliased variables created
- [ ] Verify aliases resolved to correct variable references
- [ ] Check variable details show VARIABLE_ALIAS type
- [ ] Verify circular aliases are handled gracefully

### Type Inference
- [ ] Upload JSON with tokens missing `type` or `$type` field
- [ ] Import tokens
- [ ] Verify types inferred from path (colors -> COLOR, spacing -> FLOAT, etc.)
- [ ] Verify font weights inferred correctly (e.g., "bold" -> 700)
- [ ] Verify dimension values parsed (e.g., "16px" -> 16)

### Error Handling
- [ ] Upload invalid JSON file
- [ ] Verify error message displays
- [ ] Upload file with missing required fields
- [ ] Verify graceful error handling
- [ ] Try to import without selecting files
- [ ] Verify validation message

---

## Export Functionality

### Export All Collections
- [ ] Navigate to Export tab
- [ ] Click "Select All" collections
- [ ] Click "Export Baseline"
- [ ] Verify export modal appears
- [ ] Verify JSON structure contains `$metadata` and `baseline`
- [ ] Verify all collections included
- [ ] Verify collection → mode → token structure correct
- [ ] Verify flat baseline lookup exists

### Export Filtered Collections
- [ ] Select specific collections only
- [ ] Click "Export Baseline"
- [ ] Verify only selected collections in JSON
- [ ] Verify unselected collections not included

### Export with Aliases
- [ ] Create variables with aliases
- [ ] Export baseline
- [ ] Verify aliases formatted as `{path.to.token}`
- [ ] Verify non-aliased values are actual values (colors as hex, numbers as numbers)

### Copy to Clipboard
- [ ] Export baseline
- [ ] Click "Copy to Clipboard"
- [ ] Paste into text editor
- [ ] Verify JSON is valid and complete

---

## Sync Functionality

### Initial Sync to Node
- [ ] Navigate to Sync tab
- [ ] Verify "No sync data found" if first sync
- [ ] Select collections to sync
- [ ] Click "Sync to Node"
- [ ] Verify progress notification appears
- [ ] Verify success screen displays
- [ ] Verify node ID shown
- [ ] Verify variable count matches
- [ ] Verify timestamp is recent
- [ ] Click "Copy Node ID"
- [ ] Paste and verify correct ID copied

### Find Registry Node
- [ ] After sync, search for `_token_registry` node in Figma
- [ ] Verify node exists on current page
- [ ] Verify node is off-canvas (x: -1000, y: -1000)
- [ ] Verify node is locked and hidden
- [ ] Verify node dimensions (100x100)

### Update Existing Sync
- [ ] Modify a variable in Figma
- [ ] Sync again
- [ ] Verify "last synced" info displays
- [ ] Verify sync updates existing node (same node ID)
- [ ] Verify new timestamp
- [ ] Verify updated variable count

### Large Dataset
- [ ] Create 100+ variables across multiple collections
- [ ] Sync to node
- [ ] Verify sync completes successfully
- [ ] Verify chunking works (check console for chunk count)
- [ ] Verify all data stored (check node plugin data)

---

## UI Interactions

### Tabs
- [ ] Click each tab (Import, Export, Sync)
- [ ] Verify content switches correctly
- [ ] Verify tab highlighting shows active tab

### File Upload
- [ ] Drag and drop JSON file onto upload area
- [ ] Verify file appears in list
- [ ] Verify file size displays
- [ ] Click "Remove" on file
- [ ] Verify file removed from list

### Collection Configuration
- [ ] Add multiple collections
- [ ] Remove a collection
- [ ] Toggle "Mode Collection" checkbox
- [ ] Verify UI updates correctly

### Collection Selection (Export/Sync)
- [ ] Click individual checkboxes
- [ ] Click "Select All"
- [ ] Click "Select None"
- [ ] Verify selections persist during interactions

---

## Edge Cases & Error Handling

### Empty States
- [ ] Open plugin in fresh Figma file (no collections)
- [ ] Verify Export/Sync show "No collections found"
- [ ] Verify Import tab works normally

### Special Characters
- [ ] Import tokens with special characters in names (spaces, dashes, underscores)
- [ ] Verify variables created with proper sanitization
- [ ] Verify no errors occur

### Large Values
- [ ] Import token with very long string value (>100 characters)
- [ ] Import color with alpha transparency
- [ ] Verify values stored correctly

### Network/Performance
- [ ] Import 500+ tokens
- [ ] Verify plugin remains responsive
- [ ] Verify no timeout errors
- [ ] Sync large dataset (500+ variables)
- [ ] Verify chunking handles size limit

---

## Cross-Browser/Platform Testing

### Figma Desktop
- [ ] Test all functionality on macOS
- [ ] Test all functionality on Windows
- [ ] Verify no platform-specific issues

### Figma Browser
- [ ] Test all functionality on Chrome
- [ ] Test all functionality on Firefox
- [ ] Test all functionality on Safari
- [ ] Verify no browser-specific issues

---

## Cleanup & Cancel

### Cancel Operations
- [ ] Start import process
- [ ] Click "Cancel" before completion
- [ ] Verify plugin closes
- [ ] Verify no partial data created

### Close Plugin
- [ ] Complete an operation
- [ ] Close plugin
- [ ] Reopen plugin
- [ ] Verify state reset correctly

---

## Success Criteria

- [ ] All checklist items pass without errors
- [ ] No console errors during any operation
- [ ] UI is responsive and intuitive
- [ ] All notifications display correctly
- [ ] Data integrity maintained across all operations
- [ ] Performance is acceptable (<2 seconds for most operations)

---

## Notes

Use this section to document any issues found during testing:

- Issue 1: [Description]
- Issue 2: [Description]
- etc.
