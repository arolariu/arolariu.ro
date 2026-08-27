# RFC Writing Catalog

Load this catalog only after explicit approval to create a new RFC or to make a
material decision change. A factual update that preserves an existing decision
may proceed, but it must still distinguish live implementation from intent.

## Current Structural Owners

- `docs/rfc/README.md` owns the index, placement, and current numbering
  guidance.
- `docs/RFC_TEMPLATE.md` and representative current RFC siblings establish
  the supported status vocabulary and document shape; the template is not
  authority for the decision itself.
- The closest accepted/implemented RFC owns terminology and local precedent.
- Live source and configuration own current implementation.

Reopen all of them before writing. Do not copy their current inventories,
dates, versions, or paths into another guide.

## Approval Boundary

Stop before drafting a decision as settled when:

- no explicit approval exists;
- more than one materially different solution remains viable;
- the proposal changes public behavior, security, data/schema,
  infrastructure/deployment, dependency policy, or material cost; or
- an existing RFC appears to own the concern but conflicts with live behavior.

Before approval, evidence gathering and a neutral problem/alternatives outline
are allowed. Do not assign an accepted/implemented status or encode a preferred
decision.

## Required Decision Content

| Content | Question it must answer |
| --- | --- |
| Status and metadata | Is this draft, proposed, accepted, implemented, deprecated, or another status already supported by the live index? Who owns it and what components are in scope? |
| Context/problem | What constraint or recurring problem makes a durable decision necessary? What does live source do today? |
| Decision | What was approved, what is explicitly out of scope, and what normative guarantees or boundaries follow? |
| Alternatives | Which credible options were considered, under the same constraints, and why were they not chosen? |
| Consequences | What becomes easier/harder; what operational, security, performance, compatibility, and maintenance costs remain? |
| Source alignment | Which live files implement each part now, which parts are pending, and what evidence would invalidate the description? |
| Validation/rollout | How implementation conformance is proved and how a reversible rollout or migration is bounded when applicable |
| References | Related RFCs, source owners, official external material, and superseded decisions |

Use headings that fit the current RFC family, but preserve these semantics.

## Updating an Existing RFC

1. Identify the exact existing decision and its status.
2. Classify each edit as factual correction, clarification, implementation
   alignment, or material decision change.
3. For factual corrections, cite current source and preserve the decision and
   consequences.
4. For implementation drift, state what is implemented and what the RFC
   intends. Do not silently rewrite either side.
5. For a material change, stop until approval and record reconsidered
   alternatives/consequences.
6. Update the current index or related links only when live repository
   conventions require it.

## Writing a New Approved RFC

1. Confirm no existing RFC owns or supersedes the concern.
2. Derive the next identifier, filename, status, and index placement from the
   current RFC index; never guess from a copied range.
3. Start from the current template and a representative sibling.
4. Describe current behavior before the approved decision.
5. State the decision in testable terms and separate it from examples or
   implementation suggestions.
6. Treat examples as illustrative unless they are explicitly normative.
7. Record alternatives and negative consequences honestly.
8. Link live implementation owners rather than embedding volatile versions,
   commands, inventories, or generated output.

## Source-Alignment Rules

- Accepted RFCs own intent; source owns current behavior.
- “Implemented” requires file/test/config evidence, not status text alone.
- A future section must be labeled as future and must not read as an existing
  guarantee.
- An RFC code excerpt must be short and either invariant or explicitly
  illustrative. Dynamic patterns should use live source pointers.
- When a source path moves, update the link; when behavior changes, reassess
  the decision and consequences rather than performing a path-only edit.

## Anti-Patterns

- Reclassifying accidental current behavior as an approved decision.
- Listing every package version, command, module, route, or file when another
  source already owns that inventory.
- Presenting one option while omitting credible alternatives.
- Writing only benefits and hiding migration/operational costs.
- Copying code that will drift instead of linking the implementation owner.
- Updating status without implementation or approval evidence.
- Resolving RFC/source conflict inside a documentation-only task.
