# Application hosts

[deploymentFile.bicep](deploymentFile.bicep) provisions four App Services and three Static Web Apps. Fixed names are retained for the
existing delivery workflows; name availability must be checked before a fresh deployment.

| Resource             | Purpose                          | Runtime identity                     | Port / health path        |
| -------------------- | -------------------------------- | ------------------------------------ | ------------------------- |
| `www-arolariu-ro`    | Production website.              | Frontend UAMI.                       | `3000` / `/api/health/`   |
| `dev-arolariu-ro`    | Development-labelled website.    | Frontend UAMI.                       | `3000` / `/api/health/`   |
| `api-arolariu-ro`    | API.                             | Backend UAMI.                        | `8080` / `/health`        |
| `exp-arolariu-ro`    | Experiments/configuration proxy. | Backend UAMI.                        | `8080` / `/api/health`    |
| `cv-arolariu-ro`     | CV Static Web App.               | Existing static-site delivery model. | Not an App Service probe. |
| `docs-arolariu-ro`   | Documentation Static Web App.    | Existing static-site delivery model. | Not an App Service probe. |
| `status-arolariu-ro` | Status Static Web App.           | Existing static-site delivery model. | Not an App Service probe. |

## Runtime wiring

Foundation waits for configuration bootstrap and ACR grants before composing the hosts. App Services receive actual App Configuration,
registry, telemetry, tenant/subscription, managed-identity, and experiments-audience values. Attached UAMIs use resource IDs; ACR pulls
explicitly select their **client IDs**. Principal IDs remain the values used by allowed-caller policy.

Website Node runtime uses `NODE_ENV=production` in both environments, with DEVELOPMENT/PRODUCTION configuration labels kept separate. The
API uses the production ASP.NET environment. Declared ports and health paths match the repository applications rather than generic root-path
probes. Experiments Easy Auth is explicitly enabled while preserving required authentication, excluded paths, and the same three
frontend/backend/infrastructure allowed principal IDs.

## DNS and delivery boundary

The orchestrator emits site names/default hostnames plus a typed `applicationDnsRecords` list containing current CNAME and App Service
verification IDs. Foundation's DNS owner consumes it before the registrar handoff. [Domains](../domains.bicep) separately verifies public
DNS and completes bindings/certificates; Sites does not run hostname-binding or registrar repair commands.

Bicep owns infrastructure/settings, not application image/content releases. Pre-release stack settings and the experiments hello-world image
are not health evidence. Existing workflows remain unchanged; release experiments, then API, then production/development website.
CV/docs/status content can be delivered independently once their hosts, credentials, and domains exist.

Follow the [deployment guide](../DEPLOYMENT_GUIDE.md) for legacy GitHub CI-secret mapping, external secrets, public-DNS completion,
post-release health/authorization checks, and exact script-resource cleanup. Do not interpret provisioning success as released, HTTP-healthy
applications or use manual scaling/TLS changes to bypass an unapproved plan.
