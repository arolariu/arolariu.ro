# RBAC Module — Resource-Scoped Role Assignments

Resource-scoped grants for the frontend, backend, and infrastructure identities. Database-contained SQL users are a separate operational
task, not an Azure management-plane role assignment.

## Architecture

The facade invokes individual RBAC files after their resource/identity outputs exist. Role identifiers come from `constants/roles.bicep`;
assignments use deterministic resource/principal/role GUIDs and `ServicePrincipal` principal types.

```text
facade.bicep
  -> identity and resource modules
  -> resource-scoped RBAC files
  -> sites and their runtime identities
```

## Module Files

| File                            | Scope and purpose                                                            |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `storage-rbac.bicep`            | Storage-account blob/queue/table data roles.                                 |
| `container-registry-rbac.bicep` | Registry push/pull.                                                          |
| `app-configuration-rbac.bicep`  | Store readers/owners.                                                        |
| `key-vault-rbac.bicep`          | Vault metadata/secret access.                                                |
| `cosmos-db-rbac.bicep`          | Native SQL data-contributor grant at `/dbs/primary`.                         |
| `ai-rbac.bicep`                 | Backend Cognitive Services User and Azure AI User on the account.            |
| `websites-rbac.bicep`           | Infrastructure Website Contributor per App Service.                          |
| `app-insights-rbac.bicep`       | Monitoring access at the component.                                          |
| `sql-rbac-uami.sql`             | Restored unchanged manual reference, not an idempotent executable bootstrap. |

The inline `sql-server-rbac.bicep` deployment script has been removed. There is no management-plane SQL DB Contributor substitute: that role
would not establish backend database authentication.

## Identity Roles Summary

### Frontend Identity (read-heavy, minimal write)

| Resource             | Grant                                                        |
| -------------------- | ------------------------------------------------------------ |
| Storage              | Blob Data Contributor, Queue Data Reader, Table Data Reader. |
| ACR                  | Pull.                                                        |
| App Configuration    | Data Reader.                                                 |
| Application Insights | Existing scoped monitoring access.                           |

### Backend Identity (data plane access)

| Resource                      | Grant                                                            |
| ----------------------------- | ---------------------------------------------------------------- |
| Storage                       | Blob Data Owner, Queue Data Contributor, Table Data Contributor. |
| Cosmos                        | Native Data Contributor at `/dbs/primary`.                       |
| App Configuration / Key Vault | Data Owner / Secrets User.                                       |
| AI Foundry                    | Cognitive Services User, Azure AI User.                          |
| ACR / monitoring              | Existing scoped pull/monitoring access.                          |

SQL reader/writer/DDL memberships require separately approved contained-user provisioning and real backend login proof; Bicep no longer
creates or verifies those users.

### Infrastructure Identity (CI/CD)

| Resource          | Grant                                                            |
| ----------------- | ---------------------------------------------------------------- |
| Storage           | Blob/queue/table readers.                                        |
| ACR               | Push and pull.                                                   |
| App Configuration | Permanent Data Owner.                                            |
| Key Vault         | Metadata Reader and permanent Secrets Officer.                   |
| SQL               | Permanent Entra administrator configured by the server resource. |
| Sites             | Website Contributor per app.                                     |

These are not temporary bootstrap-only identities/roles. No subscription-wide Owner/Contributor assignment is added.

## How to Add a New Role Assignment

Obtain approval for the exact identity, role, and resource scope. Add a shared role constant if necessary and follow the existing pattern:

```bicep
resource assignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: targetResource
  name: guid(targetResource.id, principalId, roleId)
  properties: {
    principalId: principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleId)
  }
}
```

## Cleanup: Remove Old RG-Scoped Assignments

Production permission migration is not part of this fresh definition. Do not automatically delete old assignments or infer that all
resource-group-scoped roles are redundant. Any cleanup needs an exact-ID review and separate authorization.

Actual future PowerShell/deployment-script execution cleanup is also a separate concern; no execution container/storage is created by the
current graph.

## References

- [Azure RBAC best practices](https://learn.microsoft.com/azure/role-based-access-control/best-practices)
- [Built-in security roles](https://learn.microsoft.com/azure/role-based-access-control/built-in-roles/security)
- [Cosmos native data-plane security](https://learn.microsoft.com/azure/cosmos-db/nosql/security/how-to-grant-data-plane-access)
- [Deployment guide](../DEPLOYMENT_GUIDE.md)

---

**Module Version**: 3.0.0\
**Last Updated**: October 2026
