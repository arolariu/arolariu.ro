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

@description('The backend managed identity principal id to which we will grant access to the AI services.')
param backendManagedIdentityPrincipalId string

var aiConventionPrefix = '${resourceConventionPrefix}-ai'

module openAiDeployment 'openai.bicep' = {
  scope: resourceGroup()
  name: 'openAiDeployment-${resourceDeploymentDate}'
  params: {
    openAiLocation: resourceLocation
    openAiConventionPrefix: aiConventionPrefix
    openAiDeploymentDate: resourceDeploymentDate
    backendManagedIdentityPrincipalId: backendManagedIdentityPrincipalId
  }
}

module aiFoundryDeployment 'aiFoundry.bicep' = {
  scope: resourceGroup()
  name: 'aiFoundryDeployment-${resourceDeploymentDate}'
  params: {
    aiFoundryLocation: resourceLocation
    aiFoundryName: '${aiConventionPrefix}-foundry'
    aiFoundryDeploymentDate: resourceDeploymentDate
  }
}

output aiResources object = {
  openAiId: openAiDeployment.outputs.openAiId
  openAiEndpoint: openAiDeployment.outputs.openAiEndpoint
  aiFoundryId: aiFoundryDeployment.outputs.aiFoundryId
  aiFoundryEndpoint: aiFoundryDeployment.outputs.aiFoundryEndpoint
  aiProjectId: aiFoundryDeployment.outputs.aiProjectId
}
