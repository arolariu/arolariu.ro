metadata description = 'Resolved non-secret resource values used to populate runtime configuration.'

@export()
type runtimeConfiguration = {
  tenantId: string
  subscriptionId: string
  sqlServerFqdn: string
  sqlDatabaseName: string
  backendManagedIdentityClientId: string
  cosmosEndpoint: string
  blobEndpoint: string
  telemetryConnectionString: string
  cognitiveServicesEndpoint: string
  apiUrl: string
}
