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
// - secondary: Independent secondary database (not a replica)
//
// Authentication is Entra-only. The infrastructure identity administers this
// server; deployment bootstrap grants the backend its contained database user.
//
// Security Configuration:
// - TLS 1.2 minimum (minimalTlsVersion: '1.2')
// - Public network access enabled (consider private endpoints for production)
// - Azure SQL version 12.0 (latest stable)
//
// Note: Advanced Threat Protection and Auditing are disabled to reduce costs.
// Enable these features for production workloads with compliance requirements.
//
// See: rbac/sql-rbac-uami.sql (manual reference; database-user provisioning is separate)
// See: configuration/keyVault.bicep (connection strings stored securely)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure SQL Server with Entra-only authentication and managed deployment administration.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The SQL Server name.')
@minLength(1)
@maxLength(63)
param sqlServerName string

@description('The location for the SQL Server resource.')
@allowed(['francecentral', 'northeurope', 'westeurope', 'swedencentral'])
param sqlServerLocation string

import { identity } from '../types/identity.type.bicep'

@description('The permanent infrastructure identity that administers this SQL server.')
param infrastructureManagedIdentity identity

@description('The date when the deployment is executed.')
param sqlServerDeploymentDate string

@description('The prefix for the SQL Database names.')
param sqlDatabaseNamePrefix string

var sqlDatabasePrimaryName = '${sqlDatabaseNamePrefix}-primary'
var sqlDatabaseSecondaryName = '${sqlDatabaseNamePrefix}-secondary'

// Common tags for all resources
import { createTags } from '../constants/tags.bicep'
var commonTags = createTags('storage', sqlServerDeploymentDate)

resource sqlServer 'Microsoft.Sql/servers@2025-01-01' = {
  name: sqlServerName
  location: sqlServerLocation
  properties: {
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    version: '12.0'
    administrators: {
      administratorType: 'ActiveDirectory'
      principalType: 'Application'
      azureADOnlyAuthentication: true
      login: infrastructureManagedIdentity.name
      sid: infrastructureManagedIdentity.principalId
      tenantId: subscription().tenantId
    }
  }

  resource sqlServerAdvancedThreatProtection 'advancedThreatProtectionSettings@2025-01-01' = {
    name: 'Default'
    properties: { state: 'Disabled' }
  }

  resource sqlServerAuditPolicy 'auditingPolicies@2014-04-01' = {
    name: 'Default'
    dependsOn: [sqlServerAdvancedThreatProtection]
    properties: { auditingState: 'Disabled' }
  }

  resource sqlServerAuditSettings 'auditingSettings@2025-01-01' = {
    name: 'default'
    dependsOn: [sqlServerAuditPolicy]
    properties: { state: 'Disabled' }
  }

  resource sqlServerConnectionPolicies 'connectionPolicies@2025-01-01' = {
    name: 'Default'
    dependsOn: [sqlServerAuditSettings]
    properties: { connectionType: 'Default' }
  }

  resource sqlServerAzureAdOnlyAuth 'azureADOnlyAuthentications@2025-01-01' = {
    name: 'Default'
    dependsOn: [sqlServerConnectionPolicies]
    properties: { azureADOnlyAuthentication: true }
  }

  resource allowAzureServices 'firewallRules@2025-01-01' = {
    name: 'AllowAzureServices'
    dependsOn: [sqlServerAzureAdOnlyAuth]
    properties: {
      startIpAddress: '0.0.0.0'
      endIpAddress: '0.0.0.0'
    }
  }

  tags: union(commonTags, {
    displayName: 'SQL Server'
  })
}

resource sqlDatabasePrimary 'Microsoft.Sql/servers/databases@2025-01-01' = {
  parent: sqlServer
  name: sqlDatabasePrimaryName
  location: sqlServerLocation
  // Explicit dependsOn required: all server-level child resources (threat protection,
  // auditing, connection policies, AD auth) contend for the same SQL Server lock.
  // Without this, parallel deployment causes ConflictingServerOperation errors.
  dependsOn: [
    sqlServer::allowAzureServices
  ]
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

resource sqlDatabaseSecondary 'Microsoft.Sql/servers/databases@2025-01-01' = {
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
output sqlDatabasePrimaryName string = sqlDatabasePrimary.name
output sqlDatabaseSecondaryName string = sqlDatabaseSecondary.name
