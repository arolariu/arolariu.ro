targetScope = 'subscription'

metadata description = 'This bicep file is the main entry point for any zero-touch deployment.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'

@description('The name of the resource group that will contain all the resources.')
@minLength(1)
@maxLength(90)
param resourceGroupName string

@description('The author of the resource group and deployment.')
@minLength(5)
@maxLength(100)
param resourceGroupAuthor string

@description('The location of the resource group that will contain all the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceGroupLocation string

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

resource resourceGroup 'Microsoft.Resources/resourceGroups@2025-04-01' = {
  name: resourceGroupName
  location: resourceGroupLocation
  tags: {
    deploymentType: 'Bicep'
    deploymentAuthor: resourceGroupAuthor
    deploymentDate: resourceDeploymentDate
  }
}

module mainDeployment 'facade.bicep' = {
  name: 'mainDeployment-${resourceDeploymentDate}'
  scope: resourceGroup
  params: {
    resourceDeploymentDate: resourceDeploymentDate
    resourceLocation: resourceGroupLocation
  }
}
