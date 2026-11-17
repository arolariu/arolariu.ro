targetScope = 'resourceGroup'

// Identity Array Convention:
// [0] = Frontend identity (arolariu.ro website)
// [1] = Backend identity (api.arolariu.ro API)
// [2] = Infrastructure identity (GitHub Actions CI/CD)

metadata description = 'Orchestrates declarative Azure resources and scoped role assignments without running bootstrap tasks.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '3.0.0'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The location for the resources.')
@allowed(['francecentral', 'northeurope', 'westeurope', 'swedencentral'])
param resourceLocation string

var resourceConventionPrefix = 'q${substring(uniqueString(resourceGroup().id), 0, 8)}'

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
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
    infrastructureManagedIdentity: identitiesDeployment.outputs.managedIdentitiesList[2]
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
    containerRegistryRbac
    appConfigRbac
    keyVaultRbac
  ]
  params: {
    appConfigurationEndpoint: configurationDeployment.outputs.appConfigurationEndpoint
    containerRegistryLoginServer: storageDeployment.outputs.containerRegistryLoginServer
    appInsightsConnectionString: observabilityDeployment.outputs.appInsightsConnectionString
    developmentAppPlanId: computeDeployment.outputs.developmentAppPlanId
    expEntraAppClientId: identitiesDeployment.outputs.expEntraAppClientId
    managedIdentityBackendClientId: identitiesDeployment.outputs.managedIdentitiesList[1].clientId
    managedIdentityBackendId: identitiesDeployment.outputs.managedIdentitiesList[1].resourceId
    managedIdentityBackendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    managedIdentityFrontendClientId: identitiesDeployment.outputs.managedIdentitiesList[0].clientId
    managedIdentityFrontendId: identitiesDeployment.outputs.managedIdentitiesList[0].resourceId
    managedIdentityFrontendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[0].principalId
    managedIdentityInfrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
    productionAppPlanId: computeDeployment.outputs.productionAppPlanId
    resourceDeploymentDate: resourceDeploymentDate
    resourceLocation: resourceLocation
  }
}

// =====================================================================================
// 7. Network — Creates Front Door, DNS (depends on: Sites)
// =====================================================================================

module networkDeployment 'network/deploymentFile.bicep' = {
  name: 'networkDeployment-${resourceDeploymentDate}'
  params: {
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
    mainWebsiteHostname: websiteDeployment.outputs.mainWebsiteUrl
    applicationDnsRecords: websiteDeployment.outputs.applicationDnsRecords
  }
}

// =====================================================================================
// 8. Bindings — Requires publicly propagated DNS before certificate completion
// =====================================================================================

module bindingsDeployment 'bindings/deploymentFile.bicep' = {
  name: 'bindingsDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    dnsZoneName: networkDeployment.outputs.dnsZoneName
    apiWebsiteAppServicePlanId: computeDeployment.outputs.productionAppPlanId
    devWebsiteAppServicePlanId: computeDeployment.outputs.developmentAppPlanId
    expWebsiteAppServicePlanId: computeDeployment.outputs.developmentAppPlanId
    apiWebsiteHostname: websiteDeployment.outputs.apiWebsiteName
    devWebsiteHostname: websiteDeployment.outputs.devWebsiteName
    expWebsiteHostname: websiteDeployment.outputs.expWebsiteName
    cvWebsiteHostname: websiteDeployment.outputs.cvWebsiteName
    docsWebsiteHostname: websiteDeployment.outputs.docsWebsiteName
    statusWebsiteName: websiteDeployment.outputs.statusWebsiteName
  }
}

// =====================================================================================
// 9. AI — Deploys Azure OpenAI (depends on: Configuration)
// =====================================================================================

module aiDeployment 'ai/deploymentFile.bicep' = {
  name: 'aiDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: 'swedencentral'
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

module openAiRbac 'rbac/ai-rbac.bicep' = {
  name: 'openAiRbac-${resourceDeploymentDate}'
  params: {
    aiFoundryAccountName: aiDeployment.outputs.aiFoundryName
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
      websiteDeployment.outputs.expWebsiteName
    ]
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module appInsightsRbac 'rbac/app-insights-rbac.bicep' = {
  name: 'appInsightsRbac-${resourceDeploymentDate}'
  params: {
    appInsightsName: observabilityDeployment.outputs.appInsightsName
    frontendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[0].principalId
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

output deploymentInfo object = {
  resourceGroupName: resourceGroup().name
  resourcePrefix: resourceConventionPrefix
  location: resourceLocation
  dnsDelegation: {
    zoneName: networkDeployment.outputs.dnsZoneName
    nameServers: networkDeployment.outputs.dnsZoneNameServers
    dsRecords: networkDeployment.outputs.dnsZoneDsRecords
  }
  identityClientIds: {
    frontend: identitiesDeployment.outputs.managedIdentitiesList[0].clientId
    backend: identitiesDeployment.outputs.managedIdentitiesList[1].clientId
    infrastructure: identitiesDeployment.outputs.managedIdentitiesList[2].clientId
  }
  experiments: {
    appClientId: identitiesDeployment.outputs.expEntraAppClientId
    servicePrincipalId: identitiesDeployment.outputs.expEntraServicePrincipalId
  }
  githubConnectionValues: {
    AZURE_TENANT_ID: subscription().tenantId
    AZURE_SUBSCRIPTION_ID: subscription().subscriptionId
    AZURE_CONTAINER_REGISTRY_ADDRESS: storageDeployment.outputs.containerRegistryLoginServer
    AZURE_CLIENT_ID: identitiesDeployment.outputs.managedIdentitiesList[2].clientId
    AZURE_FRONTEND_MANAGED_IDENTITY_CLIENT_ID: identitiesDeployment.outputs.managedIdentitiesList[2].clientId
    AZURE_BACKEND_MANAGED_IDENTITY_CLIENT_ID: identitiesDeployment.outputs.managedIdentitiesList[2].clientId
  }
  resources: {
    keyVaultName: configurationDeployment.outputs.keyVaultName
    appConfigurationName: configurationDeployment.outputs.appConfigurationName
    containerRegistryName: storageDeployment.outputs.containerRegistryName
  }
}
