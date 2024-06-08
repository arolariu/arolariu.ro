targetScope = 'resourceGroup'

metadata description = 'This template deploys two App Service Farms, in the same region, for production and development environments.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The location for the app service plans.')
param appServicePlanLocation string = resourceGroup().location

@description('The prefix for the app service plans.')
param appServicePlanPrefix string

var appPlans = [
  {
    name: '${appServicePlanPrefix}production'
    sku: {
      name: 'B2'
      tier: 'Basic'
    }
    perSiteScaling: true
  }
  {
    name: '${appServicePlanPrefix}development'
    sku: {
      name: 'B1'
      tier: 'Basic'
    }
    perSiteScaling: false
  }
]

resource appPlanFarm 'Microsoft.Web/serverfarms@2023-12-01' = [
  for appPlan in appPlans: {
    name: appPlan.name
    location: appServicePlanLocation
    sku: {
      name: appPlan.sku.name
      tier: appPlan.sku.tier
    }
    kind: 'linux' // Linux will be used for the app service plan.
    properties: {
      reserved: true // reserved means that the app service plan is running on Linux underneath.
      zoneRedundant: false // Azure Front Door will offer redundancy via CDN; no need for this.
      perSiteScaling: appPlan.perSiteScaling
    }
    tags: {
      environment: appPlan.name == '${appServicePlanPrefix}production' ? 'production' : 'development'
      deployment: 'bicep'
      timestamp: resourceGroup().tags.timestamp
    }
  }
]

output productionAppPlanId string = appPlanFarm[0].id
output developmentAppPlanId string = appPlanFarm[1].id
