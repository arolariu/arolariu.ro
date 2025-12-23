targetScope = 'resourceGroup'

// =====================================================================================
// Identity Module Deployment Orchestrator
// =====================================================================================
// This module orchestrates the creation of identity resources for the arolariu.ro
// infrastructure. It creates managed identities, federated credentials for OIDC,
// and security groups for access control.
//
// Deployed Resources:
// - User-Assigned Managed Identities (Frontend, Backend, Infrastructure)
// - Federated Credentials (for GitHub Actions OIDC authentication)
// - Security Groups (for team access management)
//
// Identity Array Order (CRITICAL):
// [0] = Frontend identity (arolariu.ro website)
// [1] = Backend identity (api.arolariu.ro API)
// [2] = Infrastructure identity (GitHub Actions CI/CD)
//
// See: rbac/deploymentFile.bicep for role assignments to these identities
// =====================================================================================

metadata description = 'Identity module orchestrator that creates managed identities, federated credentials, and security groups.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The deployment timestamp used for unique deployment naming. Defaults to current UTC time.')
param resourceDeploymentDate string

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

var managedIdentitiesNamePrefix = '${resourceConventionPrefix}-uami'

module managedIdentities 'userAssignedIdentity.bicep' = {
  scope: resourceGroup()
  name: 'managedIdentitiesDeployment-${resourceDeploymentDate}'
  params: {
    userAssignedManagedIdentityNamePrefix: managedIdentitiesNamePrefix
    userAssignedManagedIdentityLocation: resourceLocation
    userAssignedManagedIdentityDeploymentDate: resourceDeploymentDate
  }
}

module federatedCredentials 'federatedCredentials.bicep' = {
  scope: resourceGroup()
  name: 'federatedCredentialsDeployment-${resourceDeploymentDate}'
  params: { infrastructureManagedIdentity: managedIdentities.outputs.userAssignedManagedIdentities[2] }
}

module securityGroups 'securityGroups.bicep' = {
  scope: resourceGroup()
  name: 'securityGroupsDeployment-${resourceDeploymentDate}'
}

import { identity } from '../types/identity.type.bicep'
output managedIdentitiesList identity[] = managedIdentities.outputs.userAssignedManagedIdentities
