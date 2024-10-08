targetScope = 'resourceGroup'

metadata description = 'This template will create a new Azure SQL server resource.'
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

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: sqlServerName
  location: sqlServerLocation
  properties: {
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    version: '12.0'
    administratorLogin: sqlServerAdministratorUserName
    administratorLoginPassword: sqlServerAdministratorPassword
    administrators: {
      administratorType: 'ActiveDirectory'
      login: 'admin@arolariu.ro'
      sid: 'ee9acc3d-8a79-489d-b4bf-aaae428b29db'
      tenantId: subscription().tenantId
    }
  }
  tags: {
    environment: 'PRODUCTION'
    deployment: 'Bicep'
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

  resource sqlServerAzureAdOnlyAuth 'azureADOnlyAuthentications@2023-08-01-preview' = {
    name: 'Default'
    properties: { azureADOnlyAuthentication: false }
  }
}

output sqlServerName string = sqlServer.name
