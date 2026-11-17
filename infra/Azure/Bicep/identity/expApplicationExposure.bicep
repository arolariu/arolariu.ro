targetScope = 'resourceGroup'
extension 'br:mcr.microsoft.com/bicep/extensions/microsoftgraph/v1.0:1.0.0'

metadata description = 'Exposes the experiments API using its generated client ID and creates its service principal.'

@description('The stable alternate key of the application registration.')
param applicationUniqueName string

@description('The application display name.')
param displayName string

@description('The client ID returned by application creation.')
param appClientId string

resource application 'Microsoft.Graph/applications@v1.0' = {
  uniqueName: applicationUniqueName
  displayName: displayName
  signInAudience: 'AzureADMyOrg'
  api: {
    requestedAccessTokenVersion: 2
  }
  identifierUris: [
    'api://${appClientId}'
  ]
}

resource servicePrincipal 'Microsoft.Graph/servicePrincipals@v1.0' = {
  appId: application.appId
  accountEnabled: true
  appRoleAssignmentRequired: false
}

output appClientId string = application.appId
output servicePrincipalId string = servicePrincipal.id
