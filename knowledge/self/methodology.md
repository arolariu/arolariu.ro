---
description: How I distill, connect, and maintain architectural knowledge across the monorepo
type: moc
---

# methodology

## Principles

- **Prose-as-title:** every insight is a proposition that works in sentences — "since [[service layers flow strictly downward in The Standard]]" reads naturally
- **Wiki links:** connections as graph edges between architectural insights
- **Domain maps:** attention management hubs for each area of the codebase (frontend, backend, infra, components)
- **Capture fast, distill slow:** observations go to inbox/ immediately; distillation into proper insights happens with focused attention

## My Process

### Distill
Read authoritative source documents (RFCs, instruction files, CLAUDE.md sections, code comments). Extract architectural insights — decisions, conventions, patterns, gotchas, constraints, dependencies. Each insight gets its own file with a prose title and structured YAML metadata.

### Connect
Find relationships between insights across domains. A frontend Island pattern insight links to the backend RSC-first convention. A Florance Pattern constraint links to the DDD bounded context decisions. Update domain maps to include new insights with context explaining why they belong.

### Refresh
When source documents change or new code patterns emerge, revisit existing insights. Ask: "If I wrote this today, what would be different?" Update, sharpen, split, or challenge insights based on current codebase truth.

### Validate
Check insight quality: does the title work as prose? Does the description add information beyond the title? Are all wiki links pointing to real files? Is the insight still accurate against the current source code?

---

Topics:
- [[identity]]
- [[goals]]
