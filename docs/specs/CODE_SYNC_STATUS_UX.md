# Code Sync Status - UX Specification

## Design Principles

1. **Glanceable**: Status should be immediately clear at a glance
2. **Non-Blocking**: Never prevent the designer from working
3. **Helpful**: Provide actionable guidance when sync is pending
4. **Trustworthy**: Accurate status, no false positives/negatives

## Status States

### Visual Language

| State | Indicator | Color | Icon |
|-------|-----------|-------|------|
| Not Configured | ○ (empty circle) | Gray | settings |
| Pending Code Sync | ◐ (half circle) | Orange/Amber | clock |
| Code In Sync | ● (filled circle) | Green | check |
| Checking | ◌ (dotted circle) | Gray | spinner |
| Error/Warning | ⚠ (triangle) | Yellow | alert |

### Color Tokens (using existing design system)

```css
--color-status-pending: var(--color-warning);     /* Orange/Amber */
--color-status-synced: var(--color-success);      /* Green */
--color-status-error: var(--color-error);         /* Red */
--color-status-neutral: var(--color-text-tertiary); /* Gray */
```

## Home Screen Integration

### Card Placement

The Code Sync Status card appears **between** the main status card and the workflow cards:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                SYNC STATUS                    │  │
│  │           [Figma] ←→ [Code]                   │  │
│  │             ● In Sync                         │  │
│  │       Last synced 2h ago by @designer         │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ CODE SYNC STATUS                              │  │  ← NEW
│  │                                               │  │
│  │ ◐ Pending Code Sync                           │  │
│  │ Exported 10 minutes ago                       │  │
│  │ Waiting for: synkio sync                      │  │
│  │                                               │  │
│  │              [↻ Check Status]                 │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌────────────────────┐  ┌────────────────────┐    │
│  │   FIGMA → CODE     │  │   CODE → FIGMA     │    │
│  │   3 changes        │  │   No updates       │    │
│  │   [Review & Sync]  │  │   [Check]          │    │
│  └────────────────────┘  └────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Card Variants

#### Variant A: Pending Code Sync (Primary State)

```
┌─────────────────────────────────────────────────────┐
│ CODE SYNC STATUS                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ ◐  Pending Code Sync                         │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Exported 10 minutes ago                            │
│  Waiting for: synkio sync                           │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  💡 Run in your terminal:                    │  │
│  │                                              │  │
│  │  $ synkio sync                               │  │  ← Copyable
│  └──────────────────────────────────────────────┘  │
│                                                     │
│               [↻ Check Status]                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Orange status badge
- Shows time since export
- Helpful hint with copyable command
- Manual "Check Status" button

#### Variant B: Code In Sync

```
┌─────────────────────────────────────────────────────┐
│ CODE SYNC STATUS                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ ●  Code In Sync                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Synced 2 hours ago via CLI v1.2.0                  │
│  150 tokens · 25 styles synced                      │
│                                                     │
│               [↻ Check Status]                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Green status badge
- Shows when CLI last synced
- Shows summary of synced content
- Collapsed by default (expandable for details)

#### Variant C: Not Configured

```
┌─────────────────────────────────────────────────────┐
│ CODE SYNC STATUS                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ ○  Not Configured                            │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Connect to GitHub to track when your exported      │
│  tokens are synced to code.                         │
│                                                     │
│            [Configure in Settings]                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Gray status badge
- Brief explanation
- CTA to configure GitHub

#### Variant D: Checking

```
┌─────────────────────────────────────────────────────┐
│ CODE SYNC STATUS                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ◌ Checking status...                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Animated spinner
- Compact display
- Non-blocking (user can navigate away)

#### Variant E: Error State

```
┌─────────────────────────────────────────────────────┐
│ CODE SYNC STATUS                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ ⚠  Could not check status                    │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  sync-status.json not found                         │
│  Run `synkio sync` to create it.                    │
│                                                     │
│                  [↻ Retry]                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Yellow warning badge
- Human-readable error
- Actionable guidance
- Retry button

## Settings Screen Integration

### New Section: Code Sync Status

Position: After "GitHub Connection", before "Advanced"

```
┌─────────────────────────────────────────────────────┐
│ ▼ CODE SYNC STATUS                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Status file path                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │ synkio/sync-status.json                     │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ℹ️ This file is written by the CLI after each     │
│  sync. The plugin reads it to show whether your    │
│  exported tokens have been synced to code.         │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Current Status:                              │  │
│  │ ◐ Pending Code Sync                          │  │
│  │ Last checked: 5 min ago                      │  │
│  │                                              │  │
│  │ [↻ Check Now]                                │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Field: Status File Path

```
┌──────────────────────────────────────────────────────┐
│ Status file path                                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ synkio/sync-status.json                       │  │ ← Input field
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Path relative to repository root                    │ ← Helper text
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Default value:** `synkio/sync-status.json`

**Validation:**
- Must end with `.json`
- No leading slash
- Relative path only

## Interaction Flows

### Flow 1: First Time Setup

```
User opens plugin (GitHub not configured)
    │
    ▼
┌─────────────────────────────────┐
│ Code Sync Status Card shows:    │
│ "Not Configured"                │
│ [Configure in Settings]         │
└─────────────────────────────────┘
    │
    │ User clicks "Configure"
    ▼
┌─────────────────────────────────┐
│ Settings screen                 │
│ - Configure GitHub              │
│ - Status path auto-set          │
└─────────────────────────────────┘
    │
    │ User saves settings
    ▼
┌─────────────────────────────────┐
│ Auto-check runs                 │
│ Shows "Checking..."             │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ Status shown:                   │
│ - "Pending" if no status file   │
│ - "In Sync" if hash matches     │
│ - "Error" if fetch fails        │
└─────────────────────────────────┘
```

### Flow 2: After Sync

```
User clicks "Sync" in Figma → Code card
    │
    ▼
┌─────────────────────────────────┐
│ Plugin exports tokens           │
│ Computes hash                   │
│ Stores in sharedPluginData      │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ Returns to Home screen          │
│ Status shows: "Pending Code     │
│ Sync - Exported just now"       │
└─────────────────────────────────┘
    │
    │ (Later) User clicks "Check Status"
    │ OR plugin auto-checks
    ▼
┌─────────────────────────────────┐
│ Fetches sync-status.json        │
│ Compares hashes                 │
└─────────────────────────────────┘
    │
    ├── Hashes match → "Code In Sync"
    │
    └── Hashes differ → "Pending Code Sync"
```

### Flow 3: Manual Status Check

```
User clicks "Check Status" button
    │
    ▼
┌─────────────────────────────────┐
│ Button shows spinner            │
│ Card shows "Checking..."        │
└─────────────────────────────────┘
    │
    │ (1-3 seconds)
    ▼
┌─────────────────────────────────┐
│ Result displayed                │
│ "Last checked: just now"        │
└─────────────────────────────────┘
```

## Auto-Check Behavior

The plugin automatically checks code sync status:

1. **On plugin open** - Always (if GitHub configured)
2. **After sync** - Immediately after export completes
3. **Periodically** - Not implemented (would require background polling)

### Why Not Disable Auto-Check?

The original spec had a toggle to disable auto-check. However:

1. The check is lightweight (single small JSON file)
2. Status is always useful information
3. One less setting to manage
4. No downside to checking

**Decision:** Auto-check is always enabled when GitHub is configured. No toggle needed.

## Copy-to-Clipboard Interaction

The terminal command in "Pending Code Sync" state is copyable:

```
┌────────────────────────────────────────┐
│ 💡 Run in your terminal:               │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ $ synkio sync          [📋 Copy]  │ │  ← Click to copy
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

**Behavior:**
1. Hover shows "Click to copy"
2. Click copies `synkio sync` to clipboard
3. Button changes to "Copied!" for 2 seconds
4. Toast notification: "Command copied to clipboard"

## Responsive Considerations

### Compact Mode (narrow plugin width)

When plugin width is constrained:

```
┌───────────────────────────────┐
│ CODE SYNC STATUS              │
├───────────────────────────────┤
│ ◐ Pending Code Sync           │
│ Exported 10m ago              │
│                               │
│ $ synkio sync    [Copy]       │
│                               │
│      [↻ Check]                │
└───────────────────────────────┘
```

- Remove emoji icons
- Shorter labels
- Single-line command display

## Accessibility

### Screen Reader Support

```html
<div role="status" aria-live="polite" aria-label="Code sync status: Pending code sync">
  <span class="status-indicator" aria-hidden="true">◐</span>
  <span>Pending Code Sync</span>
</div>
```

### Keyboard Navigation

- Tab to "Check Status" button
- Enter to activate
- Focus ring visible on all interactive elements

### Color Contrast

All status colors meet WCAG AA contrast requirements:
- Green on background: 4.5:1 minimum
- Orange on background: 4.5:1 minimum
- Gray on background: 4.5:1 minimum

## Animation

### Status Change Animation

When status changes (e.g., Pending → In Sync):

1. Old status fades out (150ms)
2. New status fades in (150ms)
3. Optional: gentle pulse on new status badge

### Checking Spinner

- Rotation: 360° every 1 second
- Easing: linear (constant speed)
- Color: `var(--color-text-tertiary)`

## Error Messages

| Error | User-Friendly Message | Guidance |
|-------|----------------------|----------|
| 404 Not Found | "sync-status.json not found" | "Run `synkio sync` to create it" |
| Network Error | "Could not reach GitHub" | "Check your connection and try again" |
| Invalid JSON | "Status file is corrupted" | "Run `synkio sync` to regenerate it" |
| Auth Failed | "Access denied" | "Check your GitHub token in Settings" |
| File Key Mismatch | "Status is for a different file" | "Ensure CLI is syncing this Figma file" |

## Component Hierarchy

```
CodeSyncCard
├── CardHeader
│   └── Title: "CODE SYNC STATUS"
├── StatusBadge
│   ├── Indicator (●/◐/○/⚠)
│   └── Label (e.g., "Pending Code Sync")
├── StatusDetails
│   ├── TimeSince (e.g., "Exported 10m ago")
│   └── WaitingFor (e.g., "Waiting for: synkio sync")
├── HelpBox (conditional)
│   ├── HelpIcon
│   ├── HelpText
│   └── CopyableCommand
└── ActionButton
    └── "Check Status" / "Retry" / "Configure"
```

## Implementation Notes

### CSS Classes

```css
.code-sync-card { }
.code-sync-status { }
.code-sync-status--pending { }
.code-sync-status--synced { }
.code-sync-status--error { }
.code-sync-status--checking { }
.code-sync-help-box { }
.code-sync-command { }
.code-sync-command:hover { }
.code-sync-action-btn { }
```

### Test Scenarios

1. GitHub not configured → shows "Not Configured"
2. GitHub configured, no status file → shows "Pending" with 404 hint
3. GitHub configured, status file exists, hashes match → shows "In Sync"
4. GitHub configured, status file exists, hashes differ → shows "Pending"
5. Network error → shows error with retry
6. Status file for different Figma file → shows warning
