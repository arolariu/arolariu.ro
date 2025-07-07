targetScope = 'resourceGroup'

metadata description = 'RBAC module deployment file that manages resource group level role assignments for managed identities'
metadata author = 'Alexandru-Razvan Olariu'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

import { identity } from '../types/identity.type.bicep'
@description('Array of managed identities that need RBAC assignments')
param managedIdentities identity[]

module frontendUamiRbac 'frontend-uami-rbac.bicep' = {
  name: 'frontendUamiRbac-${resourceDeploymentDate}'
  params: {
    frontendIdentity: managedIdentities[0]
  }
}

module backendUamiRbac 'backend-uami-rbac.bicep' = {
  name: 'backendUamiRbac-${resourceDeploymentDate}'
  params: {
    backendIdentity: managedIdentities[1]
  }
}

module infrastructureUamiRbac 'infrastructure-uami-rbac.bicep' = {
  name: 'infrastructureUamiRbac-${resourceDeploymentDate}'
  params: {
    infrastructureIdentity: managedIdentities[2]
  }
}
