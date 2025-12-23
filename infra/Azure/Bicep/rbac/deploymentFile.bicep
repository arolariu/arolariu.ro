targetScope = 'resourceGroup'

// =====================================================================================
// RBAC Module Deployment Orchestrator
// =====================================================================================
// This is the entry point for RBAC role assignments across all managed identities.
// It orchestrates the deployment of role-specific RBAC modules for each identity type.
//
// Deployed Modules:
// - Frontend UAMI RBAC: Read-only storage access, app config, ACR pull
// - Backend UAMI RBAC: Full storage access, databases, AI services, Key Vault
// - Infrastructure UAMI RBAC: CI/CD permissions, ACR push, website deployment
//
// Identity Array Order (CRITICAL):
// [0] = Frontend identity (arolariu-ro website)
// [1] = Backend identity (api.arolariu.ro API)
// [2] = Infrastructure identity (GitHub Actions CI/CD)
//
// See: facade.bicep for identity creation and ordering
// =====================================================================================

metadata description = 'RBAC module deployment orchestrator that assigns Azure RBAC roles to managed identities for secure resource access.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The deployment timestamp used for unique deployment naming. Defaults to current UTC time.')
param resourceDeploymentDate string = utcNow()

import { identity } from '../types/identity.type.bicep'

@description('Array of managed identities requiring RBAC assignments. Expected order: [0]=Frontend, [1]=Backend, [2]=Infrastructure.')
param managedIdentities identity[]

// =====================================================================================
// RBAC Module Deployments
// =====================================================================================
// Each module assigns the appropriate roles to its respective managed identity.
// Modules are deployed in parallel as they have no interdependencies.
// =====================================================================================

// Deploys read-focused RBAC roles for the frontend Next.js application
module frontendUamiRbac 'frontend-uami-rbac.bicep' = {
  name: 'frontendUamiRbac-${resourceDeploymentDate}'
  params: {
    frontendIdentity: managedIdentities[0]
  }
}

// Deploys full-access RBAC roles for the backend .NET API
module backendUamiRbac 'backend-uami-rbac.bicep' = {
  name: 'backendUamiRbac-${resourceDeploymentDate}'
  params: {
    backendIdentity: managedIdentities[1]
  }
}

// Deploys CI/CD-focused RBAC roles for GitHub Actions workflows
module infrastructureUamiRbac 'infrastructure-uami-rbac.bicep' = {
  name: 'infrastructureUamiRbac-${resourceDeploymentDate}'
  params: {
    infrastructureIdentity: managedIdentities[2]
  }
}
