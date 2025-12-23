// =====================================================================================
// CV Website Bindings - cv.arolariu.ro Custom Domain Configuration
// =====================================================================================
// This module configures the custom domain binding for the cv.arolariu.ro
// personal resume Static Web App. Static Web Apps have a simpler domain binding
// model compared to App Services.
//
// Deployed Resources:
// - CNAME DNS record: cv.arolariu.ro → Static Web App default hostname
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
// - Static Web App must exist (sites/cv-arolariu-ro.bicep)
// - DNS Zone must exist (network/dnsZone.bicep)
//
// See: sites/cv-arolariu-ro.bicep (Static Web App)
// See: network/dnsZone.bicep (DNS Zone)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Custom domain binding for cv.arolariu.ro Static Web App'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The name of the DNS zone for the custom domain.')
param dnsZoneName string

@description('The name of the App Service to bind the custom domain to.')
param cvWebsiteHostname string

resource cvWebsite 'Microsoft.Web/staticSites@2025-03-01' existing = { name: cvWebsiteHostname }
resource dnsZone 'Microsoft.Network/dnsZones@2023-07-01-preview' existing = { name: dnsZoneName }

// CNAME record for cv.arolariu.ro
resource cvCnameRecord 'Microsoft.Network/dnsZones/CNAME@2023-07-01-preview' = {
  parent: dnsZone
  name: 'cv'
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: cvWebsite.properties.defaultHostname
    }
  }
}

// Custom domain for cv.arolariu.ro with managed certificate
resource cvCustomDomain 'Microsoft.Web/staticSites/customDomains@2025-03-01' = {
  parent: cvWebsite
  name: 'cv.arolariu.ro'
  dependsOn: [cvCnameRecord]
}
