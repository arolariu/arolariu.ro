// =====================================================================================
// Azure Front Door - Global CDN, WAF, and Load Balancer
// =====================================================================================
// This module provisions Azure Front Door Standard tier which provides:
// - Global CDN with 118+ edge locations worldwide
// - Web Application Firewall (WAF) protection
// - SSL/TLS termination with managed certificates
// - Intelligent routing and load balancing
// - Origin health probes and automatic failover
//
// Deployed Resources:
// - Front Door Profile (CDN/AFD resource)
// - WAF Policy (Web Application Firewall rules)
// - Custom Domains (arolariu.ro, www.arolariu.ro, cdn.arolariu.ro)
// - Endpoints and Routes (production traffic routing)
// - Origin Groups (backend App Services)
//
// SKU: Standard_AzureFrontDoor
// - Includes WAF capability (prevention mode)
// - Managed certificates for custom domains
// - Consider Premium for private link to origins
//
// WAF Configuration:
// - Mode: Prevention (blocks malicious requests)
// - Request body inspection enabled
// - Custom rules can be added for specific protection
//
// Custom Domains:
// - apex (arolariu.ro) - requires DNS ALIAS record
// - www (www.arolariu.ro) - uses CNAME record
// - cdn (cdn.arolariu.ro) - static asset delivery
//
// TLS Configuration:
// - Minimum TLS 1.2 enforced
// - Managed certificates auto-renewed by Azure
//
// See: network/dnsZone.bicep (DNS records for domain validation)
// See: sites/*.bicep (origin hosts)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure Front Door with WAF, custom domains, and CDN'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

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

resource frontDoorWebApplicationFirewall 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2025-10-01' = {
  name: 'productionWAF'
  location: 'Global'
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'
      requestBodyCheck: 'Enabled'
    }
    customRules: {
      rules: []
    }
    managedRules: {
      managedRuleSets: []
    }
  }

  tags: union(commonTags, {
    displayName: 'WAF Policy for Azure Front Door'
    resourceType: 'WAF Policy'
  })
}

// Azure Front Door Profile with nested resources
resource frontDoorProfile 'Microsoft.Cdn/profiles@2025-09-01-preview' = {
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

  // WAF Policy Attachment
  resource wafPolicy 'securityPolicies@2025-09-01-preview' = {
    name: 'productionWAF'
    properties: {
      parameters: {
        wafPolicy: { id: frontDoorWebApplicationFirewall.id }
        type: 'WebApplicationFirewall'
        associations: [
          {
            domains: [
              { id: productionEndpoint.id }
            ]
            patternsToMatch: [
              '/*'
            ]
          }
        ]
      }
    }
  }

  // Custom Domain for APEX
  resource apexCustomDomain 'customDomains@2025-09-01-preview' = {
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
  resource wwwCustomDomain 'customDomains@2025-09-01-preview' = {
    name: 'www-arolariu-ro'
    properties: {
      hostName: 'www.arolariu.ro'
      tlsSettings: {
        certificateType: 'ManagedCertificate'
        minimumTlsVersion: 'TLS12'
      }
    }
  }

  // Custom Domain for CDN
  resource cdnCustomDomain 'customDomains@2025-09-01-preview' = {
    name: 'cdn-arolariu-ro'
    properties: {
      hostName: 'cdn.arolariu.ro'
      tlsSettings: {
        certificateType: 'ManagedCertificate'
        minimumTlsVersion: 'TLS12'
      }
    }
  }

  // Production Origin Group
  resource productionOriginGroup 'originGroups@2025-09-01-preview' = {
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
    resource productionOrigin 'origins@2025-09-01-preview' = {
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
  resource productionEndpoint 'afdEndpoints@2025-09-01-preview' = {
    name: 'production'
    location: 'Global'
    properties: {
      enabledState: 'Enabled'
    }
    tags: union(commonTags, {
      displayName: 'Production Endpoint'
    })

    // Production Route (nested within endpoint)
    resource productionRoute 'routes@2025-09-01-preview' = {
      name: 'production-route'
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
        originGroup: { id: productionOriginGroup.id }
        supportedProtocols: ['Https']
        patternsToMatch: ['/*']
        httpsRedirect: 'Enabled'
        linkToDefaultDomain: 'Enabled'
        forwardingProtocol: 'HttpsOnly'
        enabledState: 'Enabled'
      }
      dependsOn: [
        productionOriginGroup::productionOrigin
      ]
    }
  }

  // CDN Endpoint
  resource cdnEndpoint 'afdEndpoints@2025-09-01-preview' = {
    name: 'cdn'
    location: 'Global'
    properties: { enabledState: 'Enabled' }
    tags: union(commonTags, {
      displayName: 'CDN Endpoint'
    })

    resource cdnRoute 'routes@2025-09-01-preview' = {
      name: 'cdn-route'
      properties: {
        cacheConfiguration: {
          compressionSettings: {
            isCompressionEnabled: true
            contentTypesToCompress: [
              'application/eot'
              'application/font'
              'application/font-sfnt'
              'application/javascript'
              'application/json'
              'application/opentype'
              'application/otf'
              'application/pkcs7-mime'
              'application/truetype'
              'application/ttf'
              'application/vnd.ms-fontobject'
              'application/xhtml+xml'
              'application/xml'
              'application/xml+rss'
              'application/x-font-opentype'
              'application/x-font-truetype'
              'application/x-font-ttf'
              'application/x-httpd-cgi'
              'application/x-javascript'
              'application/x-mpegurl'
              'application/x-opentype'
              'application/x-otf'
              'application/x-perl'
              'application/x-ttf'
              'font/eot'
              'font/ttf'
              'font/otf'
              'font/opentype'
              'image/svg+xml'
              'text/css'
              'text/csv'
              'text/html'
              'text/javascript'
              'text/js'
              'text/plain'
              'text/richtext'
              'text/tab-separated-values'
              'text/xml'
              'text/x-script'
              'text/x-component'
              'text/x-java-source'
            ]
          }
          queryStringCachingBehavior: 'UseQueryString'
        }
        customDomains: [
          { id: cdnCustomDomain.id }
        ]
        originGroup: { id: productionOriginGroup.id }
        supportedProtocols: ['Https']
        patternsToMatch: ['/*']
        forwardingProtocol: 'MatchRequest'
        linkToDefaultDomain: 'Disabled'
        httpsRedirect: 'Enabled'
        enabledState: 'Enabled'
      }
      dependsOn: [
        productionOriginGroup::productionOrigin
      ]
    }
  }
}

output frontDoorProductionFqdn string = frontDoorProfile::productionEndpoint.properties.hostName
output frontDoorCdnFqdn string = frontDoorProfile::cdnEndpoint.properties.hostName
output frontDoorProfileId string = frontDoorProfile.id

output frontDoorApexToken string = frontDoorProfile::apexCustomDomain.properties.validationProperties.validationToken
output frontDoorWwwToken string = frontDoorProfile::wwwCustomDomain.properties.validationProperties.validationToken
output frontDoorCdnToken string = frontDoorProfile::cdnCustomDomain.properties.validationProperties.validationToken
