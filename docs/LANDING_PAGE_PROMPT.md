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

---

## Interactive Element Option A: "The Tug of War"

### The Concept

A tug-of-war between **Designer** and **Developer**. The page's design tokens shift based on who's winning. Too far either way = chaos. The middle (Synkio zone) = balance.

**The meta-lesson:** Without Synkio, design-to-code is a constant fight. With Synkio, both sides get what they want.

---

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DESIGNER ◄━━━━━━━━━━●━━━━━━━━━━► DEVELOPER                   │
│                    [SYNKIO]                                     │
│                                                                 │
│   Click your side to pull. See what happens to the page.        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Mechanics:**
- Visitors click either side to add "pull"
- The rope/slider moves based on cumulative clicks (global, real-time)
- Page tokens interpolate between extremes based on position
- Center = balanced design (Synkio's sweet spot)

---

### The Token Spectrum

As the tug moves left (Designer wins) or right (Developer wins), tokens shift:

| Token | Designer Extreme | Balanced (Synkio) | Developer Extreme |
|-------|------------------|-------------------|-------------------|
| `--font-family` | `'Playfair Display', serif` | `'Inter', system-ui` | `'JetBrains Mono', monospace` |
| `--color-primary` | `#FF6B6B` (coral) | `#6366f1` (indigo) | `#22C55E` (terminal green) |
| `--color-background` | `#FFF5F5` (warm white) | `#0a0a0a` (neutral dark) | `#0D1117` (GitHub dark) |
| `--border-radius` | `24px` (soft) | `8px` (balanced) | `0px` (sharp) |
| `--spacing-md` | `24px` (airy) | `16px` (balanced) | `8px` (dense) |
| `--font-size-base` | `18px` (readable) | `16px` (standard) | `14px` (compact) |
| `--line-height` | `1.8` (loose) | `1.5` (balanced) | `1.3` (tight) |
| `--shadow` | `0 8px 30px rgba(0,0,0,0.12)` | `0 4px 6px rgba(0,0,0,0.1)` | `none` |
| `--letter-spacing` | `0.02em` (open) | `0` (normal) | `-0.02em` (tight) |

---

### Visual States

**Designer winning (left extreme):**
- Soft, warm, editorial feel
- Generous whitespace
- Decorative serif fonts
- Rounded everything
- Subtle shadows
- *"Looks like a lifestyle blog"*

**Developer winning (right extreme):**
- Dense, monospace, terminal aesthetic
- Tight spacing, no "wasted" space
- Sharp corners, no decoration
- High contrast, no shadows
- *"Looks like a man page"*

**Balanced (Synkio zone):**
- Clean, professional, intentional
- The actual good design
- *"Looks like a product people trust"*

---

### The Chaos Zones

When the rope goes too far either way, show warnings:

**Designer extreme:**
```
⚠️ DESIGNER WINNING

"The hero section is now 900px tall."
"Developers are mass-quitting."
"The CTO is crying in the parking lot."

[Pull back toward balance]
```

**Developer extreme:**
```
⚠️ DEVELOPER WINNING

"The font is 12px monospace."
"Users think this is a CLI."
"The design team has unionized."

[Pull back toward balance]
```

**Balanced (Synkio):**
```
✓ SYNKIO ZONE

"Designers own the tokens."
"Developers trust the sync."
"Everyone ships."
```

---

### Multiplayer Tension (The Addictive Part)

**Real-time global state:**
- Everyone visiting the site is playing
- See the rope move as others click
- Creates emergent competition

**Display:**
```
DESIGNER          ●          DEVELOPER
   847 pulls    [====●====]    923 pulls

"76 people are playing right now"
```

**Why it's addictive:**
- "I need to pull it back to my side"
- Real-time feedback from other visitors
- The page constantly shifting creates urgency
- Natural tribal identity (are you a designer or developer?)

---

### Synkio's Role in the Game

When balanced, show the Synkio message:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ● SYNKIO ZONE                                                │
│                                                                 │
│   "When designers and developers stop fighting,                 │
│    this is what the page looks like."                          │
│                                                                 │
│   Synkio keeps you here. Automatically.                         │
│                                                                 │
│   [Install Synkio]                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Technical Implementation

**Token interpolation:**
```javascript
function interpolateTokens(position) {
  // position: -1 (designer) to +1 (developer), 0 = balanced
  const tokens = {
    '--font-family': position < -0.5 ? 'Playfair Display'
                   : position > 0.5 ? 'JetBrains Mono'
                   : 'Inter',
    '--border-radius': lerp(24, 0, position), // 24px → 0px
    '--spacing-md': lerp(24, 8, position),    // 24px → 8px
    // ... etc
  };

  Object.entries(tokens).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}
```

**Real-time sync (optional):**
- WebSocket or Server-Sent Events
- Fallback: poll every 2 seconds
- Or: purely local (each visitor has their own rope)

**Simpler version (no backend):**
- Auto-oscillate slowly between extremes
- User clicks "pull" to temporarily shift their direction
- Demonstrates the concept without multiplayer complexity

---

### Copy Options

**Header:**
- "The Eternal Struggle"
- "Designer vs Developer"
- "Pick a Side"
- "The Tug of War"

**Subhead:**
> "Design and development are always pulling in different directions. See what happens when one side wins."

**CTA at balance:**
> "Synkio keeps you in the zone where everyone ships."

---

### Mobile Considerations

- Swipe left/right instead of click
- Haptic feedback on pull
- Simplified rope visualization
- Same token interpolation

---

### The Meta-Lesson

1. **Extremes are bad** — Too designer OR too developer = unusable
2. **Balance is hard** — The rope naturally drifts
3. **Synkio maintains balance** — Automated sync keeps you centered
4. **Both sides matter** — Neither is wrong, both need guardrails

---

### Comparison: Roulette vs Tug

| Aspect | Breaking Change Roulette | Tug of War |
|--------|-------------------------|------------|
| **Mechanic** | Random chaos | Controlled spectrum |
| **Lesson** | "Changes break things" | "Balance is hard" |
| **Tone** | Funny/chaotic | Competitive/tribal |
| **Social** | Shareable moments | Real-time multiplayer |
| **Complexity** | Simpler to build | More complex (if multiplayer) |
| **Addiction** | "One more spin" | "Must pull back to my side" |

**Recommendation:** Tug of War if you want tribal engagement and real-time play. Roulette if you want simpler implementation with shareable chaos moments.

**Or combine them:** Tug of War as the main game, Roulette as an easter egg.

---

---

## Interactive Element Option B: "Breaking Change Roulette"

### The Concept

The landing page is built with CSS custom properties (design tokens). A game widget lets visitors "break" the page by changing token values. Then Synkio "rolls back" and fixes it.

**The meta-joke:** The page itself is the demo. You experience the chaos. Then you experience the fix.

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   🎰 BREAKING CHANGE ROULETTE                          │
│                                                         │
│   "A designer changed something. Spin to find out what."│
│                                                         │
│              [ SPIN THE WHEEL ]                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**On spin:**
1. Wheel animates through token names
2. Lands on a random token (e.g., `--color-primary`)
3. Token value changes to something absurd
4. **The actual page breaks in real-time**

**After the break:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   💥 PRODUCTION IS DOWN                                 │
│                                                         │
│   --spacing-md changed from 16px to 400px               │
│                                                         │
│   "The designer said it needed more breathing room."    │
│                                                         │
│              [ SYNKIO ROLLBACK ]                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**On rollback:**
- Page smoothly transitions back to normal
- Satisfying "fixed" feedback
- Counter increments: "Synkio has saved this page 4,382 times"

---

### Token Breaks (The Fun Part)

Each token has a funny "designer request" and an absurd result:

| Token | Designer Said | New Value | Visual Result |
|-------|---------------|-----------|---------------|
| `--color-primary` | "Make it pop" | `#FF00FF` (magenta) | All buttons/links go nuclear pink |
| `--color-background` | "Warmer" | `#8B0000` (dark red) | Page looks like a crime scene |
| `--font-size-base` | "More readable" | `48px` | Everything is ENORMOUS |
| `--font-size-base` | "Subtle" | `8px` | Everything is microscopic |
| `--spacing-md` | "Breathing room" | `200px` | Massive gaps everywhere |
| `--spacing-md` | "Tighter" | `-8px` | Everything overlaps |
| `--border-radius` | "Softer" | `50px` | All rectangles are pills |
| `--border-radius` | "Modern" | `0` | Brutalist boxes everywhere |
| `--font-family` | "Playful" | `Comic Sans MS` | Self-explanatory |
| `--font-family` | "Premium" | `Papyrus` | Even worse |
| `--line-height` | "Dense" | `0.8` | Text overlaps itself |
| `--color-text` | "Subtle" | Same as background | Text disappears |
| `--shadow` | "Depth" | `20px 20px 0 red` | 90s GeoCities vibes |

---

### Technical Implementation

**Page tokens (CSS custom properties):**
```css
:root {
  --color-primary: #6366f1;
  --color-background: #0a0a0a;
  --color-text: #fafafa;
  --font-size-base: 16px;
  --font-family: 'Inter', system-ui, sans-serif;
  --spacing-md: 16px;
  --border-radius: 8px;
  --line-height: 1.5;
  --shadow: 0 4px 6px rgba(0,0,0,0.1);
}
```

**Break function:**
```javascript
function breakToken(token, newValue) {
  document.documentElement.style.setProperty(token, newValue);
  // Add transition for smooth chaos
}

function rollback() {
  document.documentElement.removeAttribute('style');
  // Tokens revert to CSS defaults
  incrementSaveCounter();
}
```

**The wheel:**
- Pure CSS/JS, no heavy libraries
- Satisfying spin physics (easing, momentum)
- Suspenseful slowdown
- Click sound optional (respect prefers-reduced-motion)

---

### Copy for the Widget

**Header options:**
- "Breaking Change Roulette"
- "What Did The Designer Change?"
- "Spin to Break Production"

**Pre-spin:**
> "Every token change is a dice roll. Spin to see what breaks."

**Post-break (randomized):**
- "Congrats! You just mass to 400px."
- "The checkout button is now magenta. Conversion rate: 0%."
- "Legal can't read the terms anymore. Font size: 6px."
- "The CEO is asking why the site looks like Papyrus."

**Post-rollback:**
> "One command. Everything fixed."
> `npx synkio rollback`

---

### Shareable Moments

Generate a "breaking change report" users can share:

```
┌─────────────────────────────────────────────────────────┐
│  I BROKE PRODUCTION                                     │
│                                                         │
│  Changed: --font-family                                 │
│  To: Comic Sans MS                                      │
│  Designer said: "Let's be more approachable"            │
│                                                         │
│  Synkio fixed it in 0.003s                              │
│                                                         │
│  [Share on Twitter]  [Try it yourself]                  │
└─────────────────────────────────────────────────────────┘
```

---

### Escalating Chaos Mode (Optional)

**Multi-break mode:** Don't roll back. Keep spinning.

```
Spin 1: --color-primary → magenta
Spin 2: --spacing-md → 200px
Spin 3: --font-family → Papyrus
Spin 4: --font-size-base → 8px
Spin 5: --border-radius → 50px

[The page is now completely unusable]

"This is 3 months of design drift. In 30 seconds."

[ SYNKIO ROLLBACK ]  ← Fixes EVERYTHING at once
```

**The payoff:** One rollback fixes all 5 breaks simultaneously. Visceral demonstration of value.

---

### Where It Lives on the Page

**Option A: Hero integration**
- Widget is the hero's main CTA instead of just "Install"
- Immediately interactive
- Risk: Might confuse first-time visitors

**Option B: Dedicated section**
- Below the fold, after "How it works"
- Clear context before you play
- Safer but less surprising

**Option C: Easter egg**
- Hidden trigger (Konami code? Click the logo 3 times?)
- Reward for curious visitors
- Generates social sharing when discovered

**Recommendation:** Option B for launch, with the game prominent but contextualized. Move to Option A once user research confirms it helps, not hurts, comprehension.

---

### Accessibility Considerations

- Respect `prefers-reduced-motion`: Skip animations, instant state changes
- Screen reader: Announce what changed and that rollback is available
- Keyboard: Full widget control via keyboard
- Don't auto-play: User must initiate the break
- Ensure rollback is always visible/reachable even when page is "broken"

---

### The Meta-Lesson

The widget teaches through experience:

1. **Token changes have consequences** — You see it break
2. **Small changes can cascade** — One value, whole page affected
3. **Rollback is instant** — The fix is one click/command
4. **This is what Synkio does** — Protect you from this chaos

The page IS the product demo. No screenshots needed.

---

## One More Thing

The landing page itself should demonstrate the philosophy:

**Clear ownership.** Every element has a reason.
**No drift.** Copy matches product reality.
**Safe to ship.** Nothing clever that might break.
**Except when we break it on purpose.** To show you why that matters.

Make it a page we'd be proud to `git push`.
