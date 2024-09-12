targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

var storageAccountName = '${replace(resourceConventionPrefix, '-', '')}sa'
var sqlServerName = '${resourceConventionPrefix}-sqlserver'

module storageAccountDeployment 'storageAccount.bicep' = {
  scope: resourceGroup()
  name: 'storageAccountDeployment-${resourceDeploymentDate}'
  params: { storageAccountName: storageAccountName }
}

module sqlServerDeployment 'sqlServer.bicep' = {
  scope: resourceGroup()
  name: 'sqlServerDeployment-${resourceDeploymentDate}'
  params: {
    sqlServerName: sqlServerName
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
  }
}
