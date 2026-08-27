---
name: code-unit-test
description: Add or improve focused tests for already-correct behavior across TypeScript/React/Svelte/Node, .NET/MSTest, and Python/FastAPI/pytest; route production defects to code-fix-bug.
---

# Code Unit Test

## When to Use

- Adding coverage for existing, already-correct behavior
- Pinning already-correct behavior against a prior regression
- Testing an edge/error case
- Improving a brittle test

## When Not to Use

- Use `code-fix-bug` when production behavior is defective and must change.
- Use `code-fix-bug` when fail-without/pass-with proof or any production correction
  is required.
- Use an integration, contract, or E2E workflow when the behavior only exists
  across HTTP middleware, provider serialization, persistence, browser
  navigation, or deployment/runtime boundaries.
- Do not use this skill to modify production behavior, add a dependency, or
  manufacture coverage by testing implementation details.
- Do not use it to replace repository modules with mocks.

## Required Inputs

- The source or public behavior under test and its current consumers.
- The expected observable outcome and the authority for that expectation.
- The nearest colocated or sibling test, current builders/fixtures, and test
  setup for the affected stack.
- Root and local testing guidance plus matching TypeScript/React/frontend/
  Svelte, C#/backend, or Python instructions.
- The smallest existing runner selection that can exercise the behavior.

## Decision Points

Before writing assertions, decide:

1. Whether the behavior belongs in a unit/component test or requires an
   integration, contract, or E2E boundary.
2. What the smallest public behavior boundary is: pure function, rendered
   user outcome, hook lifecycle, store contract, transport parser, service
   method, or protocol mapper.
3. Which runtime artifact applies: TypeScript/React/Svelte/Node, .NET/MSTest,
   or Python/FastAPI/pytest; do not preload unrelated stack guidance.
4. Whether any test double is truly required. Vitest module replacement,
   configured aliases to repository substitutes, and fake implementations of
   repository code are prohibited seams and cannot prove behavior owned by the
   replaced module. An injected C# direct-layer contract is a unit seam only
   when coordination or classification owned by the real service is the
   behavior being proved.
5. Which fixture values must be deterministic and which current builder
   preserves the production type's invariants.
6. Whether the requested test exposes a production defect. A test-only task
   reports that defect instead of changing application code.

## Core Procedure

1. Read the implementation, public consumers, current sibling tests, nearest
   guides, test setup, and relevant recent file history.
2. Select the test level and smallest observable boundary before selecting a
   file or mock.
3. Choose only the applicable behavior categories from the stack matrix.
4. Reuse real repository code and a deterministic live builder or a minimal
   typed fixture. If considering any double, classify the boundary first.
5. Write one focused Arrange/Act/Assert test. Name the condition and observable
   result; avoid assertions that can pass without executing the behavior.
6. Demonstrate assertion sensitivity without changing production: use
   contrasting inputs that take different public branches, assert the initial
   and changed outcomes, and add a negative assertion for any forbidden
   output, state, or side effect.
7. If the new test instead exposes a production defect, stop and route the
   evidence to `code-fix-bug`. Never mutate correct production code or create an
   inverse production change merely to manufacture a red run.
8. Add only the remaining cases needed for the selected behavior categories.
   Include cleanup, exact failures, and negative assertions when they are part
   of the contract.
9. Run the smallest targeted selection. If the test reveals a production
   defect, stop the test-only change and report the evidence.
10. Inspect the final test diff for repository-module mocks, nondeterminism,
   weakened assertions, leaked state, and unrelated production edits.

## Resource Triggers

Load only the resource named by the current decision or failure:

| Named trigger | Resource |
| --- | --- |
| Before selecting unit, component, integration, contract, or E2E coverage | [Test-type decision table](references/test-type-decision-table.md) |
| Whenever introducing or retaining any test double, fake timer, browser/runtime shim, external storage implementation, or injected dependency substitute | [Mock-boundary catalog](references/mock-boundary-catalog.md) |
| After confirming a TypeScript, React, Svelte, worker, or Node boundary | [TypeScript test decisions](references/typescript-tests.md) |
| After confirming a .NET/MSTest boundary | [.NET MSTest guidance](references/dotnet-mstest.md) |
| After confirming a Python/FastAPI/pytest boundary | [Python pytest guidance](references/python-pytest.md) |
| A current sibling test or deterministic builder is needed | [Live tests and builders](examples/live-tests-and-builders.md) |
| A live sibling confirms the same stable Vitest, Testing Library, or MSTest shape | [Stable test patterns](templates/stable-test-patterns.md) |
| Only after a concrete runner, environment, timer, async, mock, browser API, discovery, assertion, or coverage failure | [Test troubleshooting](references/troubleshooting.md) |

Do not open troubleshooting during a successful routine test task.

## Verification

- The test is at the smallest boundary that can prove the behavior.
- TypeScript/React/Svelte/Node tests use the owning configured environment and
  assert public/user-observable behavior.
- .NET tests use the current MSTest shape and exact exception/identity
  assertions when classification is the contract.
- Python tests use `*.test.py`, the configured import mode, and `TestClient`
  only when HTTP/middleware behavior is the contract.
- Fixtures are deterministic and preserve live domain invariants.
- Repository implementations execute for repository behavior; only an
  approved boundary is substituted.
- Already-correct coverage is demonstrably branch-sensitive through
  contrasting inputs, pre/post outcomes, or a contract-relevant negative
  assertion; no production mutation was used to create a red run.
- The targeted selection passes without weakened assertions, leaked state,
  unhandled asynchronous work, or unrelated file changes.

## Stop and Ask

- Production behavior must change under a test-only request.
- A new dependency or test framework/configuration change is required.
- The expected behavior conflicts with live source, an accepted RFC, or an
  intentionally different existing assertion.
- The only apparent seam requires mocking repository modules or exposing
  production internals.
- Authentication/security, schema/data, infrastructure, or public-contract
  behavior must change.

## Completion Contract

Report the behaviors covered, selected test boundary, fixtures and approved
external seams used, targeted test evidence, and only material residual risk
or incomplete validation.
