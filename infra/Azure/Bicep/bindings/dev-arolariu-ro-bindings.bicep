// =====================================================================================
// Development Website Bindings - dev.arolariu.ro Custom Domain Configuration
// =====================================================================================
// This module configures the custom domain binding for the dev.arolariu.ro staging
// environment. It creates the necessary DNS records and hostname bindings to enable
// the custom domain with SSL certificate.
//
// Deployed Resources:
// - CNAME DNS record: dev.arolariu.ro → App Service default hostname
// - TXT DNS record: asuid.dev.arolariu.ro (domain verification)
// - Hostname binding: Links custom domain to App Service
// - Managed certificate: Free SSL certificate from Azure
//
// Domain Verification Process:
// 1. TXT record (asuid.dev) contains customDomainVerificationId
// 2. Azure validates domain ownership via TXT lookup
// 3. CNAME record routes traffic to App Service
// 4. Managed certificate is auto-provisioned after verification
//
// Certificate Management:
// - App Service Managed Certificate (free)
// - Auto-renewed by Azure before expiration
// - Requires Basic+ App Service Plan tier
//
// Note: Development environment uses same binding pattern as production
// for consistency and realistic testing of domain-specific features.
//
// Prerequisites:
// - App Service must exist (sites/dev-arolariu-ro.bicep)
// - DNS Zone must exist (network/dnsZone.bicep)
// - App Service Plan must be Basic tier or higher
//
// See: sites/dev-arolariu-ro.bicep (App Service)
// See: network/dnsZone.bicep (DNS Zone)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Custom domain binding and certificate for dev.arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

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

resource devWebsite 'Microsoft.Web/sites@2025-03-01' existing = { name: devWebsiteHostname }
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
resource devCustomDomain 'Microsoft.Web/sites/hostNameBindings@2025-03-01' = {
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
resource devManagedCertificate 'Microsoft.Web/certificates@2025-03-01' = {
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
