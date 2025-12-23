// =====================================================================================
// Azure Cosmos DB (NoSQL API) - Globally Distributed Document Database
// =====================================================================================
// This module provisions an Azure Cosmos DB account with NoSQL API. Cosmos DB serves
// as the document store for semi-structured data requiring flexible schemas:
// - Invoice documents (JSON with varying product structures)
// - User preferences and settings
// - Analytics data and aggregations
//
// Deployed Containers:
// - invoices: Stores invoice documents partitioned by user or merchant
//
// Consistency Level: Session
// - Guarantees read-your-writes within a session
// - Good balance between consistency and performance
// - Suitable for single-region deployments
//
// Pricing Tier:
// - Free tier enabled (first 1000 RU/s and 25 GB free)
// - Total throughput limit: 1000 RU/s
// - Standard offer type
//
// Backup Policy:
// - Continuous backup with 7-day point-in-time restore
// - Provides granular recovery without snapshots
//
// Security Configuration:
// - TLS 1.2 minimum (minimalTlsVersion: 'Tls12')
// - Local authentication enabled (for development)
// - Consider disabling local auth for production (disableLocalAuth: true)
// - Public network access enabled
//
// See: rbac/backend-uami-rbac.bicep (Cosmos DB role assignments)
// See: docs/rfc/2001-domain-driven-design-architecture.md (data model)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure Cosmos DB with NoSQL API for document storage'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The NoSQL Server name.')
param noSqlServerName string

@description('The location for the NoSQL Server resource.')
param noSqlServerLocation string

@description('The date when the deployment is executed.')
param noSqlServerDeploymentDate string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: noSqlServerDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'storage'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource noSqlServer 'Microsoft.DocumentDB/databaseAccounts@2025-11-01-preview' = {
  name: noSqlServerName
  location: noSqlServerLocation
  kind: 'GlobalDocumentDB'
  properties: {
    publicNetworkAccess: 'Enabled'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    isVirtualNetworkFilterEnabled: false
    virtualNetworkRules: []
    disableKeyBasedMetadataWriteAccess: false
    enableFreeTier: true
    enableAnalyticalStorage: false
    analyticalStorageConfiguration: { schemaType: 'WellDefined' }
    createMode: 'Default'
    databaseAccountOfferType: 'Standard'
    defaultIdentity: 'FirstPartyIdentity'
    networkAclBypass: 'None'
    disableLocalAuth: false
    enablePartitionMerge: false
    enableBurstCapacity: false
    minimalTlsVersion: 'Tls12'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
      maxIntervalInSeconds: 5
      maxStalenessPrefix: 100
    }
    locations: [
      {
        locationName: noSqlServerLocation
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: { tier: 'Continuous7Days' }
    }
    capacity: { totalThroughputLimit: 1000 }
  }

  resource primaryNoSqlDatabase 'sqlDatabases@2025-11-01-preview' = {
    name: 'primary'
    location: noSqlServerLocation
    properties: {
      resource: {
        id: 'primary'
      }
    }

    resource invoicesContainer 'containers@2025-11-01-preview' = {
      name: 'invoices'
      properties: {
        resource: {
          id: 'invoices'
          indexingPolicy: {
            indexingMode: 'consistent'
            automatic: true
            includedPaths: [{ path: '/*' }]
            excludedPaths: [{ path: '/_etag/?' }]
          }
          partitionKey: {
            paths: ['/UserIdentifier']
            kind: 'Hash'
            version: 2
          }
          uniqueKeyPolicy: {
            uniqueKeys: []
          }
        }
      }
    }

    resource merchantsContainer 'containers@2025-11-01-preview' = {
      name: 'merchants'
      properties: {
        resource: {
          id: 'merchants'
          indexingPolicy: {
            indexingMode: 'consistent'
            automatic: true
            includedPaths: [{ path: '/*' }]
            excludedPaths: [{ path: '/_etag/?' }]
          }
          partitionKey: {
            paths: ['/ParentCompanyId']
            kind: 'Hash'
            version: 2
          }
          uniqueKeyPolicy: {
            uniqueKeys: []
          }
        }
      }
    }

    tags: union(commonTags, {
      displayName: 'Primary NoSQL Database'
    })
  }

  tags: union(commonTags, {
    displayName: 'NoSQL Server'
  })
}

output noSqlServerName string = noSqlServer.name
