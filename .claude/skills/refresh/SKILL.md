---
name: refresh
description: Update old insights with new connections. The backward pass that /connect doesn't do. Revisit existing insights that predate newer related content, add connections, sharpen insights, consider splits. Triggers on "/refresh", "/refresh [insight]", "update old insights", "backward connections", "revisit insights".
user-invocable: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, mcp__qmd__search, mcp__qmd__vector_search, mcp__qmd__deep_search, mcp__qmd__status
context: fork
---

## Runtime Configuration (Step 0 — before any processing)

Read these files to configure domain-specific behavior:

1. **`ops/derivation-manifest.md`** — vocabulary mapping, platform hints
   - Use `vocabulary.insights` for the insights folder name
   - Use `vocabulary.insight` / `vocabulary.note_plural` for insight type references
   - Use `vocabulary.refresh` for the process verb in output
   - Use `vocabulary.topic_map` / `vocabulary.topic_map_plural` for domain map references
   - Use `vocabulary.cmd_validate` for the next-phase suggestion

2. **`ops/config.yaml`** — processing depth, pipeline chaining
   - `processing.depth`: deep | standard | quick
   - `processing.chaining`: manual | suggested | automatic
   - `processing.refresh.scope`: related | broad | full

If these files don't exist, use universal defaults.

**Processing depth adaptation:**

| Depth | Refresh Behavior |
|-------|-----------------|
| deep | Full reconsideration. Search extensively for newer related insights. Consider splits, rewrites, challenges. Evaluate insight sharpening. Multiple search passes. |
| standard | Balanced review. Search semantic neighbors and same-domain map insights. Add connections, sharpen if needed. |
| quick | Minimal backward pass. Add obvious connections only. No rewrites or splits. |

**Refresh scope:**

| Scope | Behavior |
|-------|----------|
| related | Search insights directly related to the target (same domain map, semantic neighbors) |
| broad | Search across all domain maps and semantic space for potential connections |
| full | Complete review including potential splits, rewrites, and insight challenges |

## EXECUTE NOW

**Target: $ARGUMENTS**

Parse immediately:
- If target contains `[[insight name]]` or insight name: refresh that specific insight
- If target contains `--handoff`: output RALPH HANDOFF block at end
- If target is empty: find insights that most need reweaving (oldest, sparsest, most outdated)
- If target is "recent" or "--since Nd": refresh insights not touched in N days
- If target is "sparse": find insights with fewest connections

**Execute these steps:**

1. **Read the target insight fully** — understand its current insight, connections, and age
2. **Ask the refresh question:** "If I wrote this insight today, with everything I now know, what would be different?"
3. **If a task file exists** (pipeline execution): read it to see what /connect discovered. The Connect section shows which connections were just added and which domain maps were updated — this is your starting context for the backward pass.
4. **Search for newer related insights** — use dual discovery (semantic search + domain map browsing) to find insights created AFTER the target that should connect
5. **Evaluate what needs changing:**
   - Add connections to newer insights that did not exist when this was written
   - Sharpen the insight if understanding has evolved
   - Consider splitting if the insight now covers what should be separate ideas
   - Challenge the insight if new evidence contradicts it
   - Rewrite prose if understanding is deeper now
6. **Make the changes** — edit the insight with new connections (inline links with context), improved prose, sharper insight if needed
7. **Update domain maps** — if the insight's topic membership changed, update relevant domain maps
8. **If task file exists:** update the refresh section
9. **Report** — structured summary of what changed and why
10. If `--handoff` in target: output RALPH HANDOFF block

**START NOW.** Reference below explains methodology — use to guide, not as output.

---

# Refresh

Revisit old insights with everything you know today. insights are living documents — they grow, get rewritten, split apart, sharpen their insights. This is the backward pass that keeps the network alive.

## Philosophy

**insights are living documents, not finished artifacts.**

A insight written last month was written with last month's understanding. Since then:
- New insights exist that relate to it
- Understanding of the topic deepened
- The insight might need sharpening or challenging
- What was one idea might now be three
- Connections that were not obvious then are obvious now

Reweaving is not just "add backward links." It is completely reconsidering the insight based on current knowledge. Ask: **"If I wrote this insight today, what would be different?"**

> "The insight you wrote yesterday is a hypothesis. Today's knowledge is the test."

## What Reweaving Can Do

| Action | When to Do It |
|--------|---------------|
| **Add connections** | Newer insights exist that should link here |
| **Rewrite content** | Understanding evolved, prose should connect it |
| **Sharpen the insight** | Title is too vague to be useful |
| **Split the insight** | Multiple insights bundled together |
| **Challenge the insight** | New evidence contradicts the original |
| **Improve the description** | Better framing emerged |
| **Update examples** | Better illustrations exist now |

Reweaving is NOT just Phase 4 of /connect applied backward. It is a full reconsideration.

## Invocation Patterns

### /refresh [[insight]]

Fully reconsider a specific insight against current knowledge.

### /refresh (no argument)

Scan for candidates needing reweaving, present ranked list.

### /refresh --sparse

Process insights flagged as sparse by /health.

### /refresh --since Nd

Refresh all insights not updated in N days.

**How to find candidates:**
```bash
# Find insights not modified in 30 days
find insights/ -name "*.md" -mtime +30 -type f
```

### /refresh --handoff [[insight]]

External loop mode for /ralph:
- Execute full workflow as normal
- At the end, output structured RALPH HANDOFF block
- Used when running isolated phases with fresh context per task

---

## Workflow

### Phase 1: Understand the insight as It Exists

Read the target insight completely. Understand:
- What insight does it make?
- What reasoning supports the insight?
- What connections does it have?
- When was it written/last modified?
- What was the context when it was created?

**Also read the task file** if one exists (pipeline execution). The task file's Connect section shows:
- What connections /connect just added
- Which domain maps were updated
- What synthesis opportunities were flagged
- What the discovery trace looked like

This context prevents redundant work — you know what /connect already found, so you can focus on what it missed or what needs deeper reconsideration.

### Phase 2: Gather Current Knowledge (Dual Discovery)

Use the same dual discovery pattern as /connect — domain map exploration AND semantic search in parallel.

**Path 1: domain map Exploration** — curated navigation

From the insight's Topics footer, identify which domain map(s) it belongs to:
- Read the relevant domain map(s)
- What synthesis exists that might affect this insight?
- What newer insights in Core Ideas should this insight reference?
- What tensions involve this insight?

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

Evaluate results by relevance — read any result where title or snippet suggests genuine connection.

**Also check:**
- Backlinks — what insights already reference this one? Do they suggest the target should cite back?

```bash
grep -rl '\[\[target insight title\]\]' insights/ --include="*.md"
```

**Key question:** What do I know today that I did not know when this insight was written?

### Phase 3: Evaluate the Claim

**Does the original insight still hold?**

| Finding | Action |
|---------|--------|
| Claim holds, evidence strengthened | Add supporting connections |
| Claim holds but framing is weak | Rewrite for clarity |
| Claim is too vague | Sharpen to be more specific |
| Claim is too broad | Split into focused insights |
| Claim is partially wrong | Revise with nuance |
| Claim is contradicted | Flag tension, propose revision |

**The Sharpening Test:**

Read the title. Ask: could someone disagree with this specific insight?
- If yes, the insight is sharp enough
- If no, it is too vague and needs sharpening

Example:
- Vague: "context matters" (who would disagree?)
- Sharp: "explicit context beats automatic memory" (arguable position)

**The Split Test:**

Does this insight make multiple insights that could stand alone?
- If the insight connects to 5+ topics across different domains, it probably needs splitting
- If you would want to link to part of it but not all, it is a split candidate

### Phase 4: Evaluate Connections

**Backward connections (what this insight should reference):**

For each newer insight, ask:
- Does it extend this insight's argument?
- Does it provide evidence or examples?
- Does it share mechanisms?
- Does it create tension worth acknowledging?
- Would referencing it strengthen the reasoning?

**Forward connections (what should reference this insight):**

Check newer insights that SHOULD link here but do not:
- Do they make arguments that rely on this insight?
- Would following this link provide useful context?

**Agent Traversal Check (apply to all connections):**

Ask: **"If an agent follows this link during traversal, what decision or understanding does it enable?"**

Connections exist to serve agent navigation. Adding a link because content is "related" without operational value creates noise. Every backward or forward connection should answer:
- Does this help an agent understand WHY something works?
- Does this help an agent decide HOW to implement something?
- Does this surface a tension the agent should consider?

Reject connections that are merely "interesting" without agent utility.

**Articulation requirement:**

Every new connection must articulate WHY:
- "extends this by adding the temporal dimension"
- "provides evidence that supports this insight"
- "contradicts this — needs resolution"

Never: "related" or "see also"

### Phase 5: Apply Changes

**For pipeline execution (--handoff mode):** Apply changes directly. The pipeline needs to proceed without waiting for approval.

**For interactive execution (no --handoff):** Present the refresh proposal first, then apply after approval.

**Refresh proposal format (interactive only):**

```markdown
## Refresh Proposal: [[target insight]]

**Last modified:** YYYY-MM-DD
**Current knowledge evaluated:** N newer insights, M backlinks

### Claim Assessment

[Does the insight hold? Need sharpening? Splitting? Revision?]

### Proposed Changes

**1. [change type]: [description]**

Current:
> [existing text]

Proposed:
> [new text]

Rationale: [why this change]

**2. [change type]: [description]**
...

### Connections to Add

- [[newer insight A]] — [relationship]: [specific reason]
- [[newer insight B]] — [relationship]: [specific reason]

### Connections to Validate (other insights should link here)

- [[insight X]] might benefit from referencing this because...

### Not Changing

- [What was considered but rejected, and why]

---

Apply these changes? (yes/no/modify)
```

**When applying changes:**

1. Make changes atomically
2. Preserve existing valid content
3. Maintain prose flow — new links should read naturally inline
4. Validate all link targets exist
5. Update description if insight changed

---

## The Five Refresh Actions

### 1. Add Connections

The simplest action. Newer insights exist that should be referenced.

**Inline connections (preferred):**
```markdown
# before
The constraint shifts from capture to curation.

# after
The constraint shifts from capture to curation, and since [[throughput matters more than accumulation]], the question becomes who does the selecting.
```

**Footer connections:**
```yaml
relevant_insights:
  - "[[newer insight]] — extends this by adding temporal dimension"
```

### 2. Rewrite Content

Understanding evolved. The prose should connect current thinking, not historical thinking.

**When to rewrite:**
- Reasoning is clearer now
- Better examples exist
- Phrasing was awkward
- Important nuance was missing

**How to rewrite:**
- Preserve the core insight (unless challenging it)
- Improve the path to the conclusion
- Incorporate new connections as prose
- Maintain the insight's voice

### 3. Sharpen the Claim

Vague insights cannot be built on. Sharpen means making the insight more specific and arguable.

**Sharpening patterns:**

| Vague | Sharp |
|-------|-------|
| "X is important" | "X matters because Y, which enables Z" |
| "consider doing X" | "X works when [condition] because [mechanism]" |
| "there are tradeoffs" | "[specific tradeoff]: gaining X costs Y" |

**When sharpening, also update:**
- Title (if insight changed) — use the rename script if available
- Description (must match new insight)
- Body (reasoning must support sharpened insight)

### 4. Split the insight

One insight became multiple ideas over time. Splitting creates focused, composable pieces.

**Split indicators:**
- Connects to 5+ topics across different domains
- Makes multiple distinct insights
- You would want to link to part but not all
- Different sections could be referenced independently

**Split process:**

1. Identify the distinct insights
2. Create new insights for each insight
3. Each new insight gets:
   - Focused title (the insight)
   - Own description
   - Relevant subset of content
   - Appropriate connections
4. Original insight either:
   - Becomes a synthesis linking to the splits
   - Gets archived if splits fully replace it
   - Retains one insight and links to others

**Example split:**

Original: "knowledge systems need both structure and flexibility"

Splits:
- [[structure enables retrieval at scale]]
- [[flexibility allows organic growth]]
- [[structure and flexibility create tension]] (links to both)

**When NOT to split:**
- insight is genuinely about one thing that touches many areas
- Connections are all variations of the same relationship
- Splitting would create insights too thin to stand alone

### 5. Challenge the Claim

New evidence contradicts the original. Do not silently "fix" — acknowledge the evolution.

**Challenge patterns:**

```markdown
# if partially wrong
The original insight was [X]. However, [[newer evidence]] suggests [Y]. The refined insight is [Z].

# if tension exists
This argues [X]. But [[contradicting insight]] argues [Y]. The tension remains unresolved — possibly [X] applies in context A while [Y] applies in context B.

# if significantly wrong
This insight originally claimed [X]. Based on [[evidence]], the insight is revised: [new insight].
```

**Always log challenges:** When a insight is challenged or revised, this is a significant event. Insight it in the task file Refresh section with the original insight, the new evidence, and the revised position.

---

## Enrichment-Triggered Actions

When processing a insight that came through the enrichment pipeline, check the task file for `post_enrich_action` signals. These were surfaced by /enrich and need execution:

### title-sharpen

The enrich phase determined the insight's title is too vague after content integration.

1. Read `post_enrich_detail` for the recommended new title
2. Evaluate: is the suggested title actually better? (sharper insight, more specific, still composable as prose)
3. If yes and a rename script exists: use it to rename. Otherwise rename manually and update all wiki links.
4. Update the insight's description to match the new title
5. Log the rename in the task file Refresh section

### split-recommended

The enrich phase determined the insight now covers multiple distinct insights.

1. Read `post_enrich_detail` for the split recommendation
2. Evaluate: does splitting genuinely improve the vault? (each piece must stand alone)
3. If yes:
   - Create new insight files for each split insight
   - Move relevant content from original to splits
   - Update original to either link to splits or retain one insight
   - Create queue entries for the new insights starting at the connect phase
4. Log the split in the task file Refresh section

### merge-candidate

The enrich phase determined this insight substantially overlaps with another.

**Do NOT auto-merge or auto-delete.** This requires human judgment.

1. Log the merge recommendation in the task file Refresh section
2. Insight which insights overlap and why
3. The final report surfaces this for human review

---

## Quality Gates

### Gate 1: Articulation Test

Every change must be articulable. "I am adding this because..." with a specific reason.

### Gate 2: Improvement Test

After changes, is the insight better? More useful? More connected? More accurate?

If you cannot confidently say yes, do not make the change.

### Gate 3: Coherence Test

After changes, does the insight still cohere as a single focused piece? Or did you accidentally make it broader?

### Gate 4: Network Test

Do the changes improve the network? More traversal paths? Better paths?

### Gate 5: When NOT to Change

- The insight is accurate, well-connected, and recent — leave it alone
- The "improvement" would just be cosmetic rewording — do not churn
- The insight is a historical record — these evolve through status changes, not rewrites

---

## Output Format

```markdown
## Refresh Complete: [[target insight]]

### Changes Applied

| Type | Description |
|------|-------------|
| connection | added [[insight A]] inline, [[insight B]] to footer |
| rewrite | clarified reasoning in paragraph 2 |
| sharpen | title unchanged, description updated |

### Claim Status

[unchanged | sharpened | split | challenged]

### Network Effect

- Outgoing links: 3 -> 5
- This insight now bridges [[domain A]] and [[domain B]]

### Cascade Recommendations

- [[related insight]] might benefit from refresh (similar vintage)
- domain map [[topic]] should be updated to connect changes

### Observations

[Patterns noticed, insights for future]
```

---

## What Success Looks Like

Successful reweaving:
- insight reflects current understanding, not historical understanding
- Claim is sharp enough to disagree with
- Connections exist to relevant newer content
- insight participates actively in the network
- Someone reading it today gets the best version

The test: **if this insight were written today with everything you know, would it be meaningfully different?** If yes and you did not change it, reweaving failed.

---

## Critical Constraints

**Never:**
- Silently change insights without acknowledging evolution
- Split insights into pieces too thin to stand alone
- Add connections without articulating why
- Rewrite voice/style (preserve the insight's character)
- Make changes without approval in interactive mode
- Create wiki links to non-existent files

**Always:**
- Present proposals before editing (interactive mode)
- Explain rationale for each change
- Preserve what is still valid
- Log significant insight changes
- Validate link targets exist

---

## The Network Lives Through Evolution

insights written yesterday do not know about today. insights written with old understanding do not connect new understanding. Without reweaving, the vault becomes a graveyard of outdated thinking that happens to be organized.

Reweaving is how knowledge stays alive. Not just connecting, but questioning, sharpening, splitting, rewriting. Every insight is a hypothesis. Every refresh is a test.

The network compounds through evolution, not just accumulation.

---

## Handoff Mode (--handoff flag)

When invoked with `--handoff`, output this structured format at the END of the session. This enables external loops (/ralph) to parse results and update the task queue.

**Detection:** Check if `$ARGUMENTS` contains `--handoff`. If yes, append this block after completing normal workflow.

**Handoff format:**

```
=== RALPH HANDOFF: refresh ===
Target: [[insight name]]

Work Done:
- Older insights updated: N
- Claim status: unchanged | sharpened | challenged | split
- Network effect: M new traversal paths

Files Modified:
- insights/[older insight 1].md (inline link added)
- insights/[older insight 2].md (footer connection added)
- [task file path] (refresh section)

Learnings:
- [Friction]: [description] | NONE
- [Surprise]: [description] | NONE
- [Methodology]: [description] | NONE
- [Process gap]: [description] | NONE

Queue Updates:
- Advance phase: refresh -> audit
=== END HANDOFF ===
```

### Task File Update (when invoked via ralph loop)

When running in handoff mode via /ralph, the prompt includes the task file path. After completing the workflow, update the `## refresh` section of that task file with:
- Older insights updated and why
- Claim status (unchanged/sharpened/challenged/split)
- Network effect summary

**Critical:** The handoff block is OUTPUT, not a replacement for the workflow. Do the full refresh workflow first, update task file, then format results as handoff.

### Queue Update (interactive execution)

When running interactively (NOT via /ralph), YOU must advance the phase in the queue. /ralph handles this automatically, but interactive sessions do not.

**After completing the workflow, advance the phase:**

```bash
# get timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# advance phase (current_phase -> next, append to completed_phases)
# NEXT_PHASE is the phase after refresh in phase_order (i.e., validate)
jq '(.tasks[] | select(.id=="TASK_ID")).current_phase = "audit" |
    (.tasks[] | select(.id=="TASK_ID")).completed_phases += ["refresh"]' \
    ops/queue/queue.json > tmp.json && mv tmp.json ops/queue/queue.json
```

The handoff block's "Queue Updates" section is not just output — it is your own todo list when running interactively.

## Pipeline Chaining

After reweaving completes, output the next step based on `ops/config.yaml` pipeline.chaining mode:

- **manual:** Output "Next: audit [insight]" — user decides when to proceed
- **suggested:** Output next step AND advance task queue entry to `current_phase: "audit"`
- **automatic:** Queue entry advanced and verification proceeds immediately

The chaining output uses domain-native command names from the derivation manifest.
