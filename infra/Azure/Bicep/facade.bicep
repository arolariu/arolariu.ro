targetScope = 'resourceGroup'

// =====================================================================================
// Infrastructure Facade - Module Orchestration Layer
// =====================================================================================
// This facade orchestrates the deployment of all infrastructure modules in the correct
// order, managing dependencies between modules and passing outputs between them.
//
// Deployment Order (with dependencies):
// 1. Identity      → Creates managed identities (no dependencies)
// 2. RBAC          → Assigns roles to identities (depends on: Identity)
// 3. Configuration → Creates Key Vault, App Config (no dependencies)
// 4. Observability → Creates monitoring resources (depends on: Identity, Configuration)
// 5. Storage       → Creates storage, databases, ACR (depends on: Identity, RBAC)
// 6. Compute       → Creates App Service Plans (depends on: Identity)
// 7. Sites         → Deploys web applications (depends on: Storage, Configuration)
// 8. Network       → Creates Front Door, DNS (depends on: Sites)
// 9. Bindings      → Configures custom domains (depends on: Sites, Network)
// 10. AI           → Deploys Azure OpenAI (depends on: Configuration)
//
// Identity Array Convention:
// [0] = Frontend identity (arolariu.ro website)
// [1] = Backend identity (api.arolariu.ro API)
// [2] = Infrastructure identity (GitHub Actions CI/CD)
// =====================================================================================

metadata description = 'Facade module that orchestrates the deployment of all infrastructure modules with proper dependency management.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

var resourceConventionPrefix = 'q${substring(uniqueString(resourceDeploymentDate), 0, 5)}'

module identitiesDeployment 'identity/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'identitiesDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module rbacDeployment 'rbac/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'rbacDeployment-${resourceDeploymentDate}'
  params: { managedIdentities: identitiesDeployment.outputs.managedIdentitiesList }
}

module configurationDeployment 'configuration/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'configurationDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module observabilityDeployment 'observability/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'observabilityDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment, configurationDeployment]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module storageDeployment 'storage/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'storageDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment, rbacDeployment]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module computeDeployment 'compute/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'computeDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module websiteDeployment 'sites/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'websiteDeployment-${resourceDeploymentDate}'
  dependsOn: [
    storageDeployment // Websites need storage
    configurationDeployment // Websites need configuration
  ]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    appInsightsConnectionString: observabilityDeployment.outputs.appInsightsConnectionString
    appInsightsInstrumentationKey: observabilityDeployment.outputs.appInsightsInstrumentationKey
    productionAppPlanId: computeDeployment.outputs.productionAppPlanId
    developmentAppPlanId: computeDeployment.outputs.developmentAppPlanId
    managedIdentityFrontendId: identitiesDeployment.outputs.managedIdentitiesList[0].resourceId
    managedIdentityBackendId: identitiesDeployment.outputs.managedIdentitiesList[1].resourceId
  }
}

module networkDeployment 'network/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'networkDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
    mainWebsiteHostname: websiteDeployment.outputs.mainWebsiteUrl
  }
}

module aiDeployment 'ai/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'aiDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module bindingsDeployment 'bindings/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'bindingsDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
    dnsZoneName: networkDeployment.outputs.dnsZoneName
    devWebsiteAppServicePlanId: computeDeployment.outputs.developmentAppPlanId
    prodWebsiteAppServicePlanId: computeDeployment.outputs.productionAppPlanId
    cvWebsiteHostname: websiteDeployment.outputs.cvWebsiteName
    apiWebsiteHostname: websiteDeployment.outputs.apiWebsiteName
    devWebsiteHostname: websiteDeployment.outputs.devWebsiteName
    docsWebsiteHostname: websiteDeployment.outputs.docsWebsiteName
    prodWebsiteHostname: websiteDeployment.outputs.mainWebsiteName
  }
}
