// =====================================================================================
// Shared Role Definition GUIDs
// =====================================================================================
// Single source of truth for all Azure built-in role definition IDs used in RBAC.
// Reference: https://learn.microsoft.com/azure/role-based-access-control/built-in-roles
//
// Usage:
//   import { storageBlobDataReader } from '../constants/roles.bicep'
// =====================================================================================

metadata description = 'Shared Azure built-in role definition GUIDs for RBAC assignments'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

// -------------------------------------------------------------------------------------
// Storage Roles
// -------------------------------------------------------------------------------------
@export()
var storageBlobDataReader = '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'

@export()
var storageBlobDataContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

@export()
var storageBlobDataOwner = 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'

@export()
var storageQueueDataReader = '19e7f393-937e-4f77-808e-94535e297925'

@export()
var storageQueueDataContributor = '974c5e8b-45b9-4653-ba55-5f855dd0fb88'

@export()
var storageTableDataReader = '76199698-9eea-4c19-bc75-cec21354c6b6'

@export()
var storageTableDataContributor = '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'

// -------------------------------------------------------------------------------------
// Container Registry Roles
// -------------------------------------------------------------------------------------
@export()
var acrPull = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

@export()
var acrPush = '8311e382-0749-4cb8-b61a-304f252e45ec'

@export()
var acrRepositoryReader = 'b93aa761-3e63-49ed-ac28-beffa264f7ac'

// -------------------------------------------------------------------------------------
// Database Roles
// -------------------------------------------------------------------------------------
@export()
var sqlDbContributor = '9b7fa17d-e63e-47b0-bb0a-15c516ac86ec'

@export()
var cosmosDbDataOperator = '230815da-be43-4aae-9cb4-875f7bd000aa'

// -------------------------------------------------------------------------------------
// Configuration Roles
// -------------------------------------------------------------------------------------
@export()
var appConfigurationDataReader = '516239f1-63e1-4d78-a4de-a74fb236a071'

@export()
var appConfigurationDataOwner = 'fe86443c-f201-4fc4-9d2a-ac61149fbda0'

@export()
var keyVaultSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'

@export()
var keyVaultReader = '21090545-7ca7-4776-b22c-e363652d74d2'

// -------------------------------------------------------------------------------------
// AI Roles
// -------------------------------------------------------------------------------------
@export()
var cognitiveServicesOpenAiUser = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'

@export()
@description('Grants read access to Cognitive Services data actions including Form Recognizer/Document Intelligence analysis.')
var cognitiveServicesUser = 'a97b65f3-24c7-4388-baec-2e87135dc908'

// -------------------------------------------------------------------------------------
// Compute Roles
// -------------------------------------------------------------------------------------
@export()
var websiteContributor = 'de139f84-1756-47ae-9be6-808fbbe84772'

// -------------------------------------------------------------------------------------
// Monitoring Roles
// -------------------------------------------------------------------------------------
@export()
var monitoringMetricsPublisher = '3913510d-42f4-4e42-8a64-420c390055eb'
