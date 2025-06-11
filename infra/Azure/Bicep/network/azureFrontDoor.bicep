targetScope = 'resourceGroup'

metadata description = 'This template will deploy an Azure Front Door resource.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the Front Door resource.')
param frontDoorName string

@description('The date when the Front Door deployment is executed.')
param frontDoorDeploymentDate string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: frontDoorDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'network'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

var frontDoorCdnOrigins = [
  {
    name: 'apex-domain'
    hostName: 'arolariu.ro'
    httpPort: 80
    httpsPort: 443
    originHostHeader: 'arolariu.ro'
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: false
  }
  {
    name: 'www-subdomain'
    hostName: 'www.arolariu.ro'
    httpPort: 80
    httpsPort: 443
    originHostHeader: 'www.arolariu.ro'
    priority: 2
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: false
  }
]

resource frontDoor 'Microsoft.Network/frontDoors@2021-06-01' = {
  name: frontDoorName
  location: 'Global'
  properties: {
    friendlyName: frontDoorName
    enabledState: 'Enabled'
  }
  tags: union(commonTags, {
    displayName: 'Front Door'
    resourceType: 'Front Door'
  })
}

resource frontDoorProfile 'Microsoft.Cdn/profiles@2024-05-01-preview' = {
  name: frontDoorName
  location: 'Global'
  dependsOn: [frontDoor]
  sku: { name: 'Standard_AzureFrontDoor' }
  properties: { originResponseTimeoutSeconds: 16 }
}

resource frontDoorProfileRuleSet 'Microsoft.Cdn/profiles/ruleSets@2024-05-01-preview' = {
  parent: frontDoorProfile
  name: 'CdnRuleSet'
}

resource frontDoorProfileRuleSetRules 'Microsoft.Cdn/profiles/ruleSets/rules@2024-05-01-preview' = {
  parent: frontDoorProfileRuleSet
  name: 'CdnRules'
  properties: {
    order: 3
    conditions: [
      {
        name: 'RequestHeader'
        parameters: {
          typeName: 'DeliveryRuleRequestHeaderConditionParameters'
          operator: 'Equal'
          selector: 'Origin'
          negateCondition: false
          matchValues: ['https://arolariu.ro', 'https://www.arolariu.ro']
          transforms: []
        }
      }
    ]
    actions: [
      {
        name: 'ModifyResponseHeader'
        parameters: {
          typeName: 'DeliveryRuleHeaderActionParameters'
          headerAction: 'Overwrite'
          headerName: 'Access-Control-Allow-Origin'
          value: 'https://arolariu.ro'
        }
      }
      {
        name: 'ModifyResponseHeader'
        parameters: {
          typeName: 'DeliveryRuleHeaderActionParameters'
          headerAction: 'Append'
          headerName: 'X-Woff2-Access'
          value: 'ALLOW'
        }
      }
    ]
    matchProcessingBehavior: 'Continue'
  }
}

resource frontDoorProductionEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-05-01-preview' = {
  parent: frontDoorProfile
  name: 'production'
  location: 'Global'
}

resource frontDoorCdnEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-05-01-preview' = {
  parent: frontDoorProfile
  name: 'cdn'
  location: 'Global'
}

resource frontDoorProductionOriginGroups 'Microsoft.Cdn/profiles/originGroups@2024-05-01-preview' = {
  parent: frontDoorProfile
  name: 'production'
  properties: {
    sessionAffinityState: 'Enabled'
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
  }
}

resource frontDoorCdnOriginGroups 'Microsoft.Cdn/profiles/originGroups@2024-05-01-preview' = {
  parent: frontDoorProfile
  name: 'cdn'
  properties: {
    sessionAffinityState: 'Disabled'
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
  }
}

resource frontDoorCdnOriginGroupOrigins 'Microsoft.Cdn/profiles/originGroups/origins@2024-05-01-preview' = [
  for origin in frontDoorCdnOrigins: {
    parent: frontDoorCdnOriginGroups
    name: origin.name
    properties: {
      hostName: origin.hostName
      httpPort: origin.httpPort
      httpsPort: origin.httpsPort
      originHostHeader: origin.originHostHeader
      priority: origin.priority
      weight: origin.weight
      enabledState: origin.enabledState
      enforceCertificateNameCheck: origin.enforceCertificateNameCheck
    }
  }
]
