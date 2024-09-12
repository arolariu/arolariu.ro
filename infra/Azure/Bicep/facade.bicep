targetScope = 'resourceGroup'

metadata description = 'This file acts a facade that will be called by the main bicep file. This file contains all module deployments (compute, storage, identity, etc.). This file is responsible for deploying all the modules.'

metadata author = 'Alexandru-Razvan Olariu'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

var resourceConventionPrefix = substring(uniqueString(resourceDeploymentDate), 0, 6)

module identitiesDeployment 'identity/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'identitiesDeployment-${resourceDeploymentDate}'
  params: { resourceConventionPrefix: resourceConventionPrefix }
}

module configurationDeployment 'configuration/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'configurationDeployment-${resourceDeploymentDate}'
  params: { resourceConventionPrefix: resourceConventionPrefix }
}

module observabilityDeployment 'observability/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'observabilityDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment, configurationDeployment]
  params: { resourceConventionPrefix: resourceConventionPrefix }
}

module storageDeployment 'storage/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'storageDeployment-${resourceDeploymentDate}'
  params: { resourceConventionPrefix: resourceConventionPrefix }
}

module computeDeployment 'compute/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'computeDeployment-${resourceDeploymentDate}'
  params: { resourceConventionPrefix: resourceConventionPrefix }
}

module websiteDeployment 'sites/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'websiteDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment]
  params: {
    productionAppPlanId: computeDeployment.outputs.productionAppPlanId
    developmentAppPlanId: computeDeployment.outputs.developmentAppPlanId
    managedIdentityFrontendId: identitiesDeployment.outputs.managedIdentitiesList[0].id
    managedIdentityBackendId: identitiesDeployment.outputs.managedIdentitiesList[1].id
  }
}
