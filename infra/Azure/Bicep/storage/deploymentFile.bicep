targetScope = 'resourceGroup'

metadata description = 'Storage module deployment file that provisions storage accounts, container registry, and databases with enterprise security standards.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The prefix to use for the names of the resources.')
@minLength(1)
@maxLength(20)
param resourceConventionPrefix string

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

// Generate names using the existing convention
var storageAccountName = '${replace(resourceConventionPrefix, '-', '')}sa'
var containerRegistryName = '${resourceConventionPrefix}-acr'
var sqlServerName = '${resourceConventionPrefix}-sqlserver'
var noSqlServerName = '${resourceConventionPrefix}-nosqlserver'

// Deploy primary storage account with enhanced security
module storageAccountDeployment 'storageAccount.bicep' = {
  scope: resourceGroup()
  name: 'storageAccountDeployment-${resourceDeploymentDate}'
  params: {
    storageAccountName: storageAccountName
    storageAccountLocation: resourceLocation
    storageAccountDeploymentDate: resourceDeploymentDate
  }
}

// Deploy container registry with enhanced security
module containerRegistryDeployment 'containerRegistry.bicep' = {
  scope: resourceGroup()
  name: 'containerRegistryDeployment-${resourceDeploymentDate}'
  params: {
    containerRegistryLocation: resourceLocation
    containerRegistryName: containerRegistryName
    containerRegistryDeploymentDate: resourceDeploymentDate
  }
}

// Deploy SQL Server with secure configuration
module sqlServerDeployment 'sqlServer.bicep' = {
  scope: resourceGroup()
  name: 'sqlServerDeployment-${resourceDeploymentDate}'
  params: {
    sqlServerName: sqlServerName
    sqlServerLocation: resourceLocation
    sqlServerDeploymentDate: resourceDeploymentDate
    // Note: These credentials should be provided from Key Vault in production
    sqlServerAdministratorPassword: 'TempP@ssw0rd123!'
    sqlServerAdministratorUserName: 'sqladmin'
  }
}

// Deploy SQL databases
module sqlServerDatabaseDeployment 'sqlDatabases.bicep' = {
  name: 'sqlServerDatabaseDeployment-${resourceDeploymentDate}'
  scope: resourceGroup()
  dependsOn: [sqlServerDeployment]
  params: {
    sqlServerName: sqlServerDeployment.outputs.sqlServerName
    sqlDatabaseNamePrefix: '${resourceConventionPrefix}-sqlserver-db'
    sqlDatabaseLocation: resourceLocation
  }
}

// Deploy Cosmos DB (NoSQL) with secure configuration
module noSqlServerDeployment 'noSqlServer.bicep' = {
  scope: resourceGroup()
  name: 'noSqlServerDeployment-${resourceDeploymentDate}'
  params: {
    noSqlServerName: noSqlServerName
    noSqlServerLocation: resourceLocation
    noSqlServerDeploymentDate: resourceDeploymentDate
  }
}

// Outputs for use by other modules
output storageAccountName string = storageAccountDeployment.outputs.storageAccountName
output storageAccountId string = storageAccountDeployment.outputs.storageAccountId
output storageAccountBlobEndpoint string = storageAccountDeployment.outputs.storageAccountBlobEndpoint
output sqlServerName string = sqlServerDeployment.outputs.sqlServerName
output cosmosAccountName string = noSqlServerDeployment.outputs.noSqlServerName
