# Synkio: Edge Positioning Options

**Purpose:** Explore provocative, memorable positioning that cuts through noise

---

## The Tension Points (Market Reality)

### 1. Figma is Becoming the Adobe of Design Tools
- 33% price hike for freelancers in 2025
- Forced bundling of FigJam/Slides nobody asked for
- Enterprise-gating critical features (Variables API)
- Community sentiment shifting: "Figma might be following in Adobe's footsteps"
- Alternatives (Penpot, Sketch, Canva) getting more attention

### 2. Design Tokens Have a Credibility Problem
- Salesforce **abandoned** their own token system—"just aren't super helpful"
- Critics call it "a layer of design consultants selling complicated ways to think about constants"
- IBM Carbon's token system called "rigid, hard to evolve, difficult to understand"
- The DTCG spec is becoming less human-manageable, expecting vendor tools
- Real quote: "we reframe our challenges around the tools, especially the latest shiny toy"

### 3. The Complexity Industrial Complex
- Tokens Studio has 214 open issues, deprecated token types, sync bugs
- Teams spend more time configuring tools than shipping features
- "Design systems are in a state of flux—inflated expectations, difficult second stage"
- Small teams burdened with ever-growing token architectures

---

## Edgy Product Directions

### Option A: "The Anti-Token Token Tool"

**Hot Take:** Most teams don't need design tokens. They need their Figma variables in code.

**Product Edge:**
- Kill the jargon: "variables" not "tokens" in all messaging
- No configuration hell: works with zero setup
- No token architecture required: just sync what you have
- Position as the "practical" choice vs the "correct" choice

**Messaging:**
> "You don't need a token architecture. You need your colors in CSS."

> "Synkio: For teams who'd rather ship than strategize about naming conventions."

**Why it's edgy:** Directly challenges the design systems consultant ecosystem that profits from complexity.

---

### Option B: "The Figma Resistance"

**Hot Take:** Figma is taxing you for features that should be free. Stop paying.

**Product Edge:**
- Explicitly position against Figma's Enterprise model
- Calculate and publicize the "Figma tax" teams pay
- Frame the plugin workaround as a feature, not a hack
- Build community around "Enterprise-free" workflows

**Messaging:**
> "Figma Variables without the $90/seat ransom."

> "The Enterprise paywall ends here."

> "Synkio: What Figma would charge you $50k/year to do."

**Why it's edgy:** Takes a direct shot at Figma's business model. Risky but memorable.

---

### Option C: "The Breaking Change Zealot"

**Hot Take:** Your design system will break production. Every. Single. Time. Unless you treat it like code.

**Product Edge:**
- Fear-based marketing around design-to-code disasters
- Position design changes as deployment risks
- Build the "Sentry for design tokens"—observability, alerting, rollback
- Make breaking change detection the entire brand

**Messaging:**
> "That innocent color change? It broke 47 components in production."

> "Synkio: Because 'the designer updated something' shouldn't mean a P0 incident."

> "Design changes are code changes. Treat them that way."

**Why it's edgy:** Creates urgency through fear. Positions design teams as a risk vector (controversial but true).

---

### Option D: "The Simplicity Militant"

**Hot Take:** Design token tools are built by consultants who bill by the hour. Synkio is built for people who ship.

**Product Edge:**
- Actively remove features instead of adding them
- "Works in 5 minutes or we failed" guarantee
- Anti-feature marketing: "What Synkio doesn't do"
- Opinionated to the point of being stubborn

**Messaging:**
> "No token types. No composition tokens. No architecture decisions. Just your variables, in code."

> "Tokens Studio has 23 token types. You need 4."

> "Synkio: The design token tool that respects your time."

**Why it's edgy:** Throws shade at feature-heavy competitors by name.

---

## Edgy Marketing Tactics

### 1. The Savings Calculator
Build a public tool: "How much is Figma's Enterprise tax costing you?"
- Input team size → Output yearly cost
- Compare: Enterprise vs Synkio (free)
- Shareable results for social proof

### 2. The Horror Stories Blog
Document real production incidents caused by design token changes:
- "How a font-weight change took down checkout for 3 hours"
- "The $200k color variable rename"
- Anonymized but specific—creates urgency

### 3. The "We Don't Do That" Page
Anti-feature marketing:
- ❌ 23 token types (we do 4)
- ❌ Composition tokens (deprecated anyway)
- ❌ Paid tiers (it's free)
- ❌ Enterprise sales calls (just use it)

### 4. The Figma Forum Guerrilla
Every time someone asks "Why is Variables API Enterprise-only?":
- Community members mention Synkio as the workaround
- Not spammy—genuinely helpful responses
- Let frustrated users find you organically

### 5. The "Token-Free" Challenge
Content series: "Building a design system without design tokens"
- Controversial take that gets engagement
- Shows you understand the skepticism
- Positions Synkio as "if you must use tokens, at least use simple ones"

---

## Recommended Edge: Hybrid "Practical Rebellion"

Combine **Option A + B** for maximum differentiation:

### Core Position
**"Synkio: Design variables for teams who ship, not teams who pay."**

### The Edge
1. **Anti-complexity:** Challenge the token industrial complex
2. **Anti-paywall:** Challenge Figma's Enterprise gatekeeping
3. **Pro-shipping:** Everything in service of actually getting work done

### Tone
- Confident, slightly irreverent
- Respects developers' time
- Skeptical of "best practices" that slow teams down
- Not mean, but not deferential either

### Sample Landing Page Copy

> **Figma Variables. In your code. Without the BS.**
>
> No Enterprise subscription. No token architecture debates. No 47-page style guide.
>
> You made variables in Figma. Synkio puts them in your codebase. That's it.
>
> *While your competitors are in their third token naming workshop, you'll have shipped.*

---

## Risk Assessment

| Approach | Upside | Downside |
|----------|--------|----------|
| Anti-Figma | Viral potential, clear enemy | Could alienate Figma partnership opportunities |
| Anti-complexity | Resonates with frustrated devs | May seem "not serious" to enterprise |
| Fear-based (breaking changes) | Creates urgency | Can feel manipulative |
| Simplicity militant | Clear differentiation | Limits feature expansion narrative |

**Recommendation:** Lead with anti-complexity (broader appeal), layer in anti-paywall (clear differentiator), save fear-based for specific content (case studies, not homepage).

---

## What This Means for the Product

If you go edgy on marketing, the product needs to back it up:

### Must-Haves for Credibility
1. **Actually simple:** 5-minute setup or the messaging is hollow
2. **Actually free:** No "free tier with gotchas"
3. **Actually works without Enterprise:** The core promise must be rock solid

### Product Changes to Consider
1. `synkio sync` — One command that does everything (pull + build)
2. Zero-config mode with smart defaults
3. Framework presets (Tailwind, vanilla CSS, CSS-in-JS)
4. "Time saved" metrics in CLI output (reinforce the speed message)

---

## Sources

- [André Torgal - The problem(s) with design tokens](https://andretorgal.com/posts/2025-01/the-problem-with-design-tokens)
- [Damato Design - Avoiding tokens](https://blog.damato.design/posts/avoiding-tokens/)
- [Hacker News - Design Token-Based UI Architecture discussion](https://news.ycombinator.com/item?id=42445834)
- [Medium - Figma's 2025 Pricing Overhaul](https://medium.com/@bvarungupta/figmas-2025-pricing-overhaul-what-designers-need-to-know-%EF%B8%8F-8befe9b0af39)
- [UX Collective - Another year, another Figma pricing update](https://uxdesign.cc/another-year-another-figma-pricing-update-a5c5d5c88543)
- [Figma Forum - Price Increase: Greed](https://forum.figma.com/archive-21/price-increase-greed-8525)
- [Design Systems Collective - Shaping Systems for the Year Ahead](https://designsystemscollective.substack.com/p/shaping-systems-for-the-year-ahead)
