---
_schema:
  entity_type: "observation"
  applies_to: "ops/observations/*.md"
  required:
    - description
    - category
    - observed
    - status
  optional: []
  enums:
    category:
      - friction
      - surprise
      - process-gap
      - methodology
    status:
      - pending
      - promoted
      - implemented
      - archived
  constraints:
    description:
      max_length: 200
      format: "What happened and what it suggests for the system"

# Template fields
description: ""
category: ""
observed: YYYY-MM-DD
status: pending
---

# {the observation as a prose sentence}

{What happened, why it matters, and what might change as a result.}
