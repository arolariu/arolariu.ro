targetScope = 'resourceGroup'

metadata description = 'This template will create the necessary Azure DNS Zone resources for arolariu.ro with dynamic DNS records'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the Azure DNS Zone resource.')
param dnsZoneName string

@description('The FQDN of the Azure Front Door production endpoint.')
param frontDoorProductionFqdn string

@description('The hostname of the API website.')
param apiWebsiteHostname string

@description('The hostname of the development website.')
param devWebsiteHostname string

@description('The hostname of the documentation website.')
param docsWebsiteHostname string

resource dnsZone 'Microsoft.Network/dnsZones@2023-07-01-preview' = {
  name: dnsZoneName
  location: 'Global'
  properties: {
    zoneType: 'Public'
  }

  // APEX CNAME record pointing to Azure Front Door (using CNAME instead of A record for CDN)
  resource apexRecord 'CNAME@2023-07-01-preview' = {
    name: '@'
    properties: {
      TTL: 3600
      CNAMERecord: {
        cname: frontDoorProductionFqdn
      }
    }
  }

  // WWW CNAME record pointing to Azure Front Door
  resource wwwRecord 'CNAME@2023-07-01-preview' = {
    name: 'www'
    properties: {
      TTL: 3600
      CNAMERecord: {
        cname: frontDoorProductionFqdn
      }
    }
  }

  // API CNAME record pointing to API App Service
  resource apiRecord 'CNAME@2023-07-01-preview' = {
    name: 'api'
    properties: {
      TTL: 3600
      CNAMERecord: {
        cname: apiWebsiteHostname
      }
    }
  }

  // DEV CNAME record pointing to Dev App Service
  resource devRecord 'CNAME@2023-07-01-preview' = {
    name: 'dev'
    properties: {
      TTL: 3600
      CNAMERecord: {
        cname: devWebsiteHostname
      }
    }
  }

  // DOCS CNAME record pointing to Static Web App
  resource docsRecord 'CNAME@2023-07-01-preview' = {
    name: 'docs'
    properties: {
      TTL: 3600
      CNAMERecord: {
        cname: docsWebsiteHostname
      }
    }
  }

  // ACCOUNTS CNAME record pointing to Clerk services
  resource accountsRecord 'CNAME@2023-07-01-preview' = {
    name: 'accounts'
    properties: {
      TTL: 3600
      CNAMERecord: {
        cname: 'accounts.clerk.services'
      }
    }
  }
}

// Output the DNS zone name servers for domain configuration
output dnsZoneNameServers array = dnsZone.properties.nameServers
output dnsZoneName string = dnsZone.name
