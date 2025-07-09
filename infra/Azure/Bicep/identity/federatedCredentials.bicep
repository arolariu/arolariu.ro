targetScope = 'resourceGroup'

metadata description = 'This template will create both development and production federated managed identities for Azure resources.'
metadata author = 'Alexandru-Razvan Olariu'

import { identity } from '../types/identity.type.bicep'
param infrastructureManagedIdentity identity

var federatedCredentials = [
  {
    name: 'FederatedGithubCredentialForDevelopment'
    subject: 'repo:arolariu/arolariu.ro:environment:development'
  }
  {
    name: 'FederatedGithubCredentialForProduction'
    subject: 'repo:arolariu/arolariu.ro:environment:production'
  }
]

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2025-01-31-preview' existing = {
  name: infrastructureManagedIdentity.name
}

@batchSize(1) // This ensures that the federated credentials are created one at a time to avoid conflicts -- there's a limitation to create sequential fed creds.
resource federatedCredentialsForInfrastructureIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2025-01-31-preview' = [
  for credential in federatedCredentials: {
    parent: managedIdentity
    name: credential.name
    properties: {
      issuer: 'https://token.actions.githubusercontent.com'
      subject: credential.subject
      audiences: ['api://AzureADTokenExchange']
    }
  }
]
