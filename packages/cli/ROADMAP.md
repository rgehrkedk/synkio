# Synkio Roadmap

## Future Features

### High Priority
These are standard CLI features users will expect:

- [x] **`--version` flag** - Display CLI version (`synkio --version`)
- [x] **Command-specific help** - `synkio help <command>` for detailed options (e.g., `synkio help sync`)
- [x] **Rollback preview** - `synkio rollback --preview` to see what would be restored before doing it
- [x] **Watch mode** - `synkio sync --watch` to auto-sync when Figma changes (polling interval configurable)

### Medium Priority
Power user features for advanced workflows:

- [x] **Selective sync** - `synkio sync --collection=theme` to sync only specific collections
- [ ] **Output format options** - CSS variables, SCSS variables, TypeScript constants (not just JSON)
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
- [x] `synkio sync --watch` - Watch mode with configurable interval
- [x] `synkio sync --collection=<name>` - Selective sync by collection
- [x] `synkio rollback` - Revert to previous token state
- [x] `synkio rollback --preview` - Preview what would be restored
- [x] `synkio validate` - Check config and Figma connection
- [x] `synkio tokens` - Debug utility to view baseline
- [x] Breaking change detection and protection
- [x] Mode rename detection (shows "base: Mode 1 → value")
- [x] New modes treated as breaking changes
- [x] Collection mode splitting config (`splitModes`, `includeMode`)
- [x] DTCG format output (`$value`, `$type`)
- [x] Optional variable ID inclusion (`includeVariableId`)
- [x] Figma metadata extensions (`description`, `scopes`, `codeSyntax`)
- [x] Report generation with history option (`sync.report`, `sync.reportHistory`)
