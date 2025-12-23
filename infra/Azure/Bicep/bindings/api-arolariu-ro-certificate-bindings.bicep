// =====================================================================================
// API Website SSL Binding - api.arolariu.ro Certificate Configuration
// =====================================================================================
// This module applies the SSL certificate binding to the api.arolariu.ro custom
// domain. This is a SECOND PHASE deployment that runs AFTER the domain binding
// and certificate creation have completed.
//
// Two-Phase Deployment Rationale:
// Phase 1 (api-arolariu-ro-bindings.bicep):
// - Creates DNS records and hostname binding
// - Provisions managed certificate (async process)
// - Certificate may take 5-20 minutes to provision
//
// Phase 2 (this file):
// - Binds the provisioned certificate to the hostname
// - Requires certificate thumbprint as input
// - Must run after certificate is fully provisioned
//
// SSL Configuration:
// - sslState: SniEnabled (Server Name Indication)
// - SNI allows multiple SSL certificates on shared IP
// - Required for App Service on shared infrastructure
//
// Thumbprint Parameter:
// - Certificate thumbprint must be retrieved after Phase 1
// - Can be obtained from Azure Portal or via CLI
// - az webapp config ssl list --resource-group <rg>
//
// Prerequisites:
// - Hostname binding must exist (api-arolariu-ro-bindings.bicep)
// - Managed certificate must be provisioned
// - Thumbprint must be available
//
// See: bindings/api-arolariu-ro-bindings.bicep (Phase 1)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'SSL certificate binding for api.arolariu.ro (Phase 2)'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The name of the App Service to bind the custom domain to.')
param apiWebsiteHostname string

@description('The api website certificate thumbprint for SSL binding.')
param apiWebsiteThumbprint string

resource apiWebsite 'Microsoft.Web/sites@2025-03-01' existing = { name: apiWebsiteHostname }

// Update custom domain with SSL binding
resource apiCustomDomainWithSsl 'Microsoft.Web/sites/hostNameBindings@2025-03-01' = {
  parent: apiWebsite
  name: 'api.arolariu.ro'
  properties: {
    sslState: 'SniEnabled'
    thumbprint: apiWebsiteThumbprint
  }
}
