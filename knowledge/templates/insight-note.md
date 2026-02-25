---
_schema:
  entity_type: "insight"
  applies_to: "insights/*.md"
  required:
    - description
  optional:
    - type
    - source
    - status
    - created
    - modified
  enums:
    type:
      - decision
      - convention
      - pattern
      - gotcha
      - constraint
      - dependency
    status:
      - current
      - outdated
      - speculative
  constraints:
    description:
      max_length: 200
      format: "One sentence adding context beyond the title — scope, mechanism, or implication"
    source:
      format: "Relative path to authoritative source document (e.g., docs/rfc/2003-the-standard.md)"

# Template fields
description: ""
type: ""
source: ""
status: current
created: YYYY-MM-DD
---

# {prose-as-title — express the architectural insight as a complete thought}

{Content: explain the insight, its rationale, and its implications for the codebase. Show the reasoning path. Reference source material.}

---

Related Insights:
- [[related insight]] — how it relates (extends, contradicts, enables, foundation, example)

Domains:
- [[relevant-domain-map]]
