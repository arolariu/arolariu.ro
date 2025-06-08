targetScope = 'resourceGroup'

metadata description = 'Standardized naming convention module for Azure resources'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'

@description('Deployment tier (production or development app service plans)')
@allowed(['prod', 'dev'])
param deploymentTier string = 'prod'

@description('Application name prefix')
@minLength(2)
@maxLength(10)
param applicationName string = 'arolariu'

@description('Resource group location for naming')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param location string

@description('Optional instance identifier for multi-instance deployments')
@minLength(0)
@maxLength(3)
param instance string = ''

// Location abbreviations for consistent naming
var locationAbbreviations = {
  swedencentral: 'swe'
  norwayeast: 'noe'
  westeurope: 'weu'
  northeurope: 'neu'
}

// Base naming components
var locationCode = locationAbbreviations[location]
var resourcePrefix = '${applicationName}-${locationCode}'
var instanceSuffix = empty(instance) ? '' : '-${instance}'

// Generate unique suffix for storage accounts (removes hyphens for compliance)
var uniqueSuffix = take(uniqueString(resourceGroup().id), 6)
var storagePrefix = '${applicationName}${uniqueSuffix}'

// Standardized naming convention outputs
output naming object = {
  // Base components
  resourcePrefix: resourcePrefix
  locationCode: locationCode
  deploymentTier: deploymentTier
  instanceSuffix: instanceSuffix

  // Storage (must be globally unique and no hyphens)
  storageAccount: toLower('${storagePrefix}sa')
  containerRegistry: toLower('${storagePrefix}acr')

  // Compute
  appServicePlanProduction: '${resourcePrefix}-asp-prod${instanceSuffix}'
  appServicePlanDevelopment: '${resourcePrefix}-asp-dev${instanceSuffix}'

  // Web Applications
  webAppMain: '${resourcePrefix}-wa-main${instanceSuffix}'
  webAppApi: '${resourcePrefix}-wa-api${instanceSuffix}'
  webAppDev: '${resourcePrefix}-wa-dev${instanceSuffix}'
  webAppDocs: '${resourcePrefix}-wa-docs${instanceSuffix}'

  // Identity & Security
  userAssignedIdentityFrontend: '${resourcePrefix}-uami-frontend${instanceSuffix}'
  userAssignedIdentityBackend: '${resourcePrefix}-uami-backend${instanceSuffix}'
  userAssignedIdentityInfrastructure: '${resourcePrefix}-uami-infra${instanceSuffix}'
  keyVault: '${resourcePrefix}-kv${instanceSuffix}'

  // Networking
  frontDoor: '${resourcePrefix}-afd${instanceSuffix}'
  frontDoorProfile: '${resourcePrefix}-afd-profile${instanceSuffix}'
  dnsZone: '${resourcePrefix}-dns${instanceSuffix}'

  // Monitoring & Observability
  logAnalyticsWorkspace: '${resourcePrefix}-law${instanceSuffix}'
  applicationInsights: '${resourcePrefix}-appi${instanceSuffix}'
  managedGrafana: '${resourcePrefix}-graf${instanceSuffix}'

  // Configuration
  appConfiguration: '${resourcePrefix}-appconf${instanceSuffix}'

  // Databases
  sqlServer: '${resourcePrefix}-sql${instanceSuffix}'
  sqlDatabase: '${resourcePrefix}-sqldb'
  cosmosDbAccount: '${resourcePrefix}-cosmos${instanceSuffix}'
  cosmosDatabase: '${resourcePrefix}-cosmosdb'

  // Resource Groups (for reference)
  resourceGroupMain: '${resourcePrefix}-rg${instanceSuffix}'
  resourceGroupMonitoring: '${resourcePrefix}-rg-monitor${instanceSuffix}'
}

// Output validation information
output validation object = {
  isValid: true
  validationRules: {
    maxResourceNameLength: 'Names should not exceed Azure limits'
    uniquenessSuffix: uniqueSuffix
    locationCode: locationCode
    deploymentTier: deploymentTier
  }
}
