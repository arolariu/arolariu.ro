# Refactor Rollback Checklist

Load before file movement or changes to exports, signatures, constructors, or
DI. Define rollback by coherent transformation so unrelated worktree changes
remain untouched.

## Prepare

- [ ] Record the files and exact public/internal boundaries changed by this
      transformation.
- [ ] Preserve the passing pre-step characterization evidence.
- [ ] Separate pre-existing user changes from the refactor diff.
- [ ] Identify newly created files and generated artifacts; delete only those
      created by this transformation and still unmodified.
- [ ] Do not plan a hard reset, history rewrite, force checkout, or wholesale
      restoration that can discard unrelated work.

## File Moves and Splits

- [ ] Point consumers back to the previous path before removing the new path.
- [ ] Restore the prior declaration order, initialization order, and
      side-effect sequence.
- [ ] Recombine split declarations without reformatting or redesigning them.
- [ ] Restore colocated tests and styles to their previous owner where they
      moved.
- [ ] Remove only now-unreferenced files created by the failed step.

## Exports and Signatures

- [ ] Restore prior export names, barrel entries, aliases, props, parameters,
      return types, discriminants, and wire fields.
- [ ] Restore exact error/exception and cancellation contracts.
- [ ] Remove forwarding exports only after every consumer is back on the
      previous entry point.

## Backend Dependencies and DI

- [ ] Restore interfaces, constructor parameters, fields, and caller direction
      as one unit.
- [ ] Restore service registrations and lifetimes with the constructors they
      satisfy.
- [ ] Restore TryCatch, telemetry, and exception-classification ownership.
- [ ] Re-run constructor/layer architecture tests before considering the
      rollback complete.

## Verify the Rollback

- [ ] The original characterization test passes again.
- [ ] Imports/type checks/build and affected architecture checks return to the
      recorded baseline.
- [ ] No rollback-only compatibility shim or dead export remains.
- [ ] The scoped diff no longer contains the failed transformation and still
      preserves unrelated user changes.
