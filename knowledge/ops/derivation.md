---
description: How this knowledge system was derived — enables architect and reseed commands
created: 2026-02-25
engine_version: "1.0.0"
---

# System Derivation

## Configuration Dimensions

| Dimension | Position | Conversation Signal | Confidence |
|-----------|----------|---------------------|------------|
| Granularity | Moderate | "reference as authoritative sources, build connective tissue" — per-insight, not atomic decomposition | High |
| Organization | Flat | Cross-cutting concerns across frontend/backend/infra/components — insights don't belong in one folder | Medium + Inferred |
| Linking | Explicit + implicit | "connect everything together", "connective tissue", "agents never lacking context" | High |
| Processing | Heavy | "build connective tissue", "distill from RFCs and docs", extract insights and connect | High |
| Navigation | 3-tier | Multiple domains (frontend, backend, infra, components, CV site), need topic-level maps | Medium + Cascade |
| Maintenance | Condition-based | "always have the right context", full automation platform, codebase evolves | Medium + Cascade |
| Schema | Moderate | "properly explicit and correct", "both human and agents alike" | Medium |
| Automation | Full | "everything works perfect out of the box", Claude Code platform with hooks + skills | High |

## Personality Dimensions

| Dimension | Position | Signal |
|-----------|----------|--------|
| Warmth | warm | Professional but approachable — user writes conversationally |
| Opinionatedness | opinionated | "agents should consult what's already known" — active direction to sources |
| Formality | professional | "properly explicit and correct" |
| Emotional Awareness | task-focused | Technical codebase domain |

## Vocabulary Mapping

| Universal Term | Domain Term | Category |
|----------------|-------------|----------|
| notes | insights | folder |
| inbox | inbox | folder |
| archive | archive | folder |
| note (type) | insight | note type |
| note_plural | insights | note type |
| reduce | distill | process phase |
| reflect | connect | process phase |
| reweave | refresh | process phase |
| verify | validate | process phase |
| validate | audit | process phase |
| rethink | rethink | process phase |
| MOC | map | navigation |
| topic_map | domain map | navigation |
| hub | index | navigation |
| description | context | schema field |
| topics | domains | schema field |
| relevant_notes | related insights | schema field |
| processing | knowledge pipeline | process |
| pipeline | pipeline | process |
| wiki link | link | connection |
| thinking notes | insights | note type |
| archive | archive | folder |
| self/ space | knowledge guardian | identity |
| orient | orient | session phase |
| persist | persist | session phase |

## Platform

- Tier: Claude Code
- Automation level: full
- Automation: full (default)
- Copilot integration: yes (.github/instructions/ + .github/prompts/)

## Active Feature Blocks

- [x] wiki-links — always included (kernel)
- [x] maintenance — always included (always)
- [x] self-evolution — always included (always)
- [x] session-rhythm — always included (always)
- [x] templates — always included (always)
- [x] ethical-guardrails — always included (always)
- [x] helper-functions — always included (always)
- [x] graph-analysis — always included (always)
- [x] processing-pipeline — always included (always)
- [x] schema — always included (always)
- [x] methodology-knowledge — always included (always)
- [x] atomic-notes — included (moderate granularity still benefits from atomicity principles)
- [x] mocs — included (3-tier navigation requires domain maps)
- [x] personality — included (opinionated knowledge guardian personality derived)
- [x] self-space — included (agent persistent identity across sessions)
- [x] multi-domain — included (frontend, backend, infra, components, CV are distinct domains)
- [ ] semantic-search — excluded (qmd not installed; documented for future activation)

## Coherence Validation Results

- Hard constraints checked: 3. Violations: none
  - moderate + 3-tier + volume ~100-200: OK
  - full automation + Claude Code: OK
  - heavy processing + full automation: OK
- Soft constraints checked: 6. Auto-adjusted: none. User-confirmed: none.
  - moderate + heavy processing: OK (moderate granularity pairs well with heavy processing)
  - schema moderate + full automation: OK (validation hooks enforce it)
  - linking explicit+implicit + no semantic search: WARN — implicit linking falls back to keyword overlap and MOC traversal. Documented for future qmd installation.
  - flat + 3-tier + volume ~100-200: OK
  - heavy processing + condition-based maintenance: OK
  - multi-domain + flat organization: OK (domain maps provide structure)
- Compensating mechanisms active: MOC-based navigation compensates for missing semantic search

## Failure Mode Risks

1. **Verbatim Risk** (HIGH) — Copying RFC text instead of distilling it. Each insight must transform the source material into individually actionable knowledge.
2. **Orphan Drift** (HIGH) — Insights created but not connected to domain maps. Every insight needs at least one map link and inline connections to related insights.
3. **Temporal Staleness** (HIGH) — Codebase evolves, insights become outdated. /refresh and condition-based maintenance catch drift between insights and source code.
4. **Productivity Porn** (HIGH) — Spending more time on the knowledge system than writing actual code. The vault serves the codebase, not the other way around.

## Generation Parameters

- Vault root: knowledge/
- Folder names: insights/, inbox/, archive/, self/, templates/, manual/, ops/
- Skills to generate: all 16 — vocabulary-transformed (distill, connect, refresh, validate, audit, seed, ralph, pipeline, tasks, stats, graph, next, learn, remember, rethink, refactor)
- Hooks to generate: session-orient.sh, validate-note.sh, auto-commit.sh, session-capture.sh
- Templates to create: insight-note.md, domain-map.md, source-capture.md, observation.md
- Copilot files to create: .github/instructions/knowledge.instructions.md, .github/prompts/distill.prompt.md, .github/prompts/connect.prompt.md

## Domain Context

This vault is the **institutional memory** for the arolariu.ro monorepo. It exists to solve agent amnesia — the problem where AI agents (Claude Code and GitHub Copilot) start sessions cold, ignore existing architectural docs, and reinvent knowledge that's already captured.

Existing authoritative sources (NOT managed by the vault — referenced as source material):
- docs/rfc/*.md — Architecture Decision Records
- .github/instructions/*.instructions.md — Copilot context-aware instructions
- .github/copilot-instructions.md — Root Copilot instructions
- CLAUDE.md — Root Claude Code instructions
- .github/agents/*.agent.md — Copilot agent definitions
- .github/prompts/*.prompt.md — Copilot reusable prompts
- .github/skills/*/SKILL.md — Copilot agent skills

The vault creates a discoverable knowledge graph on top of these sources. Each RFC, instruction file, or convention gets distilled into individual insights connected by wiki links, organized by domain maps, and validated against source code truth.

## Extraction Categories

| Category | What to Find | Output Type |
|----------|-------------|-------------|
| decisions | Architectural choices with rationale from RFCs | decision |
| conventions | Coding standards, naming rules, patterns to follow | convention |
| patterns | Recurring implementation approaches (Island pattern, TryCatch, etc.) | pattern |
| gotchas | Pitfalls, workarounds, things that break unexpectedly | gotcha |
| constraints | Non-negotiable rules (no any, no sideways calls, etc.) | constraint |
| dependencies | How parts relate (component lib → website, API ↔ frontend) | dependency |
