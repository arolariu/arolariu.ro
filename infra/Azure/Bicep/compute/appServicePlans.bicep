targetScope = 'resourceGroup'

metadata description = 'This template deploys two App Service Farms, in the same region, for production and development environments.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The location for the app service plans.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param appServicePlanLocation string

@description('The prefix for the app service plans.')
@minLength(1)
@maxLength(20)
param appServicePlanPrefix string

var appPlans = [
  {
    name: '${appServicePlanPrefix}-production'
    location: appServicePlanLocation
    perSiteScaling: true
    sku: {
      name: 'B2'
      tier: 'Basic'
    }
  }
  {
    name: '${appServicePlanPrefix}-development'
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
    tags: {
      environment: appPlan.name == '${appServicePlanPrefix}-production' ? 'PRODUCTION' : 'DEVELOPMENT'
      deployment: 'Bicep'
    }
  }
]

output productionAppPlanId string = appPlanFarm[0].id
output developmentAppPlanId string = appPlanFarm[1].id
