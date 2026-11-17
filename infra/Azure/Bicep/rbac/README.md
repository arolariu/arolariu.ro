# RBAC Module — Resource-Scoped Role Assignments

This module manages Role-Based Access Control (RBAC) assignments for managed identities across the arolariu.ro platform. All role
assignments are **scoped to individual Azure resources** (not the resource group) following the principle of least privilege.

## Architecture

RBAC assignments are co-located with the resources they protect. Each file assigns roles scoped to a single Azure resource type using the
`existing` keyword and `scope:` property. Role definition GUIDs are imported from `constants/roles.bicep` (single source of truth).

```
facade.bicep
  ├── identity/ → creates UAMIs
  ├── storage/  → creates resources
  ├── ...
  └── rbac/     → assigns roles scoped to each resource (after creation)
```

## Module Files

| File                            | Target Resource                       | Assignments                                                                     |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- |
| `storage-rbac.bicep`            | Storage Account                       | 9 (frontend/backend/infra)                                                      |
| `container-registry-rbac.bicep` | Container Registry                    | 7 (frontend/backend/infra)                                                      |
| `key-vault-rbac.bicep`          | Key Vault                             | 3 (backend/infra)                                                               |
| `app-configuration-rbac.bicep`  | App Configuration                     | 4 (frontend/backend/infra)                                                      |
| `sql-server-rbac.bicep`         | SQL Server                            | 1 (backend)                                                                     |
| `cosmos-db-rbac.bicep`          | Cosmos DB                             | 1 (backend)                                                                     |
| `ai-rbac.bicep`                 | Azure AI Foundry (AIServices account) | 2 (backend)                                                                     |
| `websites-rbac.bicep`           | App Services (looped)                 | 1 per web app (infra)                                                           |
| `app-insights-rbac.bicep`       | Application Insights                  | 3 (frontend/backend/infra, looped)                                              |
| `sql-rbac-uami.sql`             | SQL database-level roles              | N/A (applied manually; no Bicep module runs it)                                 |
| **Total**                       |                                       | **30 fixed + 1 per web app (Website Contributor; currently 4 apps → 34 total)** |

## Identity Roles Summary

### Frontend Identity (read-heavy, minimal write)

| Resource             | Role                                          | Purpose                             |
| -------------------- | --------------------------------------------- | ----------------------------------- |
| Storage Account      | Blob Data Contributor                         | Read + write user-uploaded invoices |
| Storage Account      | Queue Data Reader                             | Status polling                      |
| Storage Account      | Table Data Reader                             | Feature flags, metadata             |
| App Configuration    | Data Reader                                   | Read settings                       |
| Container Registry   | ACR Pull                                      | Pull container images               |
| Container Registry   | ACR repository reader (`acrRepositoryReader`) | List repositories/tags              |
| Application Insights | Monitoring Metrics Publisher                  | Publish telemetry metrics           |

### Backend Identity (data plane and management access)

| Resource             | Role                                                        | Purpose                                            |
| -------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| Storage Account      | Blob Data Owner                                             | Full blob access + ACL                             |
| Storage Account      | Queue Data Contributor                                      | Async processing                                   |
| Storage Account      | Table Data Contributor                                      | Entity CRUD                                        |
| SQL Server           | SQL DB Contributor                                          | Manage databases (no data access)                  |
| Cosmos DB            | Cosmos DB Operator (`cosmosDbDataOperator`)                 | Manage the account (no data access)                |
| App Configuration    | Data Reader                                                 | Read settings                                      |
| App Configuration    | App Configuration Contributor (`appConfigurationDataOwner`) | Manage the store (no key-value access)             |
| Key Vault            | Secrets User                                                | Read secrets at runtime                            |
| Azure AI Foundry     | Cognitive Services User                                     | Document Intelligence analysis                     |
| Azure AI Foundry     | `azureAiUser` (matches no built-in role)                    | Intended for inference (incl. OpenAI model-router) |
| Container Registry   | ACR Pull                                                    | Pull container images                              |
| Container Registry   | ACR repository reader (`acrRepositoryReader`)               | List repositories/tags                             |
| Application Insights | Monitoring Metrics Publisher                                | Publish telemetry metrics                          |

### Infrastructure Identity (CI/CD)

| Resource             | Role                                          | Purpose                     |
| -------------------- | --------------------------------------------- | --------------------------- |
| Storage Account      | Blob Data Reader                              | Deployment verification     |
| Storage Account      | Queue Data Reader                             | Deployment verification     |
| Storage Account      | Table Data Reader                             | Deployment verification     |
| App Configuration    | Data Reader                                   | Deployment settings         |
| Key Vault            | Reader                                        | Discover metadata           |
| Key Vault            | Secrets User                                  | Read secrets for deployment |
| Container Registry   | ACR Push                                      | Push built images           |
| Container Registry   | ACR Pull                                      | Pull base images            |
| Container Registry   | ACR repository reader (`acrRepositoryReader`) | List repositories/tags      |
| App Services         | Website Contributor                           | Deploy web apps (per app)   |
| Application Insights | Monitoring Metrics Publisher                  | Publish telemetry metrics   |

### Role IDs That Differ From Their Constant Names

`constants/roles.bicep` holds the role IDs that the modules assign. Three constants are named after a different role than the one their ID
identifies, and the tables above follow the ID:

| Constant                    | Role ID                                | Azure built-in role with that ID                                                  |
| --------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| `cosmosDbDataOperator`      | `230815da-be43-4aae-9cb4-875f7bd000aa` | Cosmos DB Operator: manages accounts, no data access                              |
| `appConfigurationDataOwner` | `fe86443c-f201-4fc4-9d2a-ac61149fbda0` | App Configuration Contributor: management only, no key-value access               |
| `azureAiUser`               | `a2c28859-6249-4e0c-8e86-a0b5ad18e86f` | None (Azure AI User, now Foundry User, is `53ca6127-db72-4b80-b1b0-d745d6d5456d`) |

The comments in `cosmos-db-rbac.bicep`, `app-configuration-rbac.bicep` and `ai-rbac.bicep` describe data-plane access that these IDs do not
grant. The Cosmos DB account sets `disableLocalAuth: true`, and no Bicep module creates the Cosmos DB SQL role assignment that data-plane
access then requires. The backend identity, which the exp configuration proxy also runs as, reads App Configuration key-values through App
Configuration Data Reader and has no write role.

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

## Cleanup: Remove Old RG-Scoped Assignments

After deploying the new resource-scoped RBAC, remove the orphaned resource-group-level assignments:

```bash
# List all RG-scoped role assignments for managed identities
az role assignment list --resource-group arolariu-rg --query "[?principalType=='ServicePrincipal']" --output table

# Delete a specific old assignment by ID
az role assignment delete --ids <assignment-id>
```

The old assignments use `guid(resourceGroup().id, ...)` as their name seed; the new ones use `guid(resource.id, ...)`. Both may coexist
temporarily — the old ones are redundant but not harmful.

## References

- [Azure RBAC Best Practices](https://learn.microsoft.com/azure/role-based-access-control/best-practices)
- [Built-in Azure Roles](https://learn.microsoft.com/azure/role-based-access-control/built-in-roles)
- [Bicep RBAC Scenarios](https://learn.microsoft.com/azure/azure-resource-manager/bicep/scenarios-rbac)

---

**Module Version**: 1.0.0 (`ai-rbac.bicep`: 2.0.0)\
**Last Updated**: November 2026
