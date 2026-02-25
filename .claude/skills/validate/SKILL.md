---
name: validate
description: Combined verification — recite (description quality via cold-read prediction) + audit (schema compliance) + review (health checks). Use as a quality gate after creating insights or as periodic maintenance. Triggers on "/validate", "/validate [insight]", "validate insight quality", "check insight health".
user-invocable: true
allowed-tools: Read, Write, Edit, Grep, Glob, mcp__qmd__vector_search
context: fork
---

## Runtime Configuration (Step 0 — before any processing)

Read these files to configure domain-specific behavior:

1. **`ops/derivation-manifest.md`** — vocabulary mapping, platform hints
   - Use `vocabulary.insights` for the insights folder name
   - Use `vocabulary.insight` / `vocabulary.note_plural` for insight type references
   - Use `vocabulary.validate` for the process verb in output
   - Use `vocabulary.topic_map` for domain map references
   - Use `vocabulary.templates` for the templates folder path
   - Use `vocabulary.cmd_connect` for redirect when missing connections found

2. **`ops/config.yaml`** — processing depth, verification settings
   - `processing.depth`: deep | standard | quick
   - `processing.verification.description_test`: true | false
   - `processing.verification.schema_check`: true | false
   - `processing.verification.link_check`: true | false

If these files don't exist, use universal defaults.

**Processing depth adaptation:**

| Depth | Verification Behavior |
|-------|-----------------------|
| deep | Full verification: cold-read prediction, complete schema check, exhaustive link verification, domain map coverage, orphan risk analysis, content staleness detection, bundling analysis |
| standard | Balanced: cold-read prediction, schema check, link verification, domain map coverage |
| quick | Basic: schema check, link verification only. Skip cold-read prediction and health analysis |

## EXECUTE NOW

**Target: $ARGUMENTS**

Parse immediately:
- If target contains a insight name: validate that specific insight
- If target contains `--handoff`: output RALPH HANDOFF block at end
- If target is "all" or "recent": validate recently created/modified insights
- If target is empty: ask which insight to validate

## Anti-Shortcut Warning

Before marking verification as passed, you MUST complete ALL four categories:

1. COMPLETE description quality test — cold-read the title + description,
   predict what the insight contains, compare against actual content.
   A description that merely restates the title FAILS.

2. COMPLETE schema validation — check ALL required fields from the
   template schema, validate ALL enum values are valid, confirm ALL
   constraints are met. A single missing required field FAILS.

3. COMPLETE link verification — confirm ALL wiki links in the insight
   resolve to existing files. A single dangling link FAILS.

4. COMPLETE domain map integration — validate the insight appears in at least
   one domain map's Core Ideas section with a context phrase.
   A insight with no domain map mention FAILS.

Do NOT declare success after checking only one or two categories.
ALL FOUR must pass.

**Execute these steps IN ORDER:**

### Step 0: INDEX FRESHNESS CHECK

Before any retrieval tests, validate the semantic search index is current:

1. Try `mcp__qmd__vector_search` with a simple test query to confirm MCP availability
2. If MCP is unavailable (tool fails or returns error), try qmd CLI (`qmd status`) to confirm local CLI availability
3. If either MCP or qmd CLI is available, proceed to Step 1
4. If neither MCP nor qmd CLI is available: insight "retrieval test will be deferred" and proceed — do NOT let index issues block verification

The index freshness check prevents false retrieval failures on recently created insights. If the index is stale, retrieval test results should be interpreted with that context.

### Step 1: RECITE (cold-read prediction test)

**CRITICAL: Do NOT read the full insight yet. Only read frontmatter.**

This step tests whether the title + description alone enable an agent to predict the insight's content. The cold-read constraint is the entire point — reading the insight first contaminates the prediction.

**1. Read ONLY title + description**

Use Read with a line limit to get just the first few lines of frontmatter. Extract:
- Title (the filename without .md)
- Description (the description field)

Do NOT scroll past the frontmatter closing `---`.

**2. Form prediction**

Before reading further, write out what you expect:
- Core argument: what insight does this insight make?
- Mechanism: what reasoning or evidence does it use?
- Scope: what boundaries does the argument have?
- Likely connections: what other insights would it reference?

Write this prediction explicitly in your output. It must be specific enough to be wrong.

**3. Read full insight content**

NOW read the complete insight. Compare against your prediction.

**4. Score prediction accuracy (1-5)**

| Score | Meaning | Threshold |
|-------|---------|-----------|
| **5** | Perfect — description fully captured the argument | Pass |
| **4** | Strong — minor details missed, core predicted | Pass |
| **3** | Adequate — general area right, missed key aspects | Pass (minimum) |
| **2** | Weak — significant mismatch between prediction and content | FAIL |
| **1** | Failed — insight argued something different than expected | FAIL |

**Passing threshold: 3 or above.**

**5. Run semantic retrieval test**

Test whether the description enables semantic retrieval:

- Tier 1 (preferred): `mcp__qmd__vector_search` with query = "[the insight's description text]", collection = "insights", limit = 10
- Tier 2 (CLI fallback): `qmd vsearch "[the insight's description text]" --collection insights -n 10`
- Tier 3: if both MCP and qmd CLI are unavailable, report "retrieval test deferred (semantic search unavailable)" — do NOT skip silently

Check where the insight appears in results:
- Top 3: description works well for semantic retrieval
- Position 4-10: adequate but could improve
- Not in top 10: flag — description may not convey the insight's meaning

**Why vector_search specifically:** Agents find insights via semantic search during connect and refresh. Testing with keyword search tests the wrong retrieval method. Full hybrid search with LLM reranking compensates for weak descriptions — too lenient. vector_search tests real semantic findability without hiding bad descriptions behind reranking.

**6. Draft improved description if needed**

If prediction score < 3:
- Diagnose the failure: too vague? missing mechanism? wrong emphasis? restates title?
- Draft an improved description that would score higher
- If you have Edit tool access: apply the improvement

**7. Combined scoring**

| Prediction Score | Retrieval Rank | Suggested Action |
|------------------|----------------|------------------|
| 4-5 | top 3 | Description works — no changes needed |
| 3-4 | top 5 | Adequate — minor improvements possible |
| 3+ | 6-10 | Investigate — passes prediction but weak retrieval |
| any | not in top 10 | Flag for review — description may not enable retrieval |
| < 3 | any | FAIL — description needs rewriting |

### Step 2: VALIDATE (schema check)

Read the template that applies to this insight type. Determine the template by checking:
- Insight location (e.g., insights/ uses the standard insight template)
- Type field in frontmatter (if present, may indicate a specialized template)

If the vault has templates with `_schema` blocks, read the `_schema` from the relevant template for authoritative field requirements. If no `_schema` exists, use the checks below as defaults.

**Required fields (FAIL if missing):**

| Field | Requirement | Severity |
|-------|-------------|----------|
| `description` | Must exist and be non-empty | FAIL |
| Topics footer or `topics` field | Must reference at least one domain map | FAIL |

**Description constraints (WARN if violated):**

| Constraint | Check | Severity |
|------------|-------|----------|
| Length | Should be ~50-200 characters | WARN |
| Format | Single sentence, no trailing period | WARN |
| Content | MUST add NEW information beyond title | WARN |
| Semantic value | Should capture mechanism, not just topic | WARN |

**How to check "adds new info":** Read the title, read the description. If the description says the same thing in different words, it fails this check. A good description adds: mechanism (how/why), scope (boundaries), implication (what follows), or context (where it applies).

**YAML validity (FAIL if broken):**

| Check | Rule | Severity |
|-------|------|----------|
| Frontmatter delimiters | Must start with `---` and close with `---` | FAIL |
| Valid YAML | Must parse without errors | FAIL |
| No unknown fields | Fields not in the template | WARN |

**Domain-specific field enums (WARN if invalid):**

If the insight has fields with enumerated values (type, category, status, etc.), check them against the template's `_schema.enums` block. Each invalid enum value produces a WARN.

**Relevant insights format (WARN if incorrect):**

| Constraint | Check | Severity |
|------------|-------|----------|
| Format | Array with context: `["[[insight]] -- relationship"]` | WARN |
| Relationship type | Should use standard types: extends, foundation, contradicts, enables, example | INFO |
| Links exist | Each referenced insight must exist as a file | WARN |

**Topics format (FAIL if invalid):**

| Constraint | Check | Severity |
|------------|-------|----------|
| Format | Array of wiki links: `["[[topic]]"]` | FAIL |
| Links exist | Each domain map must exist as a file | WARN |

**Composability (WARN if fails):**

| Check | Rule | Severity |
|-------|------|----------|
| Title test | Can you complete "This insight argues that [title]"? | WARN |
| Specificity | Is the insight specific enough to disagree with? | WARN |

### Step 3: REVIEW (per-insight health checks)

Run these 5 checks on the insight:

**1. YAML frontmatter integrity**
- File starts with `---`, has closing `---`
- YAML parses without errors
- No duplicate keys

**2. Description quality (independent of recite)**
- Description is present and non-empty
- Description adds information beyond the title
- Description is not just the title rephrased

**3. domain map connection**
- Insight appears in at least one domain map's Core Ideas section
- How to check: grep for `[[insight title]]` in files that serve as domain maps
- The insight's Topics footer references a valid domain map
- A insight with no domain map mention is orphaned — FAIL

**4. Wiki link density**
- Count outgoing wiki links in the insight body (not just frontmatter)
- Expected minimum: 2 outgoing links
- If < 2: flag as sparse — the insight is not participating in the graph
- Sparse insights should be routed to /connect for connection finding

**5. Link resolution**
- Scan ALL wiki links in the insight — body, frontmatter `relevant_insights`, and Topics
- For each `[[link]]`, confirm a matching file exists in the vault
- **Exclude** wiki links inside backtick-wrapped code blocks (single backtick or triple backtick) — these are syntax examples, not real links
- A single dangling link = FAIL with the specific broken link identified

**Deep-only checks (when processing.depth = deep):**

**6. Orphan risk assessment**
- Count incoming links: grep for `[[insight title]]` across all .md files
- If 0 incoming links: AT RISK — insight exists but nothing references it
- If 1 incoming link: LOW RISK — single point of connection
- If 2+ incoming links: OK

**7. Content staleness detection**
- Read the insight's content and assess whether insights still seem current
- Check if referenced concepts/tools/approaches have changed
- Flag anything that reads as potentially outdated

**8. Bundling analysis**
- Does the insight make multiple distinct insights that could be separate insights?
- Check: could you link to part of this insight without dragging unrelated context?
- If yes: flag for potential splitting

### Step 4: APPLY FIXES

If you have Edit tool access, apply fixes for clear-cut issues:

**Auto-fix (safe to apply):**
- Improved description if recite score < 3
- Missing `---` frontmatter delimiters
- Trailing period on description
- Missing Topics footer (if obvious which domain map applies)

**Do NOT auto-fix (requires judgment):**
- Bundled insights (splitting requires understanding the insights)
- Content staleness (needs human review of factual accuracy)
- Missing connections (use /connect instead — connection finding is its own phase)
- Ambiguous domain map assignment (when insight could fit multiple)

### Step 5: Compile Results

Combine all checks into a unified report:

```
=== VERIFY: [insight title] ===

RECITE:
  Prediction score: N/5
  Retrieval rank: #N (or "not in top 10" or "deferred")
  Description: [pass/improved/needs work]

VALIDATE:
  Required fields: [PASS/FAIL — detail]
  Description constraints: [PASS/WARN — detail]
  Topics format: [PASS/FAIL — detail]
  Optional fields: [PASS/WARN/N/A]
  Relevant insights: [PASS/WARN/N/A]
  Composability: [PASS/WARN]

REVIEW:
  Frontmatter: [PASS/FAIL]
  Description quality: [PASS/WARN]
  domain map connection: [PASS/FAIL — which domain map]
  Wiki links: N outgoing [PASS/WARN if < 2]
  Link resolution: [PASS/FAIL — broken links listed]

Overall: [PASS / WARN (N warnings) / FAIL (N failures)]

Actions Taken:
- [List of fixes applied, or "none"]

Recommended Actions:
- [List of suggested next steps, or "none"]
===
```

### Step 6: Update task file and capture observations

- If a task file is in context (pipeline execution): update the `## Validate` section with results
- Connect on the process: friction? surprises? methodology insights? process gaps?
- If any observations worth capturing: create atomic insight in the observations directory per the observation capture pattern
- If `--handoff` in target: output RALPH HANDOFF block (see below)

**START NOW.** The reference material below explains philosophy and methodology — use to guide reasoning, not as output to repeat.

---

# Validate

Combined verification: recite (description quality) + audit (schema compliance) + review (health checks). Three lightweight checks in one context window.

## philosophy

**verification is one concern, not three.**

recite tests whether the description enables retrieval. audit checks schema compliance. review checks graph health. all three operate on the same insight, read the same frontmatter, and together answer one question: is this insight ready?

running them separately meant three context windows, three subagent spawns, three rounds of reading the same file. the checks are lightweight enough (combined context ~15-25% of window) that they fit comfortably in one session while staying in the smart zone.

> "the unit of verification is the insight, not the check type."

## execution order matters

**Recite MUST run first.** The cold-read prediction test requires forming an honest prediction from title + description BEFORE reading the full insight. If audit or review ran first (both read the full insight), the prediction would be contaminated. Recite's constraint: predict first, read second.

**Index freshness runs before everything.** The retrieval test in recite depends on semantic search having current data. Without a freshness check, recently created insights produce false retrieval failures that obscure actual description quality issues.

After recite reads the full insight, audit and review can run in any order since they both need the full content.

## recite: description quality

the testing effect applied to vault quality. read only title + description, predict what the insight argues, then check. if your prediction fails, the description fails.

**why this matters:** descriptions are the API of the vault. agents decide whether to load a insight based on title + description. a misleading description causes two failure modes:
- **false positive:** agent reads the insight expecting X, wastes context on Y
- **false negative:** agent skips the insight because description doesn't signal relevance

both degrade the vault's value as a knowledge tool.

**retrieval test rationale:** agents find insights via semantic search during connect and refresh. testing with BM25 keyword matching tests the wrong retrieval method. full hybrid search with LLM reranking compensates for weak descriptions — too lenient. vector_search tests real semantic findability without hiding bad descriptions.

## audit: schema compliance

checks against the relevant template schema:

| Check | Requirement | Severity |
|-------|-------------|----------|
| `description` | Must exist, non-empty | FAIL |
| `topics` | Must exist, array of wiki links | FAIL |
| description length | < 200 chars | WARN |
| description content | Adds info beyond title | WARN |
| description format | No trailing period | WARN |
| domain enum fields | Valid values per template `_schema.enums` | WARN |
| `relevant_insights` format | Array with context phrases | WARN |
| YAML integrity | Well-formed, `---` delimiters | FAIL |
| Composability | Title passes "This insight argues that [title]" test | WARN |

**FAIL means fix needed. WARN is informational but worth addressing.**

**template discovery:** The skill reads the template for the insight type to get its `_schema` block. If no template exists or no `_schema` block is found, fall back to the default checks above.

## review: per-insight health

5 focused checks per insight (not a full vault-wide audit):

1. **YAML frontmatter** — well-formed, has `---` delimiters, valid parsing
2. **Description quality** — present, adds info beyond title, not a restatement
3. **domain map connection** — appears in at least one domain map
4. **Wiki link count** — >= 2 outgoing links (graph participation threshold)
5. **Link resolution** — all wiki links point to existing files (full body scan, excluding backtick-wrapped examples)

plus 3 deep-only checks for comprehensive audits:
6. **Orphan risk** — incoming link count (is anything pointing here?)
7. **Content staleness** — does the content still seem accurate?
8. **Bundling** — does the insight make multiple distinct insights?

## common failure patterns

| Pattern | Symptom | Fix |
|---------|---------|-----|
| Title restated as description | Recite score 1-2, prediction trivially correct but content is richer | Rewrite description to add mechanism/scope |
| Missing domain map | Review fails domain map check | Add to appropriate domain map or create Topics footer |
| Dangling links | Review fails link resolution | Remove link, create the target insight, or fix the spelling |
| Sparse insight | < 2 outgoing links | Route to /connect for connection finding |
| Schema drift | Enum values not in template | Update insight to use valid values, or propose enum addition |

## batch mode (--all)

When verifying all insights:

1. Discover all insights in insights/ directory
2. For each insight, run the full verification pipeline
3. Produce summary report:
   - Total insights checked
   - PASS / WARN / FAIL counts per category
   - Top issues grouped by check type
   - Insights needing immediate attention (FAIL items)
   - Pattern analysis across failures

**Performance insight:** In batch mode, the recite cold-read test runs honestly for each insight. Do not "warm up" by reading multiple insights first — each prediction must be genuinely cold.

## standalone invocation

### /validate [insight]

Run all three checks on a specific insight. Full detailed report.

### /validate --all

Comprehensive audit of all insights in insights/. Summary table + flagged failures.

### /validate --handoff [insight]

Pipeline mode for orchestrator. Runs full workflow, outputs RALPH HANDOFF block.

## handoff mode (--handoff flag)

When invoked with `--handoff`, output this structured format at the END of the session:

```
=== RALPH HANDOFF: validate ===
Target: [[insight name]]

Work Done:
- Recite: prediction N/5, retrieval #N, [pass/fail]
- Audit: [PASS/WARN/FAIL] (N checks, M warnings, K failures)
- Review: [PASS/WARN/FAIL] (N checks, M issues)
- Description improved: [yes/no]

Files Modified:
- insights/[insight].md (description improved, if applicable)
- [task file path] (Validate section updated, if applicable)

Learnings:
- [Friction]: [description] | NONE
- [Surprise]: [description] | NONE
- [Methodology]: [description] | NONE
- [Process gap]: [description] | NONE

Queue Updates:
- Mark: validate done for this task
=== END HANDOFF ===
```

## task file update

When a task file is in context (pipeline execution), update the `## Validate` section:

```markdown
## Validate
**Verified:** [UTC timestamp]

Recite:
- Prediction: N/5 — [brief reason]
- Retrieval: #N via MCP vector_search or CLI vsearch (or "deferred")
- Description: [kept/improved — brief insight]

Audit:
- Required fields: PASS
- Description constraints: PASS (147 chars, adds mechanism)
- Topics: PASS (["[[topic]]"])
- Optional: [status]

Review:
- Frontmatter: PASS
- domain map connection: PASS ([[topic]])
- Wiki links: N outgoing
- Link resolution: PASS (all resolve)

Overall: [PASS/WARN/FAIL]
```

## Pipeline Chaining

Validate is the **final pipeline phase**. After verification completes:

- **manual:** Output "Verified. Pipeline complete." — no next step
- **suggested:** Output completion summary AND suggest marking task done in queue
- **automatic:** Task marked done, summary logged to task file

If verification FAILS (recite score < 3 or any FAIL-level issue), do NOT mark done. Instead:
- Output what failed and what needs fixing
- Keep task at `current_phase: "validate"` for re-run after fixes

The chaining output uses domain-native vocabulary from the derivation manifest.

## queue.json update (interactive execution)

When running interactively (NOT via orchestrator), YOU must execute queue updates:

```bash
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
jq '(.tasks[] | select(.id=="TASK_ID")).status = "done" | (.tasks[] | select(.id=="TASK_ID")).completed = "'"$TIMESTAMP"'"' ops/queue/queue.json > tmp.json && mv tmp.json ops/queue/queue.json
```

The queue path uses the domain-native operations folder. Check `ops/` or equivalent.

## critical constraints

**never:**
- read the insight before forming the recite prediction (cold-read is the whole point)
- auto-fix FAIL-level issues without flagging them in the report
- skip the semantic retrieval test without reporting "deferred"
- leave failures without suggested improvements
- declare PASS after checking only some categories

**always:**
- run recite FIRST (before audit/review — execution order is load-bearing)
- be honest about prediction accuracy (inflated scores defeat the purpose)
- suggest specific improved descriptions for score < 3
- report all severity levels clearly (PASS/WARN/FAIL)
- update task file if one is in context
- capture observations for friction, surprises, or methodology insights
