targetScope = 'resourceGroup'

metadata description = 'This template creates a secure storage account with enterprise-grade security standards.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The storage account name.')
@minLength(3)
@maxLength(24)
param storageAccountName string

@description('The location for the storage account resource.')
param storageAccountLocation string

@description('The date when the deployment is executed.')
param storageAccountDeploymentDate string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: storageAccountDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'storage'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: storageAccountLocation
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    dnsEndpointType: 'Standard'
    defaultToOAuthAuthentication: true
    publicNetworkAccess: 'Enabled'
    allowCrossTenantReplication: false
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
    allowSharedKeyAccess: true
    networkAcls: {
      bypass: 'AzureServices, Logging, Metrics'
      defaultAction: 'Allow'
    }
    supportsHttpsTrafficOnly: true
    encryption: {
      keySource: 'Microsoft.Storage'
      requireInfrastructureEncryption: true
      services: {
        blob: {
          enabled: true
          keyType: 'Account'
        }
        file: {
          enabled: true
          keyType: 'Account'
        }
        queue: {
          enabled: true
          keyType: 'Account'
        }
        table: {
          enabled: true
          keyType: 'Account'
        }
      }
    }
    accessTier: 'Hot'
  }
  tags: union(commonTags, {
    displayName: 'Secure Storage Account'
  })

  // Blob service configuration with security enhancements
  resource blobServices 'blobServices@2023-05-01' = {
    name: 'default'
    properties: {
      changeFeed: {
        enabled: true
        retentionInDays: 90
      }
      restorePolicy: {
        enabled: true
        days: 30
      }
      containerDeleteRetentionPolicy: {
        enabled: true
        days: 7
      }
      cors: {
        corsRules: [
          {
            allowedOrigins: ['https://arolariu.ro', 'https://dev.arolariu.ro']
            allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']
            allowedHeaders: ['*']
            exposedHeaders: ['*']
            maxAgeInSeconds: 3600
          }
          {
            allowedOrigins: ['http://localhost:3000', 'http://localhost:3001']
            allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
            allowedHeaders: ['*']
            exposedHeaders: ['*']
            maxAgeInSeconds: 1800
          }
        ]
      }
      deleteRetentionPolicy: {
        enabled: true
        days: 90
        allowPermanentDelete: false
      }
      isVersioningEnabled: true
      lastAccessTimeTrackingPolicy: {
        enable: true
        name: 'AccessTimeTracking'
        trackingGranularityInDays: 1
        blobType: ['blockBlob']
      }
    }
  }

  // File service configuration
  resource fileServices 'fileServices@2023-05-01' = {
    name: 'default'
    properties: {
      shareDeleteRetentionPolicy: {
        enabled: true
        days: 7
        allowPermanentDelete: false
      }
      protocolSettings: {
        smb: {
          versions: 'SMB3.0;SMB3.1.1'
          authenticationMethods: 'Kerberos'
          kerberosTicketEncryption: 'AES-256'
          channelEncryption: 'AES-128-CCM;AES-128-GCM;AES-256-GCM'
        }
      }
    }
  }

  // Queue service configuration
  resource queueServices 'queueServices@2023-05-01' = {
    name: 'default'
    properties: {}
  }

  // Table service configuration
  resource tableServices 'tableServices@2023-05-01' = {
    name: 'default'
    properties: {}
  }
}

// Lifecycle management policy for cost optimization
resource lifecyclePolicy 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          enabled: true
          name: 'MoveToIA'
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
            }
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: 30
                }
                tierToArchive: {
                  daysAfterModificationGreaterThan: 90
                }
                delete: {
                  daysAfterModificationGreaterThan: 365
                }
              }
              snapshot: {
                delete: {
                  daysAfterCreationGreaterThan: 90
                }
              }
              version: {
                delete: {
                  daysAfterCreationGreaterThan: 365
                }
              }
            }
          }
        }
      ]
    }
  }
}

// Outputs
output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output storageAccountBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob
output storageAccountFileEndpoint string = storageAccount.properties.primaryEndpoints.file
output storageAccountQueueEndpoint string = storageAccount.properties.primaryEndpoints.queue
output storageAccountTableEndpoint string = storageAccount.properties.primaryEndpoints.table
