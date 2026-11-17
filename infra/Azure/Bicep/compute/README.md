# 💻 Compute Module

This module provisions Linux-based Azure App Service Plans for production and development workloads, with secure defaults.

## 📋 Overview

- Two App Service Plans: Production (B2) and Development (B1)
- Linux containers, single instance, cost-optimized (no per-site scaling)

## 📁 Module Files

| File                    | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `deploymentFile.bicep`  | Orchestrates App Service Plan deployments    |
| `appServicePlans.bicep` | App Service Plans (production & development) |

## 🏗️ Resources Created

| Resource Type    | Name Pattern           | SKU        | Purpose                      |
| ---------------- | ---------------------- | ---------- | ---------------------------- |
| App Service Plan | `{prefix}-production`  | B2 (Basic) | Production web applications  |
| App Service Plan | `{prefix}-development` | B1 (Basic) | Development web applications |

## 📊 **Architecture**

```mermaid
graph TB
    subgraph "Compute Module"
        ASP1[Production App Service Plan<br/>B2 - Basic, 1 instance]
        ASP2[Development App Service Plan<br/>B1 - Basic, 1 instance]
    end

    ASP1 --> WEB1[Production Web Apps]
    ASP2 --> WEB2[Development Web Apps]
```

## 🔧 Parameters

| Parameter                  | Type   | Required | Description                                                          |
| -------------------------- | ------ | -------- | -------------------------------------------------------------------- |
| `resourceConventionPrefix` | string | ✅       | Prefix for resource naming (1-20 chars)                              |
| `resourceLocation`         | string | ✅       | Azure region (francecentral, northeurope, westeurope, swedencentral) |
| `resourceDeploymentDate`   | string | ❌       | Deployment timestamp (default: `utcNow()`)                           |

### Example Usage

```bicep
module computeDeployment 'compute/deploymentFile.bicep' = {
  name: 'computeDeployment'
  params: {
    resourceConventionPrefix: 'arolariu'
    resourceLocation: 'swedencentral'
  }
}
```

## 📤 Outputs

| Output                 | Type   | Description                                     |
| ---------------------- | ------ | ----------------------------------------------- |
| `productionAppPlanId`  | string | Resource ID of the production App Service Plan  |
| `developmentAppPlanId` | string | Resource ID of the development App Service Plan |

## 🛡️ Security Features

- Linux-based plans for security and performance
- Resource tags for governance and cost tracking

## 💰 Cost Considerations

| Plan        | SKU | vCPU | RAM     | Estimated Monthly Cost\* |
| ----------- | --- | ---- | ------- | ------------------------ |
| Production  | B2  | 2    | 3.5 GB  | ~€24                     |
| Development | B1  | 1    | 1.75 GB | ~€12                     |

\*Estimates based on Sweden Central pricing (July 2025). `main.bicepparam` deploys to France Central, so actual prices may differ.

## 🔧 Customization Options

- **Per-site scaling**: Disabled on both plans (`perSiteScaling: false`)
- **SKU upgrades**: Upgrade to Standard or Premium for more features

## 🛠️ Maintenance

- Integrates with Application Insights, Log Analytics, Azure Monitor
- Both plans run a single instance (capacity 1); Basic tier has no autoscale — upgrade to Standard (S1+) for automatic scaling and
  deployment slots

## 🔄 Dependencies

- **Requires**: None (ordered after the Identity module via `dependsOn` in `facade.bicep`)
- **Used by**: Sites and Bindings modules (App Service Plan IDs)

## 📊 Deployment Flow

1. Identity Module creates managed identities
2. Compute Module provisions App Service Plans
3. Sites Module deploys web applications

## 🚨 Troubleshooting

| Issue                                | Solution                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Deployment fails with location error | Use allowed regions: francecentral, northeurope, westeurope, swedencentral                           |
| Resource naming conflicts            | Ensure unique `resourceConventionPrefix`                                                             |
| Permission errors                    | Verify the deploying principal can create resources in the resource group (for example, Contributor) |

## 📚 References

- [Azure App Service Plans](https://docs.microsoft.com/en-us/azure/app-service/overview-hosting-plans)
- [App Service Linux](https://docs.microsoft.com/en-us/azure/app-service/overview#app-service-on-linux)
- [Per-site Scaling](https://docs.microsoft.com/en-us/azure/app-service/manage-scale-per-app)

---

**Module Version**: 2.0.0  
**Last Updated**: November 2026\
**Maintainer**: Alexandru-Razvan Olariu
