# RBAC Module — Resource-Scoped Role Assignments

This module manages Role-Based Access Control (RBAC) assignments for managed identities across the arolariu.ro platform. All role
assignments are **scoped to individual Azure resources** (not the resource group) following the principle of least privilege.

## Architecture

RBAC assignments are co-located with the resources they protect. Each file assigns roles scoped to a single Azure resource type using the
`existing` keyword and `scope:` property. Role definition GUIDs are imported from `constants/roles.bicep` (single source of truth).

SQL uses contained database users instead of a management-plane role assignment. Its inline deployment script runs as the permanent
infrastructure Entra administrator, creates the backend user by identity SID, and grants `db_datareader`, `db_datawriter`, and
`db_ddladmin`. A separate script verifies access using the backend identity itself; no manual SQL script is required.

Cosmos uses its native SQL data-contributor role scoped to `/dbs/primary`, not Azure's management-plane Operator role. The backend probe
reads account/container metadata and runs read-only queries against invoices and merchants. Additional metadata scope is not granted
implicitly if a live SDK access check fails.

```
foundation.bicep
  ├── identity/ → creates UAMIs
  ├── storage/  → creates resources
  ├── ...
  └── rbac/     → assigns roles scoped to each resource (after creation)
```

## Module Files

| File                            | Target Resource          | Assignments                                |
| ------------------------------- | ------------------------ | ------------------------------------------ |
| `storage-rbac.bicep`            | Storage Account          | 9 (frontend/backend/infra)                 |
| `container-registry-rbac.bicep` | Container Registry       | 4 (frontend/backend/infra)                 |
| `key-vault-rbac.bicep`          | Key Vault                | 3 (backend/infra)                          |
| `app-configuration-rbac.bicep`  | App Configuration        | 3 (frontend/backend/infra)                 |
| `sql-server-rbac.bicep`         | SQL application database | 3 contained database memberships (backend) |
| `cosmos-db-rbac.bicep`          | Cosmos primary database  | 1 native data-contributor role (backend)   |
| `ai-rbac.bicep`                 | AI Foundry account       | 2 (backend)                                |
| `websites-rbac.bicep`           | App Services (looped)    | 1 per web app (infra)                      |

## Identity Roles Summary

### Frontend Identity (read-heavy, minimal write)

| Resource           | Role                  | Purpose                             |
| ------------------ | --------------------- | ----------------------------------- |
| Storage Account    | Blob Data Contributor | Read + write user-uploaded invoices |
| Storage Account    | Queue Data Reader     | Status polling                      |
| Storage Account    | Table Data Reader     | Feature flags, metadata             |
| App Configuration  | Data Reader           | Read settings                       |
| Container Registry | ACR Pull              | Pull container images               |

### Backend Identity (data plane access)

| Resource           | Role                                   | Purpose                            |
| ------------------ | -------------------------------------- | ---------------------------------- |
| Storage Account    | Blob Data Owner                        | Full blob access + ACL             |
| Storage Account    | Queue Data Contributor                 | Async processing                   |
| Storage Account    | Table Data Contributor                 | Entity CRUD                        |
| SQL database       | Reader, writer, DDL admin              | Application data and EF migrations |
| Cosmos DB          | Native Data Contributor                | Document CRUD in primary database  |
| App Configuration  | Data Owner                             | Read + write settings              |
| Key Vault          | Secrets User                           | Read secrets at runtime            |
| AI Foundry         | Cognitive Services User, Azure AI User | Document analysis and inference    |
| Container Registry | ACR Pull                               | Pull container images              |

### Infrastructure Identity (CI/CD)

| Resource           | Role                | Purpose                         |
| ------------------ | ------------------- | ------------------------------- |
| Storage Account    | Blob Data Reader    | Deployment verification         |
| Storage Account    | Queue Data Reader   | Deployment verification         |
| Storage Account    | Table Data Reader   | Deployment verification         |
| SQL Server         | Entra administrator | Bootstrap contained users       |
| App Configuration  | Data Owner          | Permanent IaC settings writer   |
| Key Vault          | Reader              | Discover metadata               |
| Key Vault          | Secrets Officer     | Permanent IaC secret management |
| Container Registry | ACR Push            | Push built images               |
| Container Registry | ACR Pull            | Pull base images                |
| App Services       | Website Contributor | Deploy web apps (per app)       |

## How to Add a New Role Assignment

1. Identify the target resource and which identity needs access
2. Add the role GUID to `constants/roles.bicep` if not already present
3. Add the assignment to the appropriate `rbac/<resource>-rbac.bicep` file
4. Use this pattern:

```bicep
import { myNewRole } from '../constants/roles.bicep'

resource myAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: targetResource  // ALWAYS scope to the specific resource
  name: guid(targetResource.id, principalId, myNewRole)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', myNewRole)
    principalId: principalId
    principalType: 'ServicePrincipal'
    description: 'Identity: purpose of this access'
  }
}
```

## Fresh-deployment and cleanup boundary

This graph does not reconcile old resource-group-scoped assignments or migrate production permissions. Every permanent role above remains
after bootstrap, including SQL administration and configuration-writer access. No bootstrap-only identity or grant is created.

The backend access script verifies its own SQL login, native Cosmos metadata/data, blob list, and queue peek after the respective grants. A
failed operation does not authorize broader permissions. Provider-created script containers/backing storage are the disposable resources;
follow the [exact-ID cleanup checks](../DEPLOYMENT_GUIDE.md#6-observe-execution-resource-cleanup-on-success-and-failure) for both success
and controlled failure.

## References

- [Azure RBAC Best Practices](https://learn.microsoft.com/azure/role-based-access-control/best-practices)
- [Built-in Azure Roles](https://learn.microsoft.com/azure/role-based-access-control/built-in-roles)
- [Bicep RBAC Scenarios](https://learn.microsoft.com/azure/azure-resource-manager/bicep/scenarios-rbac)

---

**Module Version**: 3.0.0 **Last Updated**: February 2026
