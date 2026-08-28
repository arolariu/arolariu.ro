# Dependency Migration Troubleshooting

Load only after the first concrete failure. Preserve the exact resolver,
compile/type, test, runtime, or lockfile output and stop later phases.

| Failure signature | First probe | Safe correction | Stop when |
| --- | --- | --- | --- |
| npm `ERESOLVE` or peer conflict | Inspect exact target peer/engine metadata, `npm explain` paths, workspace owner, and lockfile duplicate majors | Choose an officially supported cohort/target or add the missing approved direct owner; regenerate from the correct root after approval | Correction requires force/legacy peer mode, a blind override, or a different unapproved target |
| NuGet downgrade, version conflict, restore/source failure | Trace direct and transitive paths from every consuming project; compare API-central and tooling-local ownership plus package sources | Correct the approved version owner, then restore affected projects and review existing lock deltas or recorded lockless graph evidence | Resolution requires suppressing diagnostics, ownership drift within one project, or an unsupported target framework |
| pip `ResolutionImpossible` or `pip check` failure | Compare exact `Requires-Python` and dependency specifiers for the proposed FastAPI/Pydantic/tooling graph in a clean environment | Select a mutually supported approved target set and keep prod/dev layering intact | Fix requires an undocumented constraint bypass, unapproved package, or unsupported runtime |
| Unexpected generated artifacts or codemod edits | Identify the tool, input config, and every path changed in that migration phase | Revert only generated changes from that phase, narrow the approved tool scope, and rerun after review | Tool cannot preview/scope changes or touches workflows, infrastructure, auth, schemas, or unrelated apps |
| Compile/type/analyzer failure after resolution | Map each diagnostic to an exact removed/changed API or default in official target docs | Adapt the smallest affected consumer cohort without suppressions; keep contracts characterized | Official docs do not support the required behavior or adaptation changes public behavior |
| Tests compile but runtime/startup fails | Compare runtime/container versions, module format/native assets, DI/lifecycle, config defaults, and production install path | Restore parity, apply documented initialization/lifecycle changes, and rerun the narrow runtime boundary | Fix changes auth/security, persisted data, deployment, or infrastructure without approval |
| Lockfile changes without manifest intent | Confirm command working directory, package-manager/runtime version, registry/source, workspace/project owner, and stale lock state | Discard only this phase's lock change, rerun the approved native operation from the owner, and review direct/transitive deltas | Deterministic regeneration still produces unexplained registry, integrity, or transitive drift |
| Partial migration: old and new APIs/config coexist | Search imports, config keys, adapters, tests, docs, generated files, and temporary compatibility paths from the inventory | Finish or reverse the current approved phase before proceeding; remove shims only after all consumers move | Coexistence is required long-term, changes behavior, or needs a new public compatibility policy |

## Recovery Order

1. Stop new mutations and retain the failure evidence.
2. Identify the last independently reversible phase.
3. Apply the
   [rollback checklist](../checklists/rollback-checklist.md) to that phase.
4. Re-establish the recorded baseline and the resolution guarantee supported by
   its lock/snapshot evidence.
5. Update compatibility research and request renewed approval if target,
   affected scope, generated output, or migration strategy changes.

Never “fix” a migration by skipping tests, hand-editing a generated lockfile,
weakening compiler/analyzer rules, or hiding peer/transitive conflicts.
