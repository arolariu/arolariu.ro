---
_schema:
  entity_type: "source-capture"
  applies_to: "inbox/*.md"
  required:
    - description
    - source_type
  optional:
    - source_path
    - priority
    - captured
  enums:
    source_type:
      - rfc
      - instruction
      - code-comment
      - session-discovery
      - external
    priority:
      - high
      - medium
      - low
  constraints:
    description:
      max_length: 200
      format: "What this source contains and why it's worth distilling"

# Template fields
description: ""
source_type: ""
source_path: ""
priority: medium
captured: YYYY-MM-DD
---

# {brief description of what to distill from this source}

## Source Context

{Where this came from, why it matters, what to look for when distilling.}

## Key Sections to Extract

{Point to specific sections, decisions, or patterns worth distilling into individual insights.}
