// =====================================================================================
// Shared Tag Generation Function
// =====================================================================================
// Single source of truth for resource tags. All modules import createTags()
// instead of defining their own commonTags variable.
//
// Usage:
//   import { createTags } from '../constants/tags.bicep'
//   var commonTags = createTags('storage', deploymentDate)
// =====================================================================================

metadata description = 'Shared tag generation function for all Bicep modules'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import { resourceTags } from '../types/common.type.bicep'

@export()
func createTags(moduleName string, deploymentDate string) resourceTags => {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: deploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: moduleName
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}
