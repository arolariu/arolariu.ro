# Agent Asset Inventory and Gap Audit

This audit scores all agent customization assets against the repository contract dimensions: Scope, Required Inputs, Constraints, Validation, Escalation, and RFC Grounding.

## Summary

- Total assets audited: **26**
- Agents: **6**, Skills: **4**, Prompts: **6**, Instructions: **10**
- Risk profile: **High 6**, **Medium 5**, **Low 15**

## Scoring Rubric

- 1 point each for explicit presence of: Scope, Required Inputs, Constraints, Validation, Escalation, RFC Grounding (max score: 6).
- Risk bands: High (0-3), Medium (4), Low (5-6).

## Inventory Matrix

| Asset | Type | Score | Risk | Gaps |
|-------|------|-------|------|------|
| `.github/agents/backend-expert.agent.md` | agent | 6/6 | Low | None |
| `.github/agents/code-reviewer.agent.md` | agent | 5/6 | Low | RFC Grounding |
| `.github/agents/docs-writer.agent.md` | agent | 6/6 | Low | None |
| `.github/agents/frontend-expert.agent.md` | agent | 6/6 | Low | None |
| `.github/agents/full-stack-planner.agent.md` | agent | 5/6 | Low | RFC Grounding |
| `.github/agents/infra-expert.agent.md` | agent | 5/6 | Low | RFC Grounding |
| `.github/instructions/agent-governance.instructions.md` | instruction | 6/6 | Low | None |
| `.github/instructions/backend.instructions.md` | instruction | 6/6 | Low | None |
| `.github/instructions/bicep.instructions.md` | instruction | 4/6 | Medium | Escalation, RFC Grounding |
| `.github/instructions/code-review.instructions.md` | instruction | 6/6 | Low | None |
| `.github/instructions/components.instructions.md` | instruction | 3/6 | High | Required Inputs, Escalation, RFC Grounding |
| `.github/instructions/csharp.instructions.md` | instruction | 6/6 | Low | None |
| `.github/instructions/frontend.instructions.md` | instruction | 5/6 | Low | Escalation |
| `.github/instructions/react.instructions.md` | instruction | 4/6 | Medium | Escalation, RFC Grounding |
| `.github/instructions/typescript.instructions.md` | instruction | 5/6 | Low | Escalation |
| `.github/instructions/workflows.instructions.md` | instruction | 6/6 | Low | None |
| `.github/prompts/api-endpoint.prompt.md` | prompt | 3/6 | High | Constraints, Escalation, RFC Grounding |
| `.github/prompts/comment-standard.prompt.md` | prompt | 5/6 | Low | Escalation |
| `.github/prompts/migration.prompt.md` | prompt | 3/6 | High | Constraints, Escalation, RFC Grounding |
| `.github/prompts/new-page.prompt.md` | prompt | 2/6 | High | Required Inputs, Constraints, Escalation, RFC Grounding |
| `.github/prompts/refactor.prompt.md` | prompt | 3/6 | High | Constraints, Escalation, RFC Grounding |
| `.github/prompts/unit-test.prompt.md` | prompt | 5/6 | Low | RFC Grounding |
| `.github/skills/ddd-service/SKILL.md` | skill | 4/6 | Medium | Escalation, RFC Grounding |
| `.github/skills/i18n-page/SKILL.md` | skill | 4/6 | Medium | Constraints, Escalation |
| `.github/skills/react-component/SKILL.md` | skill | 3/6 | High | Constraints, Escalation, RFC Grounding |
| `.github/skills/zustand-store/SKILL.md` | skill | 4/6 | Medium | Constraints, Escalation |

## Ranked Remediation Backlog

| Priority | Asset | Risk | Primary Gaps | Recommended Owner |
|----------|-------|------|--------------|-------------------|
| P01 | `.github/prompts/new-page.prompt.md` | High | Required Inputs, Constraints, Escalation, RFC Grounding | Platform Docs |
| P02 | `.github/instructions/components.instructions.md` | High | Required Inputs, Escalation, RFC Grounding | Platform Docs |
| P03 | `.github/prompts/api-endpoint.prompt.md` | High | Constraints, Escalation, RFC Grounding | Platform Docs |
| P04 | `.github/prompts/migration.prompt.md` | High | Constraints, Escalation, RFC Grounding | Platform Docs |
| P05 | `.github/prompts/refactor.prompt.md` | High | Constraints, Escalation, RFC Grounding | Platform Docs |
| P06 | `.github/skills/react-component/SKILL.md` | High | Constraints, Escalation, RFC Grounding | Skill Maintainers |
| P07 | `.github/instructions/bicep.instructions.md` | Medium | Escalation, RFC Grounding | Platform Docs |
| P08 | `.github/instructions/react.instructions.md` | Medium | Escalation, RFC Grounding | Platform Docs |
| P09 | `.github/skills/ddd-service/SKILL.md` | Medium | Escalation, RFC Grounding | Skill Maintainers |
| P10 | `.github/skills/i18n-page/SKILL.md` | Medium | Constraints, Escalation | Skill Maintainers |
| P11 | `.github/skills/zustand-store/SKILL.md` | Medium | Constraints, Escalation | Skill Maintainers |

## Observations

- Prompt templates currently have the largest governance gaps (especially escalation and RFC grounding).
- Skills are strong on examples, but most are missing explicit escalation criteria and strict constraint sections.
- Several instruction files are comprehensive but do not consistently define escalation paths.
- Agent files are generally complete but a subset still lacks direct RFC-grounding clauses.