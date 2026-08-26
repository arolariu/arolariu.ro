---
name: documentation
description: Add or correct JSDoc, XML documentation, RFC, README, or repository guidance without changing behavior. Use for documentation-focused work and follow RFC 1002 or RFC 2004 when public APIs are involved.
---

# Documentation

## Use When

- Adding or correcting API comments
- Updating README or operational guidance
- Recording an approved architecture decision
- Removing stale documentation

## Inputs

- Document or public API
- Live implementation and consumers
- Applicable RFC/documentation standard

## Procedure

1. Read live implementation and existing documentation.
2. Identify the reader and the behavior/decision that needs explanation.
3. Preserve accurate content and remove stale claims.
4. Explain constraints, ownership, errors, and examples that are not obvious
   from the signature.
5. For JSDoc use RFC 1002; for XML docs use RFC 2004.
6. Do not change production logic under a documentation-only request.
7. Check links, examples, names, and source references.
8. Run a documentation-specific check when one exists; otherwise use
   `git diff --check`.

## Completion

State what became clearer or current. Do not claim an application build for a
documentation-only change that did not need one.

## Stop and Ask

- New or materially changed RFC decision
- Documentation exposes security-sensitive data
- Live behavior and intended behavior conflict
