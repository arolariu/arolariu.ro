targetScope = 'resourceGroup'

metadata description = 'This template will create a new Azure NoSQL server resource.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The NoSQL Server name.')
param noSqlServerName string

@description('The location for the NoSQL Server resource.')
param noSqlServerLocation string

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
  tags: {
    environment: 'PRODUCTION'
    deployment: 'Bicep'
  }
}

output noSqlServerName string = noSqlServer.name
