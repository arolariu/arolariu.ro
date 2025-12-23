// =====================================================================================
// Azure DNS Zone - Authoritative DNS for arolariu.ro Domain
// =====================================================================================
// This module provisions an Azure DNS Zone that serves as the authoritative DNS
// for the arolariu.ro domain. The zone contains all DNS records required for:
// - Website routing (A, CNAME records pointing to Front Door)
// - SSL certificate validation (TXT records for domain verification)
// - Email authentication (SPF, DKIM, DMARC records)
// - Third-party service verification (Clerk, Google, etc.)
//
// Record Types Deployed:
// - A Record (@): Apex domain to Front Door (ALIAS)
// - CNAME Records: www, cdn, api, dev, docs, cv subdomains
// - TXT Records: Domain validation tokens, SPF, DKIM
// - MX Records: Email routing (if configured)
//
// DNSSEC:
// - DNSSEC is enabled for cryptographic DNS security
// - Prevents DNS spoofing and cache poisoning attacks
//
// Front Door Integration:
// - Validation tokens are passed from Front Door deployment
// - TXT records (_dnsauth.*) required for managed certificate issuance
// - A record uses target resource ID for ALIAS functionality
//
// Third-Party Integrations:
// - Clerk (authentication): CNAME records for custom auth domain
// - Google (verification): TXT record for Search Console
// - Email providers: SPF and DKIM records
//
// TTL Settings:
// - 3600 seconds (1 hour) for most records
// - Lower TTL during migrations for faster propagation
//
// See: network/azureFrontDoor.bicep (provides validation tokens)
// See: bindings/deploymentFile.bicep (custom domain bindings)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure DNS Zone with DNSSEC and dynamic Front Door integration'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The name of the Azure DNS Zone resource.')
param dnsZoneName string

@description('The date when the deployment is executed.')
param dnsZoneDeploymentDate string

@description('The name of the Azure Front Door profile.')
param frontDoorName string

@description('The FQDN of the Azure Front Door production endpoint.')
param frontDoorProductionFqdn string

@description('The Azure Front Door APEX custom domain validation token.')
param frontDoorApexCustomDomainValidationToken string

@description('The Azure Front Door WWW custom domain validation token.')
param frontDoorWwwCustomDomainValidationToken string

@description('The Azure Front Door CDN custom domain validation token.')
param frontDoorCdnCustomDomainValidationToken string

import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: dnsZoneDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'network'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource frontDoor 'Microsoft.Cdn/profiles@2025-09-01-preview' existing = { name: frontDoorName }
resource frontDoorProductionEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2025-09-01-preview' existing = {
  parent: frontDoor
  name: 'production'
}

resource dnsZone 'Microsoft.Network/dnsZones@2023-07-01-preview' = {
  name: dnsZoneName
  location: 'Global'
  properties: { zoneType: 'Public' }

  // DNSSEC configuration for the DNS zone
  resource dnssecResource 'dnssecConfigs@2023-07-01-preview' = { name: 'default' }

  // Apex A record pointing to Azure Front Door production endpoint
  resource apexRecord 'A@2023-07-01-preview' = {
    name: '@'
    properties: {
      TTL: 3600 // 1 hour
      targetResource: {
        id: frontDoorProductionEndpoint.id
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

  // Front door TXT record for domain verification - apex
  resource frontDoorApexTxtRecord 'TXT@2023-07-01-preview' = {
    name: '_dnsauth'
    properties: {
      TTL: 3600
      TXTRecords: [
        {
          value: [
            frontDoorApexCustomDomainValidationToken
          ]
        }
      ]
    }
  }

  // Front door TXT record for domain verification - www
  resource frontDoorWwwTxtRecord 'TXT@2023-07-01-preview' = {
    name: '_dnsauth.www'
    properties: {
      TTL: 3600
      TXTRecords: [
        {
          value: [
            frontDoorWwwCustomDomainValidationToken
          ]
        }
      ]
    }
  }

  // Front door TXT record for domain verification - cdn
  resource frontDoorCdnTxtRecord 'TXT@2023-07-01-preview' = {
    name: '_dnsauth.cdn'
    properties: {
      TTL: 3600
      TXTRecords: [
        {
          value: [
            frontDoorCdnCustomDomainValidationToken
          ]
        }
      ]
    }
  }

  // Clerk CNAME records for Auth-as-a-Service domain verification
  resource clerkAuthCnameRecord 'CNAME@2023-07-01-preview' = {
    name: 'clerk'
    properties: {
      TTL: 3600
      CNAMERecord: {
        cname: 'frontend-api.clerk.services'
      }
    }
  }

  // Clerk CNAME record pointing to Clerk accounts service
  resource clerkAccountsCnameRecord 'CNAME@2023-07-01-preview' = {
    name: 'accounts'
    properties: {
      TTL: 3600
      CNAMERecord: {
        cname: 'accounts.clerk.services'
      }
    }
  }

  // Clerk CNAME record pointing to Clerk mail service
  resource clerkMailCnameRecord 'CNAME@2023-07-01-preview' = {
    name: 'clkmail'
    properties: {
      TTL: 3600
      CNAMERecord: {
        cname: '<your-clerk-mail-service-cname>' // Replace with actual CNAME for Clerk mail service
      }
    }
  }

  // Clerk CNAME records for mail key verification
  resource clerkMailKeyCnameRecord1 'CNAME@2023-07-01-preview' = {
    name: 'clk._domainkey'
    properties: {
      TTL: 3600
      CNAMERecord: {
        cname: '<your-clerk-mail-service-cname>' // Replace with actual CNAME for Clerk mail service
      }
    }
  }

  resource clerkMailKeyCnameRecord2 'CNAME@2023-07-01-preview' = {
    name: 'clk2._domainkey'
    properties: {
      TTL: 3600
      CNAMERecord: {
        cname: '<your-clerk-mail-service-cname>' // Replace with actual CNAME for Clerk mail service
      }
    }
  }

  // Resend DKIM and SPF records for Resend email service
  resource resendMxRecord 'MX@2023-07-01-preview' = {
    name: 'send.mail'
    properties: {
      TTL: 3600
      MXRecords: [
        {
          preference: 10
          exchange: '<your-amazon-ses-endpoint>' // Replace with actual Amazon SES endpoint
        }
      ]
    }
  }

  resource resendTxtRecord1 'TXT@2023-07-01-preview' = {
    name: 'send.mail'
    properties: {
      TTL: 3600
      TXTRecords: [
        {
          value: [
            'v=spf1 include:amazonses.com ~all'
          ]
        }
      ]
    }
  }

  resource resendTxtRecord2 'TXT@2023-07-01-preview' = {
    name: 'resend._domainkey.mail'
    properties: {
      TTL: 3600
      TXTRecords: [
        {
          value: [
            'v=DKIM1; k=rsa; p=<your-dkim-public-key>' // Replace with actual DKIM public key
          ]
        }
      ]
    }
  }

  // DMARC record for email security
  resource dmarcTxtRecord 'TXT@2023-07-01-preview' = {
    name: '_dmarc'
    properties: {
      TTL: 3600
      TXTRecords: [
        {
          value: [
            'v=DMARC1; p=none; rua=mailto:admin@arolariu.ro'
          ]
        }
      ]
    }
  }

  tags: union(commonTags, {
    displayName: 'DNS Zone for arolariu.ro'
    resourceType: 'DNS Zone'
  })
}

// Output the DNS zone name servers for domain configuration
output dnsZoneNameServers array = dnsZone.properties.nameServers
output dnsZoneName string = dnsZone.name
