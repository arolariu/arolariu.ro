# Bindings module

[Domains](../domains.bicep) invokes this module only after its public DNS readiness script succeeds. Foundation prepares hosts and
Azure-owned DNS records but creates no application hostname bindings or managed certificates.

| Files                                                                                                                                                                                                      | Responsibility                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [deploymentFile.bicep](deploymentFile.bicep)                                                                                                                                                               | Compose API, development, experiments, CV, docs, and status bindings. |
| [api-arolariu-ro-bindings.bicep](api-arolariu-ro-bindings.bicep), [api-arolariu-ro-certificate-bindings.bicep](api-arolariu-ro-certificate-bindings.bicep)                                                 | API hostname, managed certificate, then SNI binding.                  |
| [dev-arolariu-ro-bindings.bicep](dev-arolariu-ro-bindings.bicep), [dev-arolariu-ro-certificate-bindings.bicep](dev-arolariu-ro-certificate-bindings.bicep)                                                 | Development hostname, managed certificate, then SNI binding.          |
| [exp-arolariu-ro-bindings.bicep](exp-arolariu-ro-bindings.bicep), [exp-arolariu-ro-certificate-bindings.bicep](exp-arolariu-ro-certificate-bindings.bicep)                                                 | Experiments hostname, managed certificate, then SNI binding.          |
| [cv-arolariu-ro-bindings.bicep](cv-arolariu-ro-bindings.bicep), [docs-arolariu-ro-bindings.bicep](docs-arolariu-ro-bindings.bicep), [status-arolariu-ro-bindings.bicep](status-arolariu-ro-bindings.bicep) | Static Web App custom domains.                                        |

The caller supplies each App Service's **actual** `serverFarmId` separately. In particular, the API certificate must not use the development
plan. Certificate modules receive the issued, nonempty certificate thumbprint before writing `SniEnabled`; placeholders are not accepted as
successful completion.

The orchestrator also requires the existing site names, DNS zone name, resource location, and deployment timestamp. Exact parameter
names/types live in [deploymentFile.bicep](deploymentFile.bicep); it emits no application-health result. Apex/www TLS and routing belong to
the separate Front Door completion module, not an App Service binding on the main website.

For unresolved public DNS or certificate failures, follow the [staged deployment guide](../DEPLOYMENT_GUIDE.md). Do not bypass the gate with
manual hostname/SSL commands, delete a resource group as rollback, or infer application readiness from a certificate alone.
