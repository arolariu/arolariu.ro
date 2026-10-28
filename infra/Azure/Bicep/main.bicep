targetScope = 'subscription'

// =====================================================================================
// Main Bicep Entry Point - Fresh Deployment Stages
// =====================================================================================
// This is the root entry point for deploying the entire arolariu.ro infrastructure.
// Foundation creates the resource group; Domains uses the existing group.
// facade.bicep selects the requested stage without rerunning Foundation in Domains.
//
// Deployment Command:
// az deployment sub create --location francecentral --template-file main.bicep \
//   --parameters main.bicepparam
//
// Architecture:
// main.bicep (subscription scope)
//   └── facade.bicep (resource group scope)
//       ├── identity/     - Managed identities
//       ├── rbac/         - Role assignments
//       ├── configuration/- Key Vault, App Config
//       ├── storage/      - Storage, databases, ACR
//       ├── compute/      - App Service Plans
//       ├── sites/        - Web applications
//       ├── network/      - Front Door, DNS
//       └── observability/- Monitoring, logging
// =====================================================================================

metadata description = 'Root entry point for fresh foundation provisioning and separate domain completion.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The name of the resource group that will contain all the resources.')
@minLength(1)
@maxLength(90)
param resourceGroupName string

@description('The author of the resource group and deployment.')
@minLength(5)
@maxLength(100)
param resourceGroupAuthor string

@description('The location of the resource group that will contain all the resources.')
@allowed(['francecentral', 'northeurope', 'westeurope', 'swedencentral'])
param resourceGroupLocation string

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The infrastructure lifecycle stage to execute.')
@allowed(['foundation', 'domains'])
param deploymentStage string = 'foundation'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2025-04-01' = if (deploymentStage == 'foundation') {
  name: resourceGroupName
  location: resourceGroupLocation
  tags: {
    deploymentType: 'Bicep'
    deploymentAuthor: resourceGroupAuthor
    deploymentDate: resourceDeploymentDate
  }
}

module mainDeployment 'facade.bicep' = {
  name: 'mainDeployment-${resourceDeploymentDate}'
  scope: az.resourceGroup(resourceGroupName)
  dependsOn: [resourceGroup]
  params: {
    resourceDeploymentDate: resourceDeploymentDate
    resourceLocation: resourceGroupLocation
    deploymentStage: deploymentStage
  }
}

output deploymentInfo object = mainDeployment.outputs.deploymentInfo
