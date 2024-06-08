targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

param managedIdentityBackendId string
param managedIdentityFrontendId string
param managedIdentityInfraId string

var storageAccountName = '${replace(resourceConventionPrefix, '-', '')}sa'
var sqlServerName = '${resourceConventionPrefix}-sqlserver'

module storageAccountDeployment 'storageAccount.bicep' = {
  name: 'storageAccountDeployment-${resourceDeploymentDate}'
  params: { storageAccountName: storageAccountName }
  scope: resourceGroup()
}

module sqlServerDeployment 'sqlServer.bicep' = {
  name: 'sqlServerDeployment-${resourceDeploymentDate}'
  scope: resourceGroup()
  params: {
    sqlServerName: sqlServerName
    sqlServerBackendIdentity: managedIdentityBackendId
    sqlServerFrontendIdentity: managedIdentityFrontendId
    sqlServerInfrastructureIdentity: managedIdentityInfraId
    sqlServerAdministratorPassword: ''
    sqlServerAdministratorUserName: ''
  }
}

module sqlServerDatabaseDeployment 'sqlDatabases.bicep' = {
  name: 'sqlServerDatabaseDeployment-${resourceDeploymentDate}'
  scope: resourceGroup()
  dependsOn: [sqlServerDeployment]
  params: {
    sqlServerName: sqlServerDeployment.outputs.sqlServerName
    sqlDatabaseNamePrefix: '${resourceConventionPrefix}-sqlserver-db'
    sqlDatabaseBackendIdentity: managedIdentityBackendId
  }
}
