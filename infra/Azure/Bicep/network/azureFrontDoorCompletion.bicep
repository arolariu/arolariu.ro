targetScope = 'resourceGroup'

metadata description = 'Associates validated Front Door domains, WAF policy, and HTTPS routing after public DNS readiness.'

@description('The existing Front Door profile name.')
param frontDoorName string

@description('The existing globally unique endpoint name.')
param frontDoorEndpointName string

resource frontDoor 'Microsoft.Cdn/profiles@2026-07-01' existing = { name: frontDoorName }
resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2026-07-01' existing = {
  parent: frontDoor
  name: frontDoorEndpointName
}
resource originGroup 'Microsoft.Cdn/profiles/originGroups@2026-07-01' existing = {
  parent: frontDoor
  name: 'production'
}
resource apexCustomDomain 'Microsoft.Cdn/profiles/customDomains@2026-07-01' existing = {
  parent: frontDoor
  name: 'apex-arolariu-ro'
}
resource wwwCustomDomain 'Microsoft.Cdn/profiles/customDomains@2026-07-01' existing = {
  parent: frontDoor
  name: 'www-arolariu-ro'
}
resource waf 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2026-04-01' existing = {
  name: 'productionWAF'
}

resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2026-07-01' = {
  parent: frontDoor
  name: 'productionWAF'
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: { id: waf.id }
      associations: [
        {
          domains: [
            { id: endpoint.id }
            { id: apexCustomDomain.id }
            { id: wwwCustomDomain.id }
          ]
          patternsToMatch: ['/*']
        }
      ]
    }
  }
}

resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2026-07-01' = {
  parent: endpoint
  name: 'production-route'
  dependsOn: [securityPolicy]
  properties: {
    cacheConfiguration: {
      compressionSettings: {
        isCompressionEnabled: false
        contentTypesToCompress: []
      }
      queryStringCachingBehavior: 'IgnoreQueryString'
    }
    customDomains: [
      { id: apexCustomDomain.id }
      { id: wwwCustomDomain.id }
    ]
    originGroup: { id: originGroup.id }
    supportedProtocols: ['Https']
    patternsToMatch: ['/*']
    httpsRedirect: 'Enabled'
    linkToDefaultDomain: 'Enabled'
    forwardingProtocol: 'HttpsOnly'
    enabledState: 'Enabled'
  }
}
