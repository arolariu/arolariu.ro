metadata description = 'Common user-defined types for standardized deployments'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'

@export()
@metadata({ description: 'App Service Plan SKU configuration' })
type appServicePlanSku = {
  @description('SKU name (e.g., B1, B2, S1, P1v2)')
  name: 'B1' | 'B2' | 'S1' | 'S2' | 'S3' | 'P1v2' | 'P2v2' | 'P3v2'

  @description('SKU tier')
  tier: 'Basic' | 'Standard' | 'Premium' | 'PremiumV2'
}

@export()
@metadata({ description: 'Resource tagging configuration' })
type resourceTags = {
  @description('Environment tag')
  environment: 'dev' | 'staging' | 'prod'

  @description('Deployment method')
  deployment: 'Bicep' | 'ARM' | 'Terraform'

  @description('Project or application name')
  project: string

  @description('Cost center for billing')
  costCenter: string

  @description('Owner or responsible team')
  owner: string
}
