# Synkio v2 Roadmap

## Future Features

### High Priority
These are standard CLI features users will expect:

- [x] **`--version` flag** - Display CLI version (`synkio --version`)
- [x] **Command-specific help** - `synkio help <command>` for detailed options (e.g., `synkio help sync`)
- [ ] **Rollback preview** - `synkio rollback --preview` to see what would be restored before doing it
- [ ] **Watch mode** - `synkio sync --watch` to auto-sync when Figma changes (polling interval configurable)

### Medium Priority
Power user features for advanced workflows:

- [ ] **Output format options** - CSS variables, SCSS variables, TypeScript constants (not just JSON)
- [ ] **Selective sync** - `synkio sync --collection=theme` to sync only specific collections
- [ ] **Verbose/quiet modes** - `--verbose` for debugging, `--quiet` for CI pipelines
- [ ] **Config validation** - Validate generated config schema during init

### Nice to Have
Quality of life improvements:

- [ ] **`synkio status`** - Quick check showing sync state ("You're 3 syncs behind" or "Local matches Figma")
- [ ] **Git integration** - Auto-commit after sync with configurable message template
- [ ] **Webhook support** - Real-time sync via Figma webhooks (alternative to polling)
- [ ] **Token aliasing** - Support for referencing other tokens (`{colors.primary}`)

---

## Completed Features

- [x] `synkio init` - Interactive project setup
- [x] `synkio sync` - Fetch and save tokens from Figma
- [x] `synkio sync --preview` - Preview changes without applying
- [x] `synkio sync --force` - Bypass breaking change protection
- [x] `synkio sync --report` / `--no-report` - Control report generation
- [x] `synkio rollback` - Revert to previous token state
- [x] `synkio validate` - Check config and Figma connection
- [x] `synkio tokens` - Debug utility to view baseline
- [x] Breaking change detection and protection
- [x] Collection mode splitting config (`splitModes`)
- [x] Report generation with history option (`sync.report`, `sync.reportHistory`)
