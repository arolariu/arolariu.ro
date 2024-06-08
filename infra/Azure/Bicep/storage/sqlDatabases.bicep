targetScope = 'resourceGroup'

metadata description = 'This template will deploy a primary, DTU-based SQL database, and a secondary, serverless SQL database. The primary database will be created with a Standard SKU, while the secondary database will be created with a GeneralPurpose SKU. The secondary database will be created as a free database, and will be automatically paused after an hour of inactivity. The databases will be created in the same location as the resource group.'

metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the SQL Server.')
param sqlServerName string

@description('The prefix for the SQL Database names.')
param sqlDatabaseNamePrefix string

@description('The location for the SQL Database resources.')
param sqlDatabaseLocation string = resourceGroup().location

param sqlDatabaseBackendIdentity string

var sqlDatabasePrimaryName = '${sqlDatabaseNamePrefix}-primary'
var sqlDatabaseSecondaryName = '${sqlDatabaseNamePrefix}-secondary'

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' existing = {
  scope: resourceGroup()
  name: sqlServerName
}

resource sqlDatabasePrimary 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: sqlDatabasePrimaryName
  location: sqlDatabaseLocation
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${sqlDatabaseBackendIdentity}': {}
    }
  }
  sku: {
    name: 'Standard'
    tier: 'Standard'
    capacity: 10
  }
  properties: {
    catalogCollation: 'SQL_Latin1_General_CP1_CI_AS'
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 268435456000 // 256 GB
    zoneRedundant: false
    readScale: 'Disabled'
    requestedBackupStorageRedundancy: 'Local'
    isLedgerOn: false
    availabilityZone: 'NoPreference'
  }
  tags: {
    environment: 'production'
    deployment: 'bicep'
  }
}

resource sqlDatabaseSecondary 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: sqlDatabaseSecondaryName
  location: sqlDatabaseLocation
  sku: {
    name: 'GP_S_Gen5_2'
    tier: 'GeneralPurpose'
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${sqlDatabaseBackendIdentity}': {}
    }
  }
  properties: {
    catalogCollation: 'SQL_Latin1_General_CP1_CI_AS'
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    zoneRedundant: false
    readScale: 'Disabled'
    requestedBackupStorageRedundancy: 'Local'
    isLedgerOn: false
    availabilityZone: 'NoPreference'
    useFreeLimit: true // the secondary database will be created as a free database
    freeLimitExhaustionBehavior: 'AutoPause'
  }
  tags: {
    environment: 'production'
    deployment: 'bicep'
    timestamp: resourceGroup().tags.timestamp
  }
}
