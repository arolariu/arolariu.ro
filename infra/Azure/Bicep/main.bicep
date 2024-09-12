targetScope = 'subscription'

metadata description = 'This bicep file is the main entry point for any zero-touch deployment.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'

@description('The name of the resource group that will contain all the resources.')
param resourceGroupName string = 'myResourceGroup'

@description('The author of the resource group // deployment.')
param resourceGroupAuthor string = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'

@description('The location of the resource group that will contain all the resources.')
param resourceGroupLocation string = 'EastUS'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
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
}
