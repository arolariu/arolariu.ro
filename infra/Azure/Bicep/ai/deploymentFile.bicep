// =====================================================================================
// AI Services Deployment Orchestrator - Azure OpenAI and AI Foundry
// =====================================================================================
// This orchestrator module deploys the artificial intelligence infrastructure for the
// arolariu.ro platform. It provisions Azure AI services that power intelligent features
// such as invoice analysis, document understanding, and natural language processing.
//
// Deployed Resources:
// - Azure OpenAI Service (GPT models for text generation and analysis)
// - Azure AI Foundry (formerly Machine Learning) for model experimentation
//
// Security Model:
// - Backend UAMI receives Cognitive Services User role on OpenAI
// - No API keys are used; authentication is via managed identity
// - Models are accessed through Azure RBAC, not shared keys
//
// Integration Points:
// - Backend API calls OpenAI for invoice analysis (see RFC 2001)
// - AI Foundry hosts experimental models and training pipelines
//
// Cost Considerations:
// - OpenAI uses token-based billing (monitor usage in Cost Management)
// - AI Foundry has compute costs only when training runs are active
//
// See: rbac/backend-uami-rbac.bicep (grants AI access to backend)
// See: docs/rfc/2001-domain-driven-design-architecture.md (Invoice AI)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'AI services orchestrator deploying Azure OpenAI and AI Foundry'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

var aiConventionPrefix = '${resourceConventionPrefix}-ai'

module openAiDeployment 'openai.bicep' = {
  scope: resourceGroup()
  name: 'openAiDeployment-${resourceDeploymentDate}'
  params: {
    openAiLocation: resourceLocation
    openAiConventionPrefix: aiConventionPrefix
    openAiDeploymentDate: resourceDeploymentDate
  }
}

module aiFoundryDeployment 'aiFoundry.bicep' = {
  scope: resourceGroup()
  name: 'aiFoundryDeployment-${resourceDeploymentDate}'
  params: {
    aiFoundryLocation: resourceLocation
    aiFoundryName: '${aiConventionPrefix}-foundry'
    aiFoundryDeploymentDate: resourceDeploymentDate
  }
}

output aiResources object = {
  openAiId: openAiDeployment.outputs.openAiId
  openAiEndpoint: openAiDeployment.outputs.openAiEndpoint
  aiFoundryId: aiFoundryDeployment.outputs.aiFoundryId
  aiFoundryEndpoint: aiFoundryDeployment.outputs.aiFoundryEndpoint
  aiProjectId: aiFoundryDeployment.outputs.aiProjectId
}
