# Backend Agent Guide (api.arolariu.ro)

> .NET 10.0 / C# 13 — Modular Monolith with DDD

## Architecture — The Standard (5 layers)

```
Endpoints → Processing → Orchestration → Foundation → Brokers
```

- **Florance Pattern**: Max 2-3 dependencies per service
- **Brokers**: Thin wrappers only — NO business logic
- **TryCatch pattern** with OpenTelemetry Activity tracing on all service methods
- **No sideways calls**: Foundation↔Foundation forbidden — use Orchestration

## Commands

```bash
dotnet build src/Core                    # Build
dotnet test tests                         # Run tests
dotnet test tests --collect:"XPlat Code Coverage"  # With coverage
```

## Bounded Contexts

| Context | Project | Responsibility |
|---------|---------|---------------|
| General | `src/Core` | Infrastructure, middleware, health |
| Auth | `src/Core.Auth` | Authentication, identity |
| Invoices | `src/Invoices` | Invoice lifecycle, merchants, AI analysis |
| Common | `src/Common` | Shared DDD base classes, telemetry |

## Rules

- XML docs required on all public APIs (`<summary>`, `<param>`, `<returns>`)
- `.ConfigureAwait(false)` in all library/service async code
- No sync-over-async (`.Result`, `.Wait()`)
- `TreatWarningsAsErrors` is enabled — fix all warnings
- 85%+ test coverage target

## RFCs

Consult: 2001 (DDD), 2002 (OpenTelemetry), 2003 (The Standard), 2004 (XML docs)
