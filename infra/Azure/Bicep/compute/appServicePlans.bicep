// =====================================================================================
// Azure App Service Plans - Compute Infrastructure for Web Applications
// =====================================================================================
// This module provisions App Service Plans (also known as App Service Farms) that
// provide the underlying compute resources for hosting Azure Web Apps. Two separate
// plans are created to isolate production and development workloads.
//
// Deployed Plans:
// - Production Plan (B2): Higher compute capacity for production traffic
// - Development Plan (B1): Cost-optimized for non-production workloads
//
// SKU Selection Rationale:
// - B2 (Basic): 2 cores, 3.5 GB RAM - suitable for moderate production traffic
// - B1 (Basic): 1 core, 1.75 GB RAM - sufficient for development/staging
// - Basic tier includes custom domains and SSL (no scale-out)
// - Consider Standard (S1+) for auto-scaling and deployment slots
//
// Linux Containers:
// - reserved: true indicates Linux App Service Plan
// - Required for containerized deployments from ACR
// - hyperV: false (Windows containers not used)
//
// Scaling Configuration:
// - perSiteScaling: false (all sites share the plan's resources)
// - elasticScaleEnabled: false (no automatic scaling)
// - zoneRedundant: false (single availability zone)
//
// Cost Optimization:
// - isSpot: false (consider Spot instances for dev to reduce costs)
// - capacity: 1 (single instance per plan)
//
// See: sites/deploymentFile.bicep (assigns sites to these plans)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'App Service Plans for production and development environments'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The location for the app service plans.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param appServicePlanLocation string

@description('The prefix for the app service plans.')
@minLength(1)
@maxLength(20)
param appServicePlanConventionPrefix string

@description('The date when the deployment is executed.')
param appServicePlanDeploymentDate string

import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: appServicePlanDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'compute'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

var appPlans = [
  {
    name: '${appServicePlanConventionPrefix}-production'
    location: appServicePlanLocation
    sku: {
      name: 'B2'
      tier: 'Basic'
      size: 'B2'
      capacity: 1
    }
    properties: {
      perSiteScaling: false
      elasticScaleEnabled: false
      maximumElasticWorkerCount: 1
      isSpot: false
      reserved: true
      isXenon: false
      hyperV: false
      targetWorkerCount: 0
      targetWorkerSizeId: 0
      zoneRedundant: false
    }
  }
  {
    name: '${appServicePlanConventionPrefix}-development'
    location: appServicePlanLocation
    sku: {
      name: 'B1'
      tier: 'Basic'
      size: 'B1'
      capacity: 1
    }
    properties: {
      perSiteScaling: false
      elasticScaleEnabled: false
      maximumElasticWorkerCount: 1
      isSpot: false
      reserved: true
      isXenon: false
      hyperV: false
      targetWorkerCount: 0
      targetWorkerSizeId: 0
      zoneRedundant: false
    }
  }
]

resource appPlanFarm 'Microsoft.Web/serverfarms@2024-11-01' = [
  for appPlan in appPlans: {
    name: appPlan.name
    location: appPlan.location
    sku: appPlan.sku
    kind: 'linux'
    properties: appPlan.properties
    tags: union(commonTags, {
      tier: appPlan.name == '${appServicePlanConventionPrefix}-production' ? 'production' : 'development'
      sku: appPlan.sku.name
      skuTier: appPlan.sku.tier
    })
  }
]

output productionAppPlanId string = appPlanFarm[0].id
output developmentAppPlanId string = appPlanFarm[1].id
