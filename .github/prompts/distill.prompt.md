---
mode: "agent"
description: "Distill architectural insights from a source document into the knowledge vault"
---

# Distill Insights from Source Document

You are distilling architectural insights from a source document into the arolariu.ro knowledge vault.

## Instructions

1. **Read the source document** provided by the user (an RFC, instruction file, CLAUDE.md section, or code file).

2. **Extract insights** — look for:
   - **Decisions** — Architectural choices with rationale
   - **Conventions** — Coding standards, naming rules, patterns to follow
   - **Patterns** — Recurring implementation approaches
   - **Gotchas** — Pitfalls, workarounds, things that break unexpectedly
   - **Constraints** — Non-negotiable rules
   - **Dependencies** — How parts relate to each other

3. **For each insight**, create a file in `knowledge/inbox/` with:
   - A prose-as-title filename (the insight expressed as a complete thought)
   - YAML frontmatter: description, type, source, status: current, created date
   - Body explaining the insight, its rationale, and implications
   - Related Insights footer with wiki links to related insights
   - Domains footer linking to the relevant domain map

4. **Quality gates** before saving each insight:
   - Does the title work as prose? "Since [[title]]" reads naturally?
   - Does the description add information beyond the title?
   - Is the insight specific enough to disagree with?
   - Does it reference the source document in the `source` field?

5. **After all insights are created**, list them with their titles so the user can review.

## Example

From RFC 2003 about The Standard, you might extract:
- `knowledge/inbox/service layers flow strictly downward in The Standard.md`
- `knowledge/inbox/the Florance Pattern limits each service to 2-3 dependencies.md`
- `knowledge/inbox/brokers are thin wrappers with no business logic.md`

Each as a separate file with proper schema and connections.
