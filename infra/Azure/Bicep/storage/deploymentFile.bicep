targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

var storageAccountName = '${replace(resourceConventionPrefix, '-', '')}sa'

var sqlServerName = '${resourceConventionPrefix}-sqlserver'
var noSqlServerName = '${resourceConventionPrefix}-nosqlserver'

module storageAccountDeployment 'storageAccount.bicep' = {
  scope: resourceGroup()
  name: 'storageAccountDeployment-${resourceDeploymentDate}'
  params: { storageAccountName: storageAccountName }
}

module containerRegistryDeployment 'containerRegistry.bicep' = {
  scope: resourceGroup()
  name: 'containerRegistryDeployment-${resourceDeploymentDate}'
  params: { containerRegistryName: '${resourceConventionPrefix}-acr' }
}

module sqlServerDeployment 'sqlServer.bicep' = {
  scope: resourceGroup()
  name: 'sqlServerDeployment-${resourceDeploymentDate}'
  params: {
    sqlServerName: sqlServerName
    sqlServerAdministratorPassword: 'adminUsername1234!' // This is a placeholder, replace it with a secret
    sqlServerAdministratorUserName: 'adminPa$$w0rd1234!' // This is a placeholder, replace it with a secret
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

module noSqlServerDeployment 'noSqlServer.bicep' = {
  scope: resourceGroup()
  name: 'noSqlServerDeployment-${resourceDeploymentDate}'
  params: { noSqlServerName: noSqlServerName }
}

module noSqlServerDatabaseDeployment 'noSqlDatabases.bicep' = {
  scope: resourceGroup()
  name: 'noSqlServerDatabaseDeployment-${resourceDeploymentDate}'
  dependsOn: [noSqlServerDeployment]
  params: { noSqlServerName: noSqlServerDeployment.outputs.noSqlServerName }
}
