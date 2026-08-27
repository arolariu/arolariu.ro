# Incremental Validation Checklist

Use this checklist after every coherent transformation, not only at the end.

## Before the First Edit

- [ ] Scope, structural smell, and observable behavior are written down.
- [ ] Direct consumers, public entry points, tests, configuration, and local
      guidance have been inspected.
- [ ] The characterization strategy is selected and its baseline passes.
- [ ] Pre-existing targeted failures are recorded separately.
- [ ] The first transformation and its rollback unit are named.

## After Each Coherent Transformation

- [ ] No second transformation was mixed into the step.
- [ ] The same smallest characterization test passes.
- [ ] New tests assert behavior through a stable boundary, not the new
      internal arrangement.
- [ ] Inputs, outputs, errors, side-effect order, cancellation, cleanup,
      ownership, serialization, rendering, and accessibility are unchanged as
      applicable.
- [ ] Imports, exports, aliases, barrels, project references, constructors,
      and DI registrations resolve.
- [ ] The matching type/build/architecture check runs when a boundary changed.
- [ ] The scoped diff contains only the intended structural step.
- [ ] If a check fails, work stops and the last step is corrected or rolled
      back before another transformation begins.

## Before Completion

- [ ] Every affected direct consumer and its nearest focused tests pass.
- [ ] Contract/transport and architecture tests pass where public shape or
      dependency direction was touched.
- [ ] No test was deleted, skipped, broadly snapshot-updated, or weakened to
      conceal drift.
- [ ] Documentation and comments describe the current structure without
      claiming changed behavior.
- [ ] No dependency, schema, auth/security, infrastructure, deployment,
      product, or incidental shared-library change entered the diff.
- [ ] The final scoped diff passes whitespace/error checks and is manually
      inspected against the approved scope.
