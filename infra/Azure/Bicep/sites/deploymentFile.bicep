// =====================================================================================
// Sites Deployment Orchestrator - Azure Web Applications and Static Sites
// =====================================================================================
// This orchestrator module deploys all web applications that make up the arolariu.ro
// platform. It provisions App Services, Static Web Apps, and configures their
// runtime settings, managed identities, and observability integration.
//
// Deployed Applications:
// - arolariu.ro (Production) → Next.js frontend (App Service + Frontend UAMI)
// - api.arolariu.ro → .NET backend API (App Service + Backend UAMI)
// - experiments.arolariu.ro → Config proxy service (App Service + Backend UAMI + Easy Auth)
// - dev.arolariu.ro → Development/staging frontend (App Service)
// - docs.arolariu.ro → DocFX documentation (Static Web App)
// - cv.arolariu.ro → SvelteKit CV site (Static Web App)
//
// Runtime Configuration:
// - App Services use container deployment from ACR
// - Static Web Apps use GitHub Actions for deployment
// - All sites have Application Insights telemetry enabled
//
// Identity Model:
// - Production frontend uses Frontend UAMI (read-only access)
// - Backend API uses Backend UAMI (read-write access to storage/databases)
// - Experiments proxy uses Backend UAMI (read access to App Config + Key Vault)
// - Development site shares Frontend UAMI for consistency
//
// App Service Plan Assignment:
// - Production sites → Production App Service Plan (Premium)
// - Development/API → Development App Service Plan (Standard)
//
// See: compute/deploymentFile.bicep (App Service Plans)
// See: identity/deploymentFile.bicep (Managed Identities)
// See: observability/deploymentFile.bicep (Application Insights)
// =====================================================================================

metadata description = 'Sites orchestrator deploying all web applications and static sites'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The location for the resources.')
@allowed(['francecentral', 'northeurope', 'westeurope', 'swedencentral'])
param resourceLocation string

@description('The ID of the production app service plan.')
param productionAppPlanId string

@description('The ID of the development app service plan.')
param developmentAppPlanId string

@description('The app insights connection string')
param appInsightsConnectionString string

@description('Resource ID of the backend managed identity.')
param managedIdentityBackendId string

@description('Resource ID of the frontend managed identity.')
param managedIdentityFrontendId string

@description('Client ID of the frontend managed identity for AZURE_CLIENT_ID.')
param managedIdentityFrontendClientId string

@description('Client ID of the backend managed identity for AZURE_CLIENT_ID.')
param managedIdentityBackendClientId string

@description('Principal (object) ID of the frontend managed identity.')
param managedIdentityFrontendPrincipalId string

@description('Principal (object) ID of the backend managed identity.')
param managedIdentityBackendPrincipalId string

@description('Entra ID App Registration client ID for the experiments service Easy Auth.')
param experimentsEntraAppClientId string

module apiWebsiteDeployment 'api-arolariu-ro.bicep' = {
  name: 'apiWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    appInsightsConnectionString: appInsightsConnectionString
    apiWebsiteLocation: resourceLocation
    apiWebsitePlanId: productionAppPlanId
    apiWebsiteIdentityId: managedIdentityBackendId
    apiWebsiteIdentityClientId: managedIdentityBackendClientId
    apiWebsiteDeploymentDate: resourceDeploymentDate
  }
}

module mainWebsiteDeployment 'arolariu-ro.bicep' = {
  name: 'mainWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    appInsightsConnectionString: appInsightsConnectionString
    productionWebsiteLocation: resourceLocation
    productionWebsiteAppPlanId: productionAppPlanId
    productionWebsiteIdentityId: managedIdentityFrontendId
    productionWebsiteIdentityClientId: managedIdentityFrontendClientId
    productionWebsiteDeploymentDate: resourceDeploymentDate
  }
}

module devWebsiteDeployment 'dev-arolariu-ro.bicep' = {
  name: 'devWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    developmentWebsiteLocation: resourceLocation
    developmentWebsiteAppPlanId: developmentAppPlanId
    developmentWebsiteIdentityId: managedIdentityFrontendId
    developmentWebsiteDeploymentDate: resourceDeploymentDate
  }
}

module docsWebsiteDeployment 'docs-arolariu-ro.bicep' = {
  name: 'docsWebsiteDeployment-${resourceDeploymentDate}'
  params: { staticWebAppDeploymentDate: resourceDeploymentDate }
}

module cvWebsiteDeployment 'cv-arolariu-ro.bicep' = {
  name: 'cvWebsiteDeployment-${resourceDeploymentDate}'
  params: { staticWebAppDeploymentDate: resourceDeploymentDate }
}

module experimentsWebsiteDeployment 'experiments-arolariu-ro.bicep' = {
  name: 'experimentsWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    appInsightsConnectionString: appInsightsConnectionString
    experimentsWebsiteLocation: resourceLocation
    experimentsWebsitePlanId: developmentAppPlanId
    experimentsWebsiteIdentityId: managedIdentityBackendId
    experimentsWebsiteIdentityClientId: managedIdentityBackendClientId
    experimentsWebsiteDeploymentDate: resourceDeploymentDate
    frontendIdentityPrincipalId: managedIdentityFrontendPrincipalId
    backendIdentityPrincipalId: managedIdentityBackendPrincipalId
    entraAppClientId: experimentsEntraAppClientId
  }
}

// Output all website URLs for DNS configuration
output mainWebsiteUrl string = mainWebsiteDeployment.outputs.mainWebsiteUrl
output apiWebsiteUrl string = apiWebsiteDeployment.outputs.apiWebsiteUrl
output devWebsiteUrl string = devWebsiteDeployment.outputs.devWebsiteUrl
output docsWebsiteUrl string = docsWebsiteDeployment.outputs.docsWebsiteUrl
output cvWebsiteUrl string = cvWebsiteDeployment.outputs.cvWebsiteUrl
output experimentsWebsiteUrl string = experimentsWebsiteDeployment.outputs.experimentsWebsiteUrl

// Output all website names for bindings
output mainWebsiteName string = mainWebsiteDeployment.outputs.mainWebsiteName
output apiWebsiteName string = apiWebsiteDeployment.outputs.apiWebsiteName
output devWebsiteName string = devWebsiteDeployment.outputs.devWebsiteName
output docsWebsiteName string = docsWebsiteDeployment.outputs.docsWebsiteName
output cvWebsiteName string = cvWebsiteDeployment.outputs.cvWebsiteName
output experimentsWebsiteName string = experimentsWebsiteDeployment.outputs.experimentsWebsiteName
