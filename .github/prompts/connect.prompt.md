---
mode: "agent"
description: "Find and create connections between architectural insights across domains"
---

# Connect Insights Across Domains

You are finding connections between architectural insights in the arolariu.ro knowledge vault.

## Instructions

1. **Read the target insight(s)** — either specified by the user or recently created insights in `knowledge/insights/`.

2. **Search for related insights** across ALL domain areas:
   - `knowledge/insights/` — search all files for related concepts
   - Check each domain map for potential connections
   - Look for cross-domain relationships (frontend ↔ backend ↔ infra)

3. **For each genuine connection found:**
   - Add an inline wiki link in the insight's body where the connection is relevant
   - Add to the Related Insights footer with a relationship type:
     - **extends** — builds on an idea
     - **foundation** — provides evidence this depends on
     - **contradicts** — conflicts with this claim
     - **enables** — makes this possible
     - **example** — illustrates this concept

4. **Update domain maps** — ensure the insight appears in all relevant domain maps with a context phrase explaining why it belongs.

5. **Backward connections** — check if older insights should be updated to reference the new one. If insight B was written before insight A but A extends B, update B's Related Insights to mention A.

## Quality Gates

- Every connection must articulate HOW the insights relate (not just "related")
- Don't force connections — if the relationship isn't genuine, skip it
- Cross-domain connections are especially valuable — prioritize these
- Every insight should end up in at least one domain map
