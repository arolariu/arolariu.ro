# RFC Grounding Protocol

Use this protocol for any task that affects architecture, CI/CD workflows, security posture, observability, state management, or public API contracts.

## Step-by-Step Procedure

1. **Detect impacted domain(s)** from task scope and touched files.
2. **Locate RFC candidates** using the domain map below.
3. **Read RFC + source of truth** (referenced code/config files) before making changes.
4. **Resolve conflicts correctly**:
   - If RFC and source disagree, treat source code as truth.
   - Note the RFC drift and capture a remediation task.
5. **Cite evidence** in outputs:
   - file paths read
   - commands executed
   - validation results.

## Domain to RFC Quick Map

| Domain | Typical Files | RFCs |
|--------|----------------|------|
| Workflows / CI/CD | `.github/workflows/*.yml`, `.github/actions/**` | 0001 |
| Frontend observability | `sites/arolariu.ro/src/instrumentation*`, telemetry helpers | 1001 |
| JSDoc standards | TS/TSX public APIs, typedoc configs | 1002 |
| i18n | `sites/arolariu.ro/messages/*.json`, i18n/request/providers | 1003 |
| Metadata / SEO | `sites/arolariu.ro/src/metadata.ts`, app metadata files | 1004 |
| Zustand state management | `sites/arolariu.ro/src/stores/**` | 1005 |
| Component library | `packages/components/**` | 1006 |
| Advanced frontend patterns | Next.js app and utility patterns | 1007 |
| SCSS architecture | `sites/arolariu.ro/src/styles/**`, `app/globals.scss` | 1008 |
| Backend DDD architecture | `sites/api.arolariu.ro/src/**/DDD/**` | 2001 |
| Backend OpenTelemetry | `sites/api.arolariu.ro/src/**/Telemetry/**`, extensions | 2002 |
| The Standard layering | `sites/api.arolariu.ro/src/**/Services/**`, brokers/endpoints | 2003 |
| XML documentation standards | public C# APIs across backend projects | 2004 |

## Drift Escalation Procedure

When RFC drift is detected:

1. Continue implementation based on source-of-truth code.
2. Record discrepancy with impacted RFC ID and file path evidence.
3. Create or update remediation work item for RFC alignment.
4. Mark severity:
   - **Critical**: security/deployment risk
   - **High**: architecture contract mismatch
   - **Medium**: examples/path references stale
   - **Low**: wording/style inconsistency.
