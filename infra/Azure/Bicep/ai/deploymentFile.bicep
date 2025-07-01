targetScope = 'resourceGroup'

metadata description = 'This file acts as a deployment file for all the AI resources.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

@description('The backend managed identity id to which we will grant access to the AI services.')
param backendManagedIdentityId string

var aiConventionPrefix = '${resourceConventionPrefix}-ai'

module openAiDeployment 'openai.bicep' = {
  scope: resourceGroup()
  name: 'openAiDeployment-${resourceDeploymentDate}'
  params: {
    openAiLocation: resourceLocation
    openAiConventionPrefix: aiConventionPrefix
    openAiDeploymentDate: resourceDeploymentDate
    backendManagedIdentityId: backendManagedIdentityId
  }
}

module computerVisionDeployment 'computervision.bicep' = {
  scope: resourceGroup()
  name: 'computerVisionDeployment-${resourceDeploymentDate}'
  params: {
    computerVisionLocation: resourceLocation
    computerVisionConventionPrefix: aiConventionPrefix
    computerVisionDeploymentDate: resourceDeploymentDate
    backendManagedIdentityId: backendManagedIdentityId
  }
}

output aiResources object = {
  openAiId: openAiDeployment.outputs.openAiId
  openAiEndpoint: openAiDeployment.outputs.openAiEndpoint
  computerVisionId: computerVisionDeployment.outputs.computerVisionId
  computerVisionEndpoint: computerVisionDeployment.outputs.computerVisionEndpoint
}
