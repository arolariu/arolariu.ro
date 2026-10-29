targetScope = 'resourceGroup'

metadata description = 'Applies the issued experiments managed certificate to its hostname using SNI.'

@description('The existing experiments App Service name.')
param expWebsiteHostname string

@description('The actual issued managed-certificate thumbprint.')
@minLength(1)
param expWebsiteThumbprint string

resource expWebsite 'Microsoft.Web/sites@2025-03-01' existing = { name: expWebsiteHostname }

resource expCustomDomainWithSsl 'Microsoft.Web/sites/hostNameBindings@2025-03-01' = {
  parent: expWebsite
  name: 'exp.arolariu.ro'
  properties: {
    sslState: 'SniEnabled'
    thumbprint: expWebsiteThumbprint
  }
}
