// =====================================================================================
// AI Services Deployment Orchestrator - Azure AI Foundry
// =====================================================================================
// This orchestrator module deploys the artificial intelligence infrastructure for the
// arolariu.ro platform. It provisions Azure AI services that power intelligent features
// such as invoice analysis, document understanding, and natural language processing.
//
// Deployed Resources:
// - Azure AI Foundry (AIServices unified platform with OpenAI, Document Intelligence)
//
// Security Model:
// - Backend UAMI receives Cognitive Services User + Azure AI User roles on AI Foundry
// - No API keys are used; authentication is via managed identity
// - Models are accessed through Azure RBAC, not shared keys
//
// Integration Points:
// - Backend API calls AI Foundry for invoice analysis and model routing (RFC 2001)
// - AI Foundry hosts the model-router deployment and Document Intelligence
//
// Cost Considerations:
// - AI Foundry uses token-based billing for OpenAI models
// - Document Intelligence charges per analyzed page
//
// See: rbac/ai-rbac.bicep (grants AI access to backend)
// See: docs/rfc/2001-domain-driven-design-architecture.md (Invoice AI)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'AI services orchestrator deploying Azure AI Foundry'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The location for the resources.')
@allowed(['francecentral', 'northeurope', 'westeurope', 'swedencentral'])
param resourceLocation string

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

var aiConventionPrefix = '${resourceConventionPrefix}-ai'

module aiFoundryDeployment 'aiFoundry.bicep' = {
  name: 'aiFoundryDeployment-${resourceDeploymentDate}'
  params: {
    aiFoundryName: '${aiConventionPrefix}-foundry'
    aiFoundryDeploymentDate: resourceDeploymentDate
  }
}

output aiFoundryName string = aiFoundryDeployment.outputs.aiFoundryName

output aiResources object = {
  aiFoundryId: aiFoundryDeployment.outputs.aiFoundryId
  aiFoundryEndpoint: aiFoundryDeployment.outputs.aiFoundryEndpoint
  aiProjectId: aiFoundryDeployment.outputs.aiProjectId
}
