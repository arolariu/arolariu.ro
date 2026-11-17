targetScope = 'resourceGroup'

metadata description = 'Completes the experiments hostname and managed certificate after public DNS readiness.'

import { createTags } from '../constants/tags.bicep'

@description('The existing public DNS zone.')
param dnsZoneName string

@description('The existing experiments App Service name.')
param expWebsiteHostname string

@description('The actual experiments App Service location.')
param expWebsiteLocation string

@description('The actual experiments App Service Plan ID.')
param expWebsiteAppServicePlanId string

@description('The audit timestamp used for certificate tags.')
param expWebsiteDeploymentDate string

resource expWebsite 'Microsoft.Web/sites@2025-03-01' existing = { name: expWebsiteHostname }

resource expCustomDomain 'Microsoft.Web/sites/hostNameBindings@2025-03-01' = {
  parent: expWebsite
  name: 'exp.${dnsZoneName}'
  properties: {
    hostNameType: 'Verified'
    sslState: 'Disabled'
    customHostNameDnsRecordType: 'CName'
    siteName: expWebsite.name
  }
}

resource expManagedCertificate 'Microsoft.Web/certificates@2025-03-01' = {
  name: 'cert-exp-arolariu-ro'
  location: expWebsiteLocation
  dependsOn: [expCustomDomain]
  properties: {
    serverFarmId: expWebsiteAppServicePlanId
    canonicalName: 'exp.${dnsZoneName}'
  }
  tags: createTags('bindings', expWebsiteDeploymentDate)
}

module certificateBindings 'exp-arolariu-ro-certificate-bindings.bicep' = {
  name: 'exp-arolariu-ro-certificate-bindings'
  params: {
    expWebsiteHostname: expWebsiteHostname
    expWebsiteThumbprint: expManagedCertificate.properties.thumbprint
  }
}
