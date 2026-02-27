# RBAC Module — Resource-Scoped Role Assignments

This module manages Role-Based Access Control (RBAC) assignments for managed identities across the arolariu.ro platform. All role assignments are **scoped to individual Azure resources** (not the resource group) following the principle of least privilege.

## Architecture

RBAC assignments are co-located with the resources they protect. Each file assigns roles scoped to a single Azure resource type using the `existing` keyword and `scope:` property. Role definition GUIDs are imported from `constants/roles.bicep` (single source of truth).

```
facade.bicep
  ├── identity/ → creates UAMIs
  ├── storage/  → creates resources
  ├── ...
  └── rbac/     → assigns roles scoped to each resource (after creation)
```

## Module Files

| File | Target Resource | Assignments |
|------|----------------|-------------|
| `storage-rbac.bicep` | Storage Account | 9 (frontend/backend/infra) |
| `container-registry-rbac.bicep` | Container Registry | 4 (frontend/backend/infra) |
| `key-vault-rbac.bicep` | Key Vault | 3 (backend/infra) |
| `app-configuration-rbac.bicep` | App Configuration | 3 (frontend/backend/infra) |
| `sql-server-rbac.bicep` | SQL Server | 1 (backend) |
| `cosmos-db-rbac.bicep` | Cosmos DB | 1 (backend) |
| `openai-rbac.bicep` | Azure OpenAI | 1 (backend) |
| `websites-rbac.bicep` | App Services (looped) | 1 per web app (infra) |
| `sql-rbac-uami.sql` | SQL database-level roles | N/A |
| **Total** | | **22 fixed + 1 per web app (Website Contributor)** |

## Identity Roles Summary

### Frontend Identity (read-heavy, minimal write)

| Resource | Role | Purpose |
|----------|------|---------|
| Storage Account | Blob Data Contributor | Read + write user-uploaded invoices |
| Storage Account | Queue Data Reader | Status polling |
| Storage Account | Table Data Reader | Feature flags, metadata |
| App Configuration | Data Reader | Read settings |
| Container Registry | ACR Pull | Pull container images |

### Backend Identity (data plane access)

| Resource | Role | Purpose |
|----------|------|---------|
| Storage Account | Blob Data Owner | Full blob access + ACL |
| Storage Account | Queue Data Contributor | Async processing |
| Storage Account | Table Data Contributor | Entity CRUD |
| SQL Server | SQL DB Contributor | Database operations |
| Cosmos DB | Data Operator | Document CRUD |
| App Configuration | Data Owner | Read + write settings |
| Key Vault | Secrets User | Read secrets at runtime |
| Azure OpenAI | OpenAI User | API inference calls |
| Container Registry | ACR Pull | Pull container images |

### Infrastructure Identity (CI/CD)

| Resource | Role | Purpose |
|----------|------|---------|
| Storage Account | Blob Data Reader | Deployment verification |
| Storage Account | Queue Data Reader | Deployment verification |
| Storage Account | Table Data Reader | Deployment verification |
| App Configuration | Data Reader | Deployment settings |
| Key Vault | Reader | Discover metadata |
| Key Vault | Secrets User | Read secrets for deployment |
| Container Registry | ACR Push | Push built images |
| Container Registry | ACR Pull | Pull base images |
| App Services | Website Contributor | Deploy web apps (per app) |

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

The old assignments use `guid(resourceGroup().id, ...)` as their name seed; the new ones use `guid(resource.id, ...)`. Both may coexist temporarily — the old ones are redundant but not harmful.

## References

- [Azure RBAC Best Practices](https://learn.microsoft.com/azure/role-based-access-control/best-practices)
- [Built-in Azure Roles](https://learn.microsoft.com/azure/role-based-access-control/built-in-roles)
- [Bicep RBAC Scenarios](https://learn.microsoft.com/azure/azure-resource-manager/bicep/scenarios-rbac)

---

**Module Version**: 3.0.0
**Last Updated**: February 2026
