---
description: Why each configuration dimension was chosen — the reasoning behind initial system setup
category: derivation-rationale
created: 2026-02-25
status: active
---

# derivation rationale for codebase knowledge

This knowledge system was derived for the arolariu.ro monorepo — a full-stack platform with Next.js frontend, .NET backend, shared component library, SvelteKit CV site, and Azure cloud infrastructure.

## The Problem

AI agents (Claude Code and GitHub Copilot) suffer from session amnesia. Each new session starts cold. Agents ignore existing architectural documentation (RFCs, instruction files, CLAUDE.md) and reinvent knowledge that's already captured. The result: inconsistent guidance, violations of established conventions, and wasted time re-explaining the same constraints.

## The Solution

A discoverable knowledge graph that:
1. References existing docs as authoritative sources (not replacing them)
2. Decomposes them into individually discoverable insights
3. Connects insights across domains (frontend ↔ backend ↔ infra)
4. Validates insights against current source code truth
5. Orients agents at session start so they always know the vault exists

## Dimension Choices

**Granularity: Moderate** — Per-insight, not atomic decomposition. Each RFC becomes several insights (one per key decision/convention), but we don't decompose to single sentences. The existing docs are the coarse units; the vault distills them into individually findable pieces.

**Organization: Flat** — Architectural insights cross boundaries. A constraint about The Standard applies to backend but affects API design which touches frontend. Flat organization with wiki links and domain maps lets insights live where they naturally belong.

**Linking: Explicit + Implicit** — The whole point of the system is connecting things. Explicit wiki links between insights, with implicit discovery via search when vocabulary diverges across domains.

**Processing: Heavy** — Building the connective tissue requires deep work: reading RFCs, extracting insights, finding cross-domain relationships, validating against source code. This isn't lightweight capture — it's knowledge engineering.

**Navigation: 3-tier** — Multiple bounded contexts (frontend, backend, infra, components, CV site) need topic-level domain maps. Hub → domain map → individual insights.

**Maintenance: Condition-based** — The codebase evolves continuously. Insights need refreshing when source code changes. Condition-based triggers (orphan detection, staleness, broken links) catch drift automatically.

**Schema: Moderate** — Enough structure for agent discovery (type, source, domains, status) without bureaucratic overhead. The schema serves retrieval, not process.

**Automation: Full** — Claude Code platform supports hooks and skills. SessionStart orientation, PostToolUse validation, auto-commit, session capture — all automated from day one.

## Personality

Warm + opinionated + professional + task-focused. The agent actively directs to known sources rather than improvising. It says "RFC 2003 covers this" not "here are five ways you could approach this."

---

Topics:
- [[methodology]]
