targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

var azureFrontDoorName = '${resourceConventionPrefix}-afd'

module azureFrontDoorDeployment 'azureFrontDoor.bicep' = {
  scope: resourceGroup()
  name: 'azureFrontDoorDeployment-${resourceDeploymentDate}'
  params: { frontDoorName: azureFrontDoorName }
}
