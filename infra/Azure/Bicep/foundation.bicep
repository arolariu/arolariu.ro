targetScope = 'resourceGroup'

// Identity Array Convention:
// [0] = Frontend identity (arolariu.ro website)
// [1] = Backend identity (api.arolariu.ro API)
// [2] = Infrastructure identity (GitHub Actions CI/CD)

metadata description = 'Provisions the platform foundation separately from custom-domain completion.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '3.0.0'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The location for the resources.')
@allowed(['francecentral', 'northeurope', 'westeurope', 'swedencentral'])
param resourceLocation string

@description('The stable naming prefix derived by the deployment facade.')
@minLength(3)
@maxLength(20)
param resourceConventionPrefix string

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
    storageDeployment
    configurationDeployment
  ]
  params: {
    appConfigurationName: configurationDeployment.outputs.appConfigurationName
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
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
    mainWebsiteHostname: websiteDeployment.outputs.mainWebsiteUrl
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
    resourceConventionPrefix: resourceConventionPrefix
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    sqlServerFqdn: storageDeployment.outputs.sqlServerFqdn
    sqlDatabaseNames: [storageDeployment.outputs.sqlDatabasePrimaryName]
    backendManagedIdentity: identitiesDeployment.outputs.managedIdentitiesList[1]
    infrastructureManagedIdentity: identitiesDeployment.outputs.managedIdentitiesList[2]
  }
}

module backendAccessProbe 'bootstrap/access-probe.bicep' = {
  name: 'backendAccessProbe-${resourceDeploymentDate}'
  dependsOn: [sqlServerRbac, cosmosDbRbac]
  params: {
    resourceConventionPrefix: resourceConventionPrefix
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    backendManagedIdentity: identitiesDeployment.outputs.managedIdentitiesList[1]
    sqlServerFqdn: storageDeployment.outputs.sqlServerFqdn
    sqlDatabaseName: storageDeployment.outputs.sqlDatabasePrimaryName
    cosmosEndpoint: storageDeployment.outputs.cosmosEndpoint
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

module configurationBootstrap 'bootstrap/configuration.bicep' = {
  name: 'configurationBootstrap-${resourceDeploymentDate}'
  dependsOn: [appConfigRbac, keyVaultRbac, backendAccessProbe]
  params: {
    resourceConventionPrefix: resourceConventionPrefix
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    infrastructureManagedIdentity: identitiesDeployment.outputs.managedIdentitiesList[2]
    keyVaultUri: configurationDeployment.outputs.keyVaultUri
    appConfigurationEndpoint: configurationDeployment.outputs.appConfigurationEndpoint
    cognitiveServicesKey: aiDeployment.outputs.cognitiveServicesKey
    configuration: {
      tenantId: subscription().tenantId
      subscriptionId: subscription().subscriptionId
      sqlServerFqdn: storageDeployment.outputs.sqlServerFqdn
      sqlDatabaseName: storageDeployment.outputs.sqlDatabasePrimaryName
      backendManagedIdentityClientId: identitiesDeployment.outputs.managedIdentitiesList[1].clientId
      cosmosEndpoint: storageDeployment.outputs.cosmosEndpoint
      blobEndpoint: storageDeployment.outputs.storageAccountBlobEndpoint
      telemetryConnectionString: observabilityDeployment.outputs.appInsightsConnectionString
      cognitiveServicesEndpoint: aiDeployment.outputs.aiResources.aiFoundryEndpoint
      apiUrl: 'https://api.arolariu.ro'
    }
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
  stage: 'foundation'
  resourceGroupName: resourceGroup().name
  resourcePrefix: resourceConventionPrefix
  location: resourceLocation
  dnsDelegation: {
    zoneName: networkDeployment.outputs.dnsZoneName
    nameServers: networkDeployment.outputs.dnsZoneNameServers
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
  sqlAccessVerified: backendAccessProbe.outputs.completed
  configurationPopulated: configurationBootstrap.outputs.completed
  pendingExternalSecretNames: configurationBootstrap.outputs.pendingExternalSecretNames
  resources: {
    keyVaultName: configurationDeployment.outputs.keyVaultName
    appConfigurationName: configurationDeployment.outputs.appConfigurationName
    containerRegistryName: storageDeployment.outputs.containerRegistryName
  }
}
