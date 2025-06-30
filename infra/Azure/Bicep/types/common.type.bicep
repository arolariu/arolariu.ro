metadata description = 'Common user-defined types for standardized deployments'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'

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
