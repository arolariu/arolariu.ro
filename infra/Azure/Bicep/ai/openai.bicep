targetScope = 'resourceGroup'

metadata description = 'This file contains the bicep code for deploying the Azure OpenAI service.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The location for the OpenAI service.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param openAiLocation string

@description('The date when the deployment is executed.')
param openAiDeploymentDate string

@description('The prefix to use for the names of the resources.')
param openAiConventionPrefix string

@description('The backend managed identity to which we will grant access to the AI services.')
param backendManagedIdentityId string

import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: openAiDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'ai'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource openAi 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' = {
  name: '${openAiConventionPrefix}-openai'
  location: openAiLocation
  sku: {
    name: 'S0'
  }
  kind: 'OpenAI'
  properties: {
    customSubDomainName: '${openAiConventionPrefix}-openai'
    publicNetworkAccess: 'Enabled'
  }
  tags: union(commonTags, {
    sku: 'Free Tier'
  })
}

resource openAiRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openAi.id, backendManagedIdentityId, 'Cognitive Services User')
  scope: openAi
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908')
    principalId: backendManagedIdentityId
    principalType: 'ServicePrincipal'
  }
}

output openAiId string = openAi.id
output openAiEndpoint string = openAi.properties.endpoint
output resource object = openAi
