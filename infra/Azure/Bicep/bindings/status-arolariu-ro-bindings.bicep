// =====================================================================================
// Status Website Bindings - status.arolariu.ro Custom Domain Configuration
// =====================================================================================
// This module configures the custom domain binding for the status.arolariu.ro
// service status Static Web App. Static Web Apps have a simpler domain binding
// model compared to App Services.
//
// Deployed Resources:
// - CNAME DNS record: status.arolariu.ro → Static Web App default hostname
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
// - Static Web App must exist (sites/status-arolariu-ro.bicep)
// - DNS Zone must exist (network/dnsZone.bicep)
//
// See: sites/status-arolariu-ro.bicep (Static Web App)
// See: network/dnsZone.bicep (DNS Zone)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Custom domain binding for status.arolariu.ro Static Web App'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The name of the DNS zone for the custom domain.')
param dnsZoneName string

@description('The name of the Static Web App to bind the custom domain to.')
param statusWebsiteName string

resource statusWebsite 'Microsoft.Web/staticSites@2025-03-01' existing = { name: statusWebsiteName }
resource dnsZone 'Microsoft.Network/dnsZones@2023-07-01-preview' existing = { name: dnsZoneName }

// CNAME record for status.arolariu.ro
resource statusCnameRecord 'Microsoft.Network/dnsZones/CNAME@2023-07-01-preview' = {
  parent: dnsZone
  name: 'status'
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: statusWebsite.properties.defaultHostname
    }
  }
}

// Custom domain for status.arolariu.ro with managed certificate
resource statusCustomDomain 'Microsoft.Web/staticSites/customDomains@2025-03-01' = {
  parent: statusWebsite
  name: 'status.arolariu.ro'
  dependsOn: [statusCnameRecord]
}
