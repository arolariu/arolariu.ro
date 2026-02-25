---
applyTo: "knowledge/**/*.md,**/CLAUDE.md"
---

# Architectural Knowledge Vault Instructions

When working with files in the `knowledge/` directory, you are interacting with the arolariu.ro architectural knowledge graph — a structured memory system that captures decisions, conventions, patterns, and constraints across the monorepo.

## Key Principles

1. **Insights are prose propositions.** Every insight file in `insights/` has a title that works as a complete thought in a sentence: "service layers flow strictly downward in The Standard" — not "The Standard" or "backend layers."

2. **Wiki links connect the graph.** Use `[[insight title]]` syntax for all internal references. Links must point to real files. Check before linking.

3. **Domain maps organize by area.** Domain maps in `insights/` (frontend-patterns.md, backend-architecture.md, etc.) are navigation hubs. Every insight should appear in at least one domain map.

4. **Schema is enforced.** Every insight needs YAML frontmatter with at minimum a `description` field that adds information beyond the title.

5. **Source attribution required.** Insights derived from RFCs, instruction files, or CLAUDE.md must include a `source` field pointing to the authoritative document.

## When Consulting the Vault

Before answering architecture questions, check if the knowledge vault has relevant insights:

```
knowledge/insights/ — look for insights related to the question
knowledge/insights/index.md — hub linking to all domain maps
knowledge/insights/frontend-patterns.md — Next.js, React, UI patterns
knowledge/insights/backend-architecture.md — .NET, The Standard, DDD
knowledge/insights/infrastructure.md — Azure, Bicep, CI/CD
knowledge/insights/component-library.md — @arolariu/components
knowledge/insights/cross-cutting.md — Universal conventions
```

If an insight exists that answers the question, reference it. Don't improvise when the answer is already documented.

## When Creating Insights

1. Route through `inbox/` first — don't write directly to `insights/`
2. Use the template in `templates/insight-note.md`
3. Title as a prose proposition (the claim test: "This insight argues that [title]")
4. Description must add context beyond the title
5. Add to the relevant domain map with a context phrase
6. Link to related insights with relationship type (extends, contradicts, enables, etc.)
