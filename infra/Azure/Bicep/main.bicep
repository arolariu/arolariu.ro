targetScope = 'subscription'

// =====================================================================================
// Main Bicep Entry Point - Zero-Touch Deployment
// =====================================================================================
// This is the root entry point for deploying the entire arolariu.ro infrastructure.
// It creates the resource group and delegates all resource provisioning to facade.bicep.
//
// Deployment Command:
// az deployment sub create --location swedencentral --template-file main.bicep \
//   --parameters resourceGroupName=rg-arolariu resourceGroupAuthor="admin@arolariu.ro" \
//   resourceGroupLocation=swedencentral
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

metadata description = 'Root entry point for zero-touch deployment of the arolariu.ro Azure infrastructure.'
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
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceGroupLocation string

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

resource resourceGroup 'Microsoft.Resources/resourceGroups@2025-04-01' = {
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
  scope: resourceGroup
  params: {
    resourceDeploymentDate: resourceDeploymentDate
    resourceLocation: resourceGroupLocation
  }
}
