targetScope = 'resourceGroup'

metadata description = 'This file acts a facade that will be called by the main bicep file. This file contains all module deployments (compute, storage, identity, etc.). This file is responsible for deploying all the modules.'

metadata author = 'Alexandru-Razvan Olariu'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix that will be used for all the resources.')
param resourceConventionPrefix string = '${substring(uniqueString(resourceGroup().id), 0, 6)}-arolariu'

module identitiesDeployment 'identity/deploymentFile.bicep' = {
  name: 'identitiesDeployment-${resourceDeploymentDate}'
  params: { resourceConventionPrefix: resourceConventionPrefix }
  scope: resourceGroup()
}

module configurationDeployment 'configuration/deploymentFile.bicep' = {
  name: 'configurationDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment]
  scope: resourceGroup()
  params: {
    resourceConventionPrefix: resourceConventionPrefix
    managedIdentityFrontendId: identitiesDeployment.outputs.managedIdentitiesList[0].id
    managedIdentityBackendId: identitiesDeployment.outputs.managedIdentitiesList[1].id
    managedIdentityInfraId: identitiesDeployment.outputs.managedIdentitiesList[2].id
  }
}

module observabilityDeployment 'observability/deploymentFile.bicep' = {
  name: 'observabilityDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment, configurationDeployment]
  scope: resourceGroup()
  params: {
    resourceConventionPrefix: resourceConventionPrefix
    managedIdentityFrontendId: identitiesDeployment.outputs.managedIdentitiesList[0].id
    managedIdentityBackendId: identitiesDeployment.outputs.managedIdentitiesList[1].id
    managedIdentityInfraId: identitiesDeployment.outputs.managedIdentitiesList[2].id
  }
}

module storageDeployment 'storage/deploymentFile.bicep' = {
  name: 'storageDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment]
  scope: resourceGroup()
  params: {
    resourceConventionPrefix: resourceConventionPrefix
    managedIdentityFrontendId: identitiesDeployment.outputs.managedIdentitiesList[0].id
    managedIdentityBackendId: identitiesDeployment.outputs.managedIdentitiesList[1].id
    managedIdentityInfraId: identitiesDeployment.outputs.managedIdentitiesList[2].id
  }
}

module computeDeployment 'compute/deploymentFile.bicep' = {
  name: 'computeDeployment-${resourceDeploymentDate}'
  params: { resourceConventionPrefix: '${resourceConventionPrefix}-cpu-' }
  scope: resourceGroup()
}

module websiteDeployment 'sites/deploymentFile.bicep' = {
  name: 'websiteDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment]
  scope: resourceGroup()
  params: {
    productionAppPlanId: computeDeployment.outputs.productionAppPlanId
    developmentAppPlanId: computeDeployment.outputs.developmentAppPlanId
    managedIdentityFrontendId: identitiesDeployment.outputs.managedIdentitiesList[0].id
    managedIdentityBackendId: identitiesDeployment.outputs.managedIdentitiesList[1].id
    managedIdentityInfraId: identitiesDeployment.outputs.managedIdentitiesList[2].id
  }
}
