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
