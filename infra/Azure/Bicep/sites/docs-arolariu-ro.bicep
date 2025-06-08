targetScope = 'resourceGroup'

metadata description = 'This template will create the docs.arolariu.ro static web app site.'
metadata author = 'Alexandru-Razvan Olariu'

param staticWebAppLocation string

resource docsStaticWebApp 'Microsoft.Web/staticSites@2024-11-01' = {
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
    environment: 'PRODUCTION'
    deployment: 'Bicep'
  }
}
