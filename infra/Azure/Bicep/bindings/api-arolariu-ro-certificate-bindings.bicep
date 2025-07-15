targetScope = 'resourceGroup'

metadata description = 'Custom domain binding and managed certificate for api.arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the App Service to bind the custom domain to.')
param apiWebsiteHostname string

@description('The api website certificate thumbprint for SSL binding.')
param apiWebsiteThumbprint string

resource apiWebsite 'Microsoft.Web/sites@2024-11-01' existing = {
  name: apiWebsiteHostname
}

// Update custom domain with SSL binding
resource apiCustomDomainWithSsl 'Microsoft.Web/sites/hostNameBindings@2024-11-01' = {
  parent: apiWebsite
  name: 'api.arolariu.ro'
  properties: {
    sslState: 'SniEnabled'
    thumbprint: apiWebsiteThumbprint
  }
}
