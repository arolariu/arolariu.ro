targetScope = 'resourceGroup'

metadata description = 'Custom domain binding and managed certificate for api.arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the DNS zone for the custom domain.')
param dnsZoneName string

@description('The name of the App Service to bind the custom domain to.')
param apiWebsiteHostname string

@description('The location for the resources.')
param apiWebsiteLocation string

@description('The App Service Plan ID.')
param apiWebsiteAppServicePlanId string

@description('The deployment date.')
param apiWebsiteDeploymentDate string

// Import common tags
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'DEVELOPMENT'
  deploymentType: 'Bicep'
  deploymentDate: apiWebsiteDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'bindings'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource apiWebsite 'Microsoft.Web/sites@2024-11-01' existing = { name: apiWebsiteHostname }
resource dnsZone 'Microsoft.Network/dnsZones@2023-07-01-preview' existing = { name: dnsZoneName }

// Add CNAME record for domain binding
resource apiCnameRecord 'Microsoft.Network/dnsZones/CNAME@2023-07-01-preview' = {
  parent: dnsZone
  name: 'api'
  properties: {
    TTL: 3600 // 1 hour
    CNAMERecord: {
      cname: apiWebsite.properties.defaultHostName // Use the default hostname of the App Service
    }
  }
}

// Add TXT record for domain verification
resource apiTxtRecord 'Microsoft.Network/dnsZones/TXT@2023-07-01-preview' = {
  parent: dnsZone
  name: 'asuid.api'
  properties: {
    TTL: 3600 // 1 hour
    TXTRecords: [
      {
        value: [
          apiWebsite.properties.customDomainVerificationId
        ]
      }
    ]
  }
}

// Custom domain binding for api.arolariu.ro
resource apiCustomDomain 'Microsoft.Web/sites/hostNameBindings@2024-11-01' = {
  name: 'api.arolariu.ro'
  parent: apiWebsite
  dependsOn: [apiCnameRecord, apiTxtRecord]
  properties: {
    hostNameType: 'Verified'
    sslState: 'Disabled' // Initially disabled, will be enabled after certificate creation
    customHostNameDnsRecordType: 'CName'
    siteName: apiWebsite.name
  }
}

// App Service Managed Certificate for api.arolariu.ro
resource apiManagedCertificate 'Microsoft.Web/certificates@2024-11-01' = {
  name: 'cert-api-arolariu-ro'
  location: apiWebsiteLocation
  dependsOn: [apiCustomDomain]
  properties: {
    serverFarmId: apiWebsiteAppServicePlanId
    canonicalName: 'api.arolariu.ro'
  }
  tags: union(commonTags, {
    displayName: 'Development Managed Certificate'
    resourceType: 'SSL Certificate'
  })
}

module certificateBindings 'api-arolariu-ro-certificate-bindings.bicep' = {
  scope: resourceGroup()
  name: 'api-arolariu-ro-certificate-bindings'
  params: {
    apiWebsiteHostname: apiWebsiteHostname
    apiWebsiteThumbprint: apiManagedCertificate.properties.thumbprint
  }
}
