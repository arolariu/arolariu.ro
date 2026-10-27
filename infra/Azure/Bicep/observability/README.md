# Observability module

[deploymentFile.bicep](deploymentFile.bicep) provisions Log Analytics first, then workspace-linked Application Insights. It does not deploy
a standalone Managed Grafana instance, alert rules, or arbitrary resource diagnostic settings.

| Owner                                                    | Current source settings                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [log-analytics.bicep](log-analytics.bicep)               | `<resourcePrefix>-workspace`, PerGB2018, 30-day retention, 3 GB daily ingestion cap, resource-permission access, public ingestion/query.         |
| [application-insights.bicep](application-insights.bicep) | `<resourcePrefix>-insights`, web application, workspace-linked LogAnalytics ingestion, 90-day component retention setting, 30% sampling setting. |

The orchestrator accepts `resourceConventionPrefix`, `resourceLocation`, and `resourceDeploymentDate`. Outputs are
`logAnalyticsWorkspaceId`, `appInsightsConnectionString`, and `appInsightsName`. Foundation forwards the actual telemetry endpoint/settings
to App Services and App Configuration; applications retain their existing OpenTelemetry instrumentation.

Provisioning these resources does not prove that application telemetry is arriving or that every Azure resource emits diagnostics. After the
normal application releases, check recent requests/dependencies/exceptions in the actual workspace and verify configured sampling,
retention, access, and ingestion caps before attributing missing events to an application failure.

Dashboard/alert/diagnostic expansion, retention changes, or cap changes require a separate approved scope/cost decision. Do not use
historical Grafana examples or cost estimates as current deployment instructions. Follow the
[fresh deployment guide](../DEPLOYMENT_GUIDE.md) for stage ownership, validation, and readiness boundaries.
