---
description: 'Infrastructure as Code (IaC) with Bicep DSL - Best Practices and Guidelines'
applyTo: '**/*.bicep'
---

# Azure Bicep Infrastructure Guidelines

Comprehensive guidelines for the arolariu.ro Azure Bicep infrastructure-as-code.

---

## 🎯 Quick Reference

| Aspect | Value |
|--------|-------|
| **Region** | swedencentral (primary) |
| **Target Scope** | Subscription → Resource Group |
| **Entry Point** | `main.bicep` → `facade.bicep` |
| **Linting** | 33+ rules in `bicepconfig.json` |
| **Cost Target** | ~€77-82/month |

---

## 📚 Essential Context

| Resource | Location | Purpose |
|----------|----------|---------|
| README | `infra/Azure/Bicep/README.md` | Deployment guide |
| Cost Guide | `infra/Azure/Bicep/COST_OPTIMIZATION.md` | Cost management |
| Architecture | `design/bicep-infrastructure-ascii.txt` | Visual diagram |
| Bicep Config | `infra/Azure/Bicep/bicepconfig.json` | Linting rules |

---

## 📁 Project Structure

```
infra/Azure/Bicep/
├── main.bicep                    # Subscription-level entry point
├── facade.bicep                  # Main orchestration (all module deployments)
├── main.parameters.json          # Deployment parameters
├── bicepconfig.json              # Linting & experimental features
│
├── ai/                           # AI Services
│   └── deploymentFile.bicep      # Azure OpenAI, AI Foundry
│
├── bindings/                     # Custom domain bindings
│   └── deploymentFile.bicep      # SSL/TLS certificates, domain mappings
│
├── compute/                      # Compute resources
│   ├── deploymentFile.bicep      # Module entry
│   ├── appServicePlans.bicep     # Production (B2) & Development (B1) plans
│   └── README.md
│
├── configuration/                # Configuration services
│   └── deploymentFile.bicep      # App Configuration, Key Vault
│
├── identity/                     # Identity & security
│   ├── deploymentFile.bicep      # Module entry
│   ├── userAssignedIdentity.bicep # UAMIs (Frontend, Backend, Infra)
│   ├── federatedCredentials.bicep # GitHub Actions OIDC
│   ├── securityGroups.bicep      # Entra ID groups
│   └── README.md
│
├── network/                      # Networking
│   └── deploymentFile.bicep      # Front Door, DNS zones
│
├── observability/                # Monitoring
│   └── deploymentFile.bicep      # Log Analytics, App Insights, Grafana
│
├── rbac/                         # Role assignments
│   └── deploymentFile.bicep      # RBAC for managed identities
│
├── sites/                        # Web applications
│   ├── deploymentFile.bicep      # Module entry
│   ├── arolariu-ro.bicep         # Main website (Next.js)
│   ├── api-arolariu-ro.bicep     # API (.NET 10)
│   ├── dev-arolariu-ro.bicep     # Development site
│   ├── docs-arolariu-ro.bicep    # Documentation (DocFX - Static Web App)
│   └── cv-arolariu-ro.bicep      # CV site (SvelteKit - Static Web App)
│
├── storage/                      # Storage services
│   └── deploymentFile.bicep      # Storage Account, Container Registry, Cosmos DB
│
└── types/                        # User-defined types
    ├── common.type.bicep         # resourceTags type
    ├── identity.type.bicep       # identity type
    └── README.md
```

---

## 🏗️ Architecture Patterns

### Deployment Flow

```
main.bicep (subscription scope)
    └── facade.bicep (resource group scope)
            ├── identitiesDeployment    → User-Assigned Managed Identities
            ├── rbacDeployment          → Role assignments (depends: identity)
            ├── configurationDeployment → Key Vault, App Config
            ├── observabilityDeployment → Log Analytics, App Insights (depends: identity, config)
            ├── storageDeployment       → Storage, ACR (depends: identity, rbac)
            ├── computeDeployment       → App Service Plans (depends: identity)
            ├── websiteDeployment       → All web apps (depends: storage, config, compute)
            ├── networkDeployment       → Front Door, DNS (depends: websites)
            ├── aiDeployment            → Azure OpenAI (depends: identity)
            └── bindingsDeployment      → Custom domains (depends: network, compute, websites)
```

### Module Entry Pattern

Each domain has a `deploymentFile.bicep` as the entry point:

```bicep
// identity/deploymentFile.bicep
targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

// Deploy sub-modules
module managedIdentities 'userAssignedIdentity.bicep' = {
  scope: resourceGroup()
  name: 'managedIdentitiesDeployment-${resourceDeploymentDate}'
  params: {
    userAssignedManagedIdentityNamePrefix: '${resourceConventionPrefix}-uami'
    userAssignedManagedIdentityLocation: resourceLocation
    userAssignedManagedIdentityDeploymentDate: resourceDeploymentDate
  }
}

// Export typed outputs
import { identity } from '../types/identity.type.bicep'
output managedIdentitiesList identity[] = managedIdentities.outputs.userAssignedManagedIdentities
```

---

## 📝 Coding Standards

### File Structure

```bicep
targetScope = 'resourceGroup'  // or 'subscription'

metadata description = 'Description of what this template does'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'

// 1. Parameters (with decorators)
@description('Required parameter with validation')
@minLength(1)
@maxLength(90)
param resourceName string

@description('Constrained parameter')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('Optional parameter with default')
param resourceDeploymentDate string = utcNow()

// 2. Type imports
import { resourceTags } from '../types/common.type.bicep'

// 3. Variables
var resourceConventionPrefix = 'q${substring(uniqueString(resourceDeploymentDate), 0, 5)}'

var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: resourceDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'compute'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

// 4. Resources
resource appServicePlan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: '${resourceConventionPrefix}-production'
  location: resourceLocation
  tags: commonTags
  // ...
}

// 5. Outputs
output appServicePlanId string = appServicePlan.id
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Parameters** | camelCase, descriptive | `resourceDeploymentDate` |
| **Variables** | camelCase | `commonTags`, `resourceConventionPrefix` |
| **Resources** | camelCase, resource type as name | `appServicePlan`, `storageAccount` |
| **Modules** | camelCase + Deployment suffix | `identitiesDeployment` |
| **Outputs** | camelCase, descriptive | `productionAppPlanId` |
| **Files** | kebab-case or camelCase | `deploymentFile.bicep`, `api-arolariu-ro.bicep` |

### User-Defined Types

```bicep
// types/common.type.bicep
metadata description = 'Common user-defined types for standardized deployments'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'

@export()
@metadata({ description: 'Resource tagging configuration' })
type resourceTags = {
  @description('Environment tag')
  environment: 'DEVELOPMENT' | 'PRODUCTION'

  @description('Deployment method')
  deploymentType: 'Bicep' | 'ARM' | 'Terraform'

  @description('Deployment date in YYYY-MM-DD format')
  deploymentDate: string

  @description('Deployment author')
  deploymentAuthor: string

  @description('Module or service name')
  module: string

  @description('Cost center for billing')
  costCenter: string

  @description('Project name or identifier')
  project: string

  @description('Version of the deployment')
  version: string
}
```

---

## 💰 Cost Optimization

### Target Monthly Costs (~€77-82)

| Service | SKU | Cost |
|---------|-----|------|
| App Service Plan (Prod) | B2 | ~€23 |
| App Service Plan (Dev) | B1 | ~€11 |
| Azure Front Door | Standard | ~€30 |
| Log Analytics | Pay-as-you-go | ~€9 |
| Storage Account | Standard_LRS | ~€2 |
| DNS Zone | Global | ~€2 |

### Cost Principles

1. **Default to low-cost tiers**: B1/B2 for App Service, Standard_LRS for storage
2. **Free tier when possible**: Static Web Apps for docs/CV sites
3. **Avoid premium features**: No availability zones, no geo-replication unless justified
4. **Document cost implications**: Any premium SKU choice requires justification

### SKU Defaults

```bicep
// ✅ Good - Cost-optimized defaults
sku: {
  name: 'B2'      // Basic tier, not Premium
  tier: 'Basic'
}

// ❌ Bad - Unnecessary premium
sku: {
  name: 'P1v3'    // Premium V3 - expensive
  tier: 'PremiumV3'
}
```

---

## 🔐 Security Standards

### Managed Identities

```bicep
// Always use User-Assigned Managed Identities
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  name: '${namePrefix}-frontend'
  location: location
  tags: commonTags
}

// Assign to resources
resource appService 'Microsoft.Web/sites@2024-11-01' = {
  // ...
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
}
```

### Key Vault Integration

- Store all secrets in Azure Key Vault
- Use Key Vault references in App Service configuration
- Enable soft delete and purge protection
- Grant least-privilege access via RBAC

### Network Security

- Use service endpoints (free) over private endpoints (expensive)
- Implement Front Door for CDN and basic WAF
- Enforce HTTPS and TLS 1.2 minimum
- Configure proper CORS policies

---

## 🏷️ Tagging Strategy

**Required tags for all resources:**

```bicep
var commonTags resourceTags = {
  environment: 'PRODUCTION'           // DEVELOPMENT | PRODUCTION
  deploymentType: 'Bicep'             // Bicep | ARM | Terraform
  deploymentDate: resourceDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'compute'                   // Domain module name
  costCenter: 'infrastructure'        // Billing attribution
  project: 'arolariu.ro'              // Project identifier
  version: '2.0.0'                    // Deployment version
}
```

---

## ⚙️ Bicep Configuration

The `bicepconfig.json` enforces quality:

```jsonc
{
  "experimentalFeaturesEnabled": {
    "symbolicNameCodegen": true
  },
  "analyzers": {
    "core": {
      "enabled": true,
      "rules": {
        "no-hardcoded-env-urls": { "level": "error" },
        "secure-parameter-default": { "level": "error" },
        "adminusername-should-not-be-literal": { "level": "error" },
        "no-unnecessary-dependson": { "level": "warning" },
        "max-params": { "level": "warning", "maxNumberOfParameters": 20 },
        "max-variables": { "level": "warning", "maxNumberOfVariables": 30 },
        "max-outputs": { "level": "warning", "maxNumberOfOutputs": 15 }
      }
    }
  }
}
```

### Key Rules

| Rule | Level | Purpose |
|------|-------|---------|
| `no-hardcoded-env-urls` | error | No hardcoded Azure URLs |
| `secure-parameter-default` | error | Secure params can't have defaults |
| `adminusername-should-not-be-literal` | error | No literal admin usernames |
| `max-params` | warning | Max 20 parameters per file |
| `max-variables` | warning | Max 30 variables per file |
| `max-outputs` | warning | Max 15 outputs per file |

---

## 🚀 Deployment Commands

```bash
# Validate template
az deployment sub validate \
  --location swedencentral \
  --template-file main.bicep \
  --parameters @main.parameters.json

# What-if analysis (preview changes)
az deployment sub what-if \
  --location swedencentral \
  --template-file main.bicep \
  --parameters @main.parameters.json

# Deploy
az deployment sub create \
  --location swedencentral \
  --template-file main.bicep \
  --parameters resourceGroupName="arolariu-rg-prod" \
               resourceGroupLocation="swedencentral" \
               resourceGroupAuthor="Alexandru-Razvan Olariu"
```

---

## ✅ Quality Checklist

### Before Committing

- [ ] `az bicep build` succeeds with no errors
- [ ] All parameters have `@description` decorators
- [ ] Location parameters use `@allowed` decorator
- [ ] Resources use latest stable API versions
- [ ] Tags applied via `commonTags` pattern
- [ ] Managed identities used (no access keys)
- [ ] Secrets stored in Key Vault
- [ ] Cost-appropriate SKUs selected
- [ ] `dependsOn` only used when necessary (prefer implicit)

### Security Checklist

- [ ] No secrets in outputs
- [ ] No hardcoded credentials
- [ ] HTTPS enforced (`httpsOnly: true`)
- [ ] TLS 1.2 minimum (`minTlsVersion: '1.2'`)
- [ ] Managed identities configured
- [ ] RBAC with least privilege

---

## 🔗 Related Resources

- **Bicep Documentation**: https://docs.microsoft.com/azure/azure-resource-manager/bicep/
- **Azure Naming Conventions**: https://docs.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming
- **Cost Calculator**: https://azure.microsoft.com/pricing/calculator/
- [ ] Backup and disaster recovery configured
- [ ] Cost alerts configured
