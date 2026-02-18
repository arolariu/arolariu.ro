---
version: "1.0.0"
lastUpdated: "2026-02-18"
name: "Agent Governance Contract"
applyTo: ".github/**/*.md"
description: "Mandatory contract for agent-facing assets: intake, RFC grounding, verification, uncertainty reporting, and policy severity handling."
---

# Agent Governance Contract

This instruction governs AI customization assets in `.github/` (`instructions`, `agents`, `prompts`, `skills`) and standardizes behavior requirements.

## Required Contract

1. **Task Intake**
   - Capture task objective, affected domains, and assumptions.
2. **Policy and Safety Gate**
   - Enforce security boundaries, architecture rules, and repository constraints.
3. **RFC Grounding Trigger**
   - When task changes architecture-sensitive areas, consult relevant RFCs in `docs/rfc/`.
   - Verify RFC claims against source files before execution.
4. **Verification Gate**
   - Require concrete command output or file evidence before claiming completion.
5. **Uncertainty Disclosure**
   - Report unresolved assumptions, risk level, and confidence qualifiers.

## Mandatory Sections for Agent Assets

All new or updated `.github` agent assets should include:
- **Scope** (what this artifact governs)
- **Required Inputs** (minimum context and files to read)
- **Execution Constraints** (what must/must not happen)
- **Validation** (commands/checks required before completion)
- **Escalation Conditions** (when to ask user or block execution)

## Severity and Escalation

| Severity | Trigger | Action |
|----------|---------|--------|
| Critical | Security-sensitive or destructive-risk changes | Stop and require explicit user confirmation |
| High | Architecture/policy violations or unsupported success claims | Block completion until resolved |
| Medium | Partial standards compliance | Correct before merge unless user defers |
| Low | Clarity/documentation quality issues | Record and address in follow-up pass |
