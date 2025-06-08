targetScope = 'resourceGroup'

metadata description = 'This template will deploy the NoSQL server database resources.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the NoSQL server.')
param noSqlServerName string

@description('The location for the NoSQL server resource.')
param noSqlServerLocation string

resource noSqlServer 'Microsoft.DocumentDB/databaseAccounts@2025-05-01-preview' existing = {
  scope: resourceGroup()
  name: noSqlServerName
}

resource primaryNoSqlDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2025-05-01-preview' = {
  parent: noSqlServer
  name: 'primary'
  location: noSqlServerLocation
  properties: {
    resource: {
      id: 'primary'
    }
  }
}

resource primaryNoSqlDatabaseSettings 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/throughputSettings@2025-05-01-preview' = {
  parent: primaryNoSqlDatabase
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

resource primaryNoSqlDatabaseInvoiceContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2025-05-01-preview' = {
  parent: primaryNoSqlDatabase
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

resource primaryNoSqlDatabaseMerchantContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2025-05-01-preview' = {
  parent: primaryNoSqlDatabase
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
