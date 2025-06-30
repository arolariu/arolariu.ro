targetScope = 'resourceGroup'

metadata description = 'This template will deploy an Azure Front Door resource with production-ready configuration.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the Front Door resource.')
param frontDoorName string

@description('The date when the Front Door deployment is executed.')
param frontDoorDeploymentDate string

@description('The hostname of the main production website.')
param mainWebsiteHostname string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: frontDoorDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'network'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

// WAF Policy for Security (must be created first)
resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2025-03-01' = {
  name: '${frontDoorName}waf'
  location: 'Global'
  sku: { name: 'Standard_AzureFrontDoor' }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'
      requestBodyCheck: 'Enabled'
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
          ruleGroupOverrides: []
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.0'
          ruleGroupOverrides: []
        }
      ]
    }
  }
  tags: union(commonTags, {
    displayName: 'WAF Policy'
    resourceType: 'WAF Policy'
  })
}

// Azure Front Door Profile with nested resources
resource frontDoorProfile 'Microsoft.Cdn/profiles@2025-04-15' = {
  name: frontDoorName
  location: 'Global'
  sku: { name: 'Standard_AzureFrontDoor' }
  properties: {
    originResponseTimeoutSeconds: 16
  }
  tags: union(commonTags, {
    displayName: 'Azure Front Door Profile'
    resourceType: 'CDN Profile'
  })

  // Custom Domain for APEX
  resource apexCustomDomain 'customDomains@2025-04-15' = {
    name: 'apex-arolariu-ro'
    properties: {
      hostName: 'arolariu.ro'
      tlsSettings: {
        certificateType: 'ManagedCertificate'
        minimumTlsVersion: 'TLS12'
      }
    }
  }

  // Custom Domain for WWW
  resource wwwCustomDomain 'customDomains@2025-04-15' = {
    name: 'www-arolariu-ro'
    properties: {
      hostName: 'www.arolariu.ro'
      tlsSettings: {
        certificateType: 'ManagedCertificate'
        minimumTlsVersion: 'TLS12'
      }
    }
  }

  // Production Origin Group
  resource productionOriginGroup 'originGroups@2025-04-15' = {
    name: 'production'
    properties: {
      sessionAffinityState: 'Enabled'
      loadBalancingSettings: {
        sampleSize: 4
        successfulSamplesRequired: 3
        additionalLatencyInMilliseconds: 50
      }
      healthProbeSettings: {
        probePath: '/'
        probeRequestType: 'HEAD'
        probeProtocol: 'Https'
        probeIntervalInSeconds: 100
      }
    }

    // Production Origin (nested within origin group)
    resource productionOrigin 'origins@2025-04-15' = {
      name: 'production-origin'
      properties: {
        hostName: mainWebsiteHostname
        httpPort: 80
        httpsPort: 443
        originHostHeader: mainWebsiteHostname
        priority: 1
        weight: 1000
        enabledState: 'Enabled'
        enforceCertificateNameCheck: false
      }
    }
  }

  // Production Endpoint
  resource productionEndpoint 'afdEndpoints@2025-04-15' = {
    name: 'production'
    location: 'Global'
    properties: {
      enabledState: 'Enabled'
    }
    tags: union(commonTags, {
      displayName: 'Production Endpoint'
    })

    // Production Route (nested within endpoint)
    resource productionRoute 'routes@2025-04-15' = {
      name: 'production-route'
      properties: {
        customDomains: [
          {
            id: apexCustomDomain.id
          }
          {
            id: wwwCustomDomain.id
          }
        ]
        originGroup: {
          id: productionOriginGroup.id
        }
        supportedProtocols: ['Https']
        patternsToMatch: ['/*']
        httpsRedirect: 'Enabled'
        linkToDefaultDomain: 'Enabled'
        forwardingProtocol: 'HttpsOnly'
        cacheConfiguration: {
          queryStringCachingBehavior: 'IgnoreQueryString'
        }
        enabledState: 'Enabled'
      }
      dependsOn: [
        productionOriginGroup::productionOrigin
      ]
    }
  }

  // Security Policy for Production
  resource securityPolicy 'securityPolicies@2025-04-15' = {
    name: 'production-security-policy'
    properties: {
      parameters: {
        type: 'WebApplicationFirewall'
        wafPolicy: {
          id: wafPolicy.id
        }
        associations: [
          {
            domains: [
              { id: apexCustomDomain.id }
              { id: wwwCustomDomain.id }
            ]
            patternsToMatch: ['/*']
          }
        ]
      }
    }
  }

  // CDN Endpoint
  resource cdnEndpoint 'afdEndpoints@2025-04-15' = {
    name: 'cdn'
    location: 'Global'
    properties: {
      enabledState: 'Enabled'
    }
    tags: union(commonTags, {
      displayName: 'CDN Endpoint'
    })
  }
}

output frontDoorProductionFqdn string = frontDoorProfile::productionEndpoint.properties.hostName
output frontDoorCdnFqdn string = frontDoorProfile::cdnEndpoint.properties.hostName
output frontDoorProfileId string = frontDoorProfile.id
