# CLI Refactor Requirements

## Overview

Refactor the CLI commands to separate concerns between fetching data from Figma and building token files. This improves DX by following the **fetch → build** pattern common in modern tooling.

## Command Changes

### `synkio sync` → `synkio pull`

**Purpose:** Fetch from Figma → update `baseline.json` → show changes

The command should:
1. Only receive the baseline file from Figma
2. Never build (no token splitting, no file writing, no CSS generation)
3. Detect and display all changes (added, modified, deleted, breaking)
4. Update `baseline.json` with new data
5. Handle first-sync collection discovery
6. Exit with code 1 if breaking changes detected (for CI awareness)
7. Guide user to run `synkio build` next

**Flags:**

| Flag | Description |
|------|-------------|
| `--preview` | Show changes without updating baseline |
| `--collection=<names>` | Pull only specific collections (comma-separated) |
| `--timeout=<seconds>` | Figma API timeout (default: 120) |
| `--watch` | Poll Figma for changes |
| `--interval=<seconds>` | Watch interval (default: 30) |
| `--config=<file>` | Config file path |

**Removed flags (moved to `build`):**
- `--force`
- `--regenerate`
- `--backup`
- `--build` / `--no-build`
- `--report` / `--no-report`
- `--open`

---

### `synkio build`

**Purpose:** Generate token files from `baseline.json`

The command should:
1. Read from `baseline.json`
2. Compare baseline with current token files
3. Prompt user (Y/N) if breaking changes detected
4. Split tokens according to config strategy
5. Write token files
6. Merge styles if configured
7. Generate docs if enabled
8. Run CSS/build scripts
9. Generate report

**Flags:**

| Flag | Description |
|------|-------------|
| `--force` | Bypass breaking change confirmation prompt |
| `--rebuild` | Regenerate all files from baseline (skip comparison) |
| `--backup` | Backup existing files before overwriting |
| `--report` | Generate markdown diff report |
| `--no-report` | Skip report generation |
| `--open` | Open docs folder after build |
| `--check` | Dry-run: compare baseline vs current files |
| `--config=<file>` | Config file path |

**Notes:**
- `--rebuild` replaces current `sync --regenerate` behavior
- `--force` is only available here, not in `pull`
- Useful after config changes (e.g., changing `splitBy` strategy)

---

## Breaking Change Handling

| Stage | Detection | Action |
|-------|-----------|--------|
| `pull` | Compare Figma → baseline | Report + exit code 1 |
| `build` | Compare baseline → files | Prompt Y/N (or `--force`) |

**Rationale:**
- `pull` is about *receiving* changes—user may want to pull breaking changes to review them
- `build` is about *applying* changes—this is where user confirms the impact on consumers

---

## Workflow Examples

### Normal workflow
```bash
synkio pull           # Fetch from Figma, update baseline
synkio build          # Generate token files, prompted if breaking
```

### CI/CD (Figma plugin creates PR)
```bash
synkio build --force  # Build from PR's baseline, no prompts
```

### After config change
```bash
# Changed splitBy: "none" → splitBy: "mode" in config
synkio build --rebuild
```

### Preview before pull
```bash
synkio pull --preview  # See what Figma changes would come in
```

### Watch mode
```bash
synkio pull --watch --interval=60  # Poll every 60 seconds
```

---

## Console Output

### `synkio pull` output
```
Synkio Pull

Fetching from Figma... done
Normalizing tokens... done

Changes detected:
  + 3 variables added
  ~ 2 variables modified
  ! 1 breaking change (path rename)

Baseline updated: synkio/baseline.json

→ Run 'synkio build' to generate token files
```

### `synkio build` output
```
Synkio Build

Reading baseline... done
Comparing with current files...

⚠️  Breaking changes detected:
  • colors.primary → colors.brand.primary (path change)

Proceed? This may break existing code references. (y/N) y

Writing token files...
  ✓ tokens/theme.light.json
  ✓ tokens/theme.dark.json
  ✓ tokens/globals.json

Running build pipeline...
  ✓ CSS generated: dist/tokens.css

Build complete.
```

### `synkio build --rebuild` output
```
Synkio Build (rebuild mode)

Reading baseline... done
Regenerating all files from baseline...

Writing token files...
  ✓ tokens/theme.light.json
  ✓ tokens/theme.dark.json
  ✓ tokens/globals.json

Running build pipeline...
  ✓ CSS generated: dist/tokens.css

Build complete.
```

---

## Backward Compatibility

Deprecate `synkio sync` with helpful message:

```bash
$ synkio sync
⚠️  'synkio sync' is deprecated. Use:
   • synkio pull   - Fetch from Figma
   • synkio build  - Generate token files

Running 'synkio pull && synkio build' for compatibility...
```

Keep functional for 1-2 versions, then remove.

---

## Command Comparison

| Aspect | `pull` | `build` |
|--------|--------|---------|
| Source | Figma API | `baseline.json` |
| Output | `baseline.json` | Token files, CSS, docs |
| Breaking changes | Report only | Prompt (or `--force`) |
| Idempotent | Yes | Yes |
| Offline capable | No | Yes |

---

## Implementation Notes

### Files to modify
- `packages/cli/src/cli/bin.ts` - Command routing, help text
- `packages/cli/src/cli/commands/sync.ts` → rename to `pull.ts`
- `packages/cli/src/cli/commands/build.ts` - Enhance existing
- `packages/cli/src/core/sync/pipeline.ts` - Split into pull/build pipelines
- `packages/cli/USER_GUIDE.md` - Update documentation

### Shared logic
- `regenerateFromBaseline()` in `core/sync/regenerate.ts` should be reused by `build`
- Comparison logic in `core/compare/` used by both commands
- Breaking change detection in `core/sync/breaking-changes.ts`

### Exit codes
- `0` - Success
- `1` - Breaking changes detected (for CI)
- `2` - Error (config, network, etc.)
