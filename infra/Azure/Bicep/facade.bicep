targetScope = 'resourceGroup'

// =====================================================================================
// Infrastructure Facade - Module Orchestration Layer
// =====================================================================================
// This facade orchestrates the deployment of all infrastructure modules in the correct
// order, managing dependencies between modules and passing outputs between them.
//
// Deployment Order (with dependencies):
// 1. Identity      → Creates managed identities (no dependencies)
// 2. Configuration → Creates Key Vault, App Config (no dependencies)
// 3. Observability → Creates monitoring resources (depends on: Identity, Configuration)
// 4. Storage       → Creates storage, databases, ACR (depends on: Identity)
// 5. Compute       → Creates App Service Plans (depends on: Identity)
// 6. Sites         → Deploys web applications (depends on: Storage, Configuration)
// 7. Network       → Creates Front Door, DNS (depends on: Sites)
// 8. Bindings      → Configures custom domains (depends on: Sites, Network)
// 9. AI            → Deploys Azure OpenAI (depends on: Configuration)
// 10. RBAC         → Resource-scoped role assignments (depends on: respective resources)
//
// Identity Array Convention:
// [0] = Frontend identity (arolariu.ro website)
// [1] = Backend identity (api.arolariu.ro API)
// [2] = Infrastructure identity (GitHub Actions CI/CD)
// =====================================================================================

metadata description = 'Facade module that orchestrates the deployment of all infrastructure modules with proper dependency management.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '3.0.0'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The location for the resources.')
@allowed(['northeurope', 'westeurope', 'swedencentral', 'norwayeast'])
param resourceLocation string

var resourceConventionPrefix = 'q${substring(uniqueString(resourceDeploymentDate), 0, 5)}'

// =====================================================================================
// 1. Identity — Creates managed identities (no dependencies)
// =====================================================================================

module identitiesDeployment 'identity/deploymentFile.bicep' = {
  name: 'identitiesDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

// =====================================================================================
// 2. Configuration — Creates Key Vault, App Config (no dependencies)
// =====================================================================================

module configurationDeployment 'configuration/deploymentFile.bicep' = {
  name: 'configurationDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

// =====================================================================================
// 3. Observability — Creates monitoring resources (depends on: Identity, Configuration)
// =====================================================================================

module observabilityDeployment 'observability/deploymentFile.bicep' = {
  name: 'observabilityDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment, configurationDeployment]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

// =====================================================================================
// 4. Storage — Creates storage, databases, ACR (depends on: Identity)
// =====================================================================================

module storageDeployment 'storage/deploymentFile.bicep' = {
  name: 'storageDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

// =====================================================================================
// 5. Compute — Creates App Service Plans (depends on: Identity)
// =====================================================================================

module computeDeployment 'compute/deploymentFile.bicep' = {
  name: 'computeDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

// =====================================================================================
// 6. Sites — Deploys web applications (depends on: Storage, Configuration)
// =====================================================================================

module websiteDeployment 'sites/deploymentFile.bicep' = {
  name: 'websiteDeployment-${resourceDeploymentDate}'
  dependsOn: [
    storageDeployment
    configurationDeployment
  ]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    appInsightsConnectionString: observabilityDeployment.outputs.appInsightsConnectionString
    productionAppPlanId: computeDeployment.outputs.productionAppPlanId
    developmentAppPlanId: computeDeployment.outputs.developmentAppPlanId
    managedIdentityFrontendId: identitiesDeployment.outputs.managedIdentitiesList[0].resourceId
    managedIdentityBackendId: identitiesDeployment.outputs.managedIdentitiesList[1].resourceId
    managedIdentityFrontendClientId: identitiesDeployment.outputs.managedIdentitiesList[0].clientId
    managedIdentityBackendClientId: identitiesDeployment.outputs.managedIdentitiesList[1].clientId
  }
}

// =====================================================================================
// 7. Network — Creates Front Door, DNS (depends on: Sites)
// =====================================================================================

module networkDeployment 'network/deploymentFile.bicep' = {
  name: 'networkDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
    mainWebsiteHostname: websiteDeployment.outputs.mainWebsiteUrl
  }
}

// =====================================================================================
// 8. Bindings — Configures custom domains (depends on: Sites, Network)
// =====================================================================================

module bindingsDeployment 'bindings/deploymentFile.bicep' = {
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

// =====================================================================================
// 9. AI — Deploys Azure OpenAI (depends on: Configuration)
// =====================================================================================

module aiDeployment 'ai/deploymentFile.bicep' = {
  name: 'aiDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

// =====================================================================================
// 10. RBAC — Resource-scoped role assignments (depends on: respective resources)
// =====================================================================================

module storageRbac 'rbac/storage-rbac.bicep' = {
  name: 'storageRbac-${resourceDeploymentDate}'
  params: {
    storageAccountName: storageDeployment.outputs.storageAccountName
    frontendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[0].principalId
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module containerRegistryRbac 'rbac/container-registry-rbac.bicep' = {
  name: 'containerRegistryRbac-${resourceDeploymentDate}'
  params: {
    containerRegistryName: storageDeployment.outputs.containerRegistryName
    frontendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[0].principalId
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module sqlServerRbac 'rbac/sql-server-rbac.bicep' = {
  name: 'sqlServerRbac-${resourceDeploymentDate}'
  params: {
    sqlServerName: storageDeployment.outputs.sqlServerName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
  }
}

module cosmosDbRbac 'rbac/cosmos-db-rbac.bicep' = {
  name: 'cosmosDbRbac-${resourceDeploymentDate}'
  params: {
    cosmosAccountName: storageDeployment.outputs.cosmosAccountName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
  }
}

module keyVaultRbac 'rbac/key-vault-rbac.bicep' = {
  name: 'keyVaultRbac-${resourceDeploymentDate}'
  params: {
    keyVaultName: configurationDeployment.outputs.keyVaultName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module appConfigRbac 'rbac/app-configuration-rbac.bicep' = {
  name: 'appConfigRbac-${resourceDeploymentDate}'
  params: {
    appConfigurationName: configurationDeployment.outputs.appConfigurationName
    frontendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[0].principalId
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module openAiRbac 'rbac/openai-rbac.bicep' = {
  name: 'openAiRbac-${resourceDeploymentDate}'
  params: {
    openAiAccountName: aiDeployment.outputs.openAiName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
  }
}

module websitesRbac 'rbac/websites-rbac.bicep' = {
  name: 'websitesRbac-${resourceDeploymentDate}'
  params: {
    webAppNames: [
      websiteDeployment.outputs.mainWebsiteName
      websiteDeployment.outputs.apiWebsiteName
      websiteDeployment.outputs.devWebsiteName
    ]
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}
