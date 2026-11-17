// =====================================================================================
// Network Deployment Orchestrator - Front Door, WAF, and DNS Infrastructure
// =====================================================================================
// This orchestrator module deploys the networking infrastructure for the arolariu.ro
// platform. It provides global edge routing, DDoS protection, and DNS management.
//
// Deployed Resources:
// - Azure Front Door Standard (global edge routing + WAF + load balancing)
// - Azure DNS Zone (authoritative DNS for arolariu.ro domain)
//
// Architecture Pattern:
// Azure Front Door sits at the edge, providing:
// - Global anycast routing (users connect to nearest edge location)
// - SSL/TLS termination (managed certificates)
// - Web Application Firewall (WAF) rules
// - Origin health probes and failover
//
// Deployment Order (dependencies):
// 1. Azure Front Door (provisions edge endpoints)
// 2. DNS Zone (creates records pointing to Front Door)
//
// Custom Domain Validation:
// Front Door generates validation tokens for custom domains. These tokens
// must be added as TXT records in DNS before certificates can be issued.
// See: frontDoorApexCustomDomainValidationToken, frontDoorWwwCustomDomainValidationToken
//
// Security Notes:
// - WAF is enabled by default with managed rule sets
// - Only HTTPS traffic is allowed (HTTP redirects to HTTPS)
// - Origin connections use private endpoints where possible
//
// See: bindings/deploymentFile.bicep (configures custom domain bindings)
// See: sites/deploymentFile.bicep (origin hosts for Front Door)
// =====================================================================================

metadata description = 'Network orchestrator deploying Azure Front Door and DNS Zone'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

targetScope = 'resourceGroup'

import { dnsRecord } from '../types/dns.type.bicep'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

@description('The hostname of the main production website.')
param mainWebsiteHostname string

@description('Azure-owned application records resolved by the sites producer.')
param applicationDnsRecords dnsRecord[]

// -------------------------------------------------------------------------------------
// Resource Naming Variables
// -------------------------------------------------------------------------------------
// Consistent naming convention: {prefix}-{resource-abbreviation}
// AFD = Azure Front Door
// -------------------------------------------------------------------------------------
var azureFrontDoorName = '${resourceConventionPrefix}-afd'
var dnsZoneName = 'arolariu.ro'

module azureFrontDoorDeployment 'azureFrontDoor.bicep' = {
  name: 'azureFrontDoorDeployment-${resourceDeploymentDate}'
  params: {
    frontDoorName: azureFrontDoorName
    frontDoorDeploymentDate: resourceDeploymentDate
    mainWebsiteHostname: mainWebsiteHostname
  }
}

module dnsZoneDeployment 'dnsZone.bicep' = {
  name: 'dnsZoneDeployment-${resourceDeploymentDate}'
  params: {
    dnsZoneName: dnsZoneName
    dnsZoneDeploymentDate: resourceDeploymentDate
    frontDoorEndpointId: azureFrontDoorDeployment.outputs.frontDoorEndpointId
    frontDoorProductionFqdn: azureFrontDoorDeployment.outputs.frontDoorProductionFqdn
    frontDoorApexCustomDomainValidationToken: azureFrontDoorDeployment.outputs.frontDoorApexToken
    frontDoorWwwCustomDomainValidationToken: azureFrontDoorDeployment.outputs.frontDoorWwwToken
    applicationDnsRecords: applicationDnsRecords
  }
}

// Output the Front Door details for reference
output frontDoorProductionFqdn string = azureFrontDoorDeployment.outputs.frontDoorProductionFqdn
output frontDoorProfileId string = azureFrontDoorDeployment.outputs.frontDoorProfileId
output frontDoorEndpointId string = azureFrontDoorDeployment.outputs.frontDoorEndpointId

// Output the DNS Zone name for reference
output dnsZoneName string = dnsZoneDeployment.outputs.dnsZoneName
output dnsZoneNameServers array = dnsZoneDeployment.outputs.dnsZoneNameServers
output dnsZoneDsRecords string[] = dnsZoneDeployment.outputs.dnsZoneDsRecords
