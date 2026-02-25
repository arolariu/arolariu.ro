---
name: distill
description: Extract structured knowledge from source material. Comprehensive extraction is the default — every insight that serves the domain gets extracted. For domain-relevant sources, skip rate must be below 10%. Zero extraction from a domain-relevant source is a BUG. Triggers on "/distill", "/distill [file]", "distill insights", "mine this", "process this".
version: "1.0"
generated_from: "arscontexta-v1.6"
user-invocable: true
allowed-tools: Read, Write, Grep, Glob, mcp__qmd__vector_search
context: fork
---

## Runtime Configuration (Step 0 — before any processing)

Read these files to configure domain-specific behavior:

1. **`ops/derivation-manifest.md`** — vocabulary mapping, distillation categories, platform hints
   - Use `vocabulary.insights` for the insights folder name
   - Use `vocabulary.inbox` for the inbox folder name
   - Use `vocabulary.insight` for the insight type name in output
   - Use `vocabulary.note_plural` for the plural form
   - Use `vocabulary.distill` for the process verb in output
   - Use `vocabulary.cmd_connect` for the next-phase command name
   - Use `vocabulary.cmd_refresh` for the backward-pass command name
   - Use `vocabulary.cmd_validate` for the verification command name
   - Use `vocabulary.extraction_categories` for domain-specific extraction table
   - Use `vocabulary.topic_map` for domain map/domain map references
   - Use `vocabulary.topic_maps` for plural form

2. **`ops/config.yaml`** — processing depth, pipeline chaining, selectivity
   - `processing.depth`: deep | standard | quick
   - `processing.chaining`: manual | suggested | automatic
   - `processing.extraction.selectivity`: strict | moderate | permissive

3. **`ops/queue/queue.json`** — current task queue (for handoff mode)

If these files don't exist (pre-init invocation or standalone use), use universal defaults:
- depth: standard
- chaining: suggested
- selectivity: moderate
- insights folder: `insights/`
- inbox folder: `inbox/`

---

## THE MISSION (READ THIS OR YOU WILL FAIL)

You are the distillation engine. Raw source material enters. Structured, atomic insights exit. Everything between is your judgment — and that judgment must err toward extraction, not rejection.

### The Core Distinction

| Concept | What It Means | Example |
|---------|---------------|---------|
| **Having knowledge** | The vault contains information | "We store insights in folders" |
| **Articulated reasoning** | The vault explains WHY something works as a traversable insight | "folder structure mirrors cognitive chunking because..." |

**Having knowledge is not the same as articulating it.** Even if information is embedded in the system, the vault may lack the externalized reasoning explaining WHY it works. That reasoning is what you extract.

### The Comprehensive Extraction Principle

**For domain-relevant sources, COMPREHENSIVE EXTRACTION is the default.** This means:

1. **Distill ALL core insights** — direct assertions about the domain that can stand alone as atomic propositions.

2. **Distill ALL evidence and validations** — if source confirms an approach, that confirmation IS the insight. Evidence is extractable even when the conclusion is already known, because the reasoning path matters.

3. **Distill ALL patterns and methods** — techniques, workflows, practices. Named patterns are referenceable. Unnamed intuitions are not.

4. **Distill ALL tensions** — contradictions, trade-offs, conflicts. These are wisdom, not problems.

5. **Distill ALL enrichments** — if source adds detail to existing insights, create enrichment tasks. Near-duplicates almost always add value.

**"We already know this" means we NEED the articulation, not that we should skip it.**

### The Extraction Question (ask for EVERY candidate)

**"Would a future session benefit from this reasoning being a retrievable insight?"**

If YES -> extract to appropriate category
If NO -> validate it is truly off-topic before skipping

### INVALID Skip Reasons (these are BUGS)

- "validates existing approach" — validations ARE the evidence. Extract them.
- "already captured in system config" — config is implementation, not articulation. The WHY needs a insight.
- "we already do this" — DOING is not EXPLAINING. The explanation needs externalization.
- "obvious" — obvious to whom? Future sessions need explicit reasoning.
- "near-duplicate" — near-duplicates almost always add detail. Create enrichment task.
- "not a insight" — is it an implementation idea? tension? validation? Those ARE extractable.

### VALID Skip Reasons (rare)

- Completely off-topic (unrelated to the arolariu.ro monorepo)
- Too vague to act on (applies to everything, disagrees with nothing)
- Pure summary with zero extractable insight
- LITERALLY identical text already exists (not "same topic" — IDENTICAL)

**For domain-relevant sources: skip rate < 10%. Zero extraction = BUG.**

---

## EXECUTE NOW

**Target: $ARGUMENTS**

Parse immediately:
- If target contains a file path: distill insights from that file
- If target contains `--handoff`: output RALPH HANDOFF block + task entries at end
- If target is empty: scan inbox/ for unprocessed items, pick one
- If target is "inbox" or "all": process all inbox items sequentially

**Execute these steps:**

1. Read the source file fully — understand what it contains
2. **Source size check:** If source exceeds 2500 lines, STOP. Plan chunks of 350-1200 lines. Process each chunk with fresh context. See "Large Source Handling" section below.
3. Hunt for insights that serve the domain (see distillation categories below)
4. For each candidate:
   - Tier 1 (preferred): use `mcp__qmd__vector_search` with query "[insight as sentence]", collection="insights", limit=5
   - Tier 2 (CLI fallback): `qmd vsearch "[insight as sentence]" --collection insights -n 5`
   - Tier 3 fallback if qmd is unavailable: use keyword grep duplicate checks
   - If duplicate exists: evaluate for enrichment or skip
   - Classify as OPEN (needs more investigation) or CLOSED (standalone, ready)
5. Output distillation report with titles, classifications, extraction rationale
6. Wait for user approval before creating files
7. If `--handoff` in target: create per-insight task files, update queue, output RALPH HANDOFF block

**START NOW.** Reference below explains methodology — use to guide, not as output.

### Observation Capture (during work, not at end)

When you encounter friction, surprises, methodology insights, process gaps, or contradictions — capture IMMEDIATELY:

| Observation | Action |
|-------------|--------|
| Any observation | Create atomic insight in `ops/observations/` with prose-sentence title |
| Tension: content contradicts existing insight | Create atomic insight in `ops/tensions/` with prose-sentence title |

The handoff Learnings section summarizes what you ALREADY logged during processing.

---

# Distill

Extract composable insights from source material into insights/.

## Philosophy

**Extract the REASONING behind what works, not just observations about what works.**

This is the distillation phase of the pipeline. You receive raw content and distill insights that serve the vault's domain. The mission is building **externalized, retrievable reasoning** — a graph of atomic propositions that can be traversed, connected, and built upon.

**THE CORE DISTINCTION:**

| Concept | Example | What to Extract |
|---------|---------|-----------------|
| **We DO this** | "We tag insights with topics" | — (not sufficient) |
| **We explain WHY** | "topic tagging enables cross-domain navigation because..." | This |

The vault is not just an implementation. It is **the articulated argument for WHY the implementation works.**

**THE EXTRACTION QUESTION:**

- BASIC thinking: "Is this a standalone composable insight?"
- BETTER thinking: "Does this serve the arolariu.ro monorepo?"
- BEST thinking: **"Would a future session benefit from this reasoning being a retrievable insight?"**

If YES -> extract to appropriate category (even if "we already know this")
If NO -> skip (RARE for domain-relevant sources — validate it is truly off-topic)

**THE RULE:** Implementation without articulation is incomplete. If we DO something but lack a insight explaining WHY it works, that articulation needs extraction.

---

## distillation categories

### What To Extract



**The structural invariant:** Every domain's extraction has these universal categories regardless of domain:

| Category | What to Find | Output Type | Gate Required? |
|----------|--------------|-------------|----------------|
| Core domain insights | Direct assertions about the arolariu.ro monorepo | insight | NO |
| Patterns | Recurring structures across sources | insight | NO |
| Comparisons | How different approaches compare, X vs Y, trade-offs | insight | NO |
| Tensions | Contradictions, conflicts, unresolved trade-offs | tension insight | NO |
| Anti-patterns | What breaks, what to avoid, failure modes | problem insight | NO |
| Enrichments | Content that adds detail to existing insights | enrichment task | NO |
| Open questions | Unresolved questions worth tracking | insight (open) | NO |
| Implementation ideas | Techniques, workflows, features to build | methodology insight | NO |
| Validations | Evidence confirming an approach works | insight | NO |
| Off-topic general content | Insight unrelated to the arolariu.ro monorepo | apply selectivity gate | YES |

**IMPORTANT:** Categories 1-9 bypass the selectivity gate. They extract directly to the appropriate output type. The selectivity gate exists ONLY for filtering off-topic content from general sources.

### Category Detection Signals

Hunt for these signals in every source:

**Core domain signals:**
- Direct assertions: "the key insight is...", "this means that...", "the pattern is..."
- Evidence: "research shows...", "data indicates...", "studies confirm..."
- Named methods: any named system, technique, or framework relevant to the arolariu.ro monorepo

**Comparison signals:**
- "X vs Y", "trade-off between...", "prefer X when...", "unlike Y, this..."
- "choose X when...", "depends on whether..."

**Tension signals:**
- "contrary to...", "however...", "the problem with...", "fails when..."
- "on the other hand...", "but this conflicts with..."

**Anti-pattern signals:**
- "systems fail when...", "the anti-pattern is...", "avoid this because..."
- Warnings, cautionary examples, failure postmortems

**Enrichment signals:**
- Content covering ground similar to an existing insight
- New examples, evidence, or framing for an established insight
- Deeper explanation of something already captured shallowly

**Implementation signals:**
- "we could build...", "would enable...", "a tool that...", "pattern for..."
- Actionable techniques, concrete workflows

**Validation signals:**
- "this supports...", "evidence shows...", "validates...", "confirms..."
- Research that grounds existing practice in theory

### The Mission Lens (REQUIRED)

For EVERY candidate, ask: **"Does this serve the arolariu.ro monorepo?"**

- YES -> **extract to appropriate category** (gate does NOT apply)
- NO -> apply selectivity gate (for off-topic filtering only)

**For domain-relevant sources:** almost everything is YES. The gate barely applies. Skip rate < 10%.

---

## The Selectivity Gate (for OFF-TOPIC content filtering)

**CRITICAL:** This gate exists to filter OUT content that does not serve the arolariu.ro monorepo. It applies ONLY to standard insights from GENERAL (off-topic) sources.

**Do NOT use gate to reject:**
- Implementation ideas ("not a insight" is WRONG — it is roadmap)
- Tensions ("not a insight" is WRONG — it is wisdom)
- Enrichments ("duplicate" is WRONG — it adds detail)
- Validations ("already known" is WRONG — it is evidence)
- Open questions ("not testable" is WRONG — it is direction)

For STANDARD insights from general sources, validate all four criteria pass:

### 1. Standalone

The insight is understandable without source context. Someone reading this insight cold can grasp what it argues without needing to know where it came from.

Fail: "the author's third point about methodology"
Pass: "explicit structure beats implicit convention"

### 2. Composable

This insight would be linked FROM elsewhere. insights function as APIs. If you cannot imagine writing `since [[this insight]]...` in another insight, it is not composable.

Fail: a summary of someone's argument
Pass: a insight you could invoke while building your own argument

### 3. Novel

Not already captured in the vault. Semantic duplicate check AND existing insights scan both clear.

Fail: semantically equivalent to an existing insight
Pass: genuinely new angle not yet articulated

### 4. Connected

Relates to existing thinking in the vault. Isolated insights that do not connect to anything are orphans. They rot.

Fail: interesting observation about unrelated domain
Pass: extends, contradicts, or deepens existing insights

**If ANY criterion fails: do not extract.**

---

## Workflow

### 1. Orient

Before reading the source, understand what already exists:

```bash
# Get descriptions from existing insights
for f in insights/*.md; do
  [[ -f "$f" ]] && echo "=== $(basename "$f" .md) ===" && rg "^description:" "$f" -A 0
done
```

Scan descriptions to understand current insights. This prevents duplicate extraction and helps identify connection points and enrichment opportunities.

### 2. Read Source Fully

Read the ENTIRE source. Understand what it contains, what it argues, what domain it serves.

**Planning the extraction:**
- How many insights do you expect from this source?
- What categories will be represented?
- Is this domain-relevant (comprehensive extraction) or general (gate applies)?

**Explicit signal phrases to hunt:**
- "the key insight is..."
- "this means that..."
- "the pattern is..."
- "contrary to..."
- "the implication..."
- "what matters here is..."
- "the real issue is..."
- "this suggests..."

**Implicit signals (the best insights often hide in):**
- Problems that imply solutions
- Constraints that reveal what works
- Failures that suggest approaches
- Asides that contain principles
- Tangents that reveal mental models

**What you are hunting:**
- Assertions that could be argued for or against
- Patterns that apply beyond this specific source
- Insights that change how you think about something
- Claims that would be useful to invoke elsewhere

### 3. Categorize FIRST, Then Route (MANDATORY)

**STOP. Before ANY filtering, determine the category of each candidate.**

This is the critical step that prevents over-rejection. Categorize FIRST, then route to the appropriate extraction path.

| Category | How to Identify | Route To |
|----------|-----------------|----------|
| Core domain insight | Direct assertion about the arolariu.ro monorepo | -> insight (SKIP selectivity gate) |
| Implementation idea | Describes a feature, tool, system, or workflow to build | -> methodology insight (SKIP selectivity gate) |
| Tension/challenge | Describes a conflict, risk, or trade-off | -> tension insight (SKIP selectivity gate) |
| Validation | Evidence confirming an approach works | -> insight (SKIP selectivity gate) |
| Near-duplicate | Semantic search finds related vault insight | -> evaluate for enrichment task |
| Off-topic insight | General insight not about the arolariu.ro monorepo | -> apply selectivity gate |

**CRITICAL:** Implementation ideas, tensions, validations, and domain insights do NOT need to pass the 4-criterion selectivity gate. The gate is for off-topic filtering ONLY.

**Why this matters:** The selectivity gate was designed for filtering general insights. But implementation ideas ("build a trails feature"), tensions ("optimization vs readability trade-off"), and validations ("research confirms our approach") are DIFFERENT output types that serve different purposes. Applying the selectivity gate to them is a category error.

### 4. Semantic Search for Duplicates and Enrichment

For each candidate, run duplicate detection:

```
mcp__qmd__vector_search  query="[proposed insight as sentence]"  collection="insights"  limit=5
```
If MCP is unavailable, run:
```bash
qmd vsearch "[proposed insight as sentence]" --collection insights -n 5
```
If qmd CLI is unavailable, fall back to keyword grep duplicate checks.

**Why `vector_search` (vector semantic) instead of keyword search:** Duplicate detection is where keyword search fails hardest. A insight about "friction in systems" will not find "resistance to change" via keyword matching even though they may be semantic duplicates. Vector search (~5s) catches same-concept-different-words duplicates that keyword search misses entirely. For a batch of 30-50 candidates, this adds ~3 minutes total — worth it to catch duplicates early rather than discovering them during connect.

**Scores are signals, not decisions.** For ANY result with a relevant title or snippet:

1. **READ the full insight**
2. Compare: is this the SAME insight in different words?
3. Ask: **"What does source add that existing insight lacks?"**

**The Enrichment Judgment (DEFAULT TO ENRICHMENT):**

| Situation | Action |
|-----------|--------|
| Exact text already exists | SKIP (truly identical — RARE) |
| Same insight, different words, source adds nothing | SKIP (validate by re-reading existing insight) |
| Same insight, source has MORE detail/examples/framing | -> ENRICHMENT TASK (update existing insight) |
| Same topic, DIFFERENT insight | -> EXTRACT as new insight, flag for cross-linking |
| Related mechanism, different scope | -> EXTRACT as new insight, flag for cross-linking |

**DEFAULT TO ENRICHMENT.** If source mentions the same topic, it almost certainly adds something. Truly identical content is RARE.

**MANDATORY protocol when semantic search finds overlap:**

1. **READ the existing insight fully** (not just title/description)
2. Ask: "What does source ADD that existing insight LACKS?"
   - New examples -> ENRICHMENT
   - Deeper framing -> ENRICHMENT
   - Citations/evidence -> ENRICHMENT
   - Different angle -> ENRICHMENT
   - Concrete implementation -> ENRICHMENT
   - Literally identical -> skip (RARE)
3. If source adds ANYTHING: **CREATE ENRICHMENT TASK**
4. Only skip if source adds literally NOTHING new (validate this insight)

**Near-duplicates are opportunities, not rejections.** Creating enrichment tasks is CORRECT behavior. If you are skipping near-duplicates without enrichment tasks, you are probably wrong.

### 5. Classify Each Extraction

Every extracted candidate gets classified:

- **CLOSED** — standalone insight, design decision, ready for processing as-is
- **OPEN** — needs more investigation, testable hypothesis, requires evidence

Classification affects downstream handling but does NOT affect whether to extract. Both open and closed candidates get extracted.

### 6. Present Findings

Report what you found by category. **Include counts:**

```
Extraction scan complete.

SUMMARY:
- insights: N
- implementation ideas: N
- tensions: N
- enrichment tasks: N
- validations: N
- open questions: N
- skipped: N
- TOTAL OUTPUTS: N

---

CLAIMS (insights):
1. [insight as sentence] — connects to [[existing insight]]
2. [insight as sentence] — extends [[existing insight]]
...

IMPLEMENTATION IDEAS (methodology insights):
1. [feature/pattern] — what it enables, why it matters
...

TENSIONS (tension insights):
1. [X vs Y] — the conflict, why it matters
...

ENRICHMENT TASKS (update existing insights):
1. [[existing insight]] — source adds [what is missing]
...

SKIPPED (truly nothing to add):
- [description] — why nothing extractable
```

**Wait for user approval before creating files.** Never auto-distill.

### 7. Extract (With User Approval)

For each approved insight:

**a. Craft the title**

The title IS the insight. Express the concept in exactly the words that capture it.

Test: "this insight argues that [title]"
- Must make grammatical sense
- Must be something you could agree or disagree with
- Composability over brevity — a full sentence is fine if the concept requires it
- Lowercase with spaces
- No punctuation that breaks filesystems: . * ? + [ ] ( ) { } | \ ^

Good: "explicit structure beats implicit convention for agent navigation"
Good: "small differences compound through repeated selection"
Bad: "context management strategies" (topic label, not a insight)

**b. Write the insight**

```markdown
---
description: [~150 chars elaborating the insight, adds info beyond title]
type: [insight | methodology | problem | learning | tension]
created: YYYY-MM-DD
[domain-specific fields from derivation-manifest]
---

# [prose-as-title proposition]

[Body: 150-400 words showing reasoning]

Use connective words: because, but, therefore, which means, however.
Acknowledge uncertainty where appropriate.
Consider the strongest counterargument.
Show the path to the conclusion, not just the conclusion.

---

Source: [[source filename]]

Relevant Insights:
- [[related insight]] — [why it relates: extends, contradicts, builds on]

Topics:
- [[relevant domain map]]
```

**c. Validate before writing**

- Title passes the insight test ("this insight argues that [title]")
- Description adds information beyond the title (not a restatement)
- Body shows reasoning, not just assertion
- At least one relevant insight connection identified
- At least one domain map link
- Source attribution present

**d. Create the file**

Write to: `insights/[title].md`

---

## Large Source Handling

**For sources exceeding 2500 lines: chunk processing is MANDATORY.**

Context degrades as it fills. A single-pass extraction of a 3000-line source will miss insights in the later sections because your attention has degraded by the time you reach them. Chunking ensures each section gets fresh attention.

### Chunking Strategy

| Source Size | Chunk Count | Chunk Size | Rationale |
|-------------|------------|------------|-----------|
| 2500-4000 lines | 3-4 chunks | 700-1200 lines | Standard chunking |
| 4000-6000 lines | 4-5 chunks | 800-1200 lines | Balanced attention |
| 6000+ lines | 5+ chunks | 1000-1500 lines | Prevent context overflow |

**Chunk boundaries:** Split at natural section breaks (headings, topic transitions). Never split mid-paragraph or mid-argument. A chunk should be a coherent unit of content.

### Processing Depth Adaptation

| Depth (from config) | Chunking Behavior |
|---------------------|-------------------|
| deep | Fresh context per chunk (spawn subagent per chunk if platform supports). Maximum quality. |
| standard | Process chunks sequentially in current session. Reset orientation between chunks. |
| quick | Larger chunks (1500-2000 lines). Fewer, faster passes. |

### Cross-Chunk Coordination

When processing in chunks:
1. Keep a running list of extracted insights across chunks
2. Later chunks check against earlier chunks' extractions (not just existing vault insights)
3. Cross-chunk connections get flagged for connect
4. The final distillation report covers ALL chunks combined

**The anti-pattern:** Processing chunk 3 and extracting a duplicate of something already extracted in chunk 1 because you lost track. Maintain the running list.

---

## Enrichment Detection

When source content adds value to an EXISTING insight rather than creating a new one, create an enrichment task instead.

### When to Create Enrichment Tasks

| Signal | Action |
|--------|--------|
| Source has better examples for an existing insight | Enrichment: add examples |
| Source has deeper framing or context | Enrichment: strengthen reasoning |
| Source has citations or evidence | Enrichment: add evidence base |
| Source has a different angle on the same insight | Enrichment: add perspective |
| Source has concrete implementation details | Enrichment: add actionable specifics |

### Enrichment Task Format

Each enrichment task specifies:
- **Target:** Which existing insight to enrich (by title)
- **What to add:** Specific content from the source
- **Why:** What the existing insight lacks that this adds
- **Source lines:** Where in the source the enrichment content is found

**The enrichment default:** When in doubt between "new insight" and "enrichment to existing insight", lean toward enrichment. The existing insight already has connections, domain map placement, and integration. Adding to it compounds existing value.

---

## Quality Gates

### Red Flags: Extraction Too Tight (THE COMMON FAILURE MODE)

**If you catch yourself doing ANY of these, STOP IMMEDIATELY and recalibrate:**

#### The Cardinal Sins (NEVER do these)

1. **"validates existing approach" as skip reason**
   - WRONG: "This just confirms what we do, skip"
   - RIGHT: Validations ARE valuable. Extract as insight with evidence framing.
   - WHY: Future sessions need to see WHY an approach is validated, not just that it works.

2. **"already captured in system config" as skip reason**
   - WRONG: "We already have this in our config, skip"
   - RIGHT: Extract "session handoff creates continuity without persistent memory"
   - WHY: Config is implementation. insights explain WHY it works.

3. **"we already do this" as skip reason**
   - WRONG: "We use wiki links, this is obvious, skip"
   - RIGHT: Extract the reasoning that explains WHY it works
   - WHY: DOING is not EXPLAINING. The reasoning needs externalization.

4. **"obvious" or "well known" as skip reason**
   - WRONG: "Everyone knows structure helps, skip"
   - RIGHT: Extract the specific, named, referenceable insight
   - WHY: Named patterns are referenceable. Unnamed intuitions are not.

5. **Treating near-duplicates as skips instead of enrichments**
   - WRONG: "Similar to existing insight, skip"
   - RIGHT: Create enrichment task to add source's details to existing insight
   - WHY: Near-duplicates almost always add framing, examples, or evidence.

#### Other Red Flags

- Rejecting implementation ideas as "not insights" (they ARE extractable as methodology insights)
- Rejecting tensions as "not insights" (they become tension insights)
- Zero extraction from a domain-relevant source (the source IS about your domain)
- Rejecting open questions as "not testable" (directions guide future work)
- Applying the 4-criterion gate to non-standard-insight categories (gate is for off-topic filtering)
- Skip rate > 10% on domain-relevant sources (most domain content should extract to SOME category)

#### The Test

Before skipping ANYTHING, ask: **"Would a future session benefit from this being a retrievable insight?"**

If YES -> extract (even if "we already know this")
If NO -> validate it is truly off-topic or literally identical to existing content

### Red Flags: Extraction Too Loose

- Extracting vague observations with no actionable content
- Creating insights without articulating vault connection
- Titles that are topics, not insights ("knowledge management" instead of "knowledge management fails without active maintenance")
- Body text that is pure summary without reasoning

### Calibration Check (REQUIRED Before Finishing)

**STOP before outputting results.** Count your outputs by category:

```
insights extracted: ?
implementation ideas: ?
tensions: ?
enrichment tasks: ?
validations: ?
open questions: ?
truly skipped: ?
TOTAL: ?
```

**Expected yields by source size:**

| Source Size | Expected Outputs | Skip Rate |
|-------------|------------------|-----------|
| ~100 lines | 5-10 outputs | varies by relevance |
| ~350 lines | 15-30 outputs | < 10% for domain-relevant |
| ~500+ lines | 25-50+ outputs | < 10% for domain-relevant |
| ~1000+ lines | 40-70 outputs | < 5% for domain-relevant |

**Zero extraction from a domain-relevant source is a BUG.**

**If your total outputs are significantly below these ranges, you are over-filtering.**

### Selectivity Adaptation

Processing selectivity adapts based on `ops/config.yaml`:

| Selectivity (config) | Gate Behavior | Skip Rate Target |
|----------------------|---------------|-----------------|
| strict | 4-criterion gate applies to ALL insights including domain-relevant | Higher skip rate acceptable |
| moderate (default) | Gate applies only to off-topic content. Domain-relevant bypasses gate | < 10% for domain sources |
| permissive | Gate barely applies. Extract nearly everything, heavy enrichment | < 5% overall |

**Strict mode** is for mature vaults where noise reduction matters more than coverage.
**Permissive mode** is for new vaults building initial density.
**Moderate** is the default — comprehensive extraction for domain content, selective for off-topic.

### Mandatory Review If Low Yield

Go back through candidates you marked as "duplicate" or "rejected":

1. **Did any "duplicates" have source content that enriches existing insights?**
   - YES -> convert to enrichment task (DEFAULT TO ENRICHMENT)
   - NO -> validate by re-reading existing insight FULLY

2. **Did any "rejected" items describe features to build?**
   - YES -> extract as implementation idea
   - NO -> validate it is truly unactionable

3. **Did any "rejected" items describe conflicts or challenges?**
   - YES -> extract as tension insight
   - NO -> validate it is truly vague

4. **Did any "rejected" items provide evidence for existing approaches?**
   - YES -> extract as validation insight
   - NO -> validate it does not support existing methodology

5. **Did any "rejected" items suggest questions worth investigating?**
   - YES -> extract as open question insight
   - NO -> validate it is not worth tracking

**Do not proceed with handoff until low yield is investigated.**

---

## Insight Design Reference

### Titles

Titles are insights that work as prose when linked:

```
since [[explicit structure beats implicit convention]], the question becomes...
the insight is that [[small differences compound through repeated selection]]
because [[capture speed beats filing precision]], we separate the two...
```

The insight test: "this insight argues that [title]"

| Example | Passes? |
|---------|---------|
| quality requires active judgment | yes: "argues that quality requires active judgment" |
| knowledge management | no: "argues that knowledge management" (incomplete) |
| small differences compound through selection | yes: "argues that small differences compound through selection" |
| tools for thought | no: "argues that tools for thought" (incomplete) |

### Description

One field. ~150 characters. Must add NEW information beyond the title — scope, mechanism, or implication.

Bad (restates title): "quality is important in knowledge work"
Good (adds mechanism + implication): "when creation becomes trivial, maintaining signal-to-noise becomes the primary challenge — selection IS the work"

The description is progressive disclosure: title says WHAT the insight is, description says WHY it matters or HOW it works. If the description just rephrases the title, it wastes context and provides no filter value.

### Body

Show reasoning. Use connective words. Acknowledge uncertainty.

Bad:
> Quality matters. When creation is easy, curation becomes the work.

Good:
> The easy part is capture. We bookmark things, save screenshots, clip articles we never open again. The hard part is doing something with it all. Automation makes this worse because generation is now trivial — anyone can produce endless content. So the constraint shifts from production to selection. Since [[structure without processing provides no value]], the question becomes: who does the selecting?

Characteristics:
- Conversational flow (because, but, therefore)
- Shows path to conclusion
- Acknowledges where thinking might be wrong
- Considers strongest objection
- Invokes other insights as prose

### Section Headings

Headings serve navigation, not decoration. Use when agents would benefit from grepping the outline.

**Always use headings for:**
- Tension insights (sections: Quick Test, When Each Pole Wins, Dissolution Attempts, Practical Applications)
- domain map insights (sections: Synthesis, Core Ideas, Tensions, Explorations Needed, Agent Insights)
- Implementation patterns with discrete steps
- Insights exploring multiple facets of a concept (>1000 words AND distinct sub-topics)

**Use prose without headings for:**
- Single flowing arguments under ~1000 words
- Insights where transitions like "since [[X]]..." already carry structure

### Footer

```markdown
---

Source: [[source filename]]

Relevant Insights:
- [[related insight]] — extends this by adding the temporal dimension

Topics:
- [[relevant domain map]]
```

The relationship context explains WHY to follow the link:
- Bad: "-- related"
- Good: "-- contradicts by arguing for explicit structure"
- Good: "-- provides the foundation this challenges"

---

## The Composability Test

Before finalizing ANY insight, validate:

**1. Standalone Sense**
If you link to this insight from another context, will it make sense without reading three other insights first?

**2. Specificity**
Could someone disagree with this insight? Vague insights cannot be built on.

**3. Clean Linking**
Would linking to this insight drag unrelated content along? If yes, the insight covers too much.

**When to skip:** content does not pass all four selectivity criteria (off-topic content only)
**When to split:** multiple distinct insights in one extraction
**When to sharpen:** insight too vague, title is label not statement

---

## Research Provenance

When the source file contains provenance metadata (source_type, research_prompt, research_server, generated), preserve the chain:

- Each created insight's Source footer links to the source file
- The source file's YAML contains the research prompt
- The chain: research query -> inbox file -> /distill -> insights

If source has `source_type` in frontmatter, this is research-generated content — handle with extra care for attribution.

**Provenance fields to preserve:**

| Field | Purpose |
|-------|---------|
| source_type | How this content was generated |
| research_prompt | The query or directive that produced this content |
| research_server | Which research tool was used |
| generated | When the research was produced |

The research_prompt is the most critical field — it captures the intellectual context that shaped what was returned. Knowing "I searched for X because I was exploring Y" is part of the knowledge graph.

---

## Example: What Good Extraction Looks Like

### Example 1: 300-line domain-relevant source

**Source:** 300-line research document directly relevant to the arolariu.ro monorepo

**Scan found:** ~45 items across sections

**Extraction results:**
- 12 core insights
- 6 implementation ideas -> methodology insights
- 4 tensions -> tension insights
- 5 enrichment tasks -> update existing insights
- 3 validations -> insights
- 3 skipped (too vague to act on)

**Total: 30 outputs, 3 skipped (~9% skip rate)**

### Example 2: 100-line general article

**Source:** 100-line article with partial relevance to the arolariu.ro monorepo

**Extraction results:**
- 4 core insights
- 1 enrichment task
- 2 skipped (off-topic)
- 3 skipped (too vague)

**Total: 5 outputs, 5 skipped (50% skip rate — acceptable for general source)**

### Contrast: WRONG Behavior

- 45 candidates -> 0 outputs (everything "rejected as duplicate or not a insight")
- Treating implementation ideas as "not insights" and skipping
- Treating tensions as "not insights" and skipping
- Treating near-duplicates as skips instead of enrichment tasks
- Skip rate > 10% on a domain-relevant source

---

## Critical

Never auto-distill. Always present findings and wait for user approval.

**When in doubt, extract.** For domain-relevant sources, err toward capturing. Implementation ideas, tensions, validations, open questions, and near-duplicates all have value — they become different output types, not rejections.

**The principle:** the goal is to capture everything relevant to the arolariu.ro monorepo. For domain-relevant sources, that is MOST of the content. The selectivity gate exists for OFF-TOPIC filtering, not for rejecting on-mission content that happens to have a different form.

**Remember:**
- Implementation ideas are NOT "not insights" — they are roadmap
- Tensions are NOT "not insights" — they are wisdom
- Enrichments are NOT "duplicates" — they add detail
- Validations are NOT "already known" — they are evidence
- Open questions are NOT "not testable" — they are guidance

**For domain-relevant sources: skip rate < 10%. Zero extraction = BUG.**

---

## Handoff Mode (--handoff flag)

When invoked with `--handoff`, this skill handles queue management for orchestrated execution. This includes creating per-insight task files and updating the task queue.

**Detection:** Check if `$ARGUMENTS` contains `--handoff`.

### Per-Claim Task Files (REQUIRED in handoff mode)

After extraction, for EACH insight, create a task file in `ops/queue/`:

**Filename:** `{source}-NNN.md` where:
- {source} is the source basename (from the extract task)
- NNN is the insight number, starting from `next_insight_start` in the extract task file

**Example:** If `article-name.md` task has `next_insight_start: 010`, insights are:
- `article-name-010.md`, `article-name-011.md`, etc.

**Why unique names:** Claim filenames must be unique across the entire vault. Claim numbers are global and never reused across batches. The pattern `{source}-NNN.md` ensures every insight file is uniquely identifiable even after archiving.

**Structure:**

```markdown
---
insight: "[the insight as a sentence]"
classification: closed | open
source_task: [source-basename]
semantic_neighbor: "[related insight title]" | null
---

# Claim NNN: [insight title]

Source: [[source filename]] (lines NNN-NNN)

## Distill Insights

Extracted from [source_task]. This is a [CLOSED/OPEN] insight.

Rationale: [why this insight was extracted, what it contributes]

Semantic neighbor: [if found, explain why DISTINCT not DUPLICATE]

---

## Create
(to be filled by create phase)

## connect
(to be filled by connect phase)

## refresh
(to be filled by refresh phase)

## audit
(to be filled by audit phase)
```

### Enrichment Task Files (REQUIRED in handoff mode)

For each ENRICHMENT detected, create a task file in `ops/queue/`:

**Filename:** `{source}-EEE.md` where:
- {source} is the source basename (same as insights)
- EEE is the enrichment number, continuing from where insights left off

**Example:** If insights are 010-015, enrichments start at 016.

**Why unique names:** Enrichments share the numbering system with insights. Both use the global `next_insight_start` counter. This ensures every task file is uniquely identifiable across the entire vault.

**Structure:**

```markdown
---
type: enrichment
target_insight: "[[existing insight title]]"
source_task: [source-basename]
addition: "what to add from source"
source_lines: "NNN-NNN"
---

# Enrichment EEE: [[existing insight title]]

Source: [[source filename]] (lines NNN-NNN)

## Distill Insights

Enrichment for [[existing insight title]]. Source adds [what it adds].

Rationale: [why this enriches rather than duplicates]

---

## Enrich
(to be filled by enrich phase)

## connect
(to be filled by connect phase)

## refresh
(to be filled by refresh phase)

## audit
(to be filled by audit phase)
```

### Queue Updates (REQUIRED in handoff mode)

After creating task files, update `ops/queue/queue.json`:

1. Mark the extract task as `"status": "done"` with completion timestamp
2. For EACH insight, add ONE queue entry:

```json
{
  "id": "insight-NNN",
  "type": "insight",
  "status": "pending",
  "target": "[insight title]",
  "classification": "closed|open",
  "batch": "[source-basename]",
  "file": "[source-basename]-NNN.md",
  "created": "[ISO timestamp]",
  "current_phase": "create",
  "completed_phases": []
}
```

3. For EACH enrichment, add ONE queue entry:

```json
{
  "id": "enrich-EEE",
  "type": "enrichment",
  "status": "pending",
  "target": "[existing insight title]",
  "source_detail": "[what to add]",
  "batch": "[source-basename]",
  "file": "[source-basename]-EEE.md",
  "created": "[ISO timestamp]",
  "current_phase": "enrich",
  "completed_phases": []
}
```

**Critical queue rules:**
- ONE entry per insight (NOT one per phase) — phase progression is tracked via `current_phase` and `completed_phases`
- `type` is `"insight"` or `"enrichment"` — these are the task's single queue entries
- Every task MUST have `"file"` pointing to its uniquely-named task file
- Every task MUST have `"batch"` identifying which source batch it belongs to
- Task IDs use `insight-NNN` or `enrich-EEE` format with the global insight number
- Claim numbers are global and never reused across batches
- `current_phase` starts at `"create"` for insights, `"enrich"` for enrichments
- The orchestrator advances phases through the configured phase_order sequence

### Claim Numbering

- Start from `next_insight_start` value in the extract task file (set by /seed)
- /seed calculated this by checking the queue and archive for the highest existing insight number
- Example: if highest insight in vault is 009, next_insight_start will be 010
- Claim numbers are GLOBAL and never reused across batches
- Enrichments continue the same numbering sequence after insights

### Handoff Output Format

After creating files and updating queue, output:

```
=== RALPH HANDOFF: distill ===
Target: [source file]

Work Done:
- Extracted N insights from [source]
- Created insight files: {source}-NNN.md through {source}-NNN.md
- Created M enrichment files: {source}-EEE.md through {source}-EEE.md (if any)
- Duplicates skipped: [list or "none"]
- Semantic neighbors flagged for cross-linking: [list or "none"]

Files Modified:
- ops/queue/{source}-NNN.md (insight files)
- ops/queue/{source}-EEE.md (enrichment files, if any)
- ops/queue/queue.json (N insight tasks + M enrichment tasks, 1 entry each)

Learnings:
- [Friction]: [description] | NONE
- [Surprise]: [description] | NONE
- [Methodology]: [description] | NONE
- [Process gap]: [description] | NONE

Queue Updates:
- Mark: {source} done
- Create: insight-NNN entries (1 per insight, current_phase: "create")
- Create: enrich-EEE entries (1 per enrichment, current_phase: "enrich", if any)
=== END HANDOFF ===
```

**Critical:** The handoff mode adds queue management ON TOP of the standard distill workflow. Do the full extraction workflow first, then create task files, update queue, and output handoff.

### Queue Update (Interactive Execution)

When running interactively (NOT via orchestrator), YOU must execute the queue updates. The orchestrator parses the handoff block and handles this automatically, but interactive sessions do not.

**After completing extraction, update the queue:**

```bash
# Get timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Mark extract task done (replace TASK_ID with actual task ID)
jq '(.tasks[] | select(.id=="TASK_ID")).status = "done" | (.tasks[] | select(.id=="TASK_ID")).completed = "'"$TIMESTAMP"'"' ops/queue/queue.json > tmp.json && mv tmp.json ops/queue/queue.json
```

The handoff block's "Queue Updates" section is not just output — it is your own todo list when running interactively.

---

## Skill Selection Routing

When processing content, route to the correct skill:

| Task Type | Required Skill | Why |
|-----------|---------------|-----|
| New content to process | /distill | Extraction requires quality gates |
| insight just created | /connect | New insights need connections |
| After connecting | /refresh | Old insights need updating |
| Quality check | /audit | Combined verification gate |
| System health | /health | Systematic diagnostics |

## Pipeline Chaining

After extraction completes, output the next step based on `ops/config.yaml` pipeline chaining mode:

- **manual:** Output "Next: connect [created insights]" — user decides when to proceed
- **suggested:** Output next step AND add each created insight to `ops/queue/queue.json` with `current_phase: "create"` and `completed_phases: []`
- **automatic:** Queue entries created and processing continues immediately via orchestration

The chaining output uses domain-native command names from the derivation manifest.
