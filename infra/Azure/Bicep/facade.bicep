targetScope = 'resourceGroup'

metadata description = 'Routes a stable resource namespace through foundation provisioning or domain completion.'

@description('The audit timestamp used for deployment names and tags.')
param resourceDeploymentDate string = utcNow()

@description('The regional resource location.')
@allowed(['francecentral', 'northeurope', 'westeurope', 'swedencentral'])
param resourceLocation string

@description('The infrastructure lifecycle stage to execute.')
@allowed(['foundation', 'domains'])
param deploymentStage string = 'foundation'

@description('The experiments application registration client ID.')
param expEntraAppClientId string

var resourceConventionPrefix = 'q${substring(uniqueString(resourceGroup().id), 0, 8)}'

module foundationDeployment 'foundation.bicep' = if (deploymentStage == 'foundation') {
  name: 'foundationDeployment-${resourceDeploymentDate}'
  params: {
    resourceConventionPrefix: resourceConventionPrefix
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    expEntraAppClientId: expEntraAppClientId
  }
}

module domainCompletionDeployment 'domains.bicep' = if (deploymentStage == 'domains') {
  name: 'domainCompletionDeployment-${resourceDeploymentDate}'
  params: {
    resourceConventionPrefix: resourceConventionPrefix
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
  }
}

output deploymentInfo object = deploymentStage == 'foundation'
  ? foundationDeployment!.outputs.deploymentInfo
  : domainCompletionDeployment!.outputs.deploymentInfo
