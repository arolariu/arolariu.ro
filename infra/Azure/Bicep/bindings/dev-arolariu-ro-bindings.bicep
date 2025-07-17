targetScope = 'resourceGroup'

metadata description = 'Custom domain binding and managed certificate for dev.arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the DNS zone for the custom domain.')
param dnsZoneName string

@description('The name of the App Service to bind the custom domain to.')
param devWebsiteHostname string

@description('The location for the resources.')
param devWebsiteLocation string

@description('The App Service Plan ID.')
param devWebsiteAppServicePlanId string

@description('The deployment date.')
param devWebsiteDeploymentDate string

// Import common tags
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'DEVELOPMENT'
  deploymentType: 'Bicep'
  deploymentDate: devWebsiteDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'bindings'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource devWebsite 'Microsoft.Web/sites@2024-11-01' existing = { name: devWebsiteHostname }
resource dnsZone 'Microsoft.Network/dnsZones@2023-07-01-preview' existing = { name: dnsZoneName }

// Add CNAME record for domain binding
resource devCnameRecord 'Microsoft.Network/dnsZones/CNAME@2023-07-01-preview' = {
  parent: dnsZone
  name: 'dev'
  properties: {
    TTL: 3600 // 1 hour
    CNAMERecord: {
      cname: devWebsite.properties.defaultHostName
    }
  }
}

// Add TXT record for domain verification
resource devTxtRecord 'Microsoft.Network/dnsZones/TXT@2023-07-01-preview' = {
  parent: dnsZone
  name: 'asuid.dev'
  properties: {
    TTL: 3600 // 1 hour
    TXTRecords: [
      {
        value: [
          devWebsite.properties.customDomainVerificationId
        ]
      }
    ]
  }
}

// Custom domain binding for dev.arolariu.ro
resource devCustomDomain 'Microsoft.Web/sites/hostNameBindings@2024-11-01' = {
  name: 'dev.arolariu.ro'
  parent: devWebsite
  dependsOn: [devCnameRecord, devTxtRecord]
  properties: {
    hostNameType: 'Verified'
    sslState: 'Disabled' // Initially disabled, will be enabled after certificate creation
    customHostNameDnsRecordType: 'CName'
    siteName: devWebsite.name
  }
}

// App Service Managed Certificate for dev.arolariu.ro
resource devManagedCertificate 'Microsoft.Web/certificates@2024-11-01' = {
  name: 'cert-dev-arolariu-ro'
  location: devWebsiteLocation
  dependsOn: [devCustomDomain]
  properties: {
    serverFarmId: devWebsiteAppServicePlanId
    canonicalName: 'dev.arolariu.ro'
  }
  tags: union(commonTags, {
    displayName: 'Development Managed Certificate'
    resourceType: 'SSL Certificate'
  })
}

module certificateBindings 'dev-arolariu-ro-certificate-bindings.bicep' = {
  scope: resourceGroup()
  name: 'dev-arolariu-ro-certificate-bindings'
  params: {
    devWebsiteHostname: devWebsiteHostname
    devWebsiteThumbprint: devManagedCertificate.properties.thumbprint
  }
}
