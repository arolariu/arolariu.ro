targetScope = 'resourceGroup'

metadata description = 'This template will create a federated managed identity for the Azure resources.'
metadata author = 'Alexandru-Razvan Olariu'

import { identity } from '../types/identity.type.bicep'
param infrastructureManagedIdentity identity

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2025-01-31-preview' existing = {
  name: infrastructureManagedIdentity.name
}

resource productionFederatedIdentityForGitHub 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2025-01-31-preview' = {
  parent: managedIdentity
  name: 'FederatedGithubCredentialForProduction'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: 'repo:arolariu/arolariu.ro:environment:production'
    audiences: ['api://AzureADTokenExchange']
  }
}

resource developmentFederatedIdentityForGitHub 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2025-01-31-preview' = {
  parent: managedIdentity
  name: 'FederatedGithubCredentialForDevelopment'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: 'repo:arolariu/arolariu.ro:environment:development'
    audiences: ['api://AzureADTokenExchange']
  }
}
