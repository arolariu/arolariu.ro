// =====================================================================================
// Azure SQL Server - Relational Database Service
// =====================================================================================
// This module provisions an Azure SQL Server and its databases. Azure SQL serves as
// the primary relational data store for structured data requiring ACID transactions:
// - User accounts and authentication data
// - Audit logs and compliance records
// - Relational data with complex query requirements
//
// Deployed Databases:
// - primary: Main production database
// - secondary: Read replica or backup database
//
// Authentication Model (Hybrid):
// - Azure AD authentication (primary, recommended)
// - SQL authentication (fallback, for legacy tools)
//
// Azure AD Administrator:
// - admin@arolariu.ro is configured as the Azure AD admin
// - All managed identities can authenticate via Azure AD
// - See rbac/sql-rbac-uami.sql for database-level permissions
//
// Security Configuration:
// - TLS 1.2 minimum (minimalTlsVersion: '1.2')
// - Public network access enabled (consider private endpoints for production)
// - Azure SQL version 12.0 (latest stable)
//
// Note: Advanced Threat Protection and Auditing are disabled to reduce costs.
// Enable these features for production workloads with compliance requirements.
//
// See: rbac/sql-rbac-uami.sql (database-level RBAC for UAMIs)
// See: configuration/keyVault.bicep (connection strings stored securely)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure SQL Server with Azure AD authentication and hybrid auth support'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

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

@description('The prefix for the SQL Database names.')
param sqlDatabaseNamePrefix string

var sqlDatabasePrimaryName = '${sqlDatabaseNamePrefix}-primary'
var sqlDatabaseSecondaryName = '${sqlDatabaseNamePrefix}-secondary'

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: sqlServerDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'storage'
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

resource sqlDatabasePrimary 'Microsoft.Sql/servers/databases@2024-05-01-preview' = {
  parent: sqlServer
  name: sqlDatabasePrimaryName
  location: sqlServerLocation
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
  tags: union(commonTags, {
    environment: 'PRODUCTION'
    deployment: 'Bicep'
  })
}

resource sqlDatabaseSecondary 'Microsoft.Sql/servers/databases@2024-05-01-preview' = {
  parent: sqlServer
  name: sqlDatabaseSecondaryName
  location: sqlServerLocation
  dependsOn: [sqlDatabasePrimary]
  sku: {
    name: 'GP_S_Gen5_2'
    tier: 'GeneralPurpose'
  }
  properties: {
    catalogCollation: 'SQL_Latin1_General_CP1_CI_AS'
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 34359738368 // 32 GB
    zoneRedundant: false
    readScale: 'Disabled'
    requestedBackupStorageRedundancy: 'Local'
    isLedgerOn: false
    availabilityZone: 'NoPreference'
    autoPauseDelay: 60 // 1 hour
    useFreeLimit: true // the secondary database will be created as a free database
    freeLimitExhaustionBehavior: 'AutoPause'
  }
  tags: union(commonTags, {
    environment: 'PRODUCTION'
    deployment: 'Bicep'
  })
}

// Outputs for use by other modules
output sqlServerName string = sqlServer.name
output sqlServerResourceId string = sqlServer.id
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
