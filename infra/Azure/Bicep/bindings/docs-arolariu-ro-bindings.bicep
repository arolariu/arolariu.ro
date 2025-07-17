targetScope = 'resourceGroup'

metadata description = 'Custom domain binding and managed certificate for docs.arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

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
