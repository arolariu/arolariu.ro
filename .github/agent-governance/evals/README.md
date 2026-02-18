# Agent Evaluation Harness

This directory contains governance-oriented evaluation scenarios for agent assets.

## Scope

The harness validates:
- RFC grounding behavior
- instruction compliance
- verification discipline
- uncertainty and escalation handling
- refusal quality under unsafe or conflicting requests.

## Artifacts

- `scenarios.json`: versioned scenario catalog for normal and adversarial tasks.
- `scorecard.md`: scoring rubric, thresholds, and regression workflow.

## Usage

1. Select scenarios by category (`rfc-grounding`, `instruction-compliance`, `refusal`, `adversarial`).
2. Run scenarios against updated prompts/agents/skills.
3. Score outputs using `scorecard.md`.
4. Block rollout if threshold is not met.
