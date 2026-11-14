targetScope = 'resourceGroup'
extension 'br:mcr.microsoft.com/bicep/extensions/microsoftgraph/v1.0:1.0.0'

metadata description = 'Creates the tenant-only experiments application before exposing its generated client ID.'

@description('The stable alternate key for the application registration.')
param applicationUniqueName string

@description('The application display name.')
param displayName string

resource application 'Microsoft.Graph/applications@v1.0' = {
  uniqueName: applicationUniqueName
  displayName: displayName
  signInAudience: 'AzureADMyOrg'
  api: {
    requestedAccessTokenVersion: 2
  }
}

output appClientId string = application.appId
