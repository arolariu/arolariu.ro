targetScope = 'resourceGroup'

metadata description = 'This template will create the necessary Azure DNS Zone resources for arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the Azure DNS Zone resource.')
param dnsZoneName string

resource dnsZone 'Microsoft.Network/dnsZones@2023-07-01-preview' = {
  name: dnsZoneName
  location: 'Global'
  properties: {
    zoneType: 'Public'
  }
}
