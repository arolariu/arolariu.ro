targetScope = 'resourceGroup'

metadata description = 'Custom domain binding and managed certificate for dev.arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the App Service to bind the custom domain to.')
param devWebsiteHostname string

@description('The certificate thumbprint for SSL binding.')
param devWebsiteThumbprint string

resource devWebsite 'Microsoft.Web/sites@2024-11-01' existing = { name: devWebsiteHostname }

// Update custom domain with SSL binding
resource devCustomDomainWithSsl 'Microsoft.Web/sites/hostNameBindings@2024-11-01' = {
  parent: devWebsite
  name: 'dev.arolariu.ro'
  properties: {
    sslState: 'SniEnabled'
    thumbprint: devWebsiteThumbprint
  }
}
