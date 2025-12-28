# Synkio Feature Specifications

This directory contains detailed specifications for new features.

## Code Sync Status Feature

**Status:** Spec Complete | Ready for Implementation

The Code Sync Status feature enables the Figma plugin to show whether the CLI has synced the latest exported tokens, creating a complete feedback loop for designers.

### Spec Documents

| Document | Description |
|----------|-------------|
| [CODE_SYNC_STATUS.md](./CODE_SYNC_STATUS.md) | Main specification - architecture, data flow, and overview |
| [CODE_SYNC_STATUS_UX.md](./CODE_SYNC_STATUS_UX.md) | UX specification - UI states, interactions, visual design |
| [CODE_SYNC_STATUS_CLI.md](./CODE_SYNC_STATUS_CLI.md) | CLI implementation - status file format, hash algorithm |
| [CODE_SYNC_STATUS_PLUGIN.md](./CODE_SYNC_STATUS_PLUGIN.md) | Plugin implementation - code handlers, UI components |

### Quick Summary

**Problem:** Designers export tokens but don't know if the CLI has synced them.

**Solution:**
1. Plugin stores a hash of exported data
2. CLI writes `sync-status.json` with matching hash after sync
3. Plugin fetches status file and compares hashes
4. UI shows "Pending Code Sync" or "Code In Sync"

### Key Files to Modify

**Plugin (synkio-v2):**
- `src/lib/types.ts` - Add `CodeSyncStatus` interface
- `src/lib/storage.ts` - Add hash computation
- `src/code.ts` - Add status check handler
- `src/screens/home.ts` - Add status card
- `src/screens/settings.ts` - Add path config

**CLI:**
- `src/core/sync/status-writer.ts` - New file
- `src/core/sync/pipeline.ts` - Call status writer
- `src/types/schemas.ts` - Add schema

### Implementation Priority

1. **Phase 1: CLI** (enables testing)
   - Write `sync-status.json` after sync
   - Include hash computation

2. **Phase 2: Plugin Storage**
   - Add hash computation to `saveForCLI()`
   - Store hash in `sharedPluginData`

3. **Phase 3: Plugin UI**
   - Add status check handler
   - Add status card to home screen
   - Add settings configuration

### Open Questions

None - spec is complete and ready for implementation.
