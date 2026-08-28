# Document-Type Decision Table

Use this table before editing. Put information at the narrowest durable owner
that reaches its reader; do not duplicate a fact merely to make it easier to
find.

## Primary Decision

| Document type | Use when | Governing authority | Required evidence | Do not use when |
| --- | --- | --- | --- | --- |
| JSDoc/TSDoc | A TypeScript, JavaScript, React, hook, server action, type, or exported utility has a caller-facing contract that is not obvious from its signature | Live declaration and consumers, then [RFC 1002](../../../../docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md) | Signature, call sites, tests, rendering/runtime boundary, escaping errors, current TypeDoc surface when applicable | The content is a cross-module operating procedure or architecture decision |
| C# XML documentation | A public/protected C# type or member needs IntelliSense and generated-reference contract detail | Live declaration, implementation, tests, exception classification, then [RFC 2004](../../../../docs/rfc/2004-comprehensive-xml-documentation-standard.md) | Exact generic/parameter/return shape, nullability, cancellation, escaping exceptions, inheritance, current generator/compiler settings | The statement is only an internal implementation note or an unapproved layer change |
| README or operational guidance | A reader must set up, run, diagnose, or own one repository surface | Live manifest, project config, scripts, workflows, source tree, and nearest guide | Executable steps, prerequisites, path ownership, expected result, failure/recovery path | A command/version already has a canonical repository owner that can be linked instead |
| Accepted/implemented RFC update | Existing approved intent remains valid but its explanation, source pointers, or implementation-alignment section is stale | Accepted RFC for intent; live source/configuration for current implementation | Existing decision, approval history/status, current source, alternatives/consequences that remain true | The proposed wording changes the decision, scope, guarantees, or trade-offs materially |
| New RFC proposal | A durable cross-cutting decision is needed and no accepted RFC owns it | Explicit approval first, then current RFC index/template, live constraints, and alternatives | Approved problem boundary, stakeholders, alternatives, decision, consequences, rollout, source-alignment plan | Approval is absent, the change is local implementation detail, or an existing RFC already owns the concern |
| Troubleshooting/reference | Readers need lookup-oriented failure signatures, registries, constraints, or recovery steps rather than a linear setup guide | Live diagnostic output, owning source/configuration, and current operational behavior | Reproducible symptom, first probe, safe correction, stop/escalation boundary | The page would freeze a generated inventory or repeat source without adding navigation or recovery value |

## Source Behavior Versus Architecture Intent

| Claim | Primary owner | Documentation treatment |
| --- | --- | --- |
| What code does now | Live source, configuration, consumers, and tests | Describe it exactly; do not “correct” it to match an RFC under a documentation-only task |
| Why the approved architecture exists | Accepted RFC | Summarize or link it; verify current source alignment separately |
| Public API contract | Live signature plus observable behavior and escaping failures | Put caller-specific detail beside the API; link broader rationale |
| Runtime/tool version or dependency state | Canonical manifest/configuration and root guidance | Prefer a link or source pointer; copy only when the document owns the value and audit it |
| Command or path | Current manifest, project target, script, workflow, or source tree | Derive the exact invocation/path at edit time and state its working directory |
| Proposed future behavior | Approved proposal/RFC status | Label as proposed; never write it as implemented |

If live behavior and accepted intent diverge, record the evidence. Correct a
purely factual stale statement only when the intended decision is unchanged;
otherwise stop before choosing which side should change.

## Placement Questions

1. Does the reader encounter the information while calling one symbol? Use API
   comments.
2. Does the reader need a sequence across symbols or tools? Use a README or
   operational guide.
3. Does the content explain a durable choice and rejected alternatives? Use
   the owning RFC after approval.
4. Is the content a symptom-to-recovery lookup? Use troubleshooting/reference.
5. Is the information generated or trivially discoverable? Link the source or
   generator rather than manually mirroring it.

## Boundary Cases

- A code example in an RFC explains the decision; an API example demonstrates
  supported use. Keep each at its owner.
- A README may link to API comments or an RFC, but should not reproduce their
  full contract or decision.
- Comments may name a layer or invariant only when live code and accepted
  architecture agree.
- A stale path, version, command, count, or locale list is a factual correction,
  not permission to redesign the owning surface.
