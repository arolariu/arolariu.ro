# Reproduction Ladder

Use the highest available rung. Progress only when the current rung is
unavailable or cannot represent the reported boundary, and record why.

## Evidence Required at Every Rung

- Exact input, state, actor/ownership context, and environment assumptions.
- Expected outcome and its source of authority.
- Actual outcome, including the first relevant failure rather than only a
  downstream cascade.
- Repeatability: rerun the same step or explain why the event is inherently
  single-shot.
- Scope: the smallest file/test/endpoint/runtime surface that still exhibits
  the defect.

## Ordered Rungs

| Rung | Use when | Action | Evidence gate before progressing |
| --- | --- | --- | --- |
| 1. Existing failing targeted test | A current unit, integration, contract, E2E, build, or extension test already represents the report | Run the narrowest existing selection unchanged and inspect its first causal failure | Capture test identity, assertion/diagnostic, input, and repeat result. Do not edit until the failure matches the report. |
| 2. Minimal new regression test | No existing test reaches the behavior, but the public boundary is testable deterministically | Add one focused test using current builders and real repository modules; run it before the fix | It must fail at the expected assertion for the suspected invariant, not because of setup, imports, missing fixtures, or an unrelated warning. |
| 3. Deterministic command or API reproduction | The defect belongs to build/generation/tooling or a protocol boundary not economically represented by a unit | Use the smallest live repository command or direct request with fixed inputs and controlled state | Record invocation/request shape, exit/status/result, first diagnostic, and a second consistent run. Do not copy global command lists into the bug artifact. |
| 4. Controlled local runtime observation | Hydration, browser lifecycle, worker timing, DI startup, provider emulator, or middleware is essential | Start only the owning local surface, establish known state, perform one scripted/manual sequence, and collect bounded logs/trace/UI evidence | Record startup health, sequence, state reset, timestamp/correlation needed to link evidence, and repeated outcome. Rule out stale build/state before moving on. |
| 5. External evidence | Local reproduction is impossible because the required provider, production-only state, or one-time event cannot be recreated safely | Use sanitized logs, traces, request/response metadata, screenshots, or provider diagnostics supplied through approved channels | Mark the defect “not locally reproduced,” identify exactly what the evidence proves and does not prove, and stop if more than one root cause remains plausible. |

## Ladder Rules

- Never skip directly to runtime observation because it feels faster; a
  targeted test yields stronger repeatable evidence.
- A setup failure is not reproduction. Fix or classify the setup separately.
- Do not broaden from a target test to an entire suite merely to obtain more
  output.
- Do not use retries, sleeps, random inputs, or assertion weakening to make a
  failure appear deterministic.
- External evidence must exclude secrets, tokens, personal data, and payload
  content not required to prove the defect.
- Once one rung proves the behavior, stop climbing and diagnose from that
  artifact.
