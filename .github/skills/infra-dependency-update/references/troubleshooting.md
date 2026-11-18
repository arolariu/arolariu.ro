# Dependency Migration Troubleshooting

Load only after the first concrete failure. Preserve the exact resolver, compile/type, test, runtime, or lockfile output and stop later
phases.

| Failure signature                                         | First probe                                                                                                                                                         | Safe correction                                                                                                                        | Stop when                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| npm `ERESOLVE` or peer conflict                           | Inspect exact target peer/engine metadata, `npm explain` paths, workspace owner, and lockfile duplicate majors                                                      | Choose an officially supported cohort/target or add the missing approved direct owner; regenerate from the correct root after approval | Correction requires force/legacy peer mode, a blind override, or a different unapproved target                      |
| NuGet downgrade, version conflict, restore/source failure | Trace direct and transitive paths from every consuming project; compare the independent API/tooling central catalogs, project SDK declarations, and package sources | Correct the approved version owner, then restore affected projects and review existing lock deltas or recorded lockless graph evidence | Resolution requires suppressing diagnostics, ownership drift within one project, or an unsupported target framework |
| pip `ResolutionImpossible` or `pip check` failure         | Compare exact `Requires-Python` and dependency specifiers for the proposed FastAPI/Pydantic/tooling graph in a clean environment                                    | Select a mutually supported approved target set and keep prod/dev layering intact                                                      | Fix requires an undocumented constraint bypass, unapproved package, or unsupported runtime                          |
| Unexpected generated artifacts or codemod edits           | Identify the tool, input config, and every path changed in that migration phase                                                                                     | Revert only generated changes from that phase, narrow the approved tool scope, and rerun after review                                  | Tool cannot preview/scope changes or touches workflows, infrastructure, auth, schemas, or unrelated apps            |
| Compile/type/analyzer failure after resolution            | Map each diagnostic to an exact removed/changed API or default in official target docs                                                                              | Adapt the smallest affected consumer cohort without suppressions; keep contracts characterized                                         | Official docs do not support the required behavior or adaptation changes public behavior                            |
| Tests compile but runtime/startup fails                   | Compare runtime/container versions, module format/native assets, DI/lifecycle, config defaults, and production install path                                         | Restore parity, apply documented initialization/lifecycle changes, and rerun the narrow runtime boundary                               | Fix changes auth/security, persisted data, deployment, or infrastructure without approval                           |
| Lockfile changes without manifest intent                  | Confirm command working directory, package-manager/runtime version, registry/source, workspace/project owner, and stale lock state                                  | Discard only this phase's lock change, rerun the approved native operation from the owner, and review direct/transitive deltas         | Deterministic regeneration still produces unexplained registry, integrity, or transitive drift                      |
| Partial migration: old and new APIs/config coexist        | Search imports, config keys, adapters, tests, docs, generated files, and temporary compatibility paths from the inventory                                           | Finish or reverse the current approved phase before proceeding; remove shims only after all consumers move                             | Coexistence is required long-term, changes behavior, or needs a new public compatibility policy                     |

## Recovery Order

1. Stop new mutations and retain the failure evidence.
2. Identify the last independently reversible phase.
3. Apply the [rollback checklist](../checklists/rollback-checklist.md) to that phase.
4. Re-establish the recorded baseline and the resolution guarantee supported by its lock/snapshot evidence.
5. Update compatibility research and request renewed approval if target, affected scope, generated output, or migration strategy changes.

Never “fix” a migration by skipping tests, hand-editing a generated lockfile, weakening compiler/analyzer rules, or hiding peer/transitive
conflicts.

## Misleading Success and Failure Signals

- **Tests pass but coverage collapses:** compare per-file/function coverage and changed dependency execution paths before blaming the test
  runner. A library may stop invoking selector/callback functions while preserving UI output. Use a supported compatibility path or document
  a hold; do not lower thresholds or add exclusions to conceal the change.
- **Build/test timeouts:** reproduce the narrow failure without competing heavy jobs, compare baseline behavior, and inspect documented new
  defaults. Expensive compiler/JSDoc contracts can run separately from runtime tests, provided the combined selections cover the entire
  suite and the runtime coverage gate is unchanged. Keep runtime cases in mixed test files covered; passing all assertions in a
  coverage-disabled partition does not prove the combined coverage gate. Repeated full runs and speculative timeout inflation do not
  identify the cause.
- **Filtered tests fail full-project coverage:** distinguish a targeted diagnostic run from the complete coverage gate. Do not attribute
  partial-run coverage to a dependency regression or lower persisted thresholds to make it pass.
- **Resolver or `pip check` succeeds but imports fail:** run the real package/application import boundary. Metadata compatibility does not
  prove runtime symbol compatibility, especially for framework and telemetry integrations.
- **Registry metadata works but artifact TLS fails:** retain certificate verification. Check official feed alternatives or a bounded,
  TLS-verifying download with registry-provided integrity/hash verification. Do not switch to a stale mirror and call it latest, disable
  TLS, or persist an incidental source-policy change.
- **SDK package updated but bundled tool unchanged:** inspect the executing compiler/test runner/SDK version separately. A package bump does
  not service an independently installed runtime or prove that tool's advisory is fixed.
- **Documentation build lacks generated references:** inspect the preparation command, extractor requirements, and exact mode flag before
  retrying. An authored-content preview is not a full reference build; use the documented mode and disclose that scope instead of adding
  placeholder reference files or changing production configuration.
