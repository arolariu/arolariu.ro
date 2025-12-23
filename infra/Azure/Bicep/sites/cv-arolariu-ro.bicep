// =====================================================================================
// CV Website - cv.arolariu.ro SvelteKit Personal Resume
// =====================================================================================
// This module provisions an Azure Static Web App to host the personal CV/resume
// website. The site is built with SvelteKit and deployed via GitHub Actions.
//
// Platform: Azure Static Web Apps
// - Globally distributed CDN with edge locations
// - Free tier includes 100 GB bandwidth/month
// - Auto-deployment from GitHub repository
// - No server-side rendering costs
//
// Technology Stack:
// - Framework: SvelteKit (prerendered static output)
// - Build output: Static HTML/CSS/JS
// - Adapter: @sveltejs/adapter-static
//
// Purpose:
// - Professional portfolio and resume
// - Skills and experience showcase
// - Project highlights and achievements
// - Contact information
//
// Deployment:
// - Provider: GitHub Actions
// - Branch: main
// - Staging environments: Disabled (simple site, no preview needed)
// - Config file updates: Allowed
//
// Region Constraint:
// - Static Web Apps available in limited regions
// - Using westeurope for European data residency
//
// Note: No managed identity - Static Web Apps use deployment tokens
// from GitHub Actions for authentication.
//
// See: bindings/cv-arolariu-ro-bindings.bicep (custom domain)
// See: sites/cv.arolariu.ro/ (SvelteKit source)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'CV/Resume Static Web App cv.arolariu.ro'
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

resource cvStaticWebApp 'Microsoft.Web/staticSites@2024-11-01' = {
  name: 'cv-arolariu-ro'
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
    displayName: 'CV Static Web App'
    resourceType: 'Static Web App'
  })
}

output cvWebsiteUrl string = cvStaticWebApp.properties.defaultHostname
output cvWebsiteName string = cvStaticWebApp.name
