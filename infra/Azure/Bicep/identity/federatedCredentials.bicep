targetScope = 'resourceGroup'

// =====================================================================================
// Federated Identity Credentials for GitHub Actions OIDC
// =====================================================================================
// This module creates federated identity credentials that enable GitHub Actions
// to authenticate with Azure using OpenID Connect (OIDC), eliminating the need
// for storing secrets in GitHub.
//
// Authentication Flow:
// 1. GitHub Actions workflow requests OIDC token from GitHub
// 2. Token includes subject claim (repo:owner/repo:environment:name)
// 3. Azure validates token against registered federated credential
// 4. If valid, Azure issues access token for the managed identity
// 5. Workflow uses access token to deploy resources
//
// Created Credentials:
// - Development: Allows deployments from 'development' environment
// - Production: Allows deployments from 'production' environment
//
// Security: Only the infrastructure identity receives federated credentials,
// as it's the only identity used by CI/CD pipelines.
//
// See: .github/workflows/ for GitHub Actions workflow configurations
// =====================================================================================

metadata description = 'Creates federated identity credentials for GitHub Actions OIDC authentication with Azure.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

import { identity } from '../types/identity.type.bicep'

@description('The infrastructure managed identity that will receive federated credentials for GitHub Actions OIDC.')
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
