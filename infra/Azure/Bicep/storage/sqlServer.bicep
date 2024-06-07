targetScope = 'resourceGroup'

metadata description = 'This template will create a new Azure SQL Server resource.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The prefix for the SQL Server name.')
param sqlServerNamePrefix string

@description('The prefix for the SQL Database names.')
param sqlDatabaseNamePrefix string

@description('The location for the SQL Server resource.')
param sqlServerLocation string = resourceGroup().location

@description('The location for the SQL Database resources.')
param sqlDatabaseLocation string = resourceGroup().location

@description('The username for the local SQL Server administrator.')
@secure()
param sqlServerAdministratorUserName string

@description('The password for the local SQL Server administrator.')
@secure()
param sqlServerAdministratorPassword string

var sqlServerName = '${sqlServerNamePrefix}-sql-server'
var sqlDatabasePrimaryName = '${sqlDatabaseNamePrefix}-primary'
var sqlDatabaseSecondaryName = '${sqlDatabaseNamePrefix}-secondary'

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: sqlServerName
  location: sqlServerLocation
  properties: {
    minimalTlsVersion: '1.3'
    publicNetworkAccess: 'Enabled'
    version: '12.0'
    administratorLogin: sqlServerAdministratorUserName
    administratorLoginPassword: sqlServerAdministratorPassword
  }
  tags: {
    environment: 'production'
    deployment: 'bicep'
  }

  resource sqlServerAdvancedThreatProtection 'advancedThreatProtectionSettings@2023-08-01-preview' = {
    name: 'Default'
    properties: { state: 'Disabled' }
  }

  resource sqlServerAuditPolicy 'auditingPolicies@2014-04-01' = {
    name: 'Default'
    properties: { auditingState: 'Disabled' }
  }

  resource sqlServerAuditSettings 'auditingSettings@2023-08-01-preview' = {
    name: 'default'
    properties: { state: 'Disabled' }
  }

  resource sqlServerConnectionPolicies 'connectionPolicies@2023-08-01-preview' = {
    name: 'Default'
    properties: { connectionType: 'Default' }
  }
}

resource sqlDatabasePrimary 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: sqlDatabasePrimaryName
  location: sqlDatabaseLocation
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
    autoPauseDelay: 360 // 6 hours
  }
  tags: {
    environment: 'production'
    deployment: 'bicep'
  }
}

output sqlServerName string = sqlServer.name
