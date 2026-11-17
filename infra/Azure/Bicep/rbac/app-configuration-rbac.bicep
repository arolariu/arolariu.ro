targetScope = 'resourceGroup'

// =====================================================================================
// App Configuration — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles scoped directly to an App Configuration store.
// Assignments are scoped to the configuration store (not the resource group) for least
// privilege. Role GUIDs are imported from the shared constants file (constants/roles.bicep).
//
// Assigned Roles:
// - Frontend: App Configuration Data Reader
// - Backend: App Configuration Data Owner
// - Infrastructure: App Configuration Data Owner (permanent IaC writer)
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for the App Configuration store, granting configuration data access to each managed identity.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import {
  appConfigurationDataReader
  appConfigurationDataOwner
} from '../constants/roles.bicep'

// -------------------------------------------------------------------------------------
// Parameters
// -------------------------------------------------------------------------------------

@description('The name of the existing App Configuration store to scope role assignments to.')
param appConfigurationName string

@description('Principal ID of the frontend managed identity.')
param frontendPrincipalId string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

@description('Principal ID of the infrastructure managed identity.')
param infrastructurePrincipalId string

// -------------------------------------------------------------------------------------
// Existing Resource Reference
// -------------------------------------------------------------------------------------

resource appConfiguration 'Microsoft.AppConfiguration/configurationStores@2025-08-01-preview' existing = {
  name: appConfigurationName
}

// =====================================================================================
// Frontend Role Assignments
// =====================================================================================

// Grants the frontend read access to configuration key-values and feature flags
resource frontendConfigReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: appConfiguration
  name: guid(appConfiguration.id, frontendPrincipalId, appConfigurationDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', appConfigurationDataReader)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: read configuration data from app configuration store'
  }
}

// =====================================================================================
// Backend Role Assignments
// =====================================================================================

// Grants the backend full read/write access to configuration key-values and feature flags
resource backendConfigReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: appConfiguration
  name: guid(appConfiguration.id, backendPrincipalId, appConfigurationDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', appConfigurationDataReader)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: read configuration data from app configuration store'
  }
}

resource backendConfigOwner 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: appConfiguration
  name: guid(appConfiguration.id, backendPrincipalId, appConfigurationDataOwner)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', appConfigurationDataOwner)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: full data ownership on app configuration store'
  }
}

// =====================================================================================
// Infrastructure Role Assignments
// =====================================================================================

// The infrastructure identity retains scoped configuration management after bootstrap.
resource infrastructureConfigOwner 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: appConfiguration
  name: guid(appConfiguration.id, infrastructurePrincipalId, appConfigurationDataOwner)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', appConfigurationDataOwner)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: permanent scoped configuration data management'
  }
}
