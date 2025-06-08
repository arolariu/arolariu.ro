targetScope = 'resourceGroup'

metadata description = 'This template creates a secure storage account with enterprise-grade security standards.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The location for the storage account resource.')
param location string = resourceGroup().location

@description('The storage account name.')
@minLength(3)
@maxLength(24)
param storageAccountName string

@description('The environment for the deployment (dev, staging, prod).')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('Resource tags for governance and cost tracking.')
param tags object = {}

@description('Managed identity resource ID for secure access.')
param managedIdentityId string = ''

@description('Storage account SKU.')
@allowed(['Standard_LRS', 'Standard_GRS', 'Standard_ZRS', 'Premium_LRS'])
param skuName string = 'Standard_LRS'

@description('Storage account access tier.')
@allowed(['Hot', 'Cool'])
param accessTier string = 'Hot'

@description('Enable public blob access.')
param allowBlobPublicAccess bool = false

@description('Allow shared key access.')
param allowSharedKeyAccess bool = false

@description('Enable HTTPS traffic only.')
param supportsHttpsTrafficOnly bool = true

@description('Minimum TLS version.')
@allowed(['TLS1_0', 'TLS1_1', 'TLS1_2'])
param minimumTlsVersion string = 'TLS1_2'

@description('Public network access setting.')
@allowed(['Enabled', 'Disabled'])
param publicNetworkAccess string = environment == 'prod' ? 'Disabled' : 'Enabled'

// Enhanced tags combining common tags with resource-specific tags
var enhancedTags = union(tags, {
  resourceType: 'Storage Account'
  sku: skuName
  accessTier: accessTier
})

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: skuName
  }
  kind: 'StorageV2'
  identity: !empty(managedIdentityId)
    ? {
        type: 'UserAssigned'
        userAssignedIdentities: {
          '${managedIdentityId}': {}
        }
      }
    : null
  properties: {
    dnsEndpointType: 'Standard'
    defaultToOAuthAuthentication: true
    publicNetworkAccess: publicNetworkAccess
    allowCrossTenantReplication: false
    minimumTlsVersion: minimumTlsVersion
    allowBlobPublicAccess: allowBlobPublicAccess
    allowSharedKeyAccess: allowSharedKeyAccess
    networkAcls: {
      bypass: 'AzureServices, Logging, Metrics'
      defaultAction: publicNetworkAccess == 'Enabled' ? 'Allow' : 'Deny'
      ipRules: []
      virtualNetworkRules: []
    }
    supportsHttpsTrafficOnly: supportsHttpsTrafficOnly
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
    accessTier: accessTier
  }
  tags: enhancedTags

  // Blob service configuration with security enhancements
  resource blobServices 'blobServices@2023-05-01' = {
    name: 'default'
    properties: {
      changeFeed: {
        enabled: environment == 'prod' ? true : false
        retentionInDays: 90
      }
      restorePolicy: {
        enabled: environment == 'prod' ? true : false
        days: 30
      }
      containerDeleteRetentionPolicy: {
        enabled: true
        days: environment == 'prod' ? 30 : 7
      }
      cors: {
        corsRules: environment == 'dev'
          ? [
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
          : [
              {
                allowedOrigins: ['https://arolariu.ro']
                allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']
                allowedHeaders: ['*']
                exposedHeaders: ['*']
                maxAgeInSeconds: 3600
              }
            ]
      }
      deleteRetentionPolicy: {
        enabled: true
        days: environment == 'prod' ? 30 : 7
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
        days: environment == 'prod' ? 30 : 7
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
                  daysAfterModificationGreaterThan: environment == 'prod' ? 2555 : 365 // 7 years for prod, 1 year for others
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
