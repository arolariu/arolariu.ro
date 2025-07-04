targetScope = 'resourceGroup'

metadata description = 'This template will create a new Azure SQL server resource with standardized metadata.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The SQL Server name.')
@minLength(1)
@maxLength(63)
param sqlServerName string

@description('The location for the SQL Server resource.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param sqlServerLocation string

@description('The username for the local SQL Server administrator.')
@secure()
param sqlServerAdministratorUserName string

@description('The password for the local SQL Server administrator.')
@secure()
param sqlServerAdministratorPassword string

@description('The date when the deployment is executed.')
param sqlServerDeploymentDate string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: sqlServerDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'storage-sql'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource sqlServer 'Microsoft.Sql/servers@2024-05-01-preview' = {
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

  resource sqlServerAdvancedThreatProtection 'advancedThreatProtectionSettings@2024-05-01-preview' = {
    name: 'Default'
    properties: { state: 'Disabled' }
  }

  resource sqlServerAuditPolicy 'auditingPolicies@2014-04-01' = {
    name: 'Default'
    properties: { auditingState: 'Disabled' }
  }

  resource sqlServerAuditSettings 'auditingSettings@2024-05-01-preview' = {
    name: 'default'
    properties: { state: 'Disabled' }
  }

  resource sqlServerConnectionPolicies 'connectionPolicies@2024-05-01-preview' = {
    name: 'Default'
    properties: { connectionType: 'Default' }
  }

  resource sqlServerAzureAdOnlyAuth 'azureADOnlyAuthentications@2024-05-01-preview' = {
    name: 'Default'
    properties: { azureADOnlyAuthentication: false }
  }

  tags: union(commonTags, {
    displayName: 'SQL Server'
  })
}

// Outputs for use by other modules
output sqlServerName string = sqlServer.name
output sqlServerResourceId string = sqlServer.id
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
