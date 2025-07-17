targetScope = 'resourceGroup'

metadata description = 'This template deploys an Azure AI Foundry instance.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The location for the AI Foundry instance.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param aiFoundryLocation string

@description('The date when the deployment is executed.')
param aiFoundryDeploymentDate string

@description('The name of the AI Foundry instance.')
param aiFoundryName string

import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: aiFoundryDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'ai'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource aiFoundry 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: aiFoundryName
  location: aiFoundryLocation
  identity: { type: 'SystemAssigned' }
  sku: { name: 'S0' }
  kind: 'AIServices'
  properties: {
    apiProperties: {}
    customSubDomainName: aiFoundryName
    networkAcls: {
      defaultAction: 'Allow'
      virtualNetworkRules: []
      ipRules: []
    }
    allowProjectManagement: true
    publicNetworkAccess: 'Enabled'
    defaultProject: 'arolariu.ro'
    associatedProjects: ['arolariu.ro']
  }
  tags: union(commonTags, {
    sku: 'Standard'
  })

  resource aiProject 'projects@2025-06-01' = {
    name: 'arolariu.ro'
    location: aiFoundryLocation
    identity: { type: 'SystemAssigned' }
    properties: {
      description: 'AI project for arolariu.ro'
      displayName: 'arolariu.ro AI Project'
    }
  }
}

// Output the AI Foundry instance details
output aiFoundryId string = aiFoundry.id
output aiFoundryEndpoint string = aiFoundry.properties.endpoint
output aiProjectId string = aiFoundry::aiProject.id
