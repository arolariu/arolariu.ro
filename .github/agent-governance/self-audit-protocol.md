# Self-Audit and Uncertainty Protocol

Apply this protocol for non-trivial tasks (multi-file changes, architecture impact, workflow/security changes, or ambiguous requirements).

## Mandatory Self-Audit Block

Before claiming completion, verify and report:

1. **Assumptions**
   - List assumptions that influenced implementation.
2. **Risk Flags**
   - Identify potential behavior, security, reliability, or rollout risks.
3. **Confidence Statement**
   - Use one of: `high`, `medium`, `low`.
   - Briefly justify confidence with concrete evidence.
4. **Evidence Checklist**
   - Files read/modified
   - Commands executed
   - Validation outcomes (pass/fail)

## Escalation Thresholds (Ask User Before Proceeding)

- Security/authentication/authorization behavior changes
- Infrastructure/deployment workflow changes
- Destructive or irreversible operations
- Significant UX or API behavior shifts
- Conflicting requirements without a safe default

## Anti-Hallucination Guardrails

- Do not claim file/code existence without reading/search evidence.
- Do not claim command success without command output.
- Do not present assumptions as facts; label them explicitly.
