# Synkio: Use Cases & User Flows

*Concrete scenarios for the Design Intelligence Layer*

---

## Personas

### 1. Alex — Frontend Developer
- Uses Claude Code or Cursor daily
- Building features in React/Vue/Svelte
- Wants AI to generate code that matches the design system
- Frustrated by manually fixing AI-generated styling

### 2. Sam — Design Engineer
- Owns the design system (both Figma and code)
- Bridges design and engineering teams
- Needs to keep systems in sync
- Wants to catch drift before it becomes a problem

### 3. Jordan — DevOps / Platform Engineer
- Manages CI/CD pipelines
- Responsible for deployment quality gates
- Needs automated checks that don't slow down teams
- Wants clear pass/fail criteria for design compliance

### 4. Morgan — Product Designer
- Works primarily in Figma
- Makes frequent updates to components and tokens
- Wants changes to flow smoothly to production
- Doesn't want to learn CLI tools

---

## Use Case 1: AI-Assisted Component Development

### Scenario
Alex needs to build a new "Pricing Card" component. They want to use Claude Code but ensure the output matches the design system.

### Current Pain (Without Synkio Intelligence)

```
Alex: "Create a pricing card component with a title, price, features list, and CTA button"

Claude Code generates:
┌─────────────────────────────────┐
│  <div className="pricing-card"> │
│    <h2 style={{                 │
│      color: '#1a1a1a',     ❌ Hardcoded, not from design system
│      fontSize: '24px'      ❌ Magic number
│    }}>Pro Plan</h2>             │
│    <Button variant="primary">   │  ⚠️ Guessing at component API
│      Get Started                │
│    </Button>                    │
│  </div>                         │
└─────────────────────────────────┘

Result: Alex spends 30 minutes fixing colors, spacing, and component usage
```

### User Flow with Synkio MCP Server

**Step 1: Setup (one-time)**
```bash
# Install Synkio and sync design system
npm install synkio --save-dev
npx synkio init --figma-url=https://figma.com/design/ABC123/Design-System
npx synkio sync

# Connect Synkio MCP to Claude Code
claude mcp add synkio
```

**Step 2: AI-Assisted Development**
```
Alex: "Create a pricing card component with a title, price, features list,
       and CTA button. Use our design system."

Claude Code (with Synkio MCP context):
┌─────────────────────────────────────────────────────────────────┐
│  // Claude queries Synkio: "What tokens exist for typography?"  │
│  // Claude queries Synkio: "What's the Button component API?"   │
│  // Claude queries Synkio: "What spacing scale is available?"   │
│                                                                 │
│  <div className="pricing-card" style={{                         │
│    padding: 'var(--spacing-lg)',        ✅ Uses token           │
│    borderRadius: 'var(--radius-md)',    ✅ Uses token           │
│    backgroundColor: 'var(--color-surface-primary)'  ✅          │
│  }}>                                                            │
│    <Heading level={2} variant="display-sm">  ✅ Correct component│
│      Pro Plan                                                   │
│    </Heading>                                                   │
│    <Text size="3xl" weight="bold" color="primary">              │
│      $49/mo                                                     │
│    </Text>                                                      │
│    <Button variant="primary" size="lg">  ✅ Matches system      │
│      Get Started                                                │
│    </Button>                                                    │
│  </div>                                                         │
└─────────────────────────────────────────────────────────────────┘

Result: Code is design-system compliant from first generation
```

**Step 3: Validation (automatic)**
```
Claude Code: "I've created the component using your design system tokens.

              Tokens used:
              • --spacing-lg (24px)
              • --radius-md (8px)
              • --color-surface-primary (#ffffff)

              Components used:
              • Heading (from @company/ui)
              • Button (from @company/ui)

              ✅ All values match your current design system baseline."
```

### Technical Implementation

**Synkio MCP Server provides these tools:**

```typescript
// Tool 1: Get available tokens by category
mcp_synkio_get_tokens({ category: "spacing" })
→ Returns: { "sm": "8px", "md": "16px", "lg": "24px", "xl": "32px" }

// Tool 2: Get component information
mcp_synkio_get_component({ name: "Button" })
→ Returns: {
    variants: ["primary", "secondary", "ghost"],
    sizes: ["sm", "md", "lg"],
    props: ["onClick", "disabled", "loading"]
  }

// Tool 3: Validate a code snippet
mcp_synkio_validate_code({ code: "..." })
→ Returns: {
    valid: true,
    tokensUsed: ["--spacing-lg", "--color-primary"],
    warnings: []
  }

// Tool 4: Suggest token for value
mcp_synkio_suggest_token({ type: "color", value: "#0066cc" })
→ Returns: { token: "--color-primary", confidence: 0.95 }
```

---

## Use Case 2: Design Change Impact Analysis

### Scenario
Morgan (designer) wants to update the primary brand color. Sam (design engineer) needs to understand the impact before approving.

### User Flow

**Step 1: Designer makes change in Figma**
```
Morgan updates in Figma:
  colors/brand/primary: #0066CC → #0052A3
```

**Step 2: Preview with impact analysis**
```bash
$ npx synkio sync --preview

Synkio Design Intelligence Report
═══════════════════════════════════════════════════════════════

📊 CHANGE SUMMARY
─────────────────
  Modified:  1 token
  Added:     0 tokens
  Removed:   0 tokens

📝 CHANGES
─────────────────
  colors.brand.primary
    Old: #0066CC
    New: #0052A3

⚡ IMPACT ANALYSIS
─────────────────
  This token is used in:

  Components (12):
    • Button (primary variant)
    • Link
    • Checkbox (checked state)
    • Radio (checked state)
    • Switch (active state)
    • Badge (info variant)
    • Alert (info variant)
    • Tabs (active indicator)
    • Progress (fill)
    • Avatar (fallback background)
    • Card (accent border)
    • Input (focus ring)

  Files (34):
    • src/components/Button/Button.tsx
    • src/components/Link/Link.tsx
    • src/components/Form/Checkbox.tsx
    ... and 31 more

  CSS Custom Properties:
    • --color-primary (tokens.css:42)
    • --btn-primary-bg (tokens.css:156)
    • --link-color (tokens.css:203)

⚠️  ACCESSIBILITY CHECK
─────────────────
  Contrast ratio on white background:
    Old (#0066CC): 4.5:1 ✅ AA pass
    New (#0052A3): 5.2:1 ✅ AA pass (improved)

  Contrast ratio on dark background (#1a1a1a):
    Old (#0066CC): 3.8:1 ⚠️  AA-large only
    New (#0052A3): 3.2:1 ❌ Fails AA

  Recommendation: Review dark mode usage of this color.

─────────────────
Run 'synkio sync' to apply these changes.
Run 'synkio sync --report' to generate detailed markdown report.
```

**Step 3: Sam reviews and approves**
```bash
# Generate detailed report for team review
$ npx synkio sync --report --preview

# After team approval, apply changes
$ npx synkio sync

✓ Synced 1 token change
✓ Updated tokens.css
✓ Build pipeline triggered
```

---

## Use Case 3: Drift Detection in CI/CD

### Scenario
Jordan wants to prevent design system drift from reaching production. PRs should fail if they introduce hardcoded values that should use tokens.

### User Flow

**Step 1: Configure CI/CD integration**

```yaml
# .github/workflows/design-check.yml
name: Design System Check

on:
  pull_request:
    paths:
      - 'src/**/*.tsx'
      - 'src/**/*.css'
      - 'src/**/*.scss'

jobs:
  design-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Check design system compliance
        run: npx synkio lint --ci
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
```

**Step 2: Developer opens PR with violation**

```tsx
// src/components/SpecialOffer.tsx (new file in PR)
export function SpecialOffer() {
  return (
    <div style={{
      padding: '20px',           // ❌ Should use --spacing-lg
      backgroundColor: '#ff6b6b', // ❌ Not in design system
      borderRadius: '4px'         // ❌ Should use --radius-sm
    }}>
      <h2 style={{ color: '#333' }}>  {/* ❌ Should use semantic color */}
        Special Offer!
      </h2>
    </div>
  );
}
```

**Step 3: CI fails with actionable feedback**

```
$ npx synkio lint --ci

Synkio Design Lint
═══════════════════════════════════════════════════════════════

❌ FAILED: 4 violations found

src/components/SpecialOffer.tsx
─────────────────────────────────────────────────────

  Line 4: Hardcoded spacing value
    Found:    padding: '20px'
    Suggest:  padding: 'var(--spacing-lg)'  (24px)
              padding: 'var(--spacing-md)'  (16px)

  Line 5: Color not in design system
    Found:    backgroundColor: '#ff6b6b'
    Suggest:  This color doesn't exist in your design system.
              Closest matches:
              • --color-error (#ef4444) - 72% similar
              • --color-warning (#f59e0b) - 45% similar

              If this is a new color, add it to Figma first.

  Line 6: Hardcoded border-radius
    Found:    borderRadius: '4px'
    Suggest:  borderRadius: 'var(--radius-sm)'  (4px)

  Line 8: Hardcoded text color
    Found:    color: '#333'
    Suggest:  color: 'var(--color-text-primary)'  (#1a1a1a)

─────────────────────────────────────────────────────

Summary: 4 errors, 0 warnings

To auto-fix where possible, run:
  npx synkio lint --fix

Exit code: 1
```

**Step 4: Developer fixes issues**

```tsx
// src/components/SpecialOffer.tsx (fixed)
export function SpecialOffer() {
  return (
    <div style={{
      padding: 'var(--spacing-lg)',
      backgroundColor: 'var(--color-error)',  // Closest semantic match
      borderRadius: 'var(--radius-sm)'
    }}>
      <h2 style={{ color: 'var(--color-text-on-error)' }}>
        Special Offer!
      </h2>
    </div>
  );
}
```

**Step 5: CI passes**

```
$ npx synkio lint --ci

Synkio Design Lint
═══════════════════════════════════════════════════════════════

✅ PASSED: No violations found

Tokens used in changed files:
  • --spacing-lg
  • --color-error
  • --radius-sm
  • --color-text-on-error

All values match design system baseline.

Exit code: 0
```

---

## Use Case 4: Codebase Health Dashboard

### Scenario
Sam wants to understand the overall health of design system adoption across the codebase.

### User Flow

**Step 1: Run health check**

```bash
$ npx synkio health

Synkio Design System Health Report
═══════════════════════════════════════════════════════════════

📊 OVERALL SCORE: 73/100 (Good)
─────────────────────────────────────────────────────

TOKEN ADOPTION
─────────────────
  Colors:      89% using tokens  ████████▉░  (234/263 values)
  Spacing:     67% using tokens  ██████▋░░░  (456/680 values)
  Typography:  82% using tokens  ████████▏░  (123/150 values)
  Borders:     45% using tokens  ████▌░░░░░  (34/76 values)
  Shadows:     91% using tokens  █████████░  (21/23 values)

COMPONENT USAGE
─────────────────
  Using design system components:  78%
  Using custom/one-off components: 22%

  Most used:
    1. Button       (342 instances)
    2. Text         (289 instances)
    3. Input        (156 instances)
    4. Card         (98 instances)
    5. Modal        (45 instances)

DRIFT HOTSPOTS
─────────────────
  Files with most violations:

  1. src/pages/LegacyDashboard.tsx
     23 hardcoded values, 0 tokens
     Recommendation: Prioritize migration

  2. src/components/deprecated/OldButton.tsx
     18 hardcoded values, 2 tokens
     Recommendation: Replace with Button component

  3. src/features/checkout/PaymentForm.tsx
     12 hardcoded values, 8 tokens
     Recommendation: Incremental token adoption

TRENDS (last 30 days)
─────────────────
  Token adoption:    +3.2%  ↑
  New violations:    -12    ↓
  Fixed violations:  +47    ↑

  ████████████████████████▓▓▓▓░░
  Oct 1                    Nov 1

─────────────────────────────────────────────────────
Full report: .synkio/reports/health-2025-11-15.html

Run 'npx synkio health --open' to view in browser.
```

**Step 2: View interactive dashboard**

```bash
$ npx synkio health --open --serve

Starting Synkio Health Dashboard...

  Local:   http://localhost:3847
  Network: http://192.168.1.100:3847

  Press Ctrl+C to stop.
```

Dashboard shows:
- Token usage heatmap by file/directory
- Trend charts over time
- Click-to-navigate to specific violations
- Filter by token category, component, or team
- Export to PDF for stakeholder reports

---

## Use Case 5: Bidirectional Sync (Code → Figma)

### Scenario
Alex made improvements to spacing tokens in code during development. Sam wants to sync these back to Figma.

### User Flow

**Step 1: Developer modifies tokens in code**

```json
// tokens/spacing.json (modified by developer)
{
  "spacing": {
    "xs": { "$value": "4px", "$type": "dimension" },
    "sm": { "$value": "8px", "$type": "dimension" },
    "md": { "$value": "16px", "$type": "dimension" },
    "lg": { "$value": "24px", "$type": "dimension" },
    "xl": { "$value": "32px", "$type": "dimension" },
    "2xl": { "$value": "48px", "$type": "dimension" }  // ← NEW
  }
}
```

**Step 2: Export for Figma**

```bash
$ npx synkio export-baseline --diff

Synkio Export to Figma
═══════════════════════════════════════════════════════════════

Comparing code tokens to Figma baseline...

CHANGES TO EXPORT
─────────────────
  Added tokens (1):
    + spacing.2xl: 48px

  Modified tokens (0):
    (none)

  Code-only tokens (will be added to Figma):
    + spacing.2xl

EXPORT PREVIEW
─────────────────
  The Synkio Figma plugin will:
  1. Add variable 'spacing/2xl' to 'primitives' collection
  2. Set value to 48px
  3. Apply to all modes (light, dark)

─────────────────
Proceed with export? (y/n): y

✓ Export saved to .synkio/export-baseline.json

Next steps:
  1. Open Figma file
  2. Run Synkio plugin
  3. Click "Import from Code"
  4. Review and apply changes
```

**Step 3: Designer reviews in Figma plugin**

```
┌─────────────────────────────────────────────────────────┐
│  Synkio Figma Plugin                              [x]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📥 Import from Code                                    │
│  ─────────────────                                      │
│                                                         │
│  Changes from codebase:                                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ + spacing/2xl                                    │   │
│  │   Value: 48px                                    │   │
│  │   Collection: primitives                         │   │
│  │   Source: tokens/spacing.json                    │   │
│  │                                                  │   │
│  │   [Preview]  [Skip]  [Apply]                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │          [Apply All Changes]                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Step 4: Confirm sync is complete**

```bash
$ npx synkio sync --preview

No changes detected. Figma and code are in sync.

Last synced: 2 minutes ago
Baseline: .synkio/baseline.json (updated)
```

---

## Use Case 6: Multi-Project Token Federation

### Scenario
A company has multiple products sharing a core design system. Sam needs to manage tokens that flow from core → product-specific overrides.

### User Flow

**Step 1: Configure token hierarchy**

```json
// synkio.config.json
{
  "version": "1.0.0",
  "federation": {
    "mode": "consumer",
    "upstream": {
      "name": "core-design-system",
      "source": "npm:@company/design-tokens",
      "version": "^2.0.0"
    },
    "overrides": {
      "allow": ["colors.brand.*", "typography.font-family"],
      "deny": ["spacing.*", "colors.semantic.*"]
    }
  },
  "figma": {
    "fileId": "ABC123"
  },
  "tokens": {
    "dir": "tokens"
  }
}
```

**Step 2: Sync with federation awareness**

```bash
$ npx synkio sync

Synkio Token Federation
═══════════════════════════════════════════════════════════════

📦 UPSTREAM: @company/design-tokens@2.1.0
─────────────────
  Tokens inherited: 147
  Last updated: 2 days ago

🎨 LOCAL OVERRIDES
─────────────────
  colors.brand.primary:    #0066CC → #E63946 (product override)
  colors.brand.secondary:  #6B7280 → #1D3557 (product override)
  typography.font-family:  Inter → "Poppins, sans-serif" (product override)

⚠️  OVERRIDE VIOLATIONS
─────────────────
  spacing.custom-xl: 64px
    This token is in the 'deny' list for overrides.
    Core system controls spacing tokens.

    Options:
    1. Remove local override (use core value)
    2. Request addition to core system
    3. Add exception in config (not recommended)

─────────────────
Merged tokens written to tokens/
  • 147 from upstream
  • 3 local overrides applied
  • 1 violation flagged
```

**Step 3: View token provenance**

```bash
$ npx synkio tokens --explain colors.brand.primary

Token: colors.brand.primary
═══════════════════════════════════════════════════════════════

Current Value: #E63946
Type: color

PROVENANCE
─────────────────
  Core system:    #0066CC (from @company/design-tokens@2.1.0)
  Local override: #E63946 (from Figma file ABC123)

  Override allowed: ✅ Yes (matches "colors.brand.*" pattern)

USAGE
─────────────────
  This token is used in:
  • 23 components
  • 45 files

  CSS variable: --color-brand-primary

HISTORY
─────────────────
  2025-11-01: Changed from #0066CC to #E63946 (rebrand)
  2025-08-15: Inherited from core system
  2025-03-20: Added to core system
```

---

## New CLI Commands Summary

Based on these use cases, here are the new commands Synkio would add:

| Command | Description |
|---------|-------------|
| `synkio mcp` | Start MCP server for AI agent integration |
| `synkio lint` | Check codebase for design system violations |
| `synkio lint --fix` | Auto-fix violations where possible |
| `synkio lint --ci` | CI-friendly output with exit codes |
| `synkio health` | Generate design system health report |
| `synkio health --serve` | Interactive health dashboard |
| `synkio diff` | Show changes between Figma and code |
| `synkio diff --impact` | Include usage impact analysis |
| `synkio explain <token>` | Show token provenance and usage |

---

## Configuration Evolution

```json
// synkio.config.json (evolved)
{
  "version": "2.0.0",

  // Existing config
  "figma": { ... },
  "tokens": { ... },
  "build": { ... },

  // New: AI Agent Integration
  "mcp": {
    "enabled": true,
    "port": 3847,
    "tools": ["tokens", "components", "validate", "suggest"]
  },

  // New: Linting Rules
  "lint": {
    "rules": {
      "no-hardcoded-colors": "error",
      "no-hardcoded-spacing": "warn",
      "no-magic-numbers": "warn",
      "use-semantic-colors": "error"
    },
    "ignore": [
      "src/legacy/**",
      "**/*.test.tsx"
    ]
  },

  // New: Health Tracking
  "health": {
    "track": true,
    "reportDir": ".synkio/reports",
    "thresholds": {
      "tokenAdoption": 80,
      "componentUsage": 70
    }
  },

  // New: Federation
  "federation": {
    "mode": "standalone" | "consumer" | "publisher",
    "upstream": { ... },
    "overrides": { ... }
  }
}
```

---

## Value Delivered Per Persona

| Persona | Pain Solved | Time Saved |
|---------|-------------|------------|
| **Alex (Developer)** | AI generates correct code first time | 30 min/component |
| **Sam (Design Engineer)** | Drift caught before production | 2-4 hrs/week |
| **Jordan (DevOps)** | Automated quality gates | Manual review eliminated |
| **Morgan (Designer)** | Clear impact of changes | Fewer "why did this break?" conversations |

---

## Implementation Priority

### Phase 1: MCP Server (Highest Impact)
- `synkio mcp` command
- Token query tools for AI agents
- Component information API
- Code validation endpoint

### Phase 2: Linting
- `synkio lint` command
- Rule engine with configurable rules
- Auto-fix capabilities
- CI/CD integration

### Phase 3: Health & Reporting
- `synkio health` command
- Interactive dashboard
- Trend tracking over time
- Team/project filtering

### Phase 4: Federation
- Multi-project token management
- Upstream/downstream relationships
- Override policies
- Provenance tracking
