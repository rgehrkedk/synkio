# AgentOS Q&A - Refactor Plan Clarifications

> **Important**: Dette er **guidelines**, ikke copy-paste løsninger.
> AgentOS skal selv tænke, forstå trade-offs, og implementere med forståelse.

---

## 📋 **Spørgsmål & Retningslinjer**

### **Implementation Detaljer**

#### 1. Zod Schema Strictness
**Spørgsmål**: Skal schemat være strict() og skal vi tilføje defaults?

**Retningslinje**:
- ✅ Brug `.strict()` for at fange typos
- ⚠️ Kun default værdier hvor det giver semantisk mening
- ❌ Undgå "magic defaults" - explicit config er bedre

**Overvejelser for AgentOS**:
- Hvad sker der hvis user har `figmaa` i stedet for `figma`? (typo)
- Hvornår er en empty object (`{}`) et OK default vs. `undefined`?
- Se på eksisterende config - hvilke felter er _altid_ required?

**Eksempel på trade-off**:
```typescript
// Option A: Aggressive defaults (hiding missing config)
collections: z.record(z.any()).default({}),
split: z.record(z.any()).default({}),
migration: z.object({...}).default({}),

// Option B: Explicit (user must configure)
collections: z.record(z.any()).optional(), // undefined = not configured
split: z.record(z.any()).optional(),
migration: z.object({...}).optional(),
```

**Tænk**: Hvilken giver bedre fejlbeskeder? Hvilken undgår silent failures?

---

#### 2. FigmaClient Constructor
**Spørgsmål**: Logger som parameter? Circuit breaker threshold?

**Retningslinje**:
- ✅ Logger optional (dependency injection pattern)
- ❌ Skip circuit breaker (YAGNI - CLI er short-lived)
- ⚖️ maxRetries er nok for nu

**Overvejelser for AgentOS**:
- Hvad er forskellen på retry og circuit breaker?
- Hvornår giver circuit breaker mening? (long-running services)
- Hvor længe lever en CLI process typisk? (sekunder vs. dage)

**Research opgave**:
Se på jeres nuværende `api.ts` - hvor mange gange kaldes Figma API i en typisk `synkio sync`?
- 1 gang? → Simple retry er nok
- 100 gange? → Circuit breaker ville give mening

---

#### 3. Logger i Context
**Spørgsmål**: Påkrævet eller optional? Default i produktion?

**Retningslinje**:
- ✅ Optional med smart default
- ⚖️ Balance mellem safety og convenience

**Overvejelser for AgentOS**:
- Hvad sker der med eksisterende kode der ikke passer logger?
- Skal migration være breaking eller backward compatible?
- Hvordan undgår vi `ctx.logger?.info()` overalt? (optional chaining noise)

**Alternative designs**:
```typescript
// Option A: Optional (gradual migration)
interface Context {
  rootDir: string;
  logger?: Logger;
}
ctx.logger?.info('...'); // Safely handles missing logger

// Option B: Required (clean, but breaking)
interface Context {
  rootDir: string;
  logger: Logger;
}
ctx.logger.info('...'); // Clean, but ALL code must pass logger

// Option C: Default in getter
function getContext(): Context {
  return {
    rootDir: process.cwd(),
    logger: new ConsoleLogger(), // Always present
  };
}
```

**Tænk**: Hvilken gør migration nemmest? Hvilken giver bedst code quality long-term?

---

#### 4. Env Var Interpolation
**Spørgsmål**: Logger warnings før eller efter Zod validation?

**Retningslinje**:
- ✅ Interpolate først, log warnings, SÅ validate
- ⚠️ Empty string vs. undefined - hvad er bedst?

**Overvejelser for AgentOS**:
Se på nuværende `interpolateEnvVars()` i `loader.ts`:
- Hvad returneres når env var mangler? (empty string)
- Vil Zod's `.min(1)` check fange dette? (ja!)
- Er det bedre at:
  - Warning → empty string → Zod fejl? (current)
  - Warning → keep `${VAR}` → Zod fejl? (alternative)
  - Error immediately → no Zod? (fail fast)

**Flow comparison**:
```typescript
// Flow A: Warn then validate
${MISSING} → "" → Zod error: "min 1 character"
Pro: Zod giver struktureret fejl
Con: Warning + error = redundant

// Flow B: Fail fast
${MISSING} → throw Error("MISSING not found")
Pro: Clear, immediate
Con: Bypasser Zod validation

// Flow C: Keep placeholder
${MISSING} → "${MISSING}" → Zod error: "invalid format"
Pro: User ser præcis hvad der mangler
Con: Zod error message mindre klar
```

**Tænk**: Hvilken giver bedst developer experience?

---

#### 5. Error Messages
**Spørgsmål**: Skal Zod fejl inkludere actionable steps?

**Retningslinje**:
- ✅ Ja - errors skal guide til løsning
- ⚖️ Balance mellem info og noise

**Overvejelser for AgentOS**:
Se på Zod's default error format:
```
[
  {
    "code": "too_small",
    "minimum": 1,
    "type": "string",
    "inclusive": true,
    "exact": false,
    "message": "String must contain at least 1 character(s)",
    "path": ["figma", "fileId"]
  }
]
```

Hvordan transformerer du dette til actionable error?

**Formatting options**:
```typescript
// Option A: Minimal
"figma.fileId is required"

// Option B: Detailed
"figma.fileId: String must contain at least 1 character(s)"

// Option C: Actionable
"figma.fileId is missing
  → Add fileId to tokensrc.json
  → Or run 'synkio init' to configure"
```

**Tænk**: For meget info = overwhelming. For lidt = frustration. Find balancen.

---

#### 6. Retry Behavior
**Spørgsmål**: Hvad skal retries? Hvad skal fejle immediately?

**Retningslinje**:
- ✅ Retry: 429 (rate limit), 5xx (server errors), timeouts
- ❌ Don't retry: 4xx client errors (except 429)
- ⚖️ Network failures (ECONNRESET, etc.) - depends

**Overvejelser for AgentOS**:
Læs Figma API docs - hvilke fejl er transient vs. permanent?

**Research opgaver**:
1. Hvad er Figma's rate limits? (kan du finde dette i deres docs?)
2. Sender de `Retry-After` header ved 429? (check response headers)
3. Hvad betyder 401 vs. 403? (unauthorized vs. forbidden)
   - 401 = forkert token → retry hjælper ikke
   - 403 = mangler permissions → retry hjælper ikke

**Edge case**:
```typescript
// Scenario: Token expired during sync
// First call: 200 OK
// Second call: 401 Unauthorized (token expired)

// Should we retry? NO - token won't become valid by retrying
// What should we do? Clear error message: "Token expired, refresh and try again"
```

**Tænk**: Hvad er user experience ved hver fejltype? Waste deres tid med retries, eller fail fast med klar besked?

---

#### 7. Testing Silence
**Spørgsmål**: Skal SilentLogger suppresse alt, inkl. errors?

**Retningslinje**:
- ✅ Suppress: debug, info, warn
- ⚠️ Show: errors (hjælper test debugging)
- 🤔 Alternative: Special test logger med buffer?

**Overvejelser for AgentOS**:
Se på jeres nuværende tests:
```bash
grep -r "console.log" packages/core/src --include="*.test.ts"
```

Hvor mange console statements er der i tests? Hvorfor?

**Test scenarios**:
```typescript
// Scenario A: Test fails
test('sync should fetch tokens', async () => {
  await syncCommand({ ... }); // Internally logs errors
  expect(result).toBe(...);   // FAILS
});

// Without error logging: Du ser kun "expected X, got Y"
// With error logging: Du ser "Network timeout" + "expected X, got Y"
```

**Alternative designs**:
```typescript
// Option A: Silent all (nuværende forslag)
class SilentLogger {
  error(): void {} // Suppresses everything
}

// Option B: Buffer errors (show only if test fails)
class TestLogger {
  private errors: string[] = [];
  error(msg: string) {
    this.errors.push(msg);
  }
  dumpIfFailed() {
    if (this.errors.length > 0) {
      console.error('Errors during test:', this.errors);
    }
  }
}

// Option C: Prefix errors (show, but clearly marked)
class TestLogger {
  error(msg: string) {
    console.error(`[TEST ERROR] ${msg}`); // Clear it's from test
  }
}
```

**Tænk**: Hvad gør debugging nemmest når tests fejler?

---

#### 8. Migration Order
**Spørgsmål**: 3 separate PRs eller én atomic change?

**Retningslinje**:
- ✅ 3 PRs er bedre for review og rollback
- ⚠️ Dependencies mellem PRs?
- 🤔 Merge strategy?

**Overvejelser for AgentOS**:
Dependency graph:
```
PR #1: Zod
  ↓ (logger ikke nødvendig her)
PR #2: FigmaClient
  ↓ (bruger ctx.logger hvis det findes)
PR #3: Logger
  ↑ (PR #2 skal allerede være merged)
```

**Alternativ rækkefølge**:
```
Option A: Zod → Figma → Logger (nuværende forslag)
Pro: Zod har biggest impact først
Con: PR #2 kan ikke bruge logger optimalt

Option B: Logger → Zod → Figma
Pro: Infrastructure først, features bygger oven på
Con: Logger refactor rører 535 steder - risky at gøre først

Option C: All-in-one
Pro: Atomic, consistent
Con: Massive PR, svær at review, svær at rollback
```

**Tænk**: Hvad er balance mellem review-ability og consistency?

---

### **Edge Cases**

#### 9. Config Version Mismatch
**Spørgsmål**: Skal Zod validere version semantics eller kun format?

**Retningslinje**:
- ✅ Validate format (`1.0.0` format er valid)
- 🔵 Skip semantics for nu (migrations når nødvendigt)
- 🤔 Hvor alerter vi om outdated versions?

**Overvejelser for AgentOS**:
Nuværende config version: `2.0.0`
CLI version: `1.0.5`

**Scenarios**:
```typescript
// Scenario A: User har old config (1.0.0)
// Current behavior: Vil sandsynligvis fejle pga. structure changes
// Better: "Config v1.0.0 detected, auto-migrating to v2.0.0"

// Scenario B: User har future config (3.0.0)
// Current behavior: Might work, might break silently
// Better: "Config v3.0.0 from newer CLI, please upgrade"
```

**Implementation approach**:
```typescript
// Phase 1 (now): Format validation only
version: z.string().regex(/^\d+\.\d+\.\d+$/)

// Phase 2 (later): Semantic validation
const SUPPORTED_VERSIONS = ['1.0.0', '2.0.0'];
version: z.string().refine(
  v => SUPPORTED_VERSIONS.includes(v),
  'Unsupported config version. Run synkio migrate-config'
)

// Phase 3 (later): Auto-migration
function loadConfig(): ResolvedConfig {
  const raw = JSON.parse(...);
  const migrated = migrateIfNeeded(raw);
  return ConfigSchema.parse(migrated);
}
```

**Tænk**: Hvad er cost/benefit of hver phase? Implementer kun hvad der er nødvendigt nu.

---

#### 10. Request IDs
**Spørgsmål**: Log alle request IDs eller kun ved problemer?

**Retningslinje**:
- ✅ Log ved retries og errors (debugging)
- 🔵 Skip ved success (noise)
- ⚖️ Debug mode kan log alt

**Overvejelser for AgentOS**:
Hvad er use case for request ID?

**Scenarios**:
```
Scenario A: User får rate limited
→ Request ID hjælper dem contact Figma support
→ Log it!

Scenario B: Sync succeeds normally
→ Request ID er irrelevant
→ Skip it (eller kun i debug mode)

Scenario C: Intermittent failures
→ Request ID hjælper dig debug patterns
→ Log ved fejl, ikke success
```

**Implementation**:
```typescript
const requestId = response.headers.get('X-Request-Id');

// Always extract it
// But only log when useful
if (!response.ok || attemptNumber > 1) {
  logger.warn('Issue detected', { requestId, status, attempt });
}

// Debug mode: log everything
if (process.env.DEBUG) {
  logger.debug('Request completed', { requestId, status });
}
```

**Tænk**: Balance mellem debugging info og output noise.

---

#### 11. Defensive Checks
**Spørgsmål**: Kan config være partially loaded efter Zod?

**Svar**: ❌ NEJ - Zod garanterer all-or-nothing

**Overvejelser for AgentOS**:
Forstå Zod's parse behavior:
```typescript
// Zod parse() har 2 outcomes:
// 1. Success → returns fully valid object (all fields guaranteed)
// 2. Failure → throws ZodError (no partial object)

try {
  const config = ConfigSchema.parse(raw);
  // If we reach here, config is FULLY valid
  // NO fields can be undefined/null (unless schema allows it)
} catch (error) {
  // Parse failed, config is NOT available
  // Can't have partial config
}
```

**Common misconception**:
```typescript
// WRONG mental model
const config = ConfigSchema.parse(raw);
if (config.figma) { // ← Unnecessary check
  // This check is redundant - Zod already guaranteed figma exists
}

// CORRECT mental model
const config = ConfigSchema.parse(raw);
// figma is guaranteed to exist, no check needed
console.log(config.figma.fileId); // Safe!
```

**Edge case**: Optional fields
```typescript
const schema = z.object({
  required: z.string(),
  optional: z.string().optional(),
});

const config = schema.parse(raw);
config.required // Type: string (guaranteed)
config.optional // Type: string | undefined (might not exist)

// Defensive check needed ONLY for optional fields
if (config.optional) {
  console.log(config.optional.toUpperCase());
}
```

**Tænk**: Forstå TypeScript types - hvis type siger "string", ingen check nødvendig.

---

#### 12. Rollback Safety
**Spørgsmål**: Backward compatibility med error format?

**Retningslinje**:
- ⚖️ Where possible, ja
- 🤔 Men prioriter clarity over compatibility
- ⚠️ Document breaking changes

**Overvejelser for AgentOS**:
Hvem parser jeres error messages?

**Consumers**:
```
1. Humans (terminal output) → Format can change freely
2. CI scripts (checking for keywords) → Might break if format changes
3. Monitoring tools (regex on logs) → Might break
```

**Research**:
Søg i jeres egen kodebase:
```bash
# Do YOU parse your own error messages?
grep -r "catch.*Error" packages/core/src
grep -r "error.message.includes" packages/core/src
```

Hvis ja → backward compatibility matters
Hvis nej → frit frem

**Example**:
```typescript
// OLD
throw new Error('Missing required field: figma.fileId');

// NEW (breaking)
throw new Error('Invalid config:\n  • figma.fileId: Required');

// NEW (compatible)
throw new Error(
  'Missing required field: figma.fileId\n' +
  'Run "synkio init" to fix' // Extra context, keyword preserved
);
```

**Tænk**: Hvem bliver påvirket af error format changes?

---

### **Scope**

#### 13. Documentation
**Spørgsmål**: Dokumentér hvorfor vi IKKE gør visse ting?

**Retningslinje**:
- ✅ Ja - transparent decision-making
- ⚖️ Keep it concise (ikke essay)
- 🤔 Focus på trade-offs, ikke opinions

**Overvejelser for AgentOS**:
God dokumentation forklarer:
1. **Hvad** vi valgte
2. **Hvorfor** vi valgte det
3. **Hvornår** vi ville vælge anderledes

**Example**:
```markdown
## Why No Orchestrator Pattern?

**Decision**: Use console.log instead of event system

**Reasoning**:
- Current: 5 CLI commands with ~100 log statements each
- Orchestrator: +400 LOC of events, renderers, handlers
- Trade-off: Complexity vs. flexibility

**When to revisit**:
- If we build webhooks (need to emit events to HTTP endpoints)
- If we build Slack integration (need to format for Slack)
- If we expose programmatic API (consumers want structured events)

**Current assessment**: YAGNI - console.log is sufficient
```

**Tænk**: Vil du selv (om 6 måneder) forstå hvorfor denne beslutning blev taget?

---

#### 14. Eksisterende Patterns
**Spørgsmål**: Hvilke patterns skal genbruges?

**Retningslinje**:
- ✅ Genbruge gør kodebasen consistent
- ⚠️ Men ikke blindt - vurder om pattern er god
- 🤔 Måske eksisterende pattern skal forbedres?

**Overvejelser for AgentOS**:

**Research opgave**:
Find alle eksisterende patterns:
```bash
# Find all "OrThrow" functions
grep -r "OrThrow" packages/core/src --include="*.ts" -A 5

# Analyze pattern:
# - Do they all look the same?
# - Are they consistent?
# - Could they be improved?
```

**Pattern analysis**:
```typescript
// Find this pattern in loader.ts
export function loadConfigOrThrow(): TokensConfig {
  const config = loadConfig();
  if (!config) {
    throw new Error('Config not found. Run synkio init');
  }
  return config;
}

// Questions to ask:
// 1. Is error message helpful? (yes - tells user what to do)
// 2. Is pattern consistent? (check other OrThrow functions)
// 3. Should we have a generic wrapper? (probably not - messages differ)
```

**Pattern to adopt**:
```typescript
// GOOD: Consistent naming
loadConfigOrThrow()
loadBaselineOrThrow()
loadTokenMapOrThrow()

// BAD: Inconsistent
loadConfigOrThrow()
getBaselineOrError()  // Different verb
requireTokenMap()      // Different pattern
```

**Tænk**: Consistency gør kode lettere at læse og forstå.

---

## 🎯 **SUMMARY FOR AGENTCOS**

### **Hvad skal du gøre?**

1. **Research først**
   - Læs eksisterende kode (især `loader.ts`, `api.ts`, `context.ts`)
   - Forstå patterns der allerede bruges
   - Find edge cases i nuværende implementation

2. **Design decisions**
   - For hver beslutning: forstå trade-offs
   - Dokumentér HVORFOR du vælger som du gør
   - Vælg pragmatisk (ikke perfekt)

3. **Implement incrementally**
   - Start med PR #1 (Zod) - smallest, biggest impact
   - Test grundigt før næste PR
   - Learn from første PR før du starter næste

4. **Don't blindly copy**
   - Code snippets i denne fil er EXAMPLES, ikke solutions
   - Tilpas til jeres specifikke kodebase
   - Tænk selv - forstå før du implementerer

### **Success criteria**

✅ Du forstår HVORFOR hver beslutning er taget
✅ Du kan forklare trade-offs til Rasmus
✅ Koden er consistent med eksisterende patterns
✅ Tests dokumenterer behavior klart
✅ Documentation forklarer decisions

❌ Copy-paste uden forståelse
❌ Over-engineer baseret på hypothetical needs
❌ Bryd eksisterende patterns uden god grund

---

## 📚 **Learning Resources**

### **Patterns to Study**
- Dependency Injection (hvorfor FigmaClient får logger som param)
- Factory Pattern (hvorfor `createLogger()` function)
- Guard Clauses (hvorfor `OrThrow` functions)
- YAGNI principle (You Aren't Gonna Need It)
- KISS principle (Keep It Simple, Stupid)

### **Code to Read**
Before implementing, read these files fully:
- `packages/core/src/files/loader.ts` (631 LOC - config loading)
- `packages/core/src/context.ts` (140 LOC - context pattern)
- `packages/core/src/figma/api.ts` (149 LOC - current API client)
- Any `*.test.ts` file (understand testing patterns)

### **Questions to Ask Yourself**
1. Hvad er simplest thing that could possibly work?
2. Er jeg ved at over-engineer dette?
3. Løser jeg et reelt problem eller et hypothetisk problem?
4. Vil denne kode være lettere at læse om 6 måneder?
5. Hvad er worst-case scenario hvis min implementation fejler?

---

**Good luck! Tænk selv, spørg Rasmus hvis du er i tvivl, og implementer med forståelse.**
