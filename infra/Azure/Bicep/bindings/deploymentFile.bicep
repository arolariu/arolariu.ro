// =====================================================================================
// Custom Domain Bindings Deployment Orchestrator - DNS and SSL Configuration
// =====================================================================================
// This orchestrator module deploys custom domain bindings for all arolariu.ro
// subdomains. It configures DNS records, SSL certificates, and hostname bindings
// for each web application in the platform.
//
// Deployed Bindings:
// - dev.arolariu.ro → Development website (App Service)
// - api.arolariu.ro → Backend API (App Service)
// - docs.arolariu.ro → Documentation (Static Web App)
// - cv.arolariu.ro → CV/Resume site (Static Web App)
// - arolariu.ro + www.arolariu.ro → Production website (via Front Door)
//
// Architecture Pattern:
// Bindings are separate from site deployments to enable:
// - DNS propagation without site redeployment
// - Certificate renewal independent of application code
// - Flexible hostname management (add/remove subdomains)
//
// Prerequisites:
// - DNS Zone must exist (see network/deploymentFile.bicep)
// - Sites must be deployed with default hostnames first
// - App Service Plans must be configured (Basic+ for custom domains)
//
// Certificate Management:
// - App Service managed certificates are used (auto-renewal)
// - Front Door uses its own managed certificates for apex/www
//
// See: network/dnsZone.bicep (DNS records)
// See: sites/deploymentFile.bicep (web applications)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Custom domain bindings orchestrator for all arolariu.ro subdomains'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

@description('The name of the Azure DNS Zone resource.')
param dnsZoneName string

@description('The development app service farm plan ID.')
param devWebsiteAppServicePlanId string

@description('The production app service farm plan ID.')
param prodWebsiteAppServicePlanId string

@description('The hostname of the API website.')
param apiWebsiteHostname string

@description('The hostname of the development website.')
param devWebsiteHostname string

@description('The hostname of the documentation website.')
param docsWebsiteHostname string

@description('The hostname of the cv website.')
param cvWebsiteHostname string

@description('The hostname of the production website.')
param prodWebsiteHostname string

module devWebsiteBindings 'dev-arolariu-ro-bindings.bicep' = {
  scope: resourceGroup()
  name: 'devWebsiteBindings-${resourceDeploymentDate}'
  params: {
    dnsZoneName: dnsZoneName
    devWebsiteHostname: devWebsiteHostname
    devWebsiteLocation: resourceLocation
    devWebsiteAppServicePlanId: devWebsiteAppServicePlanId
    devWebsiteDeploymentDate: resourceDeploymentDate
  }
}

module apiWebsiteBindings 'api-arolariu-ro-bindings.bicep' = {
  scope: resourceGroup()
  name: 'apiWebsiteBindings-${resourceDeploymentDate}'
  params: {
    dnsZoneName: dnsZoneName
    apiWebsiteHostname: apiWebsiteHostname
    apiWebsiteLocation: resourceLocation
    apiWebsiteAppServicePlanId: devWebsiteAppServicePlanId
    apiWebsiteDeploymentDate: resourceDeploymentDate
  }
}

module docsWebsiteBindings 'docs-arolariu-ro-bindings.bicep' = {
  scope: resourceGroup()
  name: 'docsWebsiteBindings-${resourceDeploymentDate}'
  params: {
    dnsZoneName: dnsZoneName
    docsWebsiteHostname: docsWebsiteHostname
  }
}

module cvWebsiteBindings 'cv-arolariu-ro-bindings.bicep' = {
  scope: resourceGroup()
  name: 'cvWebsiteBindings-${resourceDeploymentDate}'
  params: {
    dnsZoneName: dnsZoneName
    cvWebsiteHostname: cvWebsiteHostname
  }
}
