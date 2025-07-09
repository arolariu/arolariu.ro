# 🤖 AI Module

This module deploys an Azure OpenAI resource with secure access and RBAC for backend managed identities.

## 📋 Overview

- Deploys Azure OpenAI (Cognitive Services) with S0 SKU
- Configures custom subdomain, public network access, and tags
- Assigns the Cognitive Services User role to a managed identity

## 🏗️ Resources Created

| Resource Type     | Purpose                           |
| ----------------- | --------------------------------- |
| CognitiveServices | Azure OpenAI resource             |
| Role Assignment   | RBAC for backend managed identity |

## 🔧 Parameters

| Parameter                           | Type   | Required | Description                                    |
| ----------------------------------- | ------ | -------- | ---------------------------------------------- |
| `resourceLocation`                  | string | ✅       | Azure region for the OpenAI resource           |
| `resourceDeploymentDate`            | string | ✅       | Deployment timestamp                           |
| `resourceConventionPrefix`          | string | ✅       | Prefix for resource names                      |
| `backendManagedIdentityPrincipalId` | string | ✅       | PrincipalId (GUID) of backend managed identity |

## 📤 Outputs

| Output           | Type   | Description                        |
| ---------------- | ------ | ---------------------------------- |
| `openAiId`       | string | Resource ID of the OpenAI account  |
| `openAiEndpoint` | string | Endpoint URL of the OpenAI account |
| `resource`       | object | Full OpenAI resource object        |

## 🛡️ Security & RBAC

- The backend managed identity is granted the Cognitive Services User role on the OpenAI resource.
- Only the principalId (GUID) of the managed identity should be passed for RBAC.

## � Example Usage

```bicep
module aiDeployment 'ai/deploymentFile.bicep' = {
  name: 'aiDeployment'
  params: {
    resourceLocation: 'swedencentral'
    resourceDeploymentDate: '2025-07-03'
    resourceConventionPrefix: 'arolariu'
    backendManagedIdentityPrincipalId: backendIdentityPrincipalId
  }
}
```

## 🚨 Troubleshooting

| Issue                      | Solution                                                |
| -------------------------- | ------------------------------------------------------- |
| Principal ID is not a GUID | Pass the managed identity's principalId, not resourceId |
| Access denied              | Check RBAC assignment and principalId value             |

## 📚 References

- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Cognitive Services RBAC](https://learn.microsoft.com/en-us/azure/cognitive-services/authorizing-users)

---

**Module Version**: 2.0.0  
**Last Updated**: July 2025  
**Maintainer**: Alexandru-Razvan Olariu
