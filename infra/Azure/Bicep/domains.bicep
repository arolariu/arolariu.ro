targetScope = 'resourceGroup'

metadata description = 'Completes domains after public DNS readiness without recreating the platform foundation.'

@description('The stable namespace created by the facade.')
param resourceConventionPrefix string

@description('The existing regional application location.')
param resourceLocation string

@description('The audit timestamp used for execution and deployment names.')
param resourceDeploymentDate string

resource mainWebsite 'Microsoft.Web/sites@2025-03-01' existing = { name: 'www-arolariu-ro' }
resource apiWebsite 'Microsoft.Web/sites@2025-03-01' existing = { name: 'api-arolariu-ro' }
resource devWebsite 'Microsoft.Web/sites@2025-03-01' existing = { name: 'dev-arolariu-ro' }
resource expWebsite 'Microsoft.Web/sites@2025-03-01' existing = { name: 'exp-arolariu-ro' }
resource cvWebsite 'Microsoft.Web/staticSites@2025-03-01' existing = { name: 'cv-arolariu-ro' }
resource docsWebsite 'Microsoft.Web/staticSites@2025-03-01' existing = { name: 'docs-arolariu-ro' }
resource statusWebsite 'Microsoft.Web/staticSites@2025-03-01' existing = { name: 'status-arolariu-ro' }

resource infrastructure 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' existing = {
  name: '${resourceConventionPrefix}-infrastructure'
}

resource dnsZone 'Microsoft.Network/dnsZones@2018-05-01' existing = { name: 'arolariu.ro' }
resource dnssec 'Microsoft.Network/dnsZones/dnssecConfigs@2023-07-01-preview' existing = {
  parent: dnsZone
  name: 'default'
}
resource frontDoor 'Microsoft.Cdn/profiles@2026-07-01' existing = {
  name: '${resourceConventionPrefix}-afd'
}
resource frontDoorEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2026-07-01' existing = {
  parent: frontDoor
  name: '${resourceConventionPrefix}-afd-production'
}
resource apexCustomDomain 'Microsoft.Cdn/profiles/customDomains@2026-07-01' existing = {
  parent: frontDoor
  name: 'apex-arolariu-ro'
}
resource wwwCustomDomain 'Microsoft.Cdn/profiles/customDomains@2026-07-01' existing = {
  parent: frontDoor
  name: 'www-arolariu-ro'
}

var currentDsRecords = flatten(map(
  dnssec.properties.signingKeys ?? [],
  key => map(key.delegationSignerInfo ?? [], signer => toUpper(signer.record))
))
var expectedCnames = [
  { name: 'www.${dnsZone.name}', type: 'CNAME', expectedValues: [frontDoorEndpoint.properties.hostName] }
  { name: 'api.${dnsZone.name}', type: 'CNAME', expectedValues: [apiWebsite.properties.defaultHostName] }
  { name: 'dev.${dnsZone.name}', type: 'CNAME', expectedValues: [devWebsite.properties.defaultHostName] }
  { name: 'exp.${dnsZone.name}', type: 'CNAME', expectedValues: [expWebsite.properties.defaultHostName] }
  { name: 'docs.${dnsZone.name}', type: 'CNAME', expectedValues: [docsWebsite.properties.defaultHostname] }
  { name: 'cv.${dnsZone.name}', type: 'CNAME', expectedValues: [cvWebsite.properties.defaultHostname] }
  { name: 'status.${dnsZone.name}', type: 'CNAME', expectedValues: [statusWebsite.properties.defaultHostname] }
]
var expectedVerification = [
  {
    name: '_dnsauth.${dnsZone.name}'
    type: 'TXT'
    expectedValues: [apexCustomDomain.properties.validationProperties.validationToken]
  }
  {
    name: '_dnsauth.www.${dnsZone.name}'
    type: 'TXT'
    expectedValues: [wwwCustomDomain.properties.validationProperties.validationToken]
  }
  { name: 'asuid.api.${dnsZone.name}', type: 'TXT', expectedValues: [apiWebsite.properties.customDomainVerificationId] }
  { name: 'asuid.dev.${dnsZone.name}', type: 'TXT', expectedValues: [devWebsite.properties.customDomainVerificationId] }
  { name: 'asuid.exp.${dnsZone.name}', type: 'TXT', expectedValues: [expWebsite.properties.customDomainVerificationId] }
]

module dnsReadiness 'bootstrap/dns-readiness.bicep' = {
  name: 'dnsReadiness-${resourceDeploymentDate}'
  params: {
    resourceConventionPrefix: resourceConventionPrefix
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    infrastructureManagedIdentity: {
      name: infrastructure.name
      displayName: infrastructure.name
      resourceId: infrastructure.id
      clientId: infrastructure.properties.clientId
      principalId: infrastructure.properties.principalId
    }
    expectedRecords: {
      zoneName: dnsZone.name
      authoritativeNameServers: dnsZone.properties.nameServers
      records: concat(
        [
          { name: dnsZone.name, type: 'A', expectedValues: [] }
          { name: dnsZone.name, type: 'DS', expectedValues: currentDsRecords }
        ],
        expectedCnames,
        expectedVerification
      )
    }
  }
}

module bindingsDeployment 'bindings/deploymentFile.bicep' = {
  name: 'bindingsDeployment-${resourceDeploymentDate}'
  dependsOn: [dnsReadiness]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    dnsZoneName: dnsZone.name
    apiWebsiteAppServicePlanId: apiWebsite.properties.serverFarmId
    devWebsiteAppServicePlanId: devWebsite.properties.serverFarmId
    expWebsiteAppServicePlanId: expWebsite.properties.serverFarmId
    apiWebsiteHostname: apiWebsite.name
    devWebsiteHostname: devWebsite.name
    expWebsiteHostname: expWebsite.name
    cvWebsiteHostname: cvWebsite.name
    docsWebsiteHostname: docsWebsite.name
    statusWebsiteName: statusWebsite.name
  }
}

module frontDoorCompletion 'network/azureFrontDoorCompletion.bicep' = {
  name: 'frontDoorCompletion-${resourceDeploymentDate}'
  dependsOn: [dnsReadiness]
  params: {
    frontDoorName: frontDoor.name
    frontDoorEndpointName: frontDoorEndpoint.name
  }
}

output deploymentInfo object = {
  stage: 'domains'
  resourceGroupName: resourceGroup().name
  resourcePrefix: resourceConventionPrefix
  dnsVerified: dnsReadiness.outputs.completed
  frontDoorEndpoint: frontDoorEndpoint.properties.hostName
  dnsZoneName: dnsZone.name
  websiteName: mainWebsite.name
  executionResourceIds: dnsReadiness.outputs.executionResourceIds
}
