---
name: connect
description: Find connections between insights and update domain maps. Requires semantic judgment to identify genuine relationships. Use after /distill creates insights, when exploring connections, or when a topic needs synthesis. Triggers on "/connect", "/connect [insight]", "find connections", "update domain maps", "connect these insights".
user-invocable: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, mcp__qmd__search, mcp__qmd__vector_search, mcp__qmd__deep_search, mcp__qmd__status
context: fork
---

## Runtime Configuration (Step 0 — before any processing)

Read these files to configure domain-specific behavior:

1. **`ops/derivation-manifest.md`** — vocabulary mapping, platform hints
   - Use `vocabulary.insights` for the insights folder name
   - Use `vocabulary.insight` / `vocabulary.note_plural` for insight type references
   - Use `vocabulary.connect` for the process verb in output
   - Use `vocabulary.topic_map` / `vocabulary.topic_map_plural` for domain map references
   - Use `vocabulary.cmd_refresh` for the next-phase suggestion
   - Use `vocabulary.inbox` for the inbox folder name

2. **`ops/config.yaml`** — processing depth, pipeline chaining
   - `processing.depth`: deep | standard | quick
   - `processing.chaining`: manual | suggested | automatic

If these files don't exist, use universal defaults.

**Processing depth adaptation:**

| Depth | Connection Behavior |
|-------|-------------------|
| deep | Full dual discovery (domain map + semantic search). Evaluate every candidate. Multiple passes. Synthesis opportunity detection. Bidirectional link evaluation for all connections. |
| standard | Dual discovery with top 5-10 candidates. Standard evaluation. Bidirectional check for strong connections only. |
| quick | Single pass — either domain map or semantic search. Accept obvious connections only. Skip synthesis detection. |

## EXECUTE NOW

**Target: $ARGUMENTS**

Parse immediately:
- If target contains `[[insight name]]` or insight name: find connections for that insight
- If target contains `--handoff`: output RALPH HANDOFF block at end
- If target is empty: check for recently created insights or ask which insight
- If target is "recent" or "new": find connections for all insights created today

**Execute these steps:**

1. Read the target insight fully — understand its insight and context
2. **Throughout discovery:** Capture which domain maps you read, which queries you ran (with scores), which candidates you evaluated. This becomes the Discovery Trace — proving methodology was followed, not reconstructed.
3. Run Phase 0 (index freshness check)
4. Use dual discovery in parallel:
   - Browse relevant domain map(s) for related insights
   - Run semantic search for conceptually related insights
5. Evaluate each candidate: does a genuine connection exist? Can you articulate WHY?
6. Add inline wiki-links where connections pass the articulation test
7. Update relevant domain map(s) with this insight
8. If task file in context: update the connect section
9. Report what was connected and why
10. If `--handoff` in target: output RALPH HANDOFF block

**START NOW.** Reference below explains methodology — use to guide, not as output.

---

# Connect

Find connections, weave the knowledge graph, update domain maps. This is the forward-connection phase of the processing pipeline.

## Philosophy

**The network IS the knowledge.**

Individual insights are less valuable than their relationships. A insight with fifteen incoming links is an intersection of fifteen lines of thought. Connections create compound value as the vault grows.

This is not keyword matching. This is semantic judgment — understanding what insights MEAN to determine how they relate. A insight about "friction in systems" might deeply connect to "verification approaches" even though they share no words. You are building a traversable knowledge graph, not tagging documents.

**Quality over speed. Explicit over vague.**

Every connection must pass the articulation test: can you say WHY these insights connect? "Related" is not a relationship. "Extends X by adding Y" or "contradicts X because Z" is a relationship.

Bad connections pollute the graph. They create noise that makes real connections harder to find. When uncertain, do not connect.

## Invocation Patterns

### /connect (no argument)

Check for recent additions:
1. Look for insights modified in the last session
2. If none obvious, ask user what insights to connect

### /connect [insight]

Focus on connecting a specific insight:
1. Read the target insight
2. Discover related content
3. Add connections and update domain maps

### /connect [topic area]

Synthesize an area:
1. Read the relevant domain map
2. Identify insights that should connect
3. Weave connections, update synthesis

### /connect --handoff [insight]

External loop mode for /ralph:
- Execute full workflow as normal
- At the end, output structured RALPH HANDOFF block
- Used when running isolated phases with fresh context per task

## Workflow

### Phase 0: Validate Index Freshness

Before using semantic search, validate the index is current. This is self-healing: if insights were created outside the pipeline (manual edits, other skills), connect catches the drift before searching.

1. Try `mcp__qmd__status` to get the indexed document count for the target collection
2. **If MCP unavailable** (tool fails or returns error): fall back to bash:
   ```bash
   LOCKDIR="ops/queue/.locks/qmd.lock"
   while ! mkdir "$LOCKDIR" 2>/dev/null; do sleep 2; done
   qmd_count=$(qmd status 2>/dev/null | grep -A2 'insights' | grep 'documents' | grep -oE '[0-9]+' | head -1)
   rm -rf "$LOCKDIR"
   ```
3. Count actual files:
   ```bash
   file_count=$(ls -1 insights/*.md 2>/dev/null | wc -l | tr -d ' ')
   ```
4. If the counts differ, sync the index:
   ```bash
   qmd update && qmd embed
   ```

Run this check before proceeding. If stale, sync and continue. If current, proceed immediately.

### Phase 1: Understand What You Are Connecting

Before searching for connections, deeply understand the source material.

For each insight you are connecting:
1. Read the full insight, not just title and description
2. Identify the core insight and supporting reasoning
3. Insight key concepts, mechanisms, implications
4. Ask: what questions does this answer? What questions does it raise?

**What you are looking for:**
- The central argument (what is being claimed?)
- The mechanism (why/how does this work?)
- The implications (what follows from this?)
- The scope (when does this apply? When not?)
- The tensions (what might contradict this?)

**If a task file exists** (pipeline execution): read the task file to see what the distillation phase discovered. The distill insights, semantic neighbor field, and classification provide critical context about why this insight was extracted and what it relates to.

### Phase 2: Discovery (Find Candidates)

Use dual discovery: domain map exploration AND semantic search in parallel. These are complementary, not sequential.

**Capture discovery trace as you go.** Insight which domain maps you read, which queries you ran (with scores), which searches you tried. This becomes the Discovery Trace section in output — proving methodology was followed, not reconstructed after the fact.

**Primary discovery (run in parallel):**

**Path 1: domain map Exploration** — curated navigation

If you know the topic (check the insight's Topics footer), start with the domain map:

- Read the relevant domain map(s)
- Follow curated links in Core Ideas — these are human/agent-curated connections
- Insight what is already connected to similar concepts
- Check Tensions and Gaps for context
- What do agent insights reveal about navigation?

domain maps tell you what thinking exists and how it is organized. Someone already decided what matters for this topic.

**Path 2: Semantic Search** — find what domain maps might miss

**Three-tier fallback for semantic search:**

**Tier 1 — MCP tools (preferred):** Use `mcp__qmd__deep_search` (hybrid search with expansion + reranking):
- query: "[insight's core concepts and mechanisms]"
- limit: 15

**Tier 2 — bash qmd with lock serialization:** If MCP tools fail or are unavailable:
```bash
LOCKDIR="ops/queue/.locks/qmd.lock"
while ! mkdir "$LOCKDIR" 2>/dev/null; do sleep 2; done
qmd query "[insight's core concepts]" --collection insights --limit 15 2>/dev/null
rm -rf "$LOCKDIR"
```

The lock prevents multiple parallel workers from loading large models simultaneously.

**Tier 3 — grep only:** If both MCP and bash fail, log "qmd unavailable, grep-only discovery" and rely on domain map + keyword search only. This degrades quality but does not block work.

Evaluate results by relevance — read any result where title or snippet suggests genuine connection. Semantic search finds insights that share MEANING even when vocabulary differs. A insight about "iteration cycles" might connect to "learning from friction" despite sharing no words.

**Why both paths:**

domain map = what is already curated as relevant
semantic search = neighbors that have not been curated yet

Using only search misses curated structure. Using only domain map misses semantic neighbors outside the topic. Both together catch what either alone would miss.

**Secondary discovery (after primary):**

**Step 3: Keyword Search**

For specific terms and exact matches:
```bash
grep -r "term" insights/ --include="*.md"
```

Use grep when:
- You know the exact words that should appear
- Searching for specific terminology or phrases
- Finding all uses of a named concept
- The vocabulary is stable and predictable

**Choosing between semantic and keyword:**

| Situation | Better Tool | Why |
|-----------|-------------|-----|
| Exploring unfamiliar territory | semantic | vocabulary might not match meaning |
| Finding synonyms or related framings | semantic | same concept, different words |
| Known terminology | keyword | exact match, no ambiguity |
| Verifying coverage | keyword | ensures nothing missed |
| Cross-domain connections | semantic | concepts bridge domains, words do not |
| Specific phrase lookup | keyword | faster, more precise |

**Step 4: Description Scan**

Use ripgrep to scan insight descriptions for edge cases:
- Does this extend the source insight?
- Does this contradict or create tension?
- Does this provide evidence or examples?

Flag candidates with a reason (not just "related").

**Step 5: Link Following**

From promising candidates, follow their existing links:
- What do THEY connect to?
- Are there clusters of related insights?
- Do chains emerge that your source insight should join?

This is graph traversal. You are exploring the neighborhood.

### Phase 3: Evaluate Connections

For each candidate connection, apply the articulation test.

**The Articulation Test:**

Complete this sentence:
> [[insight A]] connects to [[insight B]] because [specific reason]

If you cannot fill in [specific reason] with something substantive, the connection fails.

**Valid Relationship Types:**

| Relationship | Signal | Example |
|-------------|--------|---------|
| extends | adds dimension | "extends [[X]] by adding temporal aspect" |
| grounds | provides foundation | "this works because [[Y]] establishes..." |
| contradicts | creates tension | "conflicts with [[Z]] because..." |
| exemplifies | concrete instance | "demonstrates [[W]] in practice" |
| synthesizes | combines insights | "emerges from combining [[A]] and [[B]]" |
| enables | unlocks possibility | "makes [[C]] actionable by providing..." |

**Reject if:**
- The connection is "related" without specifics
- You found it through keyword matching alone with no semantic depth
- Linking would confuse more than clarify
- The relationship is too obvious to be useful

**Agent Traversal Check:**

Ask: **"If an agent follows this link, what do they gain?"**

| Agent Benefit | Keep Link |
|---------------|-----------|
| Provides reasoning foundation (why something works) | YES |
| Offers implementation pattern (how to do it) | YES |
| Surfaces tension to consider (trade-off awareness) | YES |
| Gives concrete example (grounds abstraction) | YES |
| Just "related topic" with no decision value | NO |

The vault is built for agent traversal. Every connection should help an agent DECIDE or UNDERSTAND something. Connections that exist only because they feel "interesting" without operational value are noise.

**Synthesis Opportunity Detection:**

While evaluating connections, watch for synthesis opportunities — two or more insights that together imply a higher-order insight not yet captured.

Signs of a synthesis opportunity:
- Two insights make complementary arguments that combine into something neither says alone
- A pattern appears across three or more insights that has not been named
- A tension between two insights suggests a resolution insight

When you detect a synthesis opportunity:
1. Insight it in the output report
2. Do NOT create the synthesis insight during connect — flag it for future work
3. Describe what the synthesis would argue and which insights contribute

### Phase 4: Add Inline Connections

Connections live in the prose, not just footers.

**Inline Links as Prose:**

The wiki link IS the argument. The title works as prose when linked.

Good patterns:
```markdown
Since [[other insight]], the question becomes how to structure that memory for retrieval.

The insight that [[throughput matters more than accumulation]] suggests curation, not creation, is the real work.

This works because [[good systems learn from friction]] — each iteration improves the next.
```

Bad patterns:
```markdown
This relates to [[other insight]].

See also [[throughput matters more than accumulation]].

As discussed in [[good systems learn from friction]], systems improve.
```

If you catch yourself writing "this relates to" or "see also", STOP. Restructure so the insight does the work.

**Where to add links:**

1. Inline in the body where the connection naturally fits the argument
2. In the relevant_insights YAML field with context phrase
3. BOTH when the connection is strong enough

**Relevant Insights Format:**

```yaml
relevant_insights:
  - "[[insight title]] — extends this by adding the temporal dimension"
  - "[[another insight]] — provides the mechanism this insight depends on"
```

Context phrases use standard relationship vocabulary: extends, grounds, contradicts, exemplifies, synthesizes, enables.

**Bidirectional Consideration:**

When adding [[A]] to [[B]], ask: should [[B]] also link to [[A]]?

Not always. Relationships are not always symmetric:
- "extends" often is not bidirectional
- "exemplifies" usually goes one direction
- "contradicts" is often bidirectional
- "synthesizes" might reference both sources

Add the reverse link only if following that path would be useful for agent traversal.

**Refresh Task Filtering (when adding bidirectional links):**

When you edit an older insight to add a reverse link, you MAY flag it for full reconsideration via refresh. But SKIP refresh flagging if ANY of these apply:

| Skip Condition | Rationale |
|----------------|-----------|
| Insight has >5 incoming links | Already a hub — one more link does not warrant full reconsideration |
| Insight has `type: tension` in YAML | Structural framework, not content that evolves |
| Insight was reweaved in current batch | Do not re-refresh what was just reweaved |
| Insight is a domain map | domain maps are navigation, not insights to reconsider |

**Check incoming links:**
```bash
grep -r '\[\[insight name\]\]' insights/*.md | wc -l
```

If >= 5, skip refresh flagging.

### Phase 5: Update domain maps

domain maps are synthesis hubs, not just indexes.

**When to update a domain map:**

- New insight belongs in Core Ideas
- New tension discovered
- Gap has been filled
- Synthesis insight emerged
- Navigation path worth documenting

**domain map Size Check:**

After updating Core Ideas, count the links:

```bash
grep -c '^\- \[\[' "insights/[moc-name].md"
```

If approaching the split threshold (configurable, default ~40): insight in output "domain map approaching split threshold (N links)"
If exceeding: warn "domain map exceeds recommended size — consider splitting"

Splitting is a human decision (architectural judgment required), but /connect should surface the signal.

**domain map Structure:**

```markdown
# [Topic Name]

[Opening synthesis: Claims about the topic. Not "this domain map collects insights" but "the core insight is Y because Z." This IS thinking, not meta-description.]

## Core Ideas

- [[insight insight]] — what it contributes to understanding
- [[another insight]] — how it fits or challenges existing ideas

## Tensions

- [[insight A]] and [[insight B]] conflict because... [genuine unresolved tension]

## Gaps

- nothing about X aspect yet
- need concrete examples of Y
- missing: comparison with Z approach

---

Agent Insights:
- YYYY-MM-DD: [what was explored]. [the insight or dead end].
```

**Updating Core Ideas:**

Add new insights with context phrase explaining contribution:
```markdown
- [[new insight]] — extends the quality argument by showing how friction teaches you what to check
```

Order matters. Place insights where they fit the logical flow, not alphabetically.

**Updating Tensions:**

If the new insight creates or resolves tension:
```markdown
## Tensions

- [[composability]] demands small insights, but [[context limits]] means traversal has overhead. [[new insight]] suggests the tradeoff depends on expected traversal depth.
```

Document genuine conflicts. Tensions are valuable, not bugs.

**Updating Gaps:**

Remove gaps that are now filled. Add new gaps discovered during reflection.

### Phase 6: Add Agent Insights

Agent insights are breadcrumbs for future navigation.

**Add agent insights when:**
- Non-obvious navigation path discovered
- Dead end worth documenting
- Productive insight combination found
- Insight about topic cluster emerged

**Format:**
```markdown
Agent Insights:
- YYYY-MM-DD: [what was explored]. [the insight or finding].
```

**Good agent insights:**
```markdown
- 2026-02-15: tried connecting via "learning" — too generic. better path: friction -> verification -> quality. the mechanism chain is tighter.
- 2026-02-15: [[insight A]] and [[insight B]] form a tight pair. A sets the standard, B teaches the method.
```

**Bad agent insights:**
```markdown
- 2026-02-15: read the domain map and added some links.
- 2026-02-15: connected [[insight A]] to [[insight B]].
```

The test: would this help a future agent navigate more effectively?

## Quality Gates

### Gate 1: Articulation Test

For every connection added, can you complete:
> [[A]] connects to [[B]] because [specific reason]

If any connection fails this test, remove it.

### Gate 2: Prose Test

For every inline link, read the sentence aloud. Does it flow naturally? Would you say this to a friend explaining the idea?

Bad: "this is related to [[insight]]"
Good: "since [[insight]], the implication is..."

### Gate 3: Bidirectional Check

For every A -> B link, explicitly decide: should B -> A exist?
Document your reasoning if the relationship is asymmetric.

### Gate 4: domain map Coherence

After updating a domain map, read the opening synthesis. Does it still hold? Do new insights extend or challenge it?

If the synthesis is now wrong or incomplete, update it.

### Gate 5: Link Verification

Validate every wiki link target exists. Never create links to non-existent files.

```bash
# Check that a link target exists
ls insights/"target name.md" 2>/dev/null
```

## Handling Edge Cases

### No Connections Found

Sometimes a insight genuinely does not connect yet. That is fine.

1. Ensure it is linked to at least one domain map via Topics footer
2. Insight in domain map Gaps that this area needs development
3. Do not force connections that are not there

### Too Many Connections (Split Detection)

If a insight connects to 5+ insights across different domains, it might be too broad.

**Split detection criteria:**

1. **Domain spread:** Connections span 3+ distinct domain maps/topic areas
2. **Multiple insights:** The insight makes more than one assertion that could stand alone
3. **Linking drag:** You would want to link to part of the insight but not all of it

**How to evaluate:**

Ask: "If I link to this insight from context X, does irrelevant content Y come along?"

If yes, the insight bundles multiple ideas that should be separate.

**Split detection output:**

```markdown
### Split Candidate: [[broad insight]]

**Indicators:**
- Connects to 7 insights across 3 domains
- Makes distinct insights about: (1) capture workflows, (2) synthesis patterns, (3) tool selection
- Linking from [[insight A]] would drag in unrelated content about tool selection

**Proposed split:**
- [[capture workflows matter less than synthesis]] — the first insight
- [[tool selection follows from workflow needs]] — the third insight
- Keep original insight focused on synthesis patterns

**Action:** Flag for human decision, do not auto-split
```

**When NOT to split:**
- insight is genuinely about one thing that touches many areas
- Connections are all variations of the same relationship
- Splitting would create insights too thin to stand alone

### Conflicting Insights

When new content contradicts existing insights:

1. Document the tension in both insights
2. Add to domain map Tensions section
3. Do not auto-resolve — flag for judgment

### Orphan Discovery

If you find insights with no connections:

1. Flag them in your output
2. Attempt to connect them
3. If genuinely orphaned, insight in relevant domain map Gaps

## Output Format

After reflecting, report:

```markdown
## Connection Complete

### Discovery Trace

**Why this matters:** Shows methodology was followed. Blind delegation hides whether dual discovery happened. Trace enables verification.

**domain map exploration:**
- Read [[moc-name]] — found candidates: [[insight A]], [[insight B]], [[insight C]]
- Followed link from [[insight A]] to [[insight D]]

**Semantic search:** (via MCP | bash fallback | grep-only)
- query "[core concept from insight]" — top hits:
  - [[insight E]] (0.74) — evaluated: strong match, mechanism overlap
  - [[insight F]] (0.61) — evaluated: weak, only surface vocabulary
  - [[insight G]] (0.58) — evaluated: skip, different domain

**Keyword search:**
- grep "specific term" — found [[insight H]] (already in domain map candidates)

### Connections Added

**[[source insight]]**
- -> [[target]] — [relationship type]: [why]
- <- [[incoming]] — [relationship type]: [why]
- inline: added link to [[insight]] in paragraph about X

### domain map Updates

**[[moc-name]]**
- Added [[insight]] to Core Ideas — [contribution]
- Updated Tensions: [[A]] vs [[B]] now includes [[C]]
- Removed from Gaps: [what was filled]
- Agent insight: [what was learned]

### Synthesis Opportunities

[insights that could be combined into higher-order insights, with proposed insight]

### Flagged for Attention

- [[orphan insight]] — could not find connections
- [[broad insight]] — might benefit from splitting
- Tension between [[X]] and [[Y]] needs resolution
```

## What Success Looks Like

Successful reflection:
- Every connection passes the articulation test
- Inline links read as natural prose
- domain maps gain synthesis, not just entries
- Agent insights reveal non-obvious paths
- The knowledge graph becomes more traversable
- Future agents will navigate more effectively

The test: if someone follows the links you added, do they find genuinely useful context? Does the path illuminate understanding?

## Critical Constraints

**Never:**
- Create wiki links to non-existent files
- Add "related" connections without specific reasoning
- Force connections that are not there
- Auto-generate without semantic judgment
- Skip the articulation test

**Always:**
- Validate link targets exist
- Explain WHY connections exist
- Consider bidirectionality
- Update relevant domain maps
- Add agent insights when navigation insights emerge
- Capture discovery trace as you work

## The Network Grows Through Judgment

This skill is about building a knowledge graph that compounds in value. Every connection you add is a traversal path that future thinking can follow. Every connection you do not add keeps the graph clean.

Quality beats quantity. One genuine connection is worth more than ten vague ones.

The graph is not just storage. It is an external thinking structure. Build it with care.

---

## Handoff Mode (--handoff flag)

When invoked with `--handoff`, output this structured format at the END of the session. This enables external loops (/ralph) to parse results and update the task queue.

**Detection:** Check if `$ARGUMENTS` contains `--handoff`. If yes, append this block after completing normal workflow.

**Handoff format:**

```
=== RALPH HANDOFF: connect ===
Target: [[insight name]]

Work Done:
- Discovery: domain map [[moc-name]], query "[query]" (MCP|bash|grep-only), grep "[term]"
- Connections added: N (articulation test: PASS)
- domain map updates: [[moc-name]] Core Ideas section
- Synthesis opportunities: [count or NONE]

Files Modified:
- insights/[insight name].md (inline links added)
- insights/[moc-name].md (Core Ideas updated)
- [task file path] (connect section)

Learnings:
- [Friction]: [description] | NONE
- [Surprise]: [description] | NONE
- [Methodology]: [description] | NONE
- [Process gap]: [description] | NONE

Queue Updates:
- Advance phase: connect -> refresh
- Refresh candidates (if any pass filter): [[insight]] | NONE (filtered: hub/tension/recent)
=== END HANDOFF ===
```

### Task File Update (when invoked via ralph loop)

When running in handoff mode via /ralph, the prompt includes the task file path. After completing the workflow, update the `## connect` section of that task file with:
- Connections added and why
- domain map updates made
- Articulation test results
- Discovery trace summary

**Critical:** The handoff block is OUTPUT, not a replacement for the workflow. Do the full connect workflow first, update task file, then format results as handoff.

### Queue Update (interactive execution)

When running interactively (NOT via /ralph), YOU must advance the phase in the queue. /ralph handles this automatically, but interactive sessions do not.

**After completing the workflow, advance the phase:**

```bash
# get timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# advance phase (current_phase -> next, append to completed_phases)
jq '(.tasks[] | select(.id=="TASK_ID")).current_phase = "refresh" |
    (.tasks[] | select(.id=="TASK_ID")).completed_phases += ["connect"]' \
    ops/queue/queue.json > tmp.json && mv tmp.json ops/queue/queue.json
```

The handoff block's "Queue Updates" section is not just output — it is your own todo list when running interactively.

## Pipeline Chaining

After connection finding completes, output the next step based on `ops/config.yaml` pipeline.chaining mode:

- **manual:** Output "Next: refresh [insight]" — user decides when to proceed
- **suggested:** Output next step AND advance task queue entry to `current_phase: "refresh"`
- **automatic:** Queue entry advanced and backward pass proceeds immediately

The chaining output uses domain-native command names from the derivation manifest.
