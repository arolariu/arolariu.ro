targetScope = 'resourceGroup'

metadata description = 'This file contains the bicep code for deploying the Azure Computer Vision service.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The location for the Computer Vision service.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param computerVisionLocation string

@description('The prefix to use for the names of the resources.')
@minLength(1)
@maxLength(20)
param computerVisionConventionPrefix string

@description('The date when the deployment is executed.')
param computerVisionDeploymentDate string

@description('The backend managed identity id to which we will grant access to the AI services.')
param backendManagedIdentityId string

import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: computerVisionDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'ai'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource computerVision 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' = {
  name: '${computerVisionConventionPrefix}-ai-acc'
  location: computerVisionLocation
  sku: {
    name: 'S0'
  }
  kind: 'ComputerVision'
  properties: {
    customSubDomainName: '${computerVisionConventionPrefix}-computervision'
    publicNetworkAccess: 'Enabled'
  }
  tags: union(commonTags, {
    sku: 'Free Tier'
  })
}

resource computerVisionRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(computerVision.id, backendManagedIdentityId, 'Cognitive Services User')
  scope: computerVision
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908')
    principalId: backendManagedIdentityId
    principalType: 'ServicePrincipal'
  }
}

output computerVisionId string = computerVision.id
output computerVisionEndpoint string = computerVision.properties.endpoint
output resource object = computerVision
