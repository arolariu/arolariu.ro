targetScope = 'resourceGroup'

metadata description = 'Custom domain binding and managed certificate for cv.arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the DNS zone for the custom domain.')
param dnsZoneName string

@description('The name of the App Service to bind the custom domain to.')
param cvWebsiteHostname string

resource cvWebsite 'Microsoft.Web/staticSites@2024-11-01' existing = { name: cvWebsiteHostname }
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
resource cvCustomDomain 'Microsoft.Web/staticSites/customDomains@2024-11-01' = {
  parent: cvWebsite
  name: 'cv.arolariu.ro'
  dependsOn: [cvCnameRecord]
}
