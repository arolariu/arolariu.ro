# Documentation Troubleshooting

Load this resource only after a concrete failure. Preserve the exact diagnostic,
the edited source, the selected generator/check, and the last known-good state
before changing anything.

| Failure signature | First probe | Safe correction | Stop when |
| --- | --- | --- | --- |
| TypeDoc reports an unresolved symbol, invalid tag, TypeScript diagnostic, or missing page | Inspect the exact source declaration, its TypeDoc config, project TypeScript config, and whether the file is an intended entry/exclusion | Fix only the documentation comment, documentation link, or example when it is wrong; rerun the current targeted TypeDoc script selected from the live manifest | Passing requires changing an import/type/public behavior, generator configuration, exclusions, or tooling; report and route that implementation fix |
| C# emits CS1591 or another XML-doc warning | Identify the exact public/protected symbol and inspect its signature, implementation, inherited contract, and nearest documented sibling | Add meaningful XML comments or accurate `<inheritdoc/>`; correct `param`, `typeparam`, `returns`, `value`, and `cref` names at source | Passing requires suppressing the warning, changing visibility/signature, or documenting behavior the source does not guarantee |
| DefaultDocumentation output is missing, empty, or stale | Separate compile/XML-generation failure from extractor/discovery/output-tier failure by reading the exact stage output and live docs orchestrator | Correct inaccurate source XML documentation, then regenerate from a clean staging directory | Project discovery, generator input/configuration, dependencies, or deployment must change; report and route that implementation fix |
| Docs assembly reports a missing/empty generated tier | Inspect the extractor that owns that tier, current output path, and the orchestrator's non-empty validation before landing pages are synthesized | Correct documentation input only when it is the demonstrated cause, then rerun assembly | Extractor code/path/configuration must change, or a hand-written page would only mask missing output; report and route the implementation fix |
| Docusaurus build reports a broken link, duplicate route, invalid frontmatter, or missing page | Resolve the link from the source document, check case and generated route rules, then inspect current normalization and plugin configuration | Correct the source-relative target/anchor/frontmatter or the owning generated-route mapping | Fixing it changes public routing, deployment, or shared docs configuration without approval |
| Relative link works locally but fails in CI | Check case-sensitive spelling, URL encoding, working directory, symlink assumptions, and whether the target is generated before validation | Use repository-relative source ownership and a link that resolves after the actual assembly order | The target exists only in an untracked local state or requires publishing private content |
| Example no longer compiles or matches behavior | Reopen the public API, representative live consumer, imports, types, error/result handling, and runtime/provider context | Update or replace the example with the smallest current supported use; link a live consumer when setup is extensive | Correctness requires behavior changes or the supported use is ambiguous |
| README command or output is stale | Locate the command's owning manifest/project/workflow and run the current narrow invocation from its documented working directory | Link the owner or update the procedure, prerequisites, expected outcome, and recovery together | Multiple commands imply materially different operating modes not resolved by current guidance |
| RFC and source disagree | Classify the difference as stale fact, incomplete implementation, or material decision drift; cite both sides | Correct a stale factual statement only when the approved decision is unchanged; otherwise record the drift | Choosing source or RFC would change behavior, architecture, security, or public guarantees |
| Link/source audit finds a copied version, count, inventory, locale list, path, or canonical command | Identify the one live owner and every duplicate | Replace duplicates with a link/source pointer, or update the one document that genuinely owns the value | Ownership is unclear or two documents intentionally claim authority |

## Recovery Order

1. Stop adding documentation or exclusions.
2. Capture the exact failure and the smallest source that reproduces it.
3. Confirm whether the source comment, generator input, generator
   configuration, or rendered link owns the failure.
4. Reopen the matching catalog and a live sibling.
5. Apply the smallest documentation-only correction.
6. Rerun the same failing check before broader docs validation.
7. Run the
   [source-and-link audit](../checklists/source-and-link-audit.md) again.

Generated output is evidence, not an edit target. Never suppress warnings,
weaken type checks, or broaden exclusions to make documentation appear valid.
