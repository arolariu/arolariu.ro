// =====================================================================================
// Compute Deployment Orchestrator - App Service Plans for Azure Web Applications
// =====================================================================================
// This orchestrator module deploys the compute infrastructure required to host
// the arolariu.ro web applications. It provisions App Service Plans that provide
// the underlying compute resources for Azure App Services and Web Apps.
//
// Deployed Resources:
// - Production App Service Plan (Premium tier, higher compute capacity)
// - Development App Service Plan (Lower tier, cost-optimized for non-production)
//
// Architecture Pattern:
// Separating production and development into distinct App Service Plans provides:
// - Resource isolation: Production workloads are not affected by development
// - Cost optimization: Development plans can use lower SKUs
// - Scaling independence: Each environment can scale independently
// - Deployment safety: Production has dedicated resources during dev deployments
//
// Dependencies: None - Compute is a foundational layer
// Dependents: sites/ (all web applications consume these plans)
//
// See: sites/deploymentFile.bicep (consumes App Service Plan IDs)
// See: facade.bicep (orchestrates deployment order)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Compute orchestrator for App Service Plans (production and development)'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
@minLength(1)
@maxLength(20)
param resourceConventionPrefix string

@description('The location for the app service plans.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

module appServicePlansDeployment 'appServicePlans.bicep' = {
  scope: resourceGroup()
  name: 'appServicePlansDeployment-${resourceDeploymentDate}'
  params: {
    appServicePlanLocation: resourceLocation
    appServicePlanDeploymentDate: resourceDeploymentDate
    appServicePlanConventionPrefix: resourceConventionPrefix
  }
}

output productionAppPlanId string = appServicePlansDeployment.outputs.productionAppPlanId
output developmentAppPlanId string = appServicePlansDeployment.outputs.developmentAppPlanId
