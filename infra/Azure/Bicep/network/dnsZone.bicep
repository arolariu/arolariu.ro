targetScope = 'resourceGroup'

metadata description = 'Prepares the public DNS zone, DNSSEC, and Azure-owned records before domain completion.'

import { createTags } from '../constants/tags.bicep'
import { dnsRecord } from '../types/dns.type.bicep'

@description('The public DNS zone name.')
param dnsZoneName string

@description('The audit timestamp used for resource tags.')
param dnsZoneDeploymentDate string

@description('The actual globally unique Front Door endpoint resource ID.')
param frontDoorEndpointId string

@description('The actual Front Door endpoint hostname.')
param frontDoorProductionFqdn string

@description('The apex Front Door ownership-verification token.')
param frontDoorApexCustomDomainValidationToken string

@description('The www Front Door ownership-verification token.')
param frontDoorWwwCustomDomainValidationToken string

@description('Relative application CNAME/TXT records resolved from actual site resources.')
param applicationDnsRecords dnsRecord[]

resource dnsZone 'Microsoft.Network/dnsZones@2018-05-01' = {
  name: dnsZoneName
  location: 'Global'
  properties: { zoneType: 'Public' }
  tags: createTags('network', dnsZoneDeploymentDate)
}

resource dnssecResource 'Microsoft.Network/dnsZones/dnssecConfigs@2023-07-01-preview' = {
  parent: dnsZone
  name: 'default'
}

resource apexRecord 'Microsoft.Network/dnsZones/A@2018-05-01' = {
  parent: dnsZone
  name: '@'
  properties: {
    TTL: 3600
    targetResource: { id: frontDoorEndpointId }
  }
}

resource wwwRecord 'Microsoft.Network/dnsZones/CNAME@2018-05-01' = {
  parent: dnsZone
  name: 'www'
  properties: {
    TTL: 3600
    CNAMERecord: { cname: frontDoorProductionFqdn }
  }
}

resource apexVerification 'Microsoft.Network/dnsZones/TXT@2018-05-01' = {
  parent: dnsZone
  name: '_dnsauth'
  properties: {
    TTL: 3600
    TXTRecords: [{ value: [frontDoorApexCustomDomainValidationToken] }]
  }
}

resource wwwVerification 'Microsoft.Network/dnsZones/TXT@2018-05-01' = {
  parent: dnsZone
  name: '_dnsauth.www'
  properties: {
    TTL: 3600
    TXTRecords: [{ value: [frontDoorWwwCustomDomainValidationToken] }]
  }
}

resource applicationCnames 'Microsoft.Network/dnsZones/CNAME@2018-05-01' = [
  for record in filter(applicationDnsRecords, record => record.type == 'CNAME'): {
    parent: dnsZone
    name: record.name
    properties: {
      TTL: 3600
      CNAMERecord: { cname: record.expectedValues[0] }
    }
  }
]

resource applicationVerification 'Microsoft.Network/dnsZones/TXT@2018-05-01' = [
  for record in filter(applicationDnsRecords, record => record.type == 'TXT'): {
    parent: dnsZone
    name: record.name
    properties: {
      TTL: 3600
      TXTRecords: [{ value: record.expectedValues }]
    }
  }
]

output dnsZoneName string = dnsZone.name
output dnsZoneId string = dnsZone.id
output dnsZoneNameServers string[] = dnsZone.properties.nameServers
output dnsZoneDsRecords string[] = flatten(map(
  dnssecResource.properties.signingKeys ?? [],
  key => map(key.delegationSignerInfo ?? [], signer => toUpper(signer.record))
))
