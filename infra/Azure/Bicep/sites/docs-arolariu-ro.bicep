targetScope = 'resourceGroup'

metadata description = 'This template will create the docs.arolariu.ro static web app site.'
metadata author = 'Alexandru-Razvan Olariu'

param staticWebAppLocation string
param staticWebAppDeploymentDate string

// Import the common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: staticWebAppDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'sites'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

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
  tags: union(commonTags, {
    displayName: 'Docs Static Web App'
    resourceType: 'Static Web App'
  })
}
