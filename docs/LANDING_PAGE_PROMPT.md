# Synkio Landing Page Design Prompt

## For: UI Design Agent

---

## What is Synkio?

A CLI tool that syncs Figma design variables to code. Works without Figma's Enterprise plan ($90/seat). Uses ID-based diffing to catch breaking changes before they ship.

**The core belief:** Designers should own design tokens. Developers shouldn't get broken builds.

---

## The Position

```
Designers own the tokens.
Developers own the safety.
Synkio owns the sync.
```

Synkio breaks the fear cycle:
- Designer afraid to push changes → tokens drift → developer blames design → trust erodes → team stops syncing

We make sync **safe, visible, and reversible**.

---

## Design Principles

### 1. Respect the visitor's time
- No hero animations that delay content
- No "scroll to discover" bullshit
- Show what it does in the first viewport
- If they want to install, let them install immediately

### 2. Show, don't tell
- Terminal output screenshots > feature lists
- Diff report examples > "breaking change detection"
- Actual workflow diagrams > vague "seamless integration" claims

### 3. Developer-grade clarity
- Monospace where appropriate
- Code examples that actually work
- Real commands, real output
- Dark mode default (optional light)

### 4. Designer-respecting aesthetics
- Not a brutalist dev tool page
- Clean typography, intentional whitespace
- Subtle color, not gray-on-gray
- Shows we understand both audiences

---

## Tone: Direct, Not Arrogant

### DO
- "Syncs Figma variables to code"
- "Catches breaking changes before deploy"
- "Works without Enterprise"
- "Free. Open source."

### DON'T
- "Revolutionary design-to-code solution"
- "Seamlessly bridge the gap"
- "Enterprise-grade reliability"
- "Loved by thousands of teams"
- "The future of design systems"
- Any sentence starting with "Finally..."
- Any use of "empower" or "leverage"

---

## Page Structure

### Section 1: Hero (First Viewport)

**Hierarchy:**
1. What it is (one line)
2. What it does (one line)
3. Install command
4. Terminal screenshot showing actual output

**Copy options:**

Option A (Ownership angle):
```
Synkio

Figma variables → Code
Breaking changes caught. Drift eliminated.

npm install synkio
```

Option B (Problem-first):
```
Synkio

Your design tokens are drifting.
Synkio syncs them—and tells you what broke.

npm install synkio
```

Option C (Direct):
```
Synkio

Sync Figma variables to code.
Detect breaking changes before deploy.
No Enterprise subscription.

npm install synkio
```

**Visual:** Terminal showing `synkio pull` output with:
- Variables synced count
- Breaking changes detected (with specific paths)
- Clear exit status

---

### Section 2: The Problem (Optional, Short)

Only include if hero isn't clear enough. Max 3 lines.

```
Design tokens drift because syncing is scary.
Designers don't push. Developers don't trust.
Everyone pretends the Figma file is "close enough."
```

Skip the typical "In today's fast-paced environment..." setup.

---

### Section 3: How It Works

**Three steps. Real commands. Real output.**

```
1. Designer updates variables in Figma
   [Screenshot: Figma variables panel]

2. Run synkio pull
   [Terminal: actual output showing detected changes]

3. Review the diff, build when ready
   [Terminal: synkio build output + generated files]
```

No icons. No abstract illustrations. Actual interface screenshots.

---

### Section 4: What Makes It Different

**Not a feature grid. A comparison.**

```
                        Without Synkio          With Synkio
─────────────────────────────────────────────────────────────
Source of truth         Unclear                 Figma
Breaking changes        Discovered in prod      Caught on pull
Token drift             Weeks/months            Visible immediately
Enterprise required     Yes ($90/seat)          No
```

Or as a single statement:

```
Other tools sync tokens.
Synkio tells you what changed, what broke, and lets you roll back.
```

---

### Section 5: For Designers / For Developers

**Two columns. Speak to each audience directly.**

For Designers:
```
Push design changes to code.
No developer approval required.
See exactly what your changes affect.
Roll back if something breaks.
```

For Developers:
```
Designers own the variables.
You own the deploy.
Breaking changes blocked in CI.
No surprises. No 2am pages.
```

---

### Section 6: Quick Start

```
# Install
npm install synkio --save-dev

# Initialize (creates config)
npx synkio init

# Pull from Figma
npx synkio pull

# Build token files
npx synkio build
```

That's it. No signup. No account. No API key form.

(Figma token instructions can be collapsed/expandable)

---

### Section 7: Footer

```
Synkio is free and open source.
MIT License · GitHub · Documentation
```

No newsletter signup. No "Join 10,000 developers" social proof.
If you want a mailing list, make it honest: "Get notified of major releases"

---

## Visual Direction

### Color
- Primary: A single accent color (not blue—everyone uses blue)
- Consider: Deep purple, burnt orange, or teal
- Use sparingly—for CTAs, links, terminal highlights
- Background: Near-black (#0a0a0a) or off-white (#fafafa)

### Typography
- Headlines: Sans-serif, medium weight, tight tracking
- Body: Readable, not too small (16-18px base)
- Code: Monospace, generous line-height
- No all-caps headlines. No ultra-thin weights.

### Terminal Screenshots
- Real terminal aesthetics (not mocked up IDE)
- Actual Synkio output (not placeholder text)
- Show color coding for added/removed/changed
- Window chrome optional but grounding

### Diagrams (if needed)
- Simple boxes and arrows
- No gradients, no glows, no 3D
- Label everything—no abstract shapes

### Illustrations
- Probably none. If any:
  - No floating people
  - No abstract blobs
  - No "design + code = magic" visual metaphors
- If you must: simple line diagrams of the workflow

---

## Anti-Patterns to Avoid

### Layout
- ❌ Full-bleed hero images with overlay text
- ❌ Alternating left-right feature sections
- ❌ Logo carousels ("trusted by...")
- ❌ Sticky headers that eat screen space
- ❌ Parallax anything

### Copy
- ❌ "The #1 design token tool"
- ❌ "Join thousands of teams"
- ❌ "Effortless", "Seamless", "Powerful"
- ❌ "Built for modern teams"
- ❌ Rhetorical questions ("Tired of...?")

### Interactions
- ❌ Scroll-triggered animations that delay reading
- ❌ Hover states that reveal critical info
- ❌ Click-to-expand everything
- ❌ Video backgrounds
- ❌ Chat widgets

---

## Reference Sites (Tone/Aesthetic)

Study these for their restraint and clarity:
- **Linear** — clean, fast, dev-focused
- **Supabase** — technical credibility without arrogance
- **Stripe Docs** — clarity of information
- **Raycast** — dark mode done right
- **Vercel** — code-first presentation

---

## Deliverables

1. **Single-page design** — Desktop and mobile
2. **Copy for each section** — Final, usable text
3. **Component specs** — For terminal blocks, code snippets, comparison tables
4. **Color/type system** — Simple, documented

---

## Success Criteria

A developer should be able to:
- Understand what Synkio does in <10 seconds
- Install it in <30 seconds
- Trust that it's not vaporware (real output shown)

A designer should be able to:
- See that this tool respects their role
- Understand they can push changes without asking dev
- Not feel like this is "another dev tool page"

---

## One More Thing

The landing page itself should demonstrate the philosophy:

**Clear ownership.** Every element has a reason.
**No drift.** Copy matches product reality.
**Safe to ship.** Nothing clever that might break.

Make it a page we'd be proud to `git push`.
