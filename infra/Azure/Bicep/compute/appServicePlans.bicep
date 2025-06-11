targetScope = 'resourceGroup'

metadata description = 'This template deploys two App Service Farms, in the same region, for production and development environments.'
metadata author = 'Alexandru-Razvan Olariu'

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
    perSiteScaling: true
    sku: {
      name: 'B2'
      tier: 'Basic'
    }
  }
  {
    name: '${appServicePlanConventionPrefix}-development'
    location: appServicePlanLocation
    perSiteScaling: false
    sku: {
      name: 'B1'
      tier: 'Basic'
    }
  }
]

resource appPlanFarm 'Microsoft.Web/serverfarms@2024-11-01' = [
  for appPlan in appPlans: {
    name: appPlan.name
    location: appPlan.location
    sku: {
      name: appPlan.sku.name
      tier: appPlan.sku.tier
    }
    kind: 'linux' // Linux will be used for the app service plan.
    properties: {
      reserved: true // reserved means that the app service plan is running on Linux underneath.
      zoneRedundant: false
      perSiteScaling: appPlan.perSiteScaling
    }
    tags: union(commonTags, {
      tier: appPlan.name == '${appServicePlanConventionPrefix}-production' ? 'production' : 'development'
      sku: appPlan.sku.name
      skuTier: appPlan.sku.tier
    })
  }
]

output productionAppPlanId string = appPlanFarm[0].id
output developmentAppPlanId string = appPlanFarm[1].id
