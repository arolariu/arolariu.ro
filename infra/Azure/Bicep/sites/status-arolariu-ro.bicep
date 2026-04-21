// =====================================================================================
// Status Website - status.arolariu.ro SvelteKit Service Status Page
// =====================================================================================
// This module provisions an Azure Static Web App to host the service status page
// website. The site is built with SvelteKit and deployed via GitHub Actions.
//
// Platform: Azure Static Web Apps
// - Globally distributed CDN with edge locations
// - Free tier includes 100 GB bandwidth/month
// - Auto-deployment from GitHub repository
// - No server-side rendering costs
//
// Technology Stack:
// - Framework: SvelteKit 2.x on Svelte 5 (prerendered shell + client fetch)
// - Build output: Static HTML/CSS/JS + managed Azure Functions
// - Adapter: svelte-adapter-azure-swa
//
// Purpose:
// - Service health dashboard
// - Per-service uptime history
// - Auto-detected incident feed
// - Time-window filters (1d–365d)
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
// See: bindings/status-arolariu-ro-bindings.bicep (custom domain)
// See: sites/status.arolariu.ro/ (SvelteKit source)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Service Status Page Static Web App status.arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

param staticWebAppLocation string = 'westeurope' // Static Web Apps are only available in certain regions

param staticWebAppDeploymentDate string

// Import the common tags for all resources
import { createTags } from '../constants/tags.bicep'
var commonTags = createTags('sites', staticWebAppDeploymentDate)

resource statusStaticWebApp 'Microsoft.Web/staticSites@2025-03-01' = {
  name: 'status-arolariu-ro'
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
    displayName: 'Status Static Web App'
    resourceType: 'Static Web App'
  })
}

output statusWebsiteUrl string = statusStaticWebApp.properties.defaultHostname
output statusWebsiteName string = statusStaticWebApp.name
