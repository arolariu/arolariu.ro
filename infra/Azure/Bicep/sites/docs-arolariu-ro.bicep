// =====================================================================================
// Documentation Website - docs.arolariu.ro DocFX Static Site
// =====================================================================================
// This module provisions an Azure Static Web App to host the documentation website.
// The site is generated using DocFX from XML documentation comments in the .NET
// backend codebase and deployed via GitHub Actions.
//
// Platform: Azure Static Web Apps
// - Globally distributed CDN with edge locations
// - Free tier includes 100 GB bandwidth/month
// - Auto-deployment from GitHub repository
// - Built-in staging environments per PR
//
// Content:
// - API reference documentation (from XML docs)
// - Architecture documentation (from docs/ folder)
// - RFC documents (from docs/rfc/ folder)
// - Getting started guides
//
// Deployment:
// - Provider: GitHub Actions
// - Branch: main
// - Staging environments: Disabled (to save costs)
// - Config file updates: Allowed (staticwebapp.config.json)
//
// Region Constraint:
// - Static Web Apps available in limited regions
// - Using westeurope for European data residency
//
// Note: No managed identity - Static Web Apps use deployment tokens
// from GitHub Actions for authentication.
//
// See: bindings/docs-arolariu-ro-bindings.bicep (custom domain)
// See: sites/docs.arolariu.ro/ (DocFX source)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Documentation Static Web App docs.arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

param staticWebAppLocation string = 'westeurope' // Static Web Apps are only available in certain regions

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

output docsWebsiteUrl string = docsStaticWebApp.properties.defaultHostname
output docsWebsiteName string = docsStaticWebApp.name
