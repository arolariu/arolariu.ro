// =====================================================================================
// API Website Bindings - api.arolariu.ro Custom Domain Configuration
// =====================================================================================
// This module configures the custom domain binding for the api.arolariu.ro backend
// API. It creates the necessary DNS records and hostname bindings to enable the
// custom domain with SSL certificate.
//
// Deployed Resources:
// - CNAME DNS record: api.arolariu.ro → App Service default hostname
// - TXT DNS record: asuid.api.arolariu.ro (domain verification)
// - Hostname binding: Links custom domain to App Service
// - Managed certificate: Free SSL certificate from Azure
//
// Domain Verification Process:
// 1. TXT record (asuid.api) contains customDomainVerificationId
// 2. Azure validates domain ownership via TXT lookup
// 3. CNAME record routes traffic to App Service
// 4. Managed certificate is auto-provisioned after verification
//
// Certificate Management:
// - App Service Managed Certificate (free)
// - Auto-renewed by Azure before expiration
// - Requires Basic+ App Service Plan tier
//
// TTL Configuration:
// - 3600 seconds (1 hour) for DNS records
// - Lower TTL during initial setup for faster propagation
//
// Prerequisites:
// - App Service must exist (sites/api-arolariu-ro.bicep)
// - DNS Zone must exist (network/dnsZone.bicep)
// - App Service Plan must be Basic tier or higher
//
// See: sites/api-arolariu-ro.bicep (App Service)
// See: network/dnsZone.bicep (DNS Zone)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Custom domain binding and certificate for api.arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

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

resource apiWebsite 'Microsoft.Web/sites@2025-03-01' existing = { name: apiWebsiteHostname }
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
resource apiCustomDomain 'Microsoft.Web/sites/hostNameBindings@2025-03-01' = {
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
resource apiManagedCertificate 'Microsoft.Web/certificates@2025-03-01' = {
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
