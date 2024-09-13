targetScope = 'resourceGroup'

metadata description = 'This template will create a federated managed identity for the Azure resources.'
metadata author = 'Alexandru-Razvan Olariu'

import { identity } from '../types/identity.type.bicep'
param infrastructureManagedIdentity identity

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' existing = {
  name: infrastructureManagedIdentity.name
}

resource federatedIdentityForGitHub 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-07-31-preview' = {
  parent: managedIdentity
  name: 'FederatedGithubCredential'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: 'repo:arolariu/arolariu.ro:environment:production'
    audiences: ['api://AzureADTokenExchange']
  }
}
