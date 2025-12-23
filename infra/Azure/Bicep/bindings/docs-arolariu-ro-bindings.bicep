// =====================================================================================
// Documentation Website Bindings - docs.arolariu.ro Custom Domain Configuration
// =====================================================================================
// This module configures the custom domain binding for the docs.arolariu.ro
// documentation Static Web App. Static Web Apps have a simpler domain binding
// model compared to App Services.
//
// Deployed Resources:
// - CNAME DNS record: docs.arolariu.ro → Static Web App default hostname
// - Custom domain resource: Configures SWA to accept custom domain
//
// Static Web App Domain Binding:
// - Simpler than App Service (no separate TXT verification)
// - Azure validates via CNAME record presence
// - SSL certificate is automatically provisioned
// - No additional certificate binding resource needed
//
// Certificate Management:
// - Free managed certificate included with Static Web Apps
// - Auto-renewed by Azure
// - Available on all SKUs (including Free tier)
//
// Dependencies:
// - CNAME record must be created before custom domain binding
// - dependsOn ensures correct deployment order
//
// Prerequisites:
// - Static Web App must exist (sites/docs-arolariu-ro.bicep)
// - DNS Zone must exist (network/dnsZone.bicep)
//
// See: sites/docs-arolariu-ro.bicep (Static Web App)
// See: network/dnsZone.bicep (DNS Zone)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Custom domain binding for docs.arolariu.ro Static Web App'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The name of the DNS zone for the custom domain.')
param dnsZoneName string

@description('The name of the App Service to bind the custom domain to.')
param docsWebsiteHostname string

resource docsWebsite 'Microsoft.Web/staticSites@2024-11-01' existing = { name: docsWebsiteHostname }
resource dnsZone 'Microsoft.Network/dnsZones@2023-07-01-preview' existing = { name: dnsZoneName }

// CNAME record for docs.arolariu.ro
resource docsCnameRecord 'Microsoft.Network/dnsZones/CNAME@2023-07-01-preview' = {
  parent: dnsZone
  name: 'docs'
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: docsWebsite.properties.defaultHostname
    }
  }
}

// Custom domain for docs.arolariu.ro with managed certificate
resource docsCustomDomain 'Microsoft.Web/staticSites/customDomains@2024-11-01' = {
  parent: docsWebsite
  name: 'docs.arolariu.ro'
  dependsOn: [docsCnameRecord]
}
