---
_schema:
  entity_type: "domain-map"
  applies_to: "insights/*-map.md, insights/*-patterns.md, insights/*-architecture.md"
  required:
    - description
    - type
  optional:
    - created
    - modified
  enums:
    type:
      - moc
  constraints:
    description:
      max_length: 200
      format: "What this domain area covers and how to use this map"

# Template fields
description: ""
type: moc
created: YYYY-MM-DD
---

# {domain area name}

{Brief orientation — 2-3 sentences explaining what this area covers and how to navigate this map.}

## Core Insights

- [[insight title]] — context explaining why this matters and what it contributes
- [[insight title]] — what this adds to the domain

## Tensions

{Unresolved conflicts — where conventions clash, edge cases exist, or architectural trade-offs remain open.}

## Open Questions

{What is unexplored. Areas that need insights distilled from source docs. Gaps in the knowledge graph.}
