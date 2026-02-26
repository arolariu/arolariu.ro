targetScope = 'resourceGroup'

// =====================================================================================
// Web Apps — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles scoped directly to Azure Web App resources.
// Assignments are scoped to each individual web app (not the resource group) for least
// privilege. Role GUIDs are imported from the shared roles type file.
//
// This module loops over an array of web app names, referencing each as an existing
// resource and creating a Website Contributor assignment per app.
//
// Assigned Roles (per web app):
// - Infrastructure: Website Contributor
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for Azure Web Apps, granting website contributor access to the infrastructure managed identity.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import {
  websiteContributor
} from '../types/roles.type.bicep'

// -------------------------------------------------------------------------------------
// Parameters
// -------------------------------------------------------------------------------------

@description('Array of existing Web App names to scope role assignments to.')
param webAppNames string[]

@description('Principal ID of the infrastructure managed identity.')
param infrastructurePrincipalId string

// -------------------------------------------------------------------------------------
// Existing Resource References
// -------------------------------------------------------------------------------------

resource webApps 'Microsoft.Web/sites@2024-04-01' existing = [
  for name in webAppNames: {
    name: name
  }
]

// =====================================================================================
// Infrastructure Role Assignments (per web app)
// =====================================================================================

// Grants infrastructure contributor access to each web app for deployment and management
resource infrastructureWebsiteContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = [
  for (name, index) in webAppNames: {
    scope: webApps[index]
    name: guid(webApps[index].id, infrastructurePrincipalId, websiteContributor)
    properties: {
      roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', websiteContributor)
      principalId: infrastructurePrincipalId
      principalType: 'ServicePrincipal'
      description: 'Infrastructure: website contributor access on ${name}'
    }
  }
]
