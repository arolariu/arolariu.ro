---
description: 'Infrastructure as Code (IaC) with Bicep DSL - Best Practices and Guidelines'
applyTo: '**/*.bicep'
---

# Azure Bicep Infrastructure as Code

## 📚 Essential Context

**This project uses Azure Bicep for Infrastructure as Code:**

**Project Structure:**
```
infra/Azure/Bicep/
├── main.bicep              # Main deployment template
├── modules/                # Reusable Bicep modules
│   ├── app-service.bicep
│   ├── sql-database.bicep
│   ├── storage.bicep
│   └── ...
└── parameters/             # Environment-specific parameters
    ├── dev.json
    ├── staging.json
    └── production.json
```

**Azure Services Used:**
- App Service (containerized deployments)
- Azure Front Door + CDN
- Azure SQL Database
- Cosmos DB
- Azure Blob Storage
- Azure Key Vault
- Application Insights
- Azure App Configuration

**Key Principles:**
- Use latest stable API versions
- **Prioritize free and low-cost tiers** that offer efficiency and security
- Implement proper tagging for cost management
- Follow security best practices (managed identities, Key Vault, HTTPS)
- Avoid expensive enterprise features unless explicitly required
- Design for cost-effective high availability
- Implement proper monitoring using free/low-cost tiers

## Naming Conventions

-   When writing Bicep code, use lowerCamelCase for all names (variables, parameters, resources)
-   Use resource type descriptive symbolic names (e.g., 'storageAccount' not 'storageAccountName')
-   Avoid using 'name' in a symbolic name as it represents the resource, not the resource's name
-   Avoid distinguishing variables and parameters by the use of suffixes

## Structure and Declaration

-   Always declare parameters at the top of files with @description decorators
-   Use latest stable API versions for all resources
-   Use descriptive @description decorators for all parameters
-   Specify minimum and maximum character length for naming parameters

## Parameters

-   **Always default to free or low-cost pricing tiers** (e.g., B1, F1, Standard_LRS)
-   Set default values that are safe for test environments
-   Use @allowed decorator sparingly to avoid blocking valid deployments
-   Use parameters for settings that change between deployments
-   Document cost implications for any non-free tier recommendations

## Variables

-   Variables automatically infer type from the resolved value
-   Use variables to contain complex expressions instead of embedding them directly in resource properties

## Resource References

-   Use symbolic names for resource references instead of reference() or resourceId() functions
-   Create resource dependencies through symbolic names (resourceA.id) not explicit dependsOn
-   For accessing properties from other resources, use the 'existing' keyword instead of passing values through outputs

## Resource Names

-   Use template expressions with uniqueString() to create meaningful and unique resource names
-   Add prefixes to uniqueString() results since some resources don't allow names starting with numbers

## Child Resources

-   Avoid excessive nesting of child resources
-   Use parent property or nesting instead of constructing resource names for child resources

## Security

-   Never include secrets or keys in outputs
-   Use resource properties directly in outputs (e.g., storageAccount.properties.primaryEndpoints)

## Documentation

-   Include helpful // comments within your Bicep files to improve readability

## Azure-Specific Best Practices

### Managed Identities
-   Always use Managed Identities over service principals or access keys
-   Enable system-assigned managed identity for Azure resources
-   Use user-assigned managed identities for shared identity scenarios
-   Grant least-privilege permissions via RBAC

### High Availability & Disaster Recovery (Cost-Effective)
-   Use Standard tier with locally-redundant storage (LRS) by default
-   Implement geo-replication only when explicitly required (adds cost)
-   Configure automatic backups with minimal retention periods
-   Avoid availability zones and multi-region unless justified (expensive)
-   **Balance availability with cost** - not every resource needs premium HA

### Cost Optimization (Priority: Free/Low-Cost)
-   **Default to free tiers** (F1 App Service, B1 plans, Standard_LRS storage)
-   Use Basic/Standard tiers instead of Premium unless required
-   Leverage free tiers: App Service free tier, Azure Functions consumption plan
-   Avoid expensive features: Premium SKUs, reserved capacity, dedicated hosting
-   Implement auto-shutdown for non-production resources
-   Use Azure Hybrid Benefit where applicable
-   Tag resources with cost center, environment, and owner
-   Set up Azure Cost Management alerts with low thresholds
-   **Document and justify any premium/expensive resource choices**

### Networking & Security (Low-Cost Focus)
-   Use service endpoints instead of private endpoints (free alternative)
-   Implement network security groups (free)
-   **Avoid Azure DDoS Protection** (expensive) unless explicitly required
-   Use Azure Front Door Standard tier or CDN for cost-effective load balancing
-   Implement proper subnet design with CIDR planning (free)
-   Use built-in firewall rules instead of premium WAF features

### Monitoring & Diagnostics
-   Enable diagnostic settings for all resources
-   Send logs to Log Analytics workspace
-   Configure Application Insights for applications
-   Set up proper alerts and action groups
-   Implement Azure Monitor dashboards

### Key Vault Integration
-   Store all secrets in Azure Key Vault
-   Use Key Vault references in App Service configuration
-   Enable soft delete and purge protection
-   Implement proper access policies with least privilege
-   Rotate secrets regularly via automation

### Tagging Strategy
Required tags for all resources:
-   `environment`: dev, staging, production
-   `project`: arolariu.ro
-   `costCenter`: team or department
-   `owner`: responsible team/person
-   `createdDate`: deployment date

## Module Patterns

### Reusable Module Example (Cost-Optimized)
```bicep
@description('App Service module')
param name string
param location string

@description('SKU name - defaults to free/low-cost tier')
@allowed(['F1', 'B1', 'B2', 'S1'])
param skuName string = 'B1'  // Default to Basic instead of premium

param linuxFxVersion string

@description('Tags to apply to the resource')
param tags object = {}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${name}-plan'
  location: location
  tags: tags
  kind: 'linux'
  properties: {
    reserved: true
  }
  sku: {
    name: skuName
  }
}

resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
    }
  }
}

output appServiceId string = appService.id
output appServiceName string = appService.name
output principalId string = appService.identity.principalId
```

## Deployment Commands

```bash
# Validate template
az deployment group validate --resource-group <rg-name> --template-file main.bicep --parameters @parameters/dev.json

# What-if analysis
az deployment group what-if --resource-group <rg-name> --template-file main.bicep --parameters @parameters/dev.json

# Deploy
az deployment group create --resource-group <rg-name> --template-file main.bicep --parameters @parameters/dev.json
```

## Security Checklist

Before deploying:
- [ ] All secrets stored in Key Vault
- [ ] Managed identities configured
- [ ] Private endpoints enabled for data services
- [ ] NSG rules configured properly
- [ ] Diagnostic settings enabled
- [ ] Proper tags applied
- [ ] HTTPS/TLS enforced
- [ ] Minimum TLS version set to 1.2
- [ ] Backup and disaster recovery configured
- [ ] Cost alerts configured
