# Identity module

[deploymentFile.bicep](deploymentFile.bicep) creates managed identities, existing GitHub environment federation, Graph security groups, and
the experiments Entra application/service principal. Azure RBAC and SQL grants are owned by the dependent resource modules.

## Managed-identity contract

The `managedIdentitiesList` order is fixed:

| Index | Name                                   | Role                                                                                  |
| ----- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| 0     | `<resourcePrefix>-uami-frontend`       | Production/development website runtime.                                               |
| 1     | `<resourcePrefix>-uami-backend`        | API/experiments runtime and backend data-access probe.                                |
| 2     | `<resourcePrefix>-uami-infrastructure` | GitHub CI login, SQL administration, configuration ownership, and applicable scripts. |

Each entry includes `name`, `displayName`, `resourceId`, `clientId`, and `principalId`. Use **resource IDs** for identity attachment,
**client IDs** for credential/ACR selection, and **principal IDs** for RBAC, SQL administrator, and allowed-caller policy. These values are
not interchangeable. Domains must look up the same infrastructure identity created by Foundation.

Only the infrastructure identity receives GitHub federation, with issuer `https://token.actions.githubusercontent.com`, audience
`api://AzureADTokenExchange`, and the existing subjects:

- `repo:arolariu/arolariu.ro:environment:development`
- `repo:arolariu/arolariu.ro:environment:production`

The two credentials are serialized to avoid concurrent child-write conflicts. Legacy frontend/backend GitHub secret names used for Azure
login must contain the **infrastructure** client ID; runtime identities are separately supplied by App Service settings.

## Experiments registration

[expApplication.bicep](expApplication.bicep) creates the stable namespace-keyed application;
[expApplicationExposure.bicep](expApplicationExposure.bicep) configures `api://<generated-client-id>` and the enabled service principal. The
registration is tenant-only, requests v2 access tokens, and has no password/certificate credential. Outputs are `expEntraAppClientId` and
`expEntraServicePrincipalId`.

The generated application client ID is the experiments audience, not a UAMI selector. Foundation supplies it as `EXP_ENTRA_APP_CLIENT_ID` to
the experiments site and its website/API callers. Blank legacy configuration retains the existing legacy audience in those consumers;
malformed nonempty Azure configuration fails safely. Local proxy behavior is unchanged.

[securityGroups.bicep](securityGroups.bicep) preserves the manually managed Graph groups. It does not automate membership, PIM, or
tenant-wide deployment authority. Graph resources use the stable `v1.0:1.0.0` extension and `@v1.0` API; the deployer needs separately
approved Graph permissions.

Permanent workload/CI identities, server administration, and resource-scoped grants are not disposable bootstrap resources. Entra
application/group lifecycle is also distinct from resource-group deletion. Follow the [deployment guide](../DEPLOYMENT_GUIDE.md) for
approved targets, handoffs, and observed cleanup of only the exact script execution resources.
