# Synkio CLI - Arkitektur Review & Beslutningspunkter

**Dato:** 17. december 2025
**Formål:** Identificere og prioritere forbedringer før markedslancering
**Målgruppe:** Product Manager / Beslutningstagende

---

## Overordnet Vurdering

Synkio har et **solidt teknisk fundament**. Koden er velstruktureret, og de vigtigste features virker som forventet. Der er dog nogle områder der kræver opmærksomhed før vi kan kalde produktet "market ready".

Jeg har identificeret **8 forbedringsinitiativer** fordelt på tre prioritetsniveauer.

---

## Kritiske Issues (Blokerer Release)

### 1. Pakken kan ikke importeres programmatisk

**Hvad er problemet?**
Når udviklere installerer Synkio via npm, kan de kun bruge CLI-kommandoer (`synkio sync`). De kan ikke importere Synkio i deres egen kode, selvom package.json lover dette.

**Hvorfor er det vigtigt?**
- Udviklere der vil bygge automatisering (CI/CD pipelines, custom scripts) kan ikke bruge pakken
- Det ser uprofessionelt ud at love noget i package.json som ikke virker
- Kan give dårlige npm reviews/GitHub issues

**Indsats:** Lille (1-2 timer)

**Beslutning påkrævet:** Ingen - dette skal fixes.

---
Svar til #1: ENIG! Men er den afhængig af valg i #2 til #8?

---

### 2. Shared-pakken: Brug den eller slet den

**Hvad er problemet?**
Der eksisterer en `@synkio/shared` pakke i monorepo'et som var tiltænkt at dele kode mellem CLI og Figma-plugin. I praksis:
- CLI'en bruger den **ikke** - den har sine egne kopier af al logikken
- Figma-pluginet har en **copy-pasted version** af koden
- Resultatet er **tre versioner** af samme logik

**Hvorfor er det vigtigt?**
- Bug fixes skal laves tre steder
- Koden kan komme ud af sync (ironi!)
- Forvirrer fremtidige bidragsydere

**Indsats:** Medium (4-8 timer afhængig af valg)

**Beslutning påkrævet:**

| Option | Beskrivelse | Fordele | Ulemper |
|--------|-------------|---------|---------|
| **A: Slet shared** | Fjern pakken helt. CLI og plugin er self-contained | Simpelt, ingen afhængigheder | Duplikeret kode fremover |
| **B: Brug shared** | Refaktorer CLI og plugin til at importere fra shared | Single source of truth | Mere kompleks build, breaking change for plugin |

**Min anbefaling:** Option A for nu. Shared-pakken giver mest værdi når CLI og plugin udvikles i tæt sync. Da CLI'en er primær fokus, hold den self-contained.

---
Svar til #2: Er mit Synkio UI plugin afhængig af denne shared logic? Eller hvorfor har vi den? Måske shared har features som vi "bare" skal rydde op i eller ligge andetsted? Jeg ved ikke noget. Du er eksperten

---

### 3. Manglende version-kommando

**Hvad er problemet?**
`synkio --version` eller `synkio -v` virker ikke. Brugere kan ikke se hvilken version de har installeret.

**Hvorfor er det vigtigt?**
- Standard forventning for alle CLI-værktøjer
- Nødvendig for support/debugging ("hvilken version kører du?")
- Ser amatøragtigt ud at mangle

**Indsats:** Minimal (30 min)

**Beslutning påkrævet:** Ingen - dette skal fixes.

---
Svar til #3. Okay det skal fikses

---


## Vigtige Forbedringer (Kort Efter Release)

### 4. Duplikeret kode i Style Dictionary integration

**Hvad er problemet?**
Den samme logik til at konvertere tokens findes to steder i kodebasen. De gør præcis det samme, men er skrevet to gange.

**Hvorfor er det vigtigt?**
- Vedligeholdelsebyrde: ændringer skal laves to steder
- Risiko for at de kommer ud af sync
- Gør koden sværere at forstå

**Indsats:** Lille (2-3 timer)

**Beslutning påkrævet:** Ingen - dette er ren teknisk gæld der skal ryddes op.

---
Svar til #4. Skal fikses, men det skal sikres at vi ikke fjerner logik der bruges

---

### 5. Ingen validering af data fra Figma-plugin

**Hvad er problemet?**
Når CLI'en modtager data fra Figma-pluginet, antager den at data er korrekt formateret. Hvis pluginet sender korrupte eller uventede data, får brugeren en kryptisk fejlbesked.

**Hvorfor er det vigtigt?**
- Dårlig brugeroplevelse ved fejl
- Svært at debugge for brugere
- Kan give falsk indtryk af at CLI'en er buggy

**Indsats:** Medium (3-4 timer)

**Beslutning påkrævet:** Ingen - dette forbedrer robusthed.

---
Svar til #5. Bør laves. 

---

### 6. Style Dictionary tjek kommer for sent

**Hvad er problemet?**
Hvis en bruger konfigurerer Synkio til at bruge Style Dictionary (avanceret output-mode), men ikke har installeret Style Dictionary, opdager de først fejlen efter Figma-sync er kørt. Det kan tage 5-10 sekunder før fejlen vises.

**Hvorfor er det vigtigt?**
- Spild af brugerens tid
- Kan føles som om noget gik galt under sync

**Indsats:** Lille (1-2 timer)

**Beslutning påkrævet:** Ingen - ren UX-forbedring.

---
Svar til #6. Bør laves. 

---

## Nice-to-Have (Fremtidige Releases)

### 7. Standardiser konfigurationsfilnavn

**Hvad er problemet?**
Synkio bruger `tokensrc.json` som config-fil. Dette navn:
- Er ikke umiddelbart genkendeligt som Synkio-relateret
- Følger ikke konventioner (`*.config.json`, `.xxxrc.json`)
- I demo-mappen bruges varianter som `tokensrc.css.json`



**Hvorfor er det vigtigt?**
- Brugere skal gætte/læse docs for at finde config-filen
- IDE'er kan ikke auto-complete/validere uden kendt filnavn
- Inkonsistens skaber forvirring

**Indsats:** Medium (4-6 timer inkl. migration)

**Beslutning påkrævet:**

| Option | Filnavn | Fordele | Ulemper |
|--------|---------|---------|---------|
| **A: Behold** | `tokensrc.json` | Ingen breaking change | Ukendt konvention |
| **B: Moderne** | `synkio.config.json` | Genkendeligt, IDE-venligt | Breaking change |
| **C: RC-stil** | `.synkiorc` | Unix-konvention | Skjult fil, breaking change |

**Min anbefaling:** Behold for v1.0, overvej B for v2.0 med migration-support.

---

Svar til #7. Option B bør bestemt laves og prioriteres for production readiness

---

### 8. Parallel fil-skrivning for bedre performance

**Hvad er problemet?**
Når Synkio skriver token-filer, gør den det én fil ad gangen. Med mange filer (50+) kan dette mærkes.

**Hvorfor er det vigtigt?**
- Performance-forbedring for store design systems
- Ikke kritisk for typiske use cases (10-20 filer)

**Indsats:** Lille (2-3 timer)

**Beslutning påkrævet:** Ingen - nice-to-have optimering.

---

Svar til #8. Denne skal vi ikke arbejde videre med nu.

---

## Opsummering

### Skal fixes før release:
| # | Initiativ | Indsats |
|---|-----------|---------|
| 1 | Programmatisk import | Lille |
| 2 | Shared-pakke beslutning | Medium |
| 3 | Version-kommando | Minimal |

### Bør fixes kort efter release:
| # | Initiativ | Indsats |
|---|-----------|---------|
| 4 | Duplikeret kode cleanup | Lille |
| 5 | Figma data validering | Medium |
| 6 | Tidligt Style Dictionary tjek | Lille |

### Kan vente til senere:
| # | Initiativ | Indsats |
|---|-----------|---------|
| 7 | Config-fil standardisering | Medium |
| 8 | Parallel fil-skrivning | Lille |

---

## Næste Skridt

1. **Gennemgå dette dokument** og giv feedback
2. **Træf beslutning** på punkt 2 (shared-pakke) og evt. punkt 7 (config-navn)
3. **Jeg udarbejder teknisk implementeringsplan** baseret på dine prioriteringer

---

*Har du spørgsmål til nogle af punkterne?*
