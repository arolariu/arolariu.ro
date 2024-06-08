targetScope = 'resourceGroup'

metadata description = 'This template will create a new Azure SQL Server resource.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The SQL Server name.')
param sqlServerName string

@description('The location for the SQL Server resource.')
param sqlServerLocation string = resourceGroup().location

@description('The username for the local SQL Server administrator.')
@secure()
param sqlServerAdministratorUserName string

@description('The password for the local SQL Server administrator.')
@secure()
param sqlServerAdministratorPassword string

param sqlServerBackendIdentity string
param sqlServerFrontendIdentity string
param sqlServerInfrastructureIdentity string

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: sqlServerName
  location: sqlServerLocation
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${sqlServerBackendIdentity}': {}
      '${sqlServerFrontendIdentity}': {}
      '${sqlServerInfrastructureIdentity}': {}
    }
  }
  properties: {
    minimalTlsVersion: '1.3'
    publicNetworkAccess: 'Enabled'
    version: '12.0'
    primaryUserAssignedIdentityId: sqlServerBackendIdentity
    administratorLogin: sqlServerAdministratorUserName
    administratorLoginPassword: sqlServerAdministratorPassword
  }
  tags: {
    environment: 'production'
    deployment: 'bicep'
    timestamp: resourceGroup().tags.timestamp
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

output sqlServerName string = sqlServer.name
