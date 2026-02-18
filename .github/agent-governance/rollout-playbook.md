# Agent Governance Rollout Playbook

## Scope

Operational guidance for rolling out and maintaining agent/instruction/skill/prompt governance standards.

## Rollout Sequence

1. **Baseline**
   - Ensure governance protocol and eval artifacts exist.
2. **Template Compliance**
   - Update instructions, agents, skills, and prompts to required contract sections.
3. **Evaluation**
   - Run scenarios in `.github/agent-governance/evals/scenarios.json`.
   - Score results with `.github/agent-governance/evals/scorecard.md`.
4. **PR Governance Gate**
   - Require governance checklist completion in PR review for changes touching agent assets.
5. **Steady State**
   - Operate monthly drift review and quarterly red-team refresh.

## Ownership and Review Policy

| Area | Required Reviewers |
|------|---------------------|
| `.github/instructions/**` | Platform + domain owner |
| `.github/agents/**` | Platform + agent owner |
| `.github/skills/**` | Platform + skill owner |
| `.github/prompts/**` | Platform + prompt owner |
| `.github/agent-governance/**` | Platform maintainers |

## Cadence

- **Per PR:** run governance checklist review and scenario spot-check for impacted categories.
- **Monthly:** drift pass for RFC references and template contracts.
- **Quarterly:** refresh adversarial scenarios and threshold calibration.

## Rollback Strategy

If governance updates create false positives or delivery blockers:

1. Revert latest governance-only commit set.
2. Restore prior validated scenario and scorecard versions.
3. Open follow-up issue with failing evidence and proposed remediation.
4. Re-introduce changes behind incremental PRs with updated eval baselines.

## Reporting Metrics

- Governance validation pass rate.
- Scenario pass rate by category and severity.
- Number of detected RFC drift incidents per month.
- Mean time to remediate governance regressions.
