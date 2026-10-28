# Configuration module

This module provisions App Configuration and Key Vault. [Foundation](../foundation.bicep) separately invokes the inline
[configuration bootstrap](../bootstrap/configuration.bicep) after resolved resources, scoped writer grants, and backend access probes are
ready. Provisioning a store is not the same as populating it.

## Ownership

| File                                                                                                                                       | Responsibility                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| [deploymentFile.bicep](deploymentFile.bicep)                                                                                               | Compose the two stores and emit their names/endpoints.                                                   |
| [appConfiguration.bicep](appConfiguration.bicep)                                                                                           | Free store, local authentication disabled, managed-identity access.                                      |
| [keyVault.bicep](keyVault.bicep)                                                                                                           | Standard vault, RBAC authorization, soft delete (90 days), purge protection.                             |
| [appConfiguration.json](appConfiguration.json)                                                                                             | Meaningful non-secret static defaults.                                                                   |
| [../bootstrap/configuration.bicep](../bootstrap/configuration.bicep)                                                                       | Resolved runtime values, internal JWT generation, secure AI-key storage, and typed Key Vault references. |
| [../rbac/app-configuration-rbac.bicep](../rbac/app-configuration-rbac.bicep), [../rbac/key-vault-rbac.bicep](../rbac/key-vault-rbac.bicep) | Resource-scoped permanent application/bootstrap permissions.                                             |

Stores retain their current public-network posture. This graph does not create access policies, connection-string authentication,
configuration snapshots, or private endpoints. Consumers resolve the required Key Vault references with their permitted identity; App
Configuration does not grant secret access simply because it stores a reference.

## Populated values

DEVELOPMENT and PRODUCTION receive actual tenant/subscription IDs, backend managed-identity selection, passwordless SQL settings, raw Cosmos
endpoint, blob endpoint, AI endpoint, telemetry, and application URLs. The bootstrap writes typed versionless Key Vault references, not
empty Azure endpoint placeholders. The experiments registration ID is also supplied directly to the website/API runtime through
`EXP_ENTRA_APP_CLIENT_ID`.

| Secret names                                                          | Owner and rerun behavior                                                                                                                             |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRODUCTION-JWT-SECRET`                                               | Shared API signing material for both website labels; generated from 64 random bytes only when absent/known-placeholder. Existing keys are preserved. |
| `DEVELOPMENT-CognitiveServicesKey`, `PRODUCTION-CognitiveServicesKey` | Actual deployed AI account key, supplied through secure template output/parameter/environment channels.                                              |
| `DEVELOPMENT-ClerkPublishableKey`, `PRODUCTION-ClerkPublishableKey`   | Operator-owned; never overwritten.                                                                                                                   |
| `DEVELOPMENT-ClerkSecretKey`, `PRODUCTION-ClerkSecretKey`             | Operator-owned; never overwritten.                                                                                                                   |
| `DEVELOPMENT-ResendKey`, `PRODUCTION-ResendKey`                       | Optional operator-owned email credentials; never overwritten. Missing/known-placeholder values produce an ordinary empty setting, disabling email.   |

The bootstrap reports missing/known-placeholder external values by **name only** in `pendingExternalSecretNames`. A secret-GET 404 can mean
absence; a 403 or generic service failure cannot. Real JWTs are not automatically rotated on a deployment rerun. Versionless references
allow later secret versions to be resolved, but consumers still need their normal refresh/restart behavior; zero-downtime rotation is not
implied.

Both website labels call the same API and therefore use its signing key. Any previously stored `DEVELOPMENT-JWT-SECRET` is left untouched,
not deleted or rotated; a fresh deployment does not generate an unused development key. Missing optional Resend values are still reported by
name, but their ordinary empty settings do not cause eager Key Vault resolution failures or block startup once required Clerk values are
supplied.

The infrastructure identity intentionally retains App Configuration Data Owner and Key Vault Secrets Officer for repeatable configuration
ownership. The backend retains its existing Data Owner/Secrets User access; the frontend reads permitted configuration through the
established proxy path. There is no temporary configuration-writer identity or role to clean up.

## Inputs, outputs, and failures

The provisioning orchestrator accepts `resourceConventionPrefix`, `resourceLocation`, and `resourceDeploymentDate`. It emits `keyVaultName`,
`keyVaultUri`, `appConfigurationName`, and `appConfigurationEndpoint`; the bootstrap emits completion, pending external secret names, and
exact execution-resource IDs. Ordinary deployment outputs do not expose credentials or deployment tokens.

Propagation retries and execution deadlines are bounded. Classified authorization/service failures fail Foundation rather than returning a
success-shaped empty configuration. Inspect safe failure categories and exact scoped grants; do not print secret bodies, enable local
authentication, grant subscription-wide permissions, or silently replace operator values.

For deployment, registrar/GitHub handoffs, approved reruns, and observed ACI/backing-storage cleanup on success and failure, follow the
[fresh deployment guide](../DEPLOYMENT_GUIDE.md).
