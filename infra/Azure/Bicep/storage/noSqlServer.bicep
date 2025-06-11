targetScope = 'resourceGroup'

metadata description = 'This template will create a new Azure NoSQL server resource.'
metadata author = 'Alexandru-Razvan Olariu'

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
  module: 'storage-nosql'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource noSqlServer 'Microsoft.DocumentDB/databaseAccounts@2025-05-01-preview' = {
  name: noSqlServerName
  location: noSqlServerLocation
  properties: {
    publicNetworkAccess: 'Enabled'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    isVirtualNetworkFilterEnabled: false
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

  resource primaryNoSqlDatabase 'sqlDatabases@2025-05-01-preview' = {
    name: 'primary'
    location: noSqlServerLocation
    properties: {
      resource: {
        id: 'primary'
      }
    }

    resource databaseSettings 'throughputSettings@2025-05-01-preview' = {
      name: 'default'
      properties: {
        resource: {
          throughput: 100
          autoscaleSettings: {
            maxThroughput: 1000
          }
        }
      }
    }

    resource invoicesContainer 'containers@2025-05-01-preview' = {
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
          conflictResolutionPolicy: {
            mode: 'LastWriterWins'
            conflictResolutionPath: '_ts'
          }
        }
      }
    }

    resource merchantsContainer 'containers@2025-05-01-preview' = {
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
          conflictResolutionPolicy: {
            mode: 'LastWriterWins'
            conflictResolutionPath: '_ts'
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
