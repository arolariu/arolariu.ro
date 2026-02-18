---
version: "1.0.0"
lastUpdated: "2026-02-18"
name: "Agent Governance Contract"
applyTo: ".github/**/*.md"
description: "Mandatory contract for agent-facing assets: intake, RFC grounding, verification, uncertainty reporting, and policy severity handling."
---

# Agent Governance Contract

## Instruction Contract

### Scope
Applies to AI customization assets under `.github/`.

### Mandatory Rules
- Enforce intake, RFC grounding, verification, and uncertainty disclosure contracts.
- Require all agent-facing assets to define scope, constraints, validation, and escalation sections.
- Ensure RFC-source conflicts are resolved in favor of source-of-truth code and logged as drift.

### Prohibited Actions
- Do not claim completion without command/file evidence.
- Do not bypass escalation requirements for risky operations.
- Do not omit policy constraints from agent, skill, or prompt templates.

### Required Verification Commands
```bash
git --no-pager diff .github/**/*.md
```

### Failure Handling
- If verification fails, stop and report failing command output with impacted files.
- If constraints conflict with task requests, escalate and request explicit user direction.
- If uncertainty remains on behavior-impacting choices, ask before continuing.

### Drift Watchpoints
- Instruction hierarchy precedence
- RFC map coverage across domains
- Template contract section completeness


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

## Evaluation and Red-Team Requirements

- Use `.github/agent-governance/evals/scenarios.json` to evaluate major agent asset changes.
- Score results using `.github/agent-governance/evals/scorecard.md`.
- Treat failing critical scenarios as release blockers.
