// =====================================================================================
// Common User-Defined Types - Shared Type Definitions for Bicep Modules
// =====================================================================================
// This file defines reusable user-defined types (UDTs) that enforce consistency
// across all Bicep modules. Using shared types ensures:
// - Consistent resource tagging across all Azure resources
// - Type-safe parameter passing between modules
// - Compile-time validation of configuration values
//
// Exported Types:
// - resourceTags: Standard tagging schema for Azure resources (required on all)
//
// Usage:
// Import in consuming modules:
//   import { resourceTags } from '../types/common.type.bicep'
//
// Azure Policy Integration:
// These tags align with organizational Azure Policies that:
// - Require 'environment' tag for cost allocation
// - Require 'costCenter' for billing chargebacks
// - Track deployment metadata for audit/compliance
//
// See: All module files that create Azure resources
// =====================================================================================

metadata description = 'Common user-defined types for standardized deployments'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@export()
@metadata({ description: 'Resource tagging configuration' })
type resourceTags = {
  @description('Environment tag')
  environment: 'DEVELOPMENT' | 'PRODUCTION'

  @description('Deployment method')
  deploymentType: 'Bicep' | 'ARM' | 'Terraform'

  @description('Deployment date in YYYY-MM-DD format')
  deploymentDate: string

  @description('Deployment author')
  deploymentAuthor: string

  @description('Module or service name')
  module: string

  @description('Cost center for billing')
  costCenter: string

  @description('Project name or identifier')
  project: string

  @description('Version of the deployment')
  version: string
}
