targetScope = 'resourceGroup'

metadata description = 'This template will create the docs.arolariu.ro static web app site.'
metadata author = 'Alexandru-Razvan Olariu'

param staticWebAppLocation string = resourceGroup().location

resource docsStaticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: 'docs-arolariu-ro'
  location: staticWebAppLocation
  sku: { name: 'Free', tier: 'Free' }
  properties: {
    repositoryUrl: 'https://github.com/arolariu/arolariu.ro'
    branch: 'main'
    stagingEnvironmentPolicy: 'Disabled'
    allowConfigFileUpdates: true
    provider: 'GitHub'
    enterpriseGradeCdnStatus: 'Disabled'
  }
  tags: {
    environment: 'production'
    deployment: 'bicep'
    timestamp: resourceGroup().tags.timestamp
  }
}
